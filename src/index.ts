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
  phone?: string | null;
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
    copyright?: string;
    faviconUrl?: string;
    headerThirdPartyJs?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    themeMode?: string;
    noticeStartAt?: string;
    noticeEndAt?: string;
    accent: string;
    accent2: string;
    logoText: string;
    logoImageUrl?: string;
    icp?: string;
    homepageNotice?: string;
    notFoundText?: string;
    defaultLanguage?: string;
    showQuota?: boolean;
    showExpiryReminder?: boolean;
  };
  registration: {
    enabled: boolean;
    autoActivate: boolean;
    blockTempEmail?: boolean;
    maxAccountsPerIp?: number;
    ipRegisterCooldownMinutes?: number;
    turnstileRegisterEnabled?: boolean;
    defaultStatus?: 'auto' | 'manual';
    disabledMessage?: string;
    turnstileSiteKey?: string;
    turnstileSecret?: string;
    emailDomainBlacklist?: string;
    emailVerificationEnabled?: boolean;
    dailyDomainApplyLimit?: number;
    failedRegisterBanThreshold?: number;
    failedRegisterBanMinutes?: number;
    blockVpnProxy?: boolean;
    requireRegistrationKey?: boolean;
  };
  domain: {
    defaultQuota: number;
    validDays: number;
    renewWindowDays: number;
    allowUserDeleteInvalid: boolean;
    allowDnsEditAfterApproved: boolean;
    prefixMinLength?: number;
    prefixMaxLength?: number;
    prefixBlacklistText?: string;
    allowNumericPrefix?: boolean;
    allowUnderscorePrefix?: boolean;
    selfRenewEnabled?: boolean;
    expiryReminderDays?: number;
    expiredDnsCleanupDays?: number;
    allowUserDeleteActive?: boolean;
    allowDomainTransfer?: boolean;
    maxDnsRecordsPerDomain?: number;
    approvalMode?: 'manual' | 'auto' | 'risk';
    platformMaxDomains?: number;
    normalUserQuota?: number;
    normalUserValidDays?: number;
    whitelistUserQuota?: number;
    whitelistUserValidDays?: number;
    lockAfterExpireDays?: number;
    hardDeleteAfterExpireDays?: number;
    blockedPrefixText?: string;
    adminOnlyPrefixText?: string;
  };
  help: {
    categories: HelpCategorySetting[];
  };
  dns: {
    envManaged: boolean;
    reservedPrefixes: string[];
    defaultProxied?: boolean;
    allowMxRecords?: boolean;
    cfApiToken?: string;
    blockWildcardRecords?: boolean;
    cnameTargetBlacklist?: string;
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
  blacklist?: {
    prefixes: string[];
    ips: string[];
    emails: string[];
    registration?: unknown[];
    access?: unknown[];
    userIds?: unknown[];
  };
  notification?: {
    events: Record<string, boolean>;
    expiryTemplate: string;
    templates?: Record<string, string>;
    userTargets?: Record<string, string>;
    adminTargets?: Record<string, string>;
    rateLimitPerHour?: number;
  };
  security?: {
    adminSessionTimeoutHours: number;
    adminIpWhitelist: string;
    auditRetentionDays: number;
    failedLoginLockThreshold?: number;
    failedLoginLockMinutes?: number;
    adminPath?: string;
    rolesPermissions?: string;
    auditRecordItems?: string;
  };
  automation?: {
    enabled: boolean;
    scanCycleMinutes: number;
    checkExpiringDomains: boolean;
    cleanupExpiredDns: boolean;
    cronExpression?: string;
    notifyAdminOnFailure?: boolean;
    dnsCleanupProtectionDays?: number;
    taskLogs?: unknown[];
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
  if (method === 'PATCH' && pathname === '/api/account/profile') return updateOwnProfile(request, env);
  if (method === 'POST' && pathname === '/api/account/delete') return deleteOwnAccount(request, env);
  if (method === 'GET' && pathname === '/api/account/devices') return listOwnLoginDevices(request, env);

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
  match = pathname.match(/^\/api\/messages\/([^/]+)\/withdraw$/);
  if (match && method === 'POST') return withdrawOwnMessage(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/messages\/([^/]+)\/read$/);
  if (match && method === 'POST') return markOwnMessageRead(request, env, decodeURIComponent(match[1]));

  if (method === 'GET' && pathname === '/api/operation-logs') return listOperationLogs(request, env);

  if (method === 'GET' && pathname === '/api/admin/overview') return adminOverview(request, env);
  if (method === 'GET' && pathname === '/api/admin/analytics') return adminAnalytics(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/applications') return adminApplications(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/users') return adminUsers(request, env);
  if (method === 'POST' && pathname === '/api/admin/users') return adminCreateUser(request, env);
  if (method === 'GET' && pathname === '/api/admin/registration-keys') return adminListRegistrationKeys(request, env);
  if (method === 'POST' && pathname === '/api/admin/registration-keys') return adminCreateRegistrationKey(request, env);
  if (method === 'GET' && pathname === '/api/admin/messages') return adminListMessages(request, env, url);
  if (method === 'POST' && pathname === '/api/admin/messages') return adminCreateMessage(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings') return adminSettings(request, env);
  if (method === 'GET' && pathname === '/api/admin/system-status') return adminSystemStatus(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings/export') return adminExportSettings(request, env);
  if (method === 'POST' && pathname === '/api/admin/settings/import') return adminImportSettings(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/test') return adminTestCloudflareApi(request, env);

  match = pathname.match(/^\/api\/admin\/registration-keys\/([^/]+)$/);
  if (match && method === 'DELETE') return adminDeleteRegistrationKey(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/admin\/registration-keys\/([^/]+)\/usages$/);
  if (match && method === 'GET') return adminRegistrationKeyUsages(request, env, decodeURIComponent(match[1]));
  if (method === 'GET' && pathname === '/api/admin/help-settings') return adminHelpSettings(request, env);
  if (method === 'PUT' && pathname === '/api/admin/help-settings') return adminUpdateHelpSettings(request, env);

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateMessage(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return adminDeleteMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/send$/);
  if (match && method === 'POST') return adminSendMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/settings\/(site|registration|domain|dns|blacklist|notification|security|automation)$/);
  if (match && method === 'PUT') return adminUpdateSettings(request, env, match[1] as AdminSettingGroup);

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateUser(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/devices$/);
  if (match && method === 'GET') return adminUserLoginDevices(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/(approve|reject|revoke|disable|enable|delete|approve-delete|reject-delete)$/);
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
        phone TEXT,
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
        device_name TEXT,
        device_type TEXT,
        device_model TEXT,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
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

    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS registration_keys (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        max_uses INTEGER NOT NULL DEFAULT 0,
        used_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS registration_key_usages (
        id TEXT PRIMARY KEY,
        key_id TEXT NOT NULL,
        user_id TEXT,
        username TEXT,
        used_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(key_id) REFERENCES registration_keys(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
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
    `ALTER TABLE sessions ADD COLUMN device_name TEXT`,
    `ALTER TABLE sessions ADD COLUMN device_type TEXT`,
    `ALTER TABLE sessions ADD COLUMN device_model TEXT`,
    `ALTER TABLE sessions ADD COLUMN first_seen_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN last_seen_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN expires_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN created_at TEXT`,
    `ALTER TABLE users ADD COLUMN phone TEXT`,
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
    `ALTER TABLE registration_keys ADD COLUMN code TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN role TEXT DEFAULT 'user'`,
    `ALTER TABLE registration_keys ADD COLUMN max_uses INTEGER DEFAULT 0`,
    `ALTER TABLE registration_keys ADD COLUMN used_count INTEGER DEFAULT 0`,
    `ALTER TABLE registration_keys ADD COLUMN expires_at TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN status TEXT DEFAULT 'active'`,
    `ALTER TABLE registration_keys ADD COLUMN created_by TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN created_at TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_registration_keys_code ON registration_keys(code)`,
    `CREATE INDEX IF NOT EXISTS idx_registration_key_usages_key ON registration_key_usages(key_id, used_at)`,
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
    const settings = await loadSettings(env);
    await env.DB.prepare(`DELETE FROM audit_logs WHERE datetime(created_at) < datetime('now','-' || ? || ' days')`).bind(settings.security?.auditRetentionDays || 4).run();
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
    `DELETE FROM audit_logs WHERE datetime(created_at) < datetime('now','-4 days')`,
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
      registration: settings.registration,
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
      turnstile: turnstilePublicConfig(env, settings),
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
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
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
  const ip = clientIp(request);

  if ((settings.blacklist?.ips || []).includes(ip)) throw new HttpError(403, 'IP_BLOCKED', '当前 IP 已被禁止注册');
  if (!settings.registration.enabled) throw new HttpError(403, 'REGISTER_CLOSED', settings.registration.disabledMessage || '当前暂未开放用户注册');

  const adminCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status='active'
  `).first<{ count: number }>();
  if (Number(adminCount?.count || 0) < 1) throw new HttpError(503, 'SETUP_REQUIRED', '系统尚未完成管理员初始化');
  // 用户注册默认开放；前端注册入口不再因为历史 KV 设置关闭而失效。

  const requireRegisterTurnstile = isEnabled(env.TURNSTILE_ENABLE_REGISTER, false) || Boolean(settings.registration.turnstileRegisterEnabled);
  if (requireRegisterTurnstile) {
    await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_REGISTER || 'register');
  }

  const username = normalizeUsername(body.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
  if (email && settings.registration.blockTempEmail && isTempEmailDomain(email)) throw new HttpError(400, 'TEMP_EMAIL_BLOCKED', '不允许使用临时邮箱注册');
  const emailDomain = email && email.includes('@') ? email.split('@').pop() || '' : '';
  const blockedEmailDomains = sanitizeStringList(settings.registration.emailDomainBlacklist || '');
  if (emailDomain && blockedEmailDomains.some(d => emailDomain.toLowerCase() === d.toLowerCase().replace(/^@/, ''))) throw new HttpError(403, 'EMAIL_DOMAIN_BLOCKED', '该邮箱后缀已被禁止注册');
  if (email && listMatches(email, settings.blacklist?.emails || [])) throw new HttpError(403, 'EMAIL_BLOCKED', '该邮箱已被禁止注册');
  if (phone && listMatches(phone, settings.blacklist?.emails || [])) throw new HttpError(403, 'PHONE_BLOCKED', '该手机号已被禁止注册');

  let registrationKey: { id: string; role?: string | null } | null = null;
  if (settings.registration.requireRegistrationKey) {
    registrationKey = await validateRegistrationKey(env, body.registrationCode);
  }

  if (settings.registration.maxAccountsPerIp && settings.registration.maxAccountsPerIp > 0) {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM audit_logs WHERE action='auth.register' AND ip=?`).bind(ip).first<{ count: number }>();
    if (Number(count?.count || 0) >= settings.registration.maxAccountsPerIp) throw new HttpError(429, 'IP_REGISTER_LIMIT', '当前 IP 注册账号数量已达到上限');
  }
  if (settings.registration.ipRegisterCooldownMinutes && settings.registration.ipRegisterCooldownMinutes > 0) {
    const recent = await env.DB.prepare(`SELECT created_at FROM audit_logs WHERE action='auth.register' AND ip=? ORDER BY datetime(created_at) DESC LIMIT 1`).bind(ip).first<{ created_at: string }>();
    const last = parseDate(recent?.created_at);
    if (last && Date.now() - last.getTime() < settings.registration.ipRegisterCooldownMinutes * 60 * 1000) throw new HttpError(429, 'IP_REGISTER_COOLDOWN', '当前 IP 注册过于频繁，请稍后再试');
  }

  const password = validatePassword(body.password);
  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE
      OR (? IS NOT NULL AND email=? COLLATE NOCASE)
      OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号、邮箱或手机号已被使用');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const status = settings.registration.defaultStatus === 'manual' ? 'disabled' : (settings.registration.autoActivate ? 'active' : 'disabled');

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, phone, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?, ?)
  `).bind(id, username, email, phone, hash, salt, status, settings.domain.defaultQuota, JSON.stringify({ canApply: true })).run();

  if (registrationKey) await consumeRegistrationKey(env, registrationKey.id, id, username);

  await audit(env, request, id, 'auth.register', 'user', id, { status, registrationKeyId: registrationKey?.id || null });

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
    SELECT * FROM users WHERE (username=? COLLATE NOCASE OR email=? COLLATE NOCASE OR phone=? COLLATE NOCASE) LIMIT 1
  `).bind(identity, identity, identity).first<UserRow>();

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
  const loginSettings = await loadSettings(env);
  if (user.role === 'admin') {
    const allowedIps = sanitizeStringList(loginSettings.security?.adminIpWhitelist || '');
    if (allowedIps.length && !allowedIps.includes(clientIp(request))) {
      await audit(env, request, user.id, 'auth.login_failed', 'user', user.id, { identity, reason: 'admin ip blocked' });
      throw new HttpError(403, 'ADMIN_IP_BLOCKED', '当前 IP 不在管理员登录白名单内');
    }
  }

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


async function updateOwnProfile(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);

  const username = normalizeUsername(body.username ?? user.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);

  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE id!=?
      AND (
        username=? COLLATE NOCASE
        OR (? IS NOT NULL AND email=? COLLATE NOCASE)
        OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
      )
    LIMIT 1
  `).bind(user.id, username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '用户名、邮箱或手机号已被使用');

  await env.DB.prepare(`
    UPDATE users SET username=?, email=?, phone=?, updated_at=datetime('now') WHERE id=?
  `).bind(username, email, phone, user.id).run();

  await audit(env, request, user.id, 'account.profile_update', 'user', user.id, { username, email, phone: phone ? 'set' : 'empty' });
  const updated = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(user.id).first<UserRow>();
  return ok({ user: serializeUser(updated!) });
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

async function listOwnLoginDevices(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const devices = await listLoginDevicesForUser(env, user.id);
  return ok({ count: devices.length, devices });
}

async function adminUserLoginDevices(request: Request, env: Env, userId: string): Promise<Response> {
  await requireAdmin(env, request);
  const user = await env.DB.prepare(`SELECT id,username,email,role,status FROM users WHERE id=? AND status!='deleted'`).bind(userId).first<any>();
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
  const devices = await listLoginDevicesForUser(env, userId);
  return ok({ user: serializeUser(user), count: devices.length, devices });
}

async function listLoginDevicesForUser(env: Env, userId: string) {
  const rows = await env.DB.prepare(`
    SELECT id, ip, user_agent, device_name, device_type, device_model,
      COALESCE(first_seen_at, created_at) AS first_seen_at,
      COALESCE(last_seen_at, created_at) AS last_seen_at,
      expires_at, created_at
    FROM sessions
    WHERE user_id=? AND expires_at > datetime('now')
    ORDER BY COALESCE(last_seen_at, created_at) DESC
    LIMIT 100
  `).bind(userId).all<any>();
  return (rows.results || []).map(row => {
    const parsed = parseDeviceInfo(row.user_agent || '');
    return {
      id: row.id,
      deviceName: row.device_name || parsed.name,
      deviceType: row.device_type || parsed.type,
      deviceModel: row.device_model || parsed.model,
      ip: row.ip || '',
      firstLoginAt: row.first_seen_at || row.created_at || '',
      lastUsedAt: row.last_seen_at || row.created_at || '',
      expiresAt: row.expires_at || '',
    };
  });
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
    SELECT id, fqdn_unicode, fqdn_ascii, status, delete_requested_at
    FROM domain_applications
    WHERE user_id=?
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(user.id).all<{ id: string; fqdn_unicode: string; fqdn_ascii: string; status: string; delete_requested_at?: string | null }>();

  const blockingDomains = (activeDomains.results || []).map(x => ({
    id: x.id,
    domain: x.fqdn_unicode || x.fqdn_ascii,
    status: x.delete_requested_at ? '待删除审核' : statusLabel(x.status),
  }));
  if (blockingDomains.length > 0) {
    throw new HttpError(409, 'ACTIVE_DOMAINS_EXIST', '账户下还有未注销域名，请先申请删除并等待管理员批准后再注销账号', { domains: blockingDomains });
  }

  await hardDeleteUser(env, user.id);
  return withCookie(ok({ deleted: true, purged: true }), await destroySession(env, request));
}


function applicationDnsProjection(alias: string = 'a'): string {
  const live = `(r.deleted_at IS NULL OR r.deleted_at='')`;
  const order = `CASE r.host WHEN '@' THEN 0 ELSE 1 END, r.host ASC, r.type ASC, r.created_at ASC`;
  return `
    (SELECT COUNT(*) FROM dns_records r WHERE r.application_id=${alias}.id AND ${live}) AS dns_count,
    (SELECT r.type FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_record_type,
    (SELECT r.content FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_record_content,
    (SELECT r.cf_record_id FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_dns_record_id,
    (SELECT GROUP_CONCAT(r.type || ' → ' || r.content, '；') FROM dns_records r WHERE r.application_id=${alias}.id AND ${live}) AS dns_summary
  `;
}

async function syncApplicationDnsSummary(env: Env, applicationId: string): Promise<void> {
  const row = await env.DB.prepare(`
    SELECT type, content, cf_record_id
    FROM dns_records
    WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY CASE host WHEN '@' THEN 0 ELSE 1 END, host ASC, type ASC, created_at ASC
    LIMIT 1
  `).bind(applicationId).first<{ type: string; content: string; cf_record_id?: string | null }>();

  if (row) {
    await env.DB.prepare(`
      UPDATE domain_applications
      SET record_type=?, record_content=?, dns_record_id=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(row.type, row.content, row.cf_record_id || '', applicationId).run();
  } else {
    await env.DB.prepare(`
      UPDATE domain_applications
      SET record_type='', record_content='', dns_record_id=NULL, updated_at=datetime('now')
      WHERE id=?
    `).bind(applicationId).run();
  }
}

async function listOwnApplications(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const rows = await env.DB.prepare(`
    SELECT a.*, ${applicationDnsProjection('a')}
    FROM domain_applications a
    WHERE a.user_id=? AND (a.deleted_at IS NULL OR a.deleted_at='')
    ORDER BY a.created_at DESC
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
    SELECT a.*, ${applicationDnsProjection('a')}
    FROM domain_applications a
    WHERE a.id=? AND a.user_id=? AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  return ok({ application: serializeApplication(app, await loadSettings(env)) });
}

async function createApplication(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await rateLimit(env, request, `apply:${user.id}`, 20, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  if (settings.registration.dailyDomainApplyLimit && settings.registration.dailyDomainApplyLimit > 0) {
    const todayCount = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM domain_applications
      WHERE user_id=? AND date(created_at)=date('now')
    `).bind(user.id).first<{ count: number }>();
    if (Number(todayCount?.count || 0) >= settings.registration.dailyDomainApplyLimit) {
      throw new HttpError(429, 'DAILY_DOMAIN_APPLY_LIMIT', `今天申请域名数量已达到上限：${settings.registration.dailyDomainApplyLimit} 个`);
    }
  }

  if (isEnabled(env.TURNSTILE_ENABLE_APPLY, false)) {
    await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_APPLY || 'domain_apply');
  }

  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户不可用');

  const prefix = normalizePrefix(body.prefix);
  const prefixRules = settings.domain;
  const p = prefix.unicode;
  const minLen = prefixRules.prefixMinLength || 2;
  const maxLen = prefixRules.prefixMaxLength || 36;
  if (p.length < minLen || p.length > maxLen) throw new HttpError(400, 'INVALID_PREFIX_LENGTH', `域名前缀长度必须为 ${minLen}-${maxLen} 位`);
  if (!prefixRules.allowUnderscorePrefix && p.includes('_')) throw new HttpError(400, 'UNDERSCORE_NOT_ALLOWED', '当前不允许使用下划线前缀');
  if (!prefixRules.allowNumericPrefix && /^\d+$/.test(p)) throw new HttpError(400, 'NUMERIC_PREFIX_NOT_ALLOWED', '当前不允许使用纯数字前缀');

  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(x => x.enabled && (x.suffix === suffixInput || x.suffixAscii === suffixInput));
  if (!suffix) throw new HttpError(400, 'SUFFIX_NOT_ALLOWED', '该根域名不可注册');

  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  const blacklistRules = [
    ...sanitizeStringList(settings.domain.prefixBlacklistText || ''),
    ...sanitizeStringList(settings.domain.blockedPrefixText || ''),
    ...(settings.blacklist?.prefixes || []),
  ];
  const adminOnlyRules = sanitizeStringList(settings.domain.adminOnlyPrefixText || '');
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii) || prefixMatchesRule(prefix.unicode, blacklistRules) || prefixMatchesRule(prefix.ascii, blacklistRules)) {
    throw new HttpError(409, 'RESERVED_PREFIX', '该前缀为系统保留词或黑名单关键词');
  }
  if (user.role !== 'admin' && (prefixMatchesRule(prefix.unicode, adminOnlyRules) || prefixMatchesRule(prefix.ascii, adminOnlyRules))) {
    throw new HttpError(409, 'ADMIN_ONLY_PREFIX', '该前缀仅管理员可用');
  }

  const platformCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE status NOT IN ('rejected','revoked') AND (deleted_at IS NULL OR deleted_at='')
  `).first<{ count: number }>();
  if (Number(platformCount?.count || 0) >= (settings.domain.platformMaxDomains || 9999)) {
    throw new HttpError(403, 'PLATFORM_DOMAIN_LIMIT', '平台二级域名总配额已满');
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

  const riskRules = ['login','signin','pay','wallet','bank','admin','mail','api','official','support','verify'];
  const isRiskDomain = riskRules.some(rule => prefix.unicode.toLowerCase().includes(rule) || prefix.ascii.toLowerCase().includes(rule));
  const autoApproved = settings.domain.approvalMode === 'auto' || (settings.domain.approvalMode === 'risk' && !isRiskDomain);
  const appStatus = autoApproved ? 'approved' : 'pending';
  const expiresAt = autoApproved ? new Date(Date.now() + settings.domain.validDays * DAY).toISOString() : null;

  await env.DB.prepare(`
    INSERT INTO domain_applications (
      id,user_id,prefix_unicode,prefix_ascii,suffix_unicode,suffix_ascii,fqdn_unicode,fqdn_ascii,
      record_type,record_content,proxied,ttl,status,expires_at,reviewed_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.id, prefix.unicode, prefix.ascii, suffix.suffix, suffix.suffixAscii, fqdnUnicode, fqdnAscii,
    suffix.defaultType, '', suffix.proxied ? 1 : 0, suffix.ttl, appStatus, expiresAt, autoApproved ? new Date().toISOString() : null,
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
    const token = resolveDnsToken(env, settings);
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
  if (type === 'MX' && settings.dns.allowMxRecords === false) throw new HttpError(403, 'MX_DISABLED', '管理员已禁止用户创建 MX 解析记录');
  const recordCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM dns_records WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(applicationId).first<{ count: number }>();
  if (Number(recordCount?.count || 0) >= (settings.domain.maxDnsRecordsPerDomain || 20)) throw new HttpError(403, 'DNS_RECORD_LIMIT', `单个域名最多可创建 ${settings.domain.maxDnsRecordsPerDomain || 20} 条 DNS 解析`);
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

  const token = resolveDnsToken(env, settings);
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

  await syncApplicationDnsSummary(env, applicationId);

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
  if (type === 'MX' && settings.dns.allowMxRecords === false) throw new HttpError(403, 'MX_DISABLED', '管理员已禁止用户创建 MX 解析记录');
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
    const token = resolveDnsToken(env, settings);
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

  await syncApplicationDnsSummary(env, row.application_id);
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
    const token = resolveDnsToken(env, settings);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    try { await deleteDnsRecord(token, suffix.zoneId, row.cf_record_id); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败';
      await env.DB.prepare(`UPDATE dns_records SET error_message=?,status='error',updated_at=datetime('now') WHERE id=?`).bind(message, recordId).run();
      throw new HttpError(502, 'DNS_DELETE_FAILED', message);
    }
  }

  await hardDeleteDnsRecordRow(env, recordId);
  await syncApplicationDnsSummary(env, row.application_id);
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
  const settings = await loadSettings(env);
  const token = resolveDnsToken(env, settings);
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
  const settings = await loadSettings(env);
  const token = resolveDnsToken(env, settings);
  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(app.id).all<DnsRecordRow>();
  const records = rows.results || [];
  const namesToClean = new Set<string>();

  // v56：D1 保存的 Cloudflare record_id 可能已经过期，或者用户在 Cloudflare 后台手动改过记录类型。
  // 删除/禁用/撤销域名时，除了按 record_id 删除，也按完整域名名称兜底清理 Cloudflare 里仍存在的记录。
  if (app.fqdn_ascii) namesToClean.add(String(app.fqdn_ascii).toLowerCase());
  for (const record of records) {
    if (record.name) namesToClean.add(String(record.name).toLowerCase());
    if (record.cf_record_id) {
      if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
      await deleteDnsRecord(token, suffix.zoneId, record.cf_record_id);
    }
    await hardDeleteDnsRecordRow(env, record.id);
  }
  if (app.dns_record_id) {
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');
    await deleteDnsRecord(token, suffix.zoneId, app.dns_record_id);
  }

  if (token) {
    for (const name of namesToClean) {
      await deleteDnsRecordsByName(token, suffix.zoneId, name);
    }
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
  if (settings.domain.selfRenewEnabled === false) throw new HttpError(403, 'RENEW_DISABLED', '管理员未开放用户自助续期');

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
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE id=? AND user_id=? AND status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();

  if (!app) throw new HttpError(404, 'NOT_FOUND', '只有正常域名可以申请删除');
  if (settings.domain.allowUserDeleteActive === false) throw new HttpError(403, 'DELETE_ACTIVE_DISABLED', '管理员未开放用户删除已生效域名');
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
  return ['info', 'success', 'warning', 'danger', 'important', 'system', 'feedback', 'support_reply'].includes(level) ? level : 'info';
}

function normalizeMessageStatus(value: unknown): string {
  const status = String(value || 'sent').toLowerCase();
  return ['sent', 'draft', 'template'].includes(status) ? status : 'sent';
}

function normalizeTargetType(value: unknown): string {
  const type = String(value || '').toLowerCase();
  return ['all', 'user', 'role', 'none'].includes(type) ? type : 'none';
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
    WHERE datetime(l.created_at) >= datetime('now','-4 days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 1000
  ` : `
    SELECT l.*, u.username AS actor_username
    FROM audit_logs l
    LEFT JOIN users u ON u.id=l.actor_user_id
    WHERE l.actor_user_id=?
      AND datetime(l.created_at) >= datetime('now','-4 days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 500
  `;

  const rows = isAdmin
    ? await env.DB.prepare(sql).all<OperationLogRow>()
    : await env.DB.prepare(sql).bind(user.id).all<OperationLogRow>();

  return ok({ logs: (rows.results || []).map(serializeOperationLog), retentionDays: 4, scope: isAdmin ? 'admin' : 'self' });
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
    'application.enable': '取消禁用域名',
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
  if (action === 'application.enable') return `管理员取消禁用域名${targetId ? `（ID：${targetId}）` : ''}`;
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
    VALUES (?, ?, 'role', NULL, 'admin', ?, ?, 'feedback', 'sent', datetime('now'))
  `).bind(id, user.id, title, text).run();
  await audit(env, request, user.id, 'message.contact_admin', 'message', id, { title });
  const row = await env.DB.prepare(`SELECT m.*, sender.username AS sender_username FROM system_messages m LEFT JOIN users sender ON sender.id=m.sender_user_id WHERE m.id=?`).bind(id).first<MessageRow>();
  return ok({ sent: true, movedToMessageCenter: true, message: serializeMessage(row!) });
}

async function listOwnMessages(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const rows = await env.DB.prepare(`
    SELECT m.*,
      sender.username AS sender_username,
      target.username AS target_username,
      r.read_at,
      CASE
        WHEN m.target_type='user' AND m.target_user_id IS NOT NULL THEN (
          SELECT COUNT(*) FROM message_reads rr WHERE rr.message_id=m.id AND rr.user_id=m.target_user_id
        )
        WHEN m.target_type='role' AND m.target_role IS NOT NULL THEN (
          SELECT COUNT(DISTINCT rr.user_id)
          FROM message_reads rr
          JOIN users ru ON ru.id=rr.user_id
          WHERE rr.message_id=m.id AND ru.role=m.target_role AND ru.status!='deleted'
        )
        WHEN m.target_type='all' THEN (
          SELECT COUNT(DISTINCT rr.user_id)
          FROM message_reads rr
          JOIN users ru ON ru.id=rr.user_id
          WHERE rr.message_id=m.id AND ru.status!='deleted'
        )
        ELSE 0
      END AS recipient_read_count
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
    LIMIT 1000
  `).bind(user.id, user.id, user.role, user.id).all<MessageRow>();
  const messages = (rows.results || []).map(row => {
    const msg = serializeMessage(row) as ReturnType<typeof serializeMessage> & Record<string, unknown>;
    const sentByMe = row.sender_user_id === user.id;
    const recipientReadCount = Number((row as any).recipient_read_count || 0);
    msg.sentByMe = sentByMe;
    msg.recipientReadCount = recipientReadCount;
    msg.recipientRead = recipientReadCount > 0;
    if (sentByMe) {
      msg.isRead = true;
      const sentTime = Date.parse(String(row.sent_at || row.created_at || '').replace(' ', 'T') + 'Z');
      const canWithdraw = Number.isFinite(sentTime) && Date.now() - sentTime <= 15 * 60 * 1000;
      msg.canWithdraw = canWithdraw;
      msg.withdrawUntil = Number.isFinite(sentTime) ? new Date(sentTime + 15 * 60 * 1000).toISOString() : null;
      if (row.target_type === 'role' && row.target_role === 'admin') msg.recipientReadText = recipientReadCount > 0 ? '管理员已读' : '管理员未读';
      else if (row.target_type === 'role' && row.target_role === 'user') msg.recipientReadText = recipientReadCount > 0 ? '用户已读' : '用户未读';
      else if (row.target_type === 'all') msg.recipientReadText = recipientReadCount > 0 ? `已有 ${recipientReadCount} 人已读` : '全部未读';
      else msg.recipientReadText = recipientReadCount > 0 ? '对方已读' : '对方未读';
    }
    return msg;
  });
  return ok({ messages, unread: messages.filter(m => !m.sentByMe && !m.isRead).length });
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
  `).bind(
    replyId,
    user.id,
    targetType,
    targetUserId,
    targetRole,
    cleanText(`回复：${original.title || '消息'}`, 120),
    cleanText(quotedBody, 5000),
    user.role === 'admin' ? 'support_reply' : 'feedback'
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

async function withdrawOwnMessage(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const message = await env.DB.prepare(`
    SELECT id, sender_user_id, sent_at, created_at
    FROM system_messages
    WHERE id=? AND sender_user_id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<MessageRow>();
  if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权撤销');

  const allowed = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id=? AND sender_user_id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND datetime(COALESCE(sent_at, created_at)) >= datetime('now','-15 minutes')
  `).bind(id, user.id).first<{ id: string }>();
  if (!allowed) throw new HttpError(400, 'WITHDRAW_EXPIRED', '已超过 15 分钟，不能撤销');

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id=?`).bind(id),
    env.DB.prepare(`DELETE FROM system_messages WHERE id=? AND sender_user_id=?`).bind(id, user.id),
  ]);
  return ok({ withdrawn: true });
}

