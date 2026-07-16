import type { Env } from '../env';
import { sha256, randomToken } from './crypto';
import { clearSessionCookie, getCookie, HttpError, sessionCookie, clientIp } from './http';

export type Permissions = {
  canApply: boolean;
  maxPending: number;
  maxTotal: number;
  allowedSuffixes: string[];
};

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'disabled' | 'deleted';
  permissions: Permissions;
  createdAt: string;
  lastLoginAt: string | null;
};

const DEFAULT_PERMISSIONS: Permissions = { canApply: true, maxPending: 3, maxTotal: 20, allowedSuffixes: [] };

export function parsePermissions(value: string | null | undefined): Permissions {
  try {
    const raw = JSON.parse(value || '{}') as Partial<Permissions>;
    return {
      canApply: raw.canApply !== false,
      maxPending: Math.max(0, Math.min(100, Number(raw.maxPending ?? 3))),
      maxTotal: Math.max(0, Math.min(1000, Number(raw.maxTotal ?? 20))),
      allowedSuffixes: Array.isArray(raw.allowedSuffixes) ? raw.allowedSuffixes.map(String) : [],
    };
  } catch {
    return { ...DEFAULT_PERMISSIONS };
  }
}

export async function createSession(env: Env, request: Request, userId: string, remember = false): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  const expiresAt = new Date(Date.now() + maxAge * 1000).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  const ipHash = await sha256(clientIp(request));
  const uaHash = await sha256(request.headers.get('user-agent') || '');
  await env.DB.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, ip_hash, ua_hash)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenHash, userId, expiresAt, ipHash, uaHash).run();
  return sessionCookie(token, maxAge);
}

export async function destroySession(env: Env, request: Request): Promise<string> {
  const token = getCookie(request, 'sid');
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return clearSessionCookie();
}

export async function getAuthUser(env: Env, request: Request): Promise<AuthUser | null> {
  const token = getCookie(request, 'sid');
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.status, u.permissions_json,
           u.created_at, u.last_login_at, s.last_seen_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now')
  `).bind(tokenHash).first<Record<string, string | null>>();
  if (!row || row.status !== 'active') return null;
  const lastSeen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
  if (Date.now() - lastSeen > 15 * 60 * 1000) {
    await env.DB.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE token_hash = ?").bind(tokenHash).run();
  }
  return {
    id: String(row.id),
    username: String(row.username),
    email: row.email,
    role: row.role as AuthUser['role'],
    status: row.status as AuthUser['status'],
    permissions: parsePermissions(row.permissions_json),
    createdAt: String(row.created_at),
    lastLoginAt: row.last_login_at,
  };
}

export async function requireUser(env: Env, request: Request): Promise<AuthUser> {
  const user = await getAuthUser(env, request);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  return user;
}

export async function requireAdmin(env: Env, request: Request): Promise<AuthUser> {
  const user = await requireUser(env, request);
  if (user.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', '需要管理员权限');
  return user;
}
