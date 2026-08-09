/// <reference types="@cloudflare/workers-types" />

import { EmailMessage } from "cloudflare:email";

interface D1Result<T = unknown> { results?: T[]; meta?: { changes?: number } }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  DB: D1Database;
  APP_KV: KVNamespace;
  ASSETS: Fetcher;
  BOOTSTRAP_ADMIN_TOKEN?: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  CF_EMAIL_ROUTING_API_TOKEN?: string;
  CF_WORKERS_API_TOKEN?: string;
  CF_WORKER_SCRIPT_NAME?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  APP_ENVIRONMENT?: string;
  ENVIRONMENT?: string;
  CF_ADMIN_EMAIL?: string;
  SEB?: { send(message: EmailMessage): Promise<unknown> };
  DNS_SUFFIX?: string;
  DNS_SUFFIX_LABEL?: string;
  DNS_ZONE_ID?: string;
  DNS_ALLOWED_TYPES?: string;
  DNS_DEFAULT_TYPE?: string;
  DNS_TTL?: string;
  DNS_PROXIED?: string;
  DNS_RESERVED_PREFIXES?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TURNSTILE_ENABLE_APPLY?: string;
  TURNSTILE_ENABLE_LOGIN?: string;
  TURNSTILE_ENABLE_REGISTER?: string;
  TURNSTILE_ACTION_APPLY?: string;
  TURNSTILE_ACTION_LOGIN?: string;
  TURNSTILE_ACTION_REGISTER?: string;
}

type Role = 'admin' | 'user';
type UserStatus = 'active' | 'disabled' | 'deleted';
type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'CAA' | 'SRV';

const SUPPORTED_DNS_RECORD_TYPES: DnsRecordType[] = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'SRV'];

interface DnsRecordTypePolicy {
  type: DnsRecordType;
  displayName: string;
  allowUserAdd: boolean;
  note: string;
}

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  phone?: string | null;
  password_hash: string;
  password_salt: string;
  role: Role;
  status: UserStatus;
  domain_quota?: number | null;
  permissions_json?: string | null;
  created_at: string;
  updated_at?: string | null;
  last_login_at?: string | null;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  username?: string | null;
  prefix_unicode: string;
  prefix_ascii: string;
  suffix_unicode: string;
  suffix_ascii: string;
  fqdn_unicode: string;
  fqdn_ascii: string;
  record_type: string | null;
  record_content: string | null;
  proxied: number | null;
  ttl: number | null;
  status: string;
  review_note?: string | null;
  error_message?: string | null;
  dns_record_id?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  expires_at?: string | null;
  renewed_at?: string | null;
  renew_count?: number | null;
  deleted_at?: string | null;
  delete_requested_at?: string | null;
  delete_requested_by?: string | null;
  controlled_at?: string | null;
  controlled_by?: string | null;
}

interface DnsRecordRow {
  id: string;
  application_id: string;
  user_id: string;
  host: string;
  name: string;
  type: DnsRecordType;
  content: string;
  priority?: number | null;
  proxied?: number | null;
  ttl?: number | null;
  cf_record_id?: string | null;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at?: string | null;
  deleted_at?: string | null;
  fqdn_unicode?: string | null;
  fqdn_ascii?: string | null;
  username?: string | null;
}

interface MessageRow {
  id: string;
  sender_user_id?: string | null;
  sender_username?: string | null;
  target_type: string;
  target_user_id?: string | null;
  target_username?: string | null;
  target_role?: string | null;
  title: string;
  body: string;
  level: string;
  status: string;
  created_at: string;
  updated_at?: string | null;
  sent_at?: string | null;
  deleted_at?: string | null;
  read_at?: string | null;
}

interface SupportTicketRow {
  id: string;
  user_id: string;
  username?: string | null;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  client_context_json?: string | null;
  created_at: string;
  updated_at?: string | null;
  last_reply_at?: string | null;
  closed_at?: string | null;
}

interface SupportTicketReplyRow {
  id: string;
  ticket_id: string;
  user_id: string;
  username?: string | null;
  is_admin: number;
  body: string;
  created_at: string;
}


interface HelpItemSetting {
  id?: string;
  q: string;
  a: string;
}

interface HelpCategorySetting {
  key: string;
  title: string;
  subtitle?: string;
  items: HelpItemSetting[];
}

interface AppSettings {
  site: {
    title: string;
    subtitle: string;
    footer: string;
    copyright?: string;
    faviconUrl?: string;
    headerThirdPartyJs?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    themeMode?: string;
    noticeStartAt?: string;
    noticeEndAt?: string;
    accent: string;
    accent2: string;
    logoText: string;
    logoImageUrl?: string;
    icp?: string;
    homepageNotice?: string;
    publicHomepageEnabled?: boolean;
    publicHomepageLayout?: 'brand' | 'compact' | 'data';
    publicHomepageBadge?: string;
    publicHomepageTitle?: string;
    publicHomepageHighlight?: string;
    publicHomepageDescription?: string;
    publicHomepagePrimaryText?: string;
    publicHomepagePrimaryHref?: string;
    publicHomepageSecondaryText?: string;
    publicHomepageSecondaryHref?: string;
    publicHomepageSearchEyebrow?: string;
    publicHomepageSearchTitle?: string;
    publicHomepageSearchNote?: string;
    publicHomepageStatsUsersLabel?: string;
    publicHomepageStatsDomainsLabel?: string;
    publicHomepageStatsDnsLabel?: string;
    publicHomepageStatsSuffixesLabel?: string;
    publicHomepageFeaturesTitle?: string;
    publicHomepageFeaturesDescription?: string;
    publicHomepageDomainsTitle?: string;
    publicHomepageDomainsDescription?: string;
    publicHomepageProcessTitle?: string;
    publicHomepageProcessDescription?: string;
    publicHomepageInfrastructureTitle?: string;
    publicHomepageInfrastructureDescription?: string;
    publicHomepageFaqTitle?: string;
    publicHomepageFaqDescription?: string;
    publicHomepageSectionOrder?: string;
    publicHomepageCtaEyebrow?: string;
    publicHomepageCtaTitle?: string;
    publicHomepageCtaDescription?: string;
    publicHomepageCtaPrimaryText?: string;
    publicHomepageCtaPrimaryHref?: string;
    publicHomepageCtaSecondaryText?: string;
    publicHomepageCtaSecondaryHref?: string;
    publicHomepageShowSearch?: boolean;
    publicHomepageShowStats?: boolean;
    publicHomepageShowFeatures?: boolean;
    publicHomepageShowDomains?: boolean;
    publicHomepageShowProcess?: boolean;
    publicHomepageShowInfrastructure?: boolean;
    publicHomepageShowFaq?: boolean;
    publicHomepageShowCta?: boolean;
    publicHomepageSearchPlaceholder?: string;
    publicHomepageSearchButtonText?: string;
    publicNavShowHome?: boolean;
    publicNavShowAvailable?: boolean;
    publicNavShowKnowledge?: boolean;
    publicNavShowFeatured?: boolean;
    publicNavShowNavigation?: boolean;
    publicNavHomeLabel?: string;
    publicNavAvailableLabel?: string;
    publicNavKnowledgeLabel?: string;
    publicNavFeaturedLabel?: string;
    publicNavNavigationLabel?: string;
    publicBrandTitle?: string;
    publicHeaderShowBrand?: boolean;
    publicHeaderShowLanguage?: boolean;
    publicHeaderShowAccountActions?: boolean;
    publicHeaderDashboardText?: string;
    publicHeaderLoginText?: string;
    publicHeaderRegisterText?: string;
    publicDomainCheckEmptyText?: string;
    publicDomainCheckCheckingText?: string;
    publicDomainCheckAvailableText?: string;
    publicDomainCheckUnavailableText?: string;
    publicDomainCheckFailureText?: string;
    publicDomainCheckApplyText?: string;
    publicDomainCheckRegisterApplyText?: string;
    publicHomepageShowBadge?: boolean;
    publicHomepageShowHighlight?: boolean;
    publicHomepageShowDescription?: boolean;
    publicHomepageShowPrimaryButton?: boolean;
    publicHomepageShowSecondaryButton?: boolean;
    publicHomepageStatsShowUsers?: boolean;
    publicHomepageStatsShowDomains?: boolean;
    publicHomepageStatsShowDns?: boolean;
    publicHomepageStatsShowSuffixes?: boolean;
    publicHomepageFeature1Show?: boolean;
    publicHomepageFeature1Icon?: string;
    publicHomepageFeature1Title?: string;
    publicHomepageFeature1Description?: string;
    publicHomepageFeature2Show?: boolean;
    publicHomepageFeature2Icon?: string;
    publicHomepageFeature2Title?: string;
    publicHomepageFeature2Description?: string;
    publicHomepageFeature3Show?: boolean;
    publicHomepageFeature3Icon?: string;
    publicHomepageFeature3Title?: string;
    publicHomepageFeature3Description?: string;
    publicHomepageFeature4Show?: boolean;
    publicHomepageFeature4Icon?: string;
    publicHomepageFeature4Title?: string;
    publicHomepageFeature4Description?: string;
    publicHomepageFeature5Show?: boolean;
    publicHomepageFeature5Icon?: string;
    publicHomepageFeature5Title?: string;
    publicHomepageFeature5Description?: string;
    publicHomepageFeature6Show?: boolean;
    publicHomepageFeature6Icon?: string;
    publicHomepageFeature6Title?: string;
    publicHomepageFeature6Description?: string;
    publicHomepageDomainsLimit?: number;
    publicHomepageDomainsStatusText?: string;
    publicHomepageDomainsLinkText?: string;
    publicHomepageDomainsViewAllText?: string;
    publicHomepageFaqLimit?: number;
    publicHomepageFaqViewAllText?: string;
    publicHomepageCtaShowPrimaryButton?: boolean;
    publicHomepageCtaShowSecondaryButton?: boolean;
    publicAvailableShowHero?: boolean;
    publicAvailableShowSearchDescription?: boolean;
    publicAvailableEmptySuffixesText?: string;
    publicKnowledgeShowHero?: boolean;
    publicKnowledgeShowSearch?: boolean;
    publicKnowledgeShowCategorySubtitle?: boolean;
    publicKnowledgeNoResultsText?: string;
    publicFeaturedShowHero?: boolean;
    publicFeaturedShowCardBadge?: boolean;
    publicFeaturedShowCardStatus?: boolean;
    publicFeaturedShowCardButton?: boolean;
    publicFeaturedEmptyText?: string;
    publicNavigationShowHero?: boolean;
    publicNavigationShowBackButton?: boolean;
    publicNavigationShowDescriptions?: boolean;
    publicNavigationShowNumbers?: boolean;
    publicNavigationShowArrows?: boolean;
    publicFooterEnabled?: boolean;
    publicFooterShowBrand?: boolean;
    publicFooterServicesTitle?: string;
    publicFooterInfoTitle?: string;
    publicFooterStartTitle?: string;
    publicFooterCopyrightText?: string;
    publicFooterShowIcp?: boolean;
    publicAvailableBadge?: string;
    publicAvailableTitle?: string;
    publicAvailableDescription?: string;
    publicAvailableSearchEyebrow?: string;
    publicAvailableSearchTitle?: string;
    publicAvailableSearchDescription?: string;
    publicAvailableSearchPlaceholder?: string;
    publicAvailableSearchButtonText?: string;
    publicAvailableShowGuide?: boolean;
    publicAvailableGuideAvailableTitle?: string;
    publicAvailableGuideAvailableText?: string;
    publicAvailableGuideUnavailableTitle?: string;
    publicAvailableGuideUnavailableText?: string;
    publicKnowledgeBadge?: string;
    publicKnowledgeTitle?: string;
    publicKnowledgeDescription?: string;
    publicKnowledgeSearchPlaceholder?: string;
    publicKnowledgeShowArticleCount?: boolean;
    publicFeaturedBadge?: string;
    publicFeaturedTitle?: string;
    publicFeaturedDescription?: string;
    publicFeaturedCardBadgeText?: string;
    publicFeaturedCardStatusText?: string;
    publicFeaturedCardButtonText?: string;
    publicFeaturedCardFallbackDescription?: string;
    publicFeaturedShowQueryHelper?: boolean;
    publicFeaturedQueryTitle?: string;
    publicFeaturedQueryDescription?: string;
    publicFeaturedQueryButtonText?: string;
    publicNavigationBadge?: string;
    publicNavigationTitle?: string;
    publicNavigationDescription?: string;
    publicNavigationBackText?: string;
    publicNavigationGroupStart?: string;
    publicNavigationGroupTools?: string;
    publicNavigationGroupUser?: string;
    publicNavigationGroupRequirements?: string;
    publicFooterSubtitle?: string;
    publicFooterShowPowered?: boolean;
    notFoundText?: string;
    defaultLanguage?: string;
    showQuota?: boolean;
    showExpiryReminder?: boolean;
  };
  registration: {
    enabled: boolean;
    autoActivate: boolean;
    blockTempEmail?: boolean;
    maxAccountsPerIp?: number;
    ipRegisterCooldownMinutes?: number;
    turnstileRegisterEnabled?: boolean;
    defaultStatus?: 'auto' | 'manual';
    disabledMessage?: string;
    turnstileSiteKey?: string;
    turnstileSecret?: string;
    humanVerificationMode?: 'image' | 'turnstile' | 'turnstile_fallback';
    captchaBackgroundEnabled?: boolean;
    captchaBackgroundMode?: 'random' | 'upload';
    captchaBackgroundImage?: string;
    captchaNoiseLinesEnabled?: boolean;
    captchaNoiseLinesMin?: number;
    captchaNoiseLinesMax?: number;
    captchaNoiseLineColorMode?: 'random' | 'fixed';
    captchaNoiseLineFixedColor?: string;
    captchaCharset?: string;
    captchaLength?: number;
    emailDomainBlacklist?: string;
    emailVerificationEnabled?: boolean;
    emailApiKey?: string;
    emailFrom?: string;
    emailFromName?: string;
    emailCodeExpiryMinutes?: number;
    emailCodeLength?: number;
    emailCodeCharset?: string;
    emailAllowedEnvironments?: string;
    emailRegistrationSceneEnabled?: boolean;
    emailTestSceneEnabled?: boolean;
    emailFixedRecipients?: string;
    emailRegistrationRecipientMode?: 'user' | 'user_bcc_fixed';
    emailTestRecipientMode?: 'manual' | 'admin' | 'fixed';
    cloudflareEmailAccountId?: string;
    cloudflareEmailApiToken?: string;
    cloudflareAdminRecipient?: string;
    cloudflareVerifiedRecipients?: string[];
    cloudflareRecipientsSyncedAt?: string;
    emailRegistrationSubjectTemplate?: string;
    emailRegistrationTextTemplate?: string;
    emailRegistrationHtmlTemplate?: string;
    emailTestSubjectTemplate?: string;
    emailTestTextTemplate?: string;
    emailTestHtmlTemplate?: string;
    dailyDomainApplyLimit?: number;
    failedRegisterBanThreshold?: number;
    failedRegisterBanMinutes?: number;
    blockVpnProxy?: boolean;
    requireRegistrationKey?: boolean;
  };
  domain: {
    defaultQuota: number;
    validDays: number;
    renewWindowDays: number;
    allowUserDeleteInvalid: boolean;
    allowDnsEditAfterApproved: boolean;
    prefixMinLength?: number;
    prefixMaxLength?: number;
    prefixBlacklistText?: string;
    allowNumericPrefix?: boolean;
    allowUnderscorePrefix?: boolean;
    selfRenewEnabled?: boolean;
    expiryReminderDays?: number;
    expiredDnsCleanupDays?: number;
    allowUserDeleteActive?: boolean;
    allowDomainTransfer?: boolean;
    maxDnsRecordsPerDomain?: number;
    approvalMode?: 'manual' | 'auto' | 'risk';
    platformMaxDomains?: number;
    normalUserQuota?: number;
    normalUserValidDays?: number;
    whitelistUserQuota?: number;
    whitelistUserValidDays?: number;
    lockAfterExpireDays?: number;
    hardDeleteAfterExpireDays?: number;
    blockedPrefixText?: string;
    adminOnlyPrefixText?: string;
  };
  help: {
    categories: HelpCategorySetting[];
  };
  dns: {
    envManaged: boolean;
    reservedPrefixes: string[];
    defaultProxied?: boolean;
    allowMxRecords?: boolean;
    cfApiToken?: string;
    blockWildcardRecords?: boolean;
    cnameTargetBlacklist?: string;
    recordTypePolicies: DnsRecordTypePolicy[];
    suffixes: Array<{
      label: string;
      suffix: string;
      suffixAscii: string;
      zoneId: string;
      allowedTypes: string[];
      defaultType: DnsRecordType;
      ttl: number;
      proxied: boolean;
      enabled: boolean;
      allowRegister?: boolean;
      registerOrder?: number;
      cfApiToken?: string;
    }>;
  };
  blacklist?: {
    prefixes: string[];
    ips: string[];
    emails: string[];
    registration?: unknown[];
    access?: unknown[];
    userIds?: unknown[];
  };
  notification?: {
    events: Record<string, boolean>;
    expiryTemplate: string;
    templates?: Record<string, string>;
    userTargets?: Record<string, string>;
    adminTargets?: Record<string, string>;
    rateLimitPerHour?: number;
  };
  security?: {
    adminSessionTimeoutHours: number;
    adminIpWhitelist: string;
    auditRetentionDays: number;
    failedLoginLockThreshold?: number;
    failedLoginLockMinutes?: number;
    adminPath?: string;
    rolesPermissions?: string;
    auditRecordItems?: string;
  };
  automation?: {
    enabled: boolean;
    scanCycleMinutes: number;
    checkExpiringDomains: boolean;
    cleanupExpiredDns: boolean;
    cronExpression?: string;
    notifyAdminOnFailure?: boolean;
    dnsCleanupProtectionDays?: number;
    taskLogs?: unknown[];
  };
}

const DAY = 24 * 60 * 60 * 1000;
const SETTINGS_KEY = 'app_settings_v4';

class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      const message = error instanceof Error && error.message ? error.message : '服务器内部错误';
      ctx.waitUntil(notifySystemExceptionByCloudflare(env, request, error).catch(notifyError => {
        console.error('system exception email failed', notifyError);
      }));
      return json({ ok: false, code: 'INTERNAL_ERROR', message }, 500);
    }
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const method = request.method.toUpperCase();
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/public/config') return publicConfigHandler(env);
  if (method === 'GET' && pathname === '/api/public/stats') return publicStatsHandler(env);
  if (method === 'POST' && pathname === '/api/public/domain-check') return publicDomainCheckHandler(request, env);

  if (method === 'POST' && pathname === '/api/setup/bootstrap') return bootstrapAdmin(request, env);

  if (method === 'POST' && pathname === '/api/auth/login') return login(request, env);
  if (method === 'POST' && pathname === '/api/auth/register') return register(request, env);
  if (method === 'POST' && pathname === '/api/auth/email-verification/send') return sendRegistrationEmailCode(request, env);
  if (method === 'POST' && pathname === '/api/auth/captcha/challenge') return createImageCaptchaChallenge(request, env);
  if (method === 'POST' && pathname === '/api/auth/logout') return logout(request, env);
  if (method === 'GET' && pathname === '/api/auth/me') return authMe(request, env);
  if (method === 'POST' && pathname === '/api/auth/change-password') return changeOwnPassword(request, env);
  if (method === 'PATCH' && pathname === '/api/account/profile') return updateOwnProfile(request, env);
  if (method === 'POST' && pathname === '/api/account/delete') return deleteOwnAccount(request, env);
  if (method === 'GET' && pathname === '/api/account/devices') return listOwnLoginDevices(request, env);

  if (method === 'GET' && pathname === '/api/applications') return listOwnApplications(request, env);
  if (method === 'POST' && pathname === '/api/applications/check-availability') return checkDomainAvailability(request, env);
  if (method === 'POST' && pathname === '/api/applications') return createApplication(request, env);

  let match = pathname.match(/^\/api\/applications\/([^/]+)$/);
  if (match && method === 'GET') return getOwnApplication(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return deleteOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/dns$/);
  if (match && method === 'PATCH') return updateOwnDns(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/dns-records$/);
  if (match && method === 'GET') return listOwnDnsRecords(request, env, decodeURIComponent(match[1]));
  if (match && method === 'POST') return createOwnDnsRecord(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/dns-records\/([^/]+)$/);
  if (match && method === 'PATCH') return updateOwnDnsRecordManaged(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return deleteOwnDnsRecordManaged(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/renew$/);
  if (match && method === 'POST') return renewOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/delete-request$/);
  if (match && method === 'POST') return requestDeleteOwnApplication(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/applications\/([^/]+)\/delete-request\/cancel$/);
  if (match && method === 'POST') return cancelDeleteOwnApplication(request, env, decodeURIComponent(match[1]));

  if (method === 'GET' && pathname === '/api/messages') return listOwnMessages(request, env);
  if (method === 'POST' && pathname === '/api/messages/contact-admin') return contactAdminMessage(request, env);

  if (method === 'GET' && pathname === '/api/support/tickets') return listSupportTickets(request, env, url);
  if (method === 'POST' && pathname === '/api/support/tickets') return createSupportTicket(request, env);
  match = pathname.match(/^\/api\/support\/tickets\/([^/]+)$/);
  if (match && method === 'GET') return getSupportTicket(request, env, decodeURIComponent(match[1]));
  if (match && method === 'PATCH') return updateSupportTicket(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/support\/tickets\/([^/]+)\/replies$/);
  if (match && method === 'POST') return replySupportTicket(request, env, decodeURIComponent(match[1]));
  if (method === 'POST' && pathname === '/api/messages/read-batch') return markOwnMessagesReadBatch(request, env);
  if (method === 'POST' && pathname === '/api/messages/delete-batch') return deleteOwnMessagesBatch(request, env);
  match = pathname.match(/^\/api\/messages\/([^/]+)\/reply$/);
  if (match && method === 'POST') return replyOwnMessage(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/messages\/([^/]+)\/withdraw$/);
  if (match && method === 'POST') return withdrawOwnMessage(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/messages\/([^/]+)\/read$/);
  if (match && method === 'POST') return markOwnMessageRead(request, env, decodeURIComponent(match[1]));

  if (method === 'GET' && pathname === '/api/operation-logs') return listOperationLogs(request, env);
  if (method === 'POST' && pathname === '/api/operation-logs/delete-batch') return deleteOperationLogsBatch(request, env);

  if (method === 'GET' && pathname === '/api/admin/overview') return adminOverview(request, env);
  if (method === 'GET' && pathname === '/api/admin/analytics') return adminAnalytics(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/applications') return adminApplications(request, env, url);
  if (method === 'GET' && pathname === '/api/admin/users') return adminUsers(request, env);
  if (method === 'POST' && pathname === '/api/admin/users') return adminCreateUser(request, env);
  if (method === 'GET' && pathname === '/api/admin/registration-keys') return adminListRegistrationKeys(request, env);
  if (method === 'POST' && pathname === '/api/admin/registration-keys') return adminCreateRegistrationKey(request, env);
  if (method === 'GET' && pathname === '/api/admin/messages') return adminListMessages(request, env, url);
  if (method === 'POST' && pathname === '/api/admin/messages') return adminCreateMessage(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings') return adminSettings(request, env);
  if (method === 'GET' && pathname === '/api/admin/system-status') return adminSystemStatus(request, env);
  if (method === 'GET' && pathname === '/api/admin/settings/export') return adminExportSettings(request, env);
  if (method === 'POST' && pathname === '/api/admin/settings/import') return adminImportSettings(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/test') return adminTestCloudflareApi(request, env);
  if (method === 'POST' && pathname === '/api/admin/email/test') return adminTestEmailDelivery(request, env);
  if (method === 'POST' && pathname === '/api/admin/email/cloudflare-addresses/sync') return adminSyncCloudflareEmailAddresses(request, env);
  if (method === 'GET' && pathname === '/api/admin/worker-variables') return adminListManagedWorkerVariables(request, env);
  if (method === 'POST' && pathname === '/api/admin/worker-variables') return adminUpdateManagedWorkerVariable(request, env);
  if (method === 'DELETE' && pathname === '/api/admin/worker-variables') return adminDeleteManagedWorkerVariable(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/sync-allowed-types') return adminSyncDnsAllowedTypesFromWorker(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/discover-existing') return adminDiscoverExistingDns(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/import-existing') return adminImportExistingDns(request, env);
  if (method === 'POST' && pathname === '/api/admin/dns/unlink-domains') return adminUnlinkDomains(request, env);

  match = pathname.match(/^\/api\/admin\/registration-keys\/([^/]+)$/);
  if (match && method === 'DELETE') return adminDeleteRegistrationKey(request, env, decodeURIComponent(match[1]));
  match = pathname.match(/^\/api\/admin\/registration-keys\/([^/]+)\/usages$/);
  if (match && method === 'GET') return adminRegistrationKeyUsages(request, env, decodeURIComponent(match[1]));
  if (method === 'GET' && pathname === '/api/admin/help-settings') return adminHelpSettings(request, env);
  if (method === 'PUT' && pathname === '/api/admin/help-settings') return adminUpdateHelpSettings(request, env);

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateMessage(request, env, decodeURIComponent(match[1]));
  if (match && method === 'DELETE') return adminDeleteMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/messages\/([^/]+)\/send$/);
  if (match && method === 'POST') return adminSendMessage(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/settings\/(site|registration|domain|dns|blacklist|notification|security|automation)$/);
  if (match && method === 'PUT') return adminUpdateSettings(request, env, match[1] as AdminSettingGroup);

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (match && method === 'PATCH') return adminUpdateUser(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/devices$/);
  if (match && method === 'GET') return adminUserLoginDevices(request, env, decodeURIComponent(match[1]));

  match = pathname.match(/^\/api\/admin\/applications\/([^/]+)\/(approve|reject|revoke|disable|enable|control|uncontrol|delete|approve-delete|reject-delete)$/);
  if (match && method === 'POST') return adminReviewApplication(request, env, decodeURIComponent(match[1]), match[2]);

  throw new HttpError(404, 'NOT_FOUND', '接口不存在');
}

async function ensureSchema(env: Env): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        phone TEXT,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'active',
        domain_quota INTEGER NOT NULL DEFAULT 3,
        permissions_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login_at TEXT
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        ip TEXT,
        user_agent TEXT,
        device_name TEXT,
        device_type TEXT,
        device_model TEXT,
        first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS domain_applications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        prefix_unicode TEXT NOT NULL,
        prefix_ascii TEXT NOT NULL,
        suffix_unicode TEXT NOT NULL,
        suffix_ascii TEXT NOT NULL,
        fqdn_unicode TEXT NOT NULL,
        fqdn_ascii TEXT NOT NULL,
        record_type TEXT DEFAULT 'CNAME',
        record_content TEXT DEFAULT '',
        proxied INTEGER DEFAULT 0,
        ttl INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        review_note TEXT,
        error_message TEXT,
        dns_record_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        reviewed_at TEXT,
        reviewed_by TEXT,
        expires_at TEXT,
        renewed_at TEXT,
        renew_count INTEGER DEFAULT 0,
        deleted_at TEXT,
        delete_requested_at TEXT,
        delete_requested_by TEXT,
        controlled_at TEXT,
        controlled_by TEXT,
        updated_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS dns_records (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        host TEXT NOT NULL DEFAULT '@',
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        priority INTEGER,
        proxied INTEGER DEFAULT 0,
        ttl INTEGER DEFAULT 1,
        cf_record_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(application_id) REFERENCES domain_applications(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS system_messages (
        id TEXT PRIMARY KEY,
        sender_user_id TEXT,
        target_type TEXT NOT NULL DEFAULT 'all',
        target_user_id TEXT,
        target_role TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'info',
        status TEXT NOT NULL DEFAULT 'sent',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT,
        sent_at TEXT,
        deleted_at TEXT,
        FOREIGN KEY(sender_user_id) REFERENCES users(id),
        FOREIGN KEY(target_user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        priority TEXT NOT NULL DEFAULT 'normal',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        client_context_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_reply_at TEXT,
        closed_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS support_ticket_replies (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(ticket_id) REFERENCES support_tickets(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS message_reads (
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        read_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES system_messages(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS user_message_deletions (
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        deleted_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY(message_id, user_id),
        FOREIGN KEY(message_id) REFERENCES system_messages(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        ip TEXT,
        meta_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),

    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_verification_codes (
        email TEXT PRIMARY KEY COLLATE NOCASE,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        sent_at TEXT NOT NULL DEFAULT (datetime('now')),
        ip TEXT
      )
    `),

    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS registration_keys (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        max_uses INTEGER NOT NULL DEFAULT 0,
        used_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `),
    env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS registration_key_usages (
        id TEXT PRIMARY KEY,
        key_id TEXT NOT NULL,
        user_id TEXT,
        username TEXT,
        used_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(key_id) REFERENCES registration_keys(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_apps_user ON domain_applications(user_id, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_apps_fqdn ON domain_applications(fqdn_ascii)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_dns_records_app ON dns_records(application_id, deleted_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_dns_records_cf ON dns_records(cf_record_id)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_status ON system_messages(status, sent_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_target_user ON system_messages(target_type, target_user_id, status)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_messages_target_role ON system_messages(target_type, target_role, status)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_user_message_deletions_user ON user_message_deletions(user_id, deleted_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, updated_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, updated_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket ON support_ticket_replies(ticket_id, created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id, created_at)'),
  ]);

  const alters = [
    `ALTER TABLE sessions ADD COLUMN ip TEXT`,
    `ALTER TABLE sessions ADD COLUMN user_agent TEXT`,
    `ALTER TABLE sessions ADD COLUMN device_name TEXT`,
    `ALTER TABLE sessions ADD COLUMN device_type TEXT`,
    `ALTER TABLE sessions ADD COLUMN device_model TEXT`,
    `ALTER TABLE sessions ADD COLUMN first_seen_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN last_seen_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN expires_at TEXT`,
    `ALTER TABLE sessions ADD COLUMN created_at TEXT`,
    `ALTER TABLE users ADD COLUMN phone TEXT`,
    `ALTER TABLE users ADD COLUMN domain_quota INTEGER NOT NULL DEFAULT 3`,
    `ALTER TABLE users ADD COLUMN permissions_json TEXT DEFAULT '{}'`,
    `ALTER TABLE users ADD COLUMN updated_at TEXT`,
    `ALTER TABLE users ADD COLUMN last_login_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN expires_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN renewed_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN renew_count INTEGER DEFAULT 0`,
    `ALTER TABLE domain_applications ADD COLUMN deleted_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN delete_requested_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN delete_requested_by TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN controlled_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN controlled_by TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN updated_at TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN record_type TEXT DEFAULT 'CNAME'`,
    `ALTER TABLE domain_applications ADD COLUMN record_content TEXT DEFAULT ''`,
    `ALTER TABLE domain_applications ADD COLUMN proxied INTEGER DEFAULT 0`,
    `ALTER TABLE domain_applications ADD COLUMN ttl INTEGER DEFAULT 1`,
    `ALTER TABLE domain_applications ADD COLUMN dns_record_id TEXT`,
    `ALTER TABLE domain_applications ADD COLUMN error_message TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN code TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN role TEXT DEFAULT 'user'`,
    `ALTER TABLE registration_keys ADD COLUMN max_uses INTEGER DEFAULT 0`,
    `ALTER TABLE registration_keys ADD COLUMN used_count INTEGER DEFAULT 0`,
    `ALTER TABLE registration_keys ADD COLUMN expires_at TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN status TEXT DEFAULT 'active'`,
    `ALTER TABLE registration_keys ADD COLUMN created_by TEXT`,
    `ALTER TABLE registration_keys ADD COLUMN created_at TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_registration_keys_code ON registration_keys(code)`,
    `CREATE INDEX IF NOT EXISTS idx_registration_key_usages_key ON registration_key_usages(key_id, used_at)`,
  ];

  for (const sql of alters) {
    try { await env.DB.prepare(sql).run(); } catch {}
  }

  // 兼容旧版 registration_keys 表：旧结构存在 name TEXT NOT NULL，但没有 code 字段。
  try {
    const columns = await registrationKeyColumnNames(env);
    if (columns.has('name') && columns.has('code')) {
      await env.DB.prepare(`UPDATE registration_keys SET code=name WHERE (code IS NULL OR code='') AND name IS NOT NULL`).run();
      await env.DB.prepare(`UPDATE registration_keys SET name=code WHERE (name IS NULL OR name='') AND code IS NOT NULL`).run();
    }
  } catch (error) {
    console.error('registration key schema compatibility failed', error);
  }

  const settings = await loadSettings(env);
  await env.DB.prepare(`
    UPDATE users SET domain_quota=?
    WHERE domain_quota IS NULL OR domain_quota <= 0
  `).bind(settings.domain.defaultQuota).run();

  await env.DB.prepare(`
    UPDATE domain_applications
    SET expires_at = datetime(COALESCE(reviewed_at, created_at), '+' || ? || ' days')
    WHERE (expires_at IS NULL OR expires_at='')
      AND status='approved'
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(settings.domain.validDays).run();

  await cleanupOperationLogs(env);
  await cleanupHardDeletedRows(env);
}

async function cleanupOperationLogs(env: Env): Promise<void> {
  // 操作日志只保留最近 7 天；账号注销或被标记删除后，自动清理该账号相关日志。
  try {
    const settings = await loadSettings(env);
    await env.DB.prepare(`DELETE FROM audit_logs WHERE datetime(created_at) < datetime('now','-' || ? || ' days')`).bind(settings.security?.auditRetentionDays || 7).run();
  } catch (error) { console.error('cleanup old audit logs failed', error); }
  try {
    await env.DB.prepare(`
      DELETE FROM audit_logs
      WHERE actor_user_id IN (SELECT id FROM users WHERE status='deleted')
         OR (target_type='user' AND target_id IN (SELECT id FROM users WHERE status='deleted'))
         OR (actor_user_id IS NOT NULL AND actor_user_id NOT IN (SELECT id FROM users))
         OR (target_type='user' AND target_id IS NOT NULL AND target_id NOT IN (SELECT id FROM users))
    `).run();
  } catch (error) { console.error('cleanup deleted-user audit logs failed', error); }
}


async function cleanupHardDeletedRows(env: Env): Promise<void> {
  // v43：历史软删除数据自动转为硬删除，避免 D1 里长期残留 deleted_at/status=deleted 的脏数据。
  const statements = [
    `DELETE FROM dns_records WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM message_reads WHERE message_id NOT IN (SELECT id FROM system_messages)`,
    `DELETE FROM message_reads WHERE user_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM system_messages WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM dns_records WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM domain_applications WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM message_reads WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM system_messages WHERE sender_user_id IN (SELECT id FROM users WHERE status='deleted') OR target_user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE status='deleted')`,
    `DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE status='deleted') OR (target_type='user' AND target_id IN (SELECT id FROM users WHERE status='deleted'))`,
    `DELETE FROM users WHERE status='deleted'`,
    `DELETE FROM domain_applications WHERE deleted_at IS NOT NULL AND deleted_at!=''`,
    `DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)`,
    `DELETE FROM email_verification_codes WHERE datetime(expires_at) < datetime('now')`,
  ];
  for (const sql of statements) {
    try { await env.DB.prepare(sql).run(); } catch (error) { console.error('cleanup hard deleted rows failed', sql, error); }
  }
}

async function deleteKnownKvKeys(env: Env, keys: string[]): Promise<void> {
  for (const key of keys.filter(Boolean)) {
    try { await env.APP_KV.delete(key); } catch {}
  }
}

async function purgeAuditForTarget(env: Env, targetType: string, targetId: string): Promise<void> {
  try {
    await env.DB.prepare(`DELETE FROM audit_logs WHERE target_type=? AND target_id=?`).bind(targetType, targetId).run();
  } catch {}
}

async function hardDeleteDnsRecordRow(env: Env, recordId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM dns_records WHERE id=?`).bind(recordId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='dns_record' AND target_id=?`).bind(recordId),
  ]);
  await deleteKnownKvKeys(env, [`dns_record:${recordId}`, `dns:${recordId}`]);
}

async function hardDeleteDomainApplication(env: Env, appId: string): Promise<void> {
  const records = await env.DB.prepare(`SELECT id FROM dns_records WHERE application_id=?`).bind(appId).all<{ id: string }>();
  const recordIds = (records.results || []).map(r => r.id);
  const batch = [
    env.DB.prepare(`DELETE FROM dns_records WHERE application_id=?`).bind(appId),
    env.DB.prepare(`DELETE FROM domain_applications WHERE id=?`).bind(appId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='domain_application' AND target_id=?`).bind(appId),
  ];
  for (const recordId of recordIds) {
    batch.push(env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='dns_record' AND target_id=?`).bind(recordId));
  }
  await env.DB.batch(batch);
  await deleteKnownKvKeys(env, [`domain_application:${appId}`, `application:${appId}`, `domain:${appId}`, ...recordIds.flatMap(id => [`dns_record:${id}`, `dns:${id}`])]);
}

async function hardDeleteUser(env: Env, userId: string): Promise<void> {
  const apps = await env.DB.prepare(`SELECT id FROM domain_applications WHERE user_id=?`).bind(userId).all<{ id: string }>();
  const appIds = (apps.results || []).map(a => a.id);
  const records = await env.DB.prepare(`SELECT id FROM dns_records WHERE user_id=? OR application_id IN (SELECT id FROM domain_applications WHERE user_id=?)`).bind(userId, userId).all<{ id: string }>();
  const recordIds = (records.results || []).map(r => r.id);
  const messages = await env.DB.prepare(`SELECT id FROM system_messages WHERE sender_user_id=? OR target_user_id=?`).bind(userId, userId).all<{ id: string }>();
  const messageIds = (messages.results || []).map(m => m.id);

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM user_message_deletions WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id IN (SELECT id FROM system_messages WHERE sender_user_id=? OR target_user_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM user_message_deletions WHERE message_id IN (SELECT id FROM system_messages WHERE sender_user_id=? OR target_user_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM system_messages WHERE sender_user_id=? OR target_user_id=?`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM dns_records WHERE user_id=? OR application_id IN (SELECT id FROM domain_applications WHERE user_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM domain_applications WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(userId),
    env.DB.prepare(`DELETE FROM audit_logs WHERE actor_user_id=? OR (target_type='user' AND target_id=?)`).bind(userId, userId),
    env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(userId),
  ]);

  const kvKeys = [`user:${userId}`, `account:${userId}`];
  for (const appId of appIds) kvKeys.push(`domain_application:${appId}`, `application:${appId}`, `domain:${appId}`);
  for (const recordId of recordIds) kvKeys.push(`dns_record:${recordId}`, `dns:${recordId}`);
  for (const messageId of messageIds) kvKeys.push(`message:${messageId}`, `system_message:${messageId}`);
  await deleteKnownKvKeys(env, kvKeys);
}

async function publicConfigHandler(env: Env): Promise<Response> {
  const settings = await loadSettings(env);
  const adminCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'
  `).first<{ count: number }>();

  return ok({
    config: {
      site: settings.site,
      registration: publicRegistrationSettings(settings.registration),
      domain: settings.domain,
      help: settings.help,
      dnsRecordTypes: settings.dns.recordTypePolicies.map(policy => ({
        type: policy.type,
        displayName: policy.displayName,
        allowUserAdd: policy.allowUserAdd,
        note: policy.note,
      })),
      suffixes: settings.dns.suffixes
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.enabled && item.allowRegister !== false)
        .sort((a, b) => Number(a.item.registerOrder || a.index + 1) - Number(b.item.registerOrder || b.index + 1) || a.index - b.index)
        .map(({ item: x }) => ({
          label: x.label || '',
          suffix: x.suffix,
          allowedTypes: x.allowedTypes,
          defaultType: x.defaultType,
          ttl: x.ttl,
          proxied: x.proxied,
          registerOrder: Number(x.registerOrder || 0),
        })),
      turnstile: turnstilePublicConfig(env, settings),
      needsBootstrap: Number(adminCount?.count || 0) === 0,
    },
  });
}


async function publicStatsHandler(env: Env): Promise<Response> {
  const settings = await loadSettings(env);
  const users = await env.DB.prepare(`SELECT COUNT(*) AS count FROM users WHERE status='active'`).first<{ count: number }>();
  const domains = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).first<{ count: number }>();
  const dnsRecords = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM dns_records
    WHERE (deleted_at IS NULL OR deleted_at='') AND status!='deleted'
  `).first<{ count: number }>();
  const suffixes = settings.dns.suffixes.filter(item => item.enabled && item.allowRegister !== false).length;
  return ok({ stats: {
    users: Number(users?.count || 0),
    domains: Number(domains?.count || 0),
    dnsRecords: Number(dnsRecords?.count || 0),
    suffixes,
  }});
}

async function publicDomainCheckHandler(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'public-domain-check', 90, 3600);
  const body = await readJson<Record<string, unknown>>(request, 16 * 1024);
  const settings = await loadSettings(env);
  const prefix = normalizePrefix(body.prefix);
  const p = prefix.unicode;
  const minLen = settings.domain.prefixMinLength || 2;
  const maxLen = settings.domain.prefixMaxLength || 36;
  if (p.length < minLen || p.length > maxLen) {
    return ok({ available:false, registered:false, message:`域名前缀长度必须为 ${minLen}-${maxLen} 位。` });
  }
  if (!settings.domain.allowUnderscorePrefix && p.includes('_')) {
    return ok({ available:false, registered:false, message:'当前不允许使用下划线前缀。' });
  }
  if (!settings.domain.allowNumericPrefix && /^\d+$/.test(p)) {
    return ok({ available:false, registered:false, message:'当前不允许使用纯数字前缀。' });
  }

  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(item => item.enabled && item.allowRegister !== false && (item.suffix === suffixInput || item.suffixAscii === suffixInput));
  if (!suffix) return ok({ available:false, registered:false, message:'该根域名当前不可申请。' });

  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  const blacklistRules = [
    ...sanitizeStringList(settings.domain.prefixBlacklistText || ''),
    ...sanitizeStringList(settings.domain.blockedPrefixText || ''),
    ...(settings.blacklist?.prefixes || []),
  ];
  const adminOnlyRules = sanitizeStringList(settings.domain.adminOnlyPrefixText || '');
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii)
    || prefixMatchesRule(prefix.unicode, blacklistRules) || prefixMatchesRule(prefix.ascii, blacklistRules)
    || prefixMatchesRule(prefix.unicode, adminOnlyRules) || prefixMatchesRule(prefix.ascii, adminOnlyRules)) {
    return ok({ available:false, registered:false, message:'该域名不可注册。' });
  }

  const fqdnUnicode = `${prefix.unicode}.${suffix.suffix}`;
  const fqdnAscii = `${prefix.ascii}.${suffix.suffixAscii}`;
  const duplicate = await env.DB.prepare(`
    SELECT id FROM domain_applications
    WHERE fqdn_ascii=? COLLATE NOCASE
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(fqdnAscii).first<{ id: string }>();
  if (duplicate) return ok({ available:false, registered:true, fqdnUnicode, fqdnAscii, message:'此域名已注册。' });

  const token = resolveDnsToken(env, settings, suffix);
  let cloudflareChecked = false;
  if (token && suffix.zoneId) {
    cloudflareChecked = true;
    try {
      const remoteRecords = await listCloudflareDnsRecordsByName(token, suffix.zoneId, fqdnAscii);
      if (remoteRecords.length) return ok({ available:false, registered:true, fqdnUnicode, fqdnAscii, cloudflareChecked, message:'此域名已注册。' });
    } catch (error) {
      console.error('public domain availability cloudflare check failed', error);
      throw new HttpError(502, 'PUBLIC_DOMAIN_CHECK_FAILED', '暂时无法确认该域名状态，请稍后重试。');
    }
  }

  return ok({ available:true, registered:false, fqdnUnicode, fqdnAscii, cloudflareChecked, message:'此域名可注册。' });
}

async function bootstrapAdmin(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'bootstrap', 5, 900);
  const body = await readJson<Record<string, unknown>>(request);
  const existing = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status!='deleted'
  `).first<{ count: number }>();

  if (Number(existing?.count || 0) > 0) throw new HttpError(409, 'ALREADY_BOOTSTRAPPED', '管理员已初始化');
  if (!env.BOOTSTRAP_ADMIN_TOKEN || String(body.setupToken || '') !== env.BOOTSTRAP_ADMIN_TOKEN) {
    throw new HttpError(403, 'INVALID_SETUP_TOKEN', '初始化令牌不正确');
  }

  const settings = await loadSettings(env);
  const username = normalizeUsername(body.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
  const password = validatePassword(body.password);
  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?, ?)
  `).bind(id, username, email, hash, salt, settings.domain.defaultQuota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, id, 'setup.bootstrap_admin', 'user', id);
  const cookie = await createSession(env, request, id, false);
  return withCookie(ok({ user: serializeUser({
    id, username, email, password_hash: '', password_salt: '', role: 'admin', status: 'active',
    domain_quota: settings.domain.defaultQuota, permissions_json: '{}', created_at: new Date().toISOString(),
  }) }), cookie);
}

async function register(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'register', 10, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const ip = clientIp(request);

  if ((settings.blacklist?.ips || []).includes(ip)) throw new HttpError(403, 'IP_BLOCKED', '当前 IP 已被禁止注册');
  if (!settings.registration.enabled) throw new HttpError(403, 'REGISTER_CLOSED', settings.registration.disabledMessage || '当前暂未开放用户注册');

  const adminCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM users WHERE role='admin' AND status='active'
  `).first<{ count: number }>();
  if (Number(adminCount?.count || 0) < 1) throw new HttpError(503, 'SETUP_REQUIRED', '系统尚未完成管理员初始化');
  // 用户注册默认开放；前端注册入口不再因为历史 KV 设置关闭而失效。

  await verifyHumanChallenge(env, request, body, 'register', env.TURNSTILE_ACTION_REGISTER || 'register');

  const username = normalizeUsername(body.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
  if (settings.registration.emailVerificationEnabled && !email) {
    throw new HttpError(400, 'EMAIL_REQUIRED', '已开启注册邮箱验证，请填写邮箱');
  }
  if (email && settings.registration.blockTempEmail && isTempEmailDomain(email)) throw new HttpError(400, 'TEMP_EMAIL_BLOCKED', '不允许使用临时邮箱注册');
  const emailDomain = email && email.includes('@') ? email.split('@').pop() || '' : '';
  const blockedEmailDomains = sanitizeStringList(settings.registration.emailDomainBlacklist || '');
  if (emailDomain && blockedEmailDomains.some(d => emailDomain.toLowerCase() === d.toLowerCase().replace(/^@/, ''))) throw new HttpError(403, 'EMAIL_DOMAIN_BLOCKED', '该邮箱后缀已被禁止注册');
  if (email && listMatches(email, settings.blacklist?.emails || [])) throw new HttpError(403, 'EMAIL_BLOCKED', '该邮箱已被禁止注册');
  if (phone && listMatches(phone, settings.blacklist?.emails || [])) throw new HttpError(403, 'PHONE_BLOCKED', '该手机号已被禁止注册');

  let registrationKey: { id: string; role?: string | null } | null = null;
  if (settings.registration.requireRegistrationKey) {
    registrationKey = await validateRegistrationKey(env, body.registrationCode);
  }

  if (settings.registration.maxAccountsPerIp && settings.registration.maxAccountsPerIp > 0) {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM audit_logs WHERE action='auth.register' AND ip=?`).bind(ip).first<{ count: number }>();
    if (Number(count?.count || 0) >= settings.registration.maxAccountsPerIp) throw new HttpError(429, 'IP_REGISTER_LIMIT', '当前 IP 注册账号数量已达到上限');
  }
  if (settings.registration.ipRegisterCooldownMinutes && settings.registration.ipRegisterCooldownMinutes > 0) {
    const recent = await env.DB.prepare(`SELECT created_at FROM audit_logs WHERE action='auth.register' AND ip=? ORDER BY datetime(created_at) DESC LIMIT 1`).bind(ip).first<{ created_at: string }>();
    const last = parseDate(recent?.created_at);
    if (last && Date.now() - last.getTime() < settings.registration.ipRegisterCooldownMinutes * 60 * 1000) throw new HttpError(429, 'IP_REGISTER_COOLDOWN', '当前 IP 注册过于频繁，请稍后再试');
  }

  const password = validatePassword(body.password);
  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE
      OR (? IS NOT NULL AND email=? COLLATE NOCASE)
      OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号、邮箱或手机号已被使用');

  const emailVerificationKey = settings.registration.emailVerificationEnabled && email
    ? await verifyRegistrationEmailCode(env, email, body.emailVerificationCode)
    : '';

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const status = settings.registration.defaultStatus === 'manual' ? 'disabled' : (settings.registration.autoActivate ? 'active' : 'disabled');

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, phone, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?, ?)
  `).bind(id, username, email, phone, hash, salt, status, settings.domain.defaultQuota, JSON.stringify({ canApply: true })).run();

  if (registrationKey) await consumeRegistrationKey(env, registrationKey.id, id, username);
  if (emailVerificationKey) await env.DB.prepare(`DELETE FROM email_verification_codes WHERE email=? COLLATE NOCASE`).bind(emailVerificationKey).run().catch(() => undefined);

  await audit(env, request, id, 'auth.register', 'user', id, { status, registrationKeyId: registrationKey?.id || null, emailVerified: Boolean(emailVerificationKey) });

  // 注册接口只负责创建账户，不再自动创建登录会话。
  // 这样即使旧数据库 sessions 表结构不一致，也不会出现“用户已创建但注册提示失败”。
  return ok({ registered: true, pendingActivation: status !== 'active' });
}

type LoginLockState = { count: number; lockedUntil: number };

async function readLoginLockState(env: Env, key: string): Promise<LoginLockState> {
  try {
    const raw = await env.APP_KV.get(key);
    if (!raw) return { count: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LoginLockState>;
    return { count: Math.max(0, Number(parsed.count || 0)), lockedUntil: Math.max(0, Number(parsed.lockedUntil || 0)) };
  } catch { return { count: 0, lockedUntil: 0 }; }
}

async function registerLoginFailure(env: Env, key: string, threshold: number, lockMinutes: number): Promise<void> {
  if (threshold <= 0 || lockMinutes <= 0) return;
  const current = await readLoginLockState(env, key);
  const count = current.count + 1;
  const lockedUntil = count >= threshold ? Date.now() + lockMinutes * 60000 : 0;
  await env.APP_KV.put(key, JSON.stringify({ count: lockedUntil ? 0 : count, lockedUntil }), { expirationTtl: Math.max(300, lockMinutes * 60 + 3600) });
}

async function login(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'login', 20, 600);
  const body = await readJson<Record<string, unknown>>(request);
  const identity = String(body.identity || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!identity || !password) throw new HttpError(400, 'MISSING_CREDENTIALS', '请输入用户名/邮箱和密码');

  const loginSettings = await loadSettings(env);
  const lockKey = `login_lock:${await sha256(`${identity}|${clientIp(request)}`)}`;
  const lockState = await readLoginLockState(env, lockKey);
  if (lockState.lockedUntil > Date.now()) {
    const waitMinutes = Math.max(1, Math.ceil((lockState.lockedUntil - Date.now()) / 60000));
    throw new HttpError(429, 'LOGIN_TEMP_LOCKED', `登录失败次数过多，请 ${waitMinutes} 分钟后再试`);
  }

  await verifyHumanChallenge(env, request, body, 'login', env.TURNSTILE_ACTION_LOGIN || 'login');

  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE (username=? COLLATE NOCASE OR email=? COLLATE NOCASE OR phone=? COLLATE NOCASE) LIMIT 1
  `).bind(identity, identity, identity).first<UserRow>();

  let passwordOk = false;
  if (user) {
    try {
      passwordOk = await verifyPassword(password, user.password_hash, user.password_salt);
    } catch (error) {
      console.error('password verify failed', error);
      passwordOk = false;
    }
  }

  if (!user || !passwordOk) {
    await registerLoginFailure(env, lockKey, loginSettings.security?.failedLoginLockThreshold || 0, loginSettings.security?.failedLoginLockMinutes || 0);
    await audit(env, request, user?.id || null, 'auth.login_failed', 'user', user?.id || null, { identity });
    throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码错误');
  }
  await env.APP_KV.delete(lockKey).catch(() => undefined);
  const accountDisabled = user.status !== 'active';
  if (user.role === 'admin' && accountDisabled) {
    throw new HttpError(403, 'ACCOUNT_DISABLED', '管理员账户已被禁用');
  }
  if (user.role === 'admin') {
    const allowedIps = sanitizeStringList(loginSettings.security?.adminIpWhitelist || '');
    if (allowedIps.length && !allowedIps.includes(clientIp(request))) {
      await audit(env, request, user.id, 'auth.login_failed', 'user', user.id, { identity, reason: 'admin ip blocked' });
      throw new HttpError(403, 'ADMIN_IP_BLOCKED', '当前 IP 不在管理员登录白名单内');
    }
  }

  try {
    await env.DB.prepare(`
      UPDATE users SET last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?
    `).bind(user.id).run();
  } catch (error) {
    try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN last_login_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN updated_at TEXT`).run(); } catch {}
    try {
      await env.DB.prepare(`
        UPDATE users SET last_login_at=datetime('now'), updated_at=datetime('now') WHERE id=?
      `).bind(user.id).run();
    } catch (inner) {
      console.error('login timestamp update failed', inner);
    }
  }

  const cookie = await createSession(env, request, user.id, Boolean(body.remember));
  await audit(env, request, user.id, 'auth.login', 'user', user.id);
  return withCookie(ok({ user: serializeUser(user), accountDisabled, message: accountDisabled ? '你的账户已被禁用' : '' }), cookie);
}

async function logout(request: Request, env: Env): Promise<Response> {
  const user = await getAuthUser(env, request);
  const cookie = await destroySession(env, request);
  if (user) await audit(env, request, user.id, 'auth.logout', 'user', user.id);
  return withCookie(ok({ loggedOut: true }), cookie);
}

async function authMe(request: Request, env: Env): Promise<Response> {
  const user = await getAuthUser(env, request);
  return ok({ user: user ? serializeUser(user) : null });
}


async function updateOwnProfile(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);

  const username = normalizeUsername(body.username ?? user.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);

  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE id!=?
      AND (
        username=? COLLATE NOCASE
        OR (? IS NOT NULL AND email=? COLLATE NOCASE)
        OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
      )
    LIMIT 1
  `).bind(user.id, username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '用户名、邮箱或手机号已被使用');

  await env.DB.prepare(`
    UPDATE users SET username=?, email=?, phone=?, updated_at=datetime('now') WHERE id=?
  `).bind(username, email, phone, user.id).run();

  await audit(env, request, user.id, 'account.profile_update', 'user', user.id, { username, email, phone: phone ? 'set' : 'empty' });
  const updated = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(user.id).first<UserRow>();
  return ok({ user: serializeUser(updated!) });
}

async function changeOwnPassword(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const currentPassword = String(body.currentPassword || '');
  const newPassword = validatePassword(body.newPassword);

  const row = await env.DB.prepare(`
    SELECT password_hash,password_salt FROM users WHERE id=?
  `).bind(user.id).first<{ password_hash: string; password_salt: string }>();

  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash=?,password_salt=?,updated_at=datetime('now') WHERE id=?`).bind(hash, salt, user.id),
    env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(user.id),
  ]);
  await audit(env, request, user.id, 'auth.password_changed', 'user', user.id);

  return withCookie(ok({ changed: true }), await destroySession(env, request));
}

async function listOwnLoginDevices(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const devices = await listLoginDevicesForUser(env, user.id);
  return ok({ count: devices.length, devices });
}

async function adminUserLoginDevices(request: Request, env: Env, userId: string): Promise<Response> {
  await requireAdmin(env, request);
  const user = await env.DB.prepare(`SELECT id,username,email,role,status FROM users WHERE id=? AND status!='deleted'`).bind(userId).first<any>();
  if (!user) throw new HttpError(404, 'USER_NOT_FOUND', '用户不存在');
  const devices = await listLoginDevicesForUser(env, userId);
  return ok({ user: serializeUser(user), count: devices.length, devices });
}

async function listLoginDevicesForUser(env: Env, userId: string) {
  const rows = await env.DB.prepare(`
    SELECT id, ip, user_agent, device_name, device_type, device_model,
      COALESCE(first_seen_at, created_at) AS first_seen_at,
      COALESCE(last_seen_at, created_at) AS last_seen_at,
      expires_at, created_at
    FROM sessions
    WHERE user_id=? AND expires_at > datetime('now')
    ORDER BY COALESCE(last_seen_at, created_at) DESC
    LIMIT 100
  `).bind(userId).all<any>();
  return (rows.results || []).map(row => {
    const parsed = parseDeviceInfo(row.user_agent || '');
    return {
      id: row.id,
      deviceName: row.device_name || parsed.name,
      deviceType: row.device_type || parsed.type,
      deviceModel: row.device_model || parsed.model,
      ip: row.ip || '',
      firstLoginAt: row.first_seen_at || row.created_at || '',
      lastUsedAt: row.last_seen_at || row.created_at || '',
      expiresAt: row.expires_at || '',
    };
  });
}

async function deleteOwnAccount(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);

  if (user.role === 'admin') {
    throw new HttpError(403, 'ADMIN_DELETE_FORBIDDEN', '管理员账号不能在前台注销，请先创建其他管理员后由后台处理');
  }

  const currentPassword = String(body.currentPassword || '');
  const confirmAccount = String(body.confirmAccount ?? body.confirmUsername ?? '').trim();
  if (confirmAccount !== user.username) {
    throw new HttpError(400, 'CONFIRM_USERNAME_MISMATCH', '请输入当前账号确认注销');
  }

  const row = await env.DB.prepare(`
    SELECT password_hash,password_salt FROM users WHERE id=? AND status='active'
  `).bind(user.id).first<{ password_hash: string; password_salt: string }>();

  if (!row || !(await verifyPassword(currentPassword, row.password_hash, row.password_salt))) {
    throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', '当前密码不正确');
  }

  const activeDomains = await env.DB.prepare(`
    SELECT id, fqdn_unicode, fqdn_ascii, status, delete_requested_at
    FROM domain_applications
    WHERE user_id=?
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(user.id).all<{ id: string; fqdn_unicode: string; fqdn_ascii: string; status: string; delete_requested_at?: string | null }>();

  const blockingDomains = (activeDomains.results || []).map(x => ({
    id: x.id,
    domain: x.fqdn_unicode || x.fqdn_ascii,
    status: x.delete_requested_at ? '待删除审核' : statusLabel(x.status),
  }));
  if (blockingDomains.length > 0) {
    throw new HttpError(409, 'ACTIVE_DOMAINS_EXIST', '账户下还有未注销域名，请先申请删除并等待管理员批准后再注销账号', { domains: blockingDomains });
  }

  await hardDeleteUser(env, user.id);
  return withCookie(ok({ deleted: true, purged: true }), await destroySession(env, request));
}


function applicationDnsProjection(alias: string = 'a'): string {
  const live = `(r.deleted_at IS NULL OR r.deleted_at='')`;
  const order = `CASE r.host WHEN '@' THEN 0 ELSE 1 END, r.host ASC, r.type ASC, r.created_at ASC`;
  return `
    (SELECT COUNT(*) FROM dns_records r WHERE r.application_id=${alias}.id AND ${live}) AS dns_count,
    (SELECT r.type FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_record_type,
    (SELECT r.content FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_record_content,
    (SELECT r.cf_record_id FROM dns_records r WHERE r.application_id=${alias}.id AND ${live} ORDER BY ${order} LIMIT 1) AS primary_dns_record_id,
    (SELECT GROUP_CONCAT(r.type || ' → ' || r.content, '；') FROM dns_records r WHERE r.application_id=${alias}.id AND ${live}) AS dns_summary
  `;
}

async function syncApplicationDnsSummary(env: Env, applicationId: string): Promise<void> {
  const row = await env.DB.prepare(`
    SELECT type, content, cf_record_id
    FROM dns_records
    WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY CASE host WHEN '@' THEN 0 ELSE 1 END, host ASC, type ASC, created_at ASC
    LIMIT 1
  `).bind(applicationId).first<{ type: string; content: string; cf_record_id?: string | null }>();

  if (row) {
    await env.DB.prepare(`
      UPDATE domain_applications
      SET record_type=?, record_content=?, dns_record_id=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(row.type, row.content, row.cf_record_id || '', applicationId).run();
  } else {
    await env.DB.prepare(`
      UPDATE domain_applications
      SET record_type='', record_content='', dns_record_id=NULL, updated_at=datetime('now')
      WHERE id=?
    `).bind(applicationId).run();
  }
}

async function listOwnApplications(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const rows = await env.DB.prepare(`
    SELECT a.*, ${applicationDnsProjection('a')}
    FROM domain_applications a
    WHERE a.user_id=? AND (a.deleted_at IS NULL OR a.deleted_at='')
    ORDER BY a.created_at DESC
    LIMIT 500
  `).bind(user.id).all<ApplicationRow>();

  const apps = (rows.results || []).map(x => serializeApplication(x, settings));
  const used = apps.filter(x => !['rejected', 'revoked', 'deleted'].includes(x.status)).length;
  const rawTotal = Number(user.domain_quota || settings.domain.defaultQuota);
  const total = Math.max(0, rawTotal); // v29：额度按管理员设置原样生效，不再把 9999 还原为默认值

  return ok({
    applications: apps,
    quota: {
      used,
      total,
      remaining: Math.max(0, total - used),
      label: `${used} / ${total}`,
    },
  });
}

async function getOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT a.*, ${applicationDnsProjection('a')}
    FROM domain_applications a
    WHERE a.id=? AND a.user_id=? AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  return ok({ application: serializeApplication(app, await loadSettings(env)) });
}


async function checkDomainAvailability(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await rateLimit(env, request, `domain-availability:${user.id}`, 180, 3600);
  const body = await readJson<Record<string, unknown>>(request, 32 * 1024);
  const settings = await loadSettings(env);

  if (user.status !== 'active') {
    return ok({ available: false, registered: false, message: '账户已被禁用，无法注册域名。' });
  }

  const prefix = normalizePrefix(body.prefix);
  const prefixRules = settings.domain;
  const p = prefix.unicode;
  const minLen = prefixRules.prefixMinLength || 2;
  const maxLen = prefixRules.prefixMaxLength || 36;
  if (p.length < minLen || p.length > maxLen) {
    return ok({ available: false, registered: false, message: `域名前缀长度必须为 ${minLen}-${maxLen} 位。` });
  }
  if (!prefixRules.allowUnderscorePrefix && p.includes('_')) {
    return ok({ available: false, registered: false, message: '当前不允许使用下划线前缀。' });
  }
  if (!prefixRules.allowNumericPrefix && /^\d+$/.test(p)) {
    return ok({ available: false, registered: false, message: '当前不允许使用纯数字前缀。' });
  }

  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(x => x.enabled && (x.suffix === suffixInput || x.suffixAscii === suffixInput));
  if (!suffix || (user.role !== 'admin' && suffix.allowRegister === false)) {
    return ok({ available: false, registered: false, message: '该根域名当前不可申请。' });
  }

  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  const blacklistRules = [
    ...sanitizeStringList(settings.domain.prefixBlacklistText || ''),
    ...sanitizeStringList(settings.domain.blockedPrefixText || ''),
    ...(settings.blacklist?.prefixes || []),
  ];
  const adminOnlyRules = sanitizeStringList(settings.domain.adminOnlyPrefixText || '');
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii)
    || prefixMatchesRule(prefix.unicode, blacklistRules) || prefixMatchesRule(prefix.ascii, blacklistRules)) {
    return ok({ available: false, registered: false, message: '该域名不可注册。' });
  }
  if (user.role !== 'admin' && (prefixMatchesRule(prefix.unicode, adminOnlyRules) || prefixMatchesRule(prefix.ascii, adminOnlyRules))) {
    return ok({ available: false, registered: false, message: '该域名不可注册。' });
  }

  const fqdnUnicode = `${prefix.unicode}.${suffix.suffix}`;
  const fqdnAscii = `${prefix.ascii}.${suffix.suffixAscii}`;
  const duplicate = await env.DB.prepare(`
    SELECT id FROM domain_applications
    WHERE fqdn_ascii=? COLLATE NOCASE
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(fqdnAscii).first<{ id: string }>();
  if (duplicate) {
    return ok({ available: false, registered: true, fqdnUnicode, fqdnAscii, message: '此域名已注册。' });
  }

  const token = resolveDnsToken(env, settings, suffix);
  let cloudflareChecked = false;
  if (token && suffix.zoneId) {
    cloudflareChecked = true;
    try {
      const remoteRecords = await listCloudflareDnsRecordsByName(token, suffix.zoneId, fqdnAscii);
      if (remoteRecords.length) {
        return ok({ available: false, registered: true, fqdnUnicode, fqdnAscii, cloudflareChecked, message: '此域名已注册。' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloudflare DNS 查询失败';
      throw new HttpError(502, 'DOMAIN_AVAILABILITY_CHECK_FAILED', `暂时无法检查域名，请稍后重试：${message}`);
    }
  }

  return ok({
    available: true,
    registered: false,
    fqdnUnicode,
    fqdnAscii,
    cloudflareChecked,
    message: '此域名可注册。',
  });
}

async function createApplication(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  await rateLimit(env, request, `apply:${user.id}`, 20, 3600);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  if (settings.registration.dailyDomainApplyLimit && settings.registration.dailyDomainApplyLimit > 0) {
    const todayCount = await env.DB.prepare(`
      SELECT COUNT(*) AS count FROM domain_applications
      WHERE user_id=? AND date(created_at)=date('now')
    `).bind(user.id).first<{ count: number }>();
    if (Number(todayCount?.count || 0) >= settings.registration.dailyDomainApplyLimit) {
      throw new HttpError(429, 'DAILY_DOMAIN_APPLY_LIMIT', `今天申请域名数量已达到上限：${settings.registration.dailyDomainApplyLimit} 个`);
    }
  }

  await verifyHumanChallenge(env, request, body, 'apply', env.TURNSTILE_ACTION_APPLY || 'domain_apply');

  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户已被禁用，无法注册域名，请通过帮助中心联系管理人员');

  const prefix = normalizePrefix(body.prefix);
  const prefixRules = settings.domain;
  const p = prefix.unicode;
  const minLen = prefixRules.prefixMinLength || 2;
  const maxLen = prefixRules.prefixMaxLength || 36;
  if (p.length < minLen || p.length > maxLen) throw new HttpError(400, 'INVALID_PREFIX_LENGTH', `域名前缀长度必须为 ${minLen}-${maxLen} 位`);
  if (!prefixRules.allowUnderscorePrefix && p.includes('_')) throw new HttpError(400, 'UNDERSCORE_NOT_ALLOWED', '当前不允许使用下划线前缀');
  if (!prefixRules.allowNumericPrefix && /^\d+$/.test(p)) throw new HttpError(400, 'NUMERIC_PREFIX_NOT_ALLOWED', '当前不允许使用纯数字前缀');

  const suffixInput = normalizeSuffix(String(body.suffix || ''));
  const suffix = settings.dns.suffixes.find(x => x.enabled && (x.suffix === suffixInput || x.suffixAscii === suffixInput));
  if (!suffix) throw new HttpError(400, 'SUFFIX_NOT_ALLOWED', '该根域名不可用');
  if (user.role !== 'admin' && suffix.allowRegister === false) {
    throw new HttpError(400, 'SUFFIX_REGISTER_CLOSED', '管理员已关闭该根域名的用户申请入口');
  }

  const reserved = new Set(settings.dns.reservedPrefixes.map(x => x.toLowerCase()));
  const blacklistRules = [
    ...sanitizeStringList(settings.domain.prefixBlacklistText || ''),
    ...sanitizeStringList(settings.domain.blockedPrefixText || ''),
    ...(settings.blacklist?.prefixes || []),
  ];
  const adminOnlyRules = sanitizeStringList(settings.domain.adminOnlyPrefixText || '');
  if (reserved.has(prefix.unicode) || reserved.has(prefix.ascii) || prefixMatchesRule(prefix.unicode, blacklistRules) || prefixMatchesRule(prefix.ascii, blacklistRules)) {
    throw new HttpError(409, 'RESERVED_PREFIX', '该前缀为系统保留词或黑名单关键词');
  }
  if (user.role !== 'admin' && (prefixMatchesRule(prefix.unicode, adminOnlyRules) || prefixMatchesRule(prefix.ascii, adminOnlyRules))) {
    throw new HttpError(409, 'ADMIN_ONLY_PREFIX', '该前缀仅管理员可用');
  }

  const platformCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE status NOT IN ('rejected','revoked') AND (deleted_at IS NULL OR deleted_at='')
  `).first<{ count: number }>();
  if (Number(platformCount?.count || 0) >= (settings.domain.platformMaxDomains || 9999)) {
    throw new HttpError(403, 'PLATFORM_DOMAIN_LIMIT', '平台二级域名总配额已满');
  }

  const fqdnUnicode = `${prefix.unicode}.${suffix.suffix}`;
  const fqdnAscii = `${prefix.ascii}.${suffix.suffixAscii}`;

  const duplicate = await env.DB.prepare(`
    SELECT id,status FROM domain_applications
    WHERE fqdn_ascii=? COLLATE NOCASE
      AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(fqdnAscii).first<{ id: string; status: string }>();
  if (duplicate) throw new HttpError(409, 'DOMAIN_EXISTS', '该域名已被注册或正在审核');

  const activeCount = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM domain_applications
    WHERE user_id=? AND status NOT IN ('rejected','revoked')
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(user.id).first<{ count: number }>();

  const rawQuota = Number(user.domain_quota || settings.domain.defaultQuota);
  const totalQuota = Math.max(0, rawQuota); // v29：按用户自身额度限制，不再把 9999 还原为默认值
  if (Number(activeCount?.count || 0) >= totalQuota) {
    throw new HttpError(403, 'DOMAIN_QUOTA_EXCEEDED', `您的域名额度已用完，当前额度为 ${totalQuota} 个`);
  }

  const id = crypto.randomUUID();

  const riskRules = ['login','signin','pay','wallet','bank','admin','mail','api','official','support','verify'];
  const isRiskDomain = riskRules.some(rule => prefix.unicode.toLowerCase().includes(rule) || prefix.ascii.toLowerCase().includes(rule));
  const autoApproved = settings.domain.approvalMode === 'auto' || (settings.domain.approvalMode === 'risk' && !isRiskDomain);
  const appStatus = autoApproved ? 'approved' : 'pending';
  const expiresAt = autoApproved ? new Date(Date.now() + settings.domain.validDays * DAY).toISOString() : null;

  await env.DB.prepare(`
    INSERT INTO domain_applications (
      id,user_id,prefix_unicode,prefix_ascii,suffix_unicode,suffix_ascii,fqdn_unicode,fqdn_ascii,
      record_type,record_content,proxied,ttl,status,expires_at,reviewed_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, user.id, prefix.unicode, prefix.ascii, suffix.suffix, suffix.suffixAscii, fqdnUnicode, fqdnAscii,
    suffix.defaultType, '', suffix.proxied ? 1 : 0, suffix.ttl, appStatus, expiresAt, autoApproved ? new Date().toISOString() : null,
  ).run();

  await audit(env, request, user.id, 'application.create', 'domain_application', id, { fqdnAscii });
  if (appStatus === 'pending') {
    await sendAdminCloudflareEmailSafe(env, 'domain_review', {
      subject: `【域名待审核】${fqdnUnicode}`,
      text: [
        '有新的二级域名申请等待管理员审核。',
        '',
        `申请用户：${user.username}`,
        `用户 ID：${user.id}`,
        `申请域名：${fqdnUnicode}`,
        `ASCII 域名：${fqdnAscii}`,
        `提交时间：${new Date().toISOString()}`,
        `客户端 IP：${clientIp(request) || '未知'}`,
        isRiskDomain ? '风险提示：前缀命中了系统风险关键词，请重点检查。' : '风险提示：未命中内置高风险关键词。',
        '',
        `审核入口：${new URL(request.url).origin}/#/admin/applications`,
      ].join('\n'),
      fingerprint: `domain-review|${id}`,
      cooldownSeconds: 60,
    }, settings);
  }
  const app = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(app!, settings) });
}

async function updateOwnDns(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  if (app.status !== 'approved') throw new HttpError(409, 'DOMAIN_NOT_APPROVED', '域名审核通过后才能设置解析');
  if (app.controlled_at) throw new HttpError(403, 'DOMAIN_CONTROLLED', '该域名已被管理员管控，只允许删除 DNS 或申请删除域名');

  const suffix = settings.dns.suffixes.find(x => x.enabled && x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_DISABLED', '该根域名已停用，暂时不能修改解析');

  if (app.status === 'approved' && !settings.domain.allowDnsEditAfterApproved) {
    throw new HttpError(403, 'DNS_EDIT_CLOSED', '管理员已关闭生效域名的 DNS 修改');
  }

  const recordType = normalizeRecordType(body.recordType || app.record_type || suffix.defaultType, suffix.allowedTypes);
  if (!app.record_type || recordType !== String(app.record_type).toUpperCase()) assertUserDnsRecordTypeOpen(settings, recordType);
  const recordContent = normalizeDnsTarget(recordType, body.target, app.fqdn_ascii);
  if (recordType === 'CNAME') assertCnameTargetAllowed(recordContent, settings.dns.cnameTargetBlacklist);

  let dnsRecordId = app.dns_record_id || '';
  let newStatus = app.status;
  let errorMessage = '';

  if (app.status === 'approved') {
    const token = resolveDnsToken(env, settings, suffix);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token；该根域名可在“管理员设置 → DNS 配置”单独填写 API Token');
    try {
      if (app.dns_record_id) {
        const record = await updateDnsRecord(token, suffix.zoneId, app.dns_record_id, {
          type: recordType,
          name: app.fqdn_ascii,
          content: recordContent,
          ttl: Number(app.ttl || suffix.ttl || 1),
          proxied: Boolean(app.proxied),
          comment: `Updated by storage portal ${app.id}`,
        });
        dnsRecordId = record.id || app.dns_record_id || '';
      } else {
        const record = await createDnsRecord(token, suffix.zoneId, {
          type: recordType,
          name: app.fqdn_ascii,
          content: recordContent,
          ttl: Number(app.ttl || suffix.ttl || 1),
          proxied: Boolean(app.proxied),
          comment: `Created by storage portal ${app.id} after approval`,
        });
        dnsRecordId = record.id || '';
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 保存失败';
      await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
        subject: `【DNS 异常】保存 ${app.fqdn_ascii}`,
        text: [
          '用户保存域名 DNS 时发生异常。',
          '',
          `用户：${user.username}（${user.id}）`,
          `域名：${app.fqdn_unicode}`,
          `记录：${recordType} ${app.fqdn_ascii} → ${recordContent}`,
          `Zone ID：${suffix.zoneId || '未配置'}`,
          `错误：${errorMessage}`,
          `时间：${new Date().toISOString()}`,
          `客户端 IP：${clientIp(request) || '未知'}`,
        ].join('\n'),
        fingerprint: `dns-save|${app.id}|${errorMessage}`,
        cooldownSeconds: 900,
      }, settings);
      throw new HttpError(502, 'DNS_SAVE_FAILED', errorMessage);
    }
  }

  await env.DB.prepare(`
    UPDATE domain_applications
    SET record_type=?,record_content=?,dns_record_id=?,status=?,error_message=?,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(recordType, recordContent, dnsRecordId, newStatus, errorMessage, id, user.id).run();

  await audit(env, request, user.id, 'application.dns_update', 'domain_application', id, { recordType, recordContent });
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, settings) });
}

async function listOwnDnsRecords(request: Request, env: Env, applicationId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(applicationId, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');

  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records
    WHERE application_id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
    ORDER BY CASE host WHEN '@' THEN 0 ELSE 1 END, host ASC, type ASC, created_at ASC
  `).bind(applicationId, user.id).all<DnsRecordRow>();

  return ok({ records: (rows.results || []).map(serializeDnsRecord) });
}

async function createOwnDnsRecord(request: Request, env: Env, applicationId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(applicationId, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');
  if (app.status !== 'approved') throw new HttpError(409, 'DOMAIN_NOT_APPROVED', '域名审核通过后才能添加解析');
  if (app.controlled_at) throw new HttpError(403, 'DOMAIN_CONTROLLED', '该域名已被管理员管控，只允许删除 DNS 或申请删除域名');
  if (app.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能添加解析');

  const suffix = settings.dns.suffixes.find(x => x.enabled && x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_DISABLED', '该根域名已停用，暂时不能新增解析');

  const host = normalizeDnsHost(body.host, settings.dns.blockWildcardRecords !== false);
  const name = fullRecordName(host, app.fqdn_ascii);
  const type = normalizeRecordType(body.type || body.recordType, suffix.allowedTypes);
  assertUserDnsRecordTypeOpen(settings, type);
  if (type === 'MX' && settings.dns.allowMxRecords === false) throw new HttpError(403, 'MX_DISABLED', '管理员已禁止用户创建 MX 解析记录');
  const recordCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM dns_records WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(applicationId).first<{ count: number }>();
  if (Number(recordCount?.count || 0) >= (settings.domain.maxDnsRecordsPerDomain || 20)) throw new HttpError(403, 'DNS_RECORD_LIMIT', `单个域名最多可创建 ${settings.domain.maxDnsRecordsPerDomain || 20} 条 DNS 解析`);
  const content = normalizeDnsTarget(type, body.content || body.target, name);
  if (type === 'CNAME') assertCnameTargetAllowed(content, settings.dns.cnameTargetBlacklist);
  const priority = type === 'MX' ? clamp(Number(body.priority || 10), 0, 65535) : (type === 'SRV' ? clamp(Number(content.split(/\s+/)[0] || 0), 0, 65535) : null);
  const ttl = clamp(Number(body.ttl || suffix.ttl || 1), 1, 86400);
  const proxied = ['A', 'AAAA', 'CNAME'].includes(type) && asBoolean(body.proxied, suffix.proxied ?? settings.dns.defaultProxied ?? false) ? 1 : 0;

  const duplicate = await env.DB.prepare(`
    SELECT id FROM dns_records
    WHERE application_id=? AND name=? COLLATE NOCASE AND type=? AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(applicationId, name, type).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'DNS_RECORD_EXISTS', '同一主机和类型的解析已存在，请编辑原记录');

  const id = crypto.randomUUID();
  let cfRecordId = '';
  let status = 'active';
  let errorMessage = '';

  const token = resolveDnsToken(env, settings, suffix);
  if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token；该根域名可在“管理员设置 → DNS 配置”单独填写 API Token');
  try {
    const record = await createDnsRecord(token, suffix.zoneId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Created by storage portal dns record ${id}`));
    cfRecordId = record.id || '';
  } catch (error) {
    errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 创建失败';
    await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
      subject: `【DNS 异常】创建 ${name}`,
      text: [
        '用户创建 DNS 记录时发生异常。',
        '',
        `用户：${user.username}（${user.id}）`,
        `所属域名：${app.fqdn_unicode}`,
        `记录：${type} ${name} → ${content}`,
        `Zone ID：${suffix.zoneId || '未配置'}`,
        `错误：${errorMessage}`,
        `时间：${new Date().toISOString()}`,
        `客户端 IP：${clientIp(request) || '未知'}`,
      ].join('\n'),
      fingerprint: `dns-create|${applicationId}|${name}|${type}|${errorMessage}`,
      cooldownSeconds: 900,
    }, settings);
    throw new HttpError(502, 'DNS_CREATE_FAILED', errorMessage);
  }

  await env.DB.prepare(`
    INSERT INTO dns_records (id,application_id,user_id,host,name,type,content,priority,proxied,ttl,cf_record_id,status,error_message)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, applicationId, user.id, host, name, type, content, priority, proxied, ttl, cfRecordId, status, errorMessage).run();

  await syncApplicationDnsSummary(env, applicationId);

  await audit(env, request, user.id, 'dns_record.create', 'dns_record', id, { applicationId, name, type });
  const row = await env.DB.prepare(`SELECT * FROM dns_records WHERE id=?`).bind(id).first<DnsRecordRow>();
  return ok({ record: serializeDnsRecord(row!) });
}

async function updateOwnDnsRecordManaged(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const row = await env.DB.prepare(`
    SELECT r.*,a.fqdn_ascii,a.suffix_ascii,a.status AS app_status,a.delete_requested_at,a.controlled_at
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    WHERE r.id=? AND r.user_id=? AND (r.deleted_at IS NULL OR r.deleted_at='') AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(recordId, user.id).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '解析记录不存在');
  if (row.controlled_at) throw new HttpError(403, 'DOMAIN_CONTROLLED', '该域名已被管理员管控，只允许删除 DNS 或申请删除域名');
  if (row.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能修改解析');

  const suffix = settings.dns.suffixes.find(x => x.enabled && x.suffixAscii === row.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_DISABLED', '该根域名已停用，暂时不能修改解析');
  if (row.app_status === 'approved' && !settings.domain.allowDnsEditAfterApproved) throw new HttpError(403, 'DNS_EDIT_CLOSED', '管理员已关闭生效域名的 DNS 修改');

  const host = normalizeDnsHost(body.host ?? row.host, settings.dns.blockWildcardRecords !== false);
  const name = fullRecordName(host, row.fqdn_ascii);
  const type = normalizeRecordType(body.type || body.recordType || row.type, suffix.allowedTypes);
  const previousType = String(row.type || '').toUpperCase();
  if (type !== previousType) assertUserDnsRecordTypeOpen(settings, type);
  if (type === 'MX' && type !== previousType && settings.dns.allowMxRecords === false) throw new HttpError(403, 'MX_DISABLED', '管理员已禁止用户创建 MX 解析记录');
  const content = normalizeDnsTarget(type, body.content || body.target || row.content, name);
  if (type === 'CNAME') assertCnameTargetAllowed(content, settings.dns.cnameTargetBlacklist);
  const priority = type === 'MX' ? clamp(Number(body.priority || row.priority || 10), 0, 65535) : (type === 'SRV' ? clamp(Number(content.split(/\s+/)[0] || row.priority || 0), 0, 65535) : null);
  const ttl = clamp(Number(body.ttl || row.ttl || suffix.ttl || 1), 1, 86400);
  const proxied = ['A', 'AAAA', 'CNAME'].includes(type) && asBoolean(body.proxied, Boolean(row.proxied)) ? 1 : 0;

  const duplicate = await env.DB.prepare(`
    SELECT id FROM dns_records
    WHERE application_id=? AND id!=? AND name=? COLLATE NOCASE AND type=? AND (deleted_at IS NULL OR deleted_at='')
    LIMIT 1
  `).bind(row.application_id, recordId, name, type).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'DNS_RECORD_EXISTS', '同一主机和类型的解析已存在');

  let cfRecordId = row.cf_record_id || '';
  let status = row.status || 'pending';
  let errorMessage = '';
  if (row.app_status === 'approved') {
    const token = resolveDnsToken(env, settings, suffix);
    if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token；该根域名可在“管理员设置 → DNS 配置”单独填写 API Token');
    try {
      if (cfRecordId) {
        const record = await updateDnsRecord(token, suffix.zoneId, cfRecordId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Updated by storage portal dns record ${recordId}`));
        cfRecordId = record.id || cfRecordId;
      } else {
        const record = await createDnsRecord(token, suffix.zoneId, dnsPayload({ type, name, content, ttl, proxied, priority }, `Created by storage portal dns record ${recordId}`));
        cfRecordId = record.id || '';
      }
      status = 'active';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 更新失败';
      await env.DB.prepare(`UPDATE dns_records SET error_message=?,status='error',updated_at=datetime('now') WHERE id=?`).bind(errorMessage, recordId).run();
      await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
        subject: `【DNS 异常】更新 ${name}`,
        text: [
          '用户更新 DNS 记录时发生异常。',
          '',
          `用户：${user.username}（${user.id}）`,
          `记录 ID：${recordId}`,
          `记录：${type} ${name} → ${content}`,
          `Zone ID：${suffix.zoneId || '未配置'}`,
          `错误：${errorMessage}`,
          `时间：${new Date().toISOString()}`,
          `客户端 IP：${clientIp(request) || '未知'}`,
        ].join('\n'),
        fingerprint: `dns-update|${recordId}|${errorMessage}`,
        cooldownSeconds: 900,
      }, settings);
      throw new HttpError(502, 'DNS_UPDATE_FAILED', errorMessage);
    }
  }

  await env.DB.prepare(`
    UPDATE dns_records
    SET host=?,name=?,type=?,content=?,priority=?,proxied=?,ttl=?,cf_record_id=?,status=?,error_message=?,updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(host, name, type, content, priority, proxied, ttl, cfRecordId, status, errorMessage, recordId, user.id).run();

  await syncApplicationDnsSummary(env, row.application_id);
  await audit(env, request, user.id, 'dns_record.update', 'dns_record', recordId, { name, type });
  const updated = await env.DB.prepare(`SELECT * FROM dns_records WHERE id=?`).bind(recordId).first<DnsRecordRow>();
  return ok({ record: serializeDnsRecord(updated!) });
}

async function deleteOwnDnsRecordManaged(request: Request, env: Env, recordId: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const row = await env.DB.prepare(`
    SELECT r.*,a.suffix_ascii,a.status AS app_status,a.delete_requested_at
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    WHERE r.id=? AND r.user_id=? AND (r.deleted_at IS NULL OR r.deleted_at='') AND (a.deleted_at IS NULL OR a.deleted_at='')
  `).bind(recordId, user.id).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '解析记录不存在');
  if (row.delete_requested_at) throw new HttpError(409, 'DELETE_REQUESTED', '该域名正在等待删除审核，不能删除解析');

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === row.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '根域名配置不存在');
  let warning = '';
  if (row.app_status === 'approved' && row.cf_record_id) {
    const token = resolveDnsToken(env, settings, suffix);
    const result = await deleteDnsRecordBestEffort(token, suffix.zoneId, row.cf_record_id);
    warning = result.warning || '';
  }

  await hardDeleteDnsRecordRow(env, recordId);
  await syncApplicationDnsSummary(env, row.application_id);
  await audit(env, request, user.id, 'dns_record.delete', 'dns_record', recordId, { warning });
  if (warning) {
    await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
      subject: `【DNS 清理警告】记录 ${recordId}`,
      text: [
        '用户删除 DNS 记录时，Cloudflare 远端清理出现警告。',
        '',
        `用户：${user.username}（${user.id}）`,
        `记录 ID：${recordId}`,
        `本地记录：已删除`,
        `远端警告：${warning}`,
        `时间：${new Date().toISOString()}`,
        '',
        '请到 Cloudflare DNS 控制台确认是否仍有残留记录。',
      ].join('\n'),
      fingerprint: `dns-delete-warning|${recordId}|${warning}`,
      cooldownSeconds: 900,
    }, settings);
  }
  return ok({ deleted: true, purged: true, warning });
}

async function adminDnsRecords(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const limit = clamp(Number(url.searchParams.get('limit') || 500), 1, 1000);
  const rows = await env.DB.prepare(`
    SELECT r.*,a.fqdn_unicode,a.fqdn_ascii,u.username
    FROM dns_records r
    JOIN domain_applications a ON a.id=r.application_id
    LEFT JOIN users u ON u.id=r.user_id
    WHERE (r.deleted_at IS NULL OR r.deleted_at='')
    ORDER BY r.created_at DESC
    LIMIT ?
  `).bind(limit).all<DnsRecordRow>();
  return ok({ records: (rows.results || []).map(serializeDnsRecord) });
}

async function syncPendingDnsRecordsForApp(env: Env, app: ApplicationRow, suffix: AppSettings['dns']['suffixes'][number], actorId: string): Promise<number> {
  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records
    WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='') AND (cf_record_id IS NULL OR cf_record_id='')
  `).bind(app.id).all<DnsRecordRow>();
  const records = rows.results || [];
  if (!records.length) return 0;
  const settings = await loadSettings(env);
  const token = resolveDnsToken(env, settings, suffix);
  if (!token) throw new HttpError(503, 'DNS_TOKEN_MISSING', '尚未配置 Cloudflare DNS API Token；该根域名可在“管理员设置 → DNS 配置”单独填写 API Token');
  let created = 0;
  for (const record of records) {
    try {
      const cf = await createDnsRecord(token, suffix.zoneId, dnsPayload(record, `Created by storage portal dns record ${record.id}`));
      await env.DB.prepare(`
        UPDATE dns_records SET cf_record_id=?,status='active',error_message=NULL,updated_at=datetime('now') WHERE id=?
      `).bind(cf.id || '', record.id).run();
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 创建失败';
      await env.DB.prepare(`UPDATE dns_records SET status='error',error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, record.id).run();
      await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
        subject: `【DNS 同步异常】${record.name || app.fqdn_ascii}`,
        text: [
          '管理员批准域名后，待写入 DNS 记录同步失败。',
          '',
          `域名：${app.fqdn_unicode}`,
          `记录 ID：${record.id}`,
          `记录：${record.type} ${record.name} → ${record.content}`,
          `Zone ID：${suffix.zoneId || '未配置'}`,
          `错误：${message}`,
          `时间：${new Date().toISOString()}`,
        ].join('\n'),
        fingerprint: `dns-sync|${record.id}|${message}`,
        cooldownSeconds: 900,
      }, settings);
    }
  }
  return created;
}

async function deleteAllDnsRecordsForApp(env: Env, app: ApplicationRow, suffix: AppSettings['dns']['suffixes'][number]): Promise<{ warnings: string[] }> {
  const settings = await loadSettings(env);
  const token = resolveDnsToken(env, settings, suffix);
  const rows = await env.DB.prepare(`
    SELECT * FROM dns_records WHERE application_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(app.id).all<DnsRecordRow>();
  const records = rows.results || [];
  const namesToClean = new Set<string>();
  const warnings: string[] = [];

  if (app.fqdn_ascii) namesToClean.add(String(app.fqdn_ascii).toLowerCase());
  for (const record of records) {
    if (record.name) namesToClean.add(String(record.name).toLowerCase());
    if (record.cf_record_id) {
      const result = await deleteDnsRecordBestEffort(token, suffix.zoneId, record.cf_record_id);
      if (result.warning) warnings.push(result.warning);
    }
    await hardDeleteDnsRecordRow(env, record.id);
  }
  if (app.dns_record_id) {
    const result = await deleteDnsRecordBestEffort(token, suffix.zoneId, app.dns_record_id);
    if (result.warning) warnings.push(result.warning);
  }

  if (token && suffix.zoneId) {
    for (const name of namesToClean) {
      try { await deleteDnsRecordsByName(token, suffix.zoneId, name); }
      catch (error) { warnings.push(error instanceof Error ? error.message : 'Cloudflare 按名称清理失败'); }
    }
  } else if (namesToClean.size) {
    warnings.push('未配置 Cloudflare Token 或 Zone ID，已仅清理本地记录');
  }
  const uniqueWarnings = Array.from(new Set(warnings)).slice(0, 10);
  if (uniqueWarnings.length) {
    await sendAdminCloudflareEmailSafe(env, 'dns_anomaly', {
      subject: `【DNS 清理警告】${app.fqdn_ascii}`,
      text: [
        '系统清理域名关联 DNS 时出现警告。',
        '',
        `域名：${app.fqdn_unicode}`,
        `Zone ID：${suffix.zoneId || '未配置'}`,
        `警告：${uniqueWarnings.join('；')}`,
        `时间：${new Date().toISOString()}`,
        '',
        '本地记录可能已经清理，请到 Cloudflare DNS 控制台核对远端是否有残留。',
      ].join('\n'),
      fingerprint: `dns-cleanup|${app.id}|${uniqueWarnings.join('|')}`,
      cooldownSeconds: 900,
    }, settings);
  }
  return { warnings: uniqueWarnings };
}

function serializeDnsRecord(row: DnsRecordRow): Record<string, unknown> {
  return {
    id: row.id,
    applicationId: row.application_id,
    userId: row.user_id,
    host: row.host || '@',
    name: row.name,
    type: row.type,
    content: row.content,
    priority: row.priority ?? null,
    proxied: Boolean(row.proxied),
    ttl: Number(row.ttl || 1),
    cfRecordId: row.cf_record_id || '',
    status: row.status || 'pending',
    statusText: ({ pending: '待写入', active: '已生效', error: '失败', deleted: '已删除' } as Record<string,string>)[row.status] || row.status,
    errorMessage: row.error_message || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    fqdnUnicode: row.fqdn_unicode || null,
    fqdnAscii: row.fqdn_ascii || null,
    username: row.username || null,
  };
}

async function renewOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND status='approved'
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '只有正常域名可以续期');
  if (settings.domain.selfRenewEnabled === false) throw new HttpError(403, 'RENEW_DISABLED', '管理员未开放用户自助续期');

  const expiresAt = parseDate(app.expires_at);
  if (!expiresAt) throw new HttpError(400, 'NO_EXPIRY', '未设置到期时间，不能续期');

  const remaining = expiresAt.getTime() - Date.now();
  if (remaining > settings.domain.renewWindowDays * DAY) {
    throw new HttpError(403, 'TOO_EARLY', `到期前 ${settings.domain.renewWindowDays} 天内才可以续期`);
  }

  const base = Math.max(Date.now(), expiresAt.getTime());
  const newExpires = new Date(base + settings.domain.validDays * DAY).toISOString();

  await env.DB.prepare(`
    UPDATE domain_applications
    SET expires_at=?, renewed_at=datetime('now'), renew_count=COALESCE(renew_count,0)+1
    WHERE id=? AND user_id=?
  `).bind(newExpires, id, user.id).run();

  await audit(env, request, user.id, 'application.renew', 'domain_application', id, { newExpires });
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, settings) });
}

async function requestDeleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE id=? AND user_id=? AND status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();

  if (!app) throw new HttpError(404, 'NOT_FOUND', '只有正常域名可以申请删除');
  if (settings.domain.allowUserDeleteActive === false && user.role !== 'admin') throw new HttpError(403, 'DELETE_ACTIVE_DISABLED', '管理员未开放用户删除已生效域名');
  const confirmDomain = String(body.confirmDomain || '').trim();
  if (confirmDomain !== app.fqdn_unicode && confirmDomain !== app.fqdn_ascii) {
    throw new HttpError(400, 'CONFIRM_DOMAIN_MISMATCH', '请输入完整域名确认删除');
  }

  const directDelete = body.directDelete === true || String(body.directDelete || '').toLowerCase() === 'true';
  if (directDelete) {
    if (user.role !== 'admin') throw new HttpError(403, 'ADMIN_ONLY_DIRECT_DELETE', '只有管理员可以直接删除域名');
    const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
    if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '该后缀配置不存在，无法安全清理 Cloudflare DNS');
    const deleteResult = await deleteAllDnsRecordsForApp(env, app, suffix);
    await hardDeleteDomainApplication(env, id);
    await audit(env, request, user.id, 'admin.application_direct_delete', 'domain_application', id, {
      fqdn: app.fqdn_ascii,
      warnings: deleteResult.warnings,
    });
    return ok({ deleted: true, purged: true, directDelete: true, warnings: deleteResult.warnings });
  }

  if (app.delete_requested_at) throw new HttpError(409, 'DELETE_ALREADY_REQUESTED', '该域名已提交删除申请，等待管理员审核');

  await env.DB.prepare(`
    UPDATE domain_applications
    SET delete_requested_at=datetime('now'), delete_requested_by=?, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(user.id, id, user.id).run();

  await audit(env, request, user.id, 'application.delete_request', 'domain_application', id);
  await sendAdminCloudflareEmailSafe(env, 'domain_review', {
    subject: `【域名删除待审核】${app.fqdn_unicode}`,
    text: [
      '用户提交了已生效域名的删除申请。',
      '',
      `申请用户：${user.username}`,
      `用户 ID：${user.id}`,
      `域名：${app.fqdn_unicode}`,
      `ASCII 域名：${app.fqdn_ascii}`,
      `提交时间：${new Date().toISOString()}`,
      `客户端 IP：${clientIp(request) || '未知'}`,
      '',
      '请先确认该域名的 DNS 记录和业务使用情况，再批准或拒绝删除。',
      `审核入口：${new URL(request.url).origin}/#/admin/applications`,
    ].join('\n'),
    fingerprint: `domain-delete-review|${id}|${Date.now()}`,
    cooldownSeconds: 60,
  }, settings);
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, await loadSettings(env)) });
}

async function cancelDeleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications
    WHERE id=? AND user_id=? AND status='approved' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();

  if (!app || !app.delete_requested_at) {
    throw new HttpError(404, 'NO_DELETE_REQUEST', '该域名没有可撤销的删除申请');
  }
  const requestedAt = parseDate(app.delete_requested_at);
  if (!requestedAt || Date.now() - requestedAt.getTime() > 12 * 60 * 60 * 1000) {
    throw new HttpError(403, 'DELETE_CANCEL_EXPIRED', '删除申请只能在提交后 12 小时内撤销');
  }

  await env.DB.prepare(`
    UPDATE domain_applications
    SET delete_requested_at=NULL, delete_requested_by=NULL, updated_at=datetime('now')
    WHERE id=? AND user_id=?
  `).bind(id, user.id).run();

  await audit(env, request, user.id, 'application.delete_request_cancel', 'domain_application', id);
  const updated = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
  return ok({ application: serializeApplication(updated!, await loadSettings(env)) });
}

async function deleteOwnApplication(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  if (!settings.domain.allowUserDeleteInvalid) throw new HttpError(403, 'DELETE_DISABLED', '管理员未开放用户删除无效域名');

  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND user_id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '域名不存在');

  if (!['rejected', 'revoked'].includes(app.status)) {
    throw new HttpError(403, 'DELETE_ACTIVE_FORBIDDEN', '只能删除已拒绝或已撤销的无效域名');
  }

  await hardDeleteDomainApplication(env, id);
  return ok({ deleted: true, purged: true });
}


function messageTargetLabel(row: MessageRow): string {
  if (row.target_type === 'all') return '全部用户';
  if (row.target_type === 'role') return row.target_role === 'admin' ? '管理员' : '普通用户';
  if (row.target_type === 'user') return row.target_username || row.target_user_id || '指定用户';
  return row.target_type || '未知目标';
}

function serializeMessage(row: MessageRow) {
  return {
    id: row.id,
    senderUserId: row.sender_user_id || null,
    senderUsername: row.sender_username || '系统管理员',
    targetType: row.target_type,
    targetUserId: row.target_user_id || null,
    targetUsername: row.target_username || null,
    targetRole: row.target_role || null,
    targetLabel: messageTargetLabel(row),
    title: row.title,
    body: row.body,
    level: row.level || 'info',
    status: row.status || 'sent',
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    sentAt: row.sent_at || null,
    readAt: row.read_at || null,
    isRead: Boolean(row.read_at),
  };
}

function normalizeMessageLevel(value: unknown): string {
  const level = String(value || 'info').toLowerCase();
  return ['info', 'success', 'warning', 'danger', 'important', 'system', 'feedback', 'support_reply'].includes(level) ? level : 'info';
}

function normalizeMessageStatus(value: unknown): string {
  const status = String(value || 'sent').toLowerCase();
  return ['sent', 'draft', 'template'].includes(status) ? status : 'sent';
}

function normalizeTargetType(value: unknown): string {
  const type = String(value || '').toLowerCase();
  return ['all', 'user', 'role', 'none'].includes(type) ? type : 'none';
}

async function sendSystemMessageToUser(env: Env, senderUserId: string | null, targetUserId: string, title: string, body: string, level: string = 'info'): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, 'user', ?, NULL, ?, ?, ?, 'sent', datetime('now'))
  `).bind(id, senderUserId, targetUserId, cleanText(title, 120) || '系统消息', cleanText(body, 5000) || '您有一条新的系统消息。', normalizeMessageLevel(level)).run();
  return id;
}

function domainMessageBody(app: ApplicationRow, actionText: string, note: string): string {
  const lines = [`域名：${app.fqdn_unicode || app.fqdn_ascii}`, `处理结果：${actionText}`];
  if (note) lines.push(`管理员留言：${note}`);
  lines.push('请进入消息中心查看通知；域名管理页面不再单独显示管理员留言。');
  return lines.join('\n');
}

async function sendDomainStatusMessage(env: Env, adminId: string, app: ApplicationRow, actionText: string, note: string, level: string = 'info'): Promise<void> {
  await sendSystemMessageToUser(env, adminId, app.user_id, `域名处理通知：${app.fqdn_unicode || app.fqdn_ascii}`, domainMessageBody(app, actionText, note), level);
}

async function getReadReceipts(env: Env, messageIds: string[]): Promise<Record<string, Array<{ userId: string; username: string; readAt: string }>>> {
  const result: Record<string, Array<{ userId: string; username: string; readAt: string }>> = {};
  const ids = Array.from(new Set(messageIds.filter(Boolean))).slice(0, 500);
  if (!ids.length) return result;
  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT r.message_id, r.user_id, COALESCE(u.username, r.user_id) AS username, r.read_at
    FROM message_reads r
    LEFT JOIN users u ON u.id=r.user_id
    WHERE r.message_id IN (${placeholders})
    ORDER BY datetime(r.read_at) DESC
  `).bind(...ids).all<{ message_id: string; user_id: string; username: string; read_at: string }>();
  for (const row of rows.results || []) {
    if (!result[row.message_id]) result[row.message_id] = [];
    result[row.message_id].push({ userId: row.user_id, username: row.username, readAt: row.read_at });
  }
  return result;
}


interface OperationLogRow {
  id: string;
  actor_user_id?: string | null;
  actor_username?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  ip?: string | null;
  meta_json?: string | null;
  created_at: string;
}

async function listOperationLogs(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const settings = await loadSettings(env);
  const retentionDays = Math.max(1, Math.min(365, Number(settings.security?.auditRetentionDays || 7)));
  await cleanupOperationLogs(env);

  const isAdmin = user.role === 'admin';
  const sql = isAdmin ? `
    SELECT l.*, u.username AS actor_username
    FROM audit_logs l
    LEFT JOIN users u ON u.id=l.actor_user_id
    WHERE datetime(l.created_at) >= datetime('now','-' || ? || ' days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 1000
  ` : `
    SELECT l.*, u.username AS actor_username
    FROM audit_logs l
    LEFT JOIN users u ON u.id=l.actor_user_id
    WHERE l.actor_user_id=?
      AND datetime(l.created_at) >= datetime('now','-' || ? || ' days')
      AND (u.status IS NULL OR u.status!='deleted')
    ORDER BY datetime(l.created_at) DESC
    LIMIT 500
  `;

  const rows = isAdmin
    ? await env.DB.prepare(sql).bind(retentionDays).all<OperationLogRow>()
    : await env.DB.prepare(sql).bind(user.id, retentionDays).all<OperationLogRow>();

  return ok({ logs: (rows.results || []).map(serializeOperationLog), retentionDays, scope: isAdmin ? 'admin' : 'self' });
}

async function deleteOperationLogsBatch(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const deleteAll = body.all === true;
  const ids = Array.from(new Set((Array.isArray(body.ids) ? body.ids : [])
    .map(value => cleanText(value, 80))
    .filter(Boolean)))
    .slice(0, 1000);
  if (!deleteAll && !ids.length) throw new HttpError(400, 'AUDIT_LOG_SELECTION_REQUIRED', '请选择要删除的操作日志');

  let deleted = 0;
  if (deleteAll) {
    const result = user.role === 'admin'
      ? await env.DB.prepare(`DELETE FROM audit_logs`).run()
      : await env.DB.prepare(`DELETE FROM audit_logs WHERE actor_user_id=?`).bind(user.id).run();
    deleted = Number(result.meta?.changes || 0);
  } else {
    const placeholders = ids.map(() => '?').join(',');
    const result = user.role === 'admin'
      ? await env.DB.prepare(`DELETE FROM audit_logs WHERE id IN (${placeholders})`).bind(...ids).run()
      : await env.DB.prepare(`DELETE FROM audit_logs WHERE actor_user_id=? AND id IN (${placeholders})`).bind(user.id, ...ids).run();
    deleted = Number(result.meta?.changes || 0);
  }

  console.info('operation logs deleted', { actorUserId: user.id, role: user.role, deleteAll, requested: ids.length, deleted });
  return ok({ deleted, all: deleteAll });
}

function serializeOperationLog(row: OperationLogRow) {
  let meta: Record<string, unknown> = {};
  try { meta = row.meta_json ? JSON.parse(row.meta_json) : {}; } catch { meta = {}; }
  const actionText = operationActionText(row.action);
  return {
    id: row.id,
    actorUserId: row.actor_user_id || null,
    actorUsername: row.actor_username || (row.actor_user_id ? '未知用户' : '系统'),
    action: row.action,
    actionText,
    description: operationDescription(row.action, row.target_type || '', row.target_id || '', meta),
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    ip: row.ip || null,
    meta,
    createdAt: row.created_at,
  };
}

function operationActionText(action: string): string {
  const map: Record<string, string> = {
    'setup.bootstrap_admin': '初始化管理员',
    'auth.register': '注册账号',
    'auth.login': '登录账户',
    'auth.logout': '退出登录',
    'auth.login_failed': '登录失败',
    'auth.password_changed': '修改密码',
    'account.delete_self': '注销账号',
    'application.create': '申请域名',
    'application.dns_update': '更新主解析',
    'dns_record.create': '添加 DNS 解析',
    'dns_record.update': '修改 DNS 解析',
    'dns_record.delete': '删除 DNS 解析',
    'application.renew': '域名续期',
    'application.delete_request': '申请删除域名',
    'application.delete_request_cancel': '撤销删除申请',
    'application.delete_invalid': '删除无效域名',
    'application.reject': '拒绝域名申请',
    'application.approve': '批准域名申请',
    'application.disable': '禁用域名',
    'application.enable': '取消禁用域名',
    'application.control': '管控域名',
    'application.uncontrol': '取消管控域名',
    'application.revoke': '撤销域名',
    'admin.application_delete': '管理员删除域名',
    'admin.application_delete_approve': '批准删除域名',
    'admin.application_delete_reject': '拒绝删除域名',
    'admin.user_create': '管理员创建用户',
    'admin.user_update': '管理员编辑用户',
    'admin.settings_site': '修改界面设置',
    'admin.settings_registration': '修改注册设置',
    'admin.settings_domain': '修改域名规则',
    'admin.message_sent': '发送消息',
    'admin.message_draft': '保存消息草稿',
    'admin.message_template': '保存消息模板',
    'admin.message_update': '编辑消息',
    'admin.message_send': '发送草稿消息',
    'admin.message_delete': '删除消息',
    'message.contact_admin': '联系管理员',
    'message.reply': '回复消息',
  };
  return map[action] || action;
}

function operationDescription(action: string, targetType: string, targetId: string, meta: Record<string, unknown>): string {
  const fqdn = String(meta.fqdnAscii || meta.fqdn || meta.name || '').trim();
  const type = String(meta.type || meta.recordType || '').trim();
  const content = String(meta.content || meta.recordContent || '').trim();
  if (action === 'application.create' && fqdn) return `提交域名申请：${fqdn}`;
  if (action === 'application.approve') return `管理员批准域名申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.reject') return `管理员拒绝域名申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.enable') return `管理员取消禁用域名${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.disable') return `管理员禁用域名并移除解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.revoke') return `管理员撤销域名并移除解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'dns_record.create') return `添加 DNS 解析${fqdn ? `：${fqdn}` : ''}${type ? `（${type}${content ? ` → ${content}` : ''}）` : ''}`;
  if (action === 'dns_record.update') return `修改 DNS 解析${fqdn ? `：${fqdn}` : ''}${type ? `（${type}${content ? ` → ${content}` : ''}）` : ''}`;
  if (action === 'dns_record.delete') return `删除 DNS 解析${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.delete_request') return `用户提交域名删除申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.delete_request_cancel') return `用户撤销 12 小时内的域名删除申请${targetId ? `（ID：${targetId}）` : ''}`;
  if (action === 'application.renew') return `用户提交域名续期${meta.newExpires ? `，新到期时间：${String(meta.newExpires)}` : ''}`;
  if (action === 'auth.login') return '用户成功登录系统';
  if (action === 'auth.logout') return '用户退出登录';
  if (action === 'auth.login_failed') return `登录失败${meta.identity ? `：${String(meta.identity)}` : ''}`;
  if (action === 'admin.user_create') return `管理员创建用户${meta.username ? `：${String(meta.username)}` : ''}`;
  if (action === 'admin.user_update') return `管理员更新用户资料、状态或额度${targetId ? `（ID：${targetId}）` : ''}`;
  if (action.startsWith('admin.message_')) return '管理员处理消息中心内容';
  if (action.startsWith('admin.settings_')) return '管理员修改系统设置';
  return `${operationActionText(action)}${targetType ? `（${targetType}${targetId ? `：${targetId}` : ''}）` : ''}`;
}


async function contactAdminMessage(request: Request, env: Env): Promise<Response> {
  const user = await getAuthUser(env, request);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body ?? body.content, 5000);
  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', '请填写消息标题');
  if (!text) throw new HttpError(400, 'BODY_REQUIRED', '请填写消息内容');
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, 'role', NULL, 'admin', ?, ?, 'feedback', 'sent', datetime('now'))
  `).bind(id, user.id, title, text).run();
  await audit(env, request, user.id, 'message.contact_admin', 'message', id, { title });
  await sendAdminCloudflareEmailSafe(env, 'help_submission', {
    subject: `【用户帮助】${title}`,
    text: [
      '用户通过系统帮助入口提交了信息。',
      '',
      `用户名：${user.username}`,
      `用户 ID：${user.id}`,
      `邮箱：${user.email || '未填写'}`,
      `手机号：${user.phone || '未填写'}`,
      `提交时间：${new Date().toISOString()}`,
      `客户端 IP：${clientIp(request) || '未知'}`,
      '',
      `主题：${title}`,
      '',
      text,
      '',
      `后台查看：${new URL(request.url).origin}/#/messages`,
    ].join('\n'),
    fingerprint: `help|${id}`,
    cooldownSeconds: 60,
  });
  const row = await env.DB.prepare(`SELECT m.*, sender.username AS sender_username FROM system_messages m LEFT JOIN users sender ON sender.id=m.sender_user_id WHERE m.id=?`).bind(id).first<MessageRow>();
  return ok({ sent: true, movedToMessageCenter: true, message: serializeMessage(row!) });
}


const SUPPORT_TICKET_CATEGORIES = new Set(['general','technical','application']);
const SUPPORT_TICKET_PRIORITIES = new Set(['low','normal','high','urgent']);
const SUPPORT_TICKET_STATUSES = new Set(['open','in_progress','waiting_user','resolved','closed']);
function normalizeSupportCategory(value: unknown): string {
  const v = cleanText(value, 30).toLowerCase();
  if (!SUPPORT_TICKET_CATEGORIES.has(v)) throw new HttpError(400, 'INVALID_TICKET_CATEGORY', '请选择有效的问题板块');
  return v;
}
function normalizeSupportPriority(value: unknown): string {
  const v = cleanText(value, 30).toLowerCase();
  if (!SUPPORT_TICKET_PRIORITIES.has(v)) throw new HttpError(400, 'INVALID_TICKET_PRIORITY', '请选择有效的优先级');
  return v;
}
function normalizeSupportStatus(value: unknown): string {
  const v = cleanText(value, 30).toLowerCase();
  if (!SUPPORT_TICKET_STATUSES.has(v)) throw new HttpError(400, 'INVALID_TICKET_STATUS', '请选择有效的工单状态');
  return v;
}
function supportTicketCategoryLabel(value: string): string {
  return ({general:'综合板块', technical:'技术板块', application:'申请板块'} as Record<string,string>)[value] || value;
}
function supportTicketPriorityLabel(value: string): string {
  return ({low:'低', normal:'普通', high:'高', urgent:'紧急'} as Record<string,string>)[value] || value;
}
function parseSupportClientContext(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try { const parsed = JSON.parse(raw); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null; } catch { return null; }
}
function serializeSupportTicket(row: SupportTicketRow): Record<string, unknown> {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username || null,
    category: row.category,
    priority: row.priority,
    title: row.title,
    description: row.description,
    status: row.status,
    clientContext: parseSupportClientContext(row.client_context_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    lastReplyAt: row.last_reply_at || null,
    closedAt: row.closed_at || null,
  };
}
function serializeSupportReply(row: SupportTicketReplyRow): Record<string, unknown> {
  return { id:row.id, ticketId:row.ticket_id, userId:row.user_id, username:row.username || null, isAdmin:Boolean(row.is_admin), body:row.body, createdAt:row.created_at };
}
async function getSupportTicketRow(env: Env, id: string): Promise<SupportTicketRow | null> {
  return env.DB.prepare(`SELECT t.*, u.username FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id WHERE t.id=? LIMIT 1`).bind(id).first<SupportTicketRow>();
}
async function requireSupportUser(env: Env, request: Request): Promise<UserRow> {
  const user = await getAuthUser(env, request);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  // 支持中心对“已禁用但仍有有效会话”的用户开放，方便联系管理员；deleted 用户不会被 getAuthUser 返回。
  return user;
}
async function assertSupportTicketAccess(env: Env, request: Request, id: string): Promise<{ user: UserRow; ticket: SupportTicketRow }> {
  const user = await requireSupportUser(env, request);
  const ticket = await getSupportTicketRow(env, id);
  if (!ticket) throw new HttpError(404, 'TICKET_NOT_FOUND', '工单不存在');
  if (user.role !== 'admin' && ticket.user_id !== user.id) throw new HttpError(403, 'TICKET_FORBIDDEN', '无权访问该工单');
  return { user, ticket };
}
async function listSupportTickets(request: Request, env: Env, url: URL): Promise<Response> {
  const user = await requireSupportUser(env, request);
  const status = cleanText(url.searchParams.get('status'), 30).toLowerCase();
  const category = cleanText(url.searchParams.get('category'), 30).toLowerCase();
  const priority = cleanText(url.searchParams.get('priority'), 30).toLowerCase();
  const q = cleanText(url.searchParams.get('q'), 120).toLowerCase();
  const rows = await (user.role === 'admin'
    ? env.DB.prepare(`SELECT t.*, u.username FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id ORDER BY datetime(COALESCE(t.updated_at,t.created_at)) DESC LIMIT 1000`).all<SupportTicketRow>()
    : env.DB.prepare(`SELECT t.*, u.username FROM support_tickets t LEFT JOIN users u ON u.id=t.user_id WHERE t.user_id=? ORDER BY datetime(COALESCE(t.updated_at,t.created_at)) DESC LIMIT 500`).bind(user.id).all<SupportTicketRow>());
  let tickets = (rows.results || []).filter(t => (!status || t.status === status) && (!category || t.category === category) && (!priority || t.priority === priority));
  if (q) tickets = tickets.filter(t => `${t.id} ${t.title} ${t.username || ''}`.toLowerCase().includes(q));
  return ok({ tickets: tickets.map(serializeSupportTicket), scope:user.role === 'admin' ? 'all' : 'own' });
}
async function createSupportTicket(request: Request, env: Env): Promise<Response> {
  const user = await requireSupportUser(env, request);
  await rateLimit(env, request, `support-ticket:${user.id}`, 10, 3600);
  const body = await readJson<Record<string, unknown>>(request, 64 * 1024);
  const category = normalizeSupportCategory(body.category || 'general');
  const priority = normalizeSupportPriority(body.priority || 'normal');
  const title = cleanText(body.title, 120);
  const description = cleanText(body.description, 5000);
  if (title.length < 4) throw new HttpError(400, 'TICKET_TITLE_TOO_SHORT', '工单标题至少填写 4 个字符');
  if (description.length < 10) throw new HttpError(400, 'TICKET_DESCRIPTION_TOO_SHORT', '问题描述至少填写 10 个字符');
  let contextJson: string | null = null;
  if (body.clientContext && typeof body.clientContext === 'object' && !Array.isArray(body.clientContext)) {
    const c = body.clientContext as Record<string, unknown>;
    contextJson = JSON.stringify({ page:cleanText(c.page,120), userAgent:cleanText(c.userAgent,500), language:cleanText(c.language,40), screen:cleanText(c.screen,40), viewport:cleanText(c.viewport,40), generatedAt:cleanText(c.generatedAt,80) });
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO support_tickets (id,user_id,category,priority,title,description,status,client_context_json) VALUES (?,?,?,?,?,?,'open',?)`).bind(id,user.id,category,priority,title,description,contextJson).run();
  await audit(env, request, user.id, 'support.ticket_create', 'support_ticket', id, {category,priority,title});
  await sendAdminCloudflareEmailSafe(env, 'help_submission', {
    subject:`【新工单 / ${supportTicketPriorityLabel(priority)}】${title}`,
    text:[`工单编号：${id}`,`用户：${user.username} (${user.id})`,`板块：${supportTicketCategoryLabel(category)}`,`优先级：${supportTicketPriorityLabel(priority)}`,`提交时间：${new Date().toISOString()}`,'',description,'',`后台查看：${new URL(request.url).origin}/#/support/ticket/${id}`].join('\n'),
    fingerprint:`ticket-create|${id}`, cooldownSeconds:30,
  });
  const row = await getSupportTicketRow(env,id);
  return ok({ ticket:serializeSupportTicket(row!) });
}
async function getSupportTicket(request: Request, env: Env, id: string): Promise<Response> {
  const { ticket } = await assertSupportTicketAccess(env, request, id);
  const replies = await env.DB.prepare(`SELECT r.*, u.username FROM support_ticket_replies r LEFT JOIN users u ON u.id=r.user_id WHERE r.ticket_id=? ORDER BY datetime(r.created_at) ASC`).bind(id).all<SupportTicketReplyRow>();
  return ok({ ticket:serializeSupportTicket(ticket), replies:(replies.results || []).map(serializeSupportReply) });
}
async function updateSupportTicket(request: Request, env: Env, id: string): Promise<Response> {
  const { user, ticket } = await assertSupportTicketAccess(env, request, id);
  const body = await readJson<Record<string, unknown>>(request, 32 * 1024);
  if (ticket.status === 'closed' && user.role !== 'admin') throw new HttpError(409,'TICKET_CLOSED','已关闭工单不能再修改');
  const category = body.category !== undefined ? normalizeSupportCategory(body.category) : ticket.category;
  const priority = body.priority !== undefined ? normalizeSupportPriority(body.priority) : ticket.priority;
  let status = ticket.status;
  if (body.status !== undefined) {
    if (user.role !== 'admin') throw new HttpError(403,'ADMIN_REQUIRED','只有管理员可以修改工单处理状态');
    status = normalizeSupportStatus(body.status);
  }
  const closedAt = status === 'closed' ? new Date().toISOString() : null;
  await env.DB.prepare(`UPDATE support_tickets SET category=?, priority=?, status=?, updated_at=datetime('now'), closed_at=? WHERE id=?`).bind(category,priority,status,closedAt,id).run();
  await audit(env, request, user.id, 'support.ticket_update', 'support_ticket', id, {category,priority,status});
  const row = await getSupportTicketRow(env,id);
  return ok({ ticket:serializeSupportTicket(row!) });
}
async function replySupportTicket(request: Request, env: Env, id: string): Promise<Response> {
  const { user, ticket } = await assertSupportTicketAccess(env, request, id);
  if (ticket.status === 'closed') throw new HttpError(409,'TICKET_CLOSED','工单已关闭，不能继续回复');
  await rateLimit(env, request, `support-reply:${user.id}`, 40, 3600);
  const body = await readJson<Record<string, unknown>>(request, 32 * 1024);
  const text = cleanText(body.body, 5000);
  if (text.length < 2) throw new HttpError(400,'TICKET_REPLY_REQUIRED','请填写回复内容');
  const replyId = crypto.randomUUID();
  const isAdmin = user.role === 'admin' ? 1 : 0;
  await env.DB.prepare(`INSERT INTO support_ticket_replies (id,ticket_id,user_id,is_admin,body) VALUES (?,?,?,?,?)`).bind(replyId,id,user.id,isAdmin,text).run();
  const nextStatus = isAdmin ? 'waiting_user' : (ticket.status === 'resolved' || ticket.status === 'waiting_user' ? 'open' : ticket.status);
  await env.DB.prepare(`UPDATE support_tickets SET status=?, last_reply_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).bind(nextStatus,id).run();
  await audit(env, request, user.id, 'support.ticket_reply', 'support_ticket', id, {isAdmin:Boolean(isAdmin)});
  if (isAdmin) {
    await env.DB.prepare(`INSERT INTO system_messages (id,sender_user_id,target_type,target_user_id,title,body,level,status,sent_at) VALUES (?,?, 'user', ?, ?, ?, 'support_reply', 'sent', datetime('now'))`).bind(crypto.randomUUID(),user.id,ticket.user_id,`工单 ${id.replace(/-/g,'').slice(0,8).toUpperCase()} 有新回复`,text).run();
  } else {
    await sendAdminCloudflareEmailSafe(env,'help_submission',{subject:`【工单回复】${ticket.title}`,text:[`工单：${id}`,`用户：${user.username}`,'',text,'',`后台查看：${new URL(request.url).origin}/#/support/ticket/${id}`].join('\n'),fingerprint:`ticket-reply|${replyId}`,cooldownSeconds:15});
  }
  const row = await env.DB.prepare(`SELECT r.*, u.username FROM support_ticket_replies r LEFT JOIN users u ON u.id=r.user_id WHERE r.id=?`).bind(replyId).first<SupportTicketReplyRow>();
  return ok({ reply:serializeSupportReply(row!), status:nextStatus });
}

async function listOwnMessages(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const rows = await env.DB.prepare(`
    SELECT m.*,
      sender.username AS sender_username,
      target.username AS target_username,
      r.read_at,
      CASE
        WHEN m.target_type='user' AND m.target_user_id IS NOT NULL THEN (
          SELECT COUNT(*) FROM message_reads rr WHERE rr.message_id=m.id AND rr.user_id=m.target_user_id
        )
        WHEN m.target_type='role' AND m.target_role IS NOT NULL THEN (
          SELECT COUNT(DISTINCT rr.user_id)
          FROM message_reads rr
          JOIN users ru ON ru.id=rr.user_id
          WHERE rr.message_id=m.id AND ru.role=m.target_role AND ru.status!='deleted'
        )
        WHEN m.target_type='all' THEN (
          SELECT COUNT(DISTINCT rr.user_id)
          FROM message_reads rr
          JOIN users ru ON ru.id=rr.user_id
          WHERE rr.message_id=m.id AND ru.status!='deleted'
        )
        ELSE 0
      END AS recipient_read_count
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    LEFT JOIN user_message_deletions hidden ON hidden.message_id=m.id AND hidden.user_id=?
    WHERE m.status='sent'
      AND (m.deleted_at IS NULL OR m.deleted_at='')
      AND hidden.message_id IS NULL
      AND (
        m.sender_user_id=?
        OR (m.target_type='user' AND m.target_user_id=?)
        OR (
          (m.target_type='all' OR (m.target_type='role' AND m.target_role=?))
          AND datetime(COALESCE(m.sent_at, m.created_at)) >= datetime(?)
        )
      )
    ORDER BY COALESCE(m.sent_at, m.created_at) DESC
    LIMIT 1000
  `).bind(user.id, user.id, user.id, user.id, user.role, user.created_at).all<MessageRow>();
  const messages = (rows.results || []).map(row => {
    const msg = serializeMessage(row) as ReturnType<typeof serializeMessage> & Record<string, unknown>;
    const sentByMe = row.sender_user_id === user.id;
    const recipientReadCount = Number((row as any).recipient_read_count || 0);
    msg.sentByMe = sentByMe;
    msg.recipientReadCount = recipientReadCount;
    msg.recipientRead = recipientReadCount > 0;
    if (sentByMe) {
      msg.isRead = true;
      const sentTime = Date.parse(String(row.sent_at || row.created_at || '').replace(' ', 'T') + 'Z');
      const canWithdraw = Number.isFinite(sentTime) && Date.now() - sentTime <= 15 * 60 * 1000;
      msg.canWithdraw = canWithdraw;
      msg.withdrawUntil = Number.isFinite(sentTime) ? new Date(sentTime + 15 * 60 * 1000).toISOString() : null;
      if (row.target_type === 'role' && row.target_role === 'admin') msg.recipientReadText = recipientReadCount > 0 ? '管理员已读' : '管理员未读';
      else if (row.target_type === 'role' && row.target_role === 'user') msg.recipientReadText = recipientReadCount > 0 ? '用户已读' : '用户未读';
      else if (row.target_type === 'all') msg.recipientReadText = recipientReadCount > 0 ? `已有 ${recipientReadCount} 人已读` : '全部未读';
      else msg.recipientReadText = recipientReadCount > 0 ? '对方已读' : '对方未读';
    }
    return msg;
  });
  return ok({ messages, unread: messages.filter(m => !m.sentByMe && !m.isRead).length });
}

async function replyOwnMessage(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const text = cleanText(body.body ?? body.content ?? body.reply, 5000);
  if (!text) throw new HttpError(400, 'REPLY_REQUIRED', '请填写回复内容');

  const original = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username, r.read_at
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    WHERE m.id=? AND m.status='sent' AND (m.deleted_at IS NULL OR m.deleted_at='')
      AND (
        m.sender_user_id=?
        OR (m.target_type='user' AND m.target_user_id=?)
        OR (
          (m.target_type='all' OR (m.target_type='role' AND m.target_role=?))
          AND datetime(COALESCE(m.sent_at, m.created_at)) >= datetime(?)
        )
      )
  `).bind(user.id, id, user.id, user.id, user.role, user.created_at).first<MessageRow>();
  if (!original) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权回复');

  let targetType = 'user';
  let targetUserId: string | null = null;
  let targetRole: string | null = null;

  if (original.sender_user_id && original.sender_user_id !== user.id) {
    targetType = 'user';
    targetUserId = original.sender_user_id;
  } else if (original.target_type === 'user' && original.target_user_id && original.target_user_id !== user.id) {
    targetType = 'user';
    targetUserId = original.target_user_id;
  } else if (original.target_type === 'role' && original.target_role) {
    targetType = 'role';
    targetRole = original.target_role;
  } else {
    throw new HttpError(400, 'MESSAGE_CANNOT_REPLY', '这条消息无法直接回复');
  }

  const originalSender = original.sender_username || '系统管理员';
  const originalTime = original.sent_at || original.created_at || '';
  const quotedBody = [
    text,
    '',
    '---------- 原信息 ----------',
    `发送人：${originalSender}`,
    originalTime ? `时间：${originalTime}` : '',
    `标题：${original.title}`,
    '',
    original.body || ''
  ].filter(line => line !== '').join('\n');

  const replyId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))
  `).bind(
    replyId,
    user.id,
    targetType,
    targetUserId,
    targetRole,
    cleanText(`回复：${original.title || '消息'}`, 120),
    cleanText(quotedBody, 5000),
    user.role === 'admin' ? 'support_reply' : 'feedback'
  ).run();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(replyId, user.id).run();
  await audit(env, request, user.id, 'message.reply', 'message', replyId, { originalMessageId: id, targetType, targetUserId, targetRole });
  const row = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username, r.read_at
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    LEFT JOIN message_reads r ON r.message_id=m.id AND r.user_id=?
    WHERE m.id=?
  `).bind(user.id, replyId).first<MessageRow>();
  return ok({ replied: true, message: serializeMessage(row!) });
}

async function withdrawOwnMessage(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const message = await env.DB.prepare(`
    SELECT id, sender_user_id, sent_at, created_at
    FROM system_messages
    WHERE id=? AND sender_user_id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id, user.id).first<MessageRow>();
  if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权撤销');

  const allowed = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id=? AND sender_user_id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND datetime(COALESCE(sent_at, created_at)) >= datetime('now','-15 minutes')
  `).bind(id, user.id).first<{ id: string }>();
  if (!allowed) throw new HttpError(400, 'WITHDRAW_EXPIRED', '已超过 15 分钟，不能撤销');

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id=?`).bind(id),
    env.DB.prepare(`DELETE FROM system_messages WHERE id=? AND sender_user_id=?`).bind(id, user.id),
  ]);
  return ok({ withdrawn: true });
}

async function markOwnMessageRead(request: Request, env: Env, id: string): Promise<Response> {
  const user = await requireUser(env, request);
  const message = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id=? AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND (
        (target_type='user' AND target_user_id=?)
        OR (
          (target_type='all' OR (target_type='role' AND target_role=?))
          AND datetime(COALESCE(sent_at, created_at)) >= datetime(?)
        )
      )
  `).bind(id, user.id, user.role, user.created_at).first<{ id: string }>();
  if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权查看');
  await env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id).run();
  return ok({ read: true });
}

async function markOwnMessagesReadBatch(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 64 * 1024);
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = Array.from(new Set(rawIds.map(x => cleanText(x, 80)).filter(Boolean))).slice(0, 200);
  if (!ids.length) throw new HttpError(400, 'NO_MESSAGE_IDS', '请选择要标记已读的消息');

  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id IN (${placeholders}) AND status='sent' AND (deleted_at IS NULL OR deleted_at='')
      AND (
        (target_type='user' AND target_user_id=?)
        OR (
          (target_type='all' OR (target_type='role' AND target_role=?))
          AND datetime(COALESCE(sent_at, created_at)) >= datetime(?)
        )
      )
  `).bind(...ids, user.id, user.role, user.created_at).all<{ id: string }>();
  const allowed = (rows.results || []).map(x => x.id);
  if (!allowed.length) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权查看');

  await env.DB.batch(allowed.map(id => env.DB.prepare(`
    INSERT OR REPLACE INTO message_reads (message_id, user_id, read_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id)));
  return ok({ read: true, count: allowed.length });
}

async function deleteOwnMessagesBatch(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(env, request);
  const body = await readJson<Record<string, unknown>>(request, 64 * 1024);
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids = Array.from(new Set(rawIds.map(value => cleanText(value, 80)).filter(Boolean))).slice(0, 500);
  if (!ids.length) throw new HttpError(400, 'NO_MESSAGE_IDS', '请选择要删除的消息');
  const placeholders = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(`
    SELECT id FROM system_messages
    WHERE id IN (${placeholders})
      AND status='sent'
      AND (deleted_at IS NULL OR deleted_at='')
      AND (
        sender_user_id=?
        OR (target_type='user' AND target_user_id=?)
        OR (
          (target_type='all' OR (target_type='role' AND target_role=?))
          AND datetime(COALESCE(sent_at, created_at)) >= datetime(?)
        )
      )
  `).bind(...ids, user.id, user.id, user.role, user.created_at).all<{ id: string }>();
  const allowed = (rows.results || []).map(row => row.id);
  if (!allowed.length) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在或无权删除');
  await env.DB.batch(allowed.map(id => env.DB.prepare(`
    INSERT OR REPLACE INTO user_message_deletions (message_id, user_id, deleted_at)
    VALUES (?, ?, datetime('now'))
  `).bind(id, user.id)));
  await audit(env, request, user.id, 'message.delete_self', 'message', null, { count: allowed.length });
  return ok({ deleted: true, count: allowed.length });
}

async function adminListMessages(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const status = String(url.searchParams.get('status') || '').toLowerCase();
  const where = status && ['sent','draft','template'].includes(status) ? `AND m.status='${status}'` : '';
  const rows = await env.DB.prepare(`
    SELECT m.*, sender.username AS sender_username, target.username AS target_username,
      (SELECT COUNT(*) FROM message_reads r WHERE r.message_id=m.id) AS read_count
    FROM system_messages m
    LEFT JOIN users sender ON sender.id=m.sender_user_id
    LEFT JOIN users target ON target.id=m.target_user_id
    WHERE (m.deleted_at IS NULL OR m.deleted_at='') ${where}
    ORDER BY COALESCE(m.updated_at, m.sent_at, m.created_at) DESC
    LIMIT 500
  `).all<any>();
  const raw = rows.results || [];
  const receipts = await getReadReceipts(env, raw.map((row: any) => row.id));
  return ok({ messages: raw.map((row: any) => {
    const readUsers = receipts[row.id] || [];
    return { ...serializeMessage(row), readCount: Number(row.read_count || 0), readUsers };
  }) });
}

async function buildMessagePayload(env: Env, body: Record<string, unknown>) {
  const status = normalizeMessageStatus(body.status);
  const title = cleanText(body.title, 120);
  const text = cleanText(body.body ?? body.content, 5000);
  if (!title) throw new HttpError(400, 'TITLE_REQUIRED', '请填写消息标题');
  if (!text) throw new HttpError(400, 'BODY_REQUIRED', '请填写消息内容');
  let targetType = normalizeTargetType(body.targetType ?? body.target_type);
  let targetUserId = cleanText(body.targetUserId ?? body.target_user_id, 80) || null;
  let targetRole = cleanText(body.targetRole ?? body.target_role, 20) || null;

  // 草稿和模板允许暂时不选择发送对象；真正发送时必须补全对象。
  if (targetType === 'none' && status === 'sent') {
    throw new HttpError(400, 'TARGET_REQUIRED', '立即发送前请选择接收对象');
  }
  if (targetType === 'all') {
    targetUserId = null;
    targetRole = null;
  } else if (targetType === 'role') {
    targetUserId = null;
    targetRole = targetRole === 'admin' ? 'admin' : 'user';
  } else if (targetType === 'user') {
    targetRole = null;
    if (!targetUserId) {
      if (status === 'sent') throw new HttpError(400, 'TARGET_USER_REQUIRED', '请选择接收用户');
      targetType = 'none';
      targetUserId = null;
    } else {
      const user = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status!='deleted'`).bind(targetUserId).first<{ id: string }>();
      if (!user) throw new HttpError(404, 'TARGET_USER_NOT_FOUND', '接收用户不存在');
    }
  }
  return {
    title,
    body: text,
    targetType,
    targetUserId,
    targetRole,
    level: normalizeMessageLevel(body.level),
    status,
  };
}

async function adminCreateMessage(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const payload = await buildMessagePayload(env, body);
  const id = crypto.randomUUID();
  const sentAtSql = payload.status === 'sent' ? `datetime('now')` : `NULL`;
  await env.DB.prepare(`
    INSERT INTO system_messages (id, sender_user_id, target_type, target_user_id, target_role, title, body, level, status, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${sentAtSql})
  `).bind(id, admin.id, payload.targetType, payload.targetUserId, payload.targetRole, payload.title, payload.body, payload.level, payload.status).run();
  await audit(env, request, admin.id, `admin.message_${payload.status}`, 'message', id, payload);
  const row = await env.DB.prepare(`SELECT m.*, u.username AS sender_username FROM system_messages m LEFT JOIN users u ON u.id=m.sender_user_id WHERE m.id=?`).bind(id).first<MessageRow>();
  return ok({ message: serializeMessage(row!) });
}

async function adminUpdateMessage(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const existing = await env.DB.prepare(`SELECT * FROM system_messages WHERE id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(id).first<MessageRow>();
  if (!existing) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在');
  if (existing.status === 'sent') throw new HttpError(409, 'SENT_MESSAGE_LOCKED', '已发送消息不能编辑，可删除后重新发送');
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const payload = await buildMessagePayload(env, body);
  const status = payload.status === 'sent' ? existing.status : payload.status;
  await env.DB.prepare(`
    UPDATE system_messages
    SET target_type=?, target_user_id=?, target_role=?, title=?, body=?, level=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(payload.targetType, payload.targetUserId, payload.targetRole, payload.title, payload.body, payload.level, status, id).run();
  await audit(env, request, admin.id, 'admin.message_update', 'message', id, payload);
  return ok({ updated: true });
}

async function adminSendMessage(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const existing = await env.DB.prepare(`SELECT * FROM system_messages WHERE id=? AND (deleted_at IS NULL OR deleted_at='')`).bind(id).first<MessageRow>();
  if (!existing) throw new HttpError(404, 'MESSAGE_NOT_FOUND', '消息不存在');
  if (existing.target_type === 'none') throw new HttpError(400, 'TARGET_REQUIRED', '发送草稿前请先编辑并选择接收对象');
  if (existing.target_type === 'user' && !existing.target_user_id) throw new HttpError(400, 'TARGET_USER_REQUIRED', '发送草稿前请先选择接收用户');
  await env.DB.prepare(`
    UPDATE system_messages
    SET status='sent', sent_at=COALESCE(sent_at, datetime('now')), updated_at=datetime('now')
    WHERE id=?
  `).bind(id).run();
  await audit(env, request, admin.id, 'admin.message_send', 'message', id, {});
  return ok({ sent: true });
}

async function adminDeleteMessage(request: Request, env: Env, id: string): Promise<Response> {
  await requireAdmin(env, request);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM message_reads WHERE message_id=?`).bind(id),
    env.DB.prepare(`DELETE FROM user_message_deletions WHERE message_id=?`).bind(id),
    env.DB.prepare(`DELETE FROM system_messages WHERE id=?`).bind(id),
    env.DB.prepare(`DELETE FROM audit_logs WHERE target_type='message' AND target_id=?`).bind(id),
  ]);
  await deleteKnownKvKeys(env, [`message:${id}`, `system_message:${id}`]);
  return ok({ deleted: true, purged: true });
}

async function adminOverview(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const [users, apps, today] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status='active') AS active FROM users WHERE status!='deleted'`).first<any>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS total,
      SUM(status='pending') AS pending,
      SUM(status='approved') AS approved,
      SUM(status='rejected') AS rejected,
      SUM(status='revoked') AS revoked,
      SUM(CASE WHEN delete_requested_at IS NOT NULL AND delete_requested_at!='' THEN 1 ELSE 0 END) AS delete_requested
      FROM domain_applications WHERE (deleted_at IS NULL OR deleted_at='')
    `).first<any>(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM domain_applications WHERE date(created_at)=date('now')`).first<any>(),
  ]);

  return ok({ overview: { users, applications: apps, today: Number(today?.count || 0) } });
}


function applicationFqdnForDnsImport(app: any): string {
  const direct = normalizeCloudflareDnsName(app?.fqdn_ascii || app?.fqdn_unicode || '');
  if (direct) return direct;
  const prefix = normalizeCloudflareDnsName(app?.prefix_ascii || app?.prefix_unicode || '');
  const suffix = normalizeCloudflareDnsName(app?.suffix_ascii || app?.suffix_unicode || '');
  return prefix && suffix ? `${prefix}.${suffix}` : '';
}

async function adminDiscoverExistingDns(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const appsResult = await env.DB.prepare(`
    SELECT a.*, u.username
    FROM domain_applications a
    LEFT JOIN users u ON u.id=a.user_id
    WHERE (a.deleted_at IS NULL OR a.deleted_at='')
    ORDER BY LENGTH(COALESCE(a.fqdn_ascii,a.fqdn_unicode,'')) DESC,
             COALESCE(a.fqdn_ascii,a.fqdn_unicode,'') ASC
    LIMIT 5000
  `).all<ApplicationRow>();
  const applications = (appsResult.results || []).map(app => ({
    ...app,
    __fqdn: applicationFqdnForDnsImport(app),
  })).filter(app => app.__fqdn);

  const localResult = await env.DB.prepare(`
    SELECT application_id, cf_record_id, name, type, content, priority
    FROM dns_records
    WHERE (deleted_at IS NULL OR deleted_at='')
  `).all<any>();
  const localIds = new Set<string>();
  const localCfRecordIds = new Set<string>();
  const localSignatures = new Set<string>();
  const localDnsCountByApp = new Map<string, number>();
  for (const row of localResult.results || []) {
    if (row.application_id) localDnsCountByApp.set(String(row.application_id), (localDnsCountByApp.get(String(row.application_id)) || 0) + 1);
    if (row.cf_record_id) {
      localIds.add(`${row.application_id}|${row.cf_record_id}`);
      localCfRecordIds.add(String(row.cf_record_id));
    }
    localSignatures.add(dnsImportSignature(row.application_id, row));
  }

  const discovered: any[] = [];
  const skippedRecords: any[] = [];
  const warnings: string[] = [];
  const zoneStats: any[] = [];
  let totalRemoteRecords = 0;
  let matchedRemoteRecords = 0;
  let duplicateCount = 0;
  let unsupportedCount = 0;
  let unmatchedCount = 0;
  let scannedZones = 0;
  const remoteDnsCountByApp = new Map<string, number>();

  const configuredSuffixes = (settings.dns.suffixes || [])
    .map(item => ({ ...item, __root: normalizeCloudflareDnsName(item.suffixAscii || item.suffix || '') }))
    .filter(item => item.__root && item.zoneId);

  for (const suffix of configuredSuffixes) {
    const root = suffix.__root;
    const token = resolveDnsToken(env, settings, suffix);
    const stat = {
      suffix: root,
      zoneId: suffix.zoneId,
      systemDomains: 0,
      cloudflareRecords: 0,
      matched: 0,
      importable: 0,
      duplicate: 0,
      unsupported: 0,
      unmatched: 0,
      error: '',
    };
    const suffixApps = applications
      .filter(app => app.__fqdn === root || app.__fqdn.endsWith(`.${root}`))
      .sort((a, b) => b.__fqdn.length - a.__fqdn.length);
    stat.systemDomains = suffixApps.length;

    if (!token) {
      stat.error = '缺少 Cloudflare API Token';
      warnings.push(`${root}：缺少 Cloudflare API Token`);
      zoneStats.push(stat);
      continue;
    }

    let remoteRecords: any[] = [];
    try {
      remoteRecords = await listCloudflareDnsRecords(token, suffix.zoneId);
      scannedZones += 1;
      stat.cloudflareRecords = remoteRecords.length;
      totalRemoteRecords += remoteRecords.length;
    } catch (error) {
      stat.error = error instanceof Error ? error.message : 'Cloudflare DNS 查询失败';
      warnings.push(`${root}：${stat.error}`);
      zoneStats.push(stat);
      continue;
    }

    for (const remote of remoteRecords) {
      const remoteName = normalizeCloudflareDnsName(remote?.name);
      if (!remoteName) continue;
      const app = suffixApps.find(item => remoteName === item.__fqdn || remoteName.endsWith(`.${item.__fqdn}`));
      if (!app) {
        unmatchedCount += 1;
        stat.unmatched += 1;
        const cfRecordId = String(remote?.id || '').trim();
        const local = cloudflareDnsRecordToLocal(remote, remoteName);
        if (!local) {
          unsupportedCount += 1;
          stat.unsupported += 1;
          if (skippedRecords.length < 300) {
            skippedRecords.push({
              zone: root,
              name: remoteName,
              type: String(remote?.type || '').toUpperCase(),
              content: String(remote?.content || ''),
              reason: SUPPORTED_DNS_RECORD_TYPES.includes(String(remote?.type || '').toUpperCase() as DnsRecordType)
                ? '记录内容无法转换为系统格式'
                : '系统暂不支持该 DNS 类型',
            });
          }
          continue;
        }
        if (!cfRecordId) continue;
        if (localCfRecordIds.has(cfRecordId)) {
          duplicateCount += 1;
          stat.duplicate += 1;
          continue;
        }
        discovered.push({
          key: `admin:${root}:${cfRecordId}`,
          applicationId: '',
          cfRecordId,
          zoneRoot: root,
          ownerMode: 'admin',
          needsAdminDomain: true,
          domain: remoteName,
          domainAscii: remoteName,
          domainStatus: '未登记',
          username: admin.username || '管理员',
          host: local.host,
          name: local.name,
          type: local.type,
          content: local.content,
          priority: local.priority,
          proxied: Boolean(local.proxied),
          ttl: local.ttl,
        });
        stat.importable += 1;
        if (discovered.length >= 5000) break;
        continue;
      }

      matchedRemoteRecords += 1;
      stat.matched += 1;
      remoteDnsCountByApp.set(String(app.id), (remoteDnsCountByApp.get(String(app.id)) || 0) + 1);
      const local = cloudflareDnsRecordToLocal(remote, app.__fqdn);
      if (!local) {
        unsupportedCount += 1;
        stat.unsupported += 1;
        if (skippedRecords.length < 300) {
          skippedRecords.push({
            zone: root,
            domain: app.fqdn_unicode || app.__fqdn,
            name: remoteName,
            type: String(remote?.type || '').toUpperCase(),
            content: String(remote?.content || ''),
            reason: SUPPORTED_DNS_RECORD_TYPES.includes(String(remote?.type || '').toUpperCase() as DnsRecordType)
              ? '记录内容无法转换为系统格式'
              : '系统暂不支持该 DNS 类型',
          });
        }
        continue;
      }

      const cfRecordId = String(remote?.id || '').trim();
      if (!cfRecordId) continue;
      if (localIds.has(`${app.id}|${cfRecordId}`) || localSignatures.has(dnsImportSignature(app.id, local))) {
        duplicateCount += 1;
        stat.duplicate += 1;
        continue;
      }

      discovered.push({
        key: `${app.id}:${cfRecordId}`,
        applicationId: app.id,
        cfRecordId,
        zoneRoot: root,
        ownerMode: 'existing',
        needsAdminDomain: false,
        domain: app.fqdn_unicode || app.__fqdn,
        domainAscii: app.__fqdn,
        domainStatus: app.status || '',
        username: app.username || '',
        host: local.host,
        name: local.name,
        type: local.type,
        content: local.content,
        priority: local.priority,
        proxied: Boolean(local.proxied),
        ttl: local.ttl,
      });
      stat.importable += 1;
      if (discovered.length >= 5000) break;
    }
    zoneStats.push(stat);
    if (discovered.length >= 5000) {
      warnings.push('待同步记录超过 5000 条，本次只显示前 5000 条');
      break;
    }
  }

  if (!configuredSuffixes.length) warnings.push('没有找到已配置 Zone ID 的根域名');

  const domains = applications.map(app => {
    const rootConfig = configuredSuffixes.find(suffix => app.__fqdn === suffix.__root || app.__fqdn.endsWith(`.${suffix.__root}`));
    const reviewNote = String(app.review_note || '');
    return {
      applicationId: app.id,
      domain: app.fqdn_unicode || app.__fqdn,
      domainAscii: app.__fqdn,
      root: rootConfig?.__root || normalizeCloudflareDnsName(app.suffix_ascii || app.suffix_unicode || ''),
      username: app.username || '',
      status: app.status || '',
      source: reviewNote.includes('从 Cloudflare 已有 DNS 同步到管理员名下') ? 'cloudflare' : 'system',
      systemDnsCount: localDnsCountByApp.get(String(app.id)) || 0,
      cloudflareDnsCount: remoteDnsCountByApp.get(String(app.id)) || 0,
    };
  }).sort((a, b) => a.root.localeCompare(b.root) || a.domainAscii.localeCompare(b.domainAscii));

  return ok({
    records: discovered,
    domains,
    skippedRecords,
    warnings: Array.from(new Set(warnings)).slice(0, 50),
    scannedDomains: applications.length,
    configuredZones: configuredSuffixes.length,
    scannedZones,
    totalRemoteRecords,
    matchedRemoteRecords,
    duplicateCount,
    unsupportedCount,
    unmatchedCount,
    zoneStats,
  });
}

async function adminImportExistingDns(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 256 * 1024);
  const rawSelections = Array.isArray(body.records) ? body.records : [];
  const selections = Array.from(new Map(rawSelections.map((value: any) => {
    const applicationId = cleanText(value?.applicationId, 80);
    const cfRecordId = cleanText(value?.cfRecordId, 120);
    const ownerMode = cleanText(value?.ownerMode, 20) === 'admin' ? 'admin' : 'existing';
    const zoneRoot = normalizeCloudflareDnsName(value?.zoneRoot || '');
    const domainAscii = normalizeCloudflareDnsName(value?.domainAscii || value?.domain || '');
    const identity = applicationId || `${ownerMode}:${zoneRoot}:${domainAscii}`;
    return [`${identity}|${cfRecordId}`, { applicationId, cfRecordId, ownerMode, zoneRoot, domainAscii }];
  })).values()).filter(item => item.cfRecordId && (item.applicationId || (item.ownerMode === 'admin' && item.zoneRoot && item.domainAscii))).slice(0, 1000);
  if (!selections.length) throw new HttpError(400, 'DNS_IMPORT_SELECTION_REQUIRED', '请选择要同步的 DNS 记录');

  const existingSelections = selections.filter(item => item.applicationId);
  const appIds = Array.from(new Set(existingSelections.map(item => item.applicationId)));
  const appMap = new Map<string, ApplicationRow>();
  if (appIds.length) {
    const placeholders = appIds.map(() => '?').join(',');
    const appResult = await env.DB.prepare(`
      SELECT a.*, u.username
      FROM domain_applications a
      LEFT JOIN users u ON u.id=a.user_id
      WHERE a.id IN (${placeholders})
        AND (a.deleted_at IS NULL OR a.deleted_at='')
    `).bind(...appIds).all<ApplicationRow>();
    for (const app of appResult.results || []) appMap.set(app.id, app);
  }

  const settings = await loadSettings(env);
  const suffixConfigs = (settings.dns.suffixes || [])
    .map(item => ({ item, root: normalizeCloudflareDnsName(item.suffixAscii || item.suffix || '') }))
    .filter(entry => entry.root)
    .sort((a, b) => b.root.length - a.root.length);

  const grouped = new Map<string, typeof selections>();
  for (const selection of selections) {
    let root = selection.zoneRoot;
    if (selection.applicationId) {
      const app = appMap.get(selection.applicationId);
      if (!app) continue;
      const appFqdn = applicationFqdnForDnsImport(app);
      const match = suffixConfigs.find(entry => appFqdn === entry.root || appFqdn.endsWith(`.${entry.root}`));
      root = match?.root || normalizeCloudflareDnsName(app.suffix_ascii || app.suffix_unicode || '');
    }
    if (!root) continue;
    const list = grouped.get(root) || [];
    list.push(selection);
    grouped.set(root, list);
  }

  async function ensureAdminImportedApplication(root: string, fqdn: string, remote: any): Promise<ApplicationRow> {
    const normalizedFqdn = normalizeCloudflareDnsName(fqdn);
    if (!normalizedFqdn || !(normalizedFqdn === root || normalizedFqdn.endsWith(`.${root}`))) {
      throw new Error(`记录 ${fqdn || '—'} 不属于根域名 ${root}`);
    }
    const existing = await env.DB.prepare(`
      SELECT * FROM domain_applications
      WHERE fqdn_ascii=? COLLATE NOCASE
        AND (deleted_at IS NULL OR deleted_at='')
      ORDER BY CASE status WHEN 'approved' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 1
    `).bind(normalizedFqdn).first<ApplicationRow>();
    if (existing) return existing;

    const prefix = normalizedFqdn === root ? '@' : normalizedFqdn.slice(0, -(root.length + 1));
    const suffixCfg = suffixConfigs.find(entry => entry.root === root)?.item;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const remoteType = String(remote?.type || suffixCfg?.defaultType || 'CNAME').toUpperCase();
    const remoteContent = String(remote?.content || '').trim();
    await env.DB.prepare(`
      INSERT INTO domain_applications (
        id,user_id,prefix_unicode,prefix_ascii,suffix_unicode,suffix_ascii,fqdn_unicode,fqdn_ascii,
        record_type,record_content,proxied,ttl,status,review_note,reviewed_at,reviewed_by,expires_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      id, admin.id, prefix, prefix, suffixCfg?.suffix || root, suffixCfg?.suffixAscii || root,
      normalizedFqdn, normalizedFqdn, remoteType, remoteContent,
      Boolean(remote?.proxied) ? 1 : 0, clamp(Number(remote?.ttl || suffixCfg?.ttl || 1), 1, 86400),
      'approved', '从 Cloudflare 已有 DNS 同步到管理员名下', now, admin.id, null, now,
    ).run();
    const created = await env.DB.prepare(`SELECT * FROM domain_applications WHERE id=?`).bind(id).first<ApplicationRow>();
    if (!created) throw new Error(`无法建立管理员域名 ${normalizedFqdn}`);
    return created;
  }

  let imported = 0;
  let skipped = 0;
  let createdAdminDomains = 0;
  const errors: string[] = [];
  const touchedApps = new Set<string>();
  const createdDomainIds = new Set<string>();

  for (const [suffixAscii, suffixSelections] of grouped.entries()) {
    const suffix = settings.dns.suffixes.find(item => normalizeCloudflareDnsName(item.suffixAscii || item.suffix || '') === suffixAscii);
    if (!suffix) {
      skipped += suffixSelections.length;
      errors.push(`${suffixAscii}：根域名配置不存在`);
      continue;
    }
    const token = resolveDnsToken(env, settings, suffix);
    if (!token || !suffix.zoneId) {
      skipped += suffixSelections.length;
      errors.push(`${suffixAscii}：缺少 Cloudflare API Token 或 Zone ID`);
      continue;
    }
    let remoteRecords: any[];
    try {
      remoteRecords = await listCloudflareDnsRecords(token, suffix.zoneId);
    } catch (error) {
      skipped += suffixSelections.length;
      errors.push(`${suffixAscii}：${error instanceof Error ? error.message : 'Cloudflare DNS 查询失败'}`);
      continue;
    }
    const remoteMap = new Map(remoteRecords.map(record => [String(record?.id || ''), record]));

    for (const selection of suffixSelections) {
      const remote = remoteMap.get(selection.cfRecordId);
      if (!remote) {
        skipped += 1;
        errors.push(`${suffixAscii}：Cloudflare 记录 ${selection.cfRecordId} 已不存在`);
        continue;
      }
      let app: ApplicationRow | undefined;
      if (selection.applicationId) app = appMap.get(selection.applicationId);
      if (!app && selection.ownerMode === 'admin') {
        const remoteName = normalizeCloudflareDnsName(remote?.name || selection.domainAscii);
        const before = await env.DB.prepare(`SELECT id FROM domain_applications WHERE fqdn_ascii=? COLLATE NOCASE AND (deleted_at IS NULL OR deleted_at='') LIMIT 1`).bind(remoteName).first<{id:string}>();
        try {
          app = await ensureAdminImportedApplication(suffixAscii, remoteName, remote);
          if (!before && app?.id && !createdDomainIds.has(app.id)) {
            createdDomainIds.add(app.id);
            createdAdminDomains += 1;
          }
          appMap.set(app.id, app);
        } catch (error) {
          skipped += 1;
          errors.push(error instanceof Error ? error.message : `${remoteName}：建立管理员域名失败`);
          continue;
        }
      }
      if (!app) {
        skipped += 1;
        continue;
      }

      const appFqdn = applicationFqdnForDnsImport(app);
      const local = cloudflareDnsRecordToLocal(remote, appFqdn);
      if (!local) {
        skipped += 1;
        errors.push(`${appFqdn}：记录 ${String(remote?.name || '')} 无法转换为系统格式`);
        continue;
      }
      const duplicate = await env.DB.prepare(`
        SELECT id FROM dns_records
        WHERE (deleted_at IS NULL OR deleted_at='')
          AND (
            cf_record_id=?
            OR (application_id=? AND name=? COLLATE NOCASE AND type=? AND content=? AND COALESCE(priority,-1)=?)
          )
        LIMIT 1
      `).bind(selection.cfRecordId, app.id, local.name, local.type, local.content, local.priority ?? -1).first<{ id: string }>();
      if (duplicate) {
        skipped += 1;
        continue;
      }
      const id = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO dns_records (
          id,application_id,user_id,host,name,type,content,priority,proxied,ttl,cf_record_id,status,error_message
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL)
      `).bind(
        id, app.id, app.user_id, local.host, local.name, local.type, local.content,
        local.priority, local.proxied, local.ttl, selection.cfRecordId, 'active',
      ).run();
      imported += 1;
      touchedApps.add(app.id);
    }
  }

  for (const applicationId of touchedApps) await syncApplicationDnsSummary(env, applicationId);
  await audit(env, request, admin.id, 'admin.dns_import_existing', 'dns_record', null, {
    requested: selections.length,
    imported,
    skipped,
    applications: touchedApps.size,
    createdAdminDomains,
    errors: errors.slice(0, 10),
  });
  return ok({ imported, skipped, applications: touchedApps.size, createdAdminDomains, errors: errors.slice(0, 20) });
}


async function adminUnlinkDomains(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 128 * 1024);
  const ids = Array.from(new Set((Array.isArray(body.applicationIds) ? body.applicationIds : [])
    .map(value => cleanText(value, 80))
    .filter(Boolean))).slice(0, 500);
  if (!ids.length) throw new HttpError(400, 'DOMAIN_UNLINK_SELECTION_REQUIRED', '请选择要取消同步的域名');

  const placeholders = ids.map(() => '?').join(',');
  const appsResult = await env.DB.prepare(`
    SELECT id,fqdn_unicode,fqdn_ascii,user_id,status
    FROM domain_applications
    WHERE id IN (${placeholders})
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(...ids).all<any>();
  const apps = appsResult.results || [];
  if (!apps.length) throw new HttpError(404, 'DOMAIN_UNLINK_NOT_FOUND', '所选域名已经不在域名系统中');

  const actualIds = apps.map(app => String(app.id));
  const actualPlaceholders = actualIds.map(() => '?').join(',');
  const dnsCountRow = await env.DB.prepare(`
    SELECT COUNT(*) AS count FROM dns_records
    WHERE application_id IN (${actualPlaceholders})
      AND (deleted_at IS NULL OR deleted_at='')
  `).bind(...actualIds).first<any>();
  const removedDnsRecords = Number(dnsCountRow?.count || 0);
  const now = new Date().toISOString();

  // Important: this action only removes the system-side representation. It must never call
  // Cloudflare DNS delete/update APIs, so the remote records remain untouched.
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE dns_records
      SET deleted_at=?, status='deleted', updated_at=?
      WHERE application_id IN (${actualPlaceholders})
        AND (deleted_at IS NULL OR deleted_at='')
    `).bind(now, now, ...actualIds),
    env.DB.prepare(`
      UPDATE domain_applications
      SET deleted_at=?, updated_at=?, delete_requested_at=NULL, delete_requested_by=NULL
      WHERE id IN (${actualPlaceholders})
        AND (deleted_at IS NULL OR deleted_at='')
    `).bind(now, now, ...actualIds),
  ]);

  await audit(env, request, admin.id, 'admin.domain_unlink_from_system', 'domain_application', null, {
    applicationIds: actualIds,
    domains: apps.map(app => app.fqdn_unicode || app.fqdn_ascii || app.id).slice(0, 100),
    removedDomains: apps.length,
    removedLocalDnsRecords: removedDnsRecords,
    cloudflareDnsUntouched: true,
  });

  return ok({
    removedDomains: apps.length,
    removedLocalDnsRecords: removedDnsRecords,
    cloudflareDnsUntouched: true,
  });
}

async function adminApplications(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const status = url.searchParams.get('status') || 'all';
  const limit = clamp(Number(url.searchParams.get('limit') || 500), 1, 1000);
  const rows = status === 'all'
    ? await env.DB.prepare(`
        SELECT a.*,u.username, ${applicationDnsProjection('a')} FROM domain_applications a
        LEFT JOIN users u ON u.id=a.user_id
        WHERE (a.deleted_at IS NULL OR a.deleted_at='')
        ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, a.created_at DESC
        LIMIT ?
      `).bind(limit).all<ApplicationRow>()
    : await env.DB.prepare(`
        SELECT a.*,u.username, ${applicationDnsProjection('a')} FROM domain_applications a
        LEFT JOIN users u ON u.id=a.user_id
        WHERE a.status=? AND (a.deleted_at IS NULL OR a.deleted_at='')
        ORDER BY a.created_at DESC
        LIMIT ?
      `).bind(status, limit).all<ApplicationRow>();

  return ok({ applications: (rows.results || []).map(x => serializeApplication(x, settings)) });
}

async function adminReviewApplication(request: Request, env: Env, id: string, action: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const note = cleanText(body.note, 1000);
  const settings = await loadSettings(env);

  const app = await env.DB.prepare(`
    SELECT * FROM domain_applications WHERE id=? AND (deleted_at IS NULL OR deleted_at='')
  `).bind(id).first<ApplicationRow>();
  if (!app) throw new HttpError(404, 'NOT_FOUND', '申请不存在');

  if (action === 'delete') {
    if (app.status === 'approved' && app.dns_record_id) throw new HttpError(409, 'REVOKE_FIRST', '正常域名请先撤销 DNS 后再删除');
    await hardDeleteDomainApplication(env, id);
    return ok({ deleted: true, purged: true });
  }

  if (action === 'reject-delete') {
    if (!app.delete_requested_at) throw new HttpError(409, 'NO_DELETE_REQUEST', '该域名没有删除申请');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET delete_requested_at=NULL, delete_requested_by=NULL, review_note=?, reviewed_at=datetime('now'), reviewed_by=?, updated_at=datetime('now')
      WHERE id=?
    `).bind(note, admin.id, id).run();
    await audit(env, request, admin.id, 'admin.application_delete_reject', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '删除申请已被拒绝', note || '管理员拒绝了该域名删除申请。', 'warning');
    return ok({ deleteRejected: true });
  }

  if (action === 'approve-delete') {
    if (!app.delete_requested_at) throw new HttpError(409, 'NO_DELETE_REQUEST', '该域名没有删除申请');
    const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
    if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '该后缀配置不存在');

    const deleteResult = await deleteAllDnsRecordsForApp(env, app, suffix);
    const warningText = deleteResult.warnings.length ? `
注意：Cloudflare 清理提示：${deleteResult.warnings.join('；')}` : '';

    await sendDomainStatusMessage(env, admin.id, app, '删除申请已批准', (note || '管理员已批准删除申请，域名和关联 DNS 记录已移除。') + warningText, 'success');
    await hardDeleteDomainApplication(env, id);
    return ok({ deleted: true, purged: true });
  }

  if (action === 'reject') {
    if (!['pending', 'processing'].includes(app.status)) throw new HttpError(409, 'INVALID_STATE', '只有待审核申请可以拒绝');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='rejected',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,error_message=NULL
      WHERE id=?
    `).bind(note, admin.id, id).run();
    await audit(env, request, admin.id, 'application.reject', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名申请已被拒绝', note || '管理员拒绝了该域名申请。', 'warning');
    return ok({ status: 'rejected' });
  }

  const suffix = settings.dns.suffixes.find(x => x.suffixAscii === app.suffix_ascii);
  if (!suffix) throw new HttpError(409, 'SUFFIX_MISSING', '该后缀配置不存在');

  if (action === 'approve') {
    if (app.status !== 'pending') throw new HttpError(409, 'INVALID_STATE', '只有待审核申请可以批准');
    const expires = new Date(Date.now() + settings.domain.validDays * DAY).toISOString();

    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='approved',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,expires_at=?,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(note || '已批准，DNS 可后续在域名管理中添加', admin.id, expires, id).run();

    let synced = 0;
    try { synced = await syncPendingDnsRecordsForApp(env, app, suffix, admin.id); }
    catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : 'DNS 同步失败';
      await env.DB.prepare(`UPDATE domain_applications SET error_message=?,updated_at=datetime('now') WHERE id=?`).bind(message, id).run();
    }

    await audit(env, request, admin.id, 'application.approve', 'domain_application', id, { syncedDnsRecords: synced });
    await sendDomainStatusMessage(env, admin.id, app, '域名申请已通过', note || '管理员已批准该域名，您现在可以进入域名管理添加 DNS 解析。', 'success');
    return ok({ status: 'approved', syncedDnsRecords: synced });
  }

  if (action === 'disable') {
    if (app.status !== 'approved') throw new HttpError(409, 'INVALID_STATE', '只有正常域名可以禁用');
    const deleteResult = await deleteAllDnsRecordsForApp(env, app, suffix);
    const warningText = deleteResult.warnings.length ? `；Cloudflare 清理提示：${deleteResult.warnings.join('；')}` : '';

    // D1 旧表的 status 字段有 CHECK 约束：只允许 pending / processing / approved / rejected / revoking / revoked / error。
    // 所以这里不能写入 status='disabled'，用 status='revoked' + review_note 前缀标记为“已禁用”。
    const disableNote = `【已禁用】${note || '管理员已禁用该域名，DNS 记录已移除。'}${warningText}`;
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='revoked',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,dns_record_id=NULL,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(disableNote, admin.id, id).run();
    await audit(env, request, admin.id, 'application.disable', 'domain_application', id, { note, warnings: deleteResult.warnings });
    await sendDomainStatusMessage(env, admin.id, app, '域名已被禁用', note || '管理员已禁用该域名，DNS 记录已移除。', 'danger');
    return ok({ status: 'revoked', statusText: '已禁用', warnings: deleteResult.warnings });
  }

  if (action === 'enable') {
    const disabledByAdmin = app.status === 'revoked' && String(app.review_note || '').startsWith('【已禁用】');
    if (!disabledByAdmin) throw new HttpError(409, 'NOT_DISABLED_DOMAIN', '该域名当前不是管理员禁用状态');
    const expires = app.expires_at || new Date(Date.now() + settings.domain.validDays * DAY).toISOString();
    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='approved',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,expires_at=?,error_message=NULL,updated_at=datetime('now')
      WHERE id=?
    `).bind(note || '管理员已取消禁用，您可以重新添加 DNS 解析。', admin.id, expires, id).run();
    await audit(env, request, admin.id, 'application.enable', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已取消禁用', note || '管理员已取消禁用该域名，域名恢复正常；DNS 记录需要重新添加。', 'success');
    return ok({ status: 'approved', statusText: '正常' });
  }

  if (action === 'control') {
    if (app.status !== 'approved') throw new HttpError(409, 'INVALID_STATE', '只有正常域名可以管控');
    if (app.controlled_at) throw new HttpError(409, 'ALREADY_CONTROLLED', '该域名已经处于管控状态');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET controlled_at=datetime('now'),controlled_by=?,review_note=?,reviewed_at=datetime('now'),reviewed_by=?,updated_at=datetime('now')
      WHERE id=?
    `).bind(admin.id, note || '管理员已管控该域名；用户只允许删除 DNS 或申请删除域名。', admin.id, id).run();
    await audit(env, request, admin.id, 'application.control', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已被管控', note || '管理员已管控该域名，您只可以删除 DNS 解析或申请删除该域名。', 'warning');
    return ok({ controlled: true, status: app.status, statusText: '正常' });
  }

  if (action === 'uncontrol') {
    if (!app.controlled_at) throw new HttpError(409, 'NOT_CONTROLLED', '该域名当前不是管控状态');
    await env.DB.prepare(`
      UPDATE domain_applications
      SET controlled_at=NULL,controlled_by=NULL,review_note=?,reviewed_at=datetime('now'),reviewed_by=?,updated_at=datetime('now')
      WHERE id=?
    `).bind(note || '管理员已取消管控。', admin.id, id).run();
    await audit(env, request, admin.id, 'application.uncontrol', 'domain_application', id, { note });
    await sendDomainStatusMessage(env, admin.id, app, '域名已取消管控', note || '管理员已取消管控，您可以继续正常管理 DNS 解析。', 'success');
    return ok({ controlled: false, status: app.status, statusText: '正常' });
  }

  if (action === 'revoke') {
    if (app.status !== 'approved') throw new HttpError(409, 'INVALID_STATE', '只有正常域名可以撤销');
    const deleteResult = await deleteAllDnsRecordsForApp(env, app, suffix);
    const warningText = deleteResult.warnings.length ? `；Cloudflare 清理提示：${deleteResult.warnings.join('；')}` : '';

    await env.DB.prepare(`
      UPDATE domain_applications
      SET status='revoked',review_note=?,reviewed_at=datetime('now'),reviewed_by=?,dns_record_id=NULL
      WHERE id=?
    `).bind((note || '') + warningText, admin.id, id).run();
    await audit(env, request, admin.id, 'application.revoke', 'domain_application', id, { note, warnings: deleteResult.warnings });
    await sendDomainStatusMessage(env, admin.id, app, '域名已被撤销', note || '管理员已撤销该域名，DNS 记录已移除。', 'warning');
    return ok({ status: 'revoked' });
  }

  throw new HttpError(400, 'INVALID_ACTION', '未知操作');
}

async function adminUsers(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const rows = await env.DB.prepare(`
    SELECT u.id,u.username,u.email,u.role,u.status,u.domain_quota,u.created_at,u.last_login_at,
      COUNT(a.id) AS application_count,
      SUM(CASE WHEN a.status='approved' THEN 1 ELSE 0 END) AS approved_count
    FROM users u
    LEFT JOIN domain_applications a ON a.user_id=u.id AND (a.deleted_at IS NULL OR a.deleted_at='')
    WHERE u.status!='deleted'
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 500
  `).all<any>();

  return ok({ users: (rows.results || []).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    status: u.status,
    domainQuota: Math.max(0, Number(u.domain_quota ?? settings.domain.defaultQuota)),
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    applicationCount: Number(u.application_count || 0),
    approvedCount: Number(u.approved_count || 0),
  })) });
}


interface RegistrationKeyColumnInfo {
  name: string;
  notnull?: number;
  dflt_value?: string | null;
  pk?: number;
}

async function registrationKeyColumnInfo(env: Env): Promise<RegistrationKeyColumnInfo[]> {
  const rows = await env.DB.prepare(`PRAGMA table_info(registration_keys)`).all<RegistrationKeyColumnInfo>();
  return (rows.results || []).map(row => ({ ...row, name: String(row.name || '').toLowerCase() })).filter(row => row.name);
}

async function registrationKeyColumnNames(env: Env): Promise<Set<string>> {
  return new Set((await registrationKeyColumnInfo(env)).map(row => row.name));
}

async function validateRegistrationKey(env: Env, rawCode: unknown): Promise<{ id: string; role?: string | null }> {
  const code = cleanText(rawCode, 120);
  if (!code) throw new HttpError(400, 'REGISTRATION_KEY_REQUIRED', '请输入注册码');
  const row = await env.DB.prepare(`
    SELECT id, code, role, max_uses, used_count, expires_at, status
    FROM registration_keys
    WHERE code=? COLLATE NOCASE AND status='active'
    LIMIT 1
  `).bind(code).first<any>();
  if (!row) throw new HttpError(403, 'REGISTRATION_KEY_INVALID', '注册码不存在或已停用');
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    throw new HttpError(403, 'REGISTRATION_KEY_EXPIRED', '注册码已过期');
  }
  const maxUses = Number(row.max_uses || 0);
  const used = Number(row.used_count || 0);
  if (maxUses > 0 && used >= maxUses) throw new HttpError(403, 'REGISTRATION_KEY_USED_UP', '注册码使用次数已用完');
  return { id: row.id, role: row.role };
}

async function consumeRegistrationKey(env: Env, keyId: string, userId: string, username: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE registration_keys SET used_count=COALESCE(used_count,0)+1 WHERE id=?`).bind(keyId),
    env.DB.prepare(`INSERT INTO registration_key_usages (id, key_id, user_id, username) VALUES (?, ?, ?, ?)`).bind(crypto.randomUUID(), keyId, userId, username),
  ]);
}

async function adminListRegistrationKeys(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const rows = await env.DB.prepare(`
    SELECT k.*, (SELECT COUNT(*) FROM registration_key_usages u WHERE u.key_id=k.id) AS usage_count
    FROM registration_keys k
    WHERE status!='deleted'
    ORDER BY datetime(created_at) DESC
    LIMIT 500
  `).all<any>();
  return ok({ keys: (rows.results || []).map(k => ({
    id: k.id,
    code: k.code,
    role: k.role || 'user',
    maxUses: Number(k.max_uses || 0),
    usedCount: Number(k.usage_count || k.used_count || 0),
    expiresAt: k.expires_at || '',
    status: k.status || 'active',
    createdAt: k.created_at || '',
  })) });
}

function randomRegistrationCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(Math.max(4, Math.min(64, length)));
  crypto.getRandomValues(arr);
  return Array.from(arr).map(n => chars[n % chars.length]).join('');
}

async function adminCreateRegistrationKey(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const codeLength = clamp(Number(body.codeLength || 8), 4, 64);
  const code = cleanText(body.code, 120) || randomRegistrationCode(codeLength);
  if (!/^[A-Za-z0-9_-]{4,120}$/.test(code)) throw new HttpError(400, 'INVALID_CODE', '注册码只能包含字母、数字、下划线或连字符，至少 4 位');
  const role = body.role === 'admin' ? 'admin' : 'user';
  const maxUses = clamp(Number(body.maxUses || 0), 0, 999999);
  const expiresAt = cleanText(body.expiresAt, 80);
  const duplicate = await env.DB.prepare(`SELECT id FROM registration_keys WHERE code=? COLLATE NOCASE AND status!='deleted'`).bind(code).first<any>();
  if (duplicate) throw new HttpError(409, 'CODE_EXISTS', '注册码已存在');
  const id = crypto.randomUUID();
  const columnInfo = await registrationKeyColumnInfo(env);
  const columns = new Set(columnInfo.map(column => column.name));
  const keyHash = await sha256(code);
  const insertColumns = ['id'];
  const values: unknown[] = [id];
  const placeholders = ['?'];
  const add = (name: string, value: unknown, expression = '?') => {
    if (!columns.has(name)) return;
    insertColumns.push(name);
    placeholders.push(expression);
    if (expression === '?') values.push(value);
  };
  // 旧版表的 name 字段为 NOT NULL；新版表使用 code。两种结构都同时兼容。
  add('name', code);
  add('code', code);
  add('key_hash', keyHash);
  add('hash', keyHash);
  add('role', role);
  add('max_uses', maxUses);
  add('used_count', 0);
  add('expires_at', expiresAt || null);
  add('status', 'active');
  add('created_by', admin.id);
  add('created_at', null, "datetime('now')");
  const alreadyAdded = new Set(insertColumns.map(name => name.toLowerCase()));
  for (const column of columnInfo) {
    if (alreadyAdded.has(column.name) || column.pk || !column.notnull || column.dflt_value != null) continue;
    if (column.name.includes('hash')) add(column.name, keyHash);
    else if (column.name.includes('name') || column.name.includes('code') || column.name.includes('key')) add(column.name, code);
    else if (column.name.includes('count') || column.name.includes('uses') || column.name.includes('enabled')) add(column.name, 0);
    else if (column.name.includes('status')) add(column.name, 'active');
    else if (column.name.includes('role')) add(column.name, role);
    else if (column.name.includes('created') || column.name.includes('updated')) add(column.name, null, "datetime('now')");
    else add(column.name, '');
    alreadyAdded.add(column.name);
  }
  await env.DB.prepare(`INSERT INTO registration_keys (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`).bind(...values).run();
  await audit(env, request, admin.id, 'admin.registration_key_create', 'registration_key', id, { code, role, maxUses, expiresAt });
  return ok({ key: { id, code, role, maxUses, usedCount: 0, expiresAt, status: 'active' } });
}

async function adminDeleteRegistrationKey(request: Request, env: Env, keyId: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const row = await env.DB.prepare(`SELECT id,code FROM registration_keys WHERE id=? AND status!='deleted'`).bind(keyId).first<any>();
  if (!row) throw new HttpError(404, 'NOT_FOUND', '注册码不存在');
  await env.DB.prepare(`UPDATE registration_keys SET status='deleted' WHERE id=?`).bind(keyId).run();
  await audit(env, request, admin.id, 'admin.registration_key_delete', 'registration_key', keyId, { code: row.code });
  return ok({ deleted: true });
}

async function adminRegistrationKeyUsages(request: Request, env: Env, keyId: string): Promise<Response> {
  await requireAdmin(env, request);
  const key = await env.DB.prepare(`SELECT id,code FROM registration_keys WHERE id=?`).bind(keyId).first<any>();
  if (!key) throw new HttpError(404, 'NOT_FOUND', '注册码不存在');
  const rows = await env.DB.prepare(`
    SELECT u.*, usr.email, usr.phone
    FROM registration_key_usages u
    LEFT JOIN users usr ON usr.id=u.user_id
    WHERE u.key_id=?
    ORDER BY datetime(u.used_at) DESC
    LIMIT 500
  `).bind(keyId).all<any>();
  return ok({ key: { id: key.id, code: key.code }, usages: (rows.results || []).map(u => ({
    id: u.id,
    username: u.username || u.email || u.phone || u.user_id || '—',
    userId: u.user_id || '',
    usedAt: u.used_at || '',
  })) });
}


async function adminAnalytics(request: Request, env: Env, url: URL): Promise<Response> {
  await requireAdmin(env, request);
  const range = normalizeAnalyticsRange(url);
  const bucketFormat = range.bucket === 'hour' ? "%Y-%m-%d %H:00" : "%Y-%m-%d";
  const startSql = sqlDate(range.start);
  const endSql = sqlDate(range.end);
  const prevStartSql = sqlDate(range.prevStart);
  const prevEndSql = sqlDate(range.prevEnd);

  const [
    userTotals, domainTotals, dnsTotals, messageTotals, auditTotals, keyTotals,
    userStatusRows, userRoleRows, domainStatusRows, suffixRows, dnsTypeRows, dnsStatusRows, dnsProxyRows,
    messageLevelRows, messageTargetRows, auditCategoryRows, expiryRows, funnelRows, approvalRows,
    topUsersRows, topSuffixRows, failureRows, recentAuditRows, recentAppRows, heatmapRows,
    usersTrendRows, createdRows, approvedRows, rejectedRows, dnsAddedRows, dnsRemovedRows,
    messagesTrendRows, loginSuccessRows, loginFailureRows, errorTrendRows
  ] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='disabled' THEN 1 ELSE 0 END) AS disabled,
        SUM(CASE WHEN role='admin' AND status!='deleted' THEN 1 ELSE 0 END) AS admins,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS current,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS previous,
        SUM(CASE WHEN last_login_at IS NOT NULL AND datetime(last_login_at)>=datetime(?) AND datetime(last_login_at)<datetime(?) THEN 1 ELSE 0 END) AS logged_in_period
      FROM users WHERE status!='deleted'
    `).bind(startSql,endSql,prevStartSql,prevEndSql,startSql,endSql).first<any>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='approved' AND (deleted_at IS NULL OR deleted_at='') AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='pending' AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) AS revoked,
        SUM(CASE WHEN controlled_at IS NOT NULL AND controlled_at!='' THEN 1 ELSE 0 END) AS controlled,
        SUM(CASE WHEN delete_requested_at IS NOT NULL AND delete_requested_at!='' THEN 1 ELSE 0 END) AS delete_requested,
        SUM(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at)<=datetime('now') AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at)>datetime('now') AND datetime(expires_at)<=datetime('now','+7 days') AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS expiring_7d,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS current,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS previous
      FROM domain_applications
    `).bind(startSql,endSql,prevStartSql,prevEndSql).first<any>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='pending' AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN (status='failed' OR error_message IS NOT NULL AND error_message!='') AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN proxied=1 AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS proxied,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS current,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS previous
      FROM dns_records
    `).bind(startSql,endSql,prevStartSql,prevEndSql).first<any>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN datetime(COALESCE(sent_at,created_at))>=datetime(?) AND datetime(COALESCE(sent_at,created_at))<datetime(?) THEN 1 ELSE 0 END) AS current,
        SUM(CASE WHEN datetime(COALESCE(sent_at,created_at))>=datetime(?) AND datetime(COALESCE(sent_at,created_at))<datetime(?) THEN 1 ELSE 0 END) AS previous,
        SUM(CASE WHEN level IN ('warning','error','danger') THEN 1 ELSE 0 END) AS important
      FROM system_messages WHERE status='sent' AND (deleted_at IS NULL OR deleted_at='')
    `).bind(startSql,endSql,prevStartSql,prevEndSql).first<any>(),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS current,
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS previous,
        SUM(CASE WHEN (action LIKE '%failed%' OR action LIKE '%error%' OR action LIKE '%denied%' OR action LIKE '%blocked%') AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN action='auth.login' AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS logins,
        SUM(CASE WHEN (action LIKE '%login%failed%' OR action LIKE '%auth%failed%') AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS login_failures
      FROM audit_logs
    `).bind(startSql,endSql,prevStartSql,prevEndSql,startSql,endSql,startSql,endSql,startSql,endSql).first<any>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN max_uses>0 AND used_count>=max_uses THEN 1 ELSE 0 END) AS exhausted,
        SUM(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at)<datetime('now') THEN 1 ELSE 0 END) AS expired,
        SUM(used_count) AS used
      FROM registration_keys WHERE status!='deleted'
    `).first<any>(),

    env.DB.prepare(`SELECT status, COUNT(*) AS count FROM users WHERE status!='deleted' GROUP BY status ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT role, COUNT(*) AS count FROM users WHERE status!='deleted' GROUP BY role ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT status, COUNT(*) AS count FROM domain_applications GROUP BY status ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT suffix_ascii AS suffix, COUNT(*) AS count FROM domain_applications GROUP BY suffix_ascii ORDER BY count DESC LIMIT 12`).all<any>(),
    env.DB.prepare(`SELECT UPPER(type) AS type, COUNT(*) AS count FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='') GROUP BY UPPER(type) ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT status, COUNT(*) AS count FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='') GROUP BY status ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT CASE WHEN proxied=1 THEN 'proxied' ELSE 'dns_only' END AS proxy, COUNT(*) AS count FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='') GROUP BY proxy`).all<any>(),
    env.DB.prepare(`SELECT level, COUNT(*) AS count FROM system_messages WHERE status='sent' AND (deleted_at IS NULL OR deleted_at='') GROUP BY level ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`SELECT target_type AS target, COUNT(*) AS count FROM system_messages WHERE status='sent' AND (deleted_at IS NULL OR deleted_at='') GROUP BY target_type ORDER BY count DESC`).all<any>(),
    env.DB.prepare(`
      SELECT CASE
        WHEN action LIKE 'auth.%' OR action LIKE '%login%' THEN 'auth'
        WHEN action LIKE '%dns%' OR action LIKE '%cf_api%' THEN 'dns'
        WHEN action LIKE '%domain%' OR action LIKE '%application%' THEN 'domain'
        WHEN action LIKE '%message%' OR action LIKE '%email%' THEN 'message'
        WHEN action LIKE '%user%' OR action LIKE '%registration%' THEN 'user'
        WHEN action LIKE '%settings%' OR action LIKE '%config%' THEN 'settings'
        ELSE 'other' END AS category, COUNT(*) AS count
      FROM audit_logs WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)
      GROUP BY category ORDER BY count DESC
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT CASE
        WHEN expires_at IS NULL OR expires_at='' THEN 'no_expiry'
        WHEN datetime(expires_at)<=datetime('now') THEN 'expired'
        WHEN datetime(expires_at)<=datetime('now','+7 days') THEN 'within_7d'
        WHEN datetime(expires_at)<=datetime('now','+30 days') THEN 'within_30d'
        WHEN datetime(expires_at)<=datetime('now','+90 days') THEN 'within_90d'
        ELSE 'after_90d' END AS bucket, COUNT(*) AS count
      FROM domain_applications WHERE status='approved' AND (deleted_at IS NULL OR deleted_at='')
      GROUP BY bucket
    `).all<any>(),
    env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status!='deleted') AS users,
        (SELECT COUNT(DISTINCT user_id) FROM domain_applications) AS applicants,
        (SELECT COUNT(DISTINCT user_id) FROM domain_applications WHERE status='approved' AND (deleted_at IS NULL OR deleted_at='')) AS approved_users,
        (SELECT COUNT(DISTINCT user_id) FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='')) AS dns_users,
        (SELECT COUNT(*) FROM domain_applications) AS applications,
        (SELECT COUNT(*) FROM domain_applications WHERE status='approved') AS approved_applications,
        (SELECT COUNT(DISTINCT application_id) FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='')) AS configured_applications
    `).first<any>(),
    env.DB.prepare(`
      SELECT
        SUM(CASE WHEN datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) THEN 1 ELSE 0 END) AS submitted,
        SUM(CASE WHEN status='approved' AND datetime(COALESCE(reviewed_at,created_at))>=datetime(?) AND datetime(COALESCE(reviewed_at,created_at))<datetime(?) THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status='rejected' AND datetime(COALESCE(reviewed_at,created_at))>=datetime(?) AND datetime(COALESCE(reviewed_at,created_at))<datetime(?) THEN 1 ELSE 0 END) AS rejected,
        AVG(CASE WHEN reviewed_at IS NOT NULL THEN (julianday(reviewed_at)-julianday(created_at))*24 END) AS avg_review_hours,
        AVG(CASE WHEN status='pending' THEN (julianday('now')-julianday(created_at))*24 END) AS avg_pending_hours
      FROM domain_applications
    `).bind(startSql,endSql,startSql,endSql,startSql,endSql).first<any>(),

    env.DB.prepare(`
      SELECT u.id,u.username,u.email,u.status,u.last_login_at,
        (SELECT COUNT(*) FROM domain_applications a WHERE a.user_id=u.id) AS domains,
        (SELECT COUNT(*) FROM domain_applications a WHERE a.user_id=u.id AND a.status='approved' AND (a.deleted_at IS NULL OR a.deleted_at='')) AS active_domains,
        (SELECT COUNT(*) FROM dns_records d WHERE d.user_id=u.id AND (d.deleted_at IS NULL OR d.deleted_at='')) AS dns_records
      FROM users u WHERE u.status!='deleted'
      ORDER BY active_domains DESC,dns_records DESC,domains DESC LIMIT 15
    `).all<any>(),
    env.DB.prepare(`
      SELECT suffix_ascii AS suffix,
        COUNT(*) AS total,
        SUM(CASE WHEN status='approved' AND (deleted_at IS NULL OR deleted_at='') THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
      FROM domain_applications GROUP BY suffix_ascii ORDER BY total DESC LIMIT 15
    `).all<any>(),
    env.DB.prepare(`
      SELECT action,COUNT(*) AS count,MAX(created_at) AS latest
      FROM audit_logs
      WHERE (action LIKE '%failed%' OR action LIKE '%error%' OR action LIKE '%denied%' OR action LIKE '%blocked%')
        AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)
      GROUP BY action ORDER BY count DESC LIMIT 15
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT l.id,l.action,l.target_type,l.target_id,l.ip,l.created_at,u.username
      FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_user_id
      WHERE datetime(l.created_at)>=datetime(?) AND datetime(l.created_at)<datetime(?)
      ORDER BY datetime(l.created_at) DESC LIMIT 30
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT a.id,a.fqdn_unicode,a.fqdn_ascii,a.status,a.record_type,a.created_at,a.reviewed_at,a.error_message,u.username
      FROM domain_applications a LEFT JOIN users u ON u.id=a.user_id
      ORDER BY datetime(a.created_at) DESC LIMIT 20
    `).all<any>(),
    env.DB.prepare(`
      SELECT CAST(strftime('%w',created_at) AS INTEGER) AS weekday,
             CAST(strftime('%H',created_at) AS INTEGER) AS hour,
             COUNT(*) AS count
      FROM audit_logs WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)
      GROUP BY weekday,hour
    `).bind(startSql,endSql).all<any>(),

    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM users WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM domain_applications WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',reviewed_at) AS bucket,COUNT(*) AS count FROM domain_applications WHERE status='approved' AND reviewed_at IS NOT NULL AND datetime(reviewed_at)>=datetime(?) AND datetime(reviewed_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',COALESCE(deleted_at,reviewed_at,created_at)) AS bucket,COUNT(*) AS count FROM domain_applications WHERE (status IN ('rejected','revoked','deleted') OR deleted_at IS NOT NULL) AND datetime(COALESCE(deleted_at,reviewed_at,created_at))>=datetime(?) AND datetime(COALESCE(deleted_at,reviewed_at,created_at))<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM dns_records WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',deleted_at) AS bucket,COUNT(*) AS count FROM dns_records WHERE deleted_at IS NOT NULL AND deleted_at!='' AND datetime(deleted_at)>=datetime(?) AND datetime(deleted_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',COALESCE(sent_at,created_at)) AS bucket,COUNT(*) AS count FROM system_messages WHERE status='sent' AND datetime(COALESCE(sent_at,created_at))>=datetime(?) AND datetime(COALESCE(sent_at,created_at))<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM audit_logs WHERE action='auth.login' AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM audit_logs WHERE (action LIKE '%login%failed%' OR action LIKE '%auth%failed%') AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`SELECT strftime('${bucketFormat}',created_at) AS bucket,COUNT(*) AS count FROM audit_logs WHERE (action LIKE '%failed%' OR action LIKE '%error%' OR action LIKE '%denied%' OR action LIKE '%blocked%') AND datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?) GROUP BY bucket`).bind(startSql,endSql).all<any>(),
  ]);

  const buckets = buildAnalyticsBuckets(range.start,range.end,range.bucket);
  const growthTrend = mergeMultiTrend(buckets,[
    {key:'users',rows:usersTrendRows.results||[]},
    {key:'applications',rows:createdRows.results||[]},
    {key:'approved',rows:approvedRows.results||[]},
    {key:'dns',rows:dnsAddedRows.results||[]},
    {key:'messages',rows:messagesTrendRows.results||[]},
  ]);
  const domainTrend = mergeMultiTrend(buckets,[
    {key:'created',rows:createdRows.results||[]},
    {key:'approved',rows:approvedRows.results||[]},
    {key:'rejected',rows:rejectedRows.results||[]},
  ]);
  const dnsTrend = mergeMultiTrend(buckets,[
    {key:'added',rows:dnsAddedRows.results||[]},
    {key:'removed',rows:dnsRemovedRows.results||[]},
  ]);
  const operationTrend = mergeMultiTrend(buckets,[
    {key:'logins',rows:loginSuccessRows.results||[]},
    {key:'loginFailures',rows:loginFailureRows.results||[]},
    {key:'errors',rows:errorTrendRows.results||[]},
  ]);

  const submitted=Number(approvalRows?.submitted||0);
  const approved=Number(approvalRows?.approved||0);
  const rejected=Number(approvalRows?.rejected||0);
  const decided=approved+rejected;
  const readReceipts=await env.DB.prepare(`SELECT COUNT(*) AS count,COUNT(DISTINCT user_id) AS readers FROM message_reads WHERE datetime(read_at)>=datetime(?) AND datetime(read_at)<datetime(?)`).bind(startSql,endSql).first<any>();

  const [
    loginRecencyRows, userStageRows, dnsTypeHealthRows, messageLevelReadRows,
    topActorRows, topIpRows, deviceTypeRows, reviewerRows, domainAgeRows, riskFlagRows
  ] = await Promise.all([
    env.DB.prepare(`
      SELECT CASE
        WHEN last_login_at IS NULL OR last_login_at='' THEN 'never'
        WHEN datetime(last_login_at)>=datetime('now','-1 day') THEN 'today'
        WHEN datetime(last_login_at)>=datetime('now','-7 days') THEN 'within_7d'
        WHEN datetime(last_login_at)>=datetime('now','-30 days') THEN 'within_30d'
        ELSE 'older_30d' END AS bucket, COUNT(*) AS count
      FROM users WHERE status!='deleted' GROUP BY bucket ORDER BY count DESC
    `).all<any>(),
    env.DB.prepare(`
      SELECT stage,COUNT(*) AS count FROM (
        SELECT u.id,CASE
          WHEN EXISTS(SELECT 1 FROM dns_records d WHERE d.user_id=u.id AND (d.deleted_at IS NULL OR d.deleted_at='')) THEN 'configured_dns'
          WHEN EXISTS(SELECT 1 FROM domain_applications a WHERE a.user_id=u.id AND a.status='approved' AND (a.deleted_at IS NULL OR a.deleted_at='')) THEN 'approved_domain'
          WHEN EXISTS(SELECT 1 FROM domain_applications a WHERE a.user_id=u.id AND (a.deleted_at IS NULL OR a.deleted_at='')) THEN 'applied'
          ELSE 'registered_only' END AS stage
        FROM users u WHERE u.status!='deleted'
      ) GROUP BY stage ORDER BY count DESC
    `).all<any>(),
    env.DB.prepare(`
      SELECT UPPER(type) AS type,
        COUNT(*) AS total,
        SUM(CASE WHEN status!='pending' AND status!='failed' AND (error_message IS NULL OR error_message='') THEN 1 ELSE 0 END) AS normal,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='failed' OR (error_message IS NOT NULL AND error_message!='') THEN 1 ELSE 0 END) AS errors,
        SUM(CASE WHEN proxied=1 THEN 1 ELSE 0 END) AS proxied,
        SUM(CASE WHEN proxied!=1 OR proxied IS NULL THEN 1 ELSE 0 END) AS dns_only
      FROM dns_records WHERE (deleted_at IS NULL OR deleted_at='')
      GROUP BY UPPER(type) ORDER BY total DESC
    `).all<any>(),
    env.DB.prepare(`
      SELECT m.level,COUNT(DISTINCT m.id) AS sent,COUNT(r.user_id) AS receipts,COUNT(DISTINCT r.user_id) AS readers
      FROM system_messages m LEFT JOIN message_reads r ON r.message_id=m.id
      WHERE m.status='sent' AND (m.deleted_at IS NULL OR m.deleted_at='')
        AND datetime(COALESCE(m.sent_at,m.created_at))>=datetime(?) AND datetime(COALESCE(m.sent_at,m.created_at))<datetime(?)
      GROUP BY m.level ORDER BY sent DESC
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(u.username,''),'系统') AS label,COUNT(*) AS count,MAX(l.created_at) AS latest
      FROM audit_logs l LEFT JOIN users u ON u.id=l.actor_user_id
      WHERE datetime(l.created_at)>=datetime(?) AND datetime(l.created_at)<datetime(?)
      GROUP BY COALESCE(NULLIF(u.username,''),'系统') ORDER BY count DESC LIMIT 12
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(ip,''),'未知 IP') AS label,COUNT(*) AS count,MAX(created_at) AS latest
      FROM audit_logs WHERE datetime(created_at)>=datetime(?) AND datetime(created_at)<datetime(?)
      GROUP BY COALESCE(NULLIF(ip,''),'未知 IP') ORDER BY count DESC LIMIT 12
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(device_type,''),'unknown') AS device,COUNT(*) AS count,COUNT(DISTINCT user_id) AS users
      FROM sessions
      WHERE datetime(COALESCE(last_seen_at,created_at))>=datetime(?) AND datetime(COALESCE(last_seen_at,created_at))<datetime(?)
      GROUP BY COALESCE(NULLIF(device_type,''),'unknown') ORDER BY count DESC
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT COALESCE(NULLIF(u.username,''),'系统') AS reviewer,COUNT(*) AS reviewed,
        SUM(CASE WHEN a.status='approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN a.status='rejected' THEN 1 ELSE 0 END) AS rejected,
        AVG(MAX(0,(julianday(a.reviewed_at)-julianday(a.created_at))*24)) AS avg_hours
      FROM domain_applications a LEFT JOIN users u ON u.id=a.reviewed_by
      WHERE a.reviewed_at IS NOT NULL AND datetime(a.reviewed_at)>=datetime(?) AND datetime(a.reviewed_at)<datetime(?)
      GROUP BY COALESCE(NULLIF(u.username,''),'系统') ORDER BY reviewed DESC LIMIT 12
    `).bind(startSql,endSql).all<any>(),
    env.DB.prepare(`
      SELECT CASE
        WHEN julianday('now')-julianday(created_at)<7 THEN 'age_7d'
        WHEN julianday('now')-julianday(created_at)<30 THEN 'age_30d'
        WHEN julianday('now')-julianday(created_at)<90 THEN 'age_90d'
        WHEN julianday('now')-julianday(created_at)<365 THEN 'age_1y'
        ELSE 'age_over_1y' END AS bucket,COUNT(*) AS count
      FROM domain_applications WHERE status='approved' AND (deleted_at IS NULL OR deleted_at='')
      GROUP BY bucket ORDER BY count DESC
    `).all<any>(),
    env.DB.prepare(`
      SELECT 'controlled' AS flag,COUNT(*) AS count FROM domain_applications WHERE controlled_at IS NOT NULL AND controlled_at!='' AND (deleted_at IS NULL OR deleted_at='')
      UNION ALL SELECT 'delete_requested',COUNT(*) FROM domain_applications WHERE delete_requested_at IS NOT NULL AND delete_requested_at!='' AND (deleted_at IS NULL OR deleted_at='')
      UNION ALL SELECT 'dns_error',COUNT(*) FROM dns_records WHERE (status='failed' OR (error_message IS NOT NULL AND error_message!='')) AND (deleted_at IS NULL OR deleted_at='')
      UNION ALL SELECT 'disabled_users',COUNT(*) FROM users WHERE status='disabled'
    `).all<any>(),
  ]);

  return ok({analytics:{
    generatedAt:new Date().toISOString(),
    range:{preset:range.preset,days:range.days,start:range.start.toISOString(),end:range.end.toISOString(),bucket:range.bucket,label:range.label,previousStart:range.prevStart.toISOString(),previousEnd:range.prevEnd.toISOString()},
    metrics:{
      users:metric(Number(userTotals?.total||0),0,Number(userTotals?.current||0),Number(userTotals?.previous||0)),
      activeUsers:{total:Number(userTotals?.active||0),loggedInPeriod:Number(userTotals?.logged_in_period||0),disabled:Number(userTotals?.disabled||0),admins:Number(userTotals?.admins||0)},
      domains:metric(Number(domainTotals?.total||0),0,Number(domainTotals?.current||0),Number(domainTotals?.previous||0)),
      activeDomains:{total:Number(domainTotals?.active||0),pending:Number(domainTotals?.pending||0),controlled:Number(domainTotals?.controlled||0),expired:Number(domainTotals?.expired||0),expiring7d:Number(domainTotals?.expiring_7d||0),deleteRequested:Number(domainTotals?.delete_requested||0)},
      dns:metric(Number(dnsTotals?.active||0),Math.max(0,Number(dnsTotals?.total||0)-Number(dnsTotals?.active||0)),Number(dnsTotals?.current||0),Number(dnsTotals?.previous||0)),
      dnsHealth:{pending:Number(dnsTotals?.pending||0),errors:Number(dnsTotals?.errors||0),proxied:Number(dnsTotals?.proxied||0)},
      messages:metric(Number(messageTotals?.total||0),0,Number(messageTotals?.current||0),Number(messageTotals?.previous||0)),
      messageHealth:{important:Number(messageTotals?.important||0)},
      audit:metric(Number(auditTotals?.total||0),0,Number(auditTotals?.current||0),Number(auditTotals?.previous||0)),
      security:{errors:Number(auditTotals?.errors||0),logins:Number(auditTotals?.logins||0),loginFailures:Number(auditTotals?.login_failures||0)},
      registrationKeys:{total:Number(keyTotals?.total||0),active:Number(keyTotals?.active||0),exhausted:Number(keyTotals?.exhausted||0),expired:Number(keyTotals?.expired||0),used:Number(keyTotals?.used||0)},
    },
    approval:{submitted,approved,rejected,pending:Number(domainTotals?.pending||0),approvalRate:decided?Math.round(approved/decided*1000)/10:0,avgReviewHours:Math.round(Number(approvalRows?.avg_review_hours||0)*10)/10,avgPendingHours:Math.round(Number(approvalRows?.avg_pending_hours||0)*10)/10},
    messageEngagement:{sent:Number(messageTotals?.current||0),readReceipts:Number(readReceipts?.count||0),readers:Number(readReceipts?.readers||0)},
    funnel:{users:Number(funnelRows?.users||0),applicants:Number(funnelRows?.applicants||0),approvedUsers:Number(funnelRows?.approved_users||0),dnsUsers:Number(funnelRows?.dns_users||0),applications:Number(funnelRows?.applications||0),approvedApplications:Number(funnelRows?.approved_applications||0),configuredApplications:Number(funnelRows?.configured_applications||0)},
    trends:{growth:growthTrend,domains:domainTrend,dns:dnsTrend,operations:operationTrend},
    distributions:{
      userStatus:userStatusRows.results||[],userRole:userRoleRows.results||[],domainStatus:domainStatusRows.results||[],suffix:suffixRows.results||[],
      dnsType:dnsTypeRows.results||[],dnsStatus:dnsStatusRows.results||[],dnsProxy:dnsProxyRows.results||[],messageLevel:messageLevelRows.results||[],
      messageTarget:messageTargetRows.results||[],auditCategory:auditCategoryRows.results||[],expiry:expiryRows.results||[],
      loginRecency:loginRecencyRows.results||[],userStage:userStageRows.results||[],dnsTypeHealth:dnsTypeHealthRows.results||[],
      messageLevelRead:messageLevelReadRows.results||[],deviceType:deviceTypeRows.results||[],domainAge:domainAgeRows.results||[],riskFlags:riskFlagRows.results||[]
    },
    rankings:{
      users:topUsersRows.results||[],suffixes:topSuffixRows.results||[],failures:failureRows.results||[],
      actors:topActorRows.results||[],ips:topIpRows.results||[],reviewers:reviewerRows.results||[]
    },
    recent:{audit:recentAuditRows.results||[],applications:recentAppRows.results||[]},
    heatmap:heatmapRows.results||[],
  }});
}

type AnalyticsRange = { preset: string; start: Date; end: Date; prevStart: Date; prevEnd: Date; days: number; bucket: 'hour' | 'day'; label: string };
function normalizeAnalyticsRange(url: URL): AnalyticsRange {
  const now = new Date();
  const preset = String(url.searchParams.get('range') || url.searchParams.get('days') || '30d').toLowerCase();
  let start: Date;
  let end = now;
  let label = '最近30天';
  let bucket: 'hour' | 'day' = 'day';

  if (preset === 'custom') {
    const rawStart = url.searchParams.get('start') || '';
    const rawEnd = url.searchParams.get('end') || '';
    start = rawStart ? new Date(rawStart) : new Date(now.getTime() - 30 * DAY);
    end = rawEnd ? new Date(rawEnd) : now;
    if (Number.isNaN(start.getTime())) start = new Date(now.getTime() - 30 * DAY);
    if (Number.isNaN(end.getTime())) end = now;
    if (end <= start) end = new Date(start.getTime() + DAY);
    const diffHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    bucket = diffHours <= 72 ? 'hour' : 'day';
    label = '自定义';
  } else {
    const map: Record<string, { ms: number; label: string; bucket: 'hour' | 'day' }> = {
      '12h': { ms: 12 * 60 * 60 * 1000, label: '最近12小时', bucket: 'hour' },
      '1d': { ms: DAY, label: '最近1天', bucket: 'hour' },
      '3d': { ms: 3 * DAY, label: '最近3天', bucket: 'hour' },
      '7d': { ms: 7 * DAY, label: '最近7天', bucket: 'day' },
      '7': { ms: 7 * DAY, label: '最近7天', bucket: 'day' },
      '30d': { ms: 30 * DAY, label: '最近30天', bucket: 'day' },
      '30': { ms: 30 * DAY, label: '最近30天', bucket: 'day' },
      '90d': { ms: 90 * DAY, label: '最近90天', bucket: 'day' },
      '90': { ms: 90 * DAY, label: '最近90天', bucket: 'day' },
    };
    const picked = map[preset] || map['30d'];
    start = new Date(now.getTime() - picked.ms);
    bucket = picked.bucket;
    label = picked.label;
  }
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - span);
  return { preset, start, end, prevStart, prevEnd, days: Math.max(1, Math.ceil(span / DAY)), bucket, label };
}
function sqlDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
function bucketKey(date: Date, bucket: 'hour' | 'day'): string {
  const iso = date.toISOString();
  return bucket === 'hour' ? iso.slice(0, 13).replace('T', ' ') + ':00' : iso.slice(0, 10);
}
function buildAnalyticsBuckets(start: Date, end: Date, bucket: 'hour' | 'day'): string[] {
  const step = bucket === 'hour' ? 60 * 60 * 1000 : DAY;
  const out: string[] = [];
  let cursor = new Date(start.getTime());
  if (bucket === 'hour') cursor.setUTCMinutes(0, 0, 0);
  else cursor.setUTCHours(0, 0, 0, 0);
  while (cursor < end && out.length < 220) {
    out.push(bucketKey(cursor, bucket));
    cursor = new Date(cursor.getTime() + step);
  }
  return out;
}
function mergeMultiTrend(buckets: string[], series: Array<{ key: string; rows: any[] }>) {
  const map = new Map<string, any>();
  for (const bucket of buckets) map.set(bucket, { day: bucket, bucket });
  for (const item of series) {
    for (const bucket of buckets) map.get(bucket)[item.key] = 0;
    for (const row of item.rows || []) {
      const key = String(row.bucket || row.day || '');
      if (!map.has(key)) map.set(key, { day: key, bucket: key });
      map.get(key)[item.key] = Number(row.count || 0);
    }
  }
  return Array.from(map.values()).sort((a,b) => String(a.bucket).localeCompare(String(b.bucket)));
}
function metric(total: number, deleted: number, current: number, previous: number) {
  let pct: number | null = null;
  let direction = 'flat';
  if (previous > 0) {
    pct = Math.round(((current - previous) / previous) * 1000) / 10;
    direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  } else if (current > 0) {
    direction = 'up';
  }
  return { total, deleted, current, previous, pct, direction, noPrevious: previous === 0 };
}

function mergeDnsTrend(addRows: any[], removeRows: any[]) {
  const map = new Map<string, any>();
  for (const r of addRows) map.set(r.day, { day: r.day, added: Number(r.added || 0), removed: 0 });
  for (const r of removeRows) {
    const item = map.get(r.day) || { day: r.day, added: 0, removed: 0 };
    item.removed = Number(r.removed || 0);
    map.set(r.day, item);
  }
  return Array.from(map.values()).sort((a,b) => String(a.day).localeCompare(String(b.day)));
}

async function adminCreateUser(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const settings = await loadSettings(env);

  await verifyHumanChallenge(env, request, body, 'admin_create', env.TURNSTILE_ACTION_REGISTER || 'register');

  const username = normalizeUsername(body.username);
  const email = normalizeOptionalEmailStrict(body.email);
  const phone = normalizeOptionalPhone(body.phone);
  if (!email && !phone) throw new HttpError(400, 'CONTACT_REQUIRED', '手机号和邮箱至少填写一个');
  const password = validatePassword(body.password);
  const role: Role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) as UserStatus : 'active';
  const quota = Math.max(0, Math.floor(Number(body.domainQuota ?? settings.domain.defaultQuota) || 0));

  const duplicate = await env.DB.prepare(`
    SELECT id FROM users
    WHERE username=? COLLATE NOCASE
      OR (? IS NOT NULL AND email=? COLLATE NOCASE)
      OR (? IS NOT NULL AND phone=? COLLATE NOCASE)
    LIMIT 1
  `).bind(username, email, email, phone, phone).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'USER_EXISTS', '账号或邮箱/手机号已被使用');

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO users (id, username, email, phone, password_hash, password_salt, role, status, domain_quota, permissions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, username, email, phone, hash, salt, role, status, quota, JSON.stringify({ canApply: true })).run();

  await audit(env, request, admin.id, 'admin.user_create', 'user', id, { username, email, phone: phone ? 'set' : 'empty', role, status, quota });
  const user = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(id).first<UserRow>();
  return ok({ user: serializeUser(user!) });
}

async function adminUpdateUser(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const target = await env.DB.prepare(`SELECT * FROM users WHERE id=? AND status!='deleted'`).bind(id).first<UserRow>();
  if (!target) throw new HttpError(404, 'NOT_FOUND', '用户不存在');

  const role = body.role === 'admin' ? 'admin' : 'user';
  const status = ['active', 'disabled'].includes(String(body.status)) ? String(body.status) : target.status;
  const quota = Math.max(0, Math.floor(Number(body.domainQuota ?? target.domain_quota ?? 3) || 0));

  if (id === admin.id && (role !== 'admin' || status !== 'active')) {
    throw new HttpError(400, 'CANNOT_DISABLE_SELF', '不能降级或禁用当前管理员');
  }

  await env.DB.prepare(`
    UPDATE users SET role=?,status=?,domain_quota=?,updated_at=datetime('now') WHERE id=?
  `).bind(role, status, quota, id).run();

  await audit(env, request, admin.id, 'admin.user_update', 'user', id, { role, status, quota });
  return ok({ updated: true });
}


async function adminHelpSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  return ok({ help: settings.help });
}

async function adminUpdateHelpSettings(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 512 * 1024);
  const settings = await loadSettings(env);
  settings.help = { categories: sanitizeHelpCategories((body as any).categories) };
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, 'admin.settings_help', 'setting', 'help');
  return ok({ help: settings.help });
}

function defaultHelpSettings(): { categories: HelpCategorySetting[] } {
  return { categories: [
    { key:'faq', title:'常见问题', subtitle:'账号、注册、审核、登录、额度、语言、消息等常见问题', items: [] },
    { key:'dns', title:'DNS 记录说明', subtitle:'A / AAAA / CNAME / TXT / MX / NS、代理、TTL、生效时间、第三方平台配置', items: [] },
    { key:'domain', title:'域名管理问题', subtitle:'解析管理、删除撤销、续期、禁用、管理员处理、手机端操作等问题', items: [] },
  ] };
}

function sanitizeHelpCategories(value: unknown): HelpCategorySetting[] {
  const defaults = defaultHelpSettings().categories;
  const raw = Array.isArray(value) ? value : [];
  return defaults.map((def, index) => {
    const found = raw.find((x: any) => x && (x.key === def.key || x.title === def.title)) || raw[index] || def;
    const itemsRaw = Array.isArray((found as any).items) ? (found as any).items : [];
    const items = itemsRaw.slice(0, 200).map((item: any, itemIndex: number) => ({
      id: cleanText(item?.id || `${def.key}-${itemIndex + 1}`, 80) || `${def.key}-${itemIndex + 1}`,
      q: cleanText(item?.q || item?.question || '', 200),
      a: cleanHtmlText(item?.a || item?.answer || '', 8000),
    })).filter((item: HelpItemSetting) => item.q);
    return {
      key: cleanText((found as any).key || def.key, 30) || def.key,
      title: cleanText((found as any).title || def.title, 80) || def.title,
      subtitle: cleanText((found as any).subtitle || def.subtitle || '', 180),
      items,
    };
  });
}

function cleanHtmlText(value: unknown, max = 8000): string {
  const raw = String(value ?? '').slice(0, max);
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .trim();
}

function adminSettingsView(settings: AppSettings, env: Env): any {
  const safeSettings: any = JSON.parse(JSON.stringify(settings));
  safeSettings.registration.turnstileSecretConfigured = Boolean(settings.registration.turnstileSecret || env.TURNSTILE_SECRET);
  safeSettings.registration.turnstileSecret = '';
  safeSettings.registration.emailApiKeyConfigured = Boolean(settings.registration.emailApiKey || env.RESEND_API_KEY);
  safeSettings.registration.emailApiKey = '';
  safeSettings.registration.emailRuntimeEnvironment = resolveEmailRuntimeEnvironment(env);
  safeSettings.registration.cloudflareAdminEmailConfigured = Boolean(env.SEB);
  safeSettings.registration.cloudflareAdminEmail = resolveCloudflareAdminEmail(env, settings);
  safeSettings.registration.cloudflareAdminEmailFrom = resolveCloudflareAdminSender(env, settings).fromEmail;
  safeSettings.registration.cloudflareEmailApiTokenConfigured = Boolean(settings.registration.cloudflareEmailApiToken || env.CF_EMAIL_ROUTING_API_TOKEN);
  safeSettings.registration.cloudflareEmailApiToken = '';
  safeSettings.registration.cloudflareEmailAccountId = env.CF_ACCOUNT_ID || settings.registration.cloudflareEmailAccountId || '';
  safeSettings.registration.cloudflareVerifiedRecipients = sanitizeEmailRecipientList(settings.registration.cloudflareVerifiedRecipients || []);
  safeSettings.registration.cloudflareRecipientsSyncedAt = settings.registration.cloudflareRecipientsSyncedAt || '';
  safeSettings.registration.cloudflareWorkerApiConfigured = Boolean(env.CF_WORKERS_API_TOKEN);
  safeSettings.registration.cloudflareWorkerScriptName = cleanText(env.CF_WORKER_SCRIPT_NAME || 'storage', 80) || 'storage';
  safeSettings.dns.cfApiTokenConfigured = Boolean(settings.dns.cfApiToken || env.CF_API_TOKEN);
  safeSettings.dns.cfApiToken = '';
  safeSettings.dns.suffixes = (safeSettings.dns.suffixes || []).map((x: any) => ({
    ...x,
    cfApiTokenConfigured: Boolean((settings.dns.suffixes || []).find(s => s.suffixAscii === x.suffixAscii || s.suffix === x.suffix)?.cfApiToken),
    cfApiToken: '',
  }));
  return safeSettings;
}

async function adminSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  return ok({ settings: adminSettingsView(await loadSettings(env), env) });
}

type AdminSettingGroup = 'site' | 'registration' | 'domain' | 'dns' | 'blacklist' | 'notification' | 'security' | 'automation';

async function adminUpdateSettings(request: Request, env: Env, group: AdminSettingGroup): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 1024 * 1024);
  const settings = await loadSettings(env);

  if (group === 'site') {
    settings.site = {
      ...settings.site,
      title: cleanText(body.title, 80) || settings.site.title,
      subtitle: cleanText(body.subtitle, 140),
      footer: cleanText(body.footer, 300),
      copyright: cleanText(body.copyright, 1000),
      faviconUrl: cleanText(body.faviconUrl, 500),
      headerThirdPartyJs: cleanText(body.headerThirdPartyJs, 20000),
      maintenanceMode: asBoolean(body.maintenanceMode, false),
      maintenanceMessage: cleanText(body.maintenanceMessage, 1000),
      themeMode: ['light','dark','system'].includes(String(body.themeMode)) ? String(body.themeMode) : 'light',
      noticeStartAt: cleanText(body.noticeStartAt, 80),
      noticeEndAt: cleanText(body.noticeEndAt, 80),
      accent: normalizeHexColor(body.accent, '#4f63f6'),
      accent2: normalizeHexColor(body.accent2, '#7c4dff'),
      logoText: cleanText(body.logoText, 12) || 'free',
      logoImageUrl: cleanText(body.logoImageUrl, 500),
      icp: cleanText(body.icp, 200),
      homepageNotice: cleanText(body.homepageNotice, 5000),
      publicHomepageEnabled: asBoolean(body.publicHomepageEnabled, true),
      publicHomepageLayout: ['brand','compact','data'].includes(String(body.publicHomepageLayout || 'brand')) ? String(body.publicHomepageLayout || 'brand') as any : 'brand',
      publicHomepageBadge: cleanText(body.publicHomepageBadge, 120),
      publicHomepageTitle: cleanText(body.publicHomepageTitle, 120),
      publicHomepageHighlight: cleanText(body.publicHomepageHighlight, 80),
      publicHomepageDescription: cleanText(body.publicHomepageDescription, 500),
      publicHomepagePrimaryText: cleanText(body.publicHomepagePrimaryText, 40),
      publicHomepagePrimaryHref: Object.prototype.hasOwnProperty.call(body, 'publicHomepagePrimaryHref') ? cleanText(body.publicHomepagePrimaryHref, 300) : (settings.site.publicHomepagePrimaryHref || ''),
      publicHomepageSecondaryText: cleanText(body.publicHomepageSecondaryText, 40),
      publicHomepageSecondaryHref: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSecondaryHref') ? cleanText(body.publicHomepageSecondaryHref, 300) : (settings.site.publicHomepageSecondaryHref || '#/available'),
      publicHomepageSearchEyebrow: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSearchEyebrow') ? cleanText(body.publicHomepageSearchEyebrow, 50) : (settings.site.publicHomepageSearchEyebrow || '实时查询'),
      publicHomepageSearchTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSearchTitle') ? cleanText(body.publicHomepageSearchTitle, 80) : (settings.site.publicHomepageSearchTitle || '先确认，再申请'),
      publicHomepageSearchNote: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSearchNote') ? cleanText(body.publicHomepageSearchNote, 300) : (settings.site.publicHomepageSearchNote || '查询只返回当前可用状态，不公开域名归属或账户信息。'),
      publicHomepageStatsUsersLabel: Object.prototype.hasOwnProperty.call(body, 'publicHomepageStatsUsersLabel') ? cleanText(body.publicHomepageStatsUsersLabel, 40) : (settings.site.publicHomepageStatsUsersLabel || '活跃用户'),
      publicHomepageStatsDomainsLabel: Object.prototype.hasOwnProperty.call(body, 'publicHomepageStatsDomainsLabel') ? cleanText(body.publicHomepageStatsDomainsLabel, 40) : (settings.site.publicHomepageStatsDomainsLabel || '正常域名'),
      publicHomepageStatsDnsLabel: Object.prototype.hasOwnProperty.call(body, 'publicHomepageStatsDnsLabel') ? cleanText(body.publicHomepageStatsDnsLabel, 40) : (settings.site.publicHomepageStatsDnsLabel || 'DNS 记录'),
      publicHomepageStatsSuffixesLabel: Object.prototype.hasOwnProperty.call(body, 'publicHomepageStatsSuffixesLabel') ? cleanText(body.publicHomepageStatsSuffixesLabel, 40) : (settings.site.publicHomepageStatsSuffixesLabel || '开放根域名'),
      publicHomepageFeaturesTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageFeaturesTitle') ? cleanText(body.publicHomepageFeaturesTitle, 120) : (settings.site.publicHomepageFeaturesTitle || '一个入口，完成域名日常管理'),
      publicHomepageFeaturesDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageFeaturesDescription') ? cleanText(body.publicHomepageFeaturesDescription, 400) : (settings.site.publicHomepageFeaturesDescription || '首页负责查询与了解服务，登录后进入控制台处理申请、审核状态与 DNS。'),
      publicHomepageDomainsTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageDomainsTitle') ? cleanText(body.publicHomepageDomainsTitle, 120) : (settings.site.publicHomepageDomainsTitle || '现在可以申请的后缀'),
      publicHomepageDomainsDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageDomainsDescription') ? cleanText(body.publicHomepageDomainsDescription, 400) : (settings.site.publicHomepageDomainsDescription || '这里只展示开放入口，不用公开用户域名或账户数据。'),
      publicHomepageProcessTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageProcessTitle') ? cleanText(body.publicHomepageProcessTitle, 120) : (settings.site.publicHomepageProcessTitle || '操作路径一眼看懂'),
      publicHomepageProcessDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageProcessDescription') ? cleanText(body.publicHomepageProcessDescription, 400) : (settings.site.publicHomepageProcessDescription || '查询、申请、审核、解析各自独立，减少误操作。'),
      publicHomepageInfrastructureTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageInfrastructureTitle') ? cleanText(body.publicHomepageInfrastructureTitle, 120) : (settings.site.publicHomepageInfrastructureTitle || '系统怎么工作'),
      publicHomepageInfrastructureDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageInfrastructureDescription') ? cleanText(body.publicHomepageInfrastructureDescription, 400) : (settings.site.publicHomepageInfrastructureDescription || '公开页面、业务控制台和 Cloudflare DNS 分工明确，避免把内部配置暴露到前台。'),
      publicHomepageFaqTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageFaqTitle') ? cleanText(body.publicHomepageFaqTitle, 120) : (settings.site.publicHomepageFaqTitle || '第一次使用？先看这些'),
      publicHomepageFaqDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageFaqDescription') ? cleanText(body.publicHomepageFaqDescription, 400) : (settings.site.publicHomepageFaqDescription || '把最容易遇到的问题留在首页，详细内容放到独立知识库。'),
      publicHomepageSectionOrder: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSectionOrder') ? cleanText(body.publicHomepageSectionOrder, 120) : (settings.site.publicHomepageSectionOrder || 'features,domains,faq'),
      publicHomepageCtaEyebrow: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaEyebrow') ? cleanText(body.publicHomepageCtaEyebrow, 50) : (settings.site.publicHomepageCtaEyebrow || '下一步'),
      publicHomepageCtaTitle: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaTitle') ? cleanText(body.publicHomepageCtaTitle, 120) : (settings.site.publicHomepageCtaTitle || '从查询一个名称开始'),
      publicHomepageCtaDescription: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaDescription') ? cleanText(body.publicHomepageCtaDescription, 500) : (settings.site.publicHomepageCtaDescription || '不需要登录即可先确认可用性；需要申请时再进入账户流程。'),
      publicHomepageCtaPrimaryText: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaPrimaryText') ? cleanText(body.publicHomepageCtaPrimaryText, 40) : (settings.site.publicHomepageCtaPrimaryText || '查询域名'),
      publicHomepageCtaPrimaryHref: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaPrimaryHref') ? cleanText(body.publicHomepageCtaPrimaryHref, 300) : (settings.site.publicHomepageCtaPrimaryHref || '#/available'),
      publicHomepageCtaSecondaryText: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaSecondaryText') ? cleanText(body.publicHomepageCtaSecondaryText, 40) : (settings.site.publicHomepageCtaSecondaryText || '阅读知识库'),
      publicHomepageCtaSecondaryHref: Object.prototype.hasOwnProperty.call(body, 'publicHomepageCtaSecondaryHref') ? cleanText(body.publicHomepageCtaSecondaryHref, 300) : (settings.site.publicHomepageCtaSecondaryHref || '#/knowledge'),
      publicHomepageShowSearch: asBoolean(body.publicHomepageShowSearch, true),
      publicHomepageShowStats: asBoolean(body.publicHomepageShowStats, true),
      publicHomepageShowFeatures: asBoolean(body.publicHomepageShowFeatures, true),
      publicHomepageShowDomains: asBoolean(body.publicHomepageShowDomains, true),
      publicHomepageShowProcess: false,
      publicHomepageShowInfrastructure: false,
      publicHomepageShowFaq: asBoolean(body.publicHomepageShowFaq, true),
      publicHomepageShowCta: asBoolean(body.publicHomepageShowCta, true),
      publicHomepageSearchPlaceholder: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSearchPlaceholder') ? cleanText(body.publicHomepageSearchPlaceholder, 120) : (settings.site.publicHomepageSearchPlaceholder || '输入您想要的域名前缀，例如 myblog'),
      publicHomepageSearchButtonText: Object.prototype.hasOwnProperty.call(body, 'publicHomepageSearchButtonText') ? cleanText(body.publicHomepageSearchButtonText, 30) : (settings.site.publicHomepageSearchButtonText || '查询'),
      publicNavShowHome: asBoolean(body.publicNavShowHome, true),
      publicNavShowAvailable: asBoolean(body.publicNavShowAvailable, true),
      publicNavShowKnowledge: asBoolean(body.publicNavShowKnowledge, true),
      publicNavShowFeatured: asBoolean(body.publicNavShowFeatured, true),
      publicNavShowNavigation: asBoolean(body.publicNavShowNavigation, true),
      publicNavHomeLabel: Object.prototype.hasOwnProperty.call(body, 'publicNavHomeLabel') ? cleanText(body.publicNavHomeLabel, 40) : (settings.site.publicNavHomeLabel || '首页'),
      publicNavAvailableLabel: Object.prototype.hasOwnProperty.call(body, 'publicNavAvailableLabel') ? cleanText(body.publicNavAvailableLabel, 40) : (settings.site.publicNavAvailableLabel || '可用域名'),
      publicNavKnowledgeLabel: Object.prototype.hasOwnProperty.call(body, 'publicNavKnowledgeLabel') ? cleanText(body.publicNavKnowledgeLabel, 40) : (settings.site.publicNavKnowledgeLabel || '知识库'),
      publicNavFeaturedLabel: Object.prototype.hasOwnProperty.call(body, 'publicNavFeaturedLabel') ? cleanText(body.publicNavFeaturedLabel, 40) : (settings.site.publicNavFeaturedLabel || '优质站点'),
      publicNavNavigationLabel: Object.prototype.hasOwnProperty.call(body, 'publicNavNavigationLabel') ? cleanText(body.publicNavNavigationLabel, 40) : (settings.site.publicNavNavigationLabel || '导航'),
      publicBrandTitle: Object.prototype.hasOwnProperty.call(body, 'publicBrandTitle') ? cleanText(body.publicBrandTitle, 100) : (settings.site.publicBrandTitle || ''),
      publicHeaderShowBrand: asBoolean(body.publicHeaderShowBrand, true),
      publicHeaderShowLanguage: asBoolean(body.publicHeaderShowLanguage, true),
      publicHeaderShowAccountActions: asBoolean(body.publicHeaderShowAccountActions, true),
      publicHeaderDashboardText: Object.prototype.hasOwnProperty.call(body, 'publicHeaderDashboardText') ? cleanText(body.publicHeaderDashboardText, 40) : (settings.site.publicHeaderDashboardText || '进入控制台'),
      publicHeaderLoginText: Object.prototype.hasOwnProperty.call(body, 'publicHeaderLoginText') ? cleanText(body.publicHeaderLoginText, 40) : (settings.site.publicHeaderLoginText || '登录'),
      publicHeaderRegisterText: Object.prototype.hasOwnProperty.call(body, 'publicHeaderRegisterText') ? cleanText(body.publicHeaderRegisterText, 40) : (settings.site.publicHeaderRegisterText || '注册'),
      publicDomainCheckEmptyText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckEmptyText') ? cleanText(body.publicDomainCheckEmptyText, 120) : (settings.site.publicDomainCheckEmptyText || '请输入域名前缀'),
      publicDomainCheckCheckingText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckCheckingText') ? cleanText(body.publicDomainCheckCheckingText, 120) : (settings.site.publicDomainCheckCheckingText || '正在检查域名是否可注册...'),
      publicDomainCheckAvailableText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckAvailableText') ? cleanText(body.publicDomainCheckAvailableText, 120) : (settings.site.publicDomainCheckAvailableText || '此域名可注册。'),
      publicDomainCheckUnavailableText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckUnavailableText') ? cleanText(body.publicDomainCheckUnavailableText, 120) : (settings.site.publicDomainCheckUnavailableText || '此域名暂不可注册。'),
      publicDomainCheckFailureText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckFailureText') ? cleanText(body.publicDomainCheckFailureText, 160) : (settings.site.publicDomainCheckFailureText || '查询失败，请稍后重试'),
      publicDomainCheckApplyText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckApplyText') ? cleanText(body.publicDomainCheckApplyText, 40) : (settings.site.publicDomainCheckApplyText || '立即申请'),
      publicDomainCheckRegisterApplyText: Object.prototype.hasOwnProperty.call(body, 'publicDomainCheckRegisterApplyText') ? cleanText(body.publicDomainCheckRegisterApplyText, 40) : (settings.site.publicDomainCheckRegisterApplyText || '注册后申请'),
      publicHomepageShowBadge: asBoolean(body.publicHomepageShowBadge, true),
      publicHomepageShowHighlight: asBoolean(body.publicHomepageShowHighlight, true),
      publicHomepageShowDescription: asBoolean(body.publicHomepageShowDescription, true),
      publicHomepageShowPrimaryButton: asBoolean(body.publicHomepageShowPrimaryButton, true),
      publicHomepageShowSecondaryButton: asBoolean(body.publicHomepageShowSecondaryButton, true),
      publicHomepageStatsShowUsers: asBoolean(body.publicHomepageStatsShowUsers, true),
      publicHomepageStatsShowDomains: asBoolean(body.publicHomepageStatsShowDomains, true),
      publicHomepageStatsShowDns: asBoolean(body.publicHomepageStatsShowDns, true),
      publicHomepageStatsShowSuffixes: asBoolean(body.publicHomepageStatsShowSuffixes, true),
      publicHomepageFeature1Show: asBoolean(body.publicHomepageFeature1Show, true),
      publicHomepageFeature1Icon: cleanText(body.publicHomepageFeature1Icon, 12) || '∞',
      publicHomepageFeature1Title: cleanText(body.publicHomepageFeature1Title, 80) || '免费使用',
      publicHomepageFeature1Description: cleanText(body.publicHomepageFeature1Description, 300) || '提供可申请的免费二级域名，注册、审核与 DNS 管理集中在一个系统完成。',
      publicHomepageFeature2Show: asBoolean(body.publicHomepageFeature2Show, true),
      publicHomepageFeature2Icon: cleanText(body.publicHomepageFeature2Icon, 12) || '⚡',
      publicHomepageFeature2Title: cleanText(body.publicHomepageFeature2Title, 80) || '快速上线',
      publicHomepageFeature2Description: cleanText(body.publicHomepageFeature2Description, 300) || '域名审核通过后即可配置解析，不需要在多个后台之间反复切换。',
      publicHomepageFeature3Show: asBoolean(body.publicHomepageFeature3Show, true),
      publicHomepageFeature3Icon: cleanText(body.publicHomepageFeature3Icon, 12) || '◎',
      publicHomepageFeature3Title: cleanText(body.publicHomepageFeature3Title, 80) || '完整 DNS 控制',
      publicHomepageFeature3Description: cleanText(body.publicHomepageFeature3Description, 300) || '按管理员开放策略支持常见 DNS 记录类型。',
      publicHomepageFeature4Show: asBoolean(body.publicHomepageFeature4Show, true),
      publicHomepageFeature4Icon: cleanText(body.publicHomepageFeature4Icon, 12) || '☁',
      publicHomepageFeature4Title: cleanText(body.publicHomepageFeature4Title, 80) || 'Cloudflare 驱动',
      publicHomepageFeature4Description: cleanText(body.publicHomepageFeature4Description, 300) || 'DNS 写入由 Cloudflare API 完成，可代理记录可按系统策略开启代理。',
      publicHomepageFeature5Show: asBoolean(body.publicHomepageFeature5Show, true),
      publicHomepageFeature5Icon: cleanText(body.publicHomepageFeature5Icon, 12) || '⌁',
      publicHomepageFeature5Title: cleanText(body.publicHomepageFeature5Title, 80) || '多根域名',
      publicHomepageFeature5Description: cleanText(body.publicHomepageFeature5Description, 300) || '可以从多个当前开放的根域名中选择合适的后缀。',
      publicHomepageFeature6Show: asBoolean(body.publicHomepageFeature6Show, true),
      publicHomepageFeature6Icon: cleanText(body.publicHomepageFeature6Icon, 12) || '✓',
      publicHomepageFeature6Title: cleanText(body.publicHomepageFeature6Title, 80) || '可追踪管理',
      publicHomepageFeature6Description: cleanText(body.publicHomepageFeature6Description, 300) || '域名状态、DNS、续期、消息与操作记录都可在控制台查看。',
      publicHomepageDomainsLimit: clamp(Number(body.publicHomepageDomainsLimit || 6), 1, 24),
      publicHomepageDomainsStatusText: cleanText(body.publicHomepageDomainsStatusText, 80) || '当前开放申请',
      publicHomepageDomainsLinkText: cleanText(body.publicHomepageDomainsLinkText, 40) || '立即查询',
      publicHomepageDomainsViewAllText: cleanText(body.publicHomepageDomainsViewAllText, 40) || '查看全部',
      publicHomepageFaqLimit: clamp(Number(body.publicHomepageFaqLimit || 4), 1, 7),
      publicHomepageFaqViewAllText: cleanText(body.publicHomepageFaqViewAllText, 40) || '查看全部',
      publicHomepageCtaShowPrimaryButton: asBoolean(body.publicHomepageCtaShowPrimaryButton, true),
      publicHomepageCtaShowSecondaryButton: asBoolean(body.publicHomepageCtaShowSecondaryButton, true),
      publicAvailableShowHero: asBoolean(body.publicAvailableShowHero, true),
      publicAvailableShowSearchDescription: asBoolean(body.publicAvailableShowSearchDescription, true),
      publicAvailableEmptySuffixesText: cleanText(body.publicAvailableEmptySuffixesText, 160) || '当前暂无开放申请的根域名。',
      publicKnowledgeShowHero: asBoolean(body.publicKnowledgeShowHero, true),
      publicKnowledgeShowSearch: asBoolean(body.publicKnowledgeShowSearch, true),
      publicKnowledgeShowCategorySubtitle: asBoolean(body.publicKnowledgeShowCategorySubtitle, true),
      publicKnowledgeNoResultsText: cleanText(body.publicKnowledgeNoResultsText, 120) || '没有找到匹配内容。',
      publicFeaturedShowHero: asBoolean(body.publicFeaturedShowHero, true),
      publicFeaturedShowCardBadge: asBoolean(body.publicFeaturedShowCardBadge, true),
      publicFeaturedShowCardStatus: asBoolean(body.publicFeaturedShowCardStatus, true),
      publicFeaturedShowCardButton: asBoolean(body.publicFeaturedShowCardButton, true),
      publicFeaturedEmptyText: cleanText(body.publicFeaturedEmptyText, 160) || '当前暂无开放申请的根域名。',
      publicNavigationShowHero: asBoolean(body.publicNavigationShowHero, true),
      publicNavigationShowBackButton: asBoolean(body.publicNavigationShowBackButton, true),
      publicNavigationShowDescriptions: asBoolean(body.publicNavigationShowDescriptions, true),
      publicNavigationShowNumbers: asBoolean(body.publicNavigationShowNumbers, true),
      publicNavigationShowArrows: asBoolean(body.publicNavigationShowArrows, true),
      publicFooterEnabled: asBoolean(body.publicFooterEnabled, true),
      publicFooterShowBrand: asBoolean(body.publicFooterShowBrand, true),
      publicFooterServicesTitle: cleanText(body.publicFooterServicesTitle, 50) || '服务',
      publicFooterInfoTitle: cleanText(body.publicFooterInfoTitle, 50) || '信息',
      publicFooterStartTitle: cleanText(body.publicFooterStartTitle, 50) || '开始使用',
      publicFooterCopyrightText: Object.prototype.hasOwnProperty.call(body, 'publicFooterCopyrightText') ? cleanText(body.publicFooterCopyrightText, 500) : (settings.site.publicFooterCopyrightText || ''),
      publicFooterShowIcp: asBoolean(body.publicFooterShowIcp, true),
      publicAvailableBadge: Object.prototype.hasOwnProperty.call(body, 'publicAvailableBadge') ? cleanText(body.publicAvailableBadge, 80) : (settings.site.publicAvailableBadge || 'DOMAIN AVAILABILITY'),
      publicAvailableTitle: Object.prototype.hasOwnProperty.call(body, 'publicAvailableTitle') ? cleanText(body.publicAvailableTitle, 120) : (settings.site.publicAvailableTitle || '可用域名'),
      publicAvailableDescription: Object.prototype.hasOwnProperty.call(body, 'publicAvailableDescription') ? cleanText(body.publicAvailableDescription, 500) : (settings.site.publicAvailableDescription || '可查询本站二级域名是否可注册。输入前缀并选择根域名，即可实时检查。'),
      publicAvailableSearchEyebrow: Object.prototype.hasOwnProperty.call(body, 'publicAvailableSearchEyebrow') ? cleanText(body.publicAvailableSearchEyebrow, 50) : (settings.site.publicAvailableSearchEyebrow || '即时查询'),
      publicAvailableSearchTitle: Object.prototype.hasOwnProperty.call(body, 'publicAvailableSearchTitle') ? cleanText(body.publicAvailableSearchTitle, 120) : (settings.site.publicAvailableSearchTitle || '查找你想要的二级域名'),
      publicAvailableSearchDescription: Object.prototype.hasOwnProperty.call(body, 'publicAvailableSearchDescription') ? cleanText(body.publicAvailableSearchDescription, 600) : (settings.site.publicAvailableSearchDescription || '查询会同时检查系统内的域名占用状态和对应 Cloudflare DNS 精确记录。提交申请时系统会再次检查。'),
      publicAvailableSearchPlaceholder: Object.prototype.hasOwnProperty.call(body, 'publicAvailableSearchPlaceholder') ? cleanText(body.publicAvailableSearchPlaceholder, 120) : (settings.site.publicAvailableSearchPlaceholder || '输入您想要的域名前缀，例如 myblog'),
      publicAvailableSearchButtonText: Object.prototype.hasOwnProperty.call(body, 'publicAvailableSearchButtonText') ? cleanText(body.publicAvailableSearchButtonText, 30) : (settings.site.publicAvailableSearchButtonText || '查询'),
      publicAvailableShowGuide: asBoolean(body.publicAvailableShowGuide, true),
      publicAvailableGuideAvailableTitle: Object.prototype.hasOwnProperty.call(body, 'publicAvailableGuideAvailableTitle') ? cleanText(body.publicAvailableGuideAvailableTitle, 80) : (settings.site.publicAvailableGuideAvailableTitle || '结果为“可注册”'),
      publicAvailableGuideAvailableText: Object.prototype.hasOwnProperty.call(body, 'publicAvailableGuideAvailableText') ? cleanText(body.publicAvailableGuideAvailableText, 500) : (settings.site.publicAvailableGuideAvailableText || '表示当前未发现同名占用，可以登录或注册后提交申请；最终状态以提交时实时检查和管理员规则为准。'),
      publicAvailableGuideUnavailableTitle: Object.prototype.hasOwnProperty.call(body, 'publicAvailableGuideUnavailableTitle') ? cleanText(body.publicAvailableGuideUnavailableTitle, 80) : (settings.site.publicAvailableGuideUnavailableTitle || '结果为“不可注册”'),
      publicAvailableGuideUnavailableText: Object.prototype.hasOwnProperty.call(body, 'publicAvailableGuideUnavailableText') ? cleanText(body.publicAvailableGuideUnavailableText, 500) : (settings.site.publicAvailableGuideUnavailableText || '通常表示域名已经被系统、Cloudflare DNS 或当前规则占用/限制。可以更换前缀或选择其他根域名。'),
      publicKnowledgeBadge: Object.prototype.hasOwnProperty.call(body, 'publicKnowledgeBadge') ? cleanText(body.publicKnowledgeBadge, 80) : (settings.site.publicKnowledgeBadge || 'KNOWLEDGE BASE'),
      publicKnowledgeTitle: Object.prototype.hasOwnProperty.call(body, 'publicKnowledgeTitle') ? cleanText(body.publicKnowledgeTitle, 120) : (settings.site.publicKnowledgeTitle || '知识库'),
      publicKnowledgeDescription: Object.prototype.hasOwnProperty.call(body, 'publicKnowledgeDescription') ? cleanText(body.publicKnowledgeDescription, 500) : (settings.site.publicKnowledgeDescription || '独立整理的二级域名申请、DNS、续期、安全与故障排查说明。'),
      publicKnowledgeSearchPlaceholder: Object.prototype.hasOwnProperty.call(body, 'publicKnowledgeSearchPlaceholder') ? cleanText(body.publicKnowledgeSearchPlaceholder, 120) : (settings.site.publicKnowledgeSearchPlaceholder || '搜索标题或内容关键字...'),
      publicKnowledgeShowArticleCount: asBoolean(body.publicKnowledgeShowArticleCount, true),
      publicFeaturedBadge: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedBadge') ? cleanText(body.publicFeaturedBadge, 80) : (settings.site.publicFeaturedBadge || 'FEATURED DOMAINS'),
      publicFeaturedTitle: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedTitle') ? cleanText(body.publicFeaturedTitle, 120) : (settings.site.publicFeaturedTitle || '优质站点'),
      publicFeaturedDescription: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedDescription') ? cleanText(body.publicFeaturedDescription, 500) : (settings.site.publicFeaturedDescription || '展示目前可用、并由管理员开放申请的根域名。'),
      publicFeaturedCardBadgeText: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedCardBadgeText') ? cleanText(body.publicFeaturedCardBadgeText, 30) : (settings.site.publicFeaturedCardBadgeText || '免费'),
      publicFeaturedCardStatusText: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedCardStatusText') ? cleanText(body.publicFeaturedCardStatusText, 40) : (settings.site.publicFeaturedCardStatusText || '开放申请'),
      publicFeaturedCardButtonText: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedCardButtonText') ? cleanText(body.publicFeaturedCardButtonText, 40) : (settings.site.publicFeaturedCardButtonText || '立即申请'),
      publicFeaturedCardFallbackDescription: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedCardFallbackDescription') ? cleanText(body.publicFeaturedCardFallbackDescription, 400) : (settings.site.publicFeaturedCardFallbackDescription || '免费二级域名，可用于合规的个人项目、学习、展示与测试。'),
      publicFeaturedShowQueryHelper: asBoolean(body.publicFeaturedShowQueryHelper, true),
      publicFeaturedQueryTitle: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedQueryTitle') ? cleanText(body.publicFeaturedQueryTitle, 100) : (settings.site.publicFeaturedQueryTitle || '先查再申请'),
      publicFeaturedQueryDescription: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedQueryDescription') ? cleanText(body.publicFeaturedQueryDescription, 400) : (settings.site.publicFeaturedQueryDescription || '如果已经想好前缀，可以先到“可用域名”确认完整二级域名是否可注册。'),
      publicFeaturedQueryButtonText: Object.prototype.hasOwnProperty.call(body, 'publicFeaturedQueryButtonText') ? cleanText(body.publicFeaturedQueryButtonText, 40) : (settings.site.publicFeaturedQueryButtonText || '去查询'),
      publicNavigationBadge: Object.prototype.hasOwnProperty.call(body, 'publicNavigationBadge') ? cleanText(body.publicNavigationBadge, 80) : (settings.site.publicNavigationBadge || 'FLORE DIRECTORY'),
      publicNavigationTitle: Object.prototype.hasOwnProperty.call(body, 'publicNavigationTitle') ? cleanText(body.publicNavigationTitle, 120) : (settings.site.publicNavigationTitle || '站点导航'),
      publicNavigationDescription: Object.prototype.hasOwnProperty.call(body, 'publicNavigationDescription') ? cleanText(body.publicNavigationDescription, 500) : (settings.site.publicNavigationDescription || '按使用场景找到入口，快速进入查询、知识库、账户与规则页面。'),
      publicNavigationBackText: Object.prototype.hasOwnProperty.call(body, 'publicNavigationBackText') ? cleanText(body.publicNavigationBackText, 40) : (settings.site.publicNavigationBackText || '返回首页'),
      publicNavigationGroupStart: Object.prototype.hasOwnProperty.call(body, 'publicNavigationGroupStart') ? cleanText(body.publicNavigationGroupStart, 50) : (settings.site.publicNavigationGroupStart || '开始'),
      publicNavigationGroupTools: Object.prototype.hasOwnProperty.call(body, 'publicNavigationGroupTools') ? cleanText(body.publicNavigationGroupTools, 50) : (settings.site.publicNavigationGroupTools || '工具'),
      publicNavigationGroupUser: Object.prototype.hasOwnProperty.call(body, 'publicNavigationGroupUser') ? cleanText(body.publicNavigationGroupUser, 80) : (settings.site.publicNavigationGroupUser || '用户中心（需登录）'),
      publicNavigationGroupRequirements: Object.prototype.hasOwnProperty.call(body, 'publicNavigationGroupRequirements') ? cleanText(body.publicNavigationGroupRequirements, 50) : (settings.site.publicNavigationGroupRequirements || '要求'),
      publicFooterSubtitle: Object.prototype.hasOwnProperty.call(body, 'publicFooterSubtitle') ? cleanText(body.publicFooterSubtitle, 300) : (settings.site.publicFooterSubtitle || settings.site.subtitle || ''),
      publicFooterShowPowered: asBoolean(body.publicFooterShowPowered, true),
      notFoundText: cleanText(body.notFoundText, 500) || '页面不存在或已移动',
      defaultLanguage: String(body.defaultLanguage || 'zh') === 'en' ? 'en' : 'zh',
      showQuota: asBoolean(body.showQuota, true),
      showExpiryReminder: asBoolean(body.showExpiryReminder, true),
    };
  }

  if (group === 'registration') {
    settings.registration = {
      ...settings.registration,
      enabled: asBoolean(body.enabled, true),
      autoActivate: asBoolean(body.autoActivate, true),
      blockTempEmail: asBoolean(body.blockTempEmail, false),
      maxAccountsPerIp: clamp(Number(body.maxAccountsPerIp || 0), 0, 10000),
      ipRegisterCooldownMinutes: clamp(Number(body.ipRegisterCooldownMinutes || 0), 0, 10080),
      turnstileRegisterEnabled: String(body.humanVerificationMode || settings.registration.humanVerificationMode || 'turnstile_fallback') !== 'image',
      defaultStatus: String(body.defaultStatus || 'auto') === 'manual' ? 'manual' : 'auto',
      disabledMessage: cleanText(body.disabledMessage, 500) || '当前暂未开放用户注册',
      turnstileSiteKey: cleanText(body.turnstileSiteKey, 300),
      turnstileSecret: Object.prototype.hasOwnProperty.call(body, 'turnstileSecret')
        ? cleanText(body.turnstileSecret, 500)
        : (settings.registration.turnstileSecret || ''),
      humanVerificationMode: ['image','turnstile','turnstile_fallback'].includes(String(body.humanVerificationMode || 'turnstile_fallback')) ? String(body.humanVerificationMode || 'turnstile_fallback') as any : 'turnstile_fallback',
      captchaBackgroundEnabled: asBoolean(body.captchaBackgroundEnabled, true),
      captchaBackgroundMode: String(body.captchaBackgroundMode || 'random') === 'upload' ? 'upload' : 'random',
      captchaBackgroundImage: Object.prototype.hasOwnProperty.call(body, 'captchaBackgroundImage')
        ? sanitizeCaptchaBackgroundImage(body.captchaBackgroundImage)
        : (settings.registration.captchaBackgroundImage || ''),
      captchaNoiseLinesEnabled: asBoolean(body.captchaNoiseLinesEnabled, true),
      captchaNoiseLinesMin: clamp(Number(body.captchaNoiseLinesMin ?? 2), 0, 20),
      captchaNoiseLinesMax: clamp(Number(body.captchaNoiseLinesMax ?? 5), 0, 20),
      captchaNoiseLineColorMode: String(body.captchaNoiseLineColorMode || 'random') === 'fixed' ? 'fixed' : 'random',
      captchaNoiseLineFixedColor: normalizeHexColor(body.captchaNoiseLineFixedColor, '#64748b'),
      captchaCharset: sanitizeCaptchaCharset(body.captchaCharset),
      captchaLength: clamp(Number(body.captchaLength || 4), 3, 8),
      emailDomainBlacklist: cleanText(body.emailDomainBlacklist, 10000),
      emailVerificationEnabled: asBoolean(body.emailVerificationEnabled, false),
      emailApiKey: asBoolean((body as any).clearEmailApiKey, false)
        ? ''
        : (cleanText((body as any).emailApiKey, 2000) || settings.registration.emailApiKey || ''),
      emailFrom: cleanText(body.emailFrom, 320),
      emailFromName: cleanText(body.emailFromName, 120) || '域名注册中心',
      emailCodeExpiryMinutes: clamp(Number(body.emailCodeExpiryMinutes || 10), 2, 60),
      emailCodeLength: clamp(Number(body.emailCodeLength || 6), 4, 12),
      emailCodeCharset: sanitizeEmailCodeCharset(body.emailCodeCharset),
      emailAllowedEnvironments: cleanText(body.emailAllowedEnvironments, 500) || '*',
      emailRegistrationSceneEnabled: asBoolean(body.emailRegistrationSceneEnabled, true),
      emailTestSceneEnabled: asBoolean(body.emailTestSceneEnabled, true),
      emailFixedRecipients: sanitizeEmailRecipientList(body.emailFixedRecipients).join('\n'),
      emailRegistrationRecipientMode: String(body.emailRegistrationRecipientMode || 'user') === 'user_bcc_fixed' ? 'user_bcc_fixed' : 'user',
      emailTestRecipientMode: ['manual','admin','fixed'].includes(String(body.emailTestRecipientMode || 'manual')) ? String(body.emailTestRecipientMode || 'manual') as any : 'manual',
      cloudflareEmailAccountId: cleanText(body.cloudflareEmailAccountId, 64) || settings.registration.cloudflareEmailAccountId || '',
      cloudflareEmailApiToken: asBoolean((body as any).clearCloudflareEmailApiToken, false)
        ? ''
        : (cleanText((body as any).cloudflareEmailApiToken, 2000) || settings.registration.cloudflareEmailApiToken || ''),
      cloudflareAdminRecipient: normalizeOptionalEmailStrict(body.cloudflareAdminRecipient) || settings.registration.cloudflareAdminRecipient || '',
      cloudflareVerifiedRecipients: sanitizeEmailRecipientList(settings.registration.cloudflareVerifiedRecipients || []),
      cloudflareRecipientsSyncedAt: settings.registration.cloudflareRecipientsSyncedAt || '',
      emailRegistrationSubjectTemplate: cleanText(body.emailRegistrationSubjectTemplate, 300) || '【{{siteName}}】注册验证码',
      emailRegistrationTextTemplate: cleanText(body.emailRegistrationTextTemplate, 12000) || '您的注册验证码是 {{code}}，{{expiryMinutes}} 分钟内有效。若非本人操作，请忽略本邮件。',
      emailRegistrationHtmlTemplate: cleanHtmlText(body.emailRegistrationHtmlTemplate, 30000),
      emailTestSubjectTemplate: cleanText(body.emailTestSubjectTemplate, 300) || '【{{siteName}}】邮件服务测试',
      emailTestTextTemplate: cleanText(body.emailTestTextTemplate, 12000) || '邮件服务连接正常，这是一封管理员测试邮件。',
      emailTestHtmlTemplate: cleanHtmlText(body.emailTestHtmlTemplate, 30000),
      dailyDomainApplyLimit: clamp(Number(body.dailyDomainApplyLimit || 0), 0, 10000),
      failedRegisterBanThreshold: clamp(Number(body.failedRegisterBanThreshold || 0), 0, 1000),
      failedRegisterBanMinutes: clamp(Number(body.failedRegisterBanMinutes || 0), 0, 10080),
      blockVpnProxy: asBoolean(body.blockVpnProxy, false),
      requireRegistrationKey: asBoolean(body.requireRegistrationKey, false),
    };
    if ((settings.registration.captchaNoiseLinesMin || 0) > (settings.registration.captchaNoiseLinesMax || 0)) {
      const value = settings.registration.captchaNoiseLinesMin || 0;
      settings.registration.captchaNoiseLinesMin = settings.registration.captchaNoiseLinesMax || 0;
      settings.registration.captchaNoiseLinesMax = value;
    }
  }

  if (group === 'domain') {
    settings.domain = {
      ...settings.domain,
      defaultQuota: clamp(Number(body.defaultQuota || 3), 0, 999999),
      validDays: clamp(Number(body.validDays || 365), 1, 3650),
      renewWindowDays: clamp(Number(body.renewWindowDays || 60), 1, 3650),
      allowUserDeleteInvalid: asBoolean(body.allowUserDeleteInvalid, true),
      allowDnsEditAfterApproved: asBoolean(body.allowDnsEditAfterApproved, true),
      prefixMinLength: clamp(Number(body.prefixMinLength || 2), 1, 63),
      prefixMaxLength: clamp(Number(body.prefixMaxLength || 36), 1, 63),
      prefixBlacklistText: cleanText(body.prefixBlacklistText, 10000),
      allowNumericPrefix: asBoolean(body.allowNumericPrefix, true),
      allowUnderscorePrefix: asBoolean(body.allowUnderscorePrefix, false),
      selfRenewEnabled: asBoolean(body.selfRenewEnabled, true),
      expiryReminderDays: clamp(Number(body.expiryReminderDays || 30), 0, 3650),
      expiredDnsCleanupDays: clamp(Number(body.expiredDnsCleanupDays || 30), 0, 3650),
      allowUserDeleteActive: asBoolean(body.allowUserDeleteActive, true),
      allowDomainTransfer: asBoolean(body.allowDomainTransfer, false),
      maxDnsRecordsPerDomain: clamp(Number(body.maxDnsRecordsPerDomain || 20), 1, 1000),
      approvalMode: ['auto','manual','risk'].includes(String(body.approvalMode || 'manual')) ? String(body.approvalMode || 'manual') as any : 'manual',
      platformMaxDomains: clamp(Number(body.platformMaxDomains || 9999), 1, 9999999),
      normalUserQuota: clamp(Number(body.normalUserQuota || body.defaultQuota || 3), 0, 999999),
      normalUserValidDays: clamp(Number(body.normalUserValidDays || body.validDays || 365), 1, 3650),
      whitelistUserQuota: clamp(Number(body.whitelistUserQuota || body.defaultQuota || 10), 0, 999999),
      whitelistUserValidDays: clamp(Number(body.whitelistUserValidDays || body.validDays || 365), 1, 3650),
      lockAfterExpireDays: clamp(Number(body.lockAfterExpireDays || 0), 0, 3650),
      hardDeleteAfterExpireDays: clamp(Number(body.hardDeleteAfterExpireDays || 30), 0, 3650),
      blockedPrefixText: cleanText(body.blockedPrefixText, 10000),
      adminOnlyPrefixText: cleanText(body.adminOnlyPrefixText, 10000),
    };
    if ((settings.domain.prefixMinLength || 2) > (settings.domain.prefixMaxLength || 36)) {
      const min = settings.domain.prefixMinLength || 2;
      settings.domain.prefixMinLength = settings.domain.prefixMaxLength || 36;
      settings.domain.prefixMaxLength = min;
    }
  }

  if (group === 'dns') {
    const suffixesInput = Array.isArray((body as any).suffixes) ? (body as any).suffixes : parseJsonArray(body.suffixesJson);
    const recordTypePolicies = sanitizeDnsRecordTypePolicies(
      (body as any).recordTypePolicies,
      settings.dns.recordTypePolicies,
      settings.dns.allowMxRecords !== false,
    );
    const suffixes = sanitizeDnsSuffixes(suffixesInput, settings.dns.suffixes);
    const globallyOpenTypes = new Set(recordTypePolicies.filter(policy => policy.allowUserAdd).map(policy => policy.type));
    if (!globallyOpenTypes.size) throw new HttpError(400, 'DNS_TYPE_POLICY_EMPTY', '至少开放一种 DNS 类型供用户添加');
    for (const suffix of suffixes) {
      const effectiveTypes = suffix.allowedTypes.filter(type => globallyOpenTypes.has(type as DnsRecordType));
      if (!effectiveTypes.length) throw new HttpError(400, 'DNS_SUFFIX_TYPE_EMPTY', `根域名 ${suffix.suffix} 至少需要包含一种全局开放的 DNS 类型`);
      if (!effectiveTypes.includes(suffix.defaultType)) throw new HttpError(400, 'DNS_DEFAULT_TYPE_CLOSED', `根域名 ${suffix.suffix} 的默认类型必须在全局策略中开放`);
    }
    settings.dns = {
      ...settings.dns,
      defaultProxied: asBoolean(body.defaultProxied, settings.dns.defaultProxied ?? false),
      allowMxRecords: recordTypePolicies.find(policy => policy.type === 'MX')?.allowUserAdd !== false,
      blockWildcardRecords: asBoolean(body.blockWildcardRecords, settings.dns.blockWildcardRecords ?? true),
      cnameTargetBlacklist: cleanText(body.cnameTargetBlacklist, 10000),
      cfApiToken: asBoolean((body as any).clearCfApiToken, false) ? '' : (cleanText((body as any).cfApiToken, 2000) || settings.dns.cfApiToken || ''),
      reservedPrefixes: sanitizeStringList(body.reservedPrefixes || settings.dns.reservedPrefixes.join('\n')).slice(0, 500),
      recordTypePolicies,
      suffixes,
    };
  }

  if (group === 'blacklist') {
    settings.blacklist = {
      prefixes: sanitizeStringList(body.prefixes).slice(0, 2000),
      ips: sanitizeStringList(body.ips).slice(0, 2000),
      emails: sanitizeStringList(body.emails).slice(0, 2000),
      registration: sanitizeBlacklistRecords((body as any).registration),
      access: sanitizeBlacklistRecords((body as any).access),
      userIds: sanitizeBlacklistRecords((body as any).userIds),
    };
  }

  if (group === 'notification') {
    settings.notification = {
      events: sanitizeNotificationEvents((body as any).events),
      expiryTemplate: cleanText(body.expiryTemplate, 5000) || '您的域名即将到期，请及时续期。',
      templates: sanitizeTemplateMap((body as any).templates),
      userTargets: sanitizeTemplateMap((body as any).userTargets),
      adminTargets: sanitizeTemplateMap((body as any).adminTargets),
      rateLimitPerHour: clamp(Number(body.rateLimitPerHour || 60), 0, 10000),
    };
  }

  if (group === 'security') {
    settings.security = {
      adminSessionTimeoutHours: clamp(Number(body.adminSessionTimeoutHours || 24), 1, 24 * 365),
      adminIpWhitelist: cleanText(body.adminIpWhitelist, 10000),
      auditRetentionDays: clamp(Number(body.auditRetentionDays || 7), 1, 3650),
      failedLoginLockThreshold: clamp(Number(body.failedLoginLockThreshold || 0), 0, 1000),
      failedLoginLockMinutes: clamp(Number(body.failedLoginLockMinutes || 0), 0, 10080),
      adminPath: cleanText(body.adminPath, 120),
      rolesPermissions: cleanText(body.rolesPermissions, 20000),
      auditRecordItems: cleanText(body.auditRecordItems, 10000),
    };
  }

  if (group === 'automation') {
    settings.automation = {
      enabled: asBoolean(body.enabled, false),
      scanCycleMinutes: clamp(Number(body.scanCycleMinutes || 60), 5, 1440),
      checkExpiringDomains: asBoolean(body.checkExpiringDomains, true),
      cleanupExpiredDns: asBoolean(body.cleanupExpiredDns, true),
      cronExpression: cleanText(body.cronExpression, 120),
      notifyAdminOnFailure: asBoolean(body.notifyAdminOnFailure, true),
      dnsCleanupProtectionDays: clamp(Number(body.dnsCleanupProtectionDays || 7), 1, 3650),
      taskLogs: Array.isArray((body as any).taskLogs) ? (body as any).taskLogs.slice(0, 50) : (settings.automation?.taskLogs || []),
    };
  }

  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, `admin.settings_${group}`, 'setting', group);
  return ok({ settings: adminSettingsView(settings, env) });
}

async function loadSettings(env: Env): Promise<AppSettings> {
  const defaults = defaultSettings(env);
  let saved: Partial<AppSettings> = {};
  try {
    const raw = await env.APP_KV.get(SETTINGS_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {}

  const site = { ...defaults.site, ...(saved.site || {}) };
  const registration = { ...defaults.registration, ...(saved.registration || {}) };
  const domain = { ...defaults.domain, ...(saved.domain || {}) };
  const dnsSaved = (saved as any).dns || {};
  const hadSavedRecordTypePolicies = Array.isArray(dnsSaved.recordTypePolicies);
  let sanitizedSuffixes = sanitizeDnsSuffixes(dnsSaved.suffixes, defaults.dns.suffixes);
  // v98 migration: older KV settings did not have a global DNS-type policy table.
  // On the first load after upgrading, merge newly configured DNS_ALLOWED_TYPES
  // into every existing root-domain card so Worker variables and the editor stay aligned.
  if (!hadSavedRecordTypePolicies) {
    const envTypes = defaults.dns.recordTypePolicies.filter(policy => policy.allowUserAdd).map(policy => policy.type);
    sanitizedSuffixes = sanitizedSuffixes.map(item => ({
      ...item,
      allowedTypes: Array.from(new Set([...item.allowedTypes, ...envTypes])),
    }));
  }
  const dns = {
    ...defaults.dns,
    ...dnsSaved,
    reservedPrefixes: sanitizeStringList(dnsSaved.reservedPrefixes || defaults.dns.reservedPrefixes).slice(0, 500),
    recordTypePolicies: sanitizeDnsRecordTypePolicies(
      dnsSaved.recordTypePolicies,
      defaults.dns.recordTypePolicies,
      typeof dnsSaved.allowMxRecords === 'boolean' ? dnsSaved.allowMxRecords : undefined,
    ),
    suffixes: sanitizedSuffixes,
  };

  return {
    site,
    registration,
    domain,
    help: { categories: Array.isArray((saved as any).help?.categories) ? sanitizeHelpCategories((saved as any).help.categories) : defaults.help.categories },
    dns,
    blacklist: {
      prefixes: sanitizeStringList((saved as any).blacklist?.prefixes),
      ips: sanitizeStringList((saved as any).blacklist?.ips),
      emails: sanitizeStringList((saved as any).blacklist?.emails),
      registration: sanitizeBlacklistRecords((saved as any).blacklist?.registration),
      access: sanitizeBlacklistRecords((saved as any).blacklist?.access),
      userIds: sanitizeBlacklistRecords((saved as any).blacklist?.userIds),
    },
    notification: {
      events: sanitizeNotificationEvents((saved as any).notification?.events),
      expiryTemplate: cleanText((saved as any).notification?.expiryTemplate, 5000) || defaults.notification!.expiryTemplate,
      templates: sanitizeTemplateMap((saved as any).notification?.templates || defaults.notification?.templates),
      userTargets: sanitizeTemplateMap((saved as any).notification?.userTargets || defaults.notification?.userTargets),
      adminTargets: sanitizeTemplateMap((saved as any).notification?.adminTargets || defaults.notification?.adminTargets),
      rateLimitPerHour: clamp(Number((saved as any).notification?.rateLimitPerHour || defaults.notification?.rateLimitPerHour || 60), 0, 10000),
    },
    security: {
      ...defaults.security!,
      ...((saved as any).security || {}),
      auditRetentionDays: clamp(Number((saved as any).security?.auditRetentionDays || defaults.security!.auditRetentionDays), 1, 3650),
      failedLoginLockThreshold: clamp(Number((saved as any).security?.failedLoginLockThreshold || 0), 0, 1000),
      failedLoginLockMinutes: clamp(Number((saved as any).security?.failedLoginLockMinutes || 0), 0, 10080),
      adminPath: cleanText((saved as any).security?.adminPath, 120),
      rolesPermissions: cleanText((saved as any).security?.rolesPermissions, 20000),
      auditRecordItems: cleanText((saved as any).security?.auditRecordItems, 10000),
    },
    automation: {
      ...defaults.automation!,
      ...((saved as any).automation || {}),
      scanCycleMinutes: clamp(Number((saved as any).automation?.scanCycleMinutes || defaults.automation!.scanCycleMinutes), 5, 1440),
      dnsCleanupProtectionDays: clamp(Number((saved as any).automation?.dnsCleanupProtectionDays || defaults.automation?.dnsCleanupProtectionDays || 7), 1, 3650),
    },
  };
}

function defaultSettings(env: Env): AppSettings {
  const suffix = normalizeSuffix(env.DNS_SUFFIX || 'flore.top');
  const allowedTypes = sanitizeDnsRecordTypes(
    env.DNS_ALLOWED_TYPES || 'CNAME,A,AAAA,TXT,MX',
    ['CNAME', 'A', 'AAAA', 'TXT', 'MX'],
  );

  const reserved = String(env.DNS_RESERVED_PREFIXES || 'www,api,admin,apply,storage,mail,smtp,imap,pop,ftp,cdn,static,status,support')
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);

  return {
    site: {
      title: '免费二级域名注册中心',
      subtitle: '快速注册并管理您的专属免费域名',
      footer: '请勿申请违法、侵权、仿冒或误导性域名。',
      copyright: '',
      faviconUrl: '',
      headerThirdPartyJs: '',
      maintenanceMode: false,
      maintenanceMessage: '系统维护中，请稍后再试。',
      themeMode: 'light',
      noticeStartAt: '',
      noticeEndAt: '',
      accent: '#4f63f6',
      accent2: '#7c4dff',
      logoText: 'free',
      logoImageUrl: '',
      icp: '',
      homepageNotice: '',
      publicHomepageEnabled: true,
      publicHomepageLayout: 'brand',
      publicHomepageBadge: 'FLORE · FREE SUBDOMAIN SERVICE',
      publicHomepageTitle: '给你的项目一个清晰地址',
      publicHomepageHighlight: '从这里开始',
      publicHomepageDescription: '查询可用二级域名、提交申请并管理 DNS。公开官网负责信息与查询，控制台负责账户和域名管理。',
      publicHomepagePrimaryText: '开始申请',
      publicHomepagePrimaryHref: '',
      publicHomepageSecondaryText: '先查域名',
      publicHomepageSecondaryHref: '#/available',
      publicHomepageSearchEyebrow: '实时查询',
      publicHomepageSearchTitle: '先确认，再申请',
      publicHomepageSearchNote: '查询只返回当前可用状态，不公开域名归属或账户信息。',
      publicHomepageStatsUsersLabel: '活跃用户',
      publicHomepageStatsDomainsLabel: '正常域名',
      publicHomepageStatsDnsLabel: 'DNS 记录',
      publicHomepageStatsSuffixesLabel: '开放根域名',
      publicHomepageFeaturesTitle: '一个入口，完成域名日常管理',
      publicHomepageFeaturesDescription: '首页负责查询与了解服务，登录后进入控制台处理申请、审核状态与 DNS。',
      publicHomepageDomainsTitle: '现在可以申请的后缀',
      publicHomepageDomainsDescription: '这里只展示开放入口，不用公开用户域名或账户数据。',
      publicHomepageProcessTitle: '操作路径一眼看懂',
      publicHomepageProcessDescription: '查询、申请、审核、解析各自独立，减少误操作。',
      publicHomepageInfrastructureTitle: '系统怎么工作',
      publicHomepageInfrastructureDescription: '公开页面、业务控制台和 Cloudflare DNS 分工明确，避免把内部配置暴露到前台。',
      publicHomepageFaqTitle: '第一次使用？先看这些',
      publicHomepageFaqDescription: '把最容易遇到的问题留在首页，详细内容放到独立知识库。',
      publicHomepageSectionOrder: 'features,domains,faq',
      publicHomepageCtaEyebrow: '下一步',
      publicHomepageCtaTitle: '从查询一个名称开始',
      publicHomepageCtaDescription: '不需要登录即可先确认可用性；需要申请时再进入账户流程。',
      publicHomepageCtaPrimaryText: '查询域名',
      publicHomepageCtaPrimaryHref: '#/available',
      publicHomepageCtaSecondaryText: '阅读知识库',
      publicHomepageCtaSecondaryHref: '#/knowledge',
      publicHomepageShowSearch: true,
      publicHomepageShowStats: true,
      publicHomepageShowFeatures: true,
      publicHomepageShowDomains: true,
      publicHomepageShowProcess: false,
      publicHomepageShowInfrastructure: false,
      publicHomepageShowFaq: true,
      publicHomepageShowCta: true,
      publicHomepageSearchPlaceholder: '输入您想要的域名前缀，例如 myblog',
      publicHomepageSearchButtonText: '查询',
      publicNavShowHome: true,
      publicNavShowAvailable: true,
      publicNavShowKnowledge: true,
      publicNavShowFeatured: true,
      publicNavShowNavigation: true,
      publicNavHomeLabel: '首页',
      publicNavAvailableLabel: '可用域名',
      publicNavKnowledgeLabel: '知识库',
      publicNavFeaturedLabel: '优质站点',
      publicNavNavigationLabel: '导航',
      publicBrandTitle: '',
      publicHeaderShowBrand: true,
      publicHeaderShowLanguage: true,
      publicHeaderShowAccountActions: true,
      publicHeaderDashboardText: '进入控制台',
      publicHeaderLoginText: '登录',
      publicHeaderRegisterText: '注册',
      publicDomainCheckEmptyText: '请输入域名前缀',
      publicDomainCheckCheckingText: '正在检查域名是否可注册...',
      publicDomainCheckAvailableText: '此域名可注册。',
      publicDomainCheckUnavailableText: '此域名暂不可注册。',
      publicDomainCheckFailureText: '查询失败，请稍后重试',
      publicDomainCheckApplyText: '立即申请',
      publicDomainCheckRegisterApplyText: '注册后申请',
      publicHomepageShowBadge: true,
      publicHomepageShowHighlight: true,
      publicHomepageShowDescription: true,
      publicHomepageShowPrimaryButton: true,
      publicHomepageShowSecondaryButton: true,
      publicHomepageStatsShowUsers: true,
      publicHomepageStatsShowDomains: true,
      publicHomepageStatsShowDns: true,
      publicHomepageStatsShowSuffixes: true,
      publicHomepageFeature1Show: true, publicHomepageFeature1Icon: '∞', publicHomepageFeature1Title: '免费使用', publicHomepageFeature1Description: '提供可申请的免费二级域名，注册、审核与 DNS 管理集中在一个系统完成。',
      publicHomepageFeature2Show: true, publicHomepageFeature2Icon: '⚡', publicHomepageFeature2Title: '快速上线', publicHomepageFeature2Description: '域名审核通过后即可配置解析，不需要在多个后台之间反复切换。',
      publicHomepageFeature3Show: true, publicHomepageFeature3Icon: '◎', publicHomepageFeature3Title: '完整 DNS 控制', publicHomepageFeature3Description: '按管理员开放策略支持常见 DNS 记录类型。',
      publicHomepageFeature4Show: true, publicHomepageFeature4Icon: '☁', publicHomepageFeature4Title: 'Cloudflare 驱动', publicHomepageFeature4Description: 'DNS 写入由 Cloudflare API 完成，可代理记录可按系统策略开启代理。',
      publicHomepageFeature5Show: true, publicHomepageFeature5Icon: '⌁', publicHomepageFeature5Title: '多根域名', publicHomepageFeature5Description: '可以从多个当前开放的根域名中选择合适的后缀。',
      publicHomepageFeature6Show: true, publicHomepageFeature6Icon: '✓', publicHomepageFeature6Title: '可追踪管理', publicHomepageFeature6Description: '域名状态、DNS、续期、消息与操作记录都可在控制台查看。',
      publicHomepageDomainsLimit: 6,
      publicHomepageDomainsStatusText: '当前开放申请',
      publicHomepageDomainsLinkText: '立即查询',
      publicHomepageDomainsViewAllText: '查看全部',
      publicHomepageFaqLimit: 4,
      publicHomepageFaqViewAllText: '查看全部',
      publicHomepageCtaShowPrimaryButton: true,
      publicHomepageCtaShowSecondaryButton: true,
      publicAvailableShowHero: true,
      publicAvailableShowSearchDescription: true,
      publicAvailableEmptySuffixesText: '当前暂无开放申请的根域名。',
      publicKnowledgeShowHero: true,
      publicKnowledgeShowSearch: true,
      publicKnowledgeShowCategorySubtitle: true,
      publicKnowledgeNoResultsText: '没有找到匹配内容。',
      publicFeaturedShowHero: true,
      publicFeaturedShowCardBadge: true,
      publicFeaturedShowCardStatus: true,
      publicFeaturedShowCardButton: true,
      publicFeaturedEmptyText: '当前暂无开放申请的根域名。',
      publicNavigationShowHero: true,
      publicNavigationShowBackButton: true,
      publicNavigationShowDescriptions: true,
      publicNavigationShowNumbers: true,
      publicNavigationShowArrows: true,
      publicFooterEnabled: true,
      publicFooterShowBrand: true,
      publicFooterServicesTitle: '服务',
      publicFooterInfoTitle: '信息',
      publicFooterStartTitle: '开始使用',
      publicFooterCopyrightText: '',
      publicFooterShowIcp: true,
      publicAvailableBadge: 'DOMAIN AVAILABILITY',
      publicAvailableTitle: '可用域名',
      publicAvailableDescription: '可查询本站二级域名是否可注册。输入前缀并选择根域名，即可实时检查。',
      publicAvailableSearchEyebrow: '即时查询',
      publicAvailableSearchTitle: '查找你想要的二级域名',
      publicAvailableSearchDescription: '查询会同时检查系统内的域名占用状态和对应 Cloudflare DNS 精确记录。提交申请时系统会再次检查。',
      publicAvailableSearchPlaceholder: '输入您想要的域名前缀，例如 myblog',
      publicAvailableSearchButtonText: '查询',
      publicAvailableShowGuide: true,
      publicAvailableGuideAvailableTitle: '结果为“可注册”',
      publicAvailableGuideAvailableText: '表示当前未发现同名占用，可以登录或注册后提交申请；最终状态以提交时实时检查和管理员规则为准。',
      publicAvailableGuideUnavailableTitle: '结果为“不可注册”',
      publicAvailableGuideUnavailableText: '通常表示域名已经被系统、Cloudflare DNS 或当前规则占用/限制。可以更换前缀或选择其他根域名。',
      publicKnowledgeBadge: 'KNOWLEDGE BASE',
      publicKnowledgeTitle: '知识库',
      publicKnowledgeDescription: '独立整理的二级域名申请、DNS、续期、安全与故障排查说明。',
      publicKnowledgeSearchPlaceholder: '搜索标题或内容关键字...',
      publicKnowledgeShowArticleCount: true,
      publicFeaturedBadge: 'FEATURED DOMAINS',
      publicFeaturedTitle: '优质站点',
      publicFeaturedDescription: '展示目前可用、并由管理员开放申请的根域名。',
      publicFeaturedCardBadgeText: '免费',
      publicFeaturedCardStatusText: '开放申请',
      publicFeaturedCardButtonText: '立即申请',
      publicFeaturedCardFallbackDescription: '免费二级域名，可用于合规的个人项目、学习、展示与测试。',
      publicFeaturedShowQueryHelper: true,
      publicFeaturedQueryTitle: '先查再申请',
      publicFeaturedQueryDescription: '如果已经想好前缀，可以先到“可用域名”确认完整二级域名是否可注册。',
      publicFeaturedQueryButtonText: '去查询',
      publicNavigationBadge: 'FLORE DIRECTORY',
      publicNavigationTitle: '站点导航',
      publicNavigationDescription: '按使用场景找到入口，快速进入查询、知识库、账户与规则页面。',
      publicNavigationBackText: '返回首页',
      publicNavigationGroupStart: '开始',
      publicNavigationGroupTools: '工具',
      publicNavigationGroupUser: '用户中心（需登录）',
      publicNavigationGroupRequirements: '要求',
      publicFooterSubtitle: '快速注册并管理您的专属免费域名',
      publicFooterShowPowered: true,
      notFoundText: '页面不存在或已移动',
      defaultLanguage: 'zh',
      showQuota: true,
      showExpiryReminder: true,
    },
    registration: {
      enabled: true,
      autoActivate: true,
      blockTempEmail: false,
      maxAccountsPerIp: 0,
      ipRegisterCooldownMinutes: 0,
      turnstileRegisterEnabled: false,
      defaultStatus: 'auto',
      disabledMessage: '当前暂未开放用户注册',
      turnstileSiteKey: '',
      turnstileSecret: '',
      humanVerificationMode: 'turnstile_fallback',
      captchaBackgroundEnabled: true,
      captchaBackgroundMode: 'random',
      captchaBackgroundImage: '',
      captchaNoiseLinesEnabled: true,
      captchaNoiseLinesMin: 2,
      captchaNoiseLinesMax: 5,
      captchaNoiseLineColorMode: 'random',
      captchaNoiseLineFixedColor: '#64748b',
      captchaCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
      captchaLength: 4,
      emailDomainBlacklist: '',
      emailVerificationEnabled: false,
      emailApiKey: '',
      emailFrom: env.EMAIL_FROM || '',
      emailFromName: env.EMAIL_FROM_NAME || '域名注册中心',
      emailCodeExpiryMinutes: 10,
      emailCodeLength: 6,
      emailCodeCharset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
      emailAllowedEnvironments: '*',
      emailRegistrationSceneEnabled: true,
      emailTestSceneEnabled: true,
      emailFixedRecipients: '',
      emailRegistrationRecipientMode: 'user',
      emailTestRecipientMode: 'manual',
      cloudflareEmailAccountId: env.CF_ACCOUNT_ID || '',
      cloudflareEmailApiToken: '',
      cloudflareAdminRecipient: env.CF_ADMIN_EMAIL || 'admin@flore.top',
      cloudflareVerifiedRecipients: [],
      cloudflareRecipientsSyncedAt: '',
      emailRegistrationSubjectTemplate: '【{{siteName}}】注册验证码',
      emailRegistrationTextTemplate: '您好！\n\n您正在注册 {{siteName}} 账户。\n本次验证码：{{code}}\n验证码将在 {{expiryMinutes}} 分钟后失效。\n\n收件邮箱：{{email}}\n发送环境：{{environment}}\n若非本人操作，请忽略本邮件。',
      emailRegistrationHtmlTemplate: '<div style="font-family:Arial,Microsoft YaHei,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a"><h2>{{siteName}}</h2><p>您正在注册账户，本次验证码为：</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:18px 22px;background:#f1f5f9;border-radius:12px;text-align:center">{{code}}</div><p style="color:#64748b">验证码将在 {{expiryMinutes}} 分钟后失效。</p><p style="color:#94a3b8;font-size:13px">收件邮箱：{{email}}<br>发送环境：{{environment}}<br>若非本人操作，请忽略本邮件。</p></div>',
      emailTestSubjectTemplate: '【{{siteName}}】邮件服务测试',
      emailTestTextTemplate: '邮件服务连接正常。\n\n发送环境：{{environment}}\n测试时间：{{time}}\n收件邮箱：{{email}}',
      emailTestHtmlTemplate: '<div style="font-family:Arial,Microsoft YaHei,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a"><h2>{{siteName}}</h2><p>邮件服务连接正常，这是一封管理员测试邮件。</p><p style="color:#64748b">发送环境：{{environment}}<br>测试时间：{{time}}<br>收件邮箱：{{email}}</p></div>',
      dailyDomainApplyLimit: 0,
      failedRegisterBanThreshold: 0,
      failedRegisterBanMinutes: 0,
      blockVpnProxy: false,
      requireRegistrationKey: false,
    },
    domain: {
      defaultQuota: 3,
      validDays: 365,
      renewWindowDays: 60,
      allowUserDeleteInvalid: true,
      allowDnsEditAfterApproved: true,
      prefixMinLength: 2,
      prefixMaxLength: 36,
      prefixBlacklistText: reserved.join('\n'),
      allowNumericPrefix: true,
      allowUnderscorePrefix: false,
      selfRenewEnabled: true,
      expiryReminderDays: 30,
      expiredDnsCleanupDays: 30,
      allowUserDeleteActive: true,
      allowDomainTransfer: false,
      maxDnsRecordsPerDomain: 20,
      approvalMode: 'manual',
      platformMaxDomains: 9999,
      normalUserQuota: 3,
      normalUserValidDays: 365,
      whitelistUserQuota: 10,
      whitelistUserValidDays: 365,
      lockAfterExpireDays: 0,
      hardDeleteAfterExpireDays: 30,
      blockedPrefixText: reserved.join('\n'),
      adminOnlyPrefixText: 'admin\nroot\nsystem',
    },
    help: defaultHelpSettings(),
    dns: {
      envManaged: true,
      reservedPrefixes: reserved,
      defaultProxied: isEnabled(env.DNS_PROXIED, false),
      allowMxRecords: true,
      cfApiToken: '',
      blockWildcardRecords: true,
      cnameTargetBlacklist: '',
      recordTypePolicies: buildDefaultDnsRecordTypePolicies(allowedTypes),
      suffixes: [{
        label: env.DNS_SUFFIX_LABEL || '',
        suffix,
        suffixAscii: suffix,
        zoneId: env.DNS_ZONE_ID || '',
        allowedTypes: allowedTypes.length ? allowedTypes : ['CNAME'],
        defaultType: (SUPPORTED_DNS_RECORD_TYPES.includes(String(env.DNS_DEFAULT_TYPE || '').toUpperCase() as DnsRecordType)
          ? String(env.DNS_DEFAULT_TYPE).toUpperCase()
          : 'CNAME') as DnsRecordType,
        ttl: clamp(Number(env.DNS_TTL || 1), 1, 86400),
        proxied: isEnabled(env.DNS_PROXIED, false),
        enabled: true,
        allowRegister: true,
        registerOrder: 1,
        cfApiToken: '',
      }],
    },
    blacklist: { prefixes: [], ips: [], emails: [], registration: [], access: [], userIds: [] },
    notification: {
      events: {
        newUser: true,
        newDomain: true,
        domainExpiring: true,
        domainExpiredDelete: true,
        abnormalRegister: true,
        systemErrorEmail: true,
        helpSubmissionEmail: true,
        domainReviewEmail: true,
        dnsAnomalyEmail: true,
      },
      expiryTemplate: '您的域名即将到期，请及时续期。',
      templates: {
        newUser: '新账号 {username} 已注册。',
        newDomain: '用户 {username} 提交了域名 {domain} 申请。',
        domainExpiring: '您的域名 {domain} 将在 {days} 天后到期，请及时续期。',
        domainExpiredDelete: '域名 {domain} 已过期并进入清理流程。',
        abnormalRegister: '检测到异常注册行为：{ip}。',
      },
      userTargets: {},
      adminTargets: {},
      rateLimitPerHour: 60,
    },
    security: {
      adminSessionTimeoutHours: 24,
      adminIpWhitelist: '',
      auditRetentionDays: 7,
      failedLoginLockThreshold: 0,
      failedLoginLockMinutes: 0,
      adminPath: '',
      rolesPermissions: 'super_admin: 全部权限\noperator: 审核域名、查看用户、发送通知',
      auditRecordItems: '登录,注册,域名申请,DNS新增,DNS修改,DNS删除,消息发送,设置保存,黑名单操作',
    },
    automation: {
      enabled: false,
      scanCycleMinutes: 60,
      checkExpiringDomains: true,
      cleanupExpiredDns: true,
      cronExpression: '0 */1 * * *',
      notifyAdminOnFailure: true,
      dnsCleanupProtectionDays: 7,
      taskLogs: [],
    },
  };
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const raw = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

function sanitizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return Array.from(new Set(value.map(x => String(x || '').trim()).filter(Boolean)));
  return Array.from(new Set(String(value || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean)));
}


function sanitizeTemplateMap(value: unknown): Record<string, string> {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const cleanKey = cleanText(key, 80);
    if (cleanKey) out[cleanKey] = cleanText(val, 5000);
  }
  return out;
}

function sanitizeBlacklistRecords(value: unknown): unknown[] {
  const raw = Array.isArray(value) ? value : [];
  return raw.slice(0, 5000).map((item: any) => ({
    value: cleanText(item?.value, 500),
    note: cleanText(item?.note, 500),
    expiresAt: cleanText(item?.expiresAt, 80),
  })).filter((item: any) => item.value);
}


function sanitizeDnsRecordTypes(value: unknown, fallback: DnsRecordType[] = []): DnsRecordType[] {
  const source = Array.isArray(value) ? value : String(value || '').split(/[\s,]+/);
  const result = Array.from(new Set(
    source
      .map(item => String(item || '').trim().toUpperCase())
      .filter((item): item is DnsRecordType => SUPPORTED_DNS_RECORD_TYPES.includes(item as DnsRecordType)),
  ));
  return result.length ? result : [...fallback];
}

function defaultDnsRecordDisplayName(type: DnsRecordType): string {
  const labels: Record<DnsRecordType, string> = {
    A: 'A（IPv4）',
    AAAA: 'AAAA（IPv6）',
    CNAME: 'CNAME（别名）',
    TXT: 'TXT（文本验证）',
    MX: 'MX（邮件）',
    NS: 'NS（名称服务器）',
    CAA: 'CAA（证书授权）',
    SRV: 'SRV（服务定位）',
  };
  return labels[type] || type;
}

function buildDefaultDnsRecordTypePolicies(allowedTypes: DnsRecordType[]): DnsRecordTypePolicy[] {
  const open = new Set(allowedTypes);
  return SUPPORTED_DNS_RECORD_TYPES.map(type => ({
    type,
    displayName: defaultDnsRecordDisplayName(type),
    allowUserAdd: open.has(type),
    note: '',
  }));
}

function sanitizeDnsRecordTypePolicies(
  value: unknown,
  fallback: DnsRecordTypePolicy[],
  legacyAllowMx?: boolean,
): DnsRecordTypePolicy[] {
  const raw = Array.isArray(value) ? value : [];
  const byType = new Map<string, any>();
  for (const item of raw) {
    const type = String((item as any)?.type || '').trim().toUpperCase();
    if (SUPPORTED_DNS_RECORD_TYPES.includes(type as DnsRecordType)) byType.set(type, item);
  }
  const fallbackByType = new Map((fallback || []).map(item => [item.type, item]));
  return SUPPORTED_DNS_RECORD_TYPES.map(type => {
    const item = byType.get(type);
    const base = fallbackByType.get(type);
    const defaultOpen = type === 'MX' && typeof legacyAllowMx === 'boolean' ? legacyAllowMx : Boolean(base?.allowUserAdd);
    return {
      type,
      displayName: cleanText(item?.displayName, 80) || base?.displayName || defaultDnsRecordDisplayName(type),
      allowUserAdd: item ? asBoolean(item.allowUserAdd, defaultOpen) : defaultOpen,
      note: cleanText(item?.note, 300),
    };
  });
}

function dnsRecordTypePolicy(settings: AppSettings, type: DnsRecordType): DnsRecordTypePolicy | undefined {
  return settings.dns.recordTypePolicies.find(policy => policy.type === type);
}

function assertUserDnsRecordTypeOpen(settings: AppSettings, type: DnsRecordType): void {
  const policy = dnsRecordTypePolicy(settings, type);
  if (!policy || policy.allowUserAdd === false) {
    throw new HttpError(403, 'DNS_TYPE_CLOSED', `管理员暂未开放用户添加 ${policy?.displayName || type} 记录`);
  }
}

function sanitizeDnsSuffixes(value: unknown, fallback: AppSettings['dns']['suffixes']): AppSettings['dns']['suffixes'] {
  const raw = Array.isArray(value) ? value : [];
  const findExisting = (suffix: string, zoneId: string) => (fallback || []).find(item =>
    (suffix && (item.suffixAscii === suffix || item.suffix === suffix)) || (zoneId && item.zoneId === zoneId)
  );
  const items = raw.map((x: any, index: number) => {
    try {
      const suffix = normalizeSuffix(String(x?.suffix || ''));
      const zoneId = cleanText(x?.zoneId, 120);
      const existing = findExisting(suffix, zoneId);
      const allowedTypes = Array.from(new Set((Array.isArray(x?.allowedTypes) ? x.allowedTypes : String(x?.allowedTypes || 'A,AAAA,CNAME,TXT,MX,NS').split(','))
        .map((t: any) => String(t).trim().toUpperCase())
        .filter((t: string) => SUPPORTED_DNS_RECORD_TYPES.includes(t as DnsRecordType))));
      const defaultTypeRaw = String(x?.defaultType || allowedTypes[0] || 'CNAME').toUpperCase();
      const defaultType = (allowedTypes.includes(defaultTypeRaw) ? defaultTypeRaw : (allowedTypes[0] || 'CNAME')) as DnsRecordType;
      const incomingToken = cleanText(x?.cfApiToken, 2000);
      return {
        label: cleanText(x?.label, 80),
        suffix,
        suffixAscii: suffix,
        zoneId,
        allowedTypes: allowedTypes.length ? allowedTypes : ['CNAME'],
        defaultType,
        ttl: clamp(Number(x?.ttl || 1), 1, 86400),
        proxied: asBoolean(x?.proxied, false),
        enabled: asBoolean(x?.enabled, true),
        allowRegister: asBoolean(x?.allowRegister, true),
        registerOrder: clamp(Number(x?.registerOrder || index + 1), 1, 999999),
        cfApiToken: incomingToken || existing?.cfApiToken || '',
      };
    } catch { return null; }
  }).filter(Boolean) as AppSettings['dns']['suffixes'];
  const seen = new Set<string>();
  const deduped = items.filter(item => {
    const key = item.suffixAscii || item.suffix;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped.length ? deduped : fallback;
}

function sanitizeNotificationEvents(value: unknown): Record<string, boolean> {
  const raw: any = value && typeof value === 'object' ? value : {};
  return {
    newUser: asBoolean(raw.newUser, true),
    newDomain: asBoolean(raw.newDomain, true),
    domainExpiring: asBoolean(raw.domainExpiring, true),
    domainExpiredDelete: asBoolean(raw.domainExpiredDelete, true),
    abnormalRegister: asBoolean(raw.abnormalRegister, true),
    systemErrorEmail: asBoolean(raw.systemErrorEmail, true),
    helpSubmissionEmail: asBoolean(raw.helpSubmissionEmail, true),
    domainReviewEmail: asBoolean(raw.domainReviewEmail, true),
    dnsAnomalyEmail: asBoolean(raw.dnsAnomalyEmail, true),
  };
}

function listMatches(value: string, list: string[] = []): boolean {
  const target = String(value || '').toLowerCase();
  return list.some(raw => {
    const item = String(raw || '').trim().toLowerCase();
    if (!item) return false;
    if (item.includes('*')) {
      const re = new RegExp('^' + item.split('*').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      return re.test(target);
    }
    return target === item || target.includes(item);
  });
}

function prefixMatchesRule(prefix: string, rules: string[] = []): boolean {
  return rules.some(raw => {
    const item = String(raw || '').trim();
    if (!item) return false;
    try { return new RegExp(item, 'i').test(prefix); } catch { return prefix.toLowerCase().includes(item.toLowerCase()); }
  });
}

function isTempEmailDomain(email: string): boolean {
  const domain = String(email || '').split('@')[1]?.toLowerCase() || '';
  if (!domain) return false;
  const tempDomains = ['mailinator.com','10minutemail.com','guerrillamail.com','tempmail.com','temp-mail.org','yopmail.com','dispostable.com','trashmail.com','sharklasers.com','getnada.com'];
  return tempDomains.includes(domain);
}



function publicRegistrationSettings(registration: AppSettings['registration']): Record<string, unknown> {
  const safe: Record<string, unknown> = { ...registration };
  delete safe.turnstileSecret;
  delete safe.captchaBackgroundImage;
  delete safe.emailApiKey;
  delete safe.emailAllowedEnvironments;
  delete safe.emailRegistrationSceneEnabled;
  delete safe.emailTestSceneEnabled;
  delete safe.emailFixedRecipients;
  delete safe.emailRegistrationRecipientMode;
  delete safe.emailTestRecipientMode;
  delete safe.cloudflareEmailAccountId;
  delete safe.cloudflareEmailApiToken;
  delete safe.cloudflareAdminRecipient;
  delete safe.cloudflareVerifiedRecipients;
  delete safe.cloudflareRecipientsSyncedAt;
  delete safe.emailRegistrationSubjectTemplate;
  delete safe.emailRegistrationTextTemplate;
  delete safe.emailRegistrationHtmlTemplate;
  delete safe.emailTestSubjectTemplate;
  delete safe.emailTestTextTemplate;
  delete safe.emailTestHtmlTemplate;
  return safe;
}

function uniqueCharacters(value: unknown, fallback: string, maxLength = 160): string {
  const source = Array.from(String(value || '').replace(/\s/g, ''));
  const unique = Array.from(new Set(source)).join('').slice(0, maxLength);
  return unique.length >= 2 ? unique : fallback;
}

function sanitizeCaptchaCharset(value: unknown): string {
  return uniqueCharacters(value, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 120);
}

function sanitizeEmailCodeCharset(value: unknown): string {
  return uniqueCharacters(value, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 160);
}

function sanitizeCaptchaBackgroundImage(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw)) return '';
  return raw.length <= 700000 ? raw : '';
}

function randomCodeFromCharset(charset: string, length: number, min = 3, max = 12): string {
  const chars = Array.from(uniqueCharacters(charset, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'));
  const size = clamp(Number(length || min), min, max);
  const bytes = new Uint32Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(value => chars[value % chars.length]).join('');
}

function randomBetween(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return low + (bytes[0] % Math.max(1, high - low + 1));
}

function captchaColor(): string {
  const hue = randomBetween(0, 359);
  const saturation = randomBetween(48, 82);
  const lightness = randomBetween(28, 55);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function escapeSvg(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char] || char));
}

function buildCaptchaSvg(settings: AppSettings, code: string): string {
  const registration = settings.registration;
  const width = 260;
  const height = 92;
  const backgroundEnabled = registration.captchaBackgroundEnabled !== false;
  const uploadedBackground = backgroundEnabled && registration.captchaBackgroundMode === 'upload' ? sanitizeCaptchaBackgroundImage(registration.captchaBackgroundImage) : '';
  const background = uploadedBackground
    ? `<image href="${escapeSvg(uploadedBackground)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" opacity="0.72"/>`
    : backgroundEnabled
      ? Array.from({ length: 14 }).map(() => `<circle cx="${randomBetween(0,width)}" cy="${randomBetween(0,height)}" r="${randomBetween(3,18)}" fill="${captchaColor()}" opacity="0.${randomBetween(8,22)}"/>`).join('')
      : `<rect width="${width}" height="${height}" fill="#f8fafc"/>`;
  const minLines = clamp(Number(registration.captchaNoiseLinesMin ?? 2), 0, 20);
  const maxLines = clamp(Number(registration.captchaNoiseLinesMax ?? 5), 0, 20);
  const lineCount = registration.captchaNoiseLinesEnabled === false ? 0 : randomBetween(minLines, maxLines);
  const fixedLineColor = normalizeHexColor(registration.captchaNoiseLineFixedColor, '#64748b');
  const lines = Array.from({ length: lineCount }).map(() => {
    const color = registration.captchaNoiseLineColorMode === 'fixed' ? fixedLineColor : captchaColor();
    return `<path d="M ${randomBetween(-20,40)} ${randomBetween(10,height-10)} C ${randomBetween(50,110)} ${randomBetween(-20,height+20)}, ${randomBetween(120,210)} ${randomBetween(-20,height+20)}, ${randomBetween(width-30,width+20)} ${randomBetween(8,height-8)}" fill="none" stroke="${color}" stroke-width="${randomBetween(2,5)}" opacity="0.${randomBetween(55,90)}" stroke-linecap="round"/>`;
  }).join('');
  const chars = Array.from(code);
  const step = width / Math.max(1, chars.length);
  const glyphs = chars.map((character, index) => {
    const x = Math.round(step * index + step * 0.48 + randomBetween(-5,5));
    const y = randomBetween(58,75);
    const rotate = randomBetween(-24,24);
    const size = randomBetween(43,59);
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="${size}" font-weight="900" fill="${captchaColor()}" transform="rotate(${rotate} ${x} ${y})">${escapeSvg(character)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="图形验证码"><rect width="${width}" height="${height}" rx="12" fill="#f8fafc"/>${background}${glyphs}${lines}<rect x="1" y="1" width="${width-2}" height="${height-2}" rx="11" fill="none" stroke="#cbd5e1"/></svg>`;
}

function captchaScene(value: unknown): 'login' | 'register' | 'apply' | 'admin_create' {
  const scene = String(value || 'login');
  return ['login','register','apply','admin_create'].includes(scene) ? scene as any : 'login';
}

async function createImageCaptchaChallenge(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'captcha-challenge', 80, 600);
  const body = await readJson<Record<string, unknown>>(request).catch(() => ({} as Record<string, unknown>));
  const settings = await loadSettings(env);
  const scene = captchaScene(body.scene);
  const charset = sanitizeCaptchaCharset(settings.registration.captchaCharset);
  const length = clamp(Number(settings.registration.captchaLength || 4), 3, 8);
  const code = randomCodeFromCharset(charset, length, 3, 8);
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  // Image captcha answers are intentionally case-sensitive. A and a are different characters.
  const answerHash = await sha256(`${id}|${scene}|${clientIp(request)}|${code}`);
  await env.APP_KV.put(`captcha:${id}`, JSON.stringify({ answerHash, scene, expiresAt }), { expirationTtl: 360 });
  return ok({ challengeId: id, imageSvg: buildCaptchaSvg(settings, code), expiresInSeconds: 300, length });
}

async function verifyImageCaptcha(env: Env, request: Request, rawId: unknown, rawAnswer: unknown, scene: string): Promise<void> {
  const id = cleanText(rawId, 100);
  const answer = String(rawAnswer || '').trim();
  if (!id || !answer) throw new HttpError(400, 'CAPTCHA_REQUIRED', '请输入图形验证码');
  const key = `captcha:${id}`;
  const raw = await env.APP_KV.get(key);
  await env.APP_KV.delete(key).catch(() => undefined);
  if (!raw) throw new HttpError(403, 'CAPTCHA_EXPIRED', '图形验证码已过期，请刷新后重试');
  let record: { answerHash?: string; scene?: string; expiresAt?: number } = {};
  try { record = JSON.parse(raw); } catch {}
  if (record.scene !== scene || Number(record.expiresAt || 0) < Date.now()) throw new HttpError(403, 'CAPTCHA_EXPIRED', '图形验证码已过期，请刷新后重试');
  const candidate = await sha256(`${id}|${scene}|${clientIp(request)}|${answer}`);
  if (candidate !== record.answerHash) throw new HttpError(403, 'CAPTCHA_INVALID', '图形验证码不正确，请重新输入');
}

function humanVerificationMode(settings: AppSettings): 'image' | 'turnstile' | 'turnstile_fallback' {
  const mode = String(settings.registration.humanVerificationMode || 'turnstile_fallback');
  return ['image','turnstile','turnstile_fallback'].includes(mode) ? mode as any : 'turnstile_fallback';
}

async function verifyHumanChallenge(env: Env, request: Request, body: Record<string, unknown>, scene: string, expectedAction: string): Promise<void> {
  const settings = await loadSettings(env);
  const mode = humanVerificationMode(settings);
  if (mode === 'image') {
    await verifyImageCaptcha(env, request, body.captchaChallengeId, body.captchaAnswer, scene);
    return;
  }
  if (mode === 'turnstile') {
    await verifyTurnstile(env, request, body.turnstileToken, expectedAction);
    return;
  }
  if (String(body.captchaChallengeId || '').trim() || String(body.captchaAnswer || '').trim()) {
    await verifyImageCaptcha(env, request, body.captchaChallengeId, body.captchaAnswer, scene);
    return;
  }
  await verifyTurnstile(env, request, body.turnstileToken, expectedAction);
}

function escapeEmailHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[char] || char));
}

function resolveEmailRuntimeEnvironment(env: Env): string {
  return cleanText(env.APP_ENVIRONMENT || env.ENVIRONMENT || 'production', 80).toLowerCase() || 'production';
}

function sanitizeEmailRecipientList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : String(value || '').split(/[\n,;]+/);
  return Array.from(new Set(items.map(item => String(item || '').trim().toLowerCase()).filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item)))).slice(0, 50);
}

function assertEmailEnvironmentAllowed(env: Env, settings: AppSettings): string {
  const runtime = resolveEmailRuntimeEnvironment(env);
  const allowed = String(settings.registration.emailAllowedEnvironments || '*')
    .split(/[\n,;]+/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length || allowed.includes('*') || allowed.includes('all') || allowed.includes(runtime)) return runtime;
  throw new HttpError(409, 'EMAIL_ENVIRONMENT_BLOCKED', `当前运行环境 ${runtime} 未被允许发送邮件`);
}

function renderEmailTemplate(template: unknown, context: Record<string, unknown>, html = false): string {
  return String(template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = String(context[key] ?? '');
    return html ? escapeEmailHtml(value) : value;
  });
}

function plainTextToEmailHtml(text: string): string {
  return `<div style="font-family:Arial,'Microsoft YaHei',sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a;white-space:normal">${escapeEmailHtml(text).replace(/\n/g, '<br>')}</div>`;
}


type AdminCloudflareEmailScene = 'admin_test' | 'system_error' | 'help_submission' | 'domain_review' | 'dns_anomaly';

function resolveCloudflareEmailAccountId(env: Env, settings: AppSettings): string {
  return cleanText(env.CF_ACCOUNT_ID || settings.registration.cloudflareEmailAccountId || '', 64);
}

function resolveCloudflareEmailRoutingToken(env: Env, settings: AppSettings): string {
  return String(env.CF_EMAIL_ROUTING_API_TOKEN || settings.registration.cloudflareEmailApiToken || '').trim();
}

function resolveCloudflareAdminEmail(env: Env, settings: AppSettings): string {
  const verified = sanitizeEmailRecipientList(settings.registration.cloudflareVerifiedRecipients || []);
  const candidates = [
    settings.registration.cloudflareAdminRecipient,
    env.CF_ADMIN_EMAIL,
    verified[0],
    'admin@flore.top',
  ];
  for (const candidate of candidates) {
    const email = String(candidate || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (!verified.length || verified.includes(email))) return email;
  }
  return 'admin@flore.top';
}

async function fetchCloudflareVerifiedDestinationAddresses(env: Env, settings: AppSettings): Promise<string[]> {
  const accountId = resolveCloudflareEmailAccountId(env, settings);
  const token = resolveCloudflareEmailRoutingToken(env, settings);
  if (!accountId) throw new HttpError(409, 'CF_EMAIL_ACCOUNT_ID_MISSING', '请先填写 Cloudflare Account ID，或配置 Worker 变量 CF_ACCOUNT_ID');
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new HttpError(400, 'CF_EMAIL_ACCOUNT_ID_INVALID', 'Cloudflare Account ID 格式不正确，应为 32 位字符');
  if (!token) throw new HttpError(409, 'CF_EMAIL_ROUTING_TOKEN_MISSING', '请配置只读的 Email Routing API Token，权限至少包含 Email Routing Addresses Read');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/email/routing/addresses?verified=true&per_page=50`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const detail = payload?.errors?.[0]?.message || payload?.message || `HTTP ${response.status}`;
    throw new HttpError(502, 'CF_EMAIL_ADDRESS_SYNC_FAILED', `同步 Cloudflare 已验证邮箱失败：${String(detail).slice(0, 500)}`);
  }
  return sanitizeEmailRecipientList((Array.isArray(payload?.result) ? payload.result : []).filter((item: any) => item?.verified).map((item: any) => item?.email));
}

async function adminSyncCloudflareEmailAddresses(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const addresses = await fetchCloudflareVerifiedDestinationAddresses(env, settings);
  if (!addresses.length) throw new HttpError(404, 'CF_EMAIL_NO_VERIFIED_ADDRESS', 'Cloudflare 账户中没有可用的已验证目标邮箱');
  settings.registration.cloudflareVerifiedRecipients = addresses;
  settings.registration.cloudflareRecipientsSyncedAt = new Date().toISOString();
  if (!addresses.includes(String(settings.registration.cloudflareAdminRecipient || '').toLowerCase())) {
    settings.registration.cloudflareAdminRecipient = addresses[0];
  }
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, 'admin.cloudflare_email_addresses_sync', 'setting', 'cloudflare_email', {
    count: addresses.length,
    selectedHash: await sha256(String(settings.registration.cloudflareAdminRecipient || '').toLowerCase()),
  });
  return ok({
    addresses,
    selected: resolveCloudflareAdminEmail(env, settings),
    syncedAt: settings.registration.cloudflareRecipientsSyncedAt,
    provider: 'cloudflare-seb',
    message: `已同步 ${addresses.length} 个 Cloudflare 已验证邮箱`,
  });
}

type WorkerVariableKind = 'plain_text' | 'json' | 'secret_text';

type WorkerVariableDefinition = {
  label: string;
  purpose: string;
  addMethod: string;
  suggestedType?: WorkerVariableKind;
};

type WorkerVariableItem = {
  name: string;
  type: WorkerVariableKind;
  label: string;
  purpose: string;
  addMethod: string;
  sensitive: boolean;
  configured: boolean;
  value: string;
  source: string;
  protected: boolean;
};

const RUNTIME_ONLY_BINDING_NAMES = new Set(['DB', 'APP_KV', 'ASSETS', 'SEB']);
const WORKER_VARIABLE_BINDING_TYPES = new Set(['plain_text', 'json', 'secret_text']);
const PROTECTED_WORKER_VARIABLE_NAMES = new Set(['CF_WORKERS_API_TOKEN']);
const SECRET_VARIABLE_PATTERN = /(TOKEN|SECRET|KEY|PASSWORD|PRIVATE|SALT|BOOTSTRAP|API_KEY)/i;

const WORKER_VARIABLE_DEFINITIONS: Record<string, WorkerVariableDefinition> = {
  BOOTSTRAP_ADMIN_TOKEN: {
    label: '初始化管理员令牌',
    purpose: '系统首次初始化管理员时使用；初始化完成后建议删除，避免别人拿到令牌后重新创建管理员。',
    addMethod: '类型选“密钥”；值填写一次性强随机字符串。初始化管理员完成后回到 Cloudflare 变量页面删除。',
    suggestedType: 'secret_text',
  },
  CF_ACCOUNT_ID: {
    label: 'Cloudflare 账户 ID',
    purpose: '用于调用 Cloudflare 账户级 API，例如同步已验证邮箱、管理 Worker 变量。',
    addMethod: '类型选“纯文本”；值从 Cloudflare 账户首页或 Workers 页面复制 Account ID。',
    suggestedType: 'plain_text',
  },
  CF_API_TOKEN: {
    label: 'Cloudflare DNS API Token',
    purpose: '写入、更新和删除用户二级域名 DNS 记录。',
    addMethod: '类型选“密钥”；Token 至少需要对应 Zone 的 DNS Edit 权限，不要使用 Global API Key。',
    suggestedType: 'secret_text',
  },
  CF_EMAIL_ROUTING_API_TOKEN: {
    label: 'Cloudflare 邮箱地址读取 Token',
    purpose: '同步 Cloudflare Email Routing 中已验证的收件邮箱列表。',
    addMethod: '类型选“密钥”；权限选择账户级 Email Routing Addresses Read。',
    suggestedType: 'secret_text',
  },
  CF_WORKERS_API_TOKEN: {
    label: 'Worker 变量管理 Token',
    purpose: '允许本系统调用 Cloudflare API 添加、修改、删除当前 Worker 的变量和密钥。',
    addMethod: '类型选“密钥”；权限选择账户级 Workers Scripts Edit/Write。这个变量本身只能在 Cloudflare 控制台维护，网站内不允许修改。',
    suggestedType: 'secret_text',
  },
  CF_WORKER_SCRIPT_NAME: {
    label: 'Worker 脚本名称',
    purpose: '当 Worker 名称不是 storage 时，用它指定 Cloudflare API 要管理的脚本名称。',
    addMethod: '类型选“纯文本”；值填写 Cloudflare Workers 列表中的脚本名称，例如 storage。',
    suggestedType: 'plain_text',
  },
  CONFIG_MODE: {
    label: '配置读取模式',
    purpose: '标记当前配置来源；常用于区分 env、kv 或其他配置策略。',
    addMethod: '类型选“纯文本”；一般填写 env。',
    suggestedType: 'plain_text',
  },
  DNS_ALLOWED_TYPES: {
    label: '全局允许 DNS 类型',
    purpose: '控制用户能创建哪些 DNS 记录类型。多根域名单独设置时优先生效。',
    addMethod: '类型选“纯文本”；值用英文逗号分隔，例如 CNAME,A,AAAA,TXT,MX,NS。',
    suggestedType: 'plain_text',
  },
  DNS_DEFAULT_TYPE: {
    label: '默认 DNS 类型',
    purpose: '用户新增解析时默认选中的记录类型。',
    addMethod: '类型选“纯文本”；常用值为 CNAME。',
    suggestedType: 'plain_text',
  },
  DNS_PROXIED: {
    label: '默认代理状态',
    purpose: '控制新建 A/AAAA/CNAME 记录是否默认开启 Cloudflare 代理。',
    addMethod: '类型选“纯文本”；填写 true 或 false。',
    suggestedType: 'plain_text',
  },
  DNS_RESERVED_PREFIXES: {
    label: '保留前缀',
    purpose: '禁止用户注册系统、邮箱、常用服务等敏感前缀。',
    addMethod: '类型选“纯文本”；用英文逗号分隔，例如 api,admin,mail,smtp。',
    suggestedType: 'plain_text',
  },
  DNS_SUFFIX: {
    label: '默认根域名',
    purpose: '单根域名模式下的默认后缀；多根域名设置启用后仅作为兼容配置。',
    addMethod: '类型选“纯文本”；填写根域名，例如 flore.top。',
    suggestedType: 'plain_text',
  },
  DNS_SUFFIX_LABEL: {
    label: '默认根域名显示名',
    purpose: '注册页展示根域名时的描述文字。',
    addMethod: '类型选“纯文本”；可填写“免费一级域名”等显示名称，也可留空不显示。',
    suggestedType: 'plain_text',
  },
  DNS_TTL: {
    label: '默认 TTL',
    purpose: '新建 DNS 记录时的 TTL 默认值。Cloudflare 中 1 通常表示 Auto。',
    addMethod: '类型选“纯文本”；填写数字，例如 1。',
    suggestedType: 'plain_text',
  },
  DNS_ZONE_ID: {
    label: '默认 Zone ID',
    purpose: '单根域名模式下写入 Cloudflare DNS 的 Zone ID。多根域名设置中每个域名可单独配置。',
    addMethod: '类型选“纯文本”；从 Cloudflare 对应域名概览页复制 Zone ID。',
    suggestedType: 'plain_text',
  },
  EMAIL_FROM: {
    label: '邮件发件地址',
    purpose: '系统邮件显示的 From 地址。Cloudflare SEB 管理员邮件和 Resend 注册验证码都会读取。',
    addMethod: '类型选“纯文本”；填写已验证域名下的邮箱，例如 admin@flore.top。',
    suggestedType: 'plain_text',
  },
  EMAIL_FROM_NAME: {
    label: '邮件发件名称',
    purpose: '收件箱中显示的发件人名称。',
    addMethod: '类型选“纯文本”；填写品牌名，例如 FLORE域名注册中心。',
    suggestedType: 'plain_text',
  },
  CF_ADMIN_EMAIL: {
    label: '管理员通知邮箱',
    purpose: 'Cloudflare 免费邮件通知的默认收件邮箱。',
    addMethod: '类型选“纯文本”；填写 Cloudflare Email Routing 中已验证的邮箱。',
    suggestedType: 'plain_text',
  },
  RESEND_API_KEY: {
    label: 'Resend API Key',
    purpose: '向任意用户邮箱发送注册验证码。管理员固定通知不依赖它。',
    addMethod: '类型选“密钥”；在 Resend 后台创建 Sending access API Key 后粘贴完整 re_ 开头密钥。',
    suggestedType: 'secret_text',
  },
  APP_ENVIRONMENT: {
    label: '运行环境',
    purpose: '用于邮件模板、环境限制和排查日志中标识当前环境。',
    addMethod: '类型选“纯文本”；常用值 production、preview、staging。',
    suggestedType: 'plain_text',
  },
  ENVIRONMENT: {
    label: '兼容运行环境',
    purpose: '兼容旧版本环境名称，优先建议使用 APP_ENVIRONMENT。',
    addMethod: '类型选“纯文本”；常用值 production。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_SITE_KEY: {
    label: 'Turnstile Site Key',
    purpose: '前端显示 Turnstile 组件用的公开站点密钥。',
    addMethod: '类型选“纯文本”；从 Cloudflare Turnstile 小组件页面复制 Site Key。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_SECRET: {
    label: 'Turnstile Secret',
    purpose: '后端校验 Turnstile token 的密钥。',
    addMethod: '类型选“密钥”；从 Cloudflare Turnstile 小组件页面复制 Secret Key。',
    suggestedType: 'secret_text',
  },
  TURNSTILE_EXPECTED_HOSTNAME: {
    label: 'Turnstile 允许域名',
    purpose: '限制 Turnstile 校验必须来自指定站点域名。',
    addMethod: '类型选“纯文本”；填写正式访问域名，例如 storage.flore.top。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ACTION_APPLY: {
    label: '域名申请 Turnstile Action',
    purpose: '校验域名申请场景的 Turnstile action。',
    addMethod: '类型选“纯文本”；默认可填写 domain_apply。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ACTION_LOGIN: {
    label: '登录 Turnstile Action',
    purpose: '校验登录场景的 Turnstile action。',
    addMethod: '类型选“纯文本”；默认可填写 login。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ACTION_REGISTER: {
    label: '注册 Turnstile Action',
    purpose: '校验注册场景的 Turnstile action。',
    addMethod: '类型选“纯文本”；默认可填写 register。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ENABLE_APPLY: {
    label: '域名申请 Turnstile 开关',
    purpose: '控制域名申请场景是否启用 Turnstile。',
    addMethod: '类型选“纯文本”；填写 true 或 false。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ENABLE_LOGIN: {
    label: '登录 Turnstile 开关',
    purpose: '控制登录场景是否启用 Turnstile。',
    addMethod: '类型选“纯文本”；填写 true 或 false。',
    suggestedType: 'plain_text',
  },
  TURNSTILE_ENABLE_REGISTER: {
    label: '注册 Turnstile 开关',
    purpose: '控制注册场景是否启用 Turnstile。',
    addMethod: '类型选“纯文本”；填写 true 或 false。',
    suggestedType: 'plain_text',
  },
};

function managedWorkerScriptName(env: Env): string {
  const value = cleanText(env.CF_WORKER_SCRIPT_NAME || 'storage', 80).replace(/[^a-zA-Z0-9_-]/g, '');
  return value || 'storage';
}

function resolveWorkerVariableDefinition(name: string, type?: WorkerVariableKind): WorkerVariableDefinition {
  const known = WORKER_VARIABLE_DEFINITIONS[name];
  if (known) return known;
  const secretLike = type === 'secret_text' || SECRET_VARIABLE_PATTERN.test(name);
  return {
    label: name,
    purpose: secretLike ? '自定义密钥变量，当前代码或后续功能可能通过 env 读取它。' : '自定义文本变量，当前代码或后续功能可能通过 env 读取它。',
    addMethod: secretLike ? '类型建议选择“密钥”；填写后代码可通过 env.' + name + ' 读取。' : '类型建议选择“纯文本”；填写后代码可通过 env.' + name + ' 读取。',
    suggestedType: secretLike ? 'secret_text' : 'plain_text',
  };
}

function isSensitiveWorkerVariableName(name: string, type?: WorkerVariableKind): boolean {
  return type === 'secret_text' || SECRET_VARIABLE_PATTERN.test(name);
}

function isValidWorkerVariableName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name);
}

function normalizeWorkerVariableName(rawName: unknown): string {
  const name = String(rawName || '').trim();
  if (!isValidWorkerVariableName(name)) throw new HttpError(400, 'WORKER_VARIABLE_NAME_INVALID', '变量名称只能使用字母、数字和下划线，并且不能以数字开头');
  return name;
}

function normalizeWorkerVariableType(rawType: unknown, name: string): WorkerVariableKind {
  const value = String(rawType || '').trim().toLowerCase();
  if (value === 'plain_text' || value === 'text') return 'plain_text';
  if (value === 'json') return 'json';
  if (value === 'secret_text' || value === 'secret') return 'secret_text';
  return isSensitiveWorkerVariableName(name) ? 'secret_text' : 'plain_text';
}

function formatJsonWorkerVariableValue(rawValue: unknown): string {
  const value = String(rawValue ?? '').trim();
  if (!value) throw new HttpError(400, 'WORKER_VARIABLE_VALUE_REQUIRED', '请输入变量值');
  if (value.length > 20000) throw new HttpError(400, 'WORKER_VARIABLE_VALUE_TOO_LONG', 'JSON 变量内容过长，请控制在 20000 字符以内');
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    throw new HttpError(400, 'WORKER_VARIABLE_JSON_INVALID', 'JSON 变量内容不是有效 JSON，请检查引号、逗号、括号和布尔值格式');
  }
}

function parseJsonWorkerVariableValue(rawValue: unknown): unknown {
  return JSON.parse(formatJsonWorkerVariableValue(rawValue));
}

function validateWorkerVariableValue(name: string, rawValue: unknown, type: WorkerVariableKind = 'plain_text'): string {
  if (type === 'json') return formatJsonWorkerVariableValue(rawValue);
  const value = String(rawValue ?? '').trim();
  if (!value) throw new HttpError(400, 'WORKER_VARIABLE_VALUE_REQUIRED', '请输入变量值');
  if (value.length > 5000) throw new HttpError(400, 'WORKER_VARIABLE_VALUE_TOO_LONG', '变量内容过长，请控制在 5000 字符以内');
  if (['EMAIL_FROM','CF_ADMIN_EMAIL'].includes(name) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new HttpError(400, 'WORKER_VARIABLE_EMAIL_INVALID', `${name} 邮箱格式不正确`);
  }
  if (name === 'CF_ACCOUNT_ID' && !/^[a-f0-9]{32}$/i.test(value)) {
    throw new HttpError(400, 'WORKER_VARIABLE_ACCOUNT_ID_INVALID', 'Cloudflare Account ID 应为 32 位字符');
  }
  if ((name === 'APP_ENVIRONMENT' || name === 'ENVIRONMENT') && !/^[a-zA-Z0-9._-]{1,80}$/.test(value)) {
    throw new HttpError(400, 'WORKER_VARIABLE_ENV_INVALID', '运行环境只能使用字母、数字、点、下划线或短横线');
  }
  return value;
}

function buildWorkerVariableItem(name: string, type: WorkerVariableKind, value: string, source: string): WorkerVariableItem {
  const definition = resolveWorkerVariableDefinition(name, type);
  const sensitive = type === 'json' ? false : isSensitiveWorkerVariableName(name, type);
  return {
    name,
    type,
    label: definition.label,
    purpose: definition.purpose,
    addMethod: definition.addMethod,
    sensitive,
    configured: type === 'secret_text' ? true : Boolean(value),
    value: sensitive ? '' : value,
    source,
    protected: PROTECTED_WORKER_VARIABLE_NAMES.has(name),
  };
}

function mergeWorkerVariableItems(items: WorkerVariableItem[]): WorkerVariableItem[] {
  const map = new Map<string, WorkerVariableItem>();
  for (const item of items) {
    const existing = map.get(item.name);
    if (!existing || existing.source === 'runtime-fallback' || item.source.includes('cloudflare')) {
      map.set(item.name, item);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function runtimeWorkerVariables(env: Env): WorkerVariableItem[] {
  return Object.keys(env as unknown as Record<string, unknown>)
    .filter(name => !RUNTIME_ONLY_BINDING_NAMES.has(name))
    .filter(name => isValidWorkerVariableName(name))
    .map(name => {
      const raw = (env as unknown as Record<string, unknown>)[name];
      const isObjectValue = raw !== null && typeof raw === 'object';
      const type: WorkerVariableKind = isObjectValue ? 'json' : (isSensitiveWorkerVariableName(name) ? 'secret_text' : 'plain_text');
      const value = isObjectValue ? JSON.stringify(raw, null, 2) : String(raw ?? '');
      return buildWorkerVariableItem(name, type, value, 'runtime-fallback');
    });
}

async function cloudflareWorkersApi(request: Request, env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const settings = await loadSettings(env);
  const token = String(env.CF_WORKERS_API_TOKEN || '').trim();
  if (!token) throw new HttpError(409, 'CF_WORKERS_API_TOKEN_MISSING', '请先在 Cloudflare Worker 中添加 Secret：CF_WORKERS_API_TOKEN，权限为 Workers Scripts Write');
  const accountId = resolveCloudflareEmailAccountId(env, settings);
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new HttpError(409, 'CF_WORKERS_ACCOUNT_ID_MISSING', '请先配置有效的 CF_ACCOUNT_ID');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isMultipart && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}${path}`, {
    ...init,
    headers,
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const detail = payload?.errors?.[0]?.message || payload?.message || `HTTP ${response.status}`;
    throw new HttpError(502, 'CLOUDFLARE_WORKERS_API_FAILED', String(detail).slice(0, 500));
  }
  return payload?.result ?? payload;
}

async function fetchWorkerScriptSettings(request: Request, env: Env): Promise<any> {
  const scriptName = managedWorkerScriptName(env);
  // `/script-settings` only returns script-level options such as observability and tail consumers.
  // Environment bindings (plain_text/json/secret_text) are exposed by `/settings`.
  return cloudflareWorkersApi(request, env, `/workers/scripts/${encodeURIComponent(scriptName)}/settings`);
}

async function patchWorkerScriptBindings(request: Request, env: Env, bindings: any[]): Promise<void> {
  const scriptName = managedWorkerScriptName(env);
  // Cloudflare's /settings endpoint requires multipart/form-data. The `settings`
  // part carries the complete binding list; the browser/Worker runtime supplies
  // the multipart boundary automatically, so Content-Type must not be set by hand.
  const form = new FormData();
  form.append(
    'settings',
    new Blob([JSON.stringify({ bindings })], { type: 'application/json' }),
    'settings.json',
  );
  await cloudflareWorkersApi(request, env, `/workers/scripts/${encodeURIComponent(scriptName)}/settings`, {
    method: 'PATCH',
    body: form,
  });
}

async function fetchWorkerSecretBindings(request: Request, env: Env): Promise<any[]> {
  const scriptName = managedWorkerScriptName(env);
  const result = await cloudflareWorkersApi(request, env, `/workers/scripts/${encodeURIComponent(scriptName)}/secrets`);
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.secrets)) return result.secrets;
  return [];
}

function variableItemsFromScriptSettings(settings: any): WorkerVariableItem[] {
  const bindings = Array.isArray(settings?.bindings) ? settings.bindings : [];
  return bindings
    .filter((binding: any) => WORKER_VARIABLE_BINDING_TYPES.has(String(binding?.type || '')))
    .filter((binding: any) => isValidWorkerVariableName(String(binding?.name || '')))
    .map((binding: any) => {
      const name = String(binding.name);
      const type: WorkerVariableKind = String(binding.type) === 'secret_text' ? 'secret_text' : (String(binding.type) === 'json' ? 'json' : 'plain_text');
      const value = type === 'plain_text' ? String(binding.text ?? '') : (type === 'json' ? JSON.stringify(binding.json ?? null, null, 2) : '');
      return buildWorkerVariableItem(name, type, value, 'cloudflare-worker-settings');
    });
}

function variableItemsFromSecretList(secrets: any[]): WorkerVariableItem[] {
  return secrets
    .filter((secret: any) => isValidWorkerVariableName(String(secret?.name || '')))
    .map((secret: any) => buildWorkerVariableItem(String(secret.name), 'secret_text', '', 'cloudflare-secrets'));
}

function removeVariableBinding(bindings: any[], name: string): any[] {
  return bindings.filter((binding: any) => !(String(binding?.name || '') === name && WORKER_VARIABLE_BINDING_TYPES.has(String(binding?.type || ''))));
}

async function putWorkerSecret(request: Request, env: Env, name: string, value: string): Promise<void> {
  const scriptName = managedWorkerScriptName(env);
  await cloudflareWorkersApi(request, env, `/workers/scripts/${encodeURIComponent(scriptName)}/secrets`, {
    method: 'PUT',
    body: JSON.stringify({ name, text: value, type: 'secret_text' }),
  });
}

async function deleteWorkerSecret(request: Request, env: Env, name: string): Promise<void> {
  const scriptName = managedWorkerScriptName(env);
  await cloudflareWorkersApi(request, env, `/workers/scripts/${encodeURIComponent(scriptName)}/secrets/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

async function adminListManagedWorkerVariables(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const items: WorkerVariableItem[] = [];
  let syncMode = 'runtime-fallback';
  let warning = '';
  if (env.CF_WORKERS_API_TOKEN) {
    try {
      const [settings, secrets] = await Promise.all([
        fetchWorkerScriptSettings(request, env),
        fetchWorkerSecretBindings(request, env).catch(() => []),
      ]);
      items.push(...variableItemsFromScriptSettings(settings));
      items.push(...variableItemsFromSecretList(secrets));
      syncMode = 'cloudflare-api';
    } catch (error: any) {
      warning = `Cloudflare API 同步失败，已显示当前运行时可见变量：${error?.message || error}`;
      items.push(...runtimeWorkerVariables(env));
    }
  } else {
    warning = '未配置 CF_WORKERS_API_TOKEN，只能显示当前运行时可见变量，不能同步 Cloudflare 后台完整类型。';
    items.push(...runtimeWorkerVariables(env));
  }
  const variables = mergeWorkerVariableItems(items);
  return ok({
    enabled: Boolean(env.CF_WORKERS_API_TOKEN),
    accountIdConfigured: Boolean(env.CF_ACCOUNT_ID),
    scriptName: managedWorkerScriptName(env),
    syncMode,
    warning,
    variables,
    definitions: WORKER_VARIABLE_DEFINITIONS,
    protectedNames: Array.from(PROTECTED_WORKER_VARIABLE_NAMES),
    note: '这里通过 Worker /settings 同步文本、JSON 和密钥变量，并通过 /secrets 校验密钥列表。CF_WORKERS_API_TOKEN 本身必须在 Cloudflare 控制台维护，网站内不能修改。',
  });
}

async function adminUpdateManagedWorkerVariable(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const name = normalizeWorkerVariableName(body.name);
  if (PROTECTED_WORKER_VARIABLE_NAMES.has(name)) {
    throw new HttpError(403, 'WORKER_VARIABLE_PROTECTED', 'CF_WORKERS_API_TOKEN 只能在 Cloudflare 控制台修改，不能在网站内修改');
  }
  const type = normalizeWorkerVariableType(body.type, name);
  const value = validateWorkerVariableValue(name, body.value, type);
  const scriptName = managedWorkerScriptName(env);
  if (type === 'secret_text') {
    await putWorkerSecret(request, env, name, value);
  } else {
    const settings = await fetchWorkerScriptSettings(request, env);
    const bindings = Array.isArray(settings?.bindings) ? settings.bindings : [];
    const nextBindings = removeVariableBinding(bindings, name);
    if (type === 'json') {
      nextBindings.push({ name, type: 'json', json: parseJsonWorkerVariableValue(body.value) });
    } else {
      nextBindings.push({ name, type: 'plain_text', text: value });
    }
    await patchWorkerScriptBindings(request, env, nextBindings);
  }
  await audit(env, request, admin.id, 'admin.worker_variable_update', 'worker_variable', name, {
    scriptName,
    type,
    valueHash: await sha256(value),
  });
  const definition = resolveWorkerVariableDefinition(name, type);
  return ok({
    updated: true,
    name,
    type,
    label: definition.label,
    scriptName,
    message: `${definition.label || name} 已提交到 Cloudflare；新值通常会在数秒内对后续请求生效`,
  });
}

async function adminDeleteManagedWorkerVariable(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request);
  const name = normalizeWorkerVariableName(body.name);
  if (PROTECTED_WORKER_VARIABLE_NAMES.has(name)) {
    throw new HttpError(403, 'WORKER_VARIABLE_PROTECTED', 'CF_WORKERS_API_TOKEN 只能在 Cloudflare 控制台删除或修改，不能在网站内删除');
  }
  const type = normalizeWorkerVariableType(body.type, name);
  const scriptName = managedWorkerScriptName(env);
  if (type === 'secret_text') {
    await deleteWorkerSecret(request, env, name);
  } else {
    const settings = await fetchWorkerScriptSettings(request, env);
    const bindings = Array.isArray(settings?.bindings) ? settings.bindings : [];
    await patchWorkerScriptBindings(request, env, removeVariableBinding(bindings, name));
  }
  await audit(env, request, admin.id, 'admin.worker_variable_delete', 'worker_variable', name, { scriptName, type });
  return ok({ deleted: true, name, type, scriptName, message: `${name} 已从 Cloudflare Worker 变量中删除` });
}


function dnsAllowedTypesBindingValue(settings: any, env: Env): { raw: string; source: string } {
  const bindings = Array.isArray(settings?.bindings) ? settings.bindings : [];
  const binding = bindings.find((item: any) => String(item?.name || '') === 'DNS_ALLOWED_TYPES');
  if (binding) {
    if (String(binding.type) === 'json') {
      const value = binding.json;
      if (Array.isArray(value)) return { raw: value.join(','), source: 'Cloudflare JSON variable' };
      if (typeof value === 'string') return { raw: value, source: 'Cloudflare JSON variable' };
    }
    if (typeof binding.text === 'string') return { raw: binding.text, source: 'Cloudflare text variable' };
  }
  return { raw: String(env.DNS_ALLOWED_TYPES || ''), source: 'current Worker runtime' };
}

async function adminSyncDnsAllowedTypesFromWorker(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  let sourceSettings: any = null;
  let warning = '';
  if (env.CF_WORKERS_API_TOKEN) {
    try { sourceSettings = await fetchWorkerScriptSettings(request, env); }
    catch (error: any) { warning = `Cloudflare API 读取失败，已改用当前 Worker 运行时变量：${error?.message || error}`; }
  }
  const source = dnsAllowedTypesBindingValue(sourceSettings, env);
  const types = sanitizeDnsRecordTypes(source.raw, []);
  if (!types.length) {
    throw new HttpError(409, 'DNS_ALLOWED_TYPES_EMPTY', 'DNS_ALLOWED_TYPES 未配置有效类型；请先在 Cloudflare 变量中填写，例如 CNAME,A,AAAA,TXT,MX,NS');
  }

  const settings = await loadSettings(env);
  const existingByType = new Map(settings.dns.recordTypePolicies.map(item => [item.type, item]));
  const openSet = new Set(types);
  settings.dns.recordTypePolicies = SUPPORTED_DNS_RECORD_TYPES.map(type => {
    const existing = existingByType.get(type);
    return {
      type,
      displayName: existing?.displayName || defaultDnsRecordDisplayName(type),
      allowUserAdd: openSet.has(type),
      note: existing?.note || '',
    };
  });
  settings.dns.suffixes = settings.dns.suffixes.map(item => ({
    ...item,
    allowedTypes: [...types],
    defaultType: (types.includes(item.defaultType) ? item.defaultType : types[0]) as DnsRecordType,
  }));
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(settings));
  await audit(env, request, admin.id, 'admin.dns_sync_allowed_types', 'setting', 'dns', {
    source: source.source,
    raw: source.raw,
    types,
  });
  return ok({
    synced: true,
    source: source.source,
    raw: source.raw,
    types,
    warning,
    settings: adminSettingsView(settings, env),
    message: `已从 ${source.source} 同步 ${types.length} 种 DNS 类型：${types.join(', ')}`,
  });
}

function adminCloudflareEmailSceneEnabled(settings: AppSettings, scene: AdminCloudflareEmailScene): boolean {
  if (scene === 'admin_test') return settings.registration.emailTestSceneEnabled !== false;
  return true;
}

function resolveCloudflareAdminSender(env: Env, settings: AppSettings): { fromEmail: string; fromName: string } {
  const fromEmail = normalizeOptionalEmailStrict(env.EMAIL_FROM || settings.registration.emailFrom) || resolveCloudflareAdminEmail(env, settings);
  const fromName = cleanText(env.EMAIL_FROM_NAME || settings.registration.emailFromName || settings.site.title || '域名注册中心', 120) || '域名注册中心';
  return { fromEmail, fromName };
}

function encodeMailHeader(value: string): string {
  const text = String(value || '').replace(/[\r\n]+/g, ' ').trim();
  if (!text) return '';
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function buildCloudflareRawEmail(message: { fromEmail: string; fromName: string; toEmail: string; subject: string; text: string; html?: string }): string {
  const boundary = `flore-${crypto.randomUUID().replace(/-/g, '')}`;
  const subject = encodeMailHeader(message.subject || '系统通知');
  const fromName = encodeMailHeader(message.fromName || '域名注册中心');
  const text = String(message.text || '');
  const html = String(message.html || '') || plainTextToEmailHtml(text);
  return [
    `From: ${fromName} <${message.fromEmail}>`,
    `To: ${message.toEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');
}

async function claimAdminEmailCooldown(
  env: Env,
  scene: AdminCloudflareEmailScene,
  fingerprint: string,
  cooldownSeconds: number,
): Promise<boolean> {
  if (cooldownSeconds <= 0) return true;
  const hash = (await sha256(`${scene}|${fingerprint}`)).slice(0, 32);
  const key = `admin_email_v90:${scene}:${hash}`;
  const existing = await env.APP_KV.get(key).catch(() => null);
  if (existing) return false;
  await env.APP_KV.put(key, '1', { expirationTtl: clamp(cooldownSeconds, 60, 86400) }).catch(() => undefined);
  return true;
}

async function sendAdminCloudflareEmail(
  env: Env,
  settings: AppSettings,
  scene: AdminCloudflareEmailScene,
  message: { subject: string; text: string; html?: string; fingerprint?: string; cooldownSeconds?: number; recipient?: string },
): Promise<{ sent: boolean; recipient: string; skipped?: string }> {
  const recipient = normalizeOptionalEmailStrict(message.recipient) || resolveCloudflareAdminEmail(env, settings);
  if (!adminCloudflareEmailSceneEnabled(settings, scene)) return { sent: false, recipient, skipped: 'scene_disabled' };
  if (!env.SEB) throw new HttpError(503, 'CF_EMAIL_BINDING_MISSING', 'Cloudflare 邮件绑定未配置，请确认 wrangler.jsonc 中存在名为 SEB 的 send_email 绑定');
  const fingerprint = message.fingerprint || `${message.subject}|${message.text.slice(0, 500)}`;
  const allowed = await claimAdminEmailCooldown(env, scene, fingerprint, Number(message.cooldownSeconds || 0));
  if (!allowed) return { sent: false, recipient, skipped: 'cooldown' };
  const sender = resolveCloudflareAdminSender(env, settings);
  const raw = buildCloudflareRawEmail({
    fromEmail: sender.fromEmail,
    fromName: sender.fromName,
    toEmail: recipient,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  try {
    await env.SEB.send(new EmailMessage(sender.fromEmail, recipient, raw));
    console.log('email delivery success', { provider: 'cloudflare-seb', scene, recipient });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error || '未知错误');
    throw new HttpError(502, 'CF_ADMIN_EMAIL_FAILED', `Cloudflare 管理员邮件发送失败：${detail.slice(0, 500)}`);
  }
  return { sent: true, recipient };
}

async function sendAdminCloudflareEmailSafe(
  env: Env,
  scene: AdminCloudflareEmailScene,
  message: { subject: string; text: string; html?: string; fingerprint?: string; cooldownSeconds?: number },
  settingsInput?: AppSettings,
): Promise<void> {
  try {
    const settings = settingsInput || await loadSettings(env);
    await sendAdminCloudflareEmail(env, settings, scene, message);
  } catch (error) {
    console.error(`cloudflare admin email ${scene} failed`, error);
  }
}

async function notifySystemExceptionByCloudflare(env: Env, request: Request, error: unknown): Promise<void> {
  let settings: AppSettings;
  try { settings = await loadSettings(env); }
  catch { settings = defaultSettings(env); }
  if (!adminCloudflareEmailSceneEnabled(settings, 'system_error')) return;
  const url = new URL(request.url);
  const message = error instanceof Error ? error.message : String(error || '未知异常');
  const stack = error instanceof Error ? String(error.stack || '').slice(0, 4000) : '';
  const rayId = request.headers.get('cf-ray') || '';
  const text = [
    '系统捕获到未处理异常。',
    '',
    `时间：${new Date().toISOString()}`,
    `请求：${request.method} ${url.pathname}${url.search}`,
    `访问域名：${url.hostname}`,
    `客户端 IP：${clientIp(request) || '未知'}`,
    rayId ? `Cloudflare Ray ID：${rayId}` : '',
    `错误：${message}`,
    stack ? `堆栈：\n${stack}` : '',
    '',
    '处理建议：先查看 Workers 日志中同一时间的第一条错误，再检查 D1、KV、绑定和最近部署文件。',
  ].filter(Boolean).join('\n');
  await sendAdminCloudflareEmail(env, settings, 'system_error', {
    subject: `【系统异常】${request.method} ${url.pathname}`,
    text,
    fingerprint: `${request.method}|${url.pathname}|${message}`,
    cooldownSeconds: 900,
  });
}

function resolveEmailDeliveryConfig(env: Env, settings: AppSettings) {
  const apiKey = String(env.RESEND_API_KEY || settings.registration.emailApiKey || '').trim();
  const fromEmail = String(env.EMAIL_FROM || settings.registration.emailFrom || '').trim();
  const fromName = String(env.EMAIL_FROM_NAME || settings.registration.emailFromName || settings.site.title || '域名注册中心').trim();
  if (!apiKey) throw new HttpError(503, 'EMAIL_API_KEY_MISSING', '邮件服务未配置：请设置 RESEND_API_KEY 或在管理员设置中填写 Resend API Key');
  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new HttpError(503, 'EMAIL_FROM_MISSING', '发件邮箱未配置或格式不正确');
  }
  return { apiKey, fromEmail, fromName };
}

interface ResendEmailMessage {
  to: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
}

async function sendEmailWithResend(env: Env, settings: AppSettings, message: ResendEmailMessage): Promise<void> {
  const config = resolveEmailDeliveryConfig(env, settings);
  const to = sanitizeEmailRecipientList(message.to);
  const bcc = sanitizeEmailRecipientList(message.bcc || []).filter(item => !to.includes(item));
  if (!to.length) throw new HttpError(400, 'EMAIL_RECIPIENT_REQUIRED', '没有可用的邮件收件对象');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to,
      ...(bcc.length ? { bcc } : {}),
      subject: cleanText(message.subject, 300).replace(/[\r\n]+/g, ' ') || '系统邮件',
      text: String(message.text || ''),
      html: String(message.html || '') || plainTextToEmailHtml(String(message.text || '')),
    }),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, 'EMAIL_SEND_FAILED', payload?.message || payload?.error?.message || `邮件发送失败 HTTP ${response.status}`);
  }
  console.log('email delivery success', { provider: 'resend', recipients: to.length, bcc: bcc.length });
}

function buildEmailTemplateMessage(
  settings: AppSettings,
  scene: 'registration' | 'test',
  context: Record<string, unknown>,
): Pick<ResendEmailMessage, 'subject' | 'text' | 'html'> {
  const registration = settings.registration;
  const isRegistration = scene === 'registration';
  const subjectTemplate = isRegistration ? registration.emailRegistrationSubjectTemplate : registration.emailTestSubjectTemplate;
  const textTemplate = isRegistration ? registration.emailRegistrationTextTemplate : registration.emailTestTextTemplate;
  const htmlTemplate = isRegistration ? registration.emailRegistrationHtmlTemplate : registration.emailTestHtmlTemplate;
  const subject = renderEmailTemplate(subjectTemplate, context, false).replace(/[\r\n]+/g, ' ').trim();
  const text = renderEmailTemplate(textTemplate, context, false).trim();
  const html = renderEmailTemplate(htmlTemplate, context, true).trim() || plainTextToEmailHtml(text);
  return { subject, text, html };
}

async function sendRegistrationEmailCode(request: Request, env: Env): Promise<Response> {
  await rateLimit(env, request, 'registration-email', 8, 3600);
  const settings = await loadSettings(env);
  if (!settings.registration.enabled) throw new HttpError(403, 'REGISTER_CLOSED', settings.registration.disabledMessage || '当前暂未开放用户注册');
  if (!settings.registration.emailVerificationEnabled) throw new HttpError(409, 'EMAIL_VERIFICATION_DISABLED', '管理员尚未开启注册邮箱验证');
  const body = await readJson<Record<string, unknown>>(request);
  const email = normalizeOptionalEmailStrict(body.email);
  if (!email) throw new HttpError(400, 'EMAIL_REQUIRED', '请输入有效邮箱');
  if (settings.registration.blockTempEmail && isTempEmailDomain(email)) throw new HttpError(400, 'TEMP_EMAIL_BLOCKED', '不允许使用临时邮箱注册');
  const emailDomain = email.split('@').pop() || '';
  const blockedEmailDomains = sanitizeStringList(settings.registration.emailDomainBlacklist || '');
  if (blockedEmailDomains.some(domain => emailDomain.toLowerCase() === domain.toLowerCase().replace(/^@/, ''))) {
    throw new HttpError(403, 'EMAIL_DOMAIN_BLOCKED', '该邮箱后缀已被禁止注册');
  }
  if (listMatches(email, settings.blacklist?.emails || [])) throw new HttpError(403, 'EMAIL_BLOCKED', '该邮箱已被禁止注册');
  const duplicate = await env.DB.prepare(`SELECT id FROM users WHERE email=? COLLATE NOCASE LIMIT 1`).bind(email).first<{ id: string }>();
  if (duplicate) throw new HttpError(409, 'EMAIL_EXISTS', '该邮箱已被使用');

  const existing = await env.DB.prepare(`
    SELECT sent_at FROM email_verification_codes WHERE email=? COLLATE NOCASE LIMIT 1
  `).bind(email).first<{ sent_at?: string }>();
  if (existing?.sent_at) {
    const sentAt = new Date(existing.sent_at).getTime();
    const remaining = 60 - Math.floor((Date.now() - sentAt) / 1000);
    if (Number.isFinite(sentAt) && remaining > 0) throw new HttpError(429, 'EMAIL_CODE_COOLDOWN', `请 ${remaining} 秒后再发送`);
  }

  const codeLength = clamp(Number(settings.registration.emailCodeLength || 6), 4, 12);
  const codeCharset = sanitizeEmailCodeCharset(settings.registration.emailCodeCharset);
  const code = randomCodeFromCharset(codeCharset, codeLength, 4, 12);
  const expiryMinutes = clamp(Number(settings.registration.emailCodeExpiryMinutes || 10), 2, 60);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
  const sentAt = new Date().toISOString();
  const codeHash = await sha256(`${email.toLowerCase()}|${code}`);
  if (settings.registration.emailRegistrationSceneEnabled === false) {
    throw new HttpError(409, 'EMAIL_REGISTRATION_SCENE_DISABLED', '注册验证码邮件场景已被管理员关闭');
  }
  const environment = assertEmailEnvironmentAllowed(env, settings);
  const siteTitle = settings.site.title || '域名注册中心';
  const templateContext = {
    siteName: siteTitle,
    code,
    expiryMinutes,
    email,
    environment,
    time: new Date().toISOString(),
  };
  const rendered = buildEmailTemplateMessage(settings, 'registration', templateContext);
  const fixedRecipients = sanitizeEmailRecipientList(settings.registration.emailFixedRecipients || '');
  const bcc = settings.registration.emailRegistrationRecipientMode === 'user_bcc_fixed' ? fixedRecipients : [];
  await env.DB.prepare(`
    INSERT INTO email_verification_codes (email, code_hash, expires_at, attempts, sent_at, ip)
    VALUES (?, ?, ?, 0, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      code_hash=excluded.code_hash,
      expires_at=excluded.expires_at,
      attempts=0,
      sent_at=excluded.sent_at,
      ip=excluded.ip
  `).bind(email, codeHash, expiresAt, sentAt, clientIp(request)).run();
  try {
    await sendEmailWithResend(env, settings, { to: [email], bcc, ...rendered });
  } catch (error) {
    await env.DB.prepare(`DELETE FROM email_verification_codes WHERE email=? COLLATE NOCASE AND code_hash=?`).bind(email, codeHash).run().catch(() => undefined);
    throw error;
  }
  await audit(env, request, null, 'auth.email_code_sent', 'email', await sha256(email.toLowerCase()), { expiresInMinutes: expiryMinutes, provider: 'resend' });
  return ok({ sent: true, expiresInSeconds: expiryMinutes * 60, cooldownSeconds: 60 });
}

async function verifyRegistrationEmailCode(env: Env, email: string, rawCode: unknown): Promise<string> {
  const settings = await loadSettings(env);
  const code = String(rawCode || '').trim();
  const codeLength = clamp(Number(settings.registration.emailCodeLength || 6), 4, 12);
  const charset = new Set(Array.from(sanitizeEmailCodeCharset(settings.registration.emailCodeCharset)));
  if (Array.from(code).length !== codeLength || Array.from(code).some(character => !charset.has(character))) {
    throw new HttpError(400, 'EMAIL_CODE_REQUIRED', `请输入 ${codeLength} 位邮箱验证码`);
  }
  const state = await env.DB.prepare(`
    SELECT code_hash, expires_at, attempts FROM email_verification_codes WHERE email=? COLLATE NOCASE LIMIT 1
  `).bind(email).first<{ code_hash?: string; expires_at?: string; attempts?: number }>();
  if (!state) throw new HttpError(403, 'EMAIL_CODE_INVALID', '邮箱验证码不存在或已过期，请重新发送');
  const expiresAt = new Date(String(state.expires_at || '')).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    await env.DB.prepare(`DELETE FROM email_verification_codes WHERE email=? COLLATE NOCASE`).bind(email).run().catch(() => undefined);
    throw new HttpError(403, 'EMAIL_CODE_EXPIRED', '邮箱验证码已过期，请重新发送');
  }
  const attempts = Number(state.attempts || 0);
  if (attempts >= 6) {
    await env.DB.prepare(`DELETE FROM email_verification_codes WHERE email=? COLLATE NOCASE`).bind(email).run().catch(() => undefined);
    throw new HttpError(429, 'EMAIL_CODE_ATTEMPTS_EXCEEDED', '验证码错误次数过多，请重新发送');
  }
  const candidate = await sha256(`${email.toLowerCase()}|${code}`);
  if (candidate !== state.code_hash) {
    await env.DB.prepare(`UPDATE email_verification_codes SET attempts=COALESCE(attempts,0)+1 WHERE email=? COLLATE NOCASE`).bind(email).run();
    throw new HttpError(403, 'EMAIL_CODE_INVALID', '邮箱验证码不正确');
  }
  return email;
}

async function adminTestEmailDelivery(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const settings = await loadSettings(env);
  if (settings.registration.emailTestSceneEnabled === false) {
    throw new HttpError(409, 'EMAIL_TEST_SCENE_DISABLED', '管理员测试邮件场景已被关闭');
  }
  const environment = assertEmailEnvironmentAllowed(env, settings);
  const body = await readJson<Record<string, unknown>>(request);
  const requestedScene = String(body.scene || 'test') === 'registration' ? 'registration' : 'test';
  if (requestedScene === 'registration' && settings.registration.emailRegistrationSceneEnabled === false) {
    throw new HttpError(409, 'EMAIL_REGISTRATION_SCENE_DISABLED', '注册验证码邮件场景已被管理员关闭');
  }
  const syncedRecipients = sanitizeEmailRecipientList(settings.registration.cloudflareVerifiedRecipients || []);
  const requestedRecipient = normalizeOptionalEmailStrict(body.recipient);
  const recipient = requestedRecipient || resolveCloudflareAdminEmail(env, settings);
  if (syncedRecipients.length && !syncedRecipients.includes(recipient.toLowerCase())) {
    throw new HttpError(400, 'CF_EMAIL_RECIPIENT_NOT_VERIFIED', '所选邮箱不在已同步的 Cloudflare 已验证目标邮箱列表中');
  }
  const context = {
    siteName: settings.site.title || '域名注册中心',
    code: randomCodeFromCharset(
      sanitizeEmailCodeCharset(settings.registration.emailCodeCharset),
      clamp(Number(settings.registration.emailCodeLength || 6), 4, 12),
      4,
      12,
    ),
    expiryMinutes: clamp(Number(settings.registration.emailCodeExpiryMinutes || 10), 2, 60),
    email: recipient,
    adminEmail: admin.email || recipient,
    environment,
    time: new Date().toISOString(),
  };
  const rendered = buildEmailTemplateMessage(settings, requestedScene, context);
  const result = await sendAdminCloudflareEmail(env, settings, 'admin_test', {
    ...rendered,
    fingerprint: `manual-test|${admin.id}|${Date.now()}`,
    cooldownSeconds: 0,
    recipient,
  });
  await audit(env, request, admin.id, 'admin.email_test', 'setting', 'cloudflare_email', {
    recipientHash: await sha256(recipient.toLowerCase()),
    scene: requestedScene,
    environment,
    provider: 'cloudflare_email_binding',
  });
  return ok({
    sent: result.sent,
    recipients: [recipient],
    environment,
    scene: requestedScene,
    provider: 'cloudflare-seb',
    message: `Cloudflare SEB 测试邮件已发送至 ${recipient}`, 
  });
}

function serializeUser(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    status: user.status,
    domainQuota: Math.max(0, Number(user.domain_quota ?? 3)),
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at || null,
  };
}

function serializeApplication(app: ApplicationRow, settings: AppSettings) {
  const created = parseDate(app.created_at);
  const approved = app.status === 'approved';
  const expires = approved ? parseDate(app.expires_at) : null;
  const remainingMs = expires ? expires.getTime() - Date.now() : null;
  const remainingDays = remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / DAY));
  const canRenew = approved && remainingDays !== null && remainingDays <= settings.domain.renewWindowDays;
  const deleteRequested = Boolean(app.delete_requested_at);
  const deleteRequestedAtDate = deleteRequested ? parseDate(app.delete_requested_at || '') : null;
  const deleteCancelDeadline = deleteRequestedAtDate ? new Date(deleteRequestedAtDate.getTime() + 12 * 60 * 60 * 1000) : null;
  const canCancelDeleteRequest = Boolean(deleteCancelDeadline && Date.now() <= deleteCancelDeadline.getTime());
  const disabledByAdmin = app.status === 'revoked' && String(app.review_note || '').startsWith('【已禁用】');
  const extra = app as ApplicationRow & Record<string, unknown>;
  const dnsCount = Math.max(0, Number(extra.dns_count || 0));
  const primaryRecordType = String(extra.primary_record_type || app.record_type || '').trim();
  const primaryRecordContent = String(extra.primary_record_content || app.record_content || '').trim();
  const primaryDnsRecordId = String(extra.primary_dns_record_id || app.dns_record_id || '').trim();
  const rawDnsSummary = String(extra.dns_summary || '').trim();
  const dnsSummary = dnsCount > 0
    ? (rawDnsSummary || `${primaryRecordType} → ${primaryRecordContent}`)
    : '';

  return {
    id: app.id,
    userId: app.user_id,
    username: app.username || null,
    prefixUnicode: app.prefix_unicode,
    prefixAscii: app.prefix_ascii,
    suffixUnicode: app.suffix_unicode,
    suffixAscii: app.suffix_ascii,
    fqdnUnicode: app.fqdn_unicode,
    fqdnAscii: app.fqdn_ascii,
    recordType: primaryRecordType || 'CNAME',
    recordContent: primaryRecordContent,
    proxied: Boolean(app.proxied),
    ttl: Number(app.ttl || 1),
    status: app.status,
    statusText: disabledByAdmin ? '已禁用' : (deleteRequested && app.status === 'approved' ? '待删除审核' : statusLabel(app.status)),
    reviewNote: '',
    errorMessage: app.error_message || '',
    dnsRecordId: primaryDnsRecordId,
    dnsConfigured: dnsCount > 0 || Boolean(primaryRecordContent),
    dnsCount,
    dnsSummary,
    createdAt: created ? created.toISOString() : app.created_at,
    reviewedAt: app.reviewed_at || null,
    expiresAt: expires ? expires.toISOString() : null,
    renewedAt: app.renewed_at || null,
    deleteRequested,
    deleteRequestedAt: app.delete_requested_at || null,
    controlled: Boolean(app.controlled_at),
    controlledAt: app.controlled_at || null,
    controlledBy: app.controlled_by || null,
    deleteCancelDeadline: deleteCancelDeadline ? deleteCancelDeadline.toISOString() : null,
    canCancelDeleteRequest,
    renewCount: Number(app.renew_count || 0),
    remainingDays,
    remainingText: expires ? (remainingDays === 0 ? '今天到期' : `${remainingDays} 天`) : '',
    canRenew: canRenew && !deleteRequested,
    canDelete: ['rejected', 'revoked'].includes(app.status) && !app.deleted_at,
    canRequestDelete: app.status === 'approved' && !deleteRequested && !app.deleted_at,
  };
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待审核',
    processing: '处理中',
    approved: '正常',
    rejected: '已拒绝',
    revoking: '撤销中',
    revoked: '已撤销',
    deleted: '已删除',
    active: '启用',
    disabled: '禁用',
  };
  return map[status] || status;
}

async function createDnsRecord(token: string, zoneId: string, payload: any): Promise<any> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 创建失败 HTTP ${res.status}`);
  }
  return data.result;
}

async function updateDnsRecord(token: string, zoneId: string, recordId: string, payload: any): Promise<any> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 更新失败 HTTP ${res.status}`);
  }
  return data.result;
}

function cloudflareErrorText(data: any): string {
  try { return JSON.stringify(data?.errors || data || {}).toLowerCase(); }
  catch { return ''; }
}

function isCloudflareRecordMissing(status: number, data: any): boolean {
  const text = cloudflareErrorText(data);
  return status === 404
    || text.includes('record does not exist')
    || text.includes('dns record not found')
    || text.includes('not_found')
    || text.includes('not found')
    || text.includes('81044');
}

async function deleteDnsRecord(token: string, zoneId: string, recordId: string): Promise<void> {
  if (!zoneId) throw new HttpError(503, 'ZONE_ID_MISSING', '尚未配置 DNS_ZONE_ID');
  if (!recordId) return;
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token}` },
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    // v56：Cloudflare 已经没有这条记录时，说明外部已经删除；这里视为删除成功，继续清 D1，避免卡死。
    if (isCloudflareRecordMissing(res.status, data)) return;
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 删除失败 HTTP ${res.status}`);
  }
}


async function listCloudflareDnsRecords(token: string, zoneId: string): Promise<any[]> {
  if (!zoneId) return [];
  const all: any[] = [];
  const perPage = 500;
  for (let page = 1; page <= 100; page += 1) {
    const url = new URL(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(perPage));
    url.searchParams.set('order', 'name');
    url.searchParams.set('direction', 'asc');
    const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 查询失败 HTTP ${res.status}`);
    }
    const rows = Array.isArray(data.result) ? data.result : [];
    all.push(...rows);
    const totalPages = Number(data.result_info?.total_pages || 0);
    if (!rows.length || rows.length < perPage || (totalPages > 0 && page >= totalPages)) break;
  }
  return all;
}

function normalizeCloudflareDnsName(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function cloudflareDnsRecordToLocal(record: any, applicationFqdn: string): {
  type: DnsRecordType;
  name: string;
  host: string;
  content: string;
  priority: number | null;
  proxied: number;
  ttl: number;
} | null {
  const type = String(record?.type || '').trim().toUpperCase() as DnsRecordType;
  if (!SUPPORTED_DNS_RECORD_TYPES.includes(type)) return null;
  const name = normalizeCloudflareDnsName(record?.name);
  const fqdn = normalizeCloudflareDnsName(applicationFqdn);
  if (!name || !(name === fqdn || name.endsWith(`.${fqdn}`))) return null;
  const host = name === fqdn ? '@' : name.slice(0, -(fqdn.length + 1));
  let content = String(record?.content ?? '').trim();
  let priority: number | null = record?.priority === undefined || record?.priority === null ? null : Number(record.priority);
  if (type === 'CAA' && record?.data) {
    const flags = Number(record.data.flags || 0);
    const tag = String(record.data.tag || 'issue').trim().toLowerCase();
    const value = String(record.data.value || '').trim();
    content = `${flags} ${tag} ${value}`.trim();
  }
  if (type === 'SRV' && record?.data) {
    const srvPriority = Number(record.data.priority || 0);
    const weight = Number(record.data.weight || 0);
    const port = Number(record.data.port || 0);
    const target = normalizeCloudflareDnsName(record.data.target);
    priority = srvPriority;
    content = `${srvPriority} ${weight} ${port} ${target}`.trim();
  }
  if (!content) return null;
  return {
    type,
    name,
    host: host || '@',
    content,
    priority: Number.isFinite(Number(priority)) ? Number(priority) : null,
    proxied: Boolean(record?.proxied) ? 1 : 0,
    ttl: clamp(Number(record?.ttl || 1), 1, 86400),
  };
}

function dnsImportSignature(applicationId: string, record: { type: string; name: string; content: string; priority?: number | null }): string {
  return [applicationId, String(record.type || '').toUpperCase(), normalizeCloudflareDnsName(record.name), String(record.content || '').trim(), record.priority ?? ''].join('|');
}

async function listCloudflareDnsRecordsByName(token: string, zoneId: string, name: string): Promise<Array<{ id: string; name?: string; type?: string }>> {
  if (!zoneId || !name) return [];
  const url = new URL(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`);
  url.searchParams.set('name', name);
  url.searchParams.set('per_page', '100');
  const res = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    if (isCloudflareRecordMissing(res.status, data)) return [];
    throw new Error(data.errors?.[0]?.message || `Cloudflare DNS 查询失败 HTTP ${res.status}`);
  }
  return Array.isArray(data.result) ? data.result : [];
}

async function deleteDnsRecordsByName(token: string, zoneId: string, name: string): Promise<void> {
  const records = await listCloudflareDnsRecordsByName(token, zoneId, name);
  for (const record of records) {
    if (record?.id) await deleteDnsRecord(token, zoneId, record.id);
  }
}

function resolveDnsToken(env: Env, settings?: AppSettings, suffix?: AppSettings['dns']['suffixes'][number] | null): string {
  // 优先使用根域名单独 Token，其次全局 Worker Secret，最后使用后台 DNS 配置里的全局 Token。
  // 这样不同 Cloudflare 账号下的多个根域名也能在后台单独配置，不需要每个域名都改环境变量。
  return String(suffix?.cfApiToken || env.CF_API_TOKEN || settings?.dns?.cfApiToken || '').trim();
}

function isCloudflareAuthErrorMessage(message: string): boolean {
  const text = String(message || '').toLowerCase();
  return text.includes('authentication error') || text.includes('unauthorized') || text.includes('permission') || text.includes('forbidden') || text.includes('403');
}

async function deleteDnsRecordBestEffort(token: string, zoneId: string, recordId: string): Promise<{ ok: boolean; warning?: string }> {
  if (!recordId) return { ok: true };
  if (!token || !zoneId) return { ok: true, warning: '未配置 Cloudflare Token 或 Zone ID，已仅清理本地记录' };
  try {
    await deleteDnsRecord(token, zoneId, recordId);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cloudflare 删除失败';
    // Cloudflare 中记录已经被外部删除、Zone/Token 无权限时，不再阻塞本地删除，避免二级域名卡在待删除审核。
    return { ok: false, warning: message };
  }
}

async function verifyTurnstile(env: Env, request: Request, token: unknown, expectedAction: string): Promise<void> {
  const settings = await loadSettings(env);
  const secret = String(env.TURNSTILE_SECRET || settings.registration.turnstileSecret || '').trim();
  if (!secret) throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', 'Turnstile Secret 未配置，请改用图形验证');
  const value = String(token || '').trim();
  if (!value) throw new HttpError(400, 'TURNSTILE_REQUIRED', '请完成人机验证');

  const form = new FormData();
  form.append('secret', secret);
  form.append('response', value);
  form.append('remoteip', clientIp(request));

  let response: Response;
  try {
    response = await Promise.race([
      fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
  } catch {
    throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', 'Turnstile 服务连接超时，请切换图形验证');
  }
  const result: any = await response.json().catch(() => null);
  if (!response.ok) throw new HttpError(503, 'TURNSTILE_UNAVAILABLE', `Turnstile 验证接口异常 HTTP ${response.status}，请切换图形验证`);
  if (!result?.success) throw new HttpError(403, 'TURNSTILE_FAILED', '人机验证失败，请刷新验证后重试');

  if (expectedAction && result.action && result.action !== expectedAction) {
    throw new HttpError(403, 'TURNSTILE_ACTION_MISMATCH', '人机验证 Action 不匹配');
  }
  if (env.TURNSTILE_EXPECTED_HOSTNAME && result.hostname && result.hostname !== env.TURNSTILE_EXPECTED_HOSTNAME) {
    throw new HttpError(403, 'TURNSTILE_HOSTNAME_MISMATCH', '人机验证主机名不匹配');
  }
}

function turnstilePublicConfig(env: Env, settings?: AppSettings) {
  const mode = settings ? humanVerificationMode(settings) : 'turnstile_fallback';
  return {
    siteKey: env.TURNSTILE_SITE_KEY || settings?.registration?.turnstileSiteKey || '',
    enabledApply: mode !== 'image',
    enabledLogin: mode !== 'image',
    enabledRegister: mode !== 'image',
    mode,
    captchaEndpoint: '/api/auth/captcha/challenge',
    actionApply: env.TURNSTILE_ACTION_APPLY || 'domain_apply',
    actionLogin: env.TURNSTILE_ACTION_LOGIN || 'login',
    actionRegister: env.TURNSTILE_ACTION_REGISTER || 'register',
  };
}



async function adminSystemStatus(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const auditRetentionDays = clamp(Number(settings.security?.auditRetentionDays || 7), 1, 3650);
  const counts = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE status!='deleted') AS users,
      (SELECT COUNT(*) FROM domain_applications) AS domains,
      (SELECT COUNT(*) FROM dns_records) AS dnsRecords,
      (SELECT COUNT(*) FROM audit_logs WHERE datetime(created_at) >= datetime('now','-' || ? || ' days')) AS logsRetained
  `).bind(auditRetentionDays).first<any>();
  return ok({
    version: 'v119',
    settingsKey: SETTINGS_KEY,
    kv: { storage: 'Workers KV', estimatedKeys: '由 Cloudflare 控制台查看实际占用' },
    cfApi: { configured: Boolean(resolveDnsToken(env, settings)), status: resolveDnsToken(env, settings) ? '已配置' : '未配置' },
    cron: { enabled: Boolean(settings.automation?.enabled), expression: settings.automation?.cronExpression || '' },
    counts: { ...counts, logs4d: Number(counts?.logsRetained || 0) },
    auditRetentionDays,
    update: { current: 'v119', latest: '请以当前部署包为准' },
  });
}

async function adminExportSettings(request: Request, env: Env): Promise<Response> {
  await requireAdmin(env, request);
  return ok({ exportedAt: new Date().toISOString(), version: 'v119', settings: await loadSettings(env) });
}

async function adminImportSettings(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const body = await readJson<Record<string, unknown>>(request, 1024 * 1024);
  const incoming = (body as any).settings || body;
  const defaults = defaultSettings(env);
  const merged = {
    ...defaults,
    ...(incoming || {}),
    site: { ...defaults.site, ...((incoming as any)?.site || {}) },
    registration: { ...defaults.registration, ...((incoming as any)?.registration || {}) },
    domain: { ...defaults.domain, ...((incoming as any)?.domain || {}) },
    dns: { ...defaults.dns, ...((incoming as any)?.dns || {}) },
    blacklist: { ...defaults.blacklist, ...((incoming as any)?.blacklist || {}) },
    notification: { ...defaults.notification, ...((incoming as any)?.notification || {}) },
    security: { ...defaults.security, ...((incoming as any)?.security || {}) },
    automation: { ...defaults.automation, ...((incoming as any)?.automation || {}) },
  } as AppSettings;
  await env.APP_KV.put(SETTINGS_KEY, JSON.stringify(merged));
  await audit(env, request, admin.id, 'admin.settings_import', 'setting', SETTINGS_KEY);
  return ok({ settings: adminSettingsView(await loadSettings(env), env) });
}

async function adminTestCloudflareApi(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(env, request);
  const settings = await loadSettings(env);
  const body = await readJson<Record<string, unknown>>(request, 256 * 1024).catch(() => ({}));
  const requestedZoneId = cleanText((body as any).zoneId, 120);
  const requestedSuffix = normalizeOptionalSuffix((body as any).suffix);
  const bodyToken = cleanText((body as any).cfApiToken, 2000);
  const testOne = async (suffix: AppSettings['dns']['suffixes'][number]) => {
    const token = bodyToken || resolveDnsToken(env, settings, suffix);
    if (!token) return { suffix: suffix.suffix, zoneId: suffix.zoneId, ok: false, message: '未配置 API Token' };
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(suffix.zoneId)}`, {
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      });
      const data: any = await res.json().catch(() => ({}));
      const ok = res.ok && data.success !== false;
      return {
        suffix: suffix.suffix,
        zone: data.result?.name || suffix.suffix,
        zoneId: suffix.zoneId,
        ok,
        message: ok ? '连接正常' : (data.errors?.[0]?.message || `HTTP ${res.status}`),
      };
    } catch (error) {
      return { suffix: suffix.suffix, zoneId: suffix.zoneId, ok: false, message: error instanceof Error ? error.message : '网络请求失败' };
    }
  };

  if (requestedZoneId || requestedSuffix) {
    const suffix = settings.dns.suffixes.find(x => requestedZoneId && x.zoneId === requestedZoneId)
      || settings.dns.suffixes.find(x => requestedSuffix && (x.suffix === requestedSuffix || x.suffixAscii === requestedSuffix));
    if (!suffix?.zoneId) throw new HttpError(400, 'ZONE_ID_MISSING', '没有可测试的 Zone ID；请填写该根域名的 Zone ID');
    const result = await testOne(suffix);
    await audit(env, request, admin.id, 'admin.cf_api_test', 'setting', 'dns', result);
    if (!result.ok) throw new HttpError(502, 'CF_API_TEST_FAILED', `Cloudflare API 测试失败：${result.message}`);
    return ok({ ...result, status: 'ok', message: `Cloudflare API 连通正常：${result.zone || result.suffix}` });
  }

  const inputSuffixes = Array.isArray((body as any).suffixes)
    ? sanitizeDnsSuffixes((body as any).suffixes, settings.dns.suffixes)
    : settings.dns.suffixes;
  const candidates = inputSuffixes.filter(item => item.enabled !== false && item.zoneId);
  if (!candidates.length) throw new HttpError(400, 'ZONE_ID_MISSING', '没有可测试的根域名；请先填写并启用至少一个 Zone ID');
  const results = await Promise.all(candidates.map(testOne));
  const successCount = results.filter(item => item.ok).length;
  await audit(env, request, admin.id, 'admin.cf_api_test_all', 'setting', 'dns', { successCount, total: results.length, results });
  return ok({
    status: successCount === results.length ? 'ok' : (successCount ? 'partial' : 'failed'),
    successCount,
    failedCount: results.length - successCount,
    total: results.length,
    message: `全部根域名测试完成：${successCount}/${results.length} 正常`,
    results,
  });
}

function stripClientHint(value: string | null): string {
  return String(value || '').replace(/^"|"$/g, '').trim();
}

function parseDeviceInfoFromRequest(request: Request): { name: string; type: string; model: string } {
  const ua = String(request.headers.get('user-agent') || '');
  const chPlatform = stripClientHint(request.headers.get('sec-ch-ua-platform'));
  const chModel = stripClientHint(request.headers.get('sec-ch-ua-model'));
  const chMobile = stripClientHint(request.headers.get('sec-ch-ua-mobile'));
  const chBrands = stripClientHint(request.headers.get('sec-ch-ua'));
  return parseDeviceInfo(ua, { platform: chPlatform, model: chModel, mobile: chMobile, brands: chBrands });
}

function parseDeviceInfo(userAgent: string, hints: { platform?: string; model?: string; mobile?: string; brands?: string } = {}): { name: string; type: string; model: string } {
  const ua = String(userAgent || '');
  const lower = ua.toLowerCase();
  const platform = String(hints.platform || '').replace(/^"|"$/g, '').trim();
  const hintModel = String(hints.model || '').replace(/^"|"$/g, '').trim();
  const hintBrands = String(hints.brands || '').replace(/"/g, '').trim();
  const isMobileHint = hints.mobile === '?1';

  let type = '电脑';
  if (/ipad|tablet|kindle|silk/.test(lower) || /ipad/i.test(platform)) type = '平板';
  else if (isMobileHint || /mobile|iphone|android|phone/.test(lower)) type = '手机';

  let os = platform || '未知系统';
  if (/windows nt 10/i.test(ua) || /windows/i.test(platform)) os = 'Windows 10/11';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone/i.test(ua) || /ios/i.test(platform)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/android/i.test(ua) || /android/i.test(platform)) os = 'Android';
  else if (/mac os x/i.test(ua) || /macos/i.test(platform)) os = 'macOS';
  else if (/linux/i.test(ua) || /linux/i.test(platform)) os = 'Linux';

  let browser = '浏览器';
  if (/edg\//i.test(ua) || /Microsoft Edge|Edge/i.test(hintBrands)) browser = 'Edge';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';

  let model = hintModel;
  if (!model) {
    if (/iphone/i.test(os)) model = '苹果 iPhone（浏览器未提供具体型号）';
    else if (/ipad/i.test(os)) model = '苹果 iPad（浏览器未提供具体型号）';
    else if (/macos/i.test(os)) model = 'Apple Mac（浏览器未提供具体型号）';
    else if (/huawei|honor/i.test(ua)) model = '华为设备';
    else if (/android/i.test(os)) model = 'Android 设备（浏览器未提供具体型号）';
    else if (/windows/i.test(os)) model = 'Windows 电脑（浏览器未提供具体品牌型号）';
    else model = `${os} / ${browser}`;
  } else if (/huawei/i.test(model)) {
    model = `华为 ${model.replace(/^huawei\s*/i, '')}`.trim();
  } else if (/iphone/i.test(model)) {
    model = `苹果 ${model}`;
  }

  return { name: `${browser} · ${os}`, type, model };
}

async function getAuthUser(env: Env, request: Request): Promise<UserRow | null> {
  const sid = parseCookie(request.headers.get('cookie') || '').sid;
  if (!sid) return null;
  const tokenHash = await sha256(sid);
  const session = await env.DB.prepare(`
    SELECT * FROM sessions WHERE token_hash=? AND expires_at > datetime('now') LIMIT 1
  `).bind(tokenHash).first<{ id: string; user_id: string }>();
  if (!session) return null;
  try { await env.DB.prepare(`UPDATE sessions SET last_seen_at=? WHERE id=?`).bind(new Date().toISOString(), session.id).run(); } catch {}
  const user = await env.DB.prepare(`
    SELECT * FROM users WHERE id=? AND status!='deleted' LIMIT 1
  `).bind(session.user_id).first<UserRow>();
  return user || null;
}

async function requireUser(env: Env, request: Request): Promise<UserRow> {
  const user = await getAuthUser(env, request);
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', '请先登录');
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_DISABLED', '账户已被禁用');
  return user;
}

async function requireAdmin(env: Env, request: Request): Promise<UserRow> {
  const user = await requireUser(env, request);
  if (user.role !== 'admin') throw new HttpError(403, 'ADMIN_REQUIRED', '需要管理员权限');
  return user;
}

async function createSession(env: Env, request: Request, userId: string, remember: boolean): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const settings = await loadSettings(env);
  let sessionHours = remember ? 30 * 24 : 24;
  try {
    const sessionUser = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(userId).first<{ role: string }>();
    if (sessionUser?.role === 'admin') sessionHours = settings.security?.adminSessionTimeoutHours || 24;
  } catch {}
  const expires = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString();
  const id = crypto.randomUUID();
  const ua = String(request.headers.get('user-agent') || '').slice(0, 300);
  const ip = clientIp(request);
  const device = parseDeviceInfoFromRequest(request);
  const nowIso = new Date().toISOString();

  const insertFull = () => env.DB.prepare(`
    INSERT INTO sessions (id,user_id,token_hash,ip,user_agent,device_name,device_type,device_model,first_seen_at,last_seen_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, userId, tokenHash, ip, ua, device.name, device.type, device.model, nowIso, nowIso, expires).run();

  try {
    await insertFull();
  } catch (firstError) {
    console.error('session insert failed, repairing sessions table', firstError);
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN ip TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN user_agent TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_name TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_type TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN device_model TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN first_seen_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN last_seen_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN expires_at TEXT`).run(); } catch {}
    try { await env.DB.prepare(`ALTER TABLE sessions ADD COLUMN created_at TEXT`).run(); } catch {}

    try {
      await insertFull();
    } catch (secondError) {
      console.error('session insert still failed, recreating sessions table', secondError);
      await env.DB.prepare(`DROP TABLE IF EXISTS sessions`).run();
      await env.DB.prepare(`
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          ip TEXT,
          user_agent TEXT,
          device_name TEXT,
          device_type TEXT,
          device_model TEXT,
          first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
      try { await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)').run(); } catch {}
      await insertFull();
    }
  }

  return cookieString('sid', token, {
    maxAge: sessionHours * 60 * 60,
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    path: '/',
  });
}

async function destroySession(env: Env, request: Request): Promise<string> {
  const sid = parseCookie(request.headers.get('cookie') || '').sid;
  if (sid) {
    const tokenHash = await sha256(sid);
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(tokenHash).run();
  }
  return cookieString('sid', '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', secure: true, path: '/' });
}

async function rateLimit(env: Env, request: Request, key: string, limit: number, windowSeconds: number): Promise<void> {
  const ip = clientIp(request);
  const bucket = `rl:${key}:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = Number(await env.APP_KV.get(bucket) || '0');
  if (current >= limit) throw new HttpError(429, 'RATE_LIMITED', '操作过于频繁，请稍后再试');
  await env.APP_KV.put(bucket, String(current + 1), { expirationTtl: windowSeconds + 60 });
}

async function audit(env: Env, request: Request, actorUserId: string | null, action: string, targetType?: string, targetId?: string | null, meta?: unknown): Promise<void> {
  try {
    await env.DB.prepare(`
      INSERT INTO audit_logs (id,actor_user_id,action,target_type,target_id,ip,meta_json)
      VALUES (?,?,?,?,?,?,?)
    `).bind(crypto.randomUUID(), actorUserId, action, targetType || null, targetId || null, clientIp(request), JSON.stringify(meta || {})).run();
  } catch (error) {
    console.error('audit failed', error);
  }
}

function normalizeUsername(raw: unknown): string {
  // v26：账号不再限制长度格式、大小写或字符类型；只要求不能为空。
  const value = String(raw || '').trim();
  if (!value) {
    throw new HttpError(400, 'INVALID_USERNAME', '账号不能为空');
  }
  return value;
}

function normalizeEmail(raw: unknown): string | null {
  // v28：此字段作为“邮箱/手机号”联系方式使用。
  // 包含 @ 时按邮箱规范化；否则允许手机号/联系方式文本，避免手机号被邮箱校验拦截。
  const original = String(raw || '').trim();
  if (!original) return null;
  if (original.includes('@')) {
    const email = original.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
    return email;
  }
  const value = original.replace(/\s+/g, '');
  if (value.length < 5 || value.length > 40) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
  if (!/^[0-9+()\-]+$/.test(value)) throw new HttpError(400, 'INVALID_EMAIL_OR_PHONE', '邮箱/手机号格式不正确');
  return value;
}


function normalizeOptionalEmailStrict(raw: unknown): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const email = value.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'INVALID_EMAIL', '邮箱格式不正确');
  }
  return email;
}

function normalizeOptionalPhone(raw: unknown): string | null {
  const value = String(raw || '').trim().replace(/\s+/g, '');
  if (!value) return null;
  if (value.length < 5 || value.length > 40 || !/^[0-9+()\-]+$/.test(value)) {
    throw new HttpError(400, 'INVALID_PHONE', '手机号格式不正确');
  }
  return value;
}

function validatePassword(raw: unknown): string {
  // v26：密码只要求至少 8 位，不再要求大小写、字母或数字组合。
  const value = String(raw || '');
  if (value.length < 8) {
    throw new HttpError(400, 'INVALID_PASSWORD', '密码至少 8 位');
  }
  return value;
}

function normalizePrefix(raw: unknown): { unicode: string; ascii: string } {
  const unicode = String(raw || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/.test(unicode) || unicode.length < 1 || unicode.length > 63) {
    throw new HttpError(400, 'INVALID_PREFIX', '域名前缀格式不正确，需以字母或数字开头结尾');
  }
  const ascii = unicode;
  return { unicode, ascii };
}

function normalizeSuffix(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/^\.+/, '');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) throw new HttpError(400, 'INVALID_SUFFIX', '根域名格式不正确');
  return value;
}

function normalizeOptionalSuffix(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!raw) return '';
  try { return normalizeSuffix(raw); } catch { return ''; }
}

function normalizeRecordType(raw: unknown, allowed: string[]): DnsRecordType {
  const type = String(raw || 'CNAME').trim().toUpperCase();
  const configured = sanitizeDnsRecordTypes(allowed, SUPPORTED_DNS_RECORD_TYPES);
  const allowedSet = new Set(configured.length ? configured : SUPPORTED_DNS_RECORD_TYPES);
  if (!SUPPORTED_DNS_RECORD_TYPES.includes(type as DnsRecordType) || !allowedSet.has(type as DnsRecordType)) {
    throw new HttpError(400, 'INVALID_RECORD_TYPE', `当前根域名未开放 ${type} 记录`);
  }
  return type as DnsRecordType;
}

function normalizeDnsHost(raw: unknown, blockWildcard = true): string {
  const host = String(raw || '@').trim().toLowerCase().replace(/^\.+|\.+$/g, '');
  if (!host || host === '@') return '@';
  if (host.length > 80) throw new HttpError(400, 'INVALID_DNS_HOST', '主机记录过长');
  const labels = host.split('.');
  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];
    if (label === '*' && index === 0) {
      if (blockWildcard) throw new HttpError(403, 'WILDCARD_BLOCKED', '管理员已禁止用户创建泛解析');
      continue;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
      throw new HttpError(400, 'INVALID_DNS_HOST', '主机记录只能包含字母、数字、连字符和点，且不能以连字符开头或结尾');
    }
  }
  return host;
}

function assertCnameTargetAllowed(target: string, blacklist: unknown): void {
  const blocked = sanitizeStringList(blacklist).map(x => x.toLowerCase().replace(/^\*\./, ''));
  const value = String(target || '').toLowerCase().replace(/\.$/, '');
  const hit = blocked.find(rule => value === rule || value.endsWith(`.${rule}`) || value.includes(rule));
  if (hit) throw new HttpError(403, 'CNAME_TARGET_BLOCKED', `CNAME 目标命中管理员黑名单：${hit}`);
}

function fullRecordName(host: string, fqdn: string): string {
  return host === '@' ? fqdn.toLowerCase() : `${host}.${fqdn}`.toLowerCase();
}

function normalizeDnsTarget(type: string, raw: unknown, fqdn: string): string {
  const original = String(raw || '').trim();
  const target = original.toLowerCase();
  if (!original) throw new HttpError(400, 'DNS_TARGET_REQUIRED', '请输入 DNS 目标地址');

  if (type === 'CNAME') {
    const cleaned = target.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      throw new HttpError(400, 'INVALID_CNAME', 'CNAME 目标必须是完整主机名，不要填写协议、端口或路径');
    }
    if (cleaned === fqdn.toLowerCase()) throw new HttpError(400, 'CNAME_LOOP', 'CNAME 目标不能指向自己');
    return cleaned;
  }

  if (type === 'A') {
    if (!/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(target)) {
      throw new HttpError(400, 'INVALID_A', 'A 记录必须填写 IPv4 地址');
    }
    if (/^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(target)) {
      throw new HttpError(400, 'PRIVATE_IP', '不能填写私有、本地或保留 IP');
    }
    return target;
  }

  if (type === 'AAAA') {
    if (!/^[0-9a-f:]+$/i.test(target) || !target.includes(':')) {
      throw new HttpError(400, 'INVALID_AAAA', 'AAAA 记录必须填写 IPv6 地址');
    }
    if (/^(::1|fe80:|fc|fd)/i.test(target)) throw new HttpError(400, 'PRIVATE_IP', '不能填写本地或私有 IPv6');
    return target;
  }

  if (type === 'TXT') {
    const cleaned = original.replace(/^"|"$/g, '').trim();
    if (!cleaned || cleaned.length > 2048) throw new HttpError(400, 'INVALID_TXT', 'TXT 内容不能为空，且不能超过 2048 字符');
    return cleaned;
  }

  if (type === 'MX' || type === 'NS') {
    const cleaned = target.replace(/^https?:\/\//, '').split('/')[0].replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleaned)) {
      throw new HttpError(
        400,
        type === 'NS' ? 'INVALID_NS' : 'INVALID_MX',
        type === 'NS' ? 'NS 目标必须是完整名称服务器主机名' : 'MX 目标必须是完整邮件服务器主机名',
      );
    }
    return cleaned;
  }

  if (type === 'CAA') {
    const match = original.match(/^(\d{1,3})\s+(issue|issuewild|iodef)\s+(.+)$/i);
    if (!match || Number(match[1]) > 255 || !match[3].trim()) {
      throw new HttpError(400, 'INVALID_CAA', 'CAA 请按“标志 标签 值”填写，例如：0 issue letsencrypt.org');
    }
    return `${Number(match[1])} ${match[2].toLowerCase()} ${match[3].trim()}`;
  }

  if (type === 'SRV') {
    const parts = original.split(/\s+/).filter(Boolean);
    if (parts.length !== 4) throw new HttpError(400, 'INVALID_SRV', 'SRV 请按“优先级 权重 端口 目标”填写，例如：10 5 443 server.example.com');
    const [priority, weight, port, srvTargetRaw] = parts;
    const numbers = [priority, weight, port].map(value => Number(value));
    const srvTarget = srvTargetRaw.toLowerCase().replace(/\.$/, '');
    if (numbers.some(value => !Number.isInteger(value) || value < 0 || value > 65535) || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(srvTarget)) {
      throw new HttpError(400, 'INVALID_SRV', 'SRV 的优先级、权重、端口必须为 0-65535，目标必须是完整主机名');
    }
    return `${numbers[0]} ${numbers[1]} ${numbers[2]} ${srvTarget}`;
  }

  throw new HttpError(400, 'INVALID_RECORD_TYPE', 'DNS 记录类型错误');
}

function dnsPayload(record: DnsRecordRow | { type: DnsRecordType; name: string; content: string; ttl?: number | null; proxied?: number | null; priority?: number | null }, comment: string): any {
  const type = record.type;
  const payload: any = {
    type,
    name: record.name,
    content: record.content,
    ttl: Number(record.ttl || 1),
    comment,
  };
  if (['A', 'AAAA', 'CNAME'].includes(type)) payload.proxied = Boolean(record.proxied);
  if (type === 'MX') payload.priority = clamp(Number(record.priority || 10), 0, 65535);
  if (type === 'CAA') {
    const match = String(record.content || '').match(/^(\d{1,3})\s+(issue|issuewild|iodef)\s+(.+)$/i);
    if (match) {
      delete payload.content;
      payload.data = { flags: Number(match[1]), tag: match[2].toLowerCase(), value: match[3].trim() };
    }
  }
  if (type === 'SRV') {
    const parts = String(record.content || '').split(/\s+/).filter(Boolean);
    if (parts.length === 4) {
      delete payload.content;
      payload.data = { priority: Number(parts[0]), weight: Number(parts[1]), port: Number(parts[2]), target: parts[3] };
    }
  }
  return payload;
}

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = base64url(saltBytes);
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 },
    key,
    256,
  );
  return { hash: base64url(new Uint8Array(bits)), salt };
}

async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const saltBytes = fromBase64url(salt);
  const key = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations: 100000 },
    key,
    256,
  );
  return timingSafeEqual(base64url(new Uint8Array(bits)), hash);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8(value));
  return base64url(new Uint8Array(digest));
}

function randomToken(bytes: number): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function parseCookie(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) result[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return result;
}

function cookieString(name: string, value: string, options: any): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function assertSameOrigin(request: Request): void {
  if (['GET','HEAD','OPTIONS'].includes(request.method.toUpperCase())) return;
  const origin = request.headers.get('origin');
  if (!origin) return;
  let originUrl: URL;
  try { originUrl = new URL(origin); } catch { throw new HttpError(403, 'BAD_ORIGIN', '请求来源格式不正确'); }
  const requestUrl = new URL(request.url);
  const forwardedHost = String(request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim();
  const forwardedProto = String(request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':','')).split(',')[0].trim().toLowerCase();
  const fetchSite = String(request.headers.get('sec-fetch-site') || '').toLowerCase();
  const requestIsSecure = requestUrl.protocol === 'https:' || forwardedProto === 'https';
  if (requestIsSecure && originUrl.protocol !== 'https:') throw new HttpError(403, 'BAD_ORIGIN', '请求必须使用 HTTPS');
  // Sec-Fetch-Site 由浏览器控制；same-origin 可避免自定义域/反向代理偶发改写 Host 导致误判。
  if (fetchSite === 'same-origin') return;
  const normalizeHost = (value: string) => value.trim().toLowerCase().replace(/:\d+$/, '');
  const allowedHosts = new Set([requestUrl.host, requestUrl.hostname, forwardedHost].map(normalizeHost).filter(Boolean));
  if (!allowedHosts.has(normalizeHost(originUrl.host)) && !allowedHosts.has(normalizeHost(originUrl.hostname))) {
    throw new HttpError(403, 'BAD_ORIGIN', '请求来源不允许，请刷新页面后重试');
  }
}

async function readJson<T>(request: Request, maxBytes = 64 * 1024): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', '请求内容过大');
  try { return text ? JSON.parse(text) as T : {} as T; }
  catch { throw new HttpError(400, 'INVALID_JSON', 'JSON 格式错误'); }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function ok(data: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...data });
}

function withCookie(response: Response, cookie: string): Response {
  const headers = new Headers(response.headers);
  headers.set('set-cookie', cookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function isEnabled(value: unknown, fallback: boolean): boolean {
  return asBoolean(value, fallback);
}

function cleanText(value: unknown, max = 200): string {
  return String(value || '').trim().slice(0, max);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value);
  const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
  return Number.isFinite(date.getTime()) ? date : null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