async function markOwnMessageRead(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const message = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND (target_type='all' OR (target_type='user' AND target_user_id=?) OR (target_type='role' AND target_role=?))
  `).bind(id, user.id, user.role).first<{ id: string }>();
  if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权查看');
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
  const status = normalizeMessageStatus(body.status);
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body ?? body.content, 5000);
  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', '请填写消息标题');
  if (!text) throw new HttpError(400, 'BODY_REQUIRED', '请填写消息内容');
  let targetType = normalizeTargetType(body.targetType ?? body.target_type);
  let targetUserId = cleanText(body.targetUserId ?? body.target_user_id, 80) || null;
  let targetRole = cleanText(body.targetRole ?? body.target_role, 20) || null;

  // 草稿和模板允许暂时不选择发送对象；真正发送时必须补全对象。
  if (targetType === 'none' && status === 'sent') {
    throw new HttpError(400, 'TARGET_REQUIRED', '立即发送前请选择接收对象');
  }
  if (targetType === 'all') {
    targetUserId = null;
    targetRole = null;
  } else if (targetType === 'role') {
    targetUserId = null;
    targetRole = targetRole === 'admin' ? 'admin' : 'user';
  } else if (targetType === 'user') {
    targetRole = null;
    if (!targetUserId) {
      if (status === 'sent') throw new HttpError(400, 'TARGET_USER_REQUIRED', '请选择接收用户');
      targetType = 'none';
      targetUserId = null;
    } else {
      const user = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status!='deleted'`).bind(targetUserId).first<{ id: string }>();
      if (!user) throw new HttpError(404, 'TARGET_USER_NOT_FOUND', '接收用户不存在');
    }
  }
  return {
    title,
    body: text,
    targetType,
    targetUserId,
    targetRole,
    level: normalizeMessageLevel(body.level),
    status,
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
  if (existing.target_type === 'none') throw new HttpError(400, 'TARGET_REQUIRED', '发送草稿前请先编辑并选择接收对象');
  if (existing.target_type === 'user' && !existing.target_user_id) throw new HttpError(400, 'TARGET_USER_REQUIRED', '发送草稿前请先选择接收用户');
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
        SELECT a.*,u.username, ${applicationDnsProjection('a')} FROM domain_applications a
        LEFT JOIN users u ON u.id=a.user_id
        WHERE (a.deleted_at IS NULL OR a.deleted_at='')
        ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, a.created_at DESC
        LIMIT ?
      `).bind(limit).all<ApplicationRow>()
    : await env.DB.prepare(`
        SELECT a.*,u.username, ${applicationDnsProjection('a')} FROM domain_applications a
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

  if (action === 'enable') {
    const disabledByAdmin = app.status === 'revoked' && String(app.review_note || '').startsWith('【已禁用】');
    if (!disabledByAdmin) throw new HttpError(409, 'NOT_DISABLED_DOMAIN', '该域名当前不是管理员禁用状态');
    const expires = app.expires_at || new Date(Date.now() + settings.domain.validDays * DAY).toISOString();
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='approved',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,expires_at=?,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(note || '管理员已取消禁用，您可以重新添加 DNS 解析。', admin.id, expires, id).run();
    await audit(env, request, admin.id, 'application.enable', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已取消禁用', note || '管理员已取消禁用该域名，域名恢复正常；DNS 记录需要重新添加。', 'success');
    return ok({ status: 'approved', statusText: '正常' });
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


async function validateRegistrationKey(env: Env, rawCode: unknown): Promise<{ id: string; role?: string | null }> {
  const code = cleanText(rawCode, 120);
  if (!code) throw new HttpError(400, 'REGISTRATION_KEY_REQUIRED', '请输入注册码');
  const row = await env.DB.prepare(`
    SELECT id, code, role, max_uses, used_count, expires_at, status
    FROM registration_keys
    WHERE code=? COLLATE NOCASE AND status='active'
    LIMIT 1
  `).bind(code).first<any>();
  if (!row) throw new HttpError(403, 'REGISTRATION_KEY_INVALID', '注册码不存在或已停用');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    throw new HttpError(403, 'REGISTRATION_KEY_EXPIRED', '注册码已过期');
  }
  const maxUses = Number(row.max_uses || 0);
  const used = Number(row.used_count || 0);
  if (maxUses > 0 && used >= maxUses) throw new HttpError(403, 'REGISTRATION_KEY_USED_UP', '注册码使用次数已用完');
  return { id: row.id, role: row.role };
}

async function consumeRegistrationKey(env: Env, keyId: string, userId: string, username: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE registration_keys SET used_count=COALESCE(used_count,0)+1 WHERE id=?`).bind(keyId),
    env.DB.prepare(`INSERT INTO registration_key_usages (id, key_id, user_id, username) VALUES (?, ?, ?, ?)`).bind(crypto.randomUUID(), keyId, userId, username),
  ]);
}

async function adminListRegistrationKeys(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const rows = await env.DB.prepare(`
    SELECT k.*, (SELECT COUNT(*) FROM registration_key_usages u WHERE u.key_id=k.id) AS usage_count
    FROM registration_keys k
    WHERE status!='deleted'
    ORDER BY datetime(created_at) DESC
    LIMIT 500
  `).all<any>();
  return ok({ keys: (rows.results || []).map(k => ({
    id: k.id,
    code: k.code,
    role: k.role || 'user',
    maxUses: Number(k.max_uses || 0),
    usedCount: Number(k.usage_count || k.used_count || 0),
    expiresAt: k.expires_at || '',
    status: k.status || 'active',
    createdAt: k.created_at || '',
  })) });
}

function randomRegistrationCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(Math.max(4, Math.min(64, length)));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(n => chars[n % chars.length]).join('');
}

async function adminCreateRegistrationKey(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const codeLength = clamp(Number(body.codeLength || 8), 4, 64);
  const code = cleanText(body.code, 120) || randomRegistrationCode(codeLength);
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(code)) throw new HttpError(400, 'INVALID_CODE', '注册码只能包含字母、数字、下划线或连字符，至少 4 位');
  const role = body.role === 'admin' ? 'admin' : 'user';
  const maxUses = clamp(Number(body.maxUses || 0), 0, 999999);
  const expiresAt = cleanText(body.expiresAt, 80);
  const duplicate = await env.DB.prepare(`SELECT id FROM registration_keys WHERE code=? COLLATE NOCASE AND status!='deleted'`).bind(code).first<any>();
  if (duplicate) throw new HttpError(409, 'CODE_EXISTS', '注册码已存在');
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO registration_keys (id, code, role, max_uses, used_count, expires_at, status, created_by)
    VALUES (?, ?, ?, ?, 0, ?, 'active', ?)
  `).bind(id, code, role, maxUses, expiresAt || null, admin.id).run();
  await audit(env, request, admin.id, 'admin.registration_key_create', 'registration_key', id, { code, role, maxUses, expiresAt });
  return ok({ key: { id, code, role, maxUses, usedCount: 0, expiresAt, status: 'active' } });
}

async function adminDeleteRegistrationKey(request: Request, env: Env, keyId: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const row = await env.DB.prepare(`SELECT id,code FROM registration_keys WHERE id=? AND status!='deleted'`).bind(keyId).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '注册码不存在');
  await env.DB.prepare(`UPDATE registration_keys SET status='deleted' WHERE id=?`).bind(keyId).run();
  await audit(env, request, admin.id, 'admin.registration_key_delete', 'registration_key', keyId, { code: row.code });
  return ok({ deleted: true });
}

