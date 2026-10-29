# Deploy Rebound: Vercel website + persistent Render backend

Status: hosting preparation is committed, but no paid resource or hosted deployment has been created. Configure the real backend URL before deploying Vercel. Local development remains `npm run dev` or `npm start`.

## 1. Deploy the backend first

Open https://dashboard.render.com/ and choose **New → Blueprint**. Connect `ommundada16/nothing_3_rebound_batch1`, branch `main`, and use the repository-root `render.yaml`.

The blueprint requests a **paid** Node web service (`0.5c-512mb`) and a 1 GB persistent disk. Check the actual estimate in Render before creating resources. It uses:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (leave blank) |
| Region | Singapore |
| Build | `npm ci --omit=dev --ignore-scripts` |
| Start | `npm run server` |
| Health check | `/api/health` |
| Disk mount | `/var/data` |
| Patient/account/media directory | `/var/data/rebound` |
| Instances | 1 |
| Node | 22 |

Do not use a free ephemeral filesystem for these JSON files/uploads. Do not scale this file-backed backend to multiple instances. The blueprint sets `NODE_ENV=production`, `TRUST_PROXY=1`, `PHYSIO_DATA_DIR=/var/data/rebound`, `PHYSIO_SKIP_IMPORT=1` and `REBOUND_DEMO_ACCOUNTS=1`.

Wait until Render reports the service is live. Open `https://YOUR-ACTUAL-RENDER-HOST/api/health`; it should return JSON with `ok: true`.

The deployment starts with fictional demo data. Your laptop’s `server/data`, backups, credentials and private patient media are ignored by Git and are not migrated automatically.

## 2. Connect Vercel routing to that backend

From the repository root, run this with the **actual** URL shown in Render:

```powershell
npm run configure:vercel -- https://YOUR-ACTUAL-RENDER-HOST
```

The command updates `vercel.json` so `/api/...` is forwarded to the backend’s `/api/...`. Commit and push that file before importing/redeploying on Vercel. The backend URL is public configuration, not a secret.

The checked-in placeholder deliberately fails the Vercel build until it is replaced. Do not deploy a frontend whose accounts/API are unconnected. Do not set the backend URL to your Vercel website URL.

## 3. Deploy the website

Open https://vercel.com/new and import the same GitHub repository.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | `.` / repository root |
| Install command | `npm ci` |
| Build command | `npm run build:vercel` |
| Output directory | `dist` |

These values are already declared in `vercel.json`. Do not select `server` as the root. No frontend environment variable, API key or direct cross-origin API URL is needed for this architecture.

The frontend build generates the MediaPipe runtime/model and checks they exist. Both supplied exercise demonstrations are packaged under `public/reference`. Private home recordings and patient photos are not public assets. API rewrites keep login/media requests on the website origin and explicitly disable API/CDN caching; the backend also sends private/no-store headers. Production login cookies use Secure, HttpOnly and SameSite=Strict.

## 4. Test the hosted application

1. Visit the Vercel HTTPS URL and sign in using a fictional account from `docs/DEMO_ACCOUNTS.md`. The login page does not list credentials.
2. Confirm patient directory, demo Progress, Messages and both exercise videos load.
3. Allow camera access and test a short session; hosted HTTPS is required for camera access. Camera accuracy remains a separate physical validation task.
4. Save an attempt and confirm it appears in the correct patient/physio records, including private pictures.
5. Restart the Render service and sign in again. Confirm saved accounts, sessions and media survived. Login tokens are in memory, so restarting the backend signs users out without deleting records.
6. Check Vercel `/api/health`, Render logs and browser network errors if any request fails.

Large video upload and playback should also be checked on the hosted route; provider proxy limits/timeouts have not been tested locally. The two standard demonstration videos are static frontend assets and do not need API uploading.

## Limits of this quick deployment

This is still a hackathon prototype with file-backed data, public fictional demo accounts and unverified staff onboarding. Use fictional data on the public demonstration. It is not a production clinical hosting/security design. A later production version should use verified staff provisioning, a transactional database, object storage, durable sessions and an appropriate privacy/security review.

## Official references

- Vercel Vite: https://vercel.com/docs/frameworks/frontend/vite
- Vercel external rewrites and cache control: https://vercel.com/docs/routing/rewrites
- Render persistent disks: https://render.com/docs/disks
- Render blueprint fields: https://render.com/docs/blueprint-spec
