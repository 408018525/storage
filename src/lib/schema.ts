import type { Env } from '../env';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','deleted')),
    permissions_json TEXT NOT NULL DEFAULT '{"canApply":true,"maxPending":3,"maxTotal":20,"allowedSuffixes":[]}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    ip_hash TEXT,
    ua_hash TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS domain_applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    prefix_unicode TEXT NOT NULL,
    prefix_ascii TEXT NOT NULL,
    suffix_unicode TEXT NOT NULL,
    suffix_ascii TEXT NOT NULL,
    fqdn_unicode TEXT NOT NULL,
    fqdn_ascii TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_content TEXT NOT NULL,
    proxied INTEGER NOT NULL DEFAULT 0,
    ttl INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','approved','rejected','revoking','revoked','error')),
    review_note TEXT,
    error_message TEXT,
    dns_record_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT,
    reviewed_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_applications_user ON domain_applications(user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_status ON domain_applications(status, created_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_fqdn
    ON domain_applications(fqdn_ascii)
    WHERE status IN ('pending','processing','approved','revoking')`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS registration_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_registration_keys_active ON registration_keys(active, expires_at)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    meta_json TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at DESC)`,
] as const;

let schemaPromise: Promise<void> | null = null;

/**
 * Makes the first Cloudflare Git deployment usable without a GitHub Action or
 * manual Wrangler migration. All statements are idempotent.
 */
export async function ensureSchema(env: Env): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const row = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1",
      ).first<{ name: string }>();
      if (!row) {
        await env.DB.batch(SCHEMA_STATEMENTS.map(sql => env.DB.prepare(sql)));
      }
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}