async function adminRegistrationKeyUsages(request: Request, env: Env, keyId: string): Promise<Response> {
  await requireAdmin(env, request);
  const key = await env.DB.prepare(`SELECT id,code FROM registration_keys WHERE id=?`).bind(keyId).first<any>();
  if (!key) throw new HttpError(404, 'NOT_FOUND', '注册码不存在');
  const rows = await env.DB.prepare(`
    SELECT u.*, usr.email, usr.phone
    FROM registration_key_usages u
    LEFT JOIN users usr ON usr.id=u.user_id
    WHERE u.key_id=?
    ORDER BY datetime(u.used_at) DESC
    LIMIT 500
  `).bind(keyId).all<any>();
  return ok({ key: { id: key.id, code: key.code }, usages: (rows.results || []).map(u => ({
    id: u.id,
    username: u.username || u.email || u.phone || u.user_id || '—',
    userId: u.user_id || '',
    usedAt: u.used_at || '',
  })) });
}


async function adminAnalytics(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const range = normalizeAnalyticsRange(url);
  const bucketFormat = range.bucket === 'hour' ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
  const startSql = sqlDate(range.start);
  const endSql = sqlDate(range.end);
  const prevStartSql = sqlDate(range.prevStart);
  const prevEndSql = sqlDate(range.prevEnd);

  const periodWhere = `datetime({field}) >= datetime(?) AND datetime({field}) < datetime(?)`;
  const [domainTotals, activeDomains, users, dnsTotal, apps, statusRows, dnsTypeRows, cfRows, cfFails,
    totalDomainsPeriod, totalDomainsPrev, activePeriod, activePrev, usersPeriod, usersPrev, dnsPeriod, dnsPrev, appsPeriod, appsPrev,
    createdRows, approvedRows, rejectedRows, dnsAddedRows, dnsRemovedRows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN deleted_at IS NOT NULL AND deleted_at!='' THEN 1 ELSE 0 END) AS deleted FROM domain_applications`).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE status='approved' AND (deleted_at IS NULL OR deleted_at='') AND (expires_at IS NULL OR datetime(expires_at)>datetime('now'))`).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM users WHERE status!='deleted'`).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='')`).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM domain_applications`).first<any>(),
    env.DB.prepare(`SELECT status, COUNT(*) AS count FROM domain_applications GROUP BY status`).all<any>(),
    env.DB.prepare(`SELECT type, COUNT(*) AS count FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='') GROUP BY type`).all<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN action LIKE '%failed%' OR action LIKE '%error%' THEN 1 ELSE 0 END) AS failed FROM audit_logs WHERE (action LIKE '%dns%' OR action LIKE '%cf_api%') AND datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT action AS reason, COUNT(*) AS count FROM audit_logs WHERE (action LIKE '%dns%' OR action LIKE '%cf_api%') AND (action LIKE '%failed%' OR action LIKE '%error%') AND datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?) GROUP BY action LIMIT 10`).bind(startSql, endSql).all<any>(),

    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(prevStartSql, prevEndSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE status='approved' AND datetime(COALESCE(reviewed_at, created_at)) >= datetime(?) AND datetime(COALESCE(reviewed_at, created_at)) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE status='approved' AND datetime(COALESCE(reviewed_at, created_at)) >= datetime(?) AND datetime(COALESCE(reviewed_at, created_at)) < datetime(?)`).bind(prevStartSql, prevEndSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(prevStartSql, prevEndSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM dns_records WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM dns_records WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(prevStartSql, prevEndSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(startSql, endSql).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?)`).bind(prevStartSql, prevEndSql).first<any>(),

    env.DB.prepare(`SELECT strftime('${bucketFormat}', created_at) AS bucket, COUNT(*) AS count FROM domain_applications WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?) GROUP BY bucket`).bind(startSql, endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}', reviewed_at) AS bucket, COUNT(*) AS count FROM domain_applications WHERE status='approved' AND reviewed_at IS NOT NULL AND datetime(reviewed_at) >= datetime(?) AND datetime(reviewed_at) < datetime(?) GROUP BY bucket`).bind(startSql, endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}', COALESCE(deleted_at, reviewed_at, created_at)) AS bucket, COUNT(*) AS count FROM domain_applications WHERE (status IN ('rejected','revoked','deleted') OR deleted_at IS NOT NULL) AND datetime(COALESCE(deleted_at, reviewed_at, created_at)) >= datetime(?) AND datetime(COALESCE(deleted_at, reviewed_at, created_at)) < datetime(?) GROUP BY bucket`).bind(startSql, endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}', created_at) AS bucket, COUNT(*) AS count FROM dns_records WHERE datetime(created_at) >= datetime(?) AND datetime(created_at) < datetime(?) GROUP BY bucket`).bind(startSql, endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}', deleted_at) AS bucket, COUNT(*) AS count FROM dns_records WHERE deleted_at IS NOT NULL AND deleted_at!='' AND datetime(deleted_at) >= datetime(?) AND datetime(deleted_at) < datetime(?) GROUP BY bucket`).bind(startSql, endSql).all<any>(),
  ]);

  const bucketList = buildAnalyticsBuckets(range.start, range.end, range.bucket);
  const domainTrend = mergeMultiTrend(bucketList, [
    { key: 'created', rows: createdRows.results || [] },
    { key: 'approved', rows: approvedRows.results || [] },
    { key: 'rejected', rows: rejectedRows.results || [] },
  ]);
  const dnsTrend = mergeMultiTrend(bucketList, [
    { key: 'added', rows: dnsAddedRows.results || [] },
    { key: 'removed', rows: dnsRemovedRows.results || [] },
  ]);

  return ok({ analytics: {
    range: {
      preset: range.preset,
      days: range.days,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      bucket: range.bucket,
      label: range.label,
    },
    days: range.days,
    metrics: {
      totalDomains: metric(Number(domainTotals?.total || 0), Number(domainTotals?.deleted || 0), Number(totalDomainsPeriod?.count || 0), Number(totalDomainsPrev?.count || 0)),
      activeDomains: metric(Number(activeDomains?.count || 0), 0, Number(activePeriod?.count || 0), Number(activePrev?.count || 0)),
      users: metric(Number(users?.total || 0), 0, Number(usersPeriod?.count || 0), Number(usersPrev?.count || 0)),
      dnsRecords: metric(Number(dnsTotal?.total || 0), 0, Number(dnsPeriod?.count || 0), Number(dnsPrev?.count || 0)),
      applications: metric(Number(apps?.total || 0), 0, Number(appsPeriod?.count || 0), Number(appsPrev?.count || 0)),
    },
    domainTrend,
    dnsTrend,
    statusDistribution: statusRows.results || [],
    dnsTypeDistribution: dnsTypeRows.results || [],
    cfApi: { total: Number(cfRows?.total || 0), failed: Number(cfRows?.failed || 0), success: Math.max(0, Number(cfRows?.total || 0) - Number(cfRows?.failed || 0)), failures: cfFails.results || [] },
  } });
}

