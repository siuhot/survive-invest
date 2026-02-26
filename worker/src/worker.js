/**
 * Survive Invest — Cloudflare Worker API (EOD-only, multi-watchlist)
 * - D1 binding: DB
 * - KV binding: KV (optional; safe to omit if you want)
 *
 * Auth (MVP): X-User-Id header
 *
 * Endpoints:
 *  POST /api/onboard
 *  POST /api/watchlist/add
 *  POST /api/watchlist/remove
 *  GET  /api/watchlist
 *  POST /api/eod/ingest
 *  POST /api/position/set
 *  POST /api/plan/set
 *  GET  /api/dashboard
 */

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    // health
    if (path === "/" || path === "/health") return new Response("OK", { status: 200 });

    // CORS preflight
    if (req.method === "OPTIONS") return cors(new Response("", { status: 204 }));

    try {
      if (path.startsWith("/api/")) {
        const userId = req.headers.get("X-User-Id") || "";
        if (!userId) return cors(json({ ok: false, error: "Missing X-User-Id" }, 401));

        if (path === "/api/onboard" && req.method === "POST") return cors(await onboard(req, env, userId));
        if (path === "/api/watchlist/add" && req.method === "POST") return cors(await watchAdd(req, env, userId));
        if (path === "/api/watchlist/remove" && req.method === "POST") return cors(await watchRemove(req, env, userId));
        if (path === "/api/watchlist" && req.method === "GET") return cors(await watchList(env, userId));

        // EOD ingest (manual / from your script)
        if (path === "/api/eod/ingest" && req.method === "POST") return cors(await eodIngest(req, env));

        // positions
        if (path === "/api/position/set" && req.method === "POST") return cors(await positionSet(req, env, userId));

        // plan per symbol
        if (path === "/api/plan/set" && req.method === "POST") return cors(await planSet(req, env, userId));

        // dashboards
        if (path === "/api/dashboard" && req.method === "GET") return cors(await dashboard(env, userId));

        return cors(json({ ok: false, error: "Not found" }, 404));
      }

      return cors(json({ ok: false, error: "Not found" }, 404));
    } catch (e) {
      return cors(json({ ok: false, error: String(e?.message || e) }, 500));
    }
  },
};

