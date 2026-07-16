import { HttpError } from './http';

export function normalizeUsername(value: unknown): string {
  const username = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_\-]{3,32}$/.test(username)) {
    throw new HttpError(400, 'INVALID_USERNAME', '用户名须为 3–32 位字母、数字、下划线或短横线');
  }
  return username;
}

export function normalizeEmail(value: unknown): string | null {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', '邮箱格式不正确');
  }
  return email;
}

export function validatePassword(value: unknown): string {
  const password = String(value || '');
  if (password.length < 10 || password.length > 128) {
    throw new HttpError(400, 'WEAK_PASSWORD', '密码长度须为 10–128 位');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'WEAK_PASSWORD', '密码至少包含一个字母和一个数字');
  }
  return password;
}

export function normalizeSuffix(value: string): { unicode: string; ascii: string } {
  const unicode = value.trim().replace(/^\.+|\.+$/g, '').normalize('NFC').toLowerCase();
  if (!unicode || unicode.includes('/') || unicode.includes(' ')) {
    throw new HttpError(400, 'INVALID_SUFFIX', '域名后缀格式错误');
  }
  let ascii: string;
  try {
    ascii = new URL(`https://${unicode}`).hostname.toLowerCase();
  } catch {
    throw new HttpError(400, 'INVALID_SUFFIX', '域名后缀无法转换');
  }
  if (!ascii.includes('.') || ascii.length > 253) throw new HttpError(400, 'INVALID_SUFFIX', '域名后缀格式错误');
  return { unicode, ascii };
}

export function normalizePrefix(value: unknown): { unicode: string; ascii: string } {
  const unicode = String(value || '').trim().normalize('NFC').toLowerCase();
  const chars = [...unicode];
  if (chars.length < 1 || chars.length > 32) {
    throw new HttpError(400, 'INVALID_PREFIX', '前缀长度须为 1–32 个字符');
  }
  if (unicode.startsWith('-') || unicode.endsWith('-') || unicode.includes('.') || unicode.includes('。')) {
    throw new HttpError(400, 'INVALID_PREFIX', '前缀不能以短横线开头或结尾，也不能包含点号');
  }
  if (!/^[\p{L}\p{N}-]+$/u.test(unicode)) {
    throw new HttpError(400, 'INVALID_PREFIX', '前缀仅支持中文、字母、数字和短横线');
  }
  if (/^xn--/i.test(unicode)) {
    throw new HttpError(400, 'INVALID_PREFIX', '请直接输入中文，不要手动输入 xn-- 编码');
  }
  let ascii: string;
  try {
    ascii = new URL(`https://${unicode}.invalid`).hostname.split('.')[0].toLowerCase();
  } catch {
    throw new HttpError(400, 'INVALID_PREFIX', '该前缀无法转换为 DNS 标签');
  }
  if (!ascii || ascii.length > 63) {
    throw new HttpError(400, 'INVALID_PREFIX', '转换后的 DNS 标签超过 63 字节');
  }
  return { unicode, ascii };
}

export function cleanText(value: unknown, max = 500): string {
  return String(value || '').trim().slice(0, max);
}

export type UserDnsRecordType = 'A' | 'AAAA' | 'CNAME';

export function normalizeRecordType(value: unknown, allowedTypes: UserDnsRecordType[]): UserDnsRecordType {
  const type = String(value || '').trim().toUpperCase() as UserDnsRecordType;
  if (!allowedTypes.includes(type)) {
    throw new HttpError(400, 'RECORD_TYPE_NOT_ALLOWED', '该后缀不允许使用此 DNS 记录类型');
  }
  return type;
}

export function normalizeDnsTarget(type: UserDnsRecordType, value: unknown, fqdnAscii: string): string {
  const raw = String(value || '').trim();
  if (!raw) throw new HttpError(400, 'DNS_TARGET_REQUIRED', '请输入 DNS 目标地址');
  if (raw.length > 253) throw new HttpError(400, 'DNS_TARGET_TOO_LONG', 'DNS 目标地址过长');

  if (type === 'A') return normalizePublicIpv4(raw);
  if (type === 'AAAA') return normalizePublicIpv6(raw);

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /[\/@?#\\]/.test(raw) || raw.includes(':')) {
    throw new HttpError(400, 'INVALID_CNAME_TARGET', 'CNAME 目标只能填写主机名，不能包含协议、端口、路径或参数');
  }
  const unicode = raw.replace(/\.$/, '').normalize('NFC').toLowerCase();
  let hostname: string;
  try {
    hostname = new URL(`https://${unicode}`).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    throw new HttpError(400, 'INVALID_CNAME_TARGET', 'CNAME 目标主机名格式错误');
  }
  if (!hostname.includes('.') || hostname.length > 253) {
    throw new HttpError(400, 'INVALID_CNAME_TARGET', 'CNAME 目标必须是完整主机名');
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    throw new HttpError(400, 'INVALID_CNAME_TARGET', 'CNAME 不能指向 IP 地址；请改用 A 或 AAAA 记录');
  }
  const labels = hostname.split('.');
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new HttpError(400, 'INVALID_CNAME_TARGET', 'CNAME 目标主机名格式错误');
  }
  if (hostname === fqdnAscii.toLowerCase()) {
    throw new HttpError(400, 'CNAME_LOOP', 'CNAME 目标不能与申请域名相同');
  }
  return hostname;
}

function normalizePublicIpv4(raw: string): string {
  const parts = raw.split('.');
  if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part))) {
    throw new HttpError(400, 'INVALID_IPV4', '请输入有效的 IPv4 地址');
  }
  const nums = parts.map(Number);
  if (nums.some(num => num < 0 || num > 255)) throw new HttpError(400, 'INVALID_IPV4', '请输入有效的 IPv4 地址');
  const [a, b, c] = nums;
  const blocked =
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113);
  if (blocked) throw new HttpError(400, 'PRIVATE_OR_RESERVED_IP', '不允许使用本地、私有、保留或文档示例 IPv4 地址');
  return nums.join('.');
}

function normalizePublicIpv6(raw: string): string {
  const value = raw.replace(/^\[|\]$/g, '').toLowerCase();
  if (!value.includes(':') || !/^[0-9a-f:.]+$/.test(value)) {
    throw new HttpError(400, 'INVALID_IPV6', '请输入有效的 IPv6 地址');
  }
  try {
    const parsed = new URL(`http://[${value}]`).hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!parsed.includes(':')) throw new Error('not ipv6');
  } catch {
    throw new HttpError(400, 'INVALID_IPV6', '请输入有效的 IPv6 地址');
  }
  if (value === '::' || value === '::1' || /^f[cd]/.test(value) || /^fe[89ab]/.test(value) || /^ff/.test(value)) {
    throw new HttpError(400, 'PRIVATE_OR_RESERVED_IP', '不允许使用本地、私有、链路本地或组播 IPv6 地址');
  }
  return value;
}
