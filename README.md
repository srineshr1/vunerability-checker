# ExposureIQ

ExposureIQ is a React + Express app for attack-surface scans with Supabase-backed auth, persistence, and shared scan caching.

## What is implemented

- Supabase Auth with Google OAuth (frontend).
- Backend auth guard using Supabase JWTs.
- Global scan cache by domain (shared across users).
- 1-hour cache TTL (same domain within 1 hour returns stored results).
- Manual `Rescan now` option in the UI to bypass cache.
- Supabase persistence for:
  - scans
  - per-user scan requests/history
  - AI suggestions
  - essential user activity events

## Project layout

- `client/` - React + Vite frontend.
- `server/` - Express API.
- `supabase/schema.sql` - SQL schema + indexes + RLS policies.

## 1) Supabase setup

1. Create a Supabase project.
2. In Supabase SQL editor, run `supabase/schema.sql`.
3. In Supabase Auth > Providers, enable Google.
4. Configure Google OAuth redirect URLs:
   - `http://localhost:5173`
   - your production URL (if any)
5. In Supabase Auth URL config, set site URL and allowed redirect URLs.

## 2) Environment variables

Copy `.env.example` to `.env` and fill values.

Required keys:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `GROQ_API_KEY`

Optional keys used by scans:

- `SHODAN_API_KEY`
- `HIBP_API_KEY`

Notes:

- Server loads env from `server/.env` first, then root `.env`.
- `CLIENT_ORIGIN` can be a comma-separated list.

## 3) Run locally

Terminal 1:

```bash
cd server
npm install
npm run dev
```

Terminal 2:

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

## Behavior details

- `POST /api/scan`
  - Normalizes domain.
  - If a scan is already running for same domain, reuses that scan.
  - Else if latest completed scan is <= 1 hour old, returns cached scan.
  - Else starts a new scan.
- `GET /api/results/:scanId`
  - Returns scan data and cache age metadata (`cacheAgeSeconds`).
- Home page includes **Rescan now** checkbox to force fresh scan.
- Dashboard shows freshness quote like: `Scanned just X min ago.`

## Security reminders

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.
- Rotate any leaked API keys immediately.
- Keep `.env` out of git (already ignored).
