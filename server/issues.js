import { randomUUID } from 'node:crypto';
import { CARE_LEVELS, SYMPTOMS } from '../shared/constants.js';
import { triage } from '../shared/triage.js';
import { analyze } from '../shared/objective.js';

const MIN = 60000;
const levelTitle = (n) => CARE_LEVELS.find((l) => l.level === n)?.title || `Level ${n}`;
const RANK = { fyi: 1, review: 2, urgent: 3 };

export const nowOf = (state) => Date.now() + (state.clockOffsetMs || 0);

function ackSla(tier, sla) {
  if (tier === 'urgent') return sla.urgentAckMin * MIN;
  if (tier === 'review') return sla.reviewAckMin * MIN;
  return null;
}
function resolveSla(tier, sla) {
  if (tier === 'urgent') return sla.urgentResolveMin * MIN;
  if (tier === 'review') return sla.reviewResolveMin * MIN;
  return null;
}

function audit(state, by, text, issueId = null) {
  state.audit.push({ id: randomUUID(), ts: nowOf(state), by, text, issueId });
  if (state.audit.length > 400) state.audit.splice(0, state.audit.length - 400);
}

function titleFromReport(report, result) {
  const labels = (report.symptoms || [])
    .map((id) => SYMPTOMS.find((s) => s.id === id)?.label)
    .filter(Boolean);
  if (labels.length) return labels.slice(0, 2).join(' + ') + (labels.length > 2 ? ` (+${labels.length - 2})` : '');
  if (report.text) return report.text.slice(0, 60);
  return `Patient raised a concern (${result.label})`;
}

export function createIssueFromReport(state, report) {
  const now = nowOf(state);
  const result = triage(report, state.playbook);
  if (report.callRequest) {
    // "Call me" skips triage on purpose: the patient always has a direct line.
    result.tier = 'urgent';
    result.label = 'Urgent';
    result.reasons.unshift('The patient pressed "ask my physio to call me". This skips triage on purpose.');
    result.guidance = ['Your physio has been asked to call you. Keep your phone near you.'];
  }
  const sla = state.playbook.sla;
  const due = ackSla(result.tier, sla);
  const issue = {
    id: randomUUID(),
    createdAt: now,
    source: 'patient',
    key: null,
    tier: result.tier,
    originalTier: result.tier,
    type: 'patient_report',
    title: report.callRequest ? 'Patient asked for a call' : titleFromReport(report, result),
    summary: report.text || '',
    symptoms: report.symptoms || [],
    pain: report.pain ?? null,
    photoId: report.photoId || null,
    voiceId: report.voiceId || null,
    reasons: result.reasons,
    guidance: result.guidance,
    emergency: result.emergency,
    level: 1,
    notifiedLevels: result.notifyLevels,
    status: 'new',
    dueAt: due ? now + due : null,
    followUpDueAt: result.tier === 'urgent' ? null : now + sla.followUpMin * MIN,
    followUpAnswer: null,
    followUpEscalated: false,
    feedback: null,
    thread: [
      { ts: now, by: 'patient', text: report.text || '(ticked symptoms only)' },
      {
        ts: now,
        by: 'system',
        text: `Routed as ${result.label}. Sent to: ${result.notifyLevels.map(levelTitle).join(' and ')}. The app did not decide this was safe; it only decided who sees it and how fast.`,
      },
    ],
  };
  if (report.suspectedSideEffect) {
    issue.title = 'Suspected medicine side effect';
    issue.level = 3;
    issue.notifiedLevels = [...new Set([...issue.notifiedLevels, 3])];
    if (issue.tier === 'fyi') {
      issue.tier = 'review'; issue.originalTier = 'review';
      issue.dueAt = now + sla.reviewAckMin * MIN;
      result.tier = 'review'; result.label = 'Review';
    }
    result.startLevel = 3; result.notifyLevels = issue.notifiedLevels;
    const reason = 'A suspected medicine side effect was reported for assistant-doctor review.';
    issue.reasons = [...issue.reasons, reason]; result.reasons = issue.reasons;
    if (!issue.emergency) {
      issue.guidance = ['Your report is in the assistant doctor’s review list. Contact the treating team for advice about the medicine; the app has not changed your prescription.'];
      result.guidance = issue.guidance;
    }
    issue.thread.push({ts:now,by:'system',text:reason});
  }
  state.issues.push(issue);
  audit(state, 'system', `New ${result.label} concern from patient: ${issue.title}`, issue.id);
  return { issue, result };
}