function cors(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type,X-User-Id");
  return new Response(res.body, { status: res.status, headers: h });
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
function nowISO() { return new Date().toISOString(); }
function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

// ---------- API handlers ----------
async function onboard(req, env, userId) {
  const body = await req.json();
  const {
    income, fixed_cost, variable_cost = 0, cash_reserve = 0,
    principal = 100_000_000, monthly_interest = 1_000_000, start_date = null
  } = body;

  await env.DB.prepare(
    `INSERT INTO users(id, created_at) VALUES(?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).bind(userId, nowISO()).run();

  await env.DB.prepare(
    `INSERT INTO cashflow(user_id,income,fixed_cost,variable_cost,cash_reserve,updated_at)
     VALUES(?,?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       income=excluded.income,
       fixed_cost=excluded.fixed_cost,
       variable_cost=excluded.variable_cost,
       cash_reserve=excluded.cash_reserve,
       updated_at=excluded.updated_at`
  ).bind(userId, income|0, fixed_cost|0, variable_cost|0, cash_reserve|0, nowISO()).run();

  await env.DB.prepare(
    `INSERT INTO debt(user_id,principal,monthly_interest,start_date,updated_at)
     VALUES(?,?,?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET
       principal=excluded.principal,
       monthly_interest=excluded.monthly_interest,
       start_date=excluded.start_date,
       updated_at=excluded.updated_at`
  ).bind(userId, principal|0, monthly_interest|0, start_date, nowISO()).run();

  return json({ ok: true });
}

async function watchAdd(req, env, userId) {
  const { symbol } = await req.json();
  const sym = normalizeSymbol(symbol);
  await env.DB.prepare(
    `INSERT INTO watchlist(user_id,symbol,created_at) VALUES(?,?,?)
     ON CONFLICT(user_id,symbol) DO NOTHING`
  ).bind(userId, sym, nowISO()).run();
  return json({ ok: true, symbol: sym });
}
async function watchRemove(req, env, userId) {
  const { symbol } = await req.json();
  const sym = normalizeSymbol(symbol);
  await env.DB.prepare(`DELETE FROM watchlist WHERE user_id=? AND symbol=?`).bind(userId, sym).run();
  return json({ ok: true, symbol: sym });
}
async function watchList(env, userId) {
  const r = await env.DB.prepare(`SELECT symbol FROM watchlist WHERE user_id=? ORDER BY symbol`).bind(userId).all();
  return json({ ok: true, symbols: r.results.map(x => x.symbol) });
}

async function eodIngest(req, env) {
  // body: { day:"YYYYMMDD", prices:[{symbol:"FPT", close:90500}, ...], source? }
  const { day = todayYYYYMMDD(), prices = [], source = "manual" } = await req.json();
  if (!Array.isArray(prices) || prices.length === 0) return json({ ok: false, error: "prices[] required" }, 400);

  const stmt = env.DB.prepare(
    `INSERT INTO eod_prices(symbol,day,close,source,updated_at)
     VALUES(?,?,?,?,?)
     ON CONFLICT(symbol,day) DO UPDATE SET close=excluded.close, source=excluded.source, updated_at=excluded.updated_at`
  );

  const batch = prices.map(p => {
    const sym = normalizeSymbol(p.symbol);
    const close = Number(p.close);
    return stmt.bind(sym, day, close, source, nowISO());
  });

  await env.DB.batch(batch);
  return json({ ok: true, day, count: prices.length });
}

async function positionSet(req, env, userId) {
  // body: {symbol, qty, avg_price}
  const { symbol, qty, avg_price } = await req.json();
  const sym = normalizeSymbol(symbol);
  await env.DB.prepare(
    `INSERT INTO positions(user_id,symbol,qty,avg_price,updated_at)
     VALUES(?,?,?,?,?)
     ON CONFLICT(user_id,symbol) DO UPDATE SET
       qty=excluded.qty, avg_price=excluded.avg_price, updated_at=excluded.updated_at`
  ).bind(userId, sym, qty|0, Number(avg_price), nowISO()).run();
  return json({ ok: true, symbol: sym });
}

async function planSet(req, env, userId) {
  // body: {symbol, ladder, stop, max_weight?, risk_per_trade?}
  const { symbol, ladder, stop, max_weight = 0.2, risk_per_trade = 0.01 } = await req.json();
  const sym = normalizeSymbol(symbol);

  if (!ladder?.levels?.length) return json({ ok:false, error:"ladder.levels required"}, 400);
  if (!stop?.stop_total) return json({ ok:false, error:"stop.stop_total required"}, 400);

  await env.DB.prepare(
    `INSERT INTO plans(user_id,symbol,ladder_json,stop_json,max_weight,risk_per_trade,updated_at)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(user_id,symbol) DO UPDATE SET
       ladder_json=excluded.ladder_json,
       stop_json=excluded.stop_json,
       max_weight=excluded.max_weight,
       risk_per_trade=excluded.risk_per_trade,
       updated_at=excluded.updated_at`
  ).bind(
    userId, sym,
    JSON.stringify(ladder),
    JSON.stringify(stop),
    Number(max_weight),
    Number(risk_per_trade),
    nowISO()
  ).run();

  return json({ ok: true, symbol: sym });
}

async function dashboard(env, userId) {
  const cf = await env.DB.prepare(`SELECT * FROM cashflow WHERE user_id=?`).bind(userId).first();
  const debt = await env.DB.prepare(`SELECT * FROM debt WHERE user_id=?`).bind(userId).first();
  const wl = await env.DB.prepare(`SELECT symbol FROM watchlist WHERE user_id=?`).bind(userId).all();
  const pos = await env.DB.prepare(`SELECT symbol,qty,avg_price FROM positions WHERE user_id=?`).bind(userId).all();

  const monthly_interest = Number(debt?.monthly_interest || 1_000_000);
  const requiredMonths = Number(env.REQUIRED_INTEREST_BUFFER_MONTHS || 12);
  const required_cash_buffer = monthly_interest * requiredMonths;

  const income = Number(cf?.income || 0);
  const fixed_cost = Number(cf?.fixed_cost || 0);
  const variable_cost = Number(cf?.variable_cost || 0);
  const cash_reserve = Number(cf?.cash_reserve || 0);

  const free_cash_before_interest = income - fixed_cost - variable_cost;
  const burn = Math.max(0, (fixed_cost + variable_cost + monthly_interest) - income);
  const runway_total_months = burn > 0 ? (cash_reserve / burn) : 999;

  const symbols = wl.results.map(x => x.symbol);
  const prices = await getLatestEodPrices(env, symbols);

  let mktValue = 0;
  let costValue = 0;

  const positions = pos.results.map(p => {
    const last = prices[p.symbol]?.close ?? null;
    const qty = Number(p.qty);
    const avg = Number(p.avg_price);
    const mv = last != null ? qty * last : null;
    if (mv != null) mktValue += mv;
    costValue += qty * avg;

    return {
      symbol: p.symbol,
      qty,
      avg_price: avg,
      last_close: last,
      pnl: (last != null ? (qty * (last - avg)) : null),
    };
  });

  const cash_buffer_ok = cash_reserve >= required_cash_buffer;

  const watchlist = symbols.map(sym => {
    const last = prices[sym]?.close ?? null;
    let state = "YELLOW";
    if (!cash_buffer_ok || runway_total_months < 6) state = "ORANGE";
    if (!cash_buffer_ok || runway_total_months < 3) state = "RED";
    if (cash_buffer_ok && runway_total_months >= 12) state = "GREEN";
    return { symbol: sym, last_close: last, state };
  });

  return json({
    ok: true,
    survivability: {
      free_cash_before_interest,
      monthly_interest,
      required_cash_buffer,
      cash_reserve,
      cash_buffer_ok,
      burn,
      runway_total_months,
      weekly_interest_est: Math.round(monthly_interest / 4.33)
    },
    nav: { costValue, mktValue, pnl: (mktValue - costValue) },
    watchlist,
    positions,
  });
}

// ---------- helpers ----------
function normalizeSymbol(s) {
  return String(s || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
async function getLatestEodPrices(env, symbols) {
  const out = {};
  for (const sym of symbols) {
    const r = await env.DB.prepare(
      `SELECT day, close FROM eod_prices WHERE symbol=? ORDER BY day DESC LIMIT 1`
    ).bind(sym).first();
    if (r) out[sym] = { day: r.day, close: Number(r.close) };
  }
  return out;
}
