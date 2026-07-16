import type { Env } from '../env';
import type { AppSettings } from './settings';
import { resolveTurnstileSecret } from './settings';
import { clientIp, HttpError } from './http';

export async function verifyTurnstile(
  env: Env,
  request: Request,
  settings: AppSettings,
  token: unknown,
  expectedAction: string,
): Promise<void> {
  const secret = await resolveTurnstileSecret(env, settings);
  if (!secret) throw new HttpError(503, 'TURNSTILE_NOT_CONFIGURED', 'Turnstile 尚未配置');
  const responseToken = String(token || '').trim();
  if (!responseToken) throw new HttpError(400, 'TURNSTILE_REQUIRED', '请完成人机验证');
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', responseToken);
  form.set('remoteip', clientIp(request));
  form.set('idempotency_key', crypto.randomUUID());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch {
    throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', '人机验证服务暂时不可用');
  } finally {
    clearTimeout(timer);
  }
  const result = await response.json<Record<string, unknown>>();
  if (!result.success) {
    throw new HttpError(400, 'TURNSTILE_FAILED', '人机验证失败', result['error-codes']);
  }
  if (settings.turnstile.expectedHostname && String(result.hostname || '').toLowerCase() !== settings.turnstile.expectedHostname) {
    throw new HttpError(400, 'TURNSTILE_HOSTNAME_MISMATCH', 'Turnstile 主机名校验失败');
  }
  if (expectedAction && String(result.action || '') !== expectedAction) {
    throw new HttpError(400, 'TURNSTILE_ACTION_MISMATCH', 'Turnstile action 校验失败');
  }
}
