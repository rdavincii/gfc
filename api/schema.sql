-- GFC player portal: Cloudflare D1 schema. Run once: npm run db:init (or --local for dev)
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL, number TEXT, position TEXT, pin_salt TEXT, pin_hash TEXT, fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, opponent TEXT, date TEXT, time TEXT, venue TEXT, competition TEXT, home INTEGER, away INTEGER);
CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT, pinned INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rsvps (match_id TEXT NOT NULL, player_id TEXT NOT NULL, status TEXT NOT NULL, note TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY (match_id, player_id));
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, player_id TEXT NOT NULL, match_id TEXT, amount REAL, note TEXT, proof_key TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_payments_player ON payments (player_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions (expires_at);
