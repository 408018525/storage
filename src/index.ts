/// <reference types="@cloudflare/workers-types" />

interface D1Result<T = unknown> { results?: T[]; meta?: { changes?: number } }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  DB: D1Database;
  APP_KV: KVNamespace;
  ASSETS: Fetcher;
  BOOTSTRAP_ADMIN_TOKEN?: string;
  CF_API_TOKEN?: string;
  DNS_SUFFIX?: string;
  DNS_SUFFIX_LABEL?: string;
  DNS_ZONE_ID?: string;
  DNS_ALLOWED_TYPES?: string;
  DNS_DEFAULT_TYPE?: string;
  DNS_TTL?: string;
  DNS_PROXIED?: string;
  DNS_RESERVED_PREFIXES?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TURNSTILE_ENABLE_APPLY?: string;
  TURNSTILE_ENABLE_LOGIN?: string;
  TURNSTILE_ENABLE_REGISTER?: string;
  TURNSTILE_ACTION_APPLY?: string;
  TURNSTILE_ACTION_LOGIN?: string;
  TURNSTILE_ACTION_REGISTER?: string;
}

type Role = 'admin' | 'user';
type UserStatus = 'active' | 'disabled' | 'deleted';
type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  password_salt: string;
  role: Role;
  status: UserStatus;
  domain_quota?: number | null;
  permissions_json?: string | null;
  created_at: string;
  updated_at?: string | null;
  last_login_at?: string | null;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  username?: string | null;
  prefix_unicode: string;
  prefix_ascii: string;
  suffix_unicode: string;
  suffix_ascii: string;
  fqdn_unicode: string;
  fqdn_ascii: string;
  record_type: string | null;
  record_content: string | null;
  proxied: number | null;
  ttl: number | null;
  status: string;
  review_note?: string | null;
  error_message?: string | null;
  dns_record_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  expires_at?: string | null;
  renewed_at?: string | null;
  renew_count?: number | null;
  deleted_at?: string | null;
  delete_requested_at?: string | null;
  delete_requested_by?: string | null;
}

interface DnsRecordRow {
  id: string;
  application_id: string;
  user_id: string;
  host: string;
  name: string;
  type: DnsRecordType;
  content: string;
  priority?: number | null;
  proxied?: number | null;
  ttl?: number | null;
  cf_record_id?: string | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  fqdn_unicode?: string | null;
  fqdn_ascii?: string | null;
  username?: string | null;
}

interface MessageRow {
  id: string;
  sender_user_id?: string | null;
  sender_username?: string | null;
  target_type: string;
  target_user_id?: string | null;
  target_username?: string | null;
  target_role?: string | null;
  title: string;
  body: string;
  level: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  sent_at?: string | null;
  deleted_at?: string | null;
  read_at?: string | null;
}


interface HelpItemSetting {
  id?: string;
  q: string;
  a: string;
}

interface HelpCategorySetting {
  key: string;
  title: string;
  subtitle?: string;
  items: HelpItemSetting[];
}

interface AppSettings {
  site: {
    title: string;
    subtitle: string;
    footer: string;
    accent: string;
    accent2: string;
    logoText: string;
  };
  registration: {
    enabled: boolean;
    autoActivate: boolean;
  };
  domain: {
    defaultQuota: number;
    validDays: number;
    renewWindowDays: number;
    allowUserDeleteInvalid: boolean;
    allowDnsEditAfterApproved: boolean;
  };
  help: {
    categories: HelpCategorySetting[];
  };
  dns: {
    envManaged: boolean;
    reservedPrefixes: string[];
    suffixes: Array<{
      label: string;
      suffix: string;
      suffixAscii: string;
      zoneId: string;
      allowedTypes: string[];
      defaultType: DnsRecordType;
      ttl: number;
      proxied: boolean;
      enabled: boolean;
    }>;
  };
}

const DAY = 24 * 60 * 60 * 1000;
const SETTINGS_KEY = 'app_settings_v4';

class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      assertSameOrigin(request);
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        await ensureSchema(env);
        return await handleApi(request, env, url);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ ok: false, code: error.code, message: error.message, details: error.details }, error.status);
      }
      console.error(error);
      const message = error instanceof Error && error.message ? error.message : '服务器内部错误';
      return json({ ok: false, code: 'INTERNAL_ERROR', message }, 500);
    }
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/public/config') return publicConfigHandler(env);

  if (method === 'POST' && pathname === '/api/setup/bootstrap') return bootstrapAdmin(request, env);

  if (method === 'POST' && pathname === '/api/auth/login') return login(request, env);
  if (method === 'POST' && pathname === '/api/auth/register') return register(request, env);
  if (method === 'POST' && pathname === '/api/auth/logout') return logout(request, env);
  if (method === 'GET' && pathname === '/api/auth/me') return authMe(request, env);
  if (method === 'POST' && pathname === '/api/auth/change-password') return changeOwnPassword(request, env);
  if (method === 'POST' && pathname === '/api/account/delete') return deleteOwnAccount(request, env);

  if (method === 'GET' && pathname === '/api/applications') return listOwnApplications(request, env);
  if (method === 'POST' && pathname === '/api/applications') return createApplication(request, env);

  let match = pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (match && method === 'GET') return getOwnApplication(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return deleteOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/dns$/);
  if (match && method === 'PATCH') return updateOwnDns(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/dns-records$/);
  if (match && method === 'GET') return listOwnDnsRecords(request, env, decodeURIComponent(match[1]));
  if (match && method === 'POST') return createOwnDnsRecord(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/dns-records\/([^/]+)$/);
  if (match && method === 'PATCH') return updateOwnDnsRecordManaged(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return deleteOwnDnsRecordManaged(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/renew$/);
  if (match && method === 'POST') return renewOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/delete-request$/);
  if (match && method === 'POST') return requestDeleteOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/delete-request\/cancel$/);
  if (match && method === 'POST') return cancelDeleteOwnApplication(request, env, decodeURIComponent(match[1]));

  if (method === 'GET' && pathname === '/api/messages') return listOwnMessages(request, env);
  if (method === 'POST' && pathname === '/api/messages/contact-admin') return contactAdminMessage(request, env);
  if (method === 'POST' && pathname === '/api/messages/read-batch') return markOwnMessagesReadBatch(request, env);
  match = pathname.match(/^\/api\/messages\/([^/]+)\/reply$/);
  if (match && method === 'POST') return replyOwnMessage(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/messages\/([^/]+)\/read$/);
  if (match && method === 'POST') return markOwnMessageRead(request, env, decodeURIComponent(match[1]));

  if (method === 'GET' && pathname === '/api/operation-logs') return listOperationLogs(request, env);

  if (method === 'GET' && pathname === '/api/admin/overview') return adminOverview(request, env);
  if (method === 'GET' && pathname === '/api/admin/applications') return adminApplications(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/users') return adminUsers(request, env);
  if (method === 'POST' && pathname === '/api/admin/users') return adminCreateUser(request, env);
  if (method === 'GET' && pathname === '/api/admin/messages') return adminListMessages(request, env, url);
  if (method === 'POST' && pathname === '/api/admin/messages') return adminCreateMessage(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings') return adminSettings(request, env);
  if (method === 'GET' && pathname === '/api/admin/help-settings') return adminHelpSettings(request, env);
  if (method === 'PUT' && pathname === '/api/admin/help-settings') return adminUpdateHelpSettings(request, env);

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateMessage(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return adminDeleteMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/send$/);
  if (match && method === 'POST') return adminSendMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/settings\/(site|registration|domain)$/);
  if (match && method === 'PUT') return adminUpdateSettings(request, env, match[1] as 'site' | 'registration' | 'domain');

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateUser(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/(approve|reject|revoke|disable|delete|approve-delete|reject-delete)$/);
  if (match && method === 'POST') return adminReviewApplication(request, env, decodeURIComponent(match[1]), match[2]);

  throw new HttpError(404, 'NOT_FOUND', '接口不存在');
}

async function ensureSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`
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
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        ip TEXT,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
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
        delete_requested_at TEXT,
        delete_requested_by TEXT,
        updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS dns_records (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        host TEXT NOT NULL DEFAULT '@',
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority INTEGER,
        proxied INTEGER DEFAULT 0,
        ttl INTEGER DEFAULT 1,
        cf_record_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(application_id) REFERENCES domain_applications(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS system_messages (
        id TEXT PRIMARY KEY,
        sender_user_id TEXT,
        target_type TEXT NOT NULL DEFAULT 'all',
        target_user_id TEXT,
        target_role TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'info',
        status TEXT NOT NULL DEFAULT 'sent',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        sent_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(sender_user_id) REFERENCES users(id),
        FOREIGN KEY(target_user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS message_reads (
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        read_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES system_messages(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        ip TEXT,
        meta_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_apps_user ON domain_applications(user_id, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_apps_fqdn ON domain_applications(fqdn_ascii)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_dns_records_app ON dns_records(application_id, deleted_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_dns_records_cf ON dns_records(cf_record_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_status ON system_messages(status, sent_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_target_user ON system_messages(target_type, target_user_id, status)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_target_role ON system_messages(target_type, target_role, status)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at)'),
  ]);

  const alters = [
    `ALTER TABLE sessions ADD COLUMN ip TEXT`,
    `ALTER TABLE sessions ADD COLUMN user_agent TEXT`,
    `ALTER TABLE sessions ADD COLUMN expires_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN created_at TEXT`,
    `ALTER TABLE users ADD COLUMN domain_quota INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE users ADD COLUMN permissions_json TEXT DEFAULT '{}'`,
    `ALTER TABLE users ADD COLUMN updated_at TEXT`,
    `ALTER TABLE users ADD COLUMN last_login_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN expires_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN renewed_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN renew_count INTEGER DEFAULT 0`,
    `ALTER TABLE domain_applications ADD COLUMN deleted_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN delete_requested_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN delete_requested_by TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN updated_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN record_type TEXT DEFAULT 'CNAME'`,
    `ALTER TABLE domain_applications ADD COLUMN record_content TEXT DEFAULT ''`,
    `ALTER TABLE domain_applications ADD COLUMN proxied INTEGER DEFAULT 0`,
    `ALTER TABLE domain_applications ADD COLUMN ttl INTEGER DEFAULT 1`,
    `ALTER TABLE domain_applications ADD COLUMN dns_record_id TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN error_message TEXT`,
  ];

  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }

  const settings = await loadSettings(env);
  await env.DB.prepare(`
    UPDATE users SET domain_quota=?
    WHERE domain_quota IS NULL OR domain_quota <= 0
  `).bind(settings.domain.defaultQuota).run();

  await env.DB.prepare(`
    UPDATE domain_applications
    SET expires_at = datetime(COALESCE(reviewed_at, created_at), '+' || ? || ' days')
    WHERE (expires_at IS NULL OR expires_at='')
      AND status='approved'
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(settings.domain.validDays).run();

  await cleanupOperationLogs(env);
  await cleanupHardDeletedRows(env);
}

