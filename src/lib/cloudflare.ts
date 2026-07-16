import { HttpError } from './http';


type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
};

async function cfRequest<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new HttpError(502, 'CLOUDFLARE_API_UNAVAILABLE', '无法连接 Cloudflare DNS API');
  }
  let body: CloudflareEnvelope<T>;
  try {
    body = await response.json<CloudflareEnvelope<T>>();
  } catch {
    throw new HttpError(502, 'CLOUDFLARE_API_INVALID_RESPONSE', `Cloudflare DNS API 返回异常（HTTP ${response.status}）`);
  }
  if (!response.ok || !body.success) {
    const message = body.errors?.map(x => x.message).filter(Boolean).join('; ') || `Cloudflare API 错误 ${response.status}`;
    throw new HttpError(502, 'CLOUDFLARE_API_ERROR', message, body.errors);
  }
  return body.result;
}

export async function findDnsRecords(token: string, zoneId: string, fqdnAscii: string): Promise<Array<Record<string, unknown>>> {
  return cfRequest(token, `/zones/${zoneId}/dns_records?name=${encodeURIComponent(fqdnAscii)}&per_page=100`);
}

export type DnsRecordConfig = {
  zoneId: string;
  type: 'A' | 'AAAA' | 'CNAME';
  target: string;
  ttl: number;
  proxied: boolean;
};

export async function createDnsRecord(
  token: string,
  config: DnsRecordConfig,
  fqdnAscii: string,
  applicationId: string,
): Promise<{ id: string }> {
  const existing = await findDnsRecords(token, config.zoneId, fqdnAscii);
  const owned = existing.find(record => String(record.comment || '').includes(applicationId));
  if (owned?.id) return { id: String(owned.id) };
  if (existing.length) throw new HttpError(409, 'DNS_RECORD_EXISTS', 'Cloudflare 中已存在同名 DNS 记录');
  const result = await cfRequest<Record<string, unknown>>(token, `/zones/${config.zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: config.type,
      name: fqdnAscii,
      content: config.target,
      ttl: config.ttl,
      proxied: config.proxied,
      comment: `Subdomain Portal application ${applicationId}`,
    }),
  });
  return { id: String(result.id) };
}

export async function deleteDnsRecord(token: string, zoneId: string, recordId: string): Promise<void> {
  await cfRequest(token, `/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' });
}
