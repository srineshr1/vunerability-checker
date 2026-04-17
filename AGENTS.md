# ExposureIQ — Agent Notes

## Stack

- **client/** — React 19 + Vite + Tailwind CSS v4 (`@tailwindcss/vite`), plain JS/JSX, ES modules
- **server/** — Express.js, plain JS, ES modules, in-memory only (no DB)

## Dev Commands

```bash
# Server (port 3001)
cd server && npm run dev   # node --watch index.js

# Client (port 5173)
cd client && npm run dev   # vite, proxies /api → http://localhost:3001

# Build client
cd client && npm run build

# Lint client
cd client && npm run lint
```

## API

- `POST /api/scan` — body: `{ domain }` → `{ scanId }` (async)
- `GET /api/results/:scanId` — poll for scan status/results
- `POST /api/suggest` — body: `{ assets: [{subdomain, ports, risk}] }` → AI remediation steps (requires ANTHROPIC_API_KEY)

## Env

`.env` at repo root: `SHODAN_API_KEY`, `ANTHROPIC_API_KEY`, `HIBP_API_KEY`, `PORT=3001`.
Server checks keys against placeholder strings — if key is missing or still the placeholder value, that service is skipped.

## Quirks

- DNS: `dns.setServers(['8.8.8.8', '1.1.1.1'])` — does NOT use system resolvers
- Shodan: 1.1s delay between lookups to avoid rate limiting
- crt.sh: wildcard certs filtered out; only subdomains ending with target domain kept
- `/api/suggest` uses Claude Sonnet 4.6 with ephemeral cache; if ANTHROPIC_API_KEY is missing/placeholder, returns 503
- No test suite anywhere