async function cleanupOperationLogs(env: Env): Promise<void> {
  // 操作日志只保留最近 7 天；账号注销或被标记删除后，自动清理该账号相关日志。
  try {
    await env.DB.prepare(`DELETE FROM audit_logs WHERE datetime(created_at) < datetime('now','-7 days')`).run();
  } catch (error) { console.error('cleanup old audit logs failed', error); }
  try {
    await env.DB.prepare(`
      DELETE FROM audit_logs
      WHERE actor_user_id IN (SELECT id FROM users WHERE status='deleted')
         OR (target_type='user' AND target_id IN (SELECT id FROM users WHERE status='deleted'))
         OR (actor_user_id IS NOT NULL AND actor_user_id NOT IN (SELECT id FROM users))
         OR (target_type='user' AND target_id IS NOT NULL AND target_id NOT IN (SELECT id FROM users))
    `).run();
  } catch (error) { console.error('cleanup deleted-user audit logs failed', error); }
}


async function cleanupHardDeletedRows(env: Env): Promise<void> {
  // v43：历史软删除数据自动转为硬删除，避免 D1 里长期残留 deleted_at/status=deleted 的脏数据。
  const statements = [
    `DELETE FROM dns_records WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM message_reads WHERE message_id NOT IN (SELECT id FROM system_messages)`,
    `DELETE FROM message_reads WHERE user_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM system_messages WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM dns_records WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM domain_applications WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM message_reads WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM system_messages WHERE sender_user_id IN (SELECT id FROM users WHERE status='deleted') OR target_user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE status='deleted') OR (target_type='user' AND target_id IN (SELECT id FROM users WHERE status='deleted'))`,
    `DELETE FROM users WHERE status='deleted'`,
    `DELETE FROM domain_applications WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM audit_logs WHERE datetime(created_at) < datetime('now','-7 days')`,
  ];
  for (const sql of statements) {
    try { await env.DB.prepare(sql).run(); } catch (error) { console.error('cleanup hard deleted rows failed', sql, error); }
  }
}

async function deleteKnownKvKeys(env: Env, keys: string[]): Promise<void> {
  for (const key of keys.filter(Boolean)) {
    try { await env.APP_KV.delete(key); } catch {}
  }
}

async function purgeAuditForTarget(env: Env, targetType: string, targetId: string): Promise<void> {
  try {
    await env.DB.prepare(`DELETE FROM audit_logs WHERE target_type=? AND target_id=?`).bind(targetType, targetId).run();
  } catch {}
}

async function hardDeleteDnsRecordRow(env: Env, recordId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM dns_records WHERE id=?`).bind(recordId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='dns_record' AND target_id=?`).bind(recordId),
  ]);
  await deleteKnownKvKeys(env, [`dns_record:${recordId}`, `dns:${recordId}`]);
}

async function hardDeleteDomainApplication(env: Env, appId: string): Promise<void> {
  const records = await env.DB.prepare(`SELECT id FROM dns_records WHERE application_id=?`).bind(appId).all<{ id: string }>();
  const recordIds = (records.results || []).map(r => r.id);
  const batch = [
    env.DB.prepare(`DELETE FROM dns_records WHERE application_id=?`).bind(appId),
    env.DB.prepare(`DELETE FROM domain_applications WHERE id=?`).bind(appId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='domain_application' AND target_id=?`).bind(appId),
  ];
  for (const recordId of recordIds) {
    batch.push(env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='dns_record' AND target_id=?`).bind(recordId));
  }
  await env.DB.batch(batch);
  await deleteKnownKvKeys(env, [`domain_application:${appId}`, `application:${appId}`, `domain:${appId}`, ...recordIds.flatMap(id => [`dns_record:${id}`, `dns:${id}`])]);
}

async function hardDeleteUser(env: Env, userId: string): Promise<void> {
  const apps = await env.DB.prepare(`SELECT id FROM domain_applications WHERE user_id=?`).bind(userId).all<{ id: string }>();
  const appIds = (apps.results || []).map(a => a.id);
  const records = await env.DB.prepare(`SELECT id FROM dns_records WHERE user_id=? OR application_id IN (SELECT id FROM domain_applications WHERE user_id=?)`).bind(userId, userId).all<{ id: string }>();
  const recordIds = (records.results || []).map(r => r.id);
  const messages = await env.DB.prepare(`SELECT id FROM system_messages WHERE sender_user_id=? OR target_user_id=?`).bind(userId, userId).all<{ id: string }>();
  const messageIds = (messages.results || []).map(m => m.id);

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id IN (SELECT id FROM system_messages WHERE sender_user_id=? OR target_user_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM system_messages WHERE sender_user_id=? OR target_user_id=?`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM dns_records WHERE user_id=? OR application_id IN (SELECT id FROM domain_applications WHERE user_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM domain_applications WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE actor_user_id=? OR (target_type='user' AND target_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(userId),
  ]);

  const kvKeys = [`user:${userId}`, `account:${userId}`];
  for (const appId of appIds) kvKeys.push(`domain_application:${appId}`, `application:${appId}`, `domain:${appId}`);
  for (const recordId of recordIds) kvKeys.push(`dns_record:${recordId}`, `dns:${recordId}`);
  for (const messageId of messageIds) kvKeys.push(`message:${messageId}`, `system_message:${messageId}`);
  await deleteKnownKvKeys(env, kvKeys);
}

async function publicConfigHandler(env: Env): Promise<Response> {
  const settings = await loadSettings(env);
  const adminCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'
  `).first<{ count: number }>();

  return ok({
    config: {
      site: settings.site,
      registration: { ...settings.registration, enabled: true },
      domain: settings.domain,
      help: settings.help,
      suffixes: settings.dns.suffixes
        .filter(x => x.enabled)
        .map(x => ({
          label: x.label,
          suffix: x.suffix,
          allowedTypes: x.allowedTypes,
          defaultType: x.defaultType,
          ttl: x.ttl,
          proxied: x.proxied,
        })),
      turnstile: turnstilePublicConfig(env),
      needsBootstrap: Number(adminCount?.count || 0) === 0,
    },
  });
}

async function bootstrapAdmin(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'bootstrap', 5, 900);
  const body = await readJson<Record<string, unknown>>(request);
  const existing = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'
  `).first<{ count: number }>();

  if (Number(existing?.count || 0) > 0) throw new HttpError(409, 'ALREADY_BOOTSTRAPPED', '管理员已初始化');
  if (!env.BOOTSTRAP_ADMIN_TOKEN || String(body.setupToken || '') !== env.BOOTSTRAP_ADMIN_TOKEN) {
    throw new HttpError(403, 'INVALID_SETUP_TOKEN', '初始化令牌不正确');
  }

  const settings = await loadSettings(env);
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?, ?)
  `).bind(id, username, email, hash, salt, settings.domain.defaultQuota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, id, 'setup.bootstrap_admin', 'user', id);
  const cookie = await createSession(env, request, id, false);
  return withCookie(ok({ user: serializeUser({
    id, username, email, password_hash: '', password_salt: '', role: 'admin', status: 'active',
    domain_quota: settings.domain.defaultQuota, permissions_json: '{}', created_at: new Date().toISOString(),
  }) }), cookie);
}

async function register(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'register', 10, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  const adminCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status='active'
  `).first<{ count: number }>();
  if (Number(adminCount?.count || 0) < 1) throw new HttpError(503, 'SETUP_REQUIRED', '系统尚未完成管理员初始化');
  // 用户注册默认开放；前端注册入口不再因为历史 KV 设置关闭而失效。

  if (isEnabled(env.TURNSTILE_ENABLE_REGISTER, false) && String(body.turnstileToken || '').trim()) {
    await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_REGISTER || 'register');
  }

  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE OR (? IS NOT NULL AND email=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号或邮箱/手机号已被使用');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const status = settings.registration.autoActivate ? 'active' : 'disabled';

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?)
  `).bind(id, username, email, hash, salt, status, settings.domain.defaultQuota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, id, 'auth.register', 'user', id, { status });

  // 注册接口只负责创建账户，不再自动创建登录会话。
  // 这样即使旧数据库 sessions 表结构不一致，也不会出现“用户已创建但注册提示失败”。
  return ok({ registered: true, pendingActivation: status !== 'active' });
}

async function login(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'login', 20, 600);
  const body = await readJson<Record<string, unknown>>(request);
  const identity = String(body.identity || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!identity || !password) throw new HttpError(400, 'MISSING_CREDENTIALS', '请输入用户名/邮箱和密码');

  if (isEnabled(env.TURNSTILE_ENABLE_LOGIN, false)) {
    await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_LOGIN || 'login');
  }

  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE (username=? COLLATE NOCASE OR email=? COLLATE NOCASE) LIMIT 1
  `).bind(identity, identity).first<UserRow>();

  let passwordOk = false;
  if (user) {
    try {
      passwordOk = await verifyPassword(password, user.password_hash, user.password_salt);
    } catch (error) {
      console.error('password verify failed', error);
      passwordOk = false;
    }
  }

  if (!user || !passwordOk) {
    await audit(env, request, user?.id || null, 'auth.login_failed', 'user', user?.id || null, { identity });
    throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户已被禁用');

  try {
    await env.DB.prepare(`
      UPDATE users SET last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?
    `).bind(user.id).run();
  } catch (error) {
    try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN last_login_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN updated_at TEXT`).run(); } catch {}
    try {
      await env.DB.prepare(`
        UPDATE users SET last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?
      `).bind(user.id).run();
    } catch (inner) {
      console.error('login timestamp update failed', inner);
    }
  }

  const cookie = await createSession(env, request, user.id, Boolean(body.remember));
  await audit(env, request, user.id, 'auth.login', 'user', user.id);
  return withCookie(ok({ user: serializeUser(user) }), cookie);
}

async function logout(request: Request, env: Env): Promise<Response> {
  const user = await getAuthUser(env, request);
  const cookie = await destroySession(env, request);
  if (user) await audit(env, request, user.id, 'auth.logout', 'user', user.id);
  return withCookie(ok({ loggedOut: true }), cookie);
}

async function authMe(request: Request, env: Env): Promise<Response> {
  const user = await getAuthUser(env, request);
  return ok({ user: user ? serializeUser(user) : null });
}

async function changeOwnPassword(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = validatePassword(body.newPassword);

  const row = await env.DB.prepare(`
    SELECT password_hash,password_salt FROM users WHERE id=?
  `).bind(user.id).first<{ password_hash: string; password_salt: string }>();

  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash=?,password_salt=?,updated_at=datetime('now') WHERE id=?`).bind(hash, salt, user.id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(user.id),
  ]);
  await audit(env, request, user.id, 'auth.password_changed', 'user', user.id);
  return withCookie(ok({ changed: true }), await destroySession(env, request));
}

async function deleteOwnAccount(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);

  if (user.role === 'admin') {
    throw new HttpError(403, 'ADMIN_DELETE_FORBIDDEN', '管理员账号不能在前台注销，请先创建其他管理员后由后台处理');
  }

  const currentPassword = String(body.currentPassword || '');
  const confirmAccount = String(body.confirmAccount ?? body.confirmUsername ?? '').trim();
  if (confirmAccount !== user.username) {
    throw new HttpError(400, 'CONFIRM_USERNAME_MISMATCH', '请输入当前账号确认注销');
  }

  const row = await env.DB.prepare(`
    SELECT password_hash,password_salt FROM users WHERE id=? AND status='active'
  `).bind(user.id).first<{ password_hash: string; password_salt: string }>();

  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }

  const activeDomains = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE user_id=?
      AND status='approved'
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(user.id).first<{ count: number }>();

  if (Number(activeDomains?.count || 0) > 0) {
    throw new HttpError(409, 'ACTIVE_DOMAINS_EXIST', '账户下还有正常域名，请先申请删除域名并等待管理员批准后再注销账号');
  }

  await hardDeleteUser(env, user.id);
  return withCookie(ok({ deleted: true, purged: true }), await destroySession(env, request));
}

async function listOwnApplications(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const rows = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE user_id=? AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY created_at DESC
    LIMIT 500
  `).bind(user.id).all<ApplicationRow>();

  const apps = (rows.results || []).map(x => serializeApplication(x, settings));
  const used = apps.filter(x => !['rejected', 'revoked', 'deleted'].includes(x.status)).length;
  const rawTotal = Number(user.domain_quota || settings.domain.defaultQuota);
  const total = Math.max(0, rawTotal); // v29：额度按管理员设置原样生效，不再把 9999 还原为默认值

  return ok({
    applications: apps,
    quota: {
      used,
      total,
      remaining: Math.max(0, total - used),
      label: `${used} / ${total}`,
    },
  });
}

