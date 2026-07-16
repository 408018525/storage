import type { Env } from '../env';
import { clientIp } from './http';

export async function audit(
  env: Env,
  request: Request,
  actorUserId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  meta?: unknown,
): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, meta_json, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(), actorUserId, action, targetType || null, targetId || null,
    meta === undefined ? null : JSON.stringify(meta), clientIp(request),
  ).run();
}
