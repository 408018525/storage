import type { Env } from '../env';
import { decryptSecret, encryptSecret, maskSecret } from './crypto';
import { asBoolean, asInt, HttpError } from './http';
import { normalizeSuffix } from './validation';

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME';

export type SuffixConfig = {
  label: string;
  suffix: string;
  suffixAscii: string;
  zoneId: string;
  allowedTypes: DnsRecordType[];
  defaultType: DnsRecordType;
  ttl: number;
  proxied: boolean;
  enabled: boolean;
};

export type AppSettings = {
  site: {
    title: string;
    subtitle: string;
    logoUrl: string;
    footer: string;
    accent: string;
    accent2: string;
    backgroundType: 'gradient' | 'image' | 'solid';
    backgroundValue: string;
    backgroundOverlay: number;
  };
  announcement: { enabled: boolean; text: string; level: 'info' | 'success' | 'warning' };
  popup: { enabled: boolean; title: string; content: string; oncePerSession: boolean };
  registration: { enabled: boolean; requireKey: boolean; autoActivate: boolean };
  turnstile: {
    siteKey: string;
    secretEnc?: string;
    enabledApply: boolean;
    enabledLogin: boolean;
    enabledRegister: boolean;
    expectedHostname: string;
    actionApply: string;
    actionLogin: string;
    actionRegister: string;
  };
  dns: {
    apiTokenEnc?: string;
    suffixes: SuffixConfig[];
    reservedPrefixes: string[];
  };
  storage: {
    enabled: boolean;
    publicBaseUrl: string;
    prefix: string;
    maxUploadMb: number;
    allowedTypes: string[];
  };
};

