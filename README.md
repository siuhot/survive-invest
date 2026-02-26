# Survive Invest (EOD-only) — Multi-watchlist survivability dashboard

This repo contains:
- `worker/`: Cloudflare Worker API with D1 (EOD-only)
- `web/`: Minimal SvelteKit dashboard calling the Worker API

## Quick start (Worker)
```bash
cd worker
npm i -g wrangler
wrangler login
wrangler d1 create survive_invest
# paste database_id into worker/wrangler.toml
wrangler d1 migrations apply survive_invest
wrangler dev
```

## Quick start (Web)
1) Set `API_BASE` in `web/src/lib/api.js` to your Worker URL.
2) Run:
```bash
cd web
npm i
npm run dev
```

## Notes
- MVP auth uses `X-User-Id` header. Later you can map it to Telegram user_id.
- EOD prices are ingested via `POST /api/eod/ingest`.