export function createIssueFromFlag(state, flag) {
  const now = nowOf(state);
  const sla = state.playbook.sla;
  const due = ackSla(flag.tier, sla);
  const notified = [flag.level, ...(flag.ccLevels || [])];
  const issue = {
    id: randomUUID(),
    createdAt: now,
    source: 'system',
    key: flag.key,
    tier: flag.tier,
    originalTier: flag.tier,
    type: flag.type,
    title: flag.title,
    summary: flag.detail,
    symptoms: [],
    pain: null,
    photoId: null,
    voiceId: null,
    reasons: [flag.detail],
    guidance: [],
    emergency: false,
    level: flag.level,
    notifiedLevels: [...new Set(notified)],
    status: 'new',
    dueAt: due ? now + due : null,
    followUpDueAt: null,
    followUpAnswer: null,
    followUpEscalated: false,
    feedback: null,
    thread: [
      {
        ts: now,
        by: 'system',
        text: `Found from the exercise data, not from anything the patient said. Sent to: ${[...new Set(notified)].map(levelTitle).join(' and ')}.`,
      },
    ],
  };
  state.issues.push(issue);
  audit(state, 'system', `Data-driven flag: ${flag.title}`, issue.id);
  return issue;
}

// Run the objective rules on the saved sessions and raise any new flags.
export function syncObjective(state) {
  const now = nowOf(state);
  const { flags } = analyze({
    sessions: state.sessions.filter(s => s.exercise === 'heel_slide'),
    now,
    surgeryTs: state.patient.surgeryTs,
    playbook: state.playbook,
  });
  const created = [];
  for (const f of flags) {
    if (state.issues.some((i) => i.key === f.key)) continue;
    created.push(createIssueFromFlag(state, f));
  }
  return created;
}

function bumpLevel(state, issue, by, why) {
  const now = nowOf(state);
  if (issue.level >= 4) return false;
  issue.level += 1;
  if (!issue.notifiedLevels.includes(issue.level)) issue.notifiedLevels.push(issue.level);
  issue.status = 'new';
  const ack = ackSla(issue.tier, state.playbook.sla);
  issue.dueAt = ack ? now + ack : null;
  issue.thread.push({ ts: now, by: 'system', text: `${why} Escalated to ${levelTitle(issue.level)}.` });
  audit(state, by, `${issue.title}: escalated to ${levelTitle(issue.level)}`, issue.id);
  return true;
}

export function applyAction(state, id, { action, byLevel = 1, text = '' }) {
  const issue = state.issues.find((i) => i.id === id);
  if (!issue) return { error: 'Issue not found' };
  const now = nowOf(state);
  const who = levelTitle(byLevel);
  const sla = state.playbook.sla;

  if (action === 'ack') {
    issue.status = 'acknowledged';
    issue.ackBy = byLevel;
    issue.ackAt = now;
    const r = resolveSla(issue.tier, sla);
    issue.dueAt = r ? now + r : null;
    issue.thread.push({ ts: now, by: byLevel, text: `${who} has seen this.` });
    audit(state, who, `Acknowledged: ${issue.title}`, id);
  } else if (action === 'reply') {
    if (!text.trim()) return { error: 'Write a message first' };
    issue.status = issue.status === 'new' ? 'replied' : issue.status;
    issue.thread.push({ ts: now, by: byLevel, text: text.trim() });
    const r = resolveSla(issue.tier, sla);
    if (r && issue.status !== 'resolved') issue.dueAt = now + r;
    audit(state, who, `Replied: ${issue.title}`, id);
  } else if (action === 'escalate') {
    const ok = bumpLevel(state, issue, who, text ? `${who}: "${text.trim()}".` : `${who} escalated this.`);
    if (!ok) return { error: 'Already with the surgeon' };
  } else if (action === 'resolve') {
    if (!text.trim()) return { error: 'Add a short note on what was done before resolving' };
    issue.status = 'resolved';
    issue.resolvedAt = now;
    issue.dueAt = null;
    issue.thread.push({ ts: now, by: byLevel, text: `Resolved: ${text.trim()}` });
    audit(state, who, `Resolved: ${issue.title}`, id);
  } else if (action === 'wrong') {
    issue.feedback = { ts: now, by: byLevel, text: text || 'Marked as wrongly routed' };
    issue.thread.push({ ts: now, by: byLevel, text: `Feedback on routing: ${issue.feedback.text}` });
    audit(state, who, `Flagged routing as wrong: ${issue.title}`, id);
  } else {
    return { error: 'Unknown action' };
  }
  return { issue };
}