export const DEFAULT_SETTINGS: AppSettings = {
  site: {
    title: '中文二级域名申请中心',
    subtitle: '申请、审核与管理您的专属中文子域名',
    logoUrl: '',
    footer: 'Powered by Cloudflare Workers',
    accent: '#5b5ce2',
    accent2: '#8b5cf6',
    backgroundType: 'gradient',
    backgroundValue: 'linear-gradient(135deg,#eef2ff 0%,#f8fafc 45%,#f5f3ff 100%)',
    backgroundOverlay: 0.08,
  },
  announcement: { enabled: true, text: '请勿申请违法、侵权、仿冒或误导性域名。', level: 'info' },
  popup: { enabled: false, title: '网站公告', content: '', oncePerSession: true },
  registration: { enabled: true, requireKey: false, autoActivate: true },
  turnstile: {
    siteKey: '',
    enabledApply: true,
    enabledLogin: false,
    enabledRegister: false,
    expectedHostname: '',
    actionApply: 'domain_apply',
    actionLogin: 'login',
    actionRegister: 'register',
  },
  dns: {
    suffixes: [],
    reservedPrefixes: ['www', 'api', 'admin', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'cdn', 'static', 'status', 'support'],
  },
  storage: {
    enabled: true,
    publicBaseUrl: '',
    prefix: 'backgrounds',
    maxUploadMb: 5,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
};

function merge<T extends Record<string, unknown>>(base: T, next: unknown): T {
  if (!next || typeof next !== 'object' || Array.isArray(next)) return structuredClone(base);
  const out = structuredClone(base) as Record<string, unknown>;
  for (const [key, value] of Object.entries(next as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = merge(out[key] as Record<string, unknown>, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export async function loadSettings(env: Env): Promise<AppSettings> {
  const rows = await env.DB.prepare('SELECT key, value_json FROM settings').all<{ key: keyof AppSettings; value_json: string }>();
  const result = structuredClone(DEFAULT_SETTINGS);
  for (const row of rows.results || []) {
    if (!(row.key in result)) continue;
    try {
      (result as unknown as Record<string, unknown>)[row.key] = merge(
        (result as unknown as Record<string, Record<string, unknown>>)[row.key],
        JSON.parse(row.value_json),
      );
    } catch {
      // Ignore invalid legacy setting rows and keep safe defaults.
    }
  }
  return applyEnvironmentOverrides(env, result);
}

export function isEnvironmentConfigMode(env: Env): boolean {
  return String(env.CONFIG_MODE || '').trim().toLowerCase() === 'env';
}

function isEnvironmentManagedGroup(env: Env, key: keyof AppSettings): boolean {
  return isEnvironmentConfigMode(env) && (key === 'turnstile' || key === 'dns');
}

export async function saveSettingGroup(env: Env, key: keyof AppSettings, value: unknown, actorId: string): Promise<void> {
  if (isEnvironmentManagedGroup(env, key)) {
    throw new HttpError(409, 'ENV_MANAGED_SETTING', 'Turnstile 与 DNS 当前由 Cloudflare Workers 环境变量管理，请在 Worker 设置中修改');
  }
  const cleaned = await sanitizeGroup(env, key, value);
  await env.DB.prepare(`
    INSERT INTO settings (key, value_json, updated_at, updated_by)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=datetime('now'), updated_by=excluded.updated_by
  `).bind(key, JSON.stringify(cleaned), actorId).run();
  await env.APP_KV.delete('public-config:v4');
}

async function sanitizeGroup(env: Env, key: keyof AppSettings, raw: unknown): Promise<unknown> {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const current = await loadSettings(env);
  switch (key) {
    case 'site': {
      const bgType = ['gradient', 'image', 'solid'].includes(String(value.backgroundType)) ? String(value.backgroundType) : current.site.backgroundType;
      return {
        title: String(value.title ?? current.site.title).trim().slice(0, 80),
        subtitle: String(value.subtitle ?? current.site.subtitle).trim().slice(0, 160),
        logoUrl: String(value.logoUrl ?? current.site.logoUrl).trim().slice(0, 500),
        footer: String(value.footer ?? current.site.footer).trim().slice(0, 160),
        accent: safeColor(value.accent, current.site.accent),
        accent2: safeColor(value.accent2, current.site.accent2),
        backgroundType: bgType,
        backgroundValue: String(value.backgroundValue ?? current.site.backgroundValue).trim().slice(0, 1000),
        backgroundOverlay: Math.min(0.9, Math.max(0, Number(value.backgroundOverlay ?? current.site.backgroundOverlay) || 0)),
      };
    }
    case 'announcement':
      return {
        enabled: asBoolean(value.enabled, current.announcement.enabled),
        text: String(value.text ?? '').trim().slice(0, 500),
        level: ['info', 'success', 'warning'].includes(String(value.level)) ? value.level : 'info',
      };
    case 'popup':
      return {
        enabled: asBoolean(value.enabled, current.popup.enabled),
        title: String(value.title ?? '').trim().slice(0, 100),
        content: String(value.content ?? '').trim().slice(0, 3000),
        oncePerSession: asBoolean(value.oncePerSession, true),
      };
    case 'registration':
      return {
        enabled: asBoolean(value.enabled, current.registration.enabled),
        requireKey: asBoolean(value.requireKey, current.registration.requireKey),
        autoActivate: asBoolean(value.autoActivate, current.registration.autoActivate),
      };
    case 'turnstile': {
      let secretEnc = current.turnstile.secretEnc;
      const newSecret = String(value.secret || '').trim();
      if (newSecret) secretEnc = await encryptForSettings(newSecret, env.APP_MASTER_KEY);
      return {
        siteKey: String(value.siteKey ?? current.turnstile.siteKey).trim().slice(0, 200),
        secretEnc,
        enabledApply: asBoolean(value.enabledApply, current.turnstile.enabledApply),
        enabledLogin: asBoolean(value.enabledLogin, current.turnstile.enabledLogin),
        enabledRegister: asBoolean(value.enabledRegister, current.turnstile.enabledRegister),
        expectedHostname: String(value.expectedHostname ?? current.turnstile.expectedHostname).trim().toLowerCase().slice(0, 253),
        actionApply: safeAction(value.actionApply, 'domain_apply'),
        actionLogin: safeAction(value.actionLogin, 'login'),
        actionRegister: safeAction(value.actionRegister, 'register'),
      };
    }
    case 'dns': {
      let apiTokenEnc = current.dns.apiTokenEnc;
      const newToken = String(value.apiToken || '').trim();
      if (newToken) apiTokenEnc = await encryptForSettings(newToken, env.APP_MASTER_KEY);
      const suffixesRaw = Array.isArray(value.suffixes) ? value.suffixes : current.dns.suffixes;
      const suffixes = suffixesRaw.slice(0, 50).map((item, index) => sanitizeSuffix(item, index));
      const reserved = Array.isArray(value.reservedPrefixes)
        ? value.reservedPrefixes
        : String(value.reservedPrefixes ?? '').split(',');
      return {
        apiTokenEnc,
        suffixes,
        reservedPrefixes: [...new Set(reserved.map(v => String(v).trim().toLowerCase()).filter(Boolean))].slice(0, 500),
      };
    }
    case 'storage': {
      const allowed = Array.isArray(value.allowedTypes) ? value.allowedTypes : current.storage.allowedTypes;
      return {
        enabled: asBoolean(value.enabled, current.storage.enabled),
        publicBaseUrl: String(value.publicBaseUrl ?? current.storage.publicBaseUrl).trim().replace(/\/$/, '').slice(0, 500),
        prefix: String(value.prefix ?? current.storage.prefix).trim().replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 100) || 'backgrounds',
        maxUploadMb: asInt(value.maxUploadMb, current.storage.maxUploadMb, 1, 20),
        allowedTypes: allowed.map(v => String(v).trim()).filter(v => /^image\/(jpeg|png|webp|avif)$/.test(v)).slice(0, 10),
      };
    }
    default:
      throw new HttpError(400, 'INVALID_SETTING_GROUP', '未知设置分组');
  }
}

function sanitizeSuffix(raw: unknown, index: number): SuffixConfig {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const normalized = normalizeSuffix(String(item.suffix || ''));
  const validTypes = new Set<DnsRecordType>(['A', 'AAAA', 'CNAME']);
  const legacyType = String(item.type || '').trim().toUpperCase();
  const allowedRaw = Array.isArray(item.allowedTypes)
    ? item.allowedTypes
    : String(item.allowedTypes || legacyType || 'CNAME').split(',');
  const allowedTypes = [...new Set(allowedRaw
    .map(value => String(value).trim().toUpperCase())
    .filter((value): value is DnsRecordType => validTypes.has(value as DnsRecordType)))];
  if (!allowedTypes.length) allowedTypes.push('CNAME');
  const requestedDefault = String(item.defaultType || legacyType || allowedTypes[0]).trim().toUpperCase() as DnsRecordType;
  const defaultType = allowedTypes.includes(requestedDefault) ? requestedDefault : allowedTypes[0];
  const zoneId = String(item.zoneId || '').trim();
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) throw new HttpError(400, 'INVALID_ZONE_ID', `第 ${index + 1} 个后缀 Zone ID 格式错误`);
  return {
    label: String(item.label || normalized.unicode).trim().slice(0, 80),
    suffix: normalized.unicode,
    suffixAscii: normalized.ascii,
    zoneId,
    allowedTypes,
    defaultType,
    ttl: asInt(item.ttl, 1, 1, 86400),
    proxied: asBoolean(item.proxied, false),
    enabled: asBoolean(item.enabled, true),
  };
}

function safeAction(value: unknown, fallback: string): string {
  const action = String(value || fallback).trim();
  return /^[a-zA-Z0-9_-]{1,32}$/.test(action) ? action : fallback;
}

function safeColor(value: unknown, fallback: string): string {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function envBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value).trim().toLowerCase());
}

function parseDnsSuffixesVariable(raw: Env['DNS_SUFFIXES_JSON']): SuffixConfig[] | null {
  if (raw === undefined || raw === null || raw === '') return null;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(503, 'DNS_SUFFIXES_ENV_INVALID', 'DNS_SUFFIXES_JSON 不是有效 JSON');
    }
  }
  if (!Array.isArray(parsed)) throw new HttpError(503, 'DNS_SUFFIXES_ENV_INVALID', 'DNS_SUFFIXES_JSON 必须是数组');
  try {
    return parsed.slice(0, 50).map((item, index) => sanitizeSuffix(item, index));
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(503, 'DNS_SUFFIXES_ENV_INVALID', `DNS_SUFFIXES_JSON 配置错误：${error.message}`);
    }
    throw error;
  }
}