async function getOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  return ok({ application: serializeApplication(app, await loadSettings(env)) });
}

async function createApplication(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await rateLimit(env, request, `apply:${user.id}`, 20, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  if (isEnabled(env.TURNSTILE_ENABLE_APPLY, false)) {
    await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_APPLY || 'domain_apply');
  }

  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户不可用');

  const prefix = normalizePrefix(body.prefix);
  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(x => x.enabled && (x.suffix === suffixInput || x.suffixAscii === suffixInput));
  if (!suffix) throw new HttpError(400, 'SUFFIX_NOT_ALLOWED', '该根域名不可注册');

  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii)) {
    throw new HttpError(409, 'RESERVED_PREFIX', '该前缀为系统保留词');
  }

  const fqdnUnicode = `${prefix.unicode}.${suffix.suffix}`;
  const fqdnAscii = `${prefix.ascii}.${suffix.suffixAscii}`;

  const duplicate = await env.DB.prepare(`
    SELECT id,status FROM domain_applications
    WHERE fqdn_ascii=? COLLATE NOCASE
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(fqdnAscii).first<{ id: string; status: string }>();
  if (duplicate) throw new HttpError(409, 'DOMAIN_EXISTS', '该域名已被注册或正在审核');

  const activeCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE user_id=? AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(user.id).first<{ count: number }>();

  const rawQuota = Number(user.domain_quota || settings.domain.defaultQuota);
  const totalQuota = Math.max(0, rawQuota); // v29：按用户自身额度限制，不再把 9999 还原为默认值
  if (Number(activeCount?.count || 0) >= totalQuota) {
    throw new HttpError(403, 'DOMAIN_QUOTA_EXCEEDED', `您的域名额度已用完，当前额度为 ${totalQuota} 个`);
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO domain_applications (
      id,user_id,prefix_unicode,prefix_ascii,suffix_unicode,suffix_ascii,fqdn_unicode,fqdn_ascii,
      record_type,record_content,proxied,ttl,status,expires_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)
  `).bind(
    id, user.id, prefix.unicode, prefix.ascii, suffix.suffix, suffix.suffixAscii, fqdnUnicode, fqdnAscii,
    suffix.defaultType, '', suffix.proxied ? 1 : 0, suffix.ttl, 'pending',
  ).run();

  await audit(env, request, user.id, 'application.create', 'domain_application', id, { fqdnAscii });
  const app = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(app!, settings) });
}

async function updateOwnDns(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  if (app.status !== 'approved') throw new HttpError(409, 'DOMAIN_NOT_APPROVED', '域名审核通过后才能设置解析');

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '根域名配置不存在');

  if (app.status === 'approved' && !settings.domain.allowDnsEditAfterApproved) {
    throw new HttpError(403, 'DNS_EDIT_CLOSED', '管理员已关闭生效域名的 DNS 修改');
  }

  const recordType = normalizeRecordType(body.recordType || app.record_type || suffix.defaultType, suffix.allowedTypes);
  const recordContent = normalizeDnsTarget(recordType, body.target, app.fqdn_ascii);

  let dnsRecordId = app.dns_record_id || '';
  let newStatus = app.status;
  let errorMessage = '';

  if (app.status === 'approved') {
    const token = resolveDnsToken(env);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    try {
      if (app.dns_record_id) {
        const record = await updateDnsRecord(token, suffix.zoneId, app.dns_record_id, {
          type: recordType,
          name: app.fqdn_ascii,
          content: recordContent,
          ttl: Number(app.ttl || suffix.ttl || 1),
          proxied: Boolean(app.proxied),
          comment: `Updated by storage portal ${app.id}`,
        });
        dnsRecordId = record.id || app.dns_record_id || '';
      } else {
        const record = await createDnsRecord(token, suffix.zoneId, {
          type: recordType,
          name: app.fqdn_ascii,
          content: recordContent,
          ttl: Number(app.ttl || suffix.ttl || 1),
          proxied: Boolean(app.proxied),
          comment: `Created by storage portal ${app.id} after approval`,
        });
        dnsRecordId = record.id || '';
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 保存失败';
      throw new HttpError(502, 'DNS_SAVE_FAILED', errorMessage);
    }
  }

  await env.DB.prepare(`
    UPDATE domain_applications
    SET record_type=?,record_content=?,dns_record_id=?,status=?,error_message=?,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(recordType, recordContent, dnsRecordId, newStatus, errorMessage, id, user.id).run();

  await audit(env, request, user.id, 'application.dns_update', 'domain_application', id, { recordType, recordContent });
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, settings) });
}

async function listOwnDnsRecords(request: Request, env: Env, applicationId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(applicationId, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');

  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records
    WHERE application_id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY CASE host WHEN '@' THEN 0 ELSE 1 END, host ASC, type ASC, created_at ASC
  `).bind(applicationId, user.id).all<DnsRecordRow>();

  return ok({ records: (rows.results || []).map(serializeDnsRecord) });
}