type AnalyticsRange = { preset: string; start: Date; end: Date; prevStart: Date; prevEnd: Date; days: number; bucket: 'hour' | 'day'; label: string };
function normalizeAnalyticsRange(url: URL): AnalyticsRange {
  const now = new Date();
  const preset = String(url.searchParams.get('range') || url.searchParams.get('days') || '30d').toLowerCase();
  let start: Date;
  let end = now;
  let label = '最近30天';
  let bucket: 'hour' | 'day' = 'day';

  if (preset === 'custom') {
    const rawStart = url.searchParams.get('start') || '';
    const rawEnd = url.searchParams.get('end') || '';
    start = rawStart ? new Date(rawStart) : new Date(now.getTime() - 30 * DAY);
    end = rawEnd ? new Date(rawEnd) : now;
    if (Number.isNaN(start.getTime())) start = new Date(now.getTime() - 30 * DAY);
    if (Number.isNaN(end.getTime())) end = now;
    if (end <= start) end = new Date(start.getTime() + DAY);
    const diffHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    bucket = diffHours <= 48 ? 'hour' : 'day';
    label = '自定义';
  } else {
    const map: Record<string, { ms: number; label: string; bucket: 'hour' | 'day' }> = {
      '12h': { ms: 12 * 60 * 60 * 1000, label: '最近12小时', bucket: 'hour' },
      '1d': { ms: DAY, label: '最近1天', bucket: 'hour' },
      '3d': { ms: 3 * DAY, label: '最近3天', bucket: 'day' },
      '7d': { ms: 7 * DAY, label: '最近7天', bucket: 'day' },
      '7': { ms: 7 * DAY, label: '最近7天', bucket: 'day' },
      '30d': { ms: 30 * DAY, label: '最近30天', bucket: 'day' },
      '30': { ms: 30 * DAY, label: '最近30天', bucket: 'day' },
      '90d': { ms: 90 * DAY, label: '最近90天', bucket: 'day' },
      '90': { ms: 90 * DAY, label: '最近90天', bucket: 'day' },
    };
    const picked = map[preset] || map['30d'];
    start = new Date(now.getTime() - picked.ms);
    bucket = picked.bucket;
    label = picked.label;
  }
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - span);
  return { preset, start, end, prevStart, prevEnd, days: Math.max(1, Math.ceil(span / DAY)), bucket, label };
}
function sqlDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
function bucketKey(date: Date, bucket: 'hour' | 'day'): string {
  const iso = date.toISOString();
  return bucket === 'hour' ? iso.slice(0, 13).replace('T', ' ') + ':00' : iso.slice(0, 10);
}
function buildAnalyticsBuckets(start: Date, end: Date, bucket: 'hour' | 'day'): string[] {
  const step = bucket === 'hour' ? 60 * 60 * 1000 : DAY;
  const out: string[] = [];
  let cursor = new Date(start.getTime());
  if (bucket === 'hour') cursor.setUTCMinutes(0, 0, 0);
  else cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < end && out.length < 220) {
    out.push(bucketKey(cursor, bucket));
    cursor = new Date(cursor.getTime() + step);
  }
  return out;
}
function mergeMultiTrend(buckets: string[], series: Array<{ key: string; rows: any[] }>) {
  const map = new Map<string, any>();
  for (const bucket of buckets) map.set(bucket, { day: bucket, bucket });
  for (const item of series) {
    for (const bucket of buckets) map.get(bucket)[item.key] = 0;
    for (const row of item.rows || []) {
      const key = String(row.bucket || row.day || '');
      if (!map.has(key)) map.set(key, { day: key, bucket: key });
      map.get(key)[item.key] = Number(row.count || 0);
    }
  }
  return Array.from(map.values()).sort((a,b) => String(a.bucket).localeCompare(String(b.bucket)));
}
function metric(total: number, deleted: number, current: number, previous: number) {
  let pct: number | null = null;
  let direction = 'flat';
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 1000) / 10;
    direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  } else if (current > 0) {
    direction = 'up';
  }
  return { total, deleted, current, previous, pct, direction, noPrevious: previous === 0 };
}

