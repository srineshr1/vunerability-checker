# ExposureIQ — Agent Notes

## Workspace

- Two Node projects, **no root `package.json`**: `server/` (Express) and `client/` (React + Vite)
- Entrypoints: `server/index.js`, `client/src/main.jsx`, `client/src/App.jsx`
- Landing page at `/` (public, no auth); scan redirects to login if unauthenticated
- No test scripts in either package

## Dev commands

```bash
cd server && npm install && npm run dev   # http://localhost:3001
cd client && npm install && npm run dev   # http://localhost:5173
cd client && npm run lint                 # ESLint (flat config)
cd client && npm run build               # Vite production build
```

## API (all require Supabase JWT via `Authorization: Bearer <token>`)

- `POST /api/scan` → `{ scanId, source, cached, cacheAgeSeconds }`; poll `GET /api/results/:scanId` until `status: "complete"|"error"`
- `GET /api/results/:scanId` → scan data with `cacheAgeSeconds`
- `GET /api/scans/recent?limit=N` → user's recent scans
- `POST /api/suggest` → `{ assets: [] }` → Groq remediation JSON (model: `llama-3.3-70b-versatile`)
- `POST /api/killchain/:scanId` → generates attack chain via Groq
- `POST /api/events` → logs user activity events

## Supabase persistence

- All scan state is in **Supabase**, not in-memory
- Tables: `scans`, `scan_requests`, `ai_suggestions`, `user_activity`, `profiles`
- Global scan cache by domain (1-hour TTL); `forceRescan` param bypasses cache
- `SUPABASE_SERVICE_ROLE_KEY` never exposed to client

## Env

- Server loads `server/.env` first, then `../.env` (root `.env`)
- Required for full functionality: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`
- Optional: `SHODAN_API_KEY`, `HIBP_API_KEY`
- Client env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Key quirks

- DNS resolved via `dns.setServers(['8.8.8.8', '1.1.1.1'])`
- `crt.sh`: wildcard entries stripped; only names ending with target domain kept
- Shodan: ~1.1s sleep/IP to avoid rate limits
- Vite proxy: `/api` → `http://localhost:3001`; server CORS locked to `http://localhost:5173`
- Tailwind v4 with `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- Demo mode (`/dashboard/demo`): hard-refresh fails — relies on `location.state` from prior navigation