async function createOwnDnsRecord(request: Request, env: Env, applicationId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(applicationId, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  if (app.status !== 'approved') throw new HttpError(409, 'DOMAIN_NOT_APPROVED', '域名审核通过后才能添加解析');
  if (app.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能添加解析');

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '根域名配置不存在');

  const host = normalizeDnsHost(body.host);
  const name = fullRecordName(host, app.fqdn_ascii);
  const type = normalizeRecordType(body.type || body.recordType, suffix.allowedTypes);
  const content = normalizeDnsTarget(type, body.content || body.target, name);
  const priority = type === 'MX' ? clamp(Number(body.priority || 10), 0, 65535) : null;
  const ttl = clamp(Number(body.ttl || suffix.ttl || 1), 1, 86400);
  const proxied = ['A', 'AAAA', 'CNAME'].includes(type) && asBoolean(body.proxied, suffix.proxied) ? 1 : 0;

  const duplicate = await env.DB.prepare(`
    SELECT id FROM dns_records
    WHERE application_id=? AND name=? COLLATE NOCASE AND type=? AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(applicationId, name, type).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'DNS_RECORD_EXISTS', '同一主机和类型的解析已存在，请编辑原记录');

  const id = crypto.randomUUID();
  let cfRecordId = '';
  let status = 'active';
  let errorMessage = '';

  const token = resolveDnsToken(env);
  if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
  try {
    const record = await createDnsRecord(token, suffix.zoneId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Created by storage portal dns record ${id}`));
    cfRecordId = record.id || '';
  } catch (error) {
    errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 创建失败';
    throw new HttpError(502, 'DNS_CREATE_FAILED', errorMessage);
  }

  await env.DB.prepare(`
    INSERT INTO dns_records (id,application_id,user_id,host,name,type,content,priority,proxied,ttl,cf_record_id,status,error_message)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, applicationId, user.id, host, name, type, content, priority, proxied, ttl, cfRecordId, status, errorMessage).run();

  await env.DB.prepare(`
    UPDATE domain_applications
    SET record_type=COALESCE(NULLIF(record_type,''),?), record_content=COALESCE(NULLIF(record_content,''),?), dns_record_id=COALESCE(NULLIF(dns_record_id,''),?), updated_at=datetime('now')
    WHERE id=?
  `).bind(type, content, cfRecordId, applicationId).run();

  await audit(env, request, user.id, 'dns_record.create', 'dns_record', id, { applicationId, name, type });
  const row = await env.DB.prepare(`SELECT * FROM dns_records WHERE id=?`).bind(id).first<DnsRecordRow>();
  return ok({ record: serializeDnsRecord(row!) });
}

async function updateOwnDnsRecordManaged(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const row = await env.DB.prepare(`
    SELECT r.*,a.fqdn_ascii,a.suffix_ascii,a.status AS app_status,a.delete_requested_at
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    WHERE r.id=? AND r.user_id=? AND (r.deleted_at IS NULL OR r.deleted_at='') AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(recordId, user.id).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '解析记录不存在');
  if (row.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能修改解析');

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === row.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '根域名配置不存在');
  if (row.app_status === 'approved' && !settings.domain.allowDnsEditAfterApproved) throw new HttpError(403, 'DNS_EDIT_CLOSED', '管理员已关闭生效域名的 DNS 修改');

  const host = normalizeDnsHost(body.host ?? row.host);
  const name = fullRecordName(host, row.fqdn_ascii);
  const type = normalizeRecordType(body.type || body.recordType || row.type, suffix.allowedTypes);
  const content = normalizeDnsTarget(type, body.content || body.target || row.content, name);
  const priority = type === 'MX' ? clamp(Number(body.priority || row.priority || 10), 0, 65535) : null;
  const ttl = clamp(Number(body.ttl || row.ttl || suffix.ttl || 1), 1, 86400);
  const proxied = ['A', 'AAAA', 'CNAME'].includes(type) && asBoolean(body.proxied, Boolean(row.proxied)) ? 1 : 0;

  const duplicate = await env.DB.prepare(`
    SELECT id FROM dns_records
    WHERE application_id=? AND id!=? AND name=? COLLATE NOCASE AND type=? AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(row.application_id, recordId, name, type).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'DNS_RECORD_EXISTS', '同一主机和类型的解析已存在');

  let cfRecordId = row.cf_record_id || '';
  let status = row.status || 'pending';
  let errorMessage = '';
  if (row.app_status === 'approved') {
    const token = resolveDnsToken(env);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    try {
      if (cfRecordId) {
        const record = await updateDnsRecord(token, suffix.zoneId, cfRecordId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Updated by storage portal dns record ${recordId}`));
        cfRecordId = record.id || cfRecordId;
      } else {
        const record = await createDnsRecord(token, suffix.zoneId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Created by storage portal dns record ${recordId}`));
        cfRecordId = record.id || '';
      }
      status = 'active';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 更新失败';
      await env.DB.prepare(`UPDATE dns_records SET error_message=?,status='error',updated_at=datetime('now') WHERE id=?`).bind(errorMessage, recordId).run();
      throw new HttpError(502, 'DNS_UPDATE_FAILED', errorMessage);
    }
  }

  await env.DB.prepare(`
    UPDATE dns_records
    SET host=?,name=?,type=?,content=?,priority=?,proxied=?,ttl=?,cf_record_id=?,status=?,error_message=?,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(host, name, type, content, priority, proxied, ttl, cfRecordId, status, errorMessage, recordId, user.id).run();

  await audit(env, request, user.id, 'dns_record.update', 'dns_record', recordId, { name, type });
  const updated = await env.DB.prepare(`SELECT * FROM dns_records WHERE id=?`).bind(recordId).first<DnsRecordRow>();
  return ok({ record: serializeDnsRecord(updated!) });
}

async function deleteOwnDnsRecordManaged(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const row = await env.DB.prepare(`
    SELECT r.*,a.suffix_ascii,a.status AS app_status,a.delete_requested_at
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    WHERE r.id=? AND r.user_id=? AND (r.deleted_at IS NULL OR r.deleted_at='') AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(recordId, user.id).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '解析记录不存在');
  if (row.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能删除解析');

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === row.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '根域名配置不存在');
  if (row.app_status === 'approved' && row.cf_record_id) {
    const token = resolveDnsToken(env);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    try { await deleteDnsRecord(token, suffix.zoneId, row.cf_record_id); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败';
      await env.DB.prepare(`UPDATE dns_records SET error_message=?,status='error',updated_at=datetime('now') WHERE id=?`).bind(message, recordId).run();
      throw new HttpError(502, 'DNS_DELETE_FAILED', message);
    }
  }

  await hardDeleteDnsRecordRow(env, recordId);
  return ok({ deleted: true, purged: true });
}

async function adminDnsRecords(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const limit = clamp(Number(url.searchParams.get('limit') || 500), 1, 1000);
  const rows = await env.DB.prepare(`
    SELECT r.*,a.fqdn_unicode,a.fqdn_ascii,u.username
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    LEFT JOIN users u ON u.id=r.user_id
    WHERE (r.deleted_at IS NULL OR r.deleted_at='')
    ORDER BY r.created_at DESC
    LIMIT ?
  `).bind(limit).all<DnsRecordRow>();
  return ok({ records: (rows.results || []).map(serializeDnsRecord) });
}

async function syncPendingDnsRecordsForApp(env: Env, app: ApplicationRow, suffix: AppSettings['dns']['suffixes'][number], actorId: string): Promise<number> {
  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records
    WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='') AND (cf_record_id IS NULL OR cf_record_id='')
  `).bind(app.id).all<DnsRecordRow>();
  const records = rows.results || [];
  if (!records.length) return 0;
  const token = resolveDnsToken(env);
  if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
  let created = 0;
  for (const record of records) {
    try {
      const cf = await createDnsRecord(token, suffix.zoneId, dnsPayload(record, `Created by storage portal dns record ${record.id}`));
      await env.DB.prepare(`
        UPDATE dns_records SET cf_record_id=?,status='active',error_message=NULL,updated_at=datetime('now') WHERE id=?
      `).bind(cf.id || '', record.id).run();
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 创建失败';
      await env.DB.prepare(`UPDATE dns_records SET status='error',error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, record.id).run();
    }
  }
  return created;
}

async function deleteAllDnsRecordsForApp(env: Env, app: ApplicationRow, suffix: AppSettings['dns']['suffixes'][number]): Promise<void> {
  const token = resolveDnsToken(env);
  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(app.id).all<DnsRecordRow>();
  for (const record of rows.results || []) {
    if (record.cf_record_id) {
      if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
      await deleteDnsRecord(token, suffix.zoneId, record.cf_record_id);
    }
    await hardDeleteDnsRecordRow(env, record.id);
  }
  if (app.dns_record_id) {
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    try { await deleteDnsRecord(token, suffix.zoneId, app.dns_record_id); } catch {}
  }
}

function serializeDnsRecord(row: DnsRecordRow): Record<string, unknown> {
  return {
    id: row.id,
    applicationId: row.application_id,
    userId: row.user_id,
    host: row.host || '@',
    name: row.name,
    type: row.type,
    content: row.content,
    priority: row.priority ?? null,
    proxied: Boolean(row.proxied),
    ttl: Number(row.ttl || 1),
    cfRecordId: row.cf_record_id || '',
    status: row.status || 'pending',
    statusText: ({ pending: '待写入', active: '已生效', error: '失败', deleted: '已删除' } as Record<string,string>)[row.status] || row.status,
    errorMessage: row.error_message || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    fqdnUnicode: row.fqdn_unicode || null,
    fqdnAscii: row.fqdn_ascii || null,
    username: row.username || null,
  };
}

async function renewOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND status='approved'
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '只有正常域名可以续期');

  const expiresAt = parseDate(app.expires_at);
  if (!expiresAt) throw new HttpError(400, 'NO_EXPIRY', '未设置到期时间，不能续期');

  const remaining = expiresAt.getTime() - Date.now();
  if (remaining > settings.domain.renewWindowDays * DAY) {
    throw new HttpError(403, 'TOO_EARLY', `到期前 ${settings.domain.renewWindowDays} 天内才可以续期`);
  }

  const base = Math.max(Date.now(), expiresAt.getTime());
  const newExpires = new Date(base + settings.domain.validDays * DAY).toISOString();

  await env.DB.prepare(`
    UPDATE domain_applications
    SET expires_at=?, renewed_at=datetime('now'), renew_count=COALESCE(renew_count,0)+1
    WHERE id=? AND user_id=?
  `).bind(newExpires, id, user.id).run();

  await audit(env, request, user.id, 'application.renew', 'domain_application', id, { newExpires });
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, settings) });
}

async function requestDeleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE id=? AND user_id=? AND status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();

  if (!app) throw new HttpError(404, 'NOT_FOUND', '只有正常域名可以申请删除');
  const confirmDomain = String(body.confirmDomain || '').trim();
  if (confirmDomain !== app.fqdn_unicode && confirmDomain !== app.fqdn_ascii) {
    throw new HttpError(400, 'CONFIRM_DOMAIN_MISMATCH', '请输入完整域名确认删除');
  }
  if (app.delete_requested_at) throw new HttpError(409, 'DELETE_ALREADY_REQUESTED', '该域名已提交删除申请，等待管理员审核');

  await env.DB.prepare(`
    UPDATE domain_applications
    SET delete_requested_at=datetime('now'), delete_requested_by=?, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(user.id, id, user.id).run();

  await audit(env, request, user.id, 'application.delete_request', 'domain_application', id);
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, await loadSettings(env)) });
}

async function cancelDeleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE id=? AND user_id=? AND status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();

  if (!app || !app.delete_requested_at) {
    throw new HttpError(404, 'NO_DELETE_REQUEST', '该域名没有可撤销的删除申请');
  }
  const requestedAt = parseDate(app.delete_requested_at);
  if (!requestedAt || Date.now() - requestedAt.getTime() > 12 * 60 * 60 * 1000) {
    throw new HttpError(403, 'DELETE_CANCEL_EXPIRED', '删除申请只能在提交后 12 小时内撤销');
  }

  await env.DB.prepare(`
    UPDATE domain_applications
    SET delete_requested_at=NULL, delete_requested_by=NULL, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(id, user.id).run();

  await audit(env, request, user.id, 'application.delete_request_cancel', 'domain_application', id);
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, await loadSettings(env)) });
}

async function deleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  if (!settings.domain.allowUserDeleteInvalid) throw new HttpError(403, 'DELETE_DISABLED', '管理员未开放用户删除无效域名');

  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');

  if (!['rejected', 'revoked'].includes(app.status)) {
    throw new HttpError(403, 'DELETE_ACTIVE_FORBIDDEN', '只能删除已拒绝或已撤销的无效域名');
  }

  await hardDeleteDomainApplication(env, id);
  return ok({ deleted: true, purged: true });
}


function messageTargetLabel(row: MessageRow): string {
  if (row.target_type === 'all') return '全部用户';
  if (row.target_type === 'role') return row.target_role === 'admin' ? '管理员' : '普通用户';
  if (row.target_type === 'user') return row.target_username || row.target_user_id || '指定用户';
  return row.target_type || '未知目标';
}

function serializeMessage(row: MessageRow) {
  return {
    id: row.id,
    senderUserId: row.sender_user_id || null,
    senderUsername: row.sender_username || '系统管理员',
    targetType: row.target_type,
    targetUserId: row.target_user_id || null,
    targetUsername: row.target_username || null,
    targetRole: row.target_role || null,
    targetLabel: messageTargetLabel(row),
    title: row.title,
    body: row.body,
    level: row.level || 'info',
    status: row.status || 'sent',
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    sentAt: row.sent_at || null,
    readAt: row.read_at || null,
    isRead: Boolean(row.read_at),
  };
}

function normalizeMessageLevel(value: unknown): string {
  const level = String(value || 'info').toLowerCase();
  return ['info', 'success', 'warning', 'danger'].includes(level) ? level : 'info';
}

function normalizeMessageStatus(value: unknown): string {
  const status = String(value || 'sent').toLowerCase();
  return ['sent', 'draft', 'template'].includes(status) ? status : 'sent';
}

function normalizeTargetType(value: unknown): string {
  const type = String(value || 'all').toLowerCase();
  return ['all', 'user', 'role'].includes(type) ? type : 'all';
}

async function sendSystemMessageToUser(env: Env, senderUserId: string | null, targetUserId: string, title: string, body: string, level: string = 'info'): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, 'user', ?, NULL, ?, ?, ?, 'sent', datetime('now'))
  `).bind(id, senderUserId, targetUserId, cleanText(title, 120) || '系统消息', cleanText(body, 5000) || '您有一条新的系统消息。', normalizeMessageLevel(level)).run();
  return id;
}

function domainMessageBody(app: ApplicationRow, actionText: string, note: string): string {
  const lines = [`域名：${app.fqdn_unicode || app.fqdn_ascii}`, `处理结果：${actionText}`];
  if (note) lines.push(`管理员留言：${note}`);
  lines.push('请进入消息中心查看通知；域名管理页面不再单独显示管理员留言。');
  return lines.join('\n');
}

async function sendDomainStatusMessage(env: Env, adminId: string, app: ApplicationRow, actionText: string, note: string, level: string = 'info'): Promise<void> {
  await sendSystemMessageToUser(env, adminId, app.user_id, `域名处理通知：${app.fqdn_unicode || app.fqdn_ascii}`, domainMessageBody(app, actionText, note), level);
}