function mergeDnsTrend(addRows: any[], removeRows: any[]) {
  const map = new Map<string, any>();
  for (const r of addRows) map.set(r.day, { day: r.day, added: Number(r.added || 0), removed: 0 });
  for (const r of removeRows) {
    const item = map.get(r.day) || { day: r.day, added: 0, removed: 0 };
    item.removed = Number(r.removed || 0);
    map.set(r.day, item);
  }
  return Array.from(map.values()).sort((a,b) => String(a.day).localeCompare(String(b.day)));
}

async function adminCreateUser(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  await verifyTurnstile(env, request, body.turnstileToken, env.TURNSTILE_ACTION_REGISTER || 'register');

  const username = normalizeUsername(body.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
  const password = validatePassword(body.password);
  const role: Role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) as UserStatus : 'active';
  const quota = Math.max(0, Math.floor(Number(body.domainQuota ?? settings.domain.defaultQuota) || 0));

  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE
      OR (? IS NOT NULL AND email=? COLLATE NOCASE)
      OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号或邮箱/手机号已被使用');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, phone, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, username, email, phone, hash, salt, role, status, quota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, admin.id, 'admin.user_create', 'user', id, { username, email, phone: phone ? 'set' : 'empty', role, status, quota });
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

type AdminSettingGroup = 'site' | 'registration' | 'domain' | 'dns' | 'blacklist' | 'notification' | 'security' | 'automation';

async function adminUpdateSettings(request: Request, env: Env, group: AdminSettingGroup): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 1024 * 1024);
  const settings = await loadSettings(env);

  if (group === 'site') {
    settings.site = {
      ...settings.site,
      title: cleanText(body.title, 80) || settings.site.title,
      subtitle: cleanText(body.subtitle, 140),
      footer: cleanText(body.footer, 300),
      copyright: cleanText(body.copyright, 1000),
      faviconUrl: cleanText(body.faviconUrl, 500),
      headerThirdPartyJs: cleanText(body.headerThirdPartyJs, 20000),
      maintenanceMode: asBoolean(body.maintenanceMode, false),
      maintenanceMessage: cleanText(body.maintenanceMessage, 1000),
      themeMode: ['light','dark','system'].includes(String(body.themeMode)) ? String(body.themeMode) : 'light',
      noticeStartAt: cleanText(body.noticeStartAt, 80),
      noticeEndAt: cleanText(body.noticeEndAt, 80),
      accent: normalizeHexColor(body.accent, '#4f63f6'),
      accent2: normalizeHexColor(body.accent2, '#7c4dff'),
      logoText: cleanText(body.logoText, 12) || 'free',
      logoImageUrl: cleanText(body.logoImageUrl, 500),
      icp: cleanText(body.icp, 200),
      homepageNotice: cleanText(body.homepageNotice, 5000),
      notFoundText: cleanText(body.notFoundText, 500) || '页面不存在或已移动',
      defaultLanguage: String(body.defaultLanguage || 'zh') === 'en' ? 'en' : 'zh',
      showQuota: asBoolean(body.showQuota, true),
      showExpiryReminder: asBoolean(body.showExpiryReminder, true),
    };
  }

  if (group === 'registration') {
    settings.registration = {
      ...settings.registration,
      enabled: asBoolean(body.enabled, true),
      autoActivate: asBoolean(body.autoActivate, true),
      blockTempEmail: asBoolean(body.blockTempEmail, false),
      maxAccountsPerIp: clamp(Number(body.maxAccountsPerIp || 0), 0, 10000),
      ipRegisterCooldownMinutes: clamp(Number(body.ipRegisterCooldownMinutes || 0), 0, 10080),
      turnstileRegisterEnabled: asBoolean(body.turnstileRegisterEnabled, false),
      defaultStatus: String(body.defaultStatus || 'auto') === 'manual' ? 'manual' : 'auto',
      disabledMessage: cleanText(body.disabledMessage, 500) || '当前暂未开放用户注册',
      turnstileSiteKey: cleanText(body.turnstileSiteKey, 300),
      turnstileSecret: cleanText(body.turnstileSecret, 500),
      emailDomainBlacklist: cleanText(body.emailDomainBlacklist, 10000),
      emailVerificationEnabled: asBoolean(body.emailVerificationEnabled, false),
      dailyDomainApplyLimit: clamp(Number(body.dailyDomainApplyLimit || 0), 0, 10000),
      failedRegisterBanThreshold: clamp(Number(body.failedRegisterBanThreshold || 0), 0, 1000),
      failedRegisterBanMinutes: clamp(Number(body.failedRegisterBanMinutes || 0), 0, 10080),
      blockVpnProxy: asBoolean(body.blockVpnProxy, false),
      requireRegistrationKey: asBoolean(body.requireRegistrationKey, false),
    };
  }

  if (group === 'domain') {
    settings.domain = {
      ...settings.domain,
      defaultQuota: clamp(Number(body.defaultQuota || 3), 0, 999999),
      validDays: clamp(Number(body.validDays || 365), 1, 3650),
      renewWindowDays: clamp(Number(body.renewWindowDays || 60), 1, 3650),
      allowUserDeleteInvalid: asBoolean(body.allowUserDeleteInvalid, true),
      allowDnsEditAfterApproved: asBoolean(body.allowDnsEditAfterApproved, true),
      prefixMinLength: clamp(Number(body.prefixMinLength || 2), 1, 63),
      prefixMaxLength: clamp(Number(body.prefixMaxLength || 36), 1, 63),
      prefixBlacklistText: cleanText(body.prefixBlacklistText, 10000),
      allowNumericPrefix: asBoolean(body.allowNumericPrefix, true),
      allowUnderscorePrefix: asBoolean(body.allowUnderscorePrefix, false),
      selfRenewEnabled: asBoolean(body.selfRenewEnabled, true),
      expiryReminderDays: clamp(Number(body.expiryReminderDays || 30), 0, 3650),
      expiredDnsCleanupDays: clamp(Number(body.expiredDnsCleanupDays || 30), 0, 3650),
      allowUserDeleteActive: asBoolean(body.allowUserDeleteActive, true),
      allowDomainTransfer: asBoolean(body.allowDomainTransfer, false),
      maxDnsRecordsPerDomain: clamp(Number(body.maxDnsRecordsPerDomain || 20), 1, 1000),
      approvalMode: ['auto','manual','risk'].includes(String(body.approvalMode || 'manual')) ? String(body.approvalMode || 'manual') as any : 'manual',
      platformMaxDomains: clamp(Number(body.platformMaxDomains || 9999), 1, 9999999),
      normalUserQuota: clamp(Number(body.normalUserQuota || body.defaultQuota || 3), 0, 999999),
      normalUserValidDays: clamp(Number(body.normalUserValidDays || body.validDays || 365), 1, 3650),
      whitelistUserQuota: clamp(Number(body.whitelistUserQuota || body.defaultQuota || 10), 0, 999999),
      whitelistUserValidDays: clamp(Number(body.whitelistUserValidDays || body.validDays || 365), 1, 3650),
      lockAfterExpireDays: clamp(Number(body.lockAfterExpireDays || 0), 0, 3650),
      hardDeleteAfterExpireDays: clamp(Number(body.hardDeleteAfterExpireDays || 30), 0, 3650),
      blockedPrefixText: cleanText(body.blockedPrefixText, 10000),
      adminOnlyPrefixText: cleanText(body.adminOnlyPrefixText, 10000),
    };
    if ((settings.domain.prefixMinLength || 2) > (settings.domain.prefixMaxLength || 36)) {
      const min = settings.domain.prefixMinLength || 2;
      settings.domain.prefixMinLength = settings.domain.prefixMaxLength || 36;
      settings.domain.prefixMaxLength = min;
    }
  }

  if (group === 'dns') {
    const suffixesInput = Array.isArray((body as any).suffixes) ? (body as any).suffixes : parseJsonArray(body.suffixesJson);
    settings.dns = {
      ...settings.dns,
      defaultProxied: asBoolean(body.defaultProxied, settings.dns.defaultProxied ?? false),
      allowMxRecords: asBoolean(body.allowMxRecords, settings.dns.allowMxRecords ?? true),
      cfApiToken: asBoolean((body as any).clearCfApiToken, false) ? '' : (cleanText((body as any).cfApiToken, 2000) || settings.dns.cfApiToken || ''),
      reservedPrefixes: sanitizeStringList(body.reservedPrefixes || settings.dns.reservedPrefixes.join('\n')).slice(0, 500),
      suffixes: sanitizeDnsSuffixes(suffixesInput, settings.dns.suffixes),
    };
  }

  if (group === 'blacklist') {
    settings.blacklist = {
      prefixes: sanitizeStringList(body.prefixes).slice(0, 2000),
      ips: sanitizeStringList(body.ips).slice(0, 2000),
      emails: sanitizeStringList(body.emails).slice(0, 2000),
      registration: sanitizeBlacklistRecords((body as any).registration),
      access: sanitizeBlacklistRecords((body as any).access),
      userIds: sanitizeBlacklistRecords((body as any).userIds),
    };
  }

  if (group === 'notification') {
    settings.notification = {
      events: sanitizeNotificationEvents((body as any).events),
      expiryTemplate: cleanText(body.expiryTemplate, 5000) || '您的域名即将到期，请及时续期。',
      templates: sanitizeTemplateMap((body as any).templates),
      userTargets: sanitizeTemplateMap((body as any).userTargets),
      adminTargets: sanitizeTemplateMap((body as any).adminTargets),
      rateLimitPerHour: clamp(Number(body.rateLimitPerHour || 60), 0, 10000),
    };
  }

  if (group === 'security') {
    settings.security = {
      adminSessionTimeoutHours: clamp(Number(body.adminSessionTimeoutHours || 24), 1, 24 * 365),
      adminIpWhitelist: cleanText(body.adminIpWhitelist, 10000),
      auditRetentionDays: clamp(Number(body.auditRetentionDays || 4), 1, 3650),
      failedLoginLockThreshold: clamp(Number(body.failedLoginLockThreshold || 0), 0, 1000),
      failedLoginLockMinutes: clamp(Number(body.failedLoginLockMinutes || 0), 0, 10080),
      adminPath: cleanText(body.adminPath, 120),
      rolesPermissions: cleanText(body.rolesPermissions, 20000),
      auditRecordItems: cleanText(body.auditRecordItems, 10000),
    };
  }

  if (group === 'automation') {
    settings.automation = {
      enabled: asBoolean(body.enabled, false),
      scanCycleMinutes: clamp(Number(body.scanCycleMinutes || 60), 5, 1440),
      checkExpiringDomains: asBoolean(body.checkExpiringDomains, true),
      cleanupExpiredDns: asBoolean(body.cleanupExpiredDns, true),
      cronExpression: cleanText(body.cronExpression, 120),
      notifyAdminOnFailure: asBoolean(body.notifyAdminOnFailure, true),
      dnsCleanupProtectionDays: clamp(Number(body.dnsCleanupProtectionDays || 7), 1, 3650),
      taskLogs: Array.isArray((body as any).taskLogs) ? (body as any).taskLogs.slice(0, 50) : (settings.automation?.taskLogs || []),
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

  const site = { ...defaults.site, ...(saved.site || {}) };
  const registration = { ...defaults.registration, ...(saved.registration || {}) };
  const domain = { ...defaults.domain, ...(saved.domain || {}) };
  const dnsSaved = (saved as any).dns || {};
  const dns = {
    ...defaults.dns,
    ...dnsSaved,
    reservedPrefixes: sanitizeStringList(dnsSaved.reservedPrefixes || defaults.dns.reservedPrefixes).slice(0, 500),
    suffixes: sanitizeDnsSuffixes(dnsSaved.suffixes, defaults.dns.suffixes),
  };

  return {
    site,
    registration,
    domain,
    help: { categories: Array.isArray((saved as any).help?.categories) ? sanitizeHelpCategories((saved as any).help.categories) : defaults.help.categories },
    dns,
    blacklist: {
      prefixes: sanitizeStringList((saved as any).blacklist?.prefixes),
      ips: sanitizeStringList((saved as any).blacklist?.ips),
      emails: sanitizeStringList((saved as any).blacklist?.emails),
      registration: sanitizeBlacklistRecords((saved as any).blacklist?.registration),
      access: sanitizeBlacklistRecords((saved as any).blacklist?.access),
      userIds: sanitizeBlacklistRecords((saved as any).blacklist?.userIds),
    },
    notification: {
      events: sanitizeNotificationEvents((saved as any).notification?.events),
      expiryTemplate: cleanText((saved as any).notification?.expiryTemplate, 5000) || defaults.notification!.expiryTemplate,
      templates: sanitizeTemplateMap((saved as any).notification?.templates || defaults.notification?.templates),
      userTargets: sanitizeTemplateMap((saved as any).notification?.userTargets || defaults.notification?.userTargets),
      adminTargets: sanitizeTemplateMap((saved as any).notification?.adminTargets || defaults.notification?.adminTargets),
      rateLimitPerHour: clamp(Number((saved as any).notification?.rateLimitPerHour || defaults.notification?.rateLimitPerHour || 60), 0, 10000),
    },
    security: {
      ...defaults.security!,
      ...((saved as any).security || {}),
      auditRetentionDays: clamp(Number((saved as any).security?.auditRetentionDays || defaults.security!.auditRetentionDays), 1, 3650),
      failedLoginLockThreshold: clamp(Number((saved as any).security?.failedLoginLockThreshold || 0), 0, 1000),
      failedLoginLockMinutes: clamp(Number((saved as any).security?.failedLoginLockMinutes || 0), 0, 10080),
      adminPath: cleanText((saved as any).security?.adminPath, 120),
      rolesPermissions: cleanText((saved as any).security?.rolesPermissions, 20000),
      auditRecordItems: cleanText((saved as any).security?.auditRecordItems, 10000),
    },
    automation: {
      ...defaults.automation!,
      ...((saved as any).automation || {}),
      scanCycleMinutes: clamp(Number((saved as any).automation?.scanCycleMinutes || defaults.automation!.scanCycleMinutes), 5, 1440),
      dnsCleanupProtectionDays: clamp(Number((saved as any).automation?.dnsCleanupProtectionDays || defaults.automation?.dnsCleanupProtectionDays || 7), 1, 3650),
    },
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
      copyright: '',
      faviconUrl: '',
      headerThirdPartyJs: '',
      maintenanceMode: false,
      maintenanceMessage: '系统维护中，请稍后再试。',
      themeMode: 'light',
      noticeStartAt: '',
      noticeEndAt: '',
      accent: '#4f63f6',
      accent2: '#7c4dff',
      logoText: 'free',
      logoImageUrl: '',
      icp: '',
      homepageNotice: '',
      notFoundText: '页面不存在或已移动',
      defaultLanguage: 'zh',
      showQuota: true,
      showExpiryReminder: true,
    },
    registration: {
      enabled: true,
      autoActivate: true,
      blockTempEmail: false,
      maxAccountsPerIp: 0,
      ipRegisterCooldownMinutes: 0,
      turnstileRegisterEnabled: false,
      defaultStatus: 'auto',
      disabledMessage: '当前暂未开放用户注册',
      turnstileSiteKey: '',
      turnstileSecret: '',
      emailDomainBlacklist: '',
      emailVerificationEnabled: false,
      dailyDomainApplyLimit: 0,
      failedRegisterBanThreshold: 0,
      failedRegisterBanMinutes: 0,
      blockVpnProxy: false,
      requireRegistrationKey: false,
    },
    domain: {
      defaultQuota: 3,
      validDays: 365,
      renewWindowDays: 60,
      allowUserDeleteInvalid: true,
      allowDnsEditAfterApproved: true,
      prefixMinLength: 2,
      prefixMaxLength: 36,
      prefixBlacklistText: reserved.join('\n'),
      allowNumericPrefix: true,
      allowUnderscorePrefix: false,
      selfRenewEnabled: true,
      expiryReminderDays: 30,
      expiredDnsCleanupDays: 30,
      allowUserDeleteActive: true,
      allowDomainTransfer: false,
      maxDnsRecordsPerDomain: 20,
      approvalMode: 'manual',
      platformMaxDomains: 9999,
      normalUserQuota: 3,
      normalUserValidDays: 365,
      whitelistUserQuota: 10,
      whitelistUserValidDays: 365,
      lockAfterExpireDays: 0,
      hardDeleteAfterExpireDays: 30,
      blockedPrefixText: reserved.join('\n'),
      adminOnlyPrefixText: 'admin\nroot\nsystem',
    },
    help: defaultHelpSettings(),
    dns: {
      envManaged: true,
      reservedPrefixes: reserved,
      defaultProxied: isEnabled(env.DNS_PROXIED, false),
      allowMxRecords: true,
      cfApiToken: '',
      blockWildcardRecords: true,
      cnameTargetBlacklist: '',
      suffixes: [{
        label: env.DNS_SUFFIX_LABEL || '免费二级域名',
        suffix,
        suffixAscii: suffix,
        zoneId: env.DNS_ZONE_ID || '',
        allowedTypes: allowedTypes.length ? allowedTypes : ['CNAME'],
        defaultType: (['CNAME','A','AAAA','TXT','MX'].includes(String(env.DNS_DEFAULT_TYPE || '').toUpperCase())
          ? String(env.DNS_DEFAULT_TYPE).toUpperCase()
          : 'CNAME') as DnsRecordType,
        ttl: clamp(Number(env.DNS_TTL || 1), 1, 86400),
        proxied: isEnabled(env.DNS_PROXIED, false),
        enabled: true,
      }],
    },
    blacklist: { prefixes: [], ips: [], emails: [], registration: [], access: [], userIds: [] },
    notification: {
      events: {
        newUser: true,
        newDomain: true,
        domainExpiring: true,
        domainExpiredDelete: true,
        abnormalRegister: true,
      },
      expiryTemplate: '您的域名即将到期，请及时续期。',
      templates: {
        newUser: '新账号 {username} 已注册。',
        newDomain: '用户 {username} 提交了域名 {domain} 申请。',
        domainExpiring: '您的域名 {domain} 将在 {days} 天后到期，请及时续期。',
        domainExpiredDelete: '域名 {domain} 已过期并进入清理流程。',
        abnormalRegister: '检测到异常注册行为：{ip}。',
      },
      userTargets: {},
      adminTargets: {},
      rateLimitPerHour: 60,
    },
    security: {
      adminSessionTimeoutHours: 24,
      adminIpWhitelist: '',
      auditRetentionDays: 4,
      failedLoginLockThreshold: 0,
      failedLoginLockMinutes: 0,
      adminPath: '',
      rolesPermissions: 'super_admin: 全部权限\noperator: 审核域名、查看用户、发送通知',
      auditRecordItems: '登录,注册,域名申请,DNS新增,DNS修改,DNS删除,消息发送,设置保存,黑名单操作',
    },
    automation: {
      enabled: false,
      scanCycleMinutes: 60,
      checkExpiringDomains: true,
      cleanupExpiredDns: true,
      cronExpression: '0 */1 * * *',
      notifyAdminOnFailure: true,
      dnsCleanupProtectionDays: 7,
      taskLogs: [],
    },
  };
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const raw = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function sanitizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return Array.from(new Set(value.map(x => String(x || '').trim()).filter(Boolean)));
  return Array.from(new Set(String(value || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean)));
}


