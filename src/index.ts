import type { Env } from './env';
import { audit } from './lib/audit';
import { createSession, destroySession, getAuthUser, parsePermissions, requireAdmin, requireUser } from './lib/auth';
import { createDnsRecord, deleteDnsRecord } from './lib/cloudflare';
import { hashPassword, randomToken, sha256, verifyPassword } from './lib/crypto';
import { assertSameOrigin, asBoolean, asInt, clientIp, HttpError, json, ok, readJson } from './lib/http';
import { rateLimit } from './lib/rate-limit';
import { ensureSchema } from './lib/schema';
import {
  adminSettingsView,
  loadSettings,
  publicConfig,
  resolveDnsToken,
  saveSettingGroup,
  type AppSettings,
} from './lib/settings';
import { verifyTurnstile } from './lib/turnstile';
import { cleanText, normalizeDnsTarget, normalizeEmail, normalizePrefix, normalizeRecordType, normalizeSuffix, normalizeUsername, validatePassword } from './lib/validation';

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  password_salt: string;
  role: 'admin' | 'user';
  status: 'active' | 'disabled' | 'deleted';
  permissions_json: string;
  created_at: string;
  last_login_at: string | null;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  username?: string;
  prefix_unicode: string;
  prefix_ascii: string;
  suffix_unicode: string;
  suffix_ascii: string;
  fqdn_unicode: string;
  fqdn_ascii: string;
  record_type: string;
  record_content: string;
  proxied: number;
  ttl: number;
  status: string;
  review_note: string | null;
  error_message: string | null;
  dns_record_id: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  renewed_at: string | null;
  renew_count?: number | null;
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
      return json({ ok: false, code: 'INTERNAL_ERROR', message: '服务器内部错误' }, 500);
    }
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  if (method === 'GET' && pathname === '/api/public/config') {
    const [config, row] = await Promise.all([
      publicConfig(env),
      env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'").first<{ count: number }>(),
    ]);
    return ok({ config: { ...config, needsBootstrap: Number(row?.count || 0) === 0 } });
  }

  if (method === 'POST' && pathname === '/api/setup/bootstrap') return bootstrapAdmin(request, env);
  if (method === 'POST' && pathname === '/api/auth/login') return login(request, env);
  if (method === 'POST' && pathname === '/api/auth/register') return register(request, env);
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const user = await getAuthUser(env, request);
    const cookie = await destroySession(env, request);
    if (user) await audit(env, request, user.id, 'auth.logout', 'user', user.id);
    return withCookie(ok({ loggedOut: true }), cookie);
  }
  if (method === 'GET' && pathname === '/api/auth/me') {
    const user = await getAuthUser(env, request);
    return ok({ user });
  }
  if (method === 'POST' && pathname === '/api/auth/change-password') return changeOwnPassword(request, env);

  if (method === 'GET' && pathname === '/api/applications') return listOwnApplications(request, env);
  if (method === 'POST' && pathname === '/api/applications') return createApplication(request, env);
  if (method === 'POST' && pathname === '/api/applications/renew') return renewApplication(request, env);

  let userMatch = pathname.match(/^\/api\/applications\/([^/]+)\/dns$/);
  if (userMatch && method === 'PATCH') return updateApplicationDns(request, env, decodeURIComponent(userMatch[1]));

  if (method === 'GET' && pathname === '/api/admin/overview') return adminOverview(request, env);
  if (method === 'GET' && pathname === '/api/admin/applications') return adminApplications(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/users') return adminUsers(request, env);
  if (method === 'POST' && pathname === '/api/admin/users') return adminCreateUser(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings') {
    await requireAdmin(env, request);
    return ok({ settings: await adminSettingsView(env) });
  }
  if (method === 'GET' && pathname === '/api/admin/registration-keys') return listRegistrationKeys(request, env);
  if (method === 'POST' && pathname === '/api/admin/registration-keys') return createRegistrationKey(request, env);
  if (method === 'GET' && pathname === '/api/admin/analytics') return analytics(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/audit') return auditLogs(request, env, url);

  let match = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/(approve|reject|revoke)$/);
  if (method === 'POST' && match) return reviewApplication(request, env, decodeURIComponent(match[1]), match[2]);

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateUser(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return adminDeleteUser(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
  if (match && method === 'POST') return adminResetPassword(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/settings\/(site|announcement|popup|registration|turnstile|dns)$/);
  if (match && method === 'PUT') return updateSetting(request, env, match[1] as keyof AppSettings);

  match = pathname.match(/^\/api\/admin\/registration-keys\/([^/]+)$/);
  if (match && method === 'DELETE') return disableRegistrationKey(request, env, decodeURIComponent(match[1]));

  throw new HttpError(404, 'NOT_FOUND', '接口不存在');
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.set('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function bootstrapAdmin(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'bootstrap', 5, 900);
  const body = await readJson<Record<string, unknown>>(request);
  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'").first<{ count: number }>();
  if (Number(existing?.count || 0) > 0) throw new HttpError(409, 'ALREADY_BOOTSTRAPPED', '管理员已初始化');
  if (!env.BOOTSTRAP_ADMIN_TOKEN || String(body.setupToken || '') !== env.BOOTSTRAP_ADMIN_TOKEN) {
    throw new HttpError(403, 'INVALID_SETUP_TOKEN', '初始化令牌不正确');
  }
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const permissions = { canApply: true, maxPending: 100, maxTotal: 1000, allowedSuffixes: [] };
  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status,
      permissions_json) VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?)
  `).bind(id, username, email, hash, salt, JSON.stringify(permissions)).run();
  await audit(env, request, id, 'setup.bootstrap_admin', 'user', id);
  const cookie = await createSession(env, request, id, false);
  return withCookie(ok({ user: { id, username, email, role: 'admin', status: 'active', permissions, createdAt: new Date().toISOString(), lastLoginAt: null } }), cookie);
}

async function login(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'login', 10, 600);
  const body = await readJson<Record<string, unknown>>(request);
  const identity = String(body.identity || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!identity || !password) throw new HttpError(400, 'MISSING_CREDENTIALS', '请输入用户名/邮箱和密码');
  const settings = await loadSettings(env);
  if (settings.turnstile.enabledLogin) {
    await verifyTurnstile(env, request, settings, body.turnstileToken, settings.turnstile.actionLogin);
  }
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) LIMIT 1
  `).bind(identity, identity).first<UserRow>();
  if (!user || !(await verifyPassword(password, user.password_hash, user.password_salt))) {
    await audit(env, request, user?.id || null, 'auth.login_failed', 'user', user?.id, { identity });
    throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户已被禁用');
  await env.DB.prepare("UPDATE users SET last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?").bind(user.id).run();
  const cookie = await createSession(env, request, user.id, asBoolean(body.remember, false));
  await audit(env, request, user.id, 'auth.login', 'user', user.id);
  return withCookie(ok({ user: serializeUser(user) }), cookie);
}

async function register(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'register', 5, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const adminCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status='active'").first<{ count: number }>();
  if (Number(adminCount?.count || 0) < 1) throw new HttpError(503, 'SETUP_REQUIRED', '系统尚未完成管理员初始化');
  if (!settings.registration.enabled) throw new HttpError(403, 'REGISTRATION_CLOSED', '当前已关闭用户注册');
  if (settings.turnstile.enabledRegister) {
    await verifyTurnstile(env, request, settings, body.turnstileToken, settings.turnstile.actionRegister);
  }
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE OR (? IS NOT NULL AND email=? COLLATE NOCASE) LIMIT 1')
    .bind(username, email, email).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '用户名或邮箱已被使用');

  if (settings.registration.requireKey) {
    const rawKey = String(body.registrationKey || '').trim();
    if (!rawKey) throw new HttpError(400, 'REGISTRATION_KEY_REQUIRED', '请输入注册密钥');
    const keyHash = await sha256(rawKey);
    const key = await env.DB.prepare(`
      SELECT id FROM registration_keys
      WHERE key_hash=? AND active=1
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        AND (max_uses=0 OR used_count < max_uses)
    `).bind(keyHash).first<{ id: string }>();
    if (!key) throw new HttpError(403, 'INVALID_REGISTRATION_KEY', '注册密钥无效、已过期或次数已用完');
    await env.DB.prepare('UPDATE registration_keys SET used_count=used_count+1 WHERE id=?').bind(key.id).run();
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const status = settings.registration.autoActivate ? 'active' : 'disabled';
  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status)
    VALUES (?, ?, ?, ?, ?, 'user', ?)
  `).bind(id, username, email, hash, salt, status).run();
  await audit(env, request, id, 'auth.register', 'user', id, { status });
  if (status !== 'active') return ok({ pendingActivation: true });
  const permissions = { canApply: true, maxPending: 3, maxTotal: 20, allowedSuffixes: [] };
  const cookie = await createSession(env, request, id, false);
  return withCookie(ok({ user: { id, username, email, role: 'user', status, permissions, createdAt: new Date().toISOString(), lastLoginAt: null } }), cookie);
}

async function changeOwnPassword(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = validatePassword(body.newPassword);
  const row = await env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id=?').bind(user.id)
    .first<{ password_hash: string; password_salt: string }>();
  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }
  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash=?, password_salt=?, updated_at=datetime('now') WHERE id=?").bind(hash, salt, user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
  ]);
  await audit(env, request, user.id, 'auth.password_changed', 'user', user.id);
  return withCookie(ok({ changed: true }), await destroySession(env, request));
}

async function listOwnApplications(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const [rows, quota] = await Promise.all([
    env.DB.prepare(`
      SELECT * FROM domain_applications WHERE user_id=? ORDER BY created_at DESC LIMIT 200
    `).bind(user.id).all<ApplicationRow>(),
    getUserQuota(env, user.id),
  ]);
  const applications = (rows.results || []).map(serializeApplication);
  const used = applications.filter(app => !['rejected', 'revoked'].includes(app.status)).length;
  return ok({
    applications,
    quota: {
      used,
      total: quota,
      remaining: Math.max(0, quota - used),
    },
  });
}

async function createApplication(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await rateLimit(env, request, `apply:${user.id}`, 10, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  if (settings.turnstile.enabledApply) {
    await verifyTurnstile(env, request, settings, body.turnstileToken, settings.turnstile.actionApply);
  }
  if (user.role !== 'admin' && !user.permissions.canApply) throw new HttpError(403, 'APPLY_NOT_ALLOWED', '您的账户没有域名申请权限');
  const prefix = normalizePrefix(body.prefix);
  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(x => x.enabled && (x.suffixAscii === suffixInput.ascii || x.suffix === suffixInput.unicode));
  if (!suffix) throw new HttpError(400, 'SUFFIX_NOT_ALLOWED', '该域名后缀不可申请');
  if (user.role !== 'admin' && user.permissions.allowedSuffixes.length && !user.permissions.allowedSuffixes.includes(suffix.suffix)) {
    throw new HttpError(403, 'SUFFIX_NOT_PERMITTED', '您的账户没有该后缀的申请权限');
  }
  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii)) throw new HttpError(409, 'RESERVED_PREFIX', '该前缀为系统保留词');

  const counts = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN status IN ('pending','processing') THEN 1 ELSE 0 END) AS pending_count,
      SUM(CASE WHEN status NOT IN ('rejected','revoked') THEN 1 ELSE 0 END) AS total_count
    FROM domain_applications WHERE user_id=?
  `).bind(user.id).first<{ pending_count: number | null; total_count: number | null }>();
  const quota = await getUserQuota(env, user.id);
  if (user.role !== 'admin' && Number(counts?.pending_count || 0) >= user.permissions.maxPending) {
    throw new HttpError(403, 'PENDING_LIMIT', '待审核申请数量已达到上限');
  }
  if (user.role !== 'admin' && Number(counts?.total_count || 0) >= Math.min(user.permissions.maxTotal, quota)) {
    throw new HttpError(403, 'TOTAL_LIMIT', '域名注册额度已用完');
  }

  const fqdnUnicode = `${prefix.unicode}.${suffix.suffix}`;
  const fqdnAscii = `${prefix.ascii}.${suffix.suffixAscii}`;
  // 用户申请页不再填写 DNS 记录类型和目标地址；
  // 先使用后缀默认类型，并把目标地址留空，后续在“域名管理”中配置。
  const recordType = normalizeRecordType(suffix.defaultType, suffix.allowedTypes);
  const recordContent = '';
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO domain_applications (
        id,user_id,prefix_unicode,prefix_ascii,suffix_unicode,suffix_ascii,fqdn_unicode,fqdn_ascii,
        record_type,record_content,proxied,ttl,status,expires_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending', ?)
    `).bind(
      id, user.id, prefix.unicode, prefix.ascii, suffix.suffix, suffix.suffixAscii,
      fqdnUnicode, fqdnAscii, recordType, recordContent, suffix.proxied ? 1 : 0, suffix.ttl, expiresAt,
    ).run();
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) throw new HttpError(409, 'DOMAIN_ALREADY_APPLIED', '该域名已有待审或生效申请');
    throw error;
  }
  await audit(env, request, user.id, 'application.create', 'domain_application', id, { fqdnUnicode, fqdnAscii, recordType, recordContent });
  return ok({ application: { id, fqdnUnicode, fqdnAscii, status: 'pending' } });
}


async function updateApplicationDns(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const app = await env.DB.prepare('SELECT * FROM domain_applications WHERE id=? AND user_id=?')
    .bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'APPLICATION_NOT_FOUND', '域名不存在');
  if (!['pending'].includes(app.status)) {
    throw new HttpError(409, 'INVALID_APPLICATION_STATE', '只有待审核域名可以修改 DNS 配置');
  }
  const settings = await loadSettings(env);
  const suffix = settings.dns.suffixes.find(x => x.enabled && x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_CONFIG_MISSING', '该域名后缀配置已不存在');
  const recordType = normalizeRecordType(body.recordType || suffix.defaultType, suffix.allowedTypes);
  const recordContent = normalizeDnsTarget(recordType, body.target, app.fqdn_ascii);
  await env.DB.prepare(`
    UPDATE domain_applications
    SET record_type=?,record_content=?,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(recordType, recordContent, id, user.id).run();
  await audit(env, request, user.id, 'application.dns_update', 'domain_application', id, { recordType, recordContent });
  return ok({ updated: true, recordType, recordContent });
}