function applyEnvironmentOverrides(env: Env, settings: AppSettings): AppSettings {
  const result = structuredClone(settings);

  if (env.TURNSTILE_SITE_KEY !== undefined) result.turnstile.siteKey = String(env.TURNSTILE_SITE_KEY).trim().slice(0, 200);
  if (env.TURNSTILE_EXPECTED_HOSTNAME !== undefined) {
    result.turnstile.expectedHostname = String(env.TURNSTILE_EXPECTED_HOSTNAME).trim().toLowerCase().slice(0, 253);
  }
  result.turnstile.enabledApply = envBoolean(env.TURNSTILE_ENABLE_APPLY, result.turnstile.enabledApply);
  result.turnstile.enabledLogin = envBoolean(env.TURNSTILE_ENABLE_LOGIN, result.turnstile.enabledLogin);
  result.turnstile.enabledRegister = envBoolean(env.TURNSTILE_ENABLE_REGISTER, result.turnstile.enabledRegister);
  if (env.TURNSTILE_ACTION_APPLY !== undefined) result.turnstile.actionApply = safeAction(env.TURNSTILE_ACTION_APPLY, 'domain_apply');
  if (env.TURNSTILE_ACTION_LOGIN !== undefined) result.turnstile.actionLogin = safeAction(env.TURNSTILE_ACTION_LOGIN, 'login');
  if (env.TURNSTILE_ACTION_REGISTER !== undefined) result.turnstile.actionRegister = safeAction(env.TURNSTILE_ACTION_REGISTER, 'register');

  const suffixes = parseDnsSuffixesVariable(env.DNS_SUFFIXES_JSON);
  if (suffixes) {
    result.dns.suffixes = suffixes;
  } else if (env.DNS_SUFFIX || env.DNS_ZONE_ID) {
    try {
      result.dns.suffixes = [sanitizeSuffix({
        label: env.DNS_SUFFIX_LABEL || env.DNS_SUFFIX || '主域名',
        suffix: env.DNS_SUFFIX || '',
        zoneId: env.DNS_ZONE_ID || '',
        allowedTypes: env.DNS_ALLOWED_TYPES || env.DNS_RECORD_TYPE || 'CNAME',
        defaultType: env.DNS_DEFAULT_TYPE || env.DNS_RECORD_TYPE || 'CNAME',
        ttl: env.DNS_TTL || '1',
        proxied: env.DNS_PROXIED || 'false',
        enabled: true,
      }, 0)];
    } catch (error) {
      if (error instanceof HttpError) {
        throw new HttpError(503, 'DNS_ENV_INVALID', `单后缀 DNS 环境变量配置错误：${error.message}`);
      }
      throw error;
    }
  }
  if (env.DNS_RESERVED_PREFIXES !== undefined) {
    result.dns.reservedPrefixes = [...new Set(
      String(env.DNS_RESERVED_PREFIXES).split(',').map(v => v.trim().toLowerCase()).filter(Boolean),
    )].slice(0, 500);
  }

  return result;
}

