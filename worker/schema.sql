-- Survive Invest — D1 schema (multi-watchlist + EOD-only)
-- Apply via: wrangler d1 migrations apply survive_invest

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cashflow (
  user_id TEXT PRIMARY KEY,
  income INTEGER NOT NULL,
  fixed_cost INTEGER NOT NULL,
  variable_cost INTEGER NOT NULL DEFAULT 0,
  cash_reserve INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debt (
  user_id TEXT PRIMARY KEY,
  principal INTEGER NOT NULL,
  monthly_interest INTEGER NOT NULL,
  start_date TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist (
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS plans (
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  ladder_json TEXT NOT NULL,
  stop_json TEXT NOT NULL,
  max_weight REAL NOT NULL DEFAULT 0.2,
  risk_per_trade REAL NOT NULL DEFAULT 0.01,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS positions (
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  qty INTEGER NOT NULL,
  avg_price REAL NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS eod_prices (
  symbol TEXT NOT NULL,
  day TEXT NOT NULL,           -- YYYYMMDD
  close REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (symbol, day)
);

CREATE TABLE IF NOT EXISTS alerts (
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rule TEXT NOT NULL,
  last_triggered_at TEXT,
  PRIMARY KEY (user_id, symbol, rule)
);
