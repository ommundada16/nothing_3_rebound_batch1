import { Card } from '../components/ui.jsx';

const STAGES = [
  {
    tag: 'Built today',
    title: 'Phone on a tripod',
    text: "The physio teaches once at the visit. At home the phone watches the leg, plays his voice at the right moment, and tells the care chain when something needs a person.",
    kind: 'ok',
  },
  {
    tag: 'Next',
    title: 'A sensor in the room',
    text: 'A fixed camera or depth sensor frames the leg by itself. No tripod and no "sessions": everyday movements such as standing up from a chair are measured as they happen.',
    kind: 'fyi',
  },
  {
    tag: 'Then',
    title: 'The implant joins in',
    text: 'Implants that report their own movement and steps already exist abroad. The same timeline can take that stream, so the app supplies the human half (voice, confidence, family) and the implant supplies the mechanics.',
    kind: 'review',
  },
  {
    tag: 'Later',
    title: 'A home robot that learns from the physio',
    text: 'A small mobile camera that moves to the right view, plays the physio\'s guidance and watches the room. It uses the very same "teach once" bundle. Only the delivery changes, never the physio\'s authority.',
    kind: 'plain',
  },
];

export default function Future() {
  return (
    <main className="page">
      <div className="stack">
        <div>
          <h1 style={{ margin: 0 }}>Teach once, support always</h1>
          <p className="muted" style={{ margin: 0, maxWidth: 760 }}>
            The physio is the most important person in a recovery. We do not replace him. We let him teach a system once, so his judgement and his voice are with the patient between visits, and so the system comes back to him when it is not enough.
          </p>
        </div>

        <Card title="What the physio teaches (once, at the visit)">
          <div className="grid three">
            {[
              ['A reference in the patient\'s own room', 'His recorded session on their bed, with their pillow, next to a clean reference from a healthy person.'],
              ['His voice at the right moment', 'Push, hold, relax: phrases he records in his own words and language, played when the leg is in that phase.'],
              ['His rules and his chain', 'What to tell the patient for each symptom, how fast each level must respond, and who is next when nobody answers.'],
            ].map(([t, d]) => (
              <div key={t} className="card flat tight">
                <b>{t}</b>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  {d}
                </p>
              </div>
            ))}
          </div>
          <p className="small" style={{ marginBottom: 0, marginTop: 10 }}>
            <b>Delivery is a swappable layer:</b> phone today, a room sensor next, a robot later. The teaching bundle stays the same.
          </p>
        </Card>

        <Card title="The camera finds its own position (concept)">
          <svg viewBox="0 0 640 260" width="100%" role="img" aria-label="A small camera robot moving beside the bed to frame the leg">
            <rect width="640" height="260" fill="var(--surface-2)" rx="12" />
            <rect y="180" width="640" height="80" fill="#8aa5ad" />
            <rect y="174" width="640" height="8" fill="#f2f6f7" />
            <ellipse cx="80" cy="166" rx="40" ry="14" fill="#e2c14a" />
            <polyline points="150,170 270,130 380,170" fill="none" stroke="#0f766e" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            {[
              [150, 170],
              [270, 130],
              [380, 170],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="8" fill="#fff" stroke="#0b1718" strokeWidth="3" />
            ))}
            <g className="robot">
              <rect x="430" y="150" width="70" height="40" rx="10" fill="#334155" />
              <circle cx="448" cy="205" r="9" fill="#0b1718" />
              <circle cx="484" cy="205" r="9" fill="#0b1718" />
              <rect x="452" y="118" width="28" height="34" rx="6" fill="#475569" />
              <circle cx="466" cy="132" r="8" fill="#2dd4bf" />
              <path d="M458 118 L330 80 L330 170 Z" fill="#2dd4bf" opacity="0.14" />
            </g>
            <text x="20" y="40" fontSize="15" fontWeight="700" fill="var(--ink)">
              The robot only moves the camera and plays the physio's recorded guidance.
            </text>
            <text x="20" y="62" fontSize="13" fill="var(--muted)">
              Prototype today: you place a phone on a tripod. Same teaching, same safety net.
            </text>
          </svg>
        </Card>

        <div className="grid two">
          {STAGES.map((s, i) => (
            <Card key={s.title}>
              <div className="row between">
                <span className={`badge ${s.kind}`}>{s.tag}</span>
                <span className="tiny muted">stage {i + 1} of 4</span>
              </div>
              <h3 style={{ margin: '8px 0 4px' }}>{s.title}</h3>
              <p className="small" style={{ margin: 0 }}>
                {s.text}
              </p>
            </Card>
          ))}
        </div>

        <Card title="Where this sits (what already exists, and what we add)">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Approach</th>
                  <th>What it does well</th>
                  <th>Gap we address</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Clinic testing platforms</td>
                  <td>Assign exercises and record clinic tests (force plates, strength, camera tests)</td>
                  <td>Nothing measured between visits, no coaching at the moment of effort</td>
                </tr>
                <tr>
                  <td>Camera angle apps</td>
                  <td>Measure knee bend from a phone</td>
                  <td>A generic voice; no active vs assisted comparison; no escalation chain</td>
                </tr>
                <tr>
                  <td>Digital physio programmes with sensors</td>
                  <td>Form feedback during exercises</td>
                  <td>Extra hardware to ship and set up; the patient's own physio is not the voice</td>
                </tr>
                <tr>
                  <td>Smart implants</td>
                  <td>Passive movement data from inside the joint</td>
                  <td>Cost and availability; cannot capture fear, confidence or the family</td>
                </tr>
                <tr>
                  <td>
                    <b>Rebound</b>
                  </td>
                  <td>The physio teaches once; his voice, his room, his rules</td>
                  <td>Separates "can't" from "won't"; a fail-safe chain that never closes a concern by itself</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="tiny muted" style={{ marginBottom: 0 }}>
            Descriptions are general and from public information. Check specific product claims before presenting them.
          </p>
        </Card>

        <Card title="What we do not claim" tight>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            <li>This is a prototype with synthetic history. It has not been clinically validated.</li>
            <li>The phone angle is a camera estimate from a 2D view. Its error must be measured against a known-angle jig before it is quoted.</li>
            <li>The app does not diagnose. It routes concerns to a person and delivers guidance the physio wrote.</li>
            <li>The strength, swelling and alignment need proper clinical assessment and are not measured from the phone.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
