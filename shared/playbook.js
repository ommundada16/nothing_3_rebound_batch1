// The physio-authored playbook ("teach once"). These are DEFAULTS that the
// physio edits in the Physio Studio. Nothing here is medical advice: the
// physio must review and approve every rule before real use.

export const DEFAULT_PLAYBOOK = {
  version: 1,
  authoredBy: 'Default template (physio must review)',
  thresholds: {
    assistGapWarn: 15, // deg: active far below assisted for 3 days -> holding back (fear / weakness)
    quadLagWarn: 10, // deg: extension deficit during straight leg raise
    quadLagReady: 5, // deg: lag low enough to suggest removing the pillow
    regressionDeg: 10, // deg: today's active range this far below recent best
    missedDaysReview: 2,
    painUrgent: 8,
    painReview: 6,
  },
  // Expected knee flexion (assisted) by day after surgery. Physio-set.
  milestones: [
    { day: 7, flex: 70 },
    { day: 14, flex: 90 },
    { day: 21, flex: 100 },
    { day: 28, flex: 110 },
    { day: 42, flex: 120 },
  ],
  // Service levels in MINUTES (demo clock can be advanced to show escalation).
  sla: {
    urgentAckMin: 30,
    reviewAckMin: 240,
    urgentResolveMin: 180,
    reviewResolveMin: 1440,
    followUpMin: 120,
  },
  symptomRules: {
    chest_breath: {
      tier: 'urgent',
      why: 'Chest pain or breathlessness can be a blood clot reaching the lungs.',
      guidance: ['Call the emergency number now. Do not wait for a reply from the app or the physio.'],
    },
    calf_swelling: {
      tier: 'urgent',
      why: 'One-sided calf pain or swelling can be a blood clot (DVT).',
      guidance: [
        'Do not massage the calf and do not exercise the leg until a physio has spoken to you.',
        'Your physio is being alerted now. Keep your phone near you.',
      ],
    },
    fever: {
      tier: 'review',
      why: 'Fever after surgery needs a clinician to look at it.',
      guidance: ['Take your temperature and note it. A physio will look at this today.'],
    },
    redness_heat: {
      tier: 'review',
      why: 'Heat or redness around the knee can be early infection.',
      guidance: ['Send a clear photo of the knee in good light. Do not apply heat.'],
    },
    wound: {
      tier: 'urgent',
      why: 'An opening, leaking or smelly wound can mean infection.',
      guidance: ['Cover with a clean dry dressing. Do not wet it. Your physio is being alerted now.'],
    },
    numbness: {
      tier: 'urgent',
      why: 'Numbness or a cold, pale or blue foot can mean a circulation problem.',
      guidance: ['Do not wait. Your physio is being alerted now. If the foot is blue or cold, go to the nearest hospital.'],
    },
    fall: {
      tier: 'review',
      why: 'A fall can damage the repair or implant.',
      guidance: ['Stay still for a moment. Do not exercise today. A physio will check in with you.'],
    },
    cant_weight: {
      tier: 'review',
      why: 'Not being able to bear weight needs to be checked.',
      guidance: ['Do not force the leg. A physio will check in with you.'],
    },
    locking: {
      tier: 'review',
      why: 'A knee that locks or sticks needs a physio to assess it.',
      guidance: ['Stop the exercise. Do not force the knee. Send a short video of the movement if you can.'],
    },
    giving_way: {
      tier: 'review',
      why: 'A knee that gives way raises the risk of a fall.',
      guidance: ['Use your walking aid and have someone nearby. Skip hard exercise today.'],
    },
    swelling_up: {
      tier: 'review',
      why: 'More swelling than yesterday can mean overdoing it, or a complication.',
      guidance: [
        'Ice for 20 minutes with a cloth between ice and skin, a few times today.',
        'Rest with the leg raised: pillow under the calf or ankle, never directly under the knee.',
        'Skip hard exercise today. Light movement only if it is comfortable.',
      ],
    },
    stiff: {
      tier: 'fyi',
      why: 'Stiffness is common, but a trend needs watching.',
      guidance: ['A warm shower before exercise can help. Keep doing your heel slides gently.'],
    },
    clicking: {
      tier: 'fyi',
      why: 'Painless clicking is common after surgery.',
      guidance: ['Painless clicking is common while the knee heals. Tell the physio if it becomes painful or the knee feels stuck.'],
    },
    cramps: {
      tier: 'fyi',
      why: 'Cramps often come with low fluid intake or medication.',
      guidance: ['Drink water, stretch the calf gently, and mention it to your physio at the next visit.'],
    },
    low_mood: {
      tier: 'fyi',
      why: 'Fear and low mood are common in recovery, and your physio should know.',
      guidance: ['You are not alone in this. Your physio will be told you are finding things hard.'],
    },
  },
  // Free-text words that can only RAISE the tier, never lower it.
  keywords: {
    urgent: ['chest', 'breath', 'pus', 'bleeding', 'blood', 'numb', 'faint', 'clot', 'cannot move', "can't move", 'bukhar', 'taap', 'fever'],
    review: ['swell', 'swollen', 'locked', 'lock', 'gave way', 'giving way', 'stuck', 'fell', 'fall', 'warm', 'hot', 'red'],
  },
};