function sanitizeTemplateMap(value: unknown): Record<string, string> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const cleanKey = cleanText(key, 80);
    if (cleanKey) out[cleanKey] = cleanText(val, 5000);
  }
  return out;
}

function sanitizeBlacklistRecords(value: unknown): unknown[] {
  const raw = Array.isArray(value) ? value : [];
  return raw.slice(0, 5000).map((item: any) => ({
    value: cleanText(item?.value, 500),
    note: cleanText(item?.note, 500),
    expiresAt: cleanText(item?.expiresAt, 80),
  })).filter((item: any) => item.value);
}

function sanitizeDnsSuffixes(value: unknown, fallback: AppSettings['dns']['suffixes']): AppSettings['dns']['suffixes'] {
  const raw = Array.isArray(value) ? value : [];
  const items = raw.map((x: any, index: number) => {
    try {
      const suffix = normalizeSuffix(String(x?.suffix || ''));
      const allowedTypes = Array.from(new Set((Array.isArray(x?.allowedTypes) ? x.allowedTypes : String(x?.allowedTypes || 'A,AAAA,CNAME,TXT,MX').split(','))
        .map((t: any) => String(t).trim().toUpperCase())
        .filter((t: string) => ['A','AAAA','CNAME','TXT','MX'].includes(t))));
      const defaultTypeRaw = String(x?.defaultType || allowedTypes[0] || 'CNAME').toUpperCase();
      const defaultType = (allowedTypes.includes(defaultTypeRaw) ? defaultTypeRaw : (allowedTypes[0] || 'CNAME')) as DnsRecordType;
      return {
        label: cleanText(x?.label, 80) || suffix,
        suffix,
        suffixAscii: suffix,
        zoneId: cleanText(x?.zoneId, 120),
        allowedTypes: allowedTypes.length ? allowedTypes : ['CNAME'],
        defaultType,
        ttl: clamp(Number(x?.ttl || 1), 1, 86400),
        proxied: asBoolean(x?.proxied, false),
        enabled: asBoolean(x?.enabled, true),
      };
    } catch { return null; }
  }).filter(Boolean) as AppSettings['dns']['suffixes'];
  const seen = new Set<string>();
  const deduped = items.filter(item => {
    const key = item.suffixAscii || item.suffix;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.length ? deduped : fallback;
}

function sanitizeNotificationEvents(value: unknown): Record<string, boolean> {
  const raw: any = value && typeof value === 'object' ? value : {};
  return {
    newUser: asBoolean(raw.newUser, true),
    newDomain: asBoolean(raw.newDomain, true),
    domainExpiring: asBoolean(raw.domainExpiring, true),
    domainExpiredDelete: asBoolean(raw.domainExpiredDelete, true),
    abnormalRegister: asBoolean(raw.abnormalRegister, true),
  };
}

function listMatches(value: string, list: string[] = []): boolean {
  const target = String(value || '').toLowerCase();
  return list.some(raw => {
    const item = String(raw || '').trim().toLowerCase();
    if (!item) return false;
    if (item.includes('*')) {
      const re = new RegExp('^' + item.split('*').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      return re.test(target);
    }
    return target === item || target.includes(item);
  });
}

function prefixMatchesRule(prefix: string, rules: string[] = []): boolean {
  return rules.some(raw => {
    const item = String(raw || '').trim();
    if (!item) return false;
    try { return new RegExp(item, 'i').test(prefix); } catch { return prefix.toLowerCase().includes(item.toLowerCase()); }
  });
}

function isTempEmailDomain(email: string): boolean {
  const domain = String(email || '').split('@')[1]?.toLowerCase() || '';
  if (!domain) return false;
  const tempDomains = ['mailinator.com','10minutemail.com','guerrillamail.com','tempmail.com','temp-mail.org','yopmail.com','dispostable.com','trashmail.com','sharklasers.com','getnada.com'];
  return tempDomains.includes(domain);
}


function serializeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
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
  const extra = app as ApplicationRow & Record<string, unknown>;
  const dnsCount = Math.max(0, Number(extra.dns_count || 0));
  const primaryRecordType = String(extra.primary_record_type || app.record_type || '').trim();
  const primaryRecordContent = String(extra.primary_record_content || app.record_content || '').trim();
  const primaryDnsRecordId = String(extra.primary_dns_record_id || app.dns_record_id || '').trim();
  const rawDnsSummary = String(extra.dns_summary || '').trim();
  const dnsSummary = dnsCount > 0
    ? (rawDnsSummary || `${primaryRecordType} → ${primaryRecordContent}`)
    : '';

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
    recordType: primaryRecordType || 'CNAME',
    recordContent: primaryRecordContent,
    proxied: Boolean(app.proxied),
    ttl: Number(app.ttl || 1),
    status: app.status,
    statusText: disabledByAdmin ? '已禁用' : (deleteRequested && app.status === 'approved' ? '待删除审核' : statusLabel(app.status)),
    reviewNote: '',
    errorMessage: app.error_message || '',
    dnsRecordId: primaryDnsRecordId,
    dnsConfigured: dnsCount > 0 || Boolean(primaryRecordContent),
    dnsCount,
    dnsSummary,
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

function cloudflareErrorText(data: any): string {
  try { return JSON.stringify(data?.errors || data || {}).toLowerCase(); }
  catch { return ''; }
}

function isCloudflareRecordMissing(status: number, data: any): boolean {
  const text = cloudflareErrorText(data);
  return status === 404
    || text.includes('record does not exist')
    || text.includes('dns record not found')
    || text.includes('not_found')
    || text.includes('not found')
    || text.includes('81044');
}

async function deleteDnsRecord(token: string, zoneId: string, recordId: string): Promise<void> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  if (!recordId) return;
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    // v56：Cloudflare 已经没有这条记录时，说明外部已经删除；这里视为删除成功，继续清 D1，避免卡死。
    if (isCloudflareRecordMissing(res.status, data)) return;
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 删除失败 HTTP ${res.status}`);
  }
}

async function listCloudflareDnsRecordsByName(token: string, zoneId: string, name: string): Promise<Array<{ id: string; name?: string; type?: string }>> {
  if (!zoneId || !name) return [];
  const url = new URL(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`);
  url.searchParams.set('name', name);
  url.searchParams.set('per_page', '100');
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    if (isCloudflareRecordMissing(res.status, data)) return [];
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 查询失败 HTTP ${res.status}`);
  }
  return Array.isArray(data.result) ? data.result : [];
}

async function deleteDnsRecordsByName(token: string, zoneId: string, name: string): Promise<void> {
  const records = await listCloudflareDnsRecordsByName(token, zoneId, name);
  for (const record of records) {
    if (record?.id) await deleteDnsRecord(token, zoneId, record.id);
  }
}

function resolveDnsToken(env: Env, settings?: AppSettings): string {
  // 优先使用 Cloudflare Worker Secret；没有 Secret 时，允许管理员在后台 DNS 配置中保存 token 到 Workers KV。
  return String(env.CF_API_TOKEN || settings?.dns?.cfApiToken || '').trim();
}

async function verifyTurnstile(env: Env, request: Request, token: unknown, expectedAction: string): Promise<void> {
  const settings = await loadSettings(env);
  const secret = String(env.TURNSTILE_SECRET || settings.registration.turnstileSecret || '').trim();
  if (!secret) throw new HttpError(503, 'TURNSTILE_SECRET_MISSING', 'Turnstile Secret 未配置');
  const value = String(token || '').trim();
  if (!value) throw new HttpError(400, 'TURNSTILE_REQUIRED', '请完成人机验证');

  const form = new FormData();
  form.append('secret', secret);
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

function turnstilePublicConfig(env: Env, settings?: AppSettings) {
  return {
    siteKey: env.TURNSTILE_SITE_KEY || settings?.registration?.turnstileSiteKey || '',
    enabledApply: isEnabled(env.TURNSTILE_ENABLE_APPLY, false),
    enabledLogin: isEnabled(env.TURNSTILE_ENABLE_LOGIN, false),
    enabledRegister: isEnabled(env.TURNSTILE_ENABLE_REGISTER, false),
    actionApply: env.TURNSTILE_ACTION_APPLY || 'domain_apply',
    actionLogin: env.TURNSTILE_ACTION_LOGIN || 'login',
    actionRegister: env.TURNSTILE_ACTION_REGISTER || 'register',
  };
}



async function adminSystemStatus(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const counts = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status!='deleted') AS users,
      (SELECT COUNT(*) FROM domain_applications) AS domains,
      (SELECT COUNT(*) FROM dns_records) AS dnsRecords,
      (SELECT COUNT(*) FROM audit_logs WHERE datetime(created_at) >= datetime('now','-4 days')) AS logs4d
  `).first<any>();
  return ok({
    version: 'v78',
    settingsKey: SETTINGS_KEY,
    kv: { storage: 'Workers KV', estimatedKeys: '由 Cloudflare 控制台查看实际占用' },
    cfApi: { configured: Boolean(resolveDnsToken(env, settings)), status: resolveDnsToken(env, settings) ? '已配置' : '未配置' },
    cron: { enabled: Boolean(settings.automation?.enabled), expression: settings.automation?.cronExpression || '' },
    counts,
    update: { current: 'v78', latest: '请以当前部署包为准' },
  });
}

