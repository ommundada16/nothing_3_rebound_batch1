# Rebound demo accounts

All names, medical histories, messages and locations below are fictional demo profiles. Common Indian names are used; these are not real patients or verified clinicians. Demo accounts and records are isolated from existing non-demo records.

Open http://localhost:8787/ and enter an email from this guide with the shared demo password. The login page does not display the demo directory or credentials.

**Shared demo password:** `ReboundDemo2026!`

| Role | Name | Email | Location |
| --- | --- | --- | --- |
| Physiotherapist | Dr. Aditi Kulkarni | aditi.kulkarni@rebound.example | Kothrud, Pune — 411038 |
| Physiotherapist | Dr. Rohan Deshmukh | rohan.deshmukh@rebound.example | Baner, Pune — 411045 |
| Physiotherapist | Dr. Neha Shah | neha.shah@rebound.example | Thane — 400601 |
| Assistant surgeon | Dr. Sneha Patil | sneha.patil@rebound.example | Shivajinagar, Pune — 411005 |
| Assistant surgeon | Dr. Aniket Joshi | aniket.joshi@rebound.example | Pimpri-Chinchwad — 411018 |
| Assistant surgeon | Dr. Pooja Mehta | pooja.mehta@rebound.example | Dadar, Mumbai — 400014 |
| Care team | Anjali More | anjali.more@rebound.example | Pune — 411001 |
| Care team | Sagar Pawar | sagar.pawar@rebound.example | Pimpri-Chinchwad — 411018 |
| Care team | Priya Nair | priya.nair@rebound.example | Mumbai — 400014 |
| Patient | Meera Kulkarni | meera.kulkarni@rebound.example | Kothrud, Pune — 411038 |
| Patient | Vijay Patil | vijay.patil@rebound.example | Baner, Pune — 411045 |
| Patient | Sunita Joshi | sunita.joshi@rebound.example | Pimpri-Chinchwad — 411018 |
| Patient | Prakash Deshmukh | prakash.deshmukh@rebound.example | Wakad, Pune — 411057 |
| Patient | Asha Shah | asha.shah@rebound.example | Thane — 400601 |

## Different duties

- **Physio:** assigned patients, exercise prescriptions, sessions, daily-highest progress, clinical replies and voice/reference tools.
- **Assistant surgeon:** assigned surgical patients, postoperative appointments, clinical replies, sessions/progress and concerns. No enrolment, assignment or robot administration.
- **Care team:** enrolment, physio/assistant assignment, patient-directory administration and robot support/update requests. Patient records are viewable, but clinical replies and treatment tools are unavailable.
- **Patient:** prescribed exercises, session history, daily-highest progress, guided companion and care-team messages.

Meera is linked to Aditi and Sneha; Vijay, Sunita and Prakash to Rohan and Aniket; Asha to Neha and Pooja. Each patient starts with seven days of clearly labelled sample readings, four review dates, a sample conversation, illustrative exercise snapshots and an unconnected demo robot with a queued update. No actual firmware or clinical messages are sent outside the app.

Existing demo profiles are not reset at startup. New accounts/data are created only when absent. `REBOUND_DEMO_ACCOUNTS=0` disables automatic creation and listing; it does not revoke previously created demo accounts.