export function answerFollowUp(state, id, answer) {
  const issue = state.issues.find((i) => i.id === id);
  if (!issue) return { error: 'Issue not found' };
  const now = nowOf(state);
  const sla = state.playbook.sla;
  issue.followUpAnswer = answer;
  issue.followUpDueAt = null;
  if (answer === 'better') {
    issue.thread.push({ ts: now, by: 'patient', text: 'Follow-up: feeling better after the advice.' });
  } else {
    const newTier = answer === 'worse' ? (issue.tier === 'review' ? 'urgent' : 'review') : issue.tier === 'fyi' ? 'review' : issue.tier;
    if (RANK[newTier] > RANK[issue.tier]) issue.tier = newTier;
    issue.status = 'new';
    issue.level = Math.max(1, issue.level);
    const ack = ackSla(issue.tier, sla);
    issue.dueAt = ack ? now + ack : null;
    issue.resolvedAt = null;
    issue.thread.push({
      ts: now,
      by: 'patient',
      text: `Follow-up: ${answer === 'worse' ? 'it is worse' : 'no change'} after the advice. Raised to ${issue.tier}.`,
    });
  }
  audit(state, 'patient', `Follow-up answer "${answer}": ${issue.title}`, id);
  return { issue };
}

// Called every few seconds. Moves unanswered concerns up the chain.
export function tick(state) {
  const now = nowOf(state);
  let changed = false;
  for (const issue of state.issues) {
    if (issue.status === 'resolved') continue;

    if (issue.dueAt && now > issue.dueAt && issue.level < 4) {
      const mins = Math.round((now - (issue.dueAt - (ackSla(issue.tier, state.playbook.sla) || 0))) / MIN);
      const why = issue.status === 'new' ? `No acknowledgement within the service level (${issue.tier}).` : `Not resolved within the service level (${issue.tier}, ${mins} min since raised).`;
      changed = bumpLevel(state, issue, 'system', why) || changed;
    } else if (issue.dueAt && now > issue.dueAt && issue.level >= 4 && !issue.overdueAtFinal) {
      issue.overdueAtFinal = true;
      issue.thread.push({ ts: now, by: 'system', text: 'Overdue at the final level (Surgeon). Phone the patient directly.' });
      audit(state, 'system', `Overdue at final level: ${issue.title}`, issue.id);
      changed = true;
    }

    // Unanswered follow-up: raise it, never let it silently disappear.
    if (issue.followUpDueAt && !issue.followUpAnswer && !issue.followUpEscalated) {
      const grace = state.playbook.sla.followUpMin * MIN;
      if (now > issue.followUpDueAt + grace) {
        issue.followUpEscalated = true;
        if (RANK[issue.tier] < RANK.review) issue.tier = 'review';
        issue.status = 'new';
        const ack = ackSla(issue.tier, state.playbook.sla);
        issue.dueAt = ack ? now + ack : null;
        issue.thread.push({ ts: now, by: 'system', text: 'The patient did not answer the follow-up check. Raised to Review so a physio checks in.' });
        audit(state, 'system', `No follow-up answer, raised: ${issue.title}`, issue.id);
        changed = true;
      }
    }
  }
  return changed;
}

export function clinicianNote(issue, patient) {
  const sym = (issue.symptoms || []).map((id) => SYMPTOMS.find((s) => s.id === id)?.label).filter(Boolean);
  return [
    `Patient: ${patient.name}, ${patient.procedure}.`,
    `Concern: ${issue.title}.`,
    sym.length ? `Reported: ${sym.join('; ')}.` : null,
    issue.pain != null ? `Pain: ${issue.pain}/10.` : null,
    issue.summary ? `Patient's words: "${issue.summary}"` : null,
    issue.photoId ? 'Photo attached.' : null,
    `Routed as ${issue.tier}. Why: ${issue.reasons.join(' ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}