export async function publicConfig(env: Env): Promise<Record<string, unknown>> {
  const envManaged = isEnvironmentConfigMode(env);
  if (!envManaged) {
    const cached = await env.APP_KV.get('public-config:v4', 'json');
    if (cached && typeof cached === 'object') return cached as Record<string, unknown>;
  }
  const settings = await loadSettings(env);
  const config = {
    site: settings.site,
    announcement: settings.announcement,
    popup: settings.popup,
    registration: {
      enabled: settings.registration.enabled,
      requireKey: settings.registration.requireKey,
    },
    turnstile: {
      siteKey: settings.turnstile.siteKey,
      enabledApply: settings.turnstile.enabledApply,
      enabledLogin: settings.turnstile.enabledLogin,
      enabledRegister: settings.turnstile.enabledRegister,
      actionApply: settings.turnstile.actionApply,
      actionLogin: settings.turnstile.actionLogin,
      actionRegister: settings.turnstile.actionRegister,
    },
    suffixes: settings.dns.suffixes.filter(x => x.enabled).map(x => ({
      label: x.label, suffix: x.suffix, allowedTypes: x.allowedTypes, defaultType: x.defaultType,
    })),
  };
  if (!envManaged) await env.APP_KV.put('public-config:v4', JSON.stringify(config), { expirationTtl: 300 });
  return config;
}

