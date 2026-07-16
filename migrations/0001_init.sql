CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  domain_quota INTEGER NOT NULL DEFAULT 3,
  permissions_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS domain_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prefix_unicode TEXT NOT NULL,
  prefix_ascii TEXT NOT NULL,
  suffix_unicode TEXT NOT NULL,
  suffix_ascii TEXT NOT NULL,
  fqdn_unicode TEXT NOT NULL,
  fqdn_ascii TEXT NOT NULL,
  record_type TEXT DEFAULT 'CNAME',
  record_content TEXT DEFAULT '',
  proxied INTEGER DEFAULT 0,
  ttl INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  error_message TEXT,
  dns_record_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  expires_at TEXT,
  renewed_at TEXT,
  renew_count INTEGER DEFAULT 0,
  deleted_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_apps_user ON domain_applications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_apps_fqdn ON domain_applications(fqdn_ascii);