async function getReadReceipts(env: Env, messageIds: string[]): Promise<Record<string, Array<{ userId: string; username: string; readAt: string }>>> {
  const result: Record<string, Array<{ userId: string; username: string; readAt: string }>> = {};
  const ids = Array.from(new Set(messageIds.filter(Boolean))).slice(0, 500);
  if (!ids.length) return result;
  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT r.message_id, r.user_id, COALESCE(u.username, r.user_id) AS username, r.read_at
    FROM message_reads r
    LEFT JOIN users u ON u.id=r.user_id
    WHERE r.message_id IN (${placeholders})
    ORDER BY datetime(r.read_at) DESC
  `).bind(...ids).all<{ message_id: string; user_id: string; username: string; read_at: string }>();
  for (const row of rows.results || []) {
    if (!result[row.message_id]) result[row.message_id] = [];
    result[row.message_id].push({ userId: row.user_id, username: row.username, readAt: row.read_at });
  }
  return result;
}


interface OperationLogRow {
  id: string;
  actor_user_id?: string | null;
  actor_username?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  ip?: string | null;
  meta_json?: string | null;
  created_at: string;
}

async function listOperationLogs(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await cleanupOperationLogs(env);

  const isAdmin = user.role === 'admin';
  const sql = isAdmin ? `
    SELECT l.*, u.username AS actor_username
    FROM audit_logs l
    LEFT JOIN users u ON u.id=l.actor_user_id
    WHERE datetime(l.created_at) >= datetime('now','-7 days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 300
  ` : `
    SELECT l.*, u.username AS actor_username
    FROM audit_logs l
    LEFT JOIN users u ON u.id=l.actor_user_id
    WHERE l.actor_user_id=?
      AND datetime(l.created_at) >= datetime('now','-7 days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 200
  `;

  const rows = isAdmin
    ? await env.DB.prepare(sql).all<OperationLogRow>()
    : await env.DB.prepare(sql).bind(user.id).all<OperationLogRow>();

  return ok({ logs: (rows.results || []).map(serializeOperationLog), retentionDays: 7, scope: isAdmin ? 'admin' : 'self' });
}

function serializeOperationLog(row: OperationLogRow) {
  let meta: Record<string, unknown> = {};
  try { meta = row.meta_json ? JSON.parse(row.meta_json) : {}; } catch { meta = {}; }
  const actionText = operationActionText(row.action);
  return {
    id: row.id,
    actorUserId: row.actor_user_id || null,
    actorUsername: row.actor_username || (row.actor_user_id ? '未知用户' : '系统'),
    action: row.action,
    actionText,
    description: operationDescription(row.action, row.target_type || '', row.target_id || '', meta),
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    ip: row.ip || null,
    meta,
    createdAt: row.created_at,
  };
}

function operationActionText(action: string): string {
  const map: Record<string, string> = {
    'setup.bootstrap_admin': '初始化管理员',
    'auth.register': '注册账号',
    'auth.login': '登录账户',
    'auth.logout': '退出登录',
    'auth.login_failed': '登录失败',
    'auth.password_changed': '修改密码',
    'account.delete_self': '注销账号',
    'application.create': '申请域名',
    'application.dns_update': '更新主解析',
    'dns_record.create': '添加 DNS 解析',
    'dns_record.update': '修改 DNS 解析',
    'dns_record.delete': '删除 DNS 解析',
    'application.renew': '域名续期',
    'application.delete_request': '申请删除域名',
    'application.delete_request_cancel': '撤销删除申请',
    'application.delete_invalid': '删除无效域名',
    'application.reject': '拒绝域名申请',
    'application.approve': '批准域名申请',
    'application.disable': '禁用域名',
    'application.revoke': '撤销域名',
    'admin.application_delete': '管理员删除域名',
    'admin.application_delete_approve': '批准删除域名',
    'admin.application_delete_reject': '拒绝删除域名',
    'admin.user_create': '管理员创建用户',
    'admin.user_update': '管理员编辑用户',
    'admin.settings_site': '修改界面设置',
    'admin.settings_registration': '修改注册设置',
    'admin.settings_domain': '修改域名规则',
    'admin.message_sent': '发送消息',
    'admin.message_draft': '保存消息草稿',
    'admin.message_template': '保存消息模板',
    'admin.message_update': '编辑消息',
    'admin.message_send': '发送草稿消息',
    'admin.message_delete': '删除消息',
    'message.contact_admin': '联系管理员',
    'message.reply': '回复消息',
  };
  return map[action] || action;
}

function operationDescription(action: string, targetType: string, targetId: string, meta: Record<string, unknown>): string {
  const fqdn = String(meta.fqdnAscii || meta.fqdn || meta.name || '').trim();
  const type = String(meta.type || meta.recordType || '').trim();
  const content = String(meta.content || meta.recordContent || '').trim();
  if (action === 'application.create' && fqdn) return `提交域名申请：${fqdn}`;
  if (action === 'application.approve') return `管理员批准域名申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.reject') return `管理员拒绝域名申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.disable') return `管理员禁用域名并移除解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.revoke') return `管理员撤销域名并移除解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'dns_record.create') return `添加 DNS 解析${fqdn ? `：${fqdn}` : ''}${type ? `（${type}${content ? ` → ${content}` : ''}）` : ''}`;
  if (action === 'dns_record.update') return `修改 DNS 解析${fqdn ? `：${fqdn}` : ''}${type ? `（${type}${content ? ` → ${content}` : ''}）` : ''}`;
  if (action === 'dns_record.delete') return `删除 DNS 解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.delete_request') return `用户提交域名删除申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.delete_request_cancel') return `用户撤销 12 小时内的域名删除申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.renew') return `用户提交域名续期${meta.newExpires ? `，新到期时间：${String(meta.newExpires)}` : ''}`;
  if (action === 'auth.login') return '用户成功登录系统';
  if (action === 'auth.logout') return '用户退出登录';
  if (action === 'auth.login_failed') return `登录失败${meta.identity ? `：${String(meta.identity)}` : ''}`;
  if (action === 'admin.user_create') return `管理员创建用户${meta.username ? `：${String(meta.username)}` : ''}`;
  if (action === 'admin.user_update') return `管理员更新用户资料、状态或额度${targetId ? `（ID：${targetId}）` : ''}`;
  if (action.startsWith('admin.message_')) return '管理员处理消息中心内容';
  if (action.startsWith('admin.settings_')) return '管理员修改系统设置';
  return `${operationActionText(action)}${targetType ? `（${targetType}${targetId ? `：${targetId}` : ''}）` : ''}`;
}


async function contactAdminMessage(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body ?? body.content, 5000);
  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', '请填写消息标题');
  if (!text) throw new HttpError(400, 'BODY_REQUIRED', '请填写消息内容');
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, 'role', NULL, 'admin', ?, ?, 'info', 'sent', datetime('now'))
  `).bind(id, user.id, title, text).run();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id).run();
  await audit(env, request, user.id, 'message.contact_admin', 'message', id, { title });
  const row = await env.DB.prepare(`SELECT m.*, sender.username AS sender_username FROM system_messages m LEFT JOIN users sender ON sender.id=m.sender_user_id WHERE m.id=?`).bind(id).first<MessageRow>();
  return ok({ sent: true, movedToMessageCenter: true, message: serializeMessage(row!) });
}

async function listOwnMessages(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const rows = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username, r.read_at
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    WHERE m.status='sent'
      AND (m.deleted_at IS NULL OR m.deleted_at='')
      AND (
        m.target_type='all'
        OR (m.target_type='user' AND m.target_user_id=?)
        OR (m.target_type='role' AND m.target_role=?)
        OR m.sender_user_id=?
      )
    ORDER BY COALESCE(m.sent_at, m.created_at) DESC
    LIMIT 300
  `).bind(user.id, user.id, user.role, user.id).all<MessageRow>();
  const messages = (rows.results || []).map(serializeMessage);
  return ok({ messages, unread: messages.filter(m => !m.isRead).length });
}

async function replyOwnMessage(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const text = cleanText(body.body ?? body.content ?? body.reply, 5000);
  if (!text) throw new HttpError(400, 'REPLY_REQUIRED', '请填写回复内容');

  const original = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username, r.read_at
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    WHERE m.id=? AND m.status='sent' AND (m.deleted_at IS NULL OR m.deleted_at='')
      AND (
        m.target_type='all'
        OR (m.target_type='user' AND m.target_user_id=?)
        OR (m.target_type='role' AND m.target_role=?)
        OR m.sender_user_id=?
      )
  `).bind(user.id, id, user.id, user.role, user.id).first<MessageRow>();
  if (!original) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权回复');

  let targetType = 'user';
  let targetUserId: string | null = null;
  let targetRole: string | null = null;

  if (original.sender_user_id && original.sender_user_id !== user.id) {
    targetType = 'user';
    targetUserId = original.sender_user_id;
  } else if (original.target_type === 'user' && original.target_user_id && original.target_user_id !== user.id) {
    targetType = 'user';
    targetUserId = original.target_user_id;
  } else if (original.target_type === 'role' && original.target_role) {
    targetType = 'role';
    targetRole = original.target_role;
  } else {
    throw new HttpError(400, 'MESSAGE_CANNOT_REPLY', '这条消息无法直接回复');
  }

  const originalSender = original.sender_username || '系统管理员';
  const originalTime = original.sent_at || original.created_at || '';
  const quotedBody = [
    text,
    '',
    '---------- 原信息 ----------',
    `发送人：${originalSender}`,
    originalTime ? `时间：${originalTime}` : '',
    `标题：${original.title}`,
    '',
    original.body || ''
  ].filter(line => line !== '').join('\n');

  const replyId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'info', 'sent', datetime('now'))
  `).bind(
    replyId,
    user.id,
    targetType,
    targetUserId,
    targetRole,
    cleanText(`回复：${original.title || '消息'}`, 120),
    cleanText(quotedBody, 5000)
  ).run();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(replyId, user.id).run();
  await audit(env, request, user.id, 'message.reply', 'message', replyId, { originalMessageId: id, targetType, targetUserId, targetRole });
  const row = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username, r.read_at
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    WHERE m.id=?
  `).bind(user.id, replyId).first<MessageRow>();
  return ok({ replied: true, message: serializeMessage(row!) });
}

async function markOwnMessageRead(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const message = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND (target_type='all' OR (target_type='user' AND target_user_id=?) OR (target_type='role' AND target_role=?))
  `).bind(id, user.id, user.role).first<{ id: string }>();
  if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权查看');
  await env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id).run();
  return ok({ read: true });
}

async function markOwnMessagesReadBatch(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 64 * 1024);
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = Array.from(new Set(rawIds.map(x => cleanText(x, 80)).filter(Boolean))).slice(0, 200);
  if (!ids.length) throw new HttpError(400, 'NO_MESSAGE_IDS', '请选择要标记已读的消息');

  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id IN (${placeholders}) AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND (target_type='all' OR (target_type='user' AND target_user_id=?) OR (target_type='role' AND target_role=?))
  `).bind(...ids, user.id, user.role).all<{ id: string }>();
  const allowed = (rows.results || []).map(x => x.id);
  if (!allowed.length) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权查看');

  await env.DB.batch(allowed.map(id => env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id)));
  return ok({ read: true, count: allowed.length });
}

async function adminListMessages(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const status = String(url.searchParams.get('status') || '').toLowerCase();
  const where = status && ['sent','draft','template'].includes(status) ? `AND m.status='${status}'` : '';
  const rows = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username,
      (SELECT COUNT(*) FROM message_reads r WHERE r.message_id=m.id) AS read_count
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    WHERE (m.deleted_at IS NULL OR m.deleted_at='') ${where}
    ORDER BY COALESCE(m.updated_at, m.sent_at, m.created_at) DESC
    LIMIT 500
  `).all<any>();
  const raw = rows.results || [];
  const receipts = await getReadReceipts(env, raw.map((row: any) => row.id));
  return ok({ messages: raw.map((row: any) => {
    const readUsers = receipts[row.id] || [];
    return { ...serializeMessage(row), readCount: Number(row.read_count || 0), readUsers };
  }) });
}

