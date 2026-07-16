export interface Env {
  DB: D1Database;
  APP_KV: KVNamespace;
  ASSETS: Fetcher;

  // General runtime mode. Set CONFIG_MODE=env to manage Turnstile and DNS only
  // from Cloudflare Workers Variables and Secrets.
  CONFIG_MODE?: string;
  ENVIRONMENT?: string;

  // Bootstrap/security secrets.
  BOOTSTRAP_ADMIN_TOKEN?: string;
  APP_MASTER_KEY?: string;

  // Turnstile configuration from the Workers dashboard.
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TURNSTILE_ENABLE_APPLY?: string;
  TURNSTILE_ENABLE_LOGIN?: string;
  TURNSTILE_ENABLE_REGISTER?: string;
  TURNSTILE_ACTION_APPLY?: string;
  TURNSTILE_ACTION_LOGIN?: string;
  TURNSTILE_ACTION_REGISTER?: string;

  // Cloudflare DNS configuration from the Workers dashboard.
  CF_API_TOKEN?: string;
  DNS_SUFFIXES_JSON?: string | unknown[];
  DNS_SUFFIX_LABEL?: string;
  DNS_SUFFIX?: string;
  DNS_ZONE_ID?: string;
  DNS_RECORD_TYPE?: string; // legacy fallback
  DNS_ALLOWED_TYPES?: string;
  DNS_DEFAULT_TYPE?: string;
  DNS_TARGET?: string; // legacy fixed-target variable, ignored by dynamic-target mode
  DNS_TTL?: string;
  DNS_PROXIED?: string;
  DNS_RESERVED_PREFIXES?: string;
}