async function adminExportSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  return ok({ exportedAt: new Date().toISOString(), version: 'v78', settings: await loadSettings(env) });
}

async function adminImportSettings(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 1024 * 1024);
  const incoming = (body as any).settings || body;
  const defaults = defaultSettings(env);
  const merged = {
    ...defaults,
    ...(incoming || {}),
    site: { ...defaults.site, ...((incoming as any)?.site || {}) },
    registration: { ...defaults.registration, ...((incoming as any)?.registration || {}) },
    domain: { ...defaults.domain, ...((incoming as any)?.domain || {}) },
    dns: { ...defaults.dns, ...((incoming as any)?.dns || {}) },
    blacklist: { ...defaults.blacklist, ...((incoming as any)?.blacklist || {}) },
    notification: { ...defaults.notification, ...((incoming as any)?.notification || {}) },
    security: { ...defaults.security, ...((incoming as any)?.security || {}) },
    automation: { ...defaults.automation, ...((incoming as any)?.automation || {}) },
  } as AppSettings;
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(merged));
  await audit(env, request, admin.id, 'admin.settings_import', 'setting', SETTINGS_KEY);
  return ok({ settings: await loadSettings(env) });
}

async function adminTestCloudflareApi(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const body = await readJson<Record<string, unknown>>(request, 64 * 1024).catch(() => ({}));
  const token = resolveDnsToken(env, settings);
  if (!token) throw new HttpError(400, 'CF_TOKEN_MISSING', '尚未配置 Cloudflare API Token：可放 Worker Secret，也可在“DNS 配置”中填写一次保存到 KV');
  const requestedZoneId = cleanText((body as any).zoneId, 120);
  const requestedSuffix = normalizeOptionalSuffix((body as any).suffix);
  const suffix = settings.dns.suffixes.find(x => requestedZoneId && x.zoneId === requestedZoneId)
    || settings.dns.suffixes.find(x => requestedSuffix && (x.suffix === requestedSuffix || x.suffixAscii === requestedSuffix))
    || settings.dns.suffixes.find(x => x.enabled && x.zoneId)
    || settings.dns.suffixes.find(x => x.zoneId);
  if (!suffix?.zoneId) throw new HttpError(400, 'ZONE_ID_MISSING', '没有可测试的 Zone ID；请在多根域名编辑器中填写该根域名的 Zone ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(suffix.zoneId)}`, {
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
  const data: any = await res.json().catch(() => ({}));
  await audit(env, request, admin.id, 'admin.cf_api_test', 'setting', 'dns', { ok: res.ok && data.success !== false, zoneId: suffix.zoneId, suffix: suffix.suffix });
  if (!res.ok || data.success === false) throw new HttpError(502, 'CF_API_TEST_FAILED', data.errors?.[0]?.message || `Cloudflare API 测试失败 HTTP ${res.status}`);
  return ok({ status: 'ok', message: `Cloudflare API 连通正常：${data.result?.name || suffix.suffix}`, zone: data.result?.name || suffix.suffix, zoneId: suffix.zoneId });
}

function stripClientHint(value: string | null): string {
  return String(value || '').replace(/^"|"$/g, '').trim();
}

function parseDeviceInfoFromRequest(request: Request): { name: string; type: string; model: string } {
  const ua = String(request.headers.get('user-agent') || '');
  const chPlatform = stripClientHint(request.headers.get('sec-ch-ua-platform'));
  const chModel = stripClientHint(request.headers.get('sec-ch-ua-model'));
  const chMobile = stripClientHint(request.headers.get('sec-ch-ua-mobile'));
  const chBrands = stripClientHint(request.headers.get('sec-ch-ua'));
  return parseDeviceInfo(ua, { platform: chPlatform, model: chModel, mobile: chMobile, brands: chBrands });
}

function parseDeviceInfo(userAgent: string, hints: { platform?: string; model?: string; mobile?: string; brands?: string } = {}): { name: string; type: string; model: string } {
  const ua = String(userAgent || '');
  const lower = ua.toLowerCase();
  const platform = String(hints.platform || '').replace(/^"|"$/g, '').trim();
  const hintModel = String(hints.model || '').replace(/^"|"$/g, '').trim();
  const hintBrands = String(hints.brands || '').replace(/"/g, '').trim();
  const isMobileHint = hints.mobile === '?1';

  let type = '电脑';
  if (/ipad|tablet|kindle|silk/.test(lower) || /ipad/i.test(platform)) type = '平板';
  else if (isMobileHint || /mobile|iphone|android|phone/.test(lower)) type = '手机';

  let os = platform || '未知系统';
  if (/windows nt 10/i.test(ua) || /windows/i.test(platform)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone/i.test(ua) || /ios/i.test(platform)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua) || /android/i.test(platform)) os = 'Android';
  else if (/mac os x/i.test(ua) || /macos/i.test(platform)) os = 'macOS';
  else if (/linux/i.test(ua) || /linux/i.test(platform)) os = 'Linux';

  let browser = '浏览器';
  if (/edg\//i.test(ua) || /Microsoft Edge|Edge/i.test(hintBrands)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';

  let model = hintModel;
  if (!model) {
    if (/iphone/i.test(os)) model = '苹果 iPhone（浏览器未提供具体型号）';
    else if (/ipad/i.test(os)) model = '苹果 iPad（浏览器未提供具体型号）';
    else if (/macos/i.test(os)) model = 'Apple Mac（浏览器未提供具体型号）';
    else if (/huawei|honor/i.test(ua)) model = '华为设备';
    else if (/android/i.test(os)) model = 'Android 设备（浏览器未提供具体型号）';
    else if (/windows/i.test(os)) model = 'Windows 电脑（浏览器未提供具体品牌型号）';
    else model = `${os} / ${browser}`;
  } else if (/huawei/i.test(model)) {
    model = `华为 ${model.replace(/^huawei\s*/i, '')}`.trim();
  } else if (/iphone/i.test(model)) {
    model = `苹果 ${model}`;
  }

  return { name: `${browser} · ${os}`, type, model };
}

async function getAuthUser(env: Env, request: Request): Promise<UserRow | null> {
  const sid = parseCookie(request.headers.get('cookie') || '').sid;
  if (!sid) return null;
  const tokenHash = await sha256(sid);
  const session = await env.DB.prepare(`
    SELECT * FROM sessions WHERE token_hash=? AND expires_at > datetime('now') LIMIT 1
  `).bind(tokenHash).first<{ id: string; user_id: string }>();
  if (!session) return null;
  try { await env.DB.prepare(`UPDATE sessions SET last_seen_at=? WHERE id=?`).bind(new Date().toISOString(), session.id).run(); } catch {}
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
  const settings = await loadSettings(env);
  let sessionHours = remember ? 30 * 24 : 24;
  try {
    const sessionUser = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(userId).first<{ role: string }>();
    if (sessionUser?.role === 'admin') sessionHours = settings.security?.adminSessionTimeoutHours || 24;
  } catch {}
  const expires = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();
  const ua = String(request.headers.get('user-agent') || '').slice(0, 300);
  const ip = clientIp(request);
  const device = parseDeviceInfoFromRequest(request);
  const nowIso = new Date().toISOString();

  const insertFull = () => env.DB.prepare(`
    INSERT INTO sessions (id,user_id,token_hash,ip,user_agent,device_name,device_type,device_model,first_seen_at,last_seen_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, userId, tokenHash, ip, ua, device.name, device.type, device.model, nowIso, nowIso, expires).run();

  try {
    await insertFull();
  } catch (firstError) {
    console.error('session insert failed, repairing sessions table', firstError);
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN ip TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN user_agent TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_name TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_type TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_model TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN first_seen_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN last_seen_at TEXT`).run(); } catch {}
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
          device_name TEXT,
          device_type TEXT,
          device_model TEXT,
          first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
      try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)').run(); } catch {}
      await insertFull();
    }
  }

  return cookieString('sid', token, {
    maxAge: sessionHours * 60 * 60,
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


function normalizeOptionalEmailStrict(raw: unknown): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const email = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', '邮箱格式不正确');
  }
  return email;
}

function normalizeOptionalPhone(raw: unknown): string | null {
  const value = String(raw || '').trim().replace(/\s+/g, '');
  if (!value) return null;
  if (value.length < 5 || value.length > 40 || !/^[0-9+()\-]+$/.test(value)) {
    throw new HttpError(400, 'INVALID_PHONE', '手机号格式不正确');
  }
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
  if (!/^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/.test(unicode) || unicode.length < 1 || unicode.length > 63) {
    throw new HttpError(400, 'INVALID_PREFIX', '域名前缀格式不正确，需以字母或数字开头结尾');
  }
  const ascii = unicode;
  return { unicode, ascii };
}

function normalizeSuffix(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^\.+/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) throw new HttpError(400, 'INVALID_SUFFIX', '根域名格式不正确');
  return value;
}

function normalizeOptionalSuffix(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!raw) return '';
  try { return normalizeSuffix(raw); } catch { return ''; }
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