async function buildMessagePayload(env: Env, body: Record<string, unknown>) {
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body ?? body.content, 5000);
  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', '请填写消息标题');
  if (!text) throw new HttpError(400, 'BODY_REQUIRED', '请填写消息内容');
  const targetType = normalizeTargetType(body.targetType ?? body.target_type);
  let targetUserId = cleanText(body.targetUserId ?? body.target_user_id, 80) || null;
  let targetRole = cleanText(body.targetRole ?? body.target_role, 20) || null;
  if (targetType === 'all') {
    targetUserId = null;
    targetRole = null;
  } else if (targetType === 'role') {
    targetUserId = null;
    targetRole = targetRole === 'admin' ? 'admin' : 'user';
  } else if (targetType === 'user') {
    targetRole = null;
    if (!targetUserId) throw new HttpError(400, 'TARGET_USER_REQUIRED', '请选择接收用户');
    const user = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status!='deleted'`).bind(targetUserId).first<{ id: string }>();
    if (!user) throw new HttpError(404, 'TARGET_USER_NOT_FOUND', '接收用户不存在');
  }
  return {
    title,
    body: text,
    targetType,
    targetUserId,
    targetRole,
    level: normalizeMessageLevel(body.level),
    status: normalizeMessageStatus(body.status),
  };
}

async function adminCreateMessage(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const payload = await buildMessagePayload(env, body);
  const id = crypto.randomUUID();
  const sentAtSql = payload.status === 'sent' ? `datetime('now')` : `NULL`;
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${sentAtSql})
  `).bind(id, admin.id, payload.targetType, payload.targetUserId, payload.targetRole, payload.title, payload.body, payload.level, payload.status).run();
  await audit(env, request, admin.id, `admin.message_${payload.status}`, 'message', id, payload);
  const row = await env.DB.prepare(`SELECT m.*, u.username AS sender_username FROM system_messages m LEFT JOIN users u ON u.id=m.sender_user_id WHERE m.id=?`).bind(id).first<MessageRow>();
  return ok({ message: serializeMessage(row!) });
}

async function adminUpdateMessage(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const existing = await env.DB.prepare(`SELECT * FROM system_messages WHERE id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(id).first<MessageRow>();
  if (!existing) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在');
  if (existing.status === 'sent') throw new HttpError(409, 'SENT_MESSAGE_LOCKED', '已发送消息不能编辑，可删除后重新发送');
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const payload = await buildMessagePayload(env, body);
  const status = payload.status === 'sent' ? existing.status : payload.status;
  await env.DB.prepare(`
    UPDATE system_messages
    SET target_type=?, target_user_id=?, target_role=?, title=?, body=?, level=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(payload.targetType, payload.targetUserId, payload.targetRole, payload.title, payload.body, payload.level, status, id).run();
  await audit(env, request, admin.id, 'admin.message_update', 'message', id, payload);
  return ok({ updated: true });
}

async function adminSendMessage(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const existing = await env.DB.prepare(`SELECT * FROM system_messages WHERE id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(id).first<MessageRow>();
  if (!existing) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在');
  await env.DB.prepare(`
    UPDATE system_messages
    SET status='sent', sent_at=COALESCE(sent_at, datetime('now')), updated_at=datetime('now')
    WHERE id=?
  `).bind(id).run();
  await audit(env, request, admin.id, 'admin.message_send', 'message', id, {});
  return ok({ sent: true });
}

async function adminDeleteMessage(request: Request, env: Env, id: string): Promise<Response> {
  await requireAdmin(env, request);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id=?`).bind(id),
    env.DB.prepare(`DELETE FROM system_messages WHERE id=?`).bind(id),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='message' AND target_id=?`).bind(id),
  ]);
  await deleteKnownKvKeys(env, [`message:${id}`, `system_message:${id}`]);
  return ok({ deleted: true, purged: true });
}

async function adminOverview(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const [users, apps, today] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM users WHERE status!='deleted'`).first<any>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS total,
      SUM(status='pending') AS pending,
      SUM(status='approved') AS approved,
      SUM(status='rejected') AS rejected,
      SUM(status='revoked') AS revoked,
      SUM(CASE WHEN delete_requested_at IS NOT NULL AND delete_requested_at!='' THEN 1 ELSE 0 END) AS delete_requested
      FROM domain_applications WHERE (deleted_at IS NULL OR deleted_at='')
    `).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE date(created_at)=date('now')`).first<any>(),
  ]);

  return ok({ overview: { users, applications: apps, today: Number(today?.count || 0) } });
}

async function adminApplications(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const status = url.searchParams.get('status') || 'all';
  const limit = clamp(Number(url.searchParams.get('limit') || 500), 1, 1000);
  const rows = status === 'all'
    ? await env.DB.prepare(`
        SELECT a.*,u.username FROM domain_applications a
        LEFT JOIN users u ON u.id=a.user_id
        WHERE (a.deleted_at IS NULL OR a.deleted_at='')
        ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, a.created_at DESC
        LIMIT ?
      `).bind(limit).all<ApplicationRow>()
    : await env.DB.prepare(`
        SELECT a.*,u.username FROM domain_applications a
        LEFT JOIN users u ON u.id=a.user_id
        WHERE a.status=? AND (a.deleted_at IS NULL OR a.deleted_at='')
        ORDER BY a.created_at DESC
        LIMIT ?
      `).bind(status, limit).all<ApplicationRow>();

  return ok({ applications: (rows.results || []).map(x => serializeApplication(x, settings)) });
}