export async function adminSettingsView(env: Env): Promise<Record<string, unknown>> {
  const settings = await loadSettings(env);
  const envManaged = isEnvironmentConfigMode(env);
  return {
    ...settings,
    configMode: envManaged ? 'env' : 'hybrid',
    turnstile: {
      ...settings.turnstile,
      secretEnc: undefined,
      secret: maskSecret(Boolean(env.TURNSTILE_SECRET || settings.turnstile.secretEnc)),
      secretSource: env.TURNSTILE_SECRET ? 'worker-secret' : settings.turnstile.secretEnc ? 'encrypted-setting' : 'missing',
      envManaged,
    },
    dns: {
      ...settings.dns,
      apiTokenEnc: undefined,
      apiToken: maskSecret(Boolean(env.CF_API_TOKEN || settings.dns.apiTokenEnc)),
      apiTokenSource: env.CF_API_TOKEN ? 'worker-secret' : settings.dns.apiTokenEnc ? 'encrypted-setting' : 'missing',
      envManaged,
      suffixSource: (env.DNS_SUFFIXES_JSON || env.DNS_SUFFIX) ? 'worker-variable' : 'database-setting',
    },
    masterKeyReady: Boolean(env.APP_MASTER_KEY),
  };
}

async function encryptForSettings(value: string, masterKey?: string): Promise<string> {
  try {
    return await encryptSecret(value, masterKey);
  } catch {
    throw new HttpError(503, 'MASTER_KEY_INVALID', 'APP_MASTER_KEY 未配置或格式错误，无法加密敏感设置');
  }
}

async function decryptForSettings(payload: string | undefined, masterKey: string | undefined, fallback: string | undefined): Promise<string | null> {
  if (!payload) return fallback || null;
  try {
    return (await decryptSecret(payload, masterKey)) || fallback || null;
  } catch {
    if (fallback) return fallback;
    throw new HttpError(503, 'MASTER_KEY_INVALID', 'APP_MASTER_KEY 缺失、已变更或格式错误，无法解密敏感设置');
  }
}

export async function resolveTurnstileSecret(env: Env, settings: AppSettings): Promise<string | null> {
  if (env.TURNSTILE_SECRET) return env.TURNSTILE_SECRET;
  return decryptForSettings(settings.turnstile.secretEnc, env.APP_MASTER_KEY, undefined);
}

export async function resolveDnsToken(env: Env, settings: AppSettings): Promise<string | null> {
  if (env.CF_API_TOKEN) return env.CF_API_TOKEN;
  return decryptForSettings(settings.dns.apiTokenEnc, env.APP_MASTER_KEY, undefined);
}