async function renewApplication(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const id = String(body.id || '').trim();
  if (!id) throw new HttpError(400, 'MISSING_ID', '缺少域名 ID');
  const app = await env.DB.prepare('SELECT * FROM domain_applications WHERE id=? AND user_id=?')
    .bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'APPLICATION_NOT_FOUND', '域名不存在');
  if (app.status !== 'approved') throw new HttpError(409, 'INVALID_APPLICATION_STATE', '只有正常状态的域名可以续期');
  if (!app.expires_at) throw new HttpError(400, 'EXPIRY_MISSING', '该域名缺少到期时间，无法续期');

  const expiresAtMs = new Date(app.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) throw new HttpError(400, 'INVALID_EXPIRY', '该域名到期时间无效');
  const remainingMs = expiresAtMs - Date.now();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  if (remainingMs > sixtyDaysMs) throw new HttpError(403, 'RENEW_TOO_EARLY', '仅剩余60天内可以申请续期');

  const base = Math.max(expiresAtMs, Date.now());
  const newExpiresAt = new Date(base + 365 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(`
    UPDATE domain_applications
    SET expires_at=?,renewed_at=datetime('now'),renew_count=COALESCE(renew_count,0)+1,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(newExpiresAt, id, user.id).run();
  await audit(env, request, user.id, 'application.renew', 'domain_application', id, { expiresAt: newExpiresAt });
  return ok({ renewed: true, expiresAt: newExpiresAt });
}

async function getUserQuota(env: Env, userId: string): Promise<number> {
  try {
    const row = await env.DB.prepare('SELECT COALESCE(domain_quota,3) AS domain_quota FROM users WHERE id=?')
      .bind(userId).first<{ domain_quota: number }>();
    const quota = Number(row?.domain_quota || 3);
    return Number.isFinite(quota) && quota >= 0 ? quota : 3;
  } catch {
    return 3;
  }
}

async function adminOverview(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const [users, apps, today, recent] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total, SUM(status='active') AS active FROM users WHERE status!='deleted'").first<Record<string, number>>(),
    env.DB.prepare(`SELECT COUNT(*) AS total,
      SUM(status='pending') AS pending, SUM(status='approved') AS approved,
      SUM(status='rejected') AS rejected FROM domain_applications`).first<Record<string, number>>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM domain_applications WHERE date(created_at)=date('now')").first<{ count: number }>(),
    env.DB.prepare(`SELECT a.id,a.fqdn_unicode,a.status,a.created_at,u.username
      FROM domain_applications a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 8`).all<Record<string, unknown>>(),
  ]);
  return ok({ overview: { users, applications: apps, today: Number(today?.count || 0), recent: recent.results || [] } });
}

async function adminApplications(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const status = String(url.searchParams.get('status') || 'all');
  const search = String(url.searchParams.get('q') || '').trim();
  const limit = asInt(url.searchParams.get('limit'), 100, 1, 500);
  const where: string[] = [];
  const binds: unknown[] = [];
  if (status !== 'all') { where.push('a.status=?'); binds.push(status); }
  if (search) { where.push('(a.fqdn_unicode LIKE ? OR a.fqdn_ascii LIKE ? OR u.username LIKE ?)'); binds.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const rows = await env.DB.prepare(`
    SELECT a.*,u.username FROM domain_applications a JOIN users u ON u.id=a.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'processing' THEN 1 ELSE 2 END, a.created_at DESC LIMIT ?
  `).bind(...binds, limit).all<ApplicationRow>();
  return ok({ applications: (rows.results || []).map(serializeApplication) });
}

async function reviewApplication(request: Request, env: Env, id: string, action: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const note = cleanText(body.note, 1000);
  const app = await env.DB.prepare('SELECT * FROM domain_applications WHERE id=?').bind(id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'APPLICATION_NOT_FOUND', '申请不存在');

  if (action === 'reject') {
    const result = await env.DB.prepare(`UPDATE domain_applications SET status='rejected',review_note=?,reviewed_at=datetime('now'),
      reviewed_by=?,updated_at=datetime('now') WHERE id=? AND status='pending'`).bind(note, admin.id, id).run();
    if (!result.meta.changes) throw new HttpError(409, 'INVALID_APPLICATION_STATE', '只有待审核申请可以拒绝');
    await audit(env, request, admin.id, 'application.reject', 'domain_application', id, { note });
    return ok({ status: 'rejected' });
  }

  const settings = await loadSettings(env);
  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_CONFIG_MISSING', '该申请对应的后缀配置已不存在');
  const token = await resolveDnsToken(env, settings);
  if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token');

  if (action === 'approve') {
    const lock = await env.DB.prepare(`UPDATE domain_applications SET status='processing',error_message=NULL,updated_at=datetime('now')
      WHERE id=? AND status='pending'`).bind(id).run();
    if (!lock.meta.changes) throw new HttpError(409, 'INVALID_APPLICATION_STATE', '只有待审核申请可以批准');
    try {
      if (!app.record_content || !String(app.record_content).trim()) {
        await env.DB.prepare(`UPDATE domain_applications SET status='pending',error_message=?,updated_at=datetime('now') WHERE id=?`)
          .bind('请先在域名管理中配置 DNS 目标地址', id).run();
        throw new HttpError(409, 'DNS_TARGET_REQUIRED', '请先在域名管理中配置 DNS 目标地址');
      }
      const record = await createDnsRecord(token, {
        zoneId: suffix.zoneId,
        type: app.record_type as 'A' | 'AAAA' | 'CNAME',
        target: app.record_content,
        proxied: Boolean(app.proxied),
        ttl: app.ttl,
      }, app.fqdn_ascii, app.id);
      await env.DB.prepare(`UPDATE domain_applications SET status='approved',dns_record_id=?,review_note=?,reviewed_at=datetime('now'),
        reviewed_by=?,updated_at=datetime('now') WHERE id=?`).bind(record.id, note, admin.id, id).run();
      await audit(env, request, admin.id, 'application.approve', 'domain_application', id, { fqdn: app.fqdn_ascii, recordId: record.id });
      return ok({ status: 'approved', dnsRecordId: record.id });
    } catch (error) {
      await env.DB.prepare(`UPDATE domain_applications SET status='pending',error_message=?,updated_at=datetime('now') WHERE id=?`)
        .bind(error instanceof Error ? error.message.slice(0, 1000) : 'DNS 创建失败', id).run();
      throw error;
    }
  }

  if (action === 'revoke') {
    const lock = await env.DB.prepare(`UPDATE domain_applications SET status='revoking',updated_at=datetime('now')
      WHERE id=? AND status='approved'`).bind(id).run();
    if (!lock.meta.changes) throw new HttpError(409, 'INVALID_APPLICATION_STATE', '只有已批准申请可以撤销');
    if (!app.dns_record_id) {
      await env.DB.prepare("UPDATE domain_applications SET status='approved',error_message='缺少 DNS 记录 ID' WHERE id=?").bind(id).run();
      throw new HttpError(409, 'DNS_RECORD_ID_MISSING', '申请缺少 DNS 记录 ID，需人工处理');
    }
    try {
      await deleteDnsRecord(token, suffix.zoneId, app.dns_record_id);
      await env.DB.prepare(`UPDATE domain_applications SET status='revoked',review_note=?,reviewed_at=datetime('now'),
        reviewed_by=?,updated_at=datetime('now') WHERE id=?`).bind(note, admin.id, id).run();
      await audit(env, request, admin.id, 'application.revoke', 'domain_application', id, { fqdn: app.fqdn_ascii });
      return ok({ status: 'revoked' });
    } catch (error) {
      await env.DB.prepare(`UPDATE domain_applications SET status='approved',error_message=?,updated_at=datetime('now') WHERE id=?`)
        .bind(error instanceof Error ? error.message.slice(0, 1000) : 'DNS 删除失败', id).run();
      throw error;
    }
  }

  throw new HttpError(400, 'INVALID_ACTION', '未知审核动作');
}

async function adminUsers(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const rows = await env.DB.prepare(`
    SELECT u.id,u.username,u.email,u.role,u.status,u.permissions_json,u.created_at,u.last_login_at,
      COUNT(a.id) AS application_count,
      SUM(CASE WHEN a.status='approved' THEN 1 ELSE 0 END) AS approved_count
    FROM users u LEFT JOIN domain_applications a ON a.user_id=u.id
    WHERE u.status!='deleted'
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500
  `).all<Record<string, unknown>>();
  return ok({ users: (rows.results || []).map(row => ({
    id: row.id, username: row.username, email: row.email, role: row.role, status: row.status,
    permissions: parsePermissions(String(row.permissions_json || '')),
    createdAt: row.created_at, lastLoginAt: row.last_login_at,
    applicationCount: Number(row.application_count || 0), approvedCount: Number(row.approved_count || 0),
  })) });
}

async function adminCreateUser(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = validatePassword(body.password);
  const role = body.role === 'admin' ? 'admin' : 'user';
  const status = body.status === 'disabled' ? 'disabled' : 'active';
  const permissions = sanitizePermissions(body.permissions);
  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`INSERT INTO users (id,username,email,password_hash,password_salt,role,status,permissions_json)
      VALUES (?,?,?,?,?,?,?,?)`).bind(id, username, email, hash, salt, role, status, JSON.stringify(permissions)).run();
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) throw new HttpError(409, 'USER_EXISTS', '用户名或邮箱已存在');
    throw error;
  }
  await audit(env, request, admin.id, 'admin.user_create', 'user', id, { username, role, status });
  return ok({ user: { id, username, email, role, status, permissions } });
}

async function adminUpdateUser(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const target = await env.DB.prepare('SELECT id,role,status FROM users WHERE id=? AND status!=\'deleted\'').bind(id)
    .first<{ id: string; role: string; status: string }>();
  if (!target) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
  const role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) : target.status;
  if (id === admin.id && (role !== 'admin' || status !== 'active')) throw new HttpError(400, 'CANNOT_DISABLE_SELF', '不能降级或禁用当前管理员账户');
  if (target.role === 'admin' && (role !== 'admin' || status !== 'active')) await ensureAnotherAdmin(env, id);
  const permissions = sanitizePermissions(body.permissions);
  await env.DB.prepare(`UPDATE users SET role=?,status=?,permissions_json=?,updated_at=datetime('now') WHERE id=?`)
    .bind(role, status, JSON.stringify(permissions), id).run();
  await audit(env, request, admin.id, 'admin.user_update', 'user', id, { role, status, permissions });
  return ok({ updated: true });
}

async function adminDeleteUser(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  if (id === admin.id) throw new HttpError(400, 'CANNOT_DELETE_SELF', '不能删除当前管理员账户');
  const target = await env.DB.prepare('SELECT role,status FROM users WHERE id=?').bind(id).first<{ role: string; status: string }>();
  if (!target || target.status === 'deleted') throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
  if (target.role === 'admin') await ensureAnotherAdmin(env, id);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET status='deleted',email=NULL,updated_at=datetime('now') WHERE id=?").bind(id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
  ]);
  await audit(env, request, admin.id, 'admin.user_delete', 'user', id);
  return ok({ deleted: true });
}

async function adminResetPassword(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const password = validatePassword(body.password);
  const target = await env.DB.prepare("SELECT id FROM users WHERE id=? AND status!='deleted'").bind(id).first<{ id: string }>();
  if (!target) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
  const { hash, salt } = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET password_hash=?,password_salt=?,updated_at=datetime('now') WHERE id=?").bind(hash, salt, id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
  ]);
  await audit(env, request, admin.id, 'admin.password_reset', 'user', id);
  return ok({ reset: true });
}

async function updateSetting(request: Request, env: Env, group: keyof AppSettings): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<unknown>(request, 256 * 1024);
  await saveSettingGroup(env, group, body, admin.id);
  await audit(env, request, admin.id, 'admin.setting_update', 'setting', group);
  return ok({ settings: await adminSettingsView(env) });
}

async function listRegistrationKeys(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const rows = await env.DB.prepare(`SELECT id,name,key_prefix,max_uses,used_count,expires_at,active,created_at
    FROM registration_keys ORDER BY created_at DESC LIMIT 500`).all<Record<string, unknown>>();
  return ok({ keys: rows.results || [] });
}

async function createRegistrationKey(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const name = cleanText(body.name || '注册密钥', 80);
  const maxUses = asInt(body.maxUses, 1, 0, 1_000_000);
  const expiresAtRaw = String(body.expiresAt || '').trim();
  let expiresAt: string | null = null;
  if (expiresAtRaw) {
    const date = new Date(expiresAtRaw);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new HttpError(400, 'INVALID_EXPIRY', '过期时间必须晚于当前时间');
    expiresAt = date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }
  const rawKey = `reg_${randomToken(24)}`;
  const keyHash = await sha256(rawKey);
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO registration_keys (id,name,key_hash,key_prefix,max_uses,expires_at,created_by)
    VALUES (?,?,?,?,?,?,?)`).bind(id, name, keyHash, rawKey.slice(0, 12), maxUses, expiresAt, admin.id).run();
  await audit(env, request, admin.id, 'admin.registration_key_create', 'registration_key', id, { name, maxUses, expiresAt });
  return ok({ key: { id, name, rawKey, maxUses, expiresAt } });
}