async function adminReviewApplication(request: Request, env: Env, id: string, action: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const note = cleanText(body.note, 1000);
  const settings = await loadSettings(env);

  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '申请不存在');

  if (action === 'delete') {
    if (app.status === 'approved' && app.dns_record_id) throw new HttpError(409, 'REVOKE_FIRST', '正常域名请先撤销 DNS 后再删除');
    await hardDeleteDomainApplication(env, id);
    return ok({ deleted: true, purged: true });
  }

  if (action === 'reject-delete') {
    if (!app.delete_requested_at) throw new HttpError(409, 'NO_DELETE_REQUEST', '该域名没有删除申请');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET delete_requested_at=NULL, delete_requested_by=NULL, review_note=?, reviewed_at=datetime('now'), reviewed_by=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(note, admin.id, id).run();
    await audit(env, request, admin.id, 'admin.application_delete_reject', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '删除申请已被拒绝', note || '管理员拒绝了该域名删除申请。', 'warning');
    return ok({ deleteRejected: true });
  }

  if (action === 'approve-delete') {
    if (!app.delete_requested_at) throw new HttpError(409, 'NO_DELETE_REQUEST', '该域名没有删除申请');
    const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
    if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '该后缀配置不存在');

    try { await deleteAllDnsRecordsForApp(env, app, suffix); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败';
      await env.DB.prepare(`UPDATE domain_applications SET error_message=?, updated_at=datetime('now') WHERE id=?`).bind(message, id).run();
      throw new HttpError(502, 'DNS_DELETE_FAILED', message);
    }

    await sendDomainStatusMessage(env, admin.id, app, '删除申请已批准', note || '管理员已批准删除申请，域名和关联 DNS 记录已移除。', 'success');
    await hardDeleteDomainApplication(env, id);
    return ok({ deleted: true, purged: true });
  }

  if (action === 'reject') {
    if (!['pending', 'processing'].includes(app.status)) throw new HttpError(409, 'INVALID_STATE', '只有待审核申请可以拒绝');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='rejected',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,error_message=NULL
      WHERE id=?
    `).bind(note, admin.id, id).run();
    await audit(env, request, admin.id, 'application.reject', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名申请已被拒绝', note || '管理员拒绝了该域名申请。', 'warning');
    return ok({ status: 'rejected' });
  }

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '该后缀配置不存在');

  if (action === 'approve') {
    if (app.status !== 'pending') throw new HttpError(409, 'INVALID_STATE', '只有待审核申请可以批准');
    const expires = new Date(Date.now() + settings.domain.validDays * DAY).toISOString();

    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='approved',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,expires_at=?,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(note || '已批准，DNS 可后续在域名管理中添加', admin.id, expires, id).run();

    let synced = 0;
    try { synced = await syncPendingDnsRecordsForApp(env, app, suffix, admin.id); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 同步失败';
      await env.DB.prepare(`UPDATE domain_applications SET error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, id).run();
    }

    await audit(env, request, admin.id, 'application.approve', 'domain_application', id, { syncedDnsRecords: synced });
    await sendDomainStatusMessage(env, admin.id, app, '域名申请已通过', note || '管理员已批准该域名，您现在可以进入域名管理添加 DNS 解析。', 'success');
    return ok({ status: 'approved', syncedDnsRecords: synced });
  }

  if (action === 'disable') {
    if (app.status !== 'approved') throw new HttpError(409, 'INVALID_STATE', '只有正常域名可以禁用');
    try { await deleteAllDnsRecordsForApp(env, app, suffix); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败';
      await env.DB.prepare(`UPDATE domain_applications SET error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, id).run();
      throw new HttpError(502, 'DNS_DELETE_FAILED', message);
    }

    // D1 旧表的 status 字段有 CHECK 约束：只允许 pending / processing / approved / rejected / revoking / revoked / error。
    // 所以这里不能写入 status='disabled'，否则会触发 SQLITE_CONSTRAINT_CHECK。
    // 用 status='revoked' 保存数据库兼容状态，同时用 review_note 前缀标记为“禁用”，前端显示为“已禁用”。
    const disableNote = `【已禁用】${note || '管理员已禁用该域名，DNS 记录已移除。'}`;
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='revoked',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,dns_record_id=NULL,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(disableNote, admin.id, id).run();
    await audit(env, request, admin.id, 'application.disable', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已被禁用', note || '管理员已禁用该域名，DNS 记录已移除。', 'danger');
    return ok({ status: 'revoked', statusText: '已禁用' });
  }

  if (action === 'revoke') {
    if (app.status !== 'approved') throw new HttpError(409, 'INVALID_STATE', '只有正常域名可以撤销');
    try { await deleteAllDnsRecordsForApp(env, app, suffix); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败';
      await env.DB.prepare(`UPDATE domain_applications SET error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, id).run();
      throw new HttpError(502, 'DNS_DELETE_FAILED', message);
    }

    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='revoked',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,dns_record_id=NULL
      WHERE id=?
    `).bind(note, admin.id, id).run();
    await audit(env, request, admin.id, 'application.revoke', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已被撤销', note || '管理员已撤销该域名，DNS 记录已移除。', 'warning');
    return ok({ status: 'revoked' });
  }

  throw new HttpError(400, 'INVALID_ACTION', '未知操作');
}

async function adminUsers(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const rows = await env.DB.prepare(`
    SELECT u.id,u.username,u.email,u.role,u.status,u.domain_quota,u.created_at,u.last_login_at,
      COUNT(a.id) AS application_count,
      SUM(CASE WHEN a.status='approved' THEN 1 ELSE 0 END) AS approved_count
    FROM users u
    LEFT JOIN domain_applications a ON a.user_id=u.id AND (a.deleted_at IS NULL OR a.deleted_at='')
    WHERE u.status!='deleted'
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 500
  `).all<any>();

  return ok({ users: (rows.results || []).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    domainQuota: Math.max(0, Number(u.domain_quota ?? settings.domain.defaultQuota)),
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    applicationCount: Number(u.application_count || 0),
    approvedCount: Number(u.approved_count || 0),
  })) });
}

async function adminCreateUser(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_REGISTER || 'register');

  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const role: Role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) as UserStatus : 'active';
  const quota = Math.max(0, Math.floor(Number(body.domainQuota ?? settings.domain.defaultQuota) || 0));

  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE OR (? IS NOT NULL AND email=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号或邮箱/手机号已被使用');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, username, email, hash, salt, role, status, quota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, admin.id, 'admin.user_create', 'user', id, { username, email, role, status, quota });
  const user = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(id).first<UserRow>();
  return ok({ user: serializeUser(user!) });
}

async function adminUpdateUser(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const target = await env.DB.prepare(`SELECT * FROM users WHERE id=? AND status!='deleted'`).bind(id).first<UserRow>();
  if (!target) throw new HttpError(404, 'NOT_FOUND', '用户不存在');

  const role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) : target.status;
  const quota = Math.max(0, Math.floor(Number(body.domainQuota ?? target.domain_quota ?? 3) || 0));

  if (id === admin.id && (role !== 'admin' || status !== 'active')) {
    throw new HttpError(400, 'CANNOT_DISABLE_SELF', '不能降级或禁用当前管理员');
  }

  await env.DB.prepare(`
    UPDATE users SET role=?,status=?,domain_quota=?,updated_at=datetime('now') WHERE id=?
  `).bind(role, status, quota, id).run();

  await audit(env, request, admin.id, 'admin.user_update', 'user', id, { role, status, quota });
  return ok({ updated: true });
}


async function adminHelpSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  return ok({ help: settings.help });
}

async function adminUpdateHelpSettings(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 512 * 1024);
  const settings = await loadSettings(env);
  settings.help = { categories: sanitizeHelpCategories((body as any).categories) };
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, 'admin.settings_help', 'setting', 'help');
  return ok({ help: settings.help });
}

function defaultHelpSettings(): { categories: HelpCategorySetting[] } {
  return { categories: [
    { key:'faq', title:'常见问题', subtitle:'账号、注册、审核、登录、额度、语言、消息等常见问题', items: [] },
    { key:'dns', title:'DNS 记录说明', subtitle:'A / AAAA / CNAME / TXT / MX、代理、TTL、生效时间、第三方平台配置', items: [] },
    { key:'domain', title:'域名管理问题', subtitle:'解析管理、删除撤销、续期、禁用、管理员处理、手机端操作等问题', items: [] },
  ] };
}

function sanitizeHelpCategories(value: unknown): HelpCategorySetting[] {
  const defaults = defaultHelpSettings().categories;
  const raw = Array.isArray(value) ? value : [];
  return defaults.map((def, index) => {
    const found = raw.find((x: any) => x && (x.key === def.key || x.title === def.title)) || raw[index] || def;
    const itemsRaw = Array.isArray((found as any).items) ? (found as any).items : [];
    const items = itemsRaw.slice(0, 200).map((item: any, itemIndex: number) => ({
      id: cleanText(item?.id || `${def.key}-${itemIndex + 1}`, 80) || `${def.key}-${itemIndex + 1}`,
      q: cleanText(item?.q || item?.question || '', 200),
      a: cleanHtmlText(item?.a || item?.answer || '', 8000),
    })).filter((item: HelpItemSetting) => item.q);
    return {
      key: cleanText((found as any).key || def.key, 30) || def.key,
      title: cleanText((found as any).title || def.title, 80) || def.title,
      subtitle: cleanText((found as any).subtitle || def.subtitle || '', 180),
      items,
    };
  });
}

function cleanHtmlText(value: unknown, max = 8000): string {
  const raw = String(value ?? '').slice(0, max);
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .trim();
}

async function adminSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  return ok({ settings: await loadSettings(env) });
}

async function adminUpdateSettings(request: Request, env: Env, group: 'site' | 'registration' | 'domain'): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 256 * 1024);
  const settings = await loadSettings(env);

  if (group === 'site') {
    settings.site = {
      title: cleanText(body.title, 80) || settings.site.title,
      subtitle: cleanText(body.subtitle, 140),
      footer: cleanText(body.footer, 200),
      accent: cleanText(body.accent, 20) || '#4f63f6',
      accent2: cleanText(body.accent2, 20) || '#7c4dff',
      logoText: cleanText(body.logoText, 6) || '域',
    };
  }

  if (group === 'registration') {
    settings.registration = {
      enabled: asBoolean(body.enabled, true),
      autoActivate: asBoolean(body.autoActivate, true),
    };
  }

  if (group === 'domain') {
    settings.domain = {
      defaultQuota: clamp(Number(body.defaultQuota || 3), 1, 9999),
      validDays: clamp(Number(body.validDays || 365), 1, 3650),
      renewWindowDays: clamp(Number(body.renewWindowDays || 60), 1, 3650),
      allowUserDeleteInvalid: asBoolean(body.allowUserDeleteInvalid, true),
      allowDnsEditAfterApproved: asBoolean(body.allowDnsEditAfterApproved, true),
    };
  }

  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, `admin.settings_${group}`, 'setting', group);
  return ok({ settings });
}

async function loadSettings(env: Env): Promise<AppSettings> {
  const defaults = defaultSettings(env);
  let saved: Partial<AppSettings> = {};
  try {
    const raw = await env.APP_KV.get(SETTINGS_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {}

  return {
    site: { ...defaults.site, ...(saved.site || {}) },
    registration: { ...defaults.registration, ...(saved.registration || {}) },
    domain: { ...defaults.domain, ...(saved.domain || {}) },
    help: { categories: Array.isArray((saved as any).help?.categories) ? sanitizeHelpCategories((saved as any).help.categories) : defaults.help.categories },
    dns: defaults.dns,
  };
}

function defaultSettings(env: Env): AppSettings {
  const suffix = normalizeSuffix(env.DNS_SUFFIX || 'flore.top');
  const allowedTypes = Array.from(new Set(
    String(env.DNS_ALLOWED_TYPES || 'CNAME,A,AAAA,TXT,MX')
      .split(',')
      .map(x => x.trim().toUpperCase())
      .filter(x => ['CNAME', 'A', 'AAAA', 'TXT', 'MX'].includes(x))
      .concat(['CNAME', 'A', 'AAAA', 'TXT', 'MX'])
  ));

  const reserved = String(env.DNS_RESERVED_PREFIXES || 'www,api,admin,apply,storage,mail,smtp,imap,pop,ftp,cdn,static,status,support')
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);

  return {
    site: {
      title: '免费二级域名注册中心',
      subtitle: '快速注册并管理您的专属免费域名',
      footer: '请勿申请违法、侵权、仿冒或误导性域名。',
      accent: '#4f63f6',
      accent2: '#7c4dff',
      logoText: '域',
    },
    registration: {
      enabled: true,
      autoActivate: true,
    },
    domain: {
      defaultQuota: 3,
      validDays: 365,
      renewWindowDays: 60,
      allowUserDeleteInvalid: true,
      allowDnsEditAfterApproved: true,
    },
    help: defaultHelpSettings(),
    dns: {
      envManaged: true,
      reservedPrefixes: reserved,
      suffixes: [{
        label: env.DNS_SUFFIX_LABEL || '免费二级域名',
        suffix,
        suffixAscii: suffix,
        zoneId: env.DNS_ZONE_ID || '',
        allowedTypes: allowedTypes.length ? allowedTypes : ['CNAME'],
        defaultType: (['CNAME','A','AAAA'].includes(String(env.DNS_DEFAULT_TYPE || '').toUpperCase())
          ? String(env.DNS_DEFAULT_TYPE).toUpperCase()
          : 'CNAME') as DnsRecordType,
        ttl: clamp(Number(env.DNS_TTL || 1), 1, 86400),
        proxied: isEnabled(env.DNS_PROXIED, false),
        enabled: true,
      }],
    },
  };
}

function serializeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    domainQuota: Math.max(0, Number(user.domain_quota ?? 3)),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
  };
}

function serializeApplication(app: ApplicationRow, settings: AppSettings) {
  const created = parseDate(app.created_at);
  const approved = app.status === 'approved';
  const expires = approved ? parseDate(app.expires_at) : null;
  const remainingMs = expires ? expires.getTime() - Date.now() : null;
  const remainingDays = remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / DAY));
  const canRenew = approved && remainingDays !== null && remainingDays <= settings.domain.renewWindowDays;
  const deleteRequested = Boolean(app.delete_requested_at);
  const deleteRequestedAtDate = deleteRequested ? parseDate(app.delete_requested_at || '') : null;
  const deleteCancelDeadline = deleteRequestedAtDate ? new Date(deleteRequestedAtDate.getTime() + 12 * 60 * 60 * 1000) : null;
  const canCancelDeleteRequest = Boolean(deleteCancelDeadline && Date.now() <= deleteCancelDeadline.getTime());
  const disabledByAdmin = app.status === 'revoked' && String(app.review_note || '').startsWith('【已禁用】');

  return {
    id: app.id,
    userId: app.user_id,
    username: app.username || null,
    prefixUnicode: app.prefix_unicode,
    prefixAscii: app.prefix_ascii,
    suffixUnicode: app.suffix_unicode,
    suffixAscii: app.suffix_ascii,
    fqdnUnicode: app.fqdn_unicode,
    fqdnAscii: app.fqdn_ascii,
    recordType: app.record_type || 'CNAME',
    recordContent: app.record_content || '',
    proxied: Boolean(app.proxied),
    ttl: Number(app.ttl || 1),
    status: app.status,
    statusText: disabledByAdmin ? '已禁用' : (deleteRequested && app.status === 'approved' ? '待删除审核' : statusLabel(app.status)),
    reviewNote: '',
    errorMessage: app.error_message || '',
    dnsRecordId: app.dns_record_id || '',
    dnsConfigured: Boolean(app.record_content),
    createdAt: created ? created.toISOString() : app.created_at,
    reviewedAt: app.reviewed_at || null,
    expiresAt: expires ? expires.toISOString() : null,
    renewedAt: app.renewed_at || null,
    deleteRequested,
    deleteRequestedAt: app.delete_requested_at || null,
    deleteCancelDeadline: deleteCancelDeadline ? deleteCancelDeadline.toISOString() : null,
    canCancelDeleteRequest,
    renewCount: Number(app.renew_count || 0),
    remainingDays,
    remainingText: expires ? (remainingDays === 0 ? '今天到期' : `${remainingDays} 天`) : '',
    canRenew: canRenew && !deleteRequested,
    canDelete: ['rejected', 'revoked'].includes(app.status) && !app.deleted_at,
    canRequestDelete: app.status === 'approved' && !deleteRequested && !app.deleted_at,
  };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待审核',
    processing: '处理中',
    approved: '正常',
    rejected: '已拒绝',
    revoking: '撤销中',
    revoked: '已撤销',
    deleted: '已删除',
    active: '启用',
    disabled: '禁用',
  };
  return map[status] || status;
}

async function createDnsRecord(token: string, zoneId: string, payload: any): Promise<any> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 创建失败 HTTP ${res.status}`);
  }
  return data.result;
}

async function updateDnsRecord(token: string, zoneId: string, recordId: string, payload: any): Promise<any> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 更新失败 HTTP ${res.status}`);
  }
  return data.result;
}

async function deleteDnsRecord(token: string, zoneId: string, recordId: string): Promise<void> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 删除失败 HTTP ${res.status}`);
  }
}

function resolveDnsToken(env: Env): string {
  return String(env.CF_API_TOKEN || '').trim();
}

async function verifyTurnstile(env: Env, request: Request, token: unknown, expectedAction: string): Promise<void> {
  if (!env.TURNSTILE_SECRET) throw new HttpError(503, 'TURNSTILE_SECRET_MISSING', 'Turnstile Secret 未配置');
  const value = String(token || '').trim();
  if (!value) throw new HttpError(400, 'TURNSTILE_REQUIRED', '请完成人机验证');

  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', value);
  form.append('remoteip', clientIp(request));

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const result: any = await response.json().catch(() => null);
  if (!result?.success) throw new HttpError(403, 'TURNSTILE_FAILED', '人机验证失败');

  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new HttpError(403, 'TURNSTILE_ACTION_MISMATCH', '人机验证 Action 不匹配');
  }
  if (env.TURNSTILE_EXPECTED_HOSTNAME && result.hostname && result.hostname !== env.TURNSTILE_EXPECTED_HOSTNAME) {
    throw new HttpError(403, 'TURNSTILE_HOSTNAME_MISMATCH', '人机验证主机名不匹配');
  }
}

