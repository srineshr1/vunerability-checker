# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ExposureIQ is an attack-surface / vulnerability scanner. Given a domain, it enumerates subdomains (via crt.sh), resolves IPs, queries Shodan for open ports, checks HIBP for breach data, scores each asset by risk, and surfaces AI-generated remediation suggestions via Groq.

Two separate Node projects — no root `package.json`:

- `server/` — Express API, all scanning logic in `server/index.js`
- `client/` — React + Vite SPA

## Commands

```bash
# Install (once per package)
cd server && npm install
cd client && npm install

# Run backend (http://localhost:3001)
cd server && npm run dev

# Run frontend (http://localhost:5173)
cd client && npm run dev

# Lint / type-check frontend
cd client && npm run lint
cd client && npm run build
```

No test scripts exist in either package.

## Architecture

**Server (`server/index.js`)** — single-file Express app:
- `POST /api/scan` — starts async scan, returns `{ scanId }`
- `GET /api/results/:scanId` — poll until `status` is `complete` or `error`
- `POST /api/suggest` — accepts `assets` array, calls Groq (`llama-3.3-70b-versatile`) for remediation JSON
- Scan state is in-memory (`scanStore` Map); restarting the server drops all results
- Shodan lookups sleep ~1.1 s/IP intentionally to avoid rate limits

**Client (`client/src/`)** — React Router SPA:
- `App.jsx` defines routes: `/`, `/dashboard/:scanId`, `/graph/:scanId`, `/killchain/:scanId`
- `pages/Dashboard.jsx` — main results view; also handles `/dashboard/demo` via `location.state`
- `pages/GraphView.jsx` — asset relationship graph
- `pages/KillChain.jsx` — placeholder only; no backend route exists for it
- Vite proxies `/api` → `http://localhost:3001`

## Key Gotchas

- `dotenv` is loaded from an **absolute path** (`C:/Users/Ricky/Desktop/exposure/.env`). If the repo moves, env loading breaks — fix the path in `server/index.js`.
- Required env vars: `SHODAN_API_KEY`, `HIBP_API_KEY`, `GROQ_API_KEY`. `ANTHROPIC_API_KEY` is read but unused.
- Server logs the raw `GROQ_API_KEY` at startup — avoid sharing startup output.
- CORS is locked to `http://localhost:5173`; change it if the frontend port changes.
- Demo mode (`/dashboard/demo`) requires `location.state` from navigation — hard-refreshing that URL will 404 against the API.