async function disableRegistrationKey(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const result = await env.DB.prepare('UPDATE registration_keys SET active=0 WHERE id=?').bind(id).run();
  if (!result.meta.changes) throw new HttpError(404, 'KEY_NOT_FOUND', '注册密钥不存在');
  await audit(env, request, admin.id, 'admin.registration_key_disable', 'registration_key', id);
  return ok({ disabled: true });
}

async function analytics(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const days = asInt(url.searchParams.get('days'), 30, 7, 180);
  const [daily, status, suffix, users] = await Promise.all([
    env.DB.prepare(`SELECT date(created_at) AS day,COUNT(*) AS count,
      SUM(status='approved') AS approved FROM domain_applications
      WHERE created_at >= datetime('now', ?) GROUP BY date(created_at) ORDER BY day`)
      .bind(`-${days - 1} days`).all<Record<string, unknown>>(),
    env.DB.prepare('SELECT status,COUNT(*) AS count FROM domain_applications GROUP BY status ORDER BY count DESC').all<Record<string, unknown>>(),
    env.DB.prepare('SELECT suffix_unicode AS suffix,COUNT(*) AS count FROM domain_applications GROUP BY suffix_unicode ORDER BY count DESC LIMIT 20').all<Record<string, unknown>>(),
    env.DB.prepare(`SELECT date(created_at) AS day,COUNT(*) AS count FROM users
      WHERE created_at >= datetime('now', ?) GROUP BY date(created_at) ORDER BY day`).bind(`-${days - 1} days`).all<Record<string, unknown>>(),
  ]);
  return ok({ analytics: { days, daily: daily.results || [], status: status.results || [], suffix: suffix.results || [], users: users.results || [] } });
}