function turnstilePublicConfig(env: Env) {
  return {
    siteKey: env.TURNSTILE_SITE_KEY || '',
    enabledApply: isEnabled(env.TURNSTILE_ENABLE_APPLY, false),
    enabledLogin: isEnabled(env.TURNSTILE_ENABLE_LOGIN, false),
    enabledRegister: isEnabled(env.TURNSTILE_ENABLE_REGISTER, false),
    actionApply: env.TURNSTILE_ACTION_APPLY || 'domain_apply',
    actionLogin: env.TURNSTILE_ACTION_LOGIN || 'login',
    actionRegister: env.TURNSTILE_ACTION_REGISTER || 'register',
  };
}

async function getAuthUser(env: Env, request: Request): Promise<UserRow | null> {
  const sid = parseCookie(request.headers.get('cookie') || '').sid;
  if (!sid) return null;
  const tokenHash = await sha256(sid);
  const session = await env.DB.prepare(`
    SELECT * FROM sessions WHERE token_hash=? AND expires_at > datetime('now') LIMIT 1
  `).bind(tokenHash).first<{ id: string; user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE id=? AND status!='deleted' LIMIT 1
  `).bind(session.user_id).first<UserRow>();
  return user || null;
}

async function requireUser(env: Env, request: Request): Promise<UserRow> {
  const user = await getAuthUser(env, request);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户已被禁用');
  return user;
}

async function requireAdmin(env: Env, request: Request): Promise<UserRow> {
  const user = await requireUser(env, request);
  if (user.role !== 'admin') throw new HttpError(403, 'ADMIN_REQUIRED', '需要管理员权限');
  return user;
}

async function createSession(env: Env, request: Request, userId: string, remember: boolean): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * DAY).toISOString();
  const id = crypto.randomUUID();
  const ua = String(request.headers.get('user-agent') || '').slice(0, 300);
  const ip = clientIp(request);

  const insertFull = () => env.DB.prepare(`
    INSERT INTO sessions (id,user_id,token_hash,ip,user_agent,expires_at)
    VALUES (?,?,?,?,?,?)
  `).bind(id, userId, tokenHash, ip, ua, expires).run();

  try {
    await insertFull();
  } catch (firstError) {
    console.error('session insert failed, repairing sessions table', firstError);
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN ip TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN user_agent TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN expires_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN created_at TEXT`).run(); } catch {}

    try {
      await insertFull();
    } catch (secondError) {
      console.error('session insert still failed, recreating sessions table', secondError);
      await env.DB.prepare(`DROP TABLE IF EXISTS sessions`).run();
      await env.DB.prepare(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          ip TEXT,
          user_agent TEXT,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
      try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)').run(); } catch {}
      await insertFull();
    }
  }

  return cookieString('sid', token, {
    maxAge: days * DAY / 1000,
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    path: '/',
  });
}

async function destroySession(env: Env, request: Request): Promise<string> {
  const sid = parseCookie(request.headers.get('cookie') || '').sid;
  if (sid) {
    const tokenHash = await sha256(sid);
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash).run();
  }
  return cookieString('sid', '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', secure: true, path: '/' });
}

async function rateLimit(env: Env, request: Request, key: string, limit: number, windowSeconds: number): Promise<void> {
  const ip = clientIp(request);
  const bucket = `rl:${key}:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = Number(await env.APP_KV.get(bucket) || '0');
  if (current >= limit) throw new HttpError(429, 'RATE_LIMITED', '操作过于频繁，请稍后再试');
  await env.APP_KV.put(bucket, String(current + 1), { expirationTtl: windowSeconds + 60 });
}

async function audit(env: Env, request: Request, actorUserId: string | null, action: string, targetType?: string, targetId?: string | null, meta?: unknown): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (id,actor_user_id,action,target_type,target_id,ip,meta_json)
      VALUES (?,?,?,?,?,?,?)
    `).bind(crypto.randomUUID(), actorUserId, action, targetType || null, targetId || null, clientIp(request), JSON.stringify(meta || {})).run();
  } catch (error) {
    console.error('audit failed', error);
  }
}

function normalizeUsername(raw: unknown): string {
  // v26：账号不再限制长度格式、大小写或字符类型；只要求不能为空。
  const value = String(raw || '').trim();
  if (!value) {
    throw new HttpError(400, 'INVALID_USERNAME', '账号不能为空');
  }
  return value;
}

function normalizeEmail(raw: unknown): string | null {
  // v28：此字段作为“邮箱/手机号”联系方式使用。
  // 包含 @ 时按邮箱规范化；否则允许手机号/联系方式文本，避免手机号被邮箱校验拦截。
  const original = String(raw || '').trim();
  if (!original) return null;
  if (original.includes('@')) {
    const email = original.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
    return email;
  }
  const value = original.replace(/\s+/g, '');
  if (value.length < 5 || value.length > 40) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
  if (!/^[0-9+()\-]+$/.test(value)) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
  return value;
}

function validatePassword(raw: unknown): string {
  // v26：密码只要求至少 8 位，不再要求大小写、字母或数字组合。
  const value = String(raw || '');
  if (value.length < 8) {
    throw new HttpError(400, 'INVALID_PASSWORD', '密码至少 8 位');
  }
  return value;
}

function normalizePrefix(raw: unknown): { unicode: string; ascii: string } {
  const unicode = String(raw || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,34}[a-z0-9])?$/.test(unicode) || unicode.length < 2 || unicode.length > 36) {
    throw new HttpError(400, 'INVALID_PREFIX', '域名前缀需为 2-36 位，只支持字母、数字和连字符，且不能以连字符开头或结尾');
  }
  let ascii = unicode;
  try { ascii = new URL(`https://${unicode}.example.com`).hostname.replace('.example.com', ''); } catch {}
  return { unicode, ascii };
}

function normalizeSuffix(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^\.+/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) throw new HttpError(400, 'INVALID_SUFFIX', '根域名格式不正确');
  return value;
}

function normalizeRecordType(raw: unknown, allowed: string[]): DnsRecordType {
  const type = String(raw || 'CNAME').trim().toUpperCase();
  // 用户子域解析默认开放 A / AAAA / CNAME / TXT / MX。
  // 这样即使旧环境变量 DNS_ALLOWED_TYPES 仍是 CNAME,A,AAAA，也不会阻止用户添加 TXT/MX。
  const publicTypes = ['CNAME', 'A', 'AAAA', 'TXT', 'MX'];
  const allowedSet = new Set([...(allowed || []), ...publicTypes].map(x => String(x).toUpperCase()));
  if (!publicTypes.includes(type) || !allowedSet.has(type)) {
    throw new HttpError(400, 'INVALID_RECORD_TYPE', 'DNS 记录类型不可用');
  }
  return type as DnsRecordType;
}

function normalizeDnsHost(raw: unknown): string {
  const host = String(raw || '@').trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!host || host === '@') return '@';
  if (host.length > 80) throw new HttpError(400, 'INVALID_DNS_HOST', '主机记录过长');
  const labels = host.split('.');
  for (const label of labels) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      throw new HttpError(400, 'INVALID_DNS_HOST', '主机记录只能包含字母、数字、连字符和点，且不能以连字符开头或结尾');
    }
  }
  return host;
}

function fullRecordName(host: string, fqdn: string): string {
  return host === '@' ? fqdn.toLowerCase() : `${host}.${fqdn}`.toLowerCase();
}

function normalizeDnsTarget(type: string, raw: unknown, fqdn: string): string {
  const original = String(raw || '').trim();
  const target = original.toLowerCase();
  if (!original) throw new HttpError(400, 'DNS_TARGET_REQUIRED', '请输入 DNS 目标地址');

  if (type === 'CNAME') {
    const cleaned = target.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      throw new HttpError(400, 'INVALID_CNAME', 'CNAME 目标必须是完整主机名，不要填写协议、端口或路径');
    }
    if (cleaned === fqdn.toLowerCase()) throw new HttpError(400, 'CNAME_LOOP', 'CNAME 目标不能指向自己');
    return cleaned;
  }

  if (type === 'A') {
    if (!/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(target)) {
      throw new HttpError(400, 'INVALID_A', 'A 记录必须填写 IPv4 地址');
    }
    if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(target)) {
      throw new HttpError(400, 'PRIVATE_IP', '不能填写私有、本地或保留 IP');
    }
    return target;
  }

  if (type === 'AAAA') {
    if (!/^[0-9a-f:]+$/i.test(target) || !target.includes(':')) {
      throw new HttpError(400, 'INVALID_AAAA', 'AAAA 记录必须填写 IPv6 地址');
    }
    if (/^(::1|fe80:|fc|fd)/i.test(target)) throw new HttpError(400, 'PRIVATE_IP', '不能填写本地或私有 IPv6');
    return target;
  }

  if (type === 'TXT') {
    const cleaned = original.replace(/^"|"$/g, '').trim();
    if (!cleaned || cleaned.length > 2048) throw new HttpError(400, 'INVALID_TXT', 'TXT 内容不能为空，且不能超过 2048 字符');
    return cleaned;
  }

  if (type === 'MX') {
    const cleaned = target.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      throw new HttpError(400, 'INVALID_MX', 'MX 目标必须是完整邮件服务器主机名');
    }
    return cleaned;
  }

  throw new HttpError(400, 'INVALID_RECORD_TYPE', 'DNS 记录类型错误');
}

function dnsPayload(record: DnsRecordRow | { type: DnsRecordType; name: string; content: string; ttl?: number | null; proxied?: number | null; priority?: number | null }, comment: string): any {
  const type = record.type;
  const payload: any = {
    type,
    name: record.name,
    content: record.content,
    ttl: Number(record.ttl || 1),
    comment,
  };
  if (['A', 'AAAA', 'CNAME'].includes(type)) payload.proxied = Boolean(record.proxied);
  if (type === 'MX') payload.priority = clamp(Number(record.priority || 10), 0, 65535);
  return payload;
}

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = base64url(saltBytes);
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 },
    key,
    256,
  );
  return { hash: base64url(new Uint8Array(bits)), salt };
}

async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const saltBytes = fromBase64url(salt);
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 },
    key,
    256,
  );
  return timingSafeEqual(base64url(new Uint8Array(bits)), hash);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8(value));
  return base64url(new Uint8Array(digest));
}

function randomToken(bytes: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function parseCookie(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) result[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return result;
}

function cookieString(name: string, value: string, options: any): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const url = new URL(request.url);
  if (origin !== url.origin) throw new HttpError(403, 'BAD_ORIGIN', '请求来源不允许');
}

async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大');
  try { return text ? JSON.parse(text) as T : {} as T; }
  catch { throw new HttpError(400, 'INVALID_JSON', 'JSON 格式错误'); }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function ok(data: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...data });
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.set('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function isEnabled(value: unknown, fallback: boolean): boolean {
  return asBoolean(value, fallback);
}

function cleanText(value: unknown, max = 200): string {
  return String(value || '').trim().slice(0, max);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
  return Number.isFinite(date.getTime()) ? date : null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
