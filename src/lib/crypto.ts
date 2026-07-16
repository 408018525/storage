const encoder = new TextEncoder();
const decoder = new TextDecoder();

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return base64ToBytes(padded);
}

export function randomToken(bytes = 32): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return toBase64Url(data);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string, saltValue?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltValue ? fromBase64Url(saltValue) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: arrayBuffer(salt), iterations: 210_000 },
    key,
    256,
  );
  return { hash: toBase64Url(new Uint8Array(bits)), salt: toBase64Url(salt) };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string): Promise<boolean> {
  const actual = await hashPassword(password, salt);
  return constantTimeEqual(actual.hash, expectedHash);
}

function constantTimeEqual(a: string, b: string): boolean {
  const aa = encoder.encode(a);
  const bb = encoder.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

async function masterKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToBytes(base64Key);
  if (raw.byteLength !== 32) throw new Error('APP_MASTER_KEY 必须是 32 字节 Base64');
  return crypto.subtle.importKey('raw', arrayBuffer(raw), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(value: string, base64Key?: string): Promise<string> {
  if (!base64Key) throw new Error('未配置 APP_MASTER_KEY，不能保存敏感密钥');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await masterKey(base64Key);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: arrayBuffer(iv) }, key, encoder.encode(value));
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(payload: string | undefined, base64Key?: string): Promise<string | null> {
  if (!payload) return null;
  if (!base64Key) throw new Error('未配置 APP_MASTER_KEY，不能读取敏感密钥');
  const [version, ivPart, dataPart] = payload.split('.');
  if (version !== 'v1' || !ivPart || !dataPart) throw new Error('密钥密文格式错误');
  const key = await masterKey(base64Key);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: arrayBuffer(fromBase64Url(ivPart)) },
    key,
    arrayBuffer(fromBase64Url(dataPart)),
  );
  return decoder.decode(plain);
}

export function maskSecret(hasSecret: boolean): string {
  return hasSecret ? '••••••••••••' : '';
}