async function auditLogs(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const limit = asInt(url.searchParams.get('limit'), 100, 1, 500);
  const rows = await env.DB.prepare(`SELECT l.*,u.username FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_user_id
    ORDER BY l.created_at DESC LIMIT ?`).bind(limit).all<Record<string, unknown>>();
  return ok({ logs: (rows.results || []).map(row => ({
    ...row,
    meta: safeJson(String(row.meta_json || '')),
    meta_json: undefined,
  })) });
}

async function ensureAnotherAdmin(env: Env, excludedId: string): Promise<void> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status='active' AND id!=?")
    .bind(excludedId).first<{ count: number }>();
  if (Number(row?.count || 0) < 1) throw new HttpError(409, 'LAST_ADMIN', '系统必须至少保留一个启用的管理员');
}

function sanitizePermissions(raw: unknown) {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const allowed = Array.isArray(value.allowedSuffixes) ? value.allowedSuffixes : String(value.allowedSuffixes || '').split(',');
  return {
    canApply: asBoolean(value.canApply, true),
    maxPending: asInt(value.maxPending, 3, 0, 100),
    maxTotal: asInt(value.maxTotal, 20, 0, 1000),
    allowedSuffixes: [...new Set(allowed.map(v => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 100),
  };
}

function serializeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    permissions: parsePermissions(user.permissions_json),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}

function serializeApplication(app: ApplicationRow) {
  return {
    id: app.id,
    userId: app.user_id,
    username: app.username,
    prefixUnicode: app.prefix_unicode,
    prefixAscii: app.prefix_ascii,
    suffixUnicode: app.suffix_unicode,
    suffixAscii: app.suffix_ascii,
    fqdnUnicode: app.fqdn_unicode,
    fqdnAscii: app.fqdn_ascii,
    recordType: app.record_type,
    recordContent: app.record_content,
    proxied: Boolean(app.proxied),
    ttl: app.ttl,
    status: app.status,
    reviewNote: app.review_note,
    errorMessage: app.error_message,
    dnsRecordId: app.dns_record_id,
    createdAt: app.created_at,
    reviewedAt: app.reviewed_at,
    reviewedBy: app.reviewed_by,
    expiresAt: app.expires_at,
    renewedAt: app.renewed_at,
    renewCount: Number(app.renew_count || 0),
    remainingDays: remainingDays(app.expires_at),
    canRenew: canRenew(app.expires_at, app.status),
    statusText: domainStatusText(app.status, app.expires_at),
    dnsConfigured: Boolean(app.record_content && String(app.record_content).trim()),
  };
}


function remainingDays(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function canRenew(expiresAt: string | null, status: string): boolean {
  if (status !== 'approved' || !expiresAt) return false;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(ms) && ms <= 60 * 24 * 60 * 60 * 1000;
}

function domainStatusText(status: string, expiresAt: string | null): string {
  if (status === 'approved' && expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (Number.isFinite(ms) && ms <= 0) return '已过期';
    return '正常';
  }
  const map: Record<string, string> = {
    pending: '待审核',
    processing: '处理中',
    approved: '正常',
    rejected: '已拒绝',
    revoked: '已撤销',
    revoking: '撤销中',
  };
  return map[status] || status;
}

function safeJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}
