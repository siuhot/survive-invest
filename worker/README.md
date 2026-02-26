# Survive Invest — Worker API (EOD-only)

## Prereqs
- Node.js 18+
- Cloudflare account
- Wrangler CLI

## Setup
```bash
cd worker
npm i -g wrangler
wrangler login
wrangler d1 create survive_invest
# paste database_id into wrangler.toml
wrangler d1 migrations apply survive_invest
wrangler dev
```

## Deploy
```bash
wrangler deploy
```

## Quick test (replace WORKER_URL)
```bash
curl -sS -H "X-User-Id: 123" WORKER_URL/health

curl -sS -X POST WORKER_URL/api/onboard \
  -H "Content-Type: application/json" -H "X-User-Id: 123" \
  -d '{"income":20000000,"fixed_cost":12000000,"variable_cost":2000000,"cash_reserve":24000000,"principal":100000000,"monthly_interest":1000000}'

curl -sS -X POST WORKER_URL/api/watchlist/add \
  -H "Content-Type: application/json" -H "X-User-Id: 123" \
  -d '{"symbol":"FPT"}'

curl -sS -X POST WORKER_URL/api/eod/ingest \
  -H "Content-Type: application/json" -H "X-User-Id: 123" \
  -d '{"day":"20260226","prices":[{"symbol":"FPT","close":90500},{"symbol":"HPG","close":28450}],"source":"manual"}'

curl -sS -X POST WORKER_URL/api/position/set \
  -H "Content-Type: application/json" -H "X-User-Id: 123" \
  -d '{"symbol":"FPT","qty":1100,"avg_price":90500}'

curl -sS -H "X-User-Id: 123" WORKER_URL/api/dashboard | jq
```
