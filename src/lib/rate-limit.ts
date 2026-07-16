import type { Env } from '../env';
import { HttpError, clientIp } from './http';
import { sha256 } from './crypto';

export async function rateLimit(env: Env, request: Request, scope: string, limit: number, windowSeconds: number): Promise<void> {
  const ip = await sha256(clientIp(request));
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rl:${scope}:${ip}:${bucket}`;
  const current = Number(await env.APP_KV.get(key) || '0');
  if (current >= limit) throw new HttpError(429, 'RATE_LIMITED', '操作过于频繁，请稍后再试');
  await env.APP_KV.put(key, String(current + 1), { expirationTtl: windowSeconds + 30 });
}
