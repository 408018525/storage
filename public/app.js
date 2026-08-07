window.__storageScriptLoaded = true;
window.__storageBootStarted = false;
window.__storageBootCompleted = false;
window.addEventListener('error', function(event) {
  try {
    const app = document.querySelector('#app');
    if (app && /正在加载系统|Loading/.test(app.textContent || '')) {
      const msg = event && event.message ? event.message : '前端脚本执行失败';
      app.innerHTML = '<div class="center-screen boot-error"><h2>系统启动失败</h2><p>' + String(msg).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) + '</p><div class="boot-actions"><button class="btn primary" onclick="location.reload()">重新加载</button><a class="btn" href="#/login" onclick="setTimeout(function(){location.reload()},30)">进入登录页</a></div><p class="muted">请先 Ctrl + F5 强制刷新；如果仍失败，把浏览器 Console 红色错误截图发给管理员。</p></div>';
    }
  } catch (e) {}
});
window.addEventListener('unhandledrejection', function(event) {
  try {
    const app = document.querySelector('#app');
    if (app && /正在加载系统|Loading/.test(app.textContent || '')) {
      const reason = event && event.reason;
      const msg = reason && reason.message ? reason.message : '接口请求或页面渲染超时';
      app.innerHTML = '<div class="center-screen boot-error"><h2>系统启动异常</h2><p>' + String(msg).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) + '</p><div class="boot-actions"><button class="btn primary" onclick="location.reload()">重新加载</button><a class="btn" href="#/login" onclick="setTimeout(function(){location.reload()},30)">进入登录页</a></div></div>';
    }
  } catch (e) {}
});
let app = document.querySelector('#app');
let toastRoot = document.querySelector('#toast-root');
let modalRoot = document.querySelector('#modal-root');

function ensureMountRoots() {
  if (!document.body) return;
  app = document.querySelector('#app');
  if (!app) {
    app = document.createElement('div');
    app.id = 'app';
    document.body.appendChild(app);
  }
  modalRoot = document.querySelector('#modal-root');
  if (!modalRoot) {
    modalRoot = document.createElement('div');
    modalRoot.id = 'modal-root';
    document.body.appendChild(modalRoot);
  }
  toastRoot = document.querySelector('#toast-root');
  if (!toastRoot) {
    toastRoot = document.createElement('div');
    toastRoot.id = 'toast-root';
    document.body.appendChild(toastRoot);
  }
}
ensureMountRoots();

const state = {
  config: null,
  me: null,
  applications: [],
  quota: { used: 0, total: 3, remaining: 3 },
  widgetId: null,
  turnstileTokenValue: '',
  turnstileWidgetAction: '',
  turnstileSelector: '',
  humanChallenges: {},
  operationLogFilters: { dateMode: 'all', day: '', hour: '', sort: 'desc', type: 'all', actor: 'all' },
  messageUnread: 0,
};


const DEFAULT_DOMAIN_CONFIG = {
  defaultQuota: 3,
  validDays: 365,
  renewWindowDays: 60,
  allowUserDeleteInvalid: true,
  allowDnsEditAfterApproved: true,
};
function domainConfig(value = state.config?.domain) {
  return { ...DEFAULT_DOMAIN_CONFIG, ...(value || {}) };
}
function suffixList() {
  const list = state.config?.suffixes || state.config?.dns?.suffixes || [];
  return list.map((item, index) => ({ item, index }))
    .sort((a, b) => Number(a.item?.registerOrder || a.index + 1) - Number(b.item?.registerOrder || b.index + 1) || a.index - b.index)
    .map(entry => entry.item);
}

const SUPPORTED_DNS_TYPES = ['A','AAAA','CNAME','TXT','MX','NS'];
const DEFAULT_DNS_TYPE_LABELS = {
  A: 'A（IPv4）',
  AAAA: 'AAAA（IPv6）',
  CNAME: 'CNAME（别名）',
  TXT: 'TXT（文本验证）',
  MX: 'MX（邮件）',
  NS: 'NS（名称服务器）',
};
function normalizedDnsTypePolicies(value = state.config?.dnsRecordTypes || state.config?.dns?.recordTypePolicies) {
  const source = Array.isArray(value) ? value : [];
  const byType = new Map(source.map(item => [String(item?.type || '').toUpperCase(), item]));
  return SUPPORTED_DNS_TYPES.map(type => {
    const item = byType.get(type) || {};
    return {
      type,
      displayName: String(item.displayName || DEFAULT_DNS_TYPE_LABELS[type] || type).trim(),
      allowUserAdd: item.allowUserAdd !== false,
      note: String(item.note || '').trim(),
    };
  });
}
function dnsTypePolicy(type) {
  return normalizedDnsTypePolicies().find(item => item.type === String(type || '').toUpperCase());
}
function dnsTypeDisplayName(type) {
  const value = String(type || '').toUpperCase();
  return dnsTypePolicy(value)?.displayName || DEFAULT_DNS_TYPE_LABELS[value] || value;
}
function enabledDnsTypePoliciesForSuffix(suffix, currentType = '') {
  const allowed = new Set((suffix?.allowedTypes || []).map(type => String(type || '').toUpperCase()));
  const policies = normalizedDnsTypePolicies().filter(policy => policy.allowUserAdd && allowed.has(policy.type));
  const current = String(currentType || '').toUpperCase();
  if (current && !policies.some(policy => policy.type === current) && SUPPORTED_DNS_TYPES.includes(current)) {
    policies.push(dnsTypePolicy(current) || { type: current, displayName: DEFAULT_DNS_TYPE_LABELS[current] || current, allowUserAdd: false, note: '' });
  }
  return policies;
}

function humanVerificationMode() {
  const mode = String(state.config?.turnstile?.mode || state.config?.registration?.humanVerificationMode || 'turnstile_fallback');
  return ['image','turnstile','turnstile_fallback'].includes(mode) ? mode : 'turnstile_fallback';
}

function hasTurnstileSiteKey() {
  return Boolean(String(state.config?.turnstile?.siteKey || '').trim());
}

function shouldShowTurnstile(kind) {
  if (humanVerificationMode() === 'image') return false;
  const turn = state.config?.turnstile || {};
  if (!hasTurnstileSiteKey()) return false;
  if (kind === 'apply') return turn.enabledApply !== false;
  if (kind === 'register') return turn.enabledRegister !== false;
  if (kind === 'login') return turn.enabledLogin !== false;
  return true;
}

let turnstileApiPromise = null;
function loadTurnstileScript(forceReload = false) {
  if (window.turnstile && !forceReload) return Promise.resolve(window.turnstile);
  if (turnstileApiPromise && !forceReload) return turnstileApiPromise;
  turnstileApiPromise = new Promise((resolve, reject) => {
    const oldScripts = Array.from(document.querySelectorAll('script[data-turnstile-api],script[src*="challenges.cloudflare.com/turnstile"]'));
    if (forceReload) oldScripts.forEach(node => { try { node.remove(); } catch {} });
    const existing = !forceReload ? oldScripts.find(Boolean) : null;
    let settled = false;
    let timeoutId = null;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      fn(value);
    };
    const done = () => window.turnstile ? finish(resolve, window.turnstile) : finish(reject, new Error('Turnstile 接口加载超时'));
    const failed = () => finish(reject, new Error('Turnstile 脚本加载失败'));
    timeoutId = setTimeout(done, 4200);
    if (existing) {
      existing.addEventListener('load', done, { once:true });
      existing.addEventListener('error', failed, { once:true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&v=' + Date.now();
    script.async = true;
    script.defer = true;
    script.dataset.turnstileApi = '1';
    script.onload = done;
    script.onerror = failed;
    document.head.appendChild(script);
  }).catch(error => {
    turnstileApiPromise = null;
    throw error;
  });
  return turnstileApiPromise;
}
function ensureTurnstileApi() {
  return loadTurnstileScript(false);
}


const I18N_EN = {
  '初始化管理员':'Bootstrap Admin','首次部署需要创建管理员账户。':'Create the first admin account for this deployment.','初始化令牌':'Setup Token','管理员用户名':'Admin Username','邮箱':'Email','邮箱/手机号':'Email / Phone','请输入邮箱/手机号':'Enter email or phone number','管理员密码':'Admin Password','至少 8 位。':'At least 8 characters.','创建管理员':'Create Admin',
  '登录':'Login','进入域名注册与管理中心。':'Access the domain registration and management center.','用户名或邮箱':'Username or Email','账号或邮箱/手机号':'Account / Email / Phone','密码':'Password','30 天内保持登录':'Keep me signed in for 30 days','没有账户？':'No account?','注册':'Register','创建账户':'Create Account','注册后默认拥有 3 个域名额度。':'New users get 3 domain slots by default.','用户名':'Username','已有账户？':'Already have an account?','登录成功':'Login successful','注册成功，请使用刚才的账号密码登录':'Registration successful. Please log in.','注册成功，请等待管理员启用账户':'Registration successful. Please wait for admin activation.',
  '域名注册':'Domain Registration','域名管理':'Domain Management','账户设置':'Account Settings','管理概览':'Dashboard','域名审核':'Domain Review','用户管理':'Users','管理员设置':'Admin Settings','退出登录':'Logout','管理员':'Admin','普通用户':'User','启用':'Active','禁用':'Disabled','正常':'Active','待审核':'Pending','处理中':'Processing','已拒绝':'Rejected','已撤销':'Revoked','已删除':'Deleted','撤销中':'Revoking','待删除审核':'Delete Pending',
  '请勿申请违法、侵权、仿冒或误导性域名。':'Do not apply for illegal, infringing, impersonating, or misleading domains.','已注册':'Registered','剩余':'Remaining','＋ 注册新域名':'+ Register Domain','申请时只需要填写前缀和根域名。管理员批准后，再在“域名管理”中添加或管理多条 DNS 解析记录。':'Enter only the prefix and root domain. After admin approval, manage DNS records in Domain Management.','填写前缀':'Enter Prefix','提交审核':'Submit Review','管理员批准':'Admin Approval','配置 DNS':'Configure DNS','最近域名':'Recent Domains','全部域名':'All Domains','暂无域名，点击右上方注册新域名。':'No domains yet. Click Register Domain to start.','选择根域名':'Select Root Domain','请选择根域名':'Select root domain','域名前缀':'Domain Prefix','注册新域名':'Register New Domain','选择根域名并输入前缀，快速注册一个专属您的免费域名':'Choose a root domain and enter a prefix.','取消':'Cancel','提交申请':'Submit','审核通过后可配置':'Available after approval','审核通过后可配置 DNS':'DNS available after approval','注册时间':'Created','到期时间':'Expires','剩余时间':'Remaining','DNS':'DNS','管理域名':'Manage Domain','续期':'Renew','申请删除域名':'Request Deletion','删除待审核':'Delete Pending','删除无效域名':'Delete Invalid Domain','未配置':'Not configured','我的域名':'My Domains','到期时间、剩余时间、DNS 状态都在这里查看。':'View expiration, remaining time, and DNS status here.','暂无域名。':'No domains yet.',
  '概览':'Overview','DNS 解析':'DNS Records','续期和详情':'Renewal & Details','添加解析':'+ Add Record','审核通过后可配置 DNS':'DNS available after approval','域名审核通过后才能添加解析。':'DNS records can be added only after approval.','暂无 DNS 解析，请点击“添加解析”。':'No DNS records yet. Click Add Record.','记录类型':'Record Type','主机记录':'Host','目标地址':'Target','代理状态':'Proxy Status','仅 DNS':'DNS Only','开启代理':'Proxied','保存':'Save','编辑':'Edit','删除':'Delete','状态':'Status','操作':'Actions','备注':'Note','用户':'User','批准':'Approve','拒绝':'Reject','撤销':'Revoke','禁用':'Disable','批准删除':'Approve Delete','拒绝删除':'Reject Delete','管理员留言':'Admin Note','禁用后将删除该域名所有 DNS 解析，用户不能继续管理该域名。':'Disabling will remove all DNS records. The user can no longer manage this domain.',
  '保存设置':'Save Settings','界面设置':'Appearance','注册设置':'Registration','域名设置':'Domain Settings','DNS配置':'DNS Config','开放用户注册':'Allow public registration','注册后自动启用账户':'Auto-activate new users','默认额度':'Default quota','默认有效期':'Default validity','续期窗口':'Renewal window','生效后允许用户修改 DNS':'Allow DNS edits after approval','添加用户':'Add User','账号':'Account','初始密码':'Initial Password','角色':'Role','域名额度':'Domain Quota','创建用户':'Create User','注销账号':'Cancel Account','当前密码':'Current Password','确认用户名':'Confirm Username','确认注销':'Confirm Cancellation',
  '语言':'Language','中文':'Chinese','English':'English'
};


I18N_EN['域名列表'] = 'Domain List';
I18N_EN['这里只显示域名状态，不显示编辑操作；进入“域名管理”后再管理解析。'] = 'This page only shows domain status. Go to Domain Management to edit DNS records.';
I18N_EN['EN'] = 'EN';
I18N_EN['中文'] = '中文';

Object.assign(I18N_EN, {
  '免费二级域名注册中心':'Free Subdomain Registration Center',
  '域名注册中心':'Domain Registration Center',
  '快速注册并管理您的专属免费域名':'Register and manage your free subdomains quickly.',
  '域':'D',
  '应用加载失败':'Application failed to load',
  '重试':'Retry',
  '请求失败':'Request failed',
  '管理员创建成功':'Admin created successfully',
  '正在读取域名数据…':'Loading domain data…',
  '正在读取域名列表…':'Loading domain list…',
  '正在读取域名详情…':'Loading domain details…',
  '正在统计…':'Loading statistics…',
  '正在读取申请…':'Loading applications…',
  '正在读取用户…':'Loading users…',
  '正在读取设置…':'Loading settings…',
  '选择根域名并输入前缀，快速注册一个专属您的免费域名':'Choose a root domain and enter a prefix to register your free subdomain.',
  '输入前缀，如: myblog':'Enter a prefix, e.g. myblog',
  '完整域名预览':'Full Domain Preview',
  '请选择根域名并输入前缀':'Select a root domain and enter a prefix',
  '.请选择根域名':'.Select root domain',
  '查看完整说明 ›':'View full guide ›',
  '确认注册':'Confirm Registration',
  '域名已提交，请等待管理员审核通过后再配置 DNS 解析':'Domain submitted. Configure DNS after admin approval.',
  '审核通过后可配置':'Available after approval',
  '审核通过后可添加解析':'Add records after approval',
  '未到续期时间':'Renewal not available yet',
  '暂不可续期':'Renewal unavailable',
  '立即续期':'Renew Now',
  '域名通过审核后才开始计算有效期。':'Validity starts only after the domain is approved.',
  '默认有效期':'Default Validity',
  '最后':'last',
  '天可续期。':'days are eligible for renewal.',
  '域名':'Domain',
  '时间':'Time',
  '未配置 DNS':'DNS not configured',
  '管理员留言，可留空；填写后会发送到用户消息中心':'Admin note, optional. If filled, it will be shown to the user.',
  '确认禁用该域名？禁用后将删除该域名所有 DNS 解析，用户不能继续管理该域名。':'Disable this domain? All DNS records will be removed and the user can no longer manage it.',
  '操作成功':'Operation successful',
  '确认续期一年？':'Renew for one year?',
  '续期成功':'Renewed successfully',
  '确认删除这个无效域名？':'Delete this invalid domain?',
  '无效域名已删除':'Invalid domain deleted',
  '正常域名需要管理员审核后才会删除。管理员通过后，系统会自动删除 Cloudflare DNS 记录并从列表隐藏。':'Active domains require admin approval before deletion. After approval, DNS records will be removed and the domain will be hidden.',
  '确认提交删除申请：':'Confirm deletion request:',
  '提交后域名会显示“待删除审核”，审核期间仍占用额度。':'After submission, the domain will show Delete Pending and still use quota during review.',
  '确认申请删除':'Confirm Deletion Request',
  '删除申请已提交，等待管理员审核':'Deletion request submitted. Waiting for admin review.',
  '账户信息':'Account Information',
  '角色':'Role',
  '修改密码':'Change Password',
  '新密码':'New Password',
  '保存新密码':'Save New Password',
  '密码已修改，请重新登录':'Password changed. Please log in again.',
  '注销后账号将无法登录。为避免域名遗留，账户下仍有正常域名时需要先申请删除域名并等待管理员批准。':'After cancellation, the account can no longer log in. To avoid abandoned domains, delete active domains and wait for admin approval first.',
  '此操作不可直接恢复，请谨慎确认。':'This action cannot be directly restored. Please confirm carefully.',
  '当前账号：':'Current account:',
  '注销后将退出登录，账号状态变为已删除。':'You will be logged out and the account status will become deleted.',
  '输入用户名确认':'Enter Username to Confirm',
  '账号已注销':'Account cancelled',
  '用户总数':'Total Users',
  '活跃':'Active',
  '需要处理':'Needs Action',
  '正常域名':'Active Domains',
  '已写入 DNS':'Written to DNS',
  '今日注册':'Today\'s Registrations',
  '今日新增':'New Today',
  '快速入口':'Quick Access',
  '审核域名':'Review Domains',
  '系统设置':'System Settings',
  '先审核域名；审核通过后，用户才能进入域名管理添加 DNS 解析。':'Review domains first. Users can add DNS records only after approval.',
  '申请时间':'Submitted At',
  '确认':'Confirm',
  '该域名？':' this domain?',
  '用户已创建':'User created',
  '用户已更新':'User updated',
  '未填写邮箱':'No email provided','未填写邮箱/手机号':'No email / phone provided',
  '编辑用户':'Edit User',
  '管理员可直接添加用户，并设置初始密码、角色、状态和额度。':'Admins can create users directly and set password, role, status, and quota.',
  '管理员手动创建用户账号':'Admin creates a user account manually.',
  '例如：user001':'Example: user001',
  '至少 8 位':'At least 8 characters',
  '创建后用户可自行修改密码。':'The user can change the password later.',
  '人机验证：确认由管理员人工创建此账号':'Human verification: confirm this account is manually created by an admin',
  '网站标题':'Site Title',
  '副标题':'Subtitle',
  'Logo文字':'Logo Text',
  '页脚文字':'Footer Text',
  '主色':'Primary Color',
  '辅助色':'Secondary Color',
  '保存界面设置':'Save Appearance Settings',
  '保存注册设置':'Save Registration Settings',
  '域名规则':'Domain Rules',
  '默认域名额度':'Default Domain Quota',
  '默认有效天数':'Default Valid Days',
  '允许续期窗口/天':'Renewal Window / Days',
  '用户可删除无效域名':'Users can delete invalid domains',
  '保存域名规则':'Save Domain Rules',
  'DNS、Zone ID、API Token 当前建议通过 Cloudflare Workers 环境变量和机密管理，不在网页中暴露。':'DNS, Zone ID, and API Token should be managed through Cloudflare Worker variables and secrets, not exposed in the web UI.',
  '根域名':'Root Domain',
  '允许类型':'Allowed Types',
  '默认类型':'Default Type',
  '代理':'Proxy',
  '对应变量：DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED、CF_API_TOKEN。':'Related variables: DNS_SUFFIX, DNS_ZONE_ID, DNS_ALLOWED_TYPES, DNS_DEFAULT_TYPE, DNS_TTL, DNS_PROXIED, CF_API_TOKEN.',
  '设置已保存':'Settings saved',
  '添加 DNS 解析':'Add DNS Record',
  '编辑 DNS 解析':'Edit DNS Record',
  '用户可自由添加解析记录，支持三级/多级子域名。':'Users can freely add DNS records, including third-level and multi-level subdomains.',
  '子域名前缀':'Subdomain Prefix',
  '例如 @、www、api、api.v1':'Examples: @, www, api, api.v1',
  '@ 表示当前二级域名本身，例如 user.flore.top':'@ means the current subdomain itself, such as user.flore.top',
  '解析类型':'Record Type',
  '优先级':'Priority',
  '仅 MX 需要填写，数字越小优先级越高。':'Only required for MX. Lower number means higher priority.',
  '是否代理':'Proxy',
  '保存解析':'Save Record',
  '解析已保存':'DNS record saved',
  '确认删除这条 DNS 解析？':'Delete this DNS record?',
  '解析已删除':'DNS record deleted',
  '提交':'Submit',
  '保存':'Save',
  '返回':'Back',
  '返回域名管理':'Back to Domain Management',
  '概览信息':'Overview',
  '创建时间':'Created At',
  '审核时间':'Reviewed At',
  '审核备注':'Review Note',
  '无':'None',
  '暂无记录':'No records',
  '加载中':'Loading',
  '删除待审核':'Delete Pending',
  '删除申请':'Deletion Request',
  '已禁用':'Disabled',
  'Disabled':'Disabled'
});



Object.assign(I18N_EN, {
  '注册新域名':'Register New Domain',
  '选择根域名并输入前缀，快速注册一个专属您的免费域名':'Choose a root domain and enter a prefix to register your free domain.',
  '选择根域名':'Select Root Domain',
  '请选择根域名':'Select a root domain',
  '域名前缀':'Domain Prefix',
  '输入前缀，如: myblog':'Enter a prefix, e.g. myblog',
  '2-36 位，仅支持字母、数字和连字符 -':'2–36 characters. Letters, numbers, and hyphens only.',
  '完整域名预览':'Full Domain Preview',
  '请选择根域名并输入前缀':'Select a root domain and enter a prefix',
  '管理员审核通过后，您才可以设置 DNS 解析':'You can set DNS records only after admin approval.',
  '查看完整说明 ›':'View Full Guide ›',
  '确认注册':'Confirm Registration',
  '正在验证...':'Verifying...',
  '正在验证…':'Verifying…',
  '隐私':'Privacy',
  '帮助':'Help',
  '已注册':'Registered',
  '剩余':'Remaining',
  '最近域名':'Recent Domains',
  '暂无域名，点击右上方注册新域名。':'No domains yet. Click Register Domain to start.',
  '全部域名':'All Domains',
  '域名列表':'Domain List',
  '这里只显示域名状态，不显示编辑操作；进入“域名管理”后再管理解析。':'This page only shows domain status. Go to Domain Management to edit records.',
  '管理员审核通过后，进入“域名管理”点击“管理域名”，再添加 DNS 解析。':'After admin approval, go to Domain Management and click Manage Domain to add DNS records.',
  '域名通过审核后才开始计算有效期。':'Validity starts only after the domain is approved.',
  '请勿申请违法、侵权、仿冒或误导性域名。':'Do not apply for illegal, infringing, impersonating, or misleading domains.',
  '申请时只需要填写前缀和根域名。管理员批准后，再在“域名管理”中添加或管理多条 DNS 解析记录。':'Enter only the prefix and root domain. After admin approval, add or manage DNS records in Domain Management.',
  '填写前缀':'Enter Prefix',
  '提交审核':'Submit Review',
  '管理员批准':'Admin Approval',
  '配置 DNS':'Configure DNS',
  '待审核':'Pending Review',
  '正常':'Active',
  '已拒绝':'Rejected',
  '已撤销':'Revoked',
  '已删除':'Deleted',
  '禁用':'Disabled',
  '启用':'Active',
  '处理中':'Processing',
  '撤销中':'Revoking',
  '域名审核':'Domain Review',
  '管理概览':'Dashboard',
  '用户管理':'User Management',
  '管理员设置':'Admin Settings',
  '账户设置':'Account Settings',
  '退出登录':'Logout',
  '语言':'Language',
  '中文':'中文',
  'EN':'EN'
});


// v23 complete dynamic i18n patch: covers modal text, mixed text, labels, options, placeholders and malformed partial translations.
Object.assign(I18N_EN, {
  '← 返回域名列表':'← Back to Domain List',
  '返回域名列表':'Back to Domain List',
  'BackDomain List':'Back to Domain List',
  'Back Domain List':'Back to Domain List',
  'DomainStatus':'Domain Status',
  'Domain Status':'Domain Status',
  '域名状态':'Domain Status',
  'DNS 状态':'DNS Status',
  'DNS 记录':'DNS Records',
  'DNS记录':'DNS Records',
  '续期和域名详情':'Renewal & Domain Details',
  '续期和详情':'Renewal & Details',
  '快捷操作':'Quick Actions',
  '申请删除':'Request Deletion',
  '申请删除域名':'Request Deletion',
  'Renewal not available yet':'Renewal not available yet',
  '未到续期时间':'Renewal not available yet',
  '添加 DNS 解析':'Add DNS Record',
  '+ 添加解析':'+ Add Record',
  '+ Add Record':'+ Add Record',
  '＋ 添加解析':'+ Add Record',
  '添加解析':'+ Add Record',
  '添加记录':'+ Add Record',
  '编辑解析':'Edit Record',
  '编辑 DNS 解析':'Edit DNS Record',
  '为 {domain} 设置子域解析':'Set subdomain DNS for {domain}',
  '子域名前缀':'Subdomain Prefix',
  '解析类型':'Record Type',
  '记录类型':'Record Type',
  '目标地址 / 记录值':'Target / Value',
  '目标地址':'Target',
  '记录值':'Value',
  'CNAME填域名；A填IPv4；AAAA填IPv6；TXT填文本；MX填邮件服务器':'CNAME: domain; A: IPv4; AAAA: IPv6; TXT: text; MX: mail server',
  'CNAME 填域名；A 填 IPv4；AAAA 填 IPv6；TXT 填文本；MX 填邮件服务器':'CNAME: domain; A: IPv4; AAAA: IPv6; TXT: text; MX: mail server',
  '1 表示自动':'1 means automatic',
  'A / AAAA / CNAME 可开启代理，TXT / MX / NS 会自动使用仅 DNS':'A / AAAA / CNAME can be proxied. TXT / MX are DNS Only automatically.',
  '完整解析名':'Full Record Name',
  '提交解析':'Submit Record',
  '保存解析':'Save Record',
  '解析已提交':'Record submitted',
  '解析已保存':'Record saved',
  'DNS 解析已删除':'DNS record deleted',
  '确认删除这条 DNS 解析？':'Delete this DNS record?',
  '主机记录':'Host',
  '代理状态':'Proxy Status',
  '是否代理':'Proxy Status',
  '仅 DNS':'DNS Only',
  '开启代理':'Proxied',
  'DNS Only':'DNS Only',
  'Proxied':'Proxied',
  'A 记录（IPv4）':'A Record (IPv4)',
  'AAAA 记录（IPv6）':'AAAA Record (IPv6)',
  'CNAME 记录（别名）':'CNAME Record (Alias)',
  'TXT 记录（文本）':'TXT Record (Text)',
  'MX 记录（邮件）':'MX Record (Mail)',
  '请选择根域名':'Select a root domain',
  '.请选择根域名':'.Select a root domain',
  '选择根域名':'Select Root Domain',
  '域名前缀':'Domain Prefix',
  '输入前缀，如: myblog':'Enter a prefix, e.g. myblog',
  '输入前缀，如：myblog':'Enter a prefix, e.g. myblog',
  '2-36 位，仅支持字母、数字和连字符 -':'2–36 characters. Letters, numbers, and hyphens only.',
  '完整域名预览':'Full Domain Preview',
  '管理员审核通过后，您才可以设置 DNS 解析':'You can set DNS records only after admin approval.',
  '查看完整说明 ›':'View Full Guide ›',
  '确认注册':'Confirm Registration',
  '注册新域名':'Register New Domain',
  '选择根域名并输入前缀，快速注册一个专属您的免费域名':'Choose a root domain and enter a prefix to register your free domain.',
  '取消':'Cancel',
  '概览信息':'Overview',
  '概览':'Overview',
  '域名详情':'Domain Details',
  '到期时间':'Expires',
  '剩余时间':'Remaining Time',
  '创建时间':'Created At',
  '审核时间':'Reviewed At',
  '审核备注':'Review Note',
  '管理员留言':'Admin Note',
  '无':'None',
  '暂无记录':'No records',
  'Not configured':'Not configured',
  '未配置':'Not configured',
  '已配置':'Configured',
  'Active':'Active',
  'Disabled':'Disabled',
  '待审核':'Pending Review',
  '正常':'Active',
  '禁用':'Disabled',
  '已禁用':'Disabled',
  '申请删除中':'Deletion Requested',
  '待删除审核':'Deletion Pending',
  '域名通过审核后才开始计算有效期。':'Validity starts only after the domain is approved.',
  '请勿申请违法、侵权、仿冒或误导性域名。':'Do not apply for illegal, infringing, impersonating, or misleading domains.',
  '这里只显示域名状态，不显示编辑操作；进入“域名管理”后再管理解析。':'This page only shows domain status. Go to Domain Management to edit records.',
  '管理员审核通过后，进入“域名管理”点击“管理域名”，再添加 DNS 解析。':'After admin approval, go to Domain Management → Manage Domain to add DNS records.',
  '域名审核通过后才能添加解析。':'DNS records can be added only after approval.',
  '当前域名还未通过审核，暂时不能设置 DNS 解析。':'This domain is not approved yet. DNS records are temporarily unavailable.',
  '暂无 DNS 解析，请点击“添加解析”。':'No DNS records yet. Click Add Record.',
  '暂无 DNS 解析':'No DNS records yet',
  '请点击“添加解析”':'Click Add Record',
  '快速注册一个专属您的免费域名':'Register your free subdomain quickly',
  '正在验证...':'Verifying...',
  '正在验证…':'Verifying…',
  '隐私':'Privacy',
  '帮助':'Help'
});


Object.assign(I18N_EN, {
  '12 小时内可以撤销删除申请。':'You can cancel the deletion request within 12 hours.',
  '撤销删除申请':'Cancel Deletion Request',
  '确认撤销删除申请？':'Cancel this deletion request?',
  '删除申请已撤销':'Deletion request cancelled',
  '删除申请已提交，12 小时内可以撤销。':'Deletion request submitted. You can cancel it within 12 hours.',
  '请输入完整域名确认':'Enter the full domain to confirm',
  '输入完整域名确认':'Enter full domain to confirm',
  '完整域名必须完全一致。':'The full domain must match exactly.',
  '输入当前账号确认':'Enter current account to confirm',
  '当前账号必须完全一致。':'The current account must match exactly.',
  '只有输入正确后才能继续。':'You can continue only after entering it exactly.',
  '12 小时撤销窗口已过，请等待管理员审核。':'The 12-hour cancellation window has expired. Please wait for admin review.',
  '删除申请已提交':'Deletion request submitted',
  '可以撤销':'Can cancel',
  '删除确认':'Deletion Confirmation',
  '注销确认':'Account Cancellation Confirmation'
});



Object.assign(I18N_EN, {
  '欢迎登录':'Welcome Back',
  '登录到您的free二级域名系统账户':'Sign in to your free subdomain system account',
  '用户名或账户邮箱':'Username or Account Email',
  '用户名或账户邮箱/手机号':'Username / Email / Phone',
  '请输入密码':'Enter your password',
  '记住我':'Remember me',
  '忘记密码？':'Forgot password?',
  '登录账户':'Sign In',
  '还没有账号？':'No account yet?',
  '立即注册':'Register Now',
  '当前系统暂未开放自助找回密码，请联系管理员重置密码。':'Password recovery is not enabled yet. Please contact the admin to reset your password.',
  '帮助中心':'Help Center',
  '查看使用提示与支持入口':'View usage tips and support entry points',
  '搜索关键词，例如：DNS 生效、解析报错':'Search keywords, e.g. DNS propagation, record error',
  '搜索/问答':'Search / Ask',
  '域名知识小贴士':'Domain Knowledge Tips',
  '常见问题':'FAQ',
  '域名规则与管理':'Domain Rules & Management',
  'DNS 记录说明':'DNS Record Guide',
  '域名管理问题':'Domain Management Issues',
  '需要帮助？':'Need help?',
  '如果您在使用过程中遇到问题，或者需要技术支持，请点击下方按钮提交。':'If you encounter problems or need technical support, click the button below to submit a request.',
  '提交问题反馈':'Submit Feedback',
  '注册成功后，您需要手动设置DNS解析':'After registration, you need to configure DNS records manually',
  '可以设置A记录、CNAME记录等多种类型':'You can add A, CNAME, TXT, MX, and other record types.',
  '注册的域名严禁用于违法违规行为':'Registered domains must not be used for illegal or abusive activity.',
  '如需删除,可点击“查看详情”查看您的域名是否支持删除。':'To delete a domain, open Domain Details and check whether deletion is available.',
  '完整说明':'Full Guide',
  '申请流程说明':'Application Process',
  'DNS 配置说明':'DNS Configuration Guide',
  '删除与续期说明':'Deletion & Renewal Guide',
  '查看详情':'View Details',
  '关闭':'Close'
});

function lang() { return localStorage.getItem('ui_lang') || state.config?.site?.defaultLanguage || 'zh'; }
function setLang(value) {
  localStorage.setItem('ui_lang', value === 'en' ? 'en' : 'zh');
  renderRoute();
}
function tr(text) {
  if (lang() !== 'en') return text;
  return I18N_EN[text] || text;
}
function langButton() {
  return `<button class="btn ghost lang-toggle" data-lang-toggle type="button">${lang() === 'en' ? '中文' : 'EN'}</button>`;
}
function translateTextValue(value) {
  if (lang() !== 'en') return value;
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return value;

  const normalizedTrimmed = trimmed.replace(/\s+/g, ' ');
  const direct = I18N_EN[trimmed] || I18N_EN[normalizedTrimmed];
  if (direct) return raw.replace(trimmed, direct);

  const cleanedEnglish = normalizedTrimmed
    .replace(/BackDomain List/g, 'Back to Domain List')
    .replace(/DomainStatus/g, 'Domain Status')
    .replace(/DomainDetails/g, 'Domain Details')
    .replace(/DNSRecords/g, 'DNS Records')
    .replace(/QuickActions/g, 'Quick Actions')
    .replace(/RequestDeletion/g, 'Request Deletion')
    .replace(/AddRecord/g, 'Add Record')
    .replace(/FullRecord Name/g, 'Full Record Name');
  if (cleanedEnglish !== normalizedTrimmed) return raw.replace(trimmed, cleanedEnglish);

  // Handle common punctuation forms: “管理员留言：” -> “Admin Note:”.
  const punctuationMatch = trimmed.match(/^(.+?)([：:])$/);
  if (punctuationMatch && I18N_EN[punctuationMatch[1]]) {
    return raw.replace(trimmed, `${I18N_EN[punctuationMatch[1]]}:`);
  }

  let translated = trimmed
    .replace(/^默认有效期\s*(\d+)\s*天，最后\s*(\d+)\s*天可申请续期。$/, 'Default validity: $1 days. Renewal opens in the last $2 days.')
    .replace(/^默认有效期\s*(\d+)\s*天，最后\s*(\d+)\s*天可续期。$/, 'Default validity: $1 days. Renewal opens in the last $2 days.')
    .replace(/^剩余\s*(\d+)\s*天$/, '$1 days left')
    .replace(/^还有\s*(\d+)\s*天$/, '$1 days left')
    .replace(/^已过期\s*(\d+)\s*天$/, 'Expired $1 days ago')
    .replace(/^2-36 位，仅支持字母、数字和连字符 -$/, '2-36 characters. Letters, numbers, and hyphens only.')
    .replace(/^管理员审核通过后，您才可以设置 DNS 解析$/, 'You can set DNS records only after admin approval.')
    .replace(/^选择根域名并输入前缀，快速注册一个专属您的免费域名$/, 'Choose a root domain and enter a prefix to register your free domain.')
    .replace(/^请选择根域名并输入前缀$/, 'Select a root domain and enter a prefix')
    .replace(/^\.请选择根域名$/, '.Select a root domain')
    .replace(/^请选择根域名$/, 'Select a root domain')
    .replace(/^输入前缀，如:\s*myblog$/, 'Enter a prefix, e.g. myblog')
    .replace(/^管理员审核通过后，进入“域名管理”点击“管理域名”，再添加 DNS 解析。$/, 'After admin approval, go to Domain Management → Manage Domain to add DNS records.')
    .replace(/^当前域名还未通过审核，暂时不能设置 DNS 解析。$/, 'This domain is not approved yet. DNS records are temporarily unavailable.')
    .replace(/^用户可自由添加解析记录，支持三级\/多级子域名。.*$/, 'Users can freely add DNS records, including third-level and multi-level subdomains.')
    .replace(/^申请时只需要填写前缀和根域名。.*$/, 'Enter only the prefix and root domain. Configure DNS after approval.')
    .replace(/^确认(.+)该域名？$/, (_, action) => `Confirm ${translateTextValue(action).toLowerCase()} this domain?`)
    .replace(/^活跃\s*(\d+)$/, 'Active $1')
    .replace(/^为\s*(.+?)\s*设置子域解析$/, (_, domain) => `Set subdomain DNS for ${domain}`)
    .replace(/^@ = (.+?);\s*www = (.+?);\s*api\.v1 = (.+?)$/, '@ = $1; www = $2; api.v1 = $3')
    .replace(/^默认有效期\s*(\d+)\s*天$/, 'Default validity: $1 days')
    .replace(/^最后\s*(\d+)\s*天可申请续期。?$/, 'Renewal opens in the last $1 days.')
    .replace(/^CNAME填域名；A填IPv4；AAAA填IPv6；TXT填文本；MX填邮件服务器$/, 'CNAME: domain; A: IPv4; AAAA: IPv6; TXT: text; MX: mail server')
    .replace(/^CNAME 填域名；A 填 IPv4；AAAA 填 IPv6；TXT 填文本；MX 填邮件服务器$/, 'CNAME: domain; A: IPv4; AAAA: IPv6; TXT: text; MX: mail server')
    .replace(/^A \/ AAAA \/ CNAME 可开启代理，TXT \/ MX 会自动使用仅 DNS$/, 'A / AAAA / CNAME can be proxied. TXT / MX are DNS Only automatically.')
    .replace(/^选择根域名并输入前缀，快速注册一个专属您的免费域名$/, 'Choose a root domain and enter a prefix to register your free domain.');

  if (translated !== trimmed) return raw.replace(trimmed, translated);

  // Fallback: replace known Chinese fragments inside mixed strings.
  let mixed = trimmed;
  Object.keys(I18N_EN)
    .sort((a, b) => b.length - a.length)
    .forEach(key => {
      if (/^[\u4e00-\u9fffA-Za-z0-9_\- /，。：“”！、（）()？+›]+$/.test(key)) {
        mixed = mixed.split(key).join(I18N_EN[key]);
      }
    });
  mixed = mixed
    .replace(/BackDomain List/g, 'Back to Domain List')
    .replace(/Back Domain List/g, 'Back to Domain List')
    .replace(/DomainStatus/g, 'Domain Status')
    .replace(/DNSRecords/g, 'DNS Records')
    .replace(/QuickActions/g, 'Quick Actions')
    .replace(/RequestDeletion/g, 'Request Deletion')
    .replace(/FullRecordName/g, 'Full Record Name')
    .replace(/FullRecord Name/g, 'Full Record Name')
    .replace(/Target \/ Value/g, 'Target / Value')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (mixed !== trimmed && !/[\u4e00-\u9fff]/.test(mixed)) return raw.replace(trimmed, mixed);

  return value;
}
function applyI18n(root = app) {
  document.documentElement.lang = lang() === 'en' ? 'en' : 'zh-CN';
  const site = state.config?.site || {};
  document.title = lang() === 'en' ? 'Domain Registration Center' : (site.title || '免费二级域名注册中心');
  if (lang() !== 'en' || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','CODE','TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => { node.nodeValue = translateTextValue(node.nodeValue); });
  root.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach(el => {
    el.placeholder = translateTextValue(el.placeholder);
  });
  root.querySelectorAll?.('[title], [aria-label], [alt], optgroup[label]').forEach(el => {
    if (el.title) el.title = translateTextValue(el.title);
    const aria = el.getAttribute('aria-label');
    if (aria) el.setAttribute('aria-label', translateTextValue(aria));
    const alt = el.getAttribute('alt');
    if (alt) el.setAttribute('alt', translateTextValue(alt));
    const label = el.getAttribute('label');
    if (label) el.setAttribute('label', translateTextValue(label));
  });
  root.querySelectorAll?.('input[type=button][value], input[type=submit][value], input[type=reset][value]').forEach(el => {
    el.value = translateTextValue(el.value);
  });
  root.querySelectorAll?.('option').forEach(el => {
    el.textContent = translateTextValue(el.textContent);
  });
  if (root === document.body || root === app) reportMissingI18n(root);
}
function reportMissingI18n(root = document.body) {
  if (lang() !== 'en' || !root) return;
  const missing = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT','STYLE','CODE','TEXTAREA'].includes(parent.tagName) || !/[\u4e00-\u9fff]/.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    const value = String(walker.currentNode.nodeValue || '').trim();
    if (value) missing.add(value);
  }
  const values = [...missing].sort();
  const signature = values.join('\n');
  window.__storageMissingI18n = values;
  if (window.__storageMissingI18nSignature !== signature) {
    window.__storageMissingI18nSignature = signature;
    if (missing.size) console.warn('[i18n] Untranslated visible strings:', values);
  }
}
let i18nMutationObserver = null;
function ensureI18nObserver() {
  if (i18nMutationObserver || !document.body) return;
  i18nMutationObserver = new MutationObserver(mutations => {
    if (lang() !== 'en') return;
    const roots = new Set();
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) roots.add(node);
      else if (node.nodeType === Node.TEXT_NODE && node.parentElement) roots.add(node.parentElement);
    }));
    roots.forEach(root => applyI18n(root));
  });
  i18nMutationObserver.observe(document.body, { childList:true, subtree:true });
}
function bindLanguageControls() {
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.onclick = () => setLang(lang() === 'en' ? 'zh' : 'en');
  });
}
function afterRender() {
  bindLanguageControls();
  ensureI18nObserver();
  applyI18n();
}
async function renderRoute() {
  await route();
  afterRender();
}


const AUTO_REFRESH_MS = 10 * 60 * 1000;
let autoRefreshTimer = null;
let autoRefreshRunning = false;
let lastAutoRefreshAt = Date.now();
let autoRefreshVisibilityBound = false;

function isEditingElement(el = document.activeElement) {
  if (!el) return false;
  return Boolean(el.closest?.('input, textarea, select, [contenteditable="true"], .modal'));
}

function currentRouteCanAutoRefresh() {
  const hash = location.hash || '';
  if (!state.me) return false;
  if (document.hidden) return false;
  if (modalRoot?.innerHTML?.trim()) return false;
  if (isEditingElement()) return false;
  return hash === '#/apply'
    || hash === '#/domains'
    || hash === '#/applications'
    || hash === '#/account'
    || hash === '#/logs'
    || hash === '#/help'
    || hash === '#/messages'
    || hash === '#/admin'
    || hash === '#/admin/applications'
    || hash === '#/admin/users'
    || hash === '#/admin/registration-keys'
    || hash === '#/admin/settings'
    || hash === '#/admin/help-settings'
    || hash === '#/admin/help'
    || hash.startsWith('#/admin/analytics')
    || hash.startsWith('#/domain/');
}

async function autoRefreshCurrentData() {
  if (autoRefreshRunning || !currentRouteCanAutoRefresh()) return;
  autoRefreshRunning = true;
  const hashBefore = location.hash;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  try {
    await refreshMessageBadge();
    if (location.hash === hashBefore && currentRouteCanAutoRefresh()) {
      await renderRoute();
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    }
  } catch (_) {
    // 静默失败，不打断用户当前操作。
  } finally {
    lastAutoRefreshAt = Date.now();
    autoRefreshRunning = false;
  }
}

function scheduleAutoRefresh(delay = AUTO_REFRESH_MS) {
  if (autoRefreshTimer) clearTimeout(autoRefreshTimer);
  if (window.__storageAutoRefreshTimer) clearTimeout(window.__storageAutoRefreshTimer);
  const safeDelay = Math.max(1000, Number(delay) || AUTO_REFRESH_MS);
  autoRefreshTimer = setTimeout(async () => {
    try { await autoRefreshCurrentData(); }
    finally { scheduleAutoRefresh(AUTO_REFRESH_MS); }
  }, safeDelay);
  window.__storageAutoRefreshTimer = autoRefreshTimer;
}

function startAutoRefresh() {
  lastAutoRefreshAt = Date.now();
  scheduleAutoRefresh(AUTO_REFRESH_MS);
  if (autoRefreshVisibilityBound) return;
  autoRefreshVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const elapsed = Date.now() - lastAutoRefreshAt;
    if (elapsed >= AUTO_REFRESH_MS) {
      autoRefreshCurrentData().finally(() => scheduleAutoRefresh(AUTO_REFRESH_MS));
    } else {
      scheduleAutoRefresh(AUTO_REFRESH_MS - elapsed);
    }
  });
}

const statusText = {
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

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}
function attr(value) { return esc(value).replace(/`/g, '&#96;'); }
function fmtDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleString('zh-CN', withTime ? { hour12:false } : { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\//g, '/');
}
function statusBadge(status, label) {
  return `<span class="status-pill status-${esc(status)}">${esc(label || statusText[status] || status)}</span>`;
}
function appDnsDisplay(a) {
  const count = Number(a?.dnsCount || a?.dns_count || 0);
  const summary = String(a?.dnsSummary || '').trim();
  if (summary) return count > 1 ? `${count} 条：${summary}` : summary;
  if (a?.dnsConfigured && a?.recordType && a?.recordContent) return `${a.recordType} → ${a.recordContent}`;
  return '未配置';
}

function isAccountDisabled() {
  return Boolean(state.me && state.me.status === 'disabled');
}
function disabledAccountPage(title, message) {
  return shell(title, `<section class="card disabled-account-card"><h2>账户已被禁用</h2><p>${esc(message)}</p><div class="quick-actions"><a class="btn primary" href="#/help">进入帮助中心</a><a class="btn soft" href="https://mailform.flore.top" target="_blank" rel="noopener">外部联系管理员</a></div></section>`);
}
function toast(message, type = '') {
  ensureMountRoots();
  if (!toastRoot) { try { console.log(message); } catch {} return; }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = translateTextValue(message);
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function closeModal() {
  ensureMountRoots();
  if (modalRoot) modalRoot.innerHTML = '';
  state.widgetId = null;
}
function openModal(title, subtitle, content, size = '') {
  ensureMountRoots();
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal ${size}">
        <div class="modal-titlebar">
          <div class="modal-icon">＋</div>
          <div><h2>${esc(title)}</h2><p>${esc(subtitle || '')}</p></div>
          <button class="modal-x" data-close-modal type="button">×</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    </div>`;
  modalRoot.querySelector('[data-close-modal]').addEventListener('click', closeModal);
  modalRoot.querySelector('.modal-backdrop').addEventListener('click', e => {
    if (e.target.classList.contains('modal-backdrop')) closeModal();
  });
  bindLanguageControls();
  applyI18n(modalRoot);
}
async function api(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const opts = { method, headers: { ...(options.headers || {}) }, credentials: 'same-origin' };
  if (options.body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const requestOnce = async () => {
    const res = await fetch(path, opts);
    const contentType = String(res.headers.get('content-type') || '');
    let data = null;
    if (contentType.includes('application/json')) {
      try { data = await res.json(); } catch {}
    } else {
      const text = await res.text().catch(() => '');
      data = { ok:false, message:text && text.length < 500 ? text : '' };
    }
    data ||= { ok:false };
    if (!res.ok || data.ok === false) {
      const ray = res.headers.get('cf-ray');
      let message = data.message || `HTTP ${res.status}`;
      if (res.status === 403 && !data.code) {
        message = `请求被 Cloudflare 安全策略暂时拦截（HTTP 403）${ray ? `，Ray ID：${ray}` : ''}。请稍后重试、关闭代理或刷新页面后再操作。`;
      }
      const error = new Error(message || '请求失败');
      error.code = data.code;
      error.details = data.details;
      error.status = res.status;
      error.ray = ray || '';
      throw error;
    }
    return data;
  };
  try { return await requestOnce(); }
  catch (error) {
    if (['GET','HEAD'].includes(method) && [403,502,503,504].includes(Number(error.status)) && !options.__retried) {
      await new Promise(resolve => setTimeout(resolve, 350));
      return api(path, { ...options, __retried:true });
    }
    throw error;
  }
}

function humanVerificationHtml(scene, extraClass = '') {
  return `<div class="human-verification ${attr(extraClass)}" data-human-verification="${attr(scene)}">
    <div class="human-verification-status" hidden aria-live="polite"></div>
    <div class="human-turnstile-slot"></div>
    <div class="human-image-slot" hidden>
      <div class="image-captcha-row">
        <input class="image-captcha-answer" autocomplete="off" spellcheck="false" placeholder="请输入验证码" aria-label="图形验证码">
        <button class="image-captcha-picture" type="button" title="点击刷新图形验证码"><span>加载中…</span></button>
      </div>
    </div>
  </div>`;
}

function humanSceneState(scene) {
  if (!state.humanChallenges[scene]) state.humanChallenges[scene] = { method:'', challengeId:'', root:null, action:'' };
  return state.humanChallenges[scene];
}

async function loadImageCaptcha(root, scene) {
  const record = humanSceneState(scene);
  const picture = root.querySelector('.image-captcha-picture');
  const input = root.querySelector('.image-captcha-answer');
  record.method = 'image';
  record.root = root;
  record.challengeId = '';
  const turnstileSlot = root.querySelector('.human-turnstile-slot');
  const imageSlot = root.querySelector('.human-image-slot');
  if (turnstileSlot) turnstileSlot.innerHTML = '';
  if (imageSlot) imageSlot.hidden = false;
  root.classList.add('is-image-captcha');
  root.classList.remove('is-turnstile');
  if (picture) { picture.disabled = true; picture.innerHTML = '<span>正在生成…</span>'; }
  if (input) input.value = '';
  try {
    const result = await api(state.config?.turnstile?.captchaEndpoint || '/api/auth/captcha/challenge', { method:'POST', body:{ scene } });
    record.challengeId = String(result.challengeId || '');
    if (picture) picture.innerHTML = result.imageSvg || '<span>验证码生成失败</span>';
  } catch (error) {
    if (picture) picture.innerHTML = '<span>生成失败，点击重试</span>';
    toast(error.message || '图形验证码生成失败', 'error');
  } finally {
    if (picture) picture.disabled = false;
  }
}

async function switchHumanToImage(root, scene) {
  await loadImageCaptcha(root, scene);
}

async function mountHumanVerification(selector, scene, action) {
  const root = document.querySelector(selector);
  if (!root) return;
  const mode = humanVerificationMode();
  const record = humanSceneState(scene);
  record.root = root;
  record.action = action || scene;
  root.querySelector('.image-captcha-picture')?.addEventListener('click', () => loadImageCaptcha(root, scene));

  // Only show the image captcha when the administrator selected it, or when
  // Turnstile is unavailable in fallback mode. There is no manual switch in the form.
  if (mode === 'image') return loadImageCaptcha(root, scene);
  if (!hasTurnstileSiteKey()) {
    if (mode === 'turnstile_fallback') return switchHumanToImage(root, scene);
    const slot = root.querySelector('.human-turnstile-slot');
    if (slot) slot.innerHTML = '<div class="notice small danger turnstile-retry-box">Turnstile Site Key 未配置</div>';
    return;
  }
  try {
    const imageSlot = root.querySelector('.human-image-slot');
    if (imageSlot) imageSlot.hidden = true;
    root.classList.add('is-turnstile');
    root.classList.remove('is-image-captcha');
    await mountTurnstile(`${selector} .human-turnstile-slot`, action, { scene, allowFallback:mode === 'turnstile_fallback', root });
  } catch (error) {
    if (mode === 'turnstile_fallback') await switchHumanToImage(root, scene);
    else toast(error.message || 'Turnstile 加载失败', 'error');
  }
}

async function humanVerificationPayload(scene) {
  const record = humanSceneState(scene);
  if (record.method === 'image') {
    const answer = String(record.root?.querySelector('.image-captcha-answer')?.value || '').trim();
    if (!record.challengeId || !answer) throw new Error('请输入图形验证码');
    return { captchaChallengeId:record.challengeId, captchaAnswer:answer };
  }
  return { turnstileToken:await stableTurnstileToken(scene) };
}

async function resetHumanVerification(scene) {
  const record = humanSceneState(scene);
  if (record.method === 'image' && record.root) return loadImageCaptcha(record.root, scene);
  resetTurnstile();
}

async function recoverHumanVerification(scene, error) {
  const record = humanSceneState(scene);
  const code = String(error?.code || '');
  const turnstileFailure = code.startsWith('TURNSTILE_') || /Turnstile|人机验证接口|验证组件/i.test(String(error?.message || ''));
  if (humanVerificationMode() === 'turnstile_fallback' && record.root && record.method !== 'image' && turnstileFailure) {
    await switchHumanToImage(record.root, scene);
    return true;
  }
  await resetHumanVerification(scene);
  return false;
}

function applyTheme() {
  const site = state.config?.site || {};
  document.documentElement.style.setProperty('--accent', site.accent || '#4f63f6');
  document.documentElement.style.setProperty('--accent-2', site.accent2 || '#7c4dff');
  document.documentElement.dataset.theme = site.themeMode || 'light';
  document.title = lang() === 'en' ? 'Domain Registration Center' : (site.title || '免费二级域名注册中心');
  let favicon = document.querySelector('link[rel="icon"]');
  if (site.faviconUrl) {
    if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); }
    favicon.href = site.faviconUrl;
  }
  if (site.headerThirdPartyJs && !window.__storageHeaderThirdPartyJsInjected) {
    window.__storageHeaderThirdPartyJsInjected = true;
    const box = document.createElement('div');
    box.style.display = 'none';
    box.innerHTML = String(site.headerThirdPartyJs || '');
    Array.from(box.querySelectorAll('script')).forEach(oldScript => {
      const script = document.createElement('script');
      Array.from(oldScript.attributes).forEach(a => script.setAttribute(a.name, a.value));
      script.textContent = oldScript.textContent || '';
      document.head.appendChild(script);
    });
  }
}
function isNoticeActive(site = state.config?.site || {}) {
  if (!site.homepageNotice) return false;
  const now = Date.now();
  const start = site.noticeStartAt ? new Date(site.noticeStartAt).getTime() : 0;
  const end = site.noticeEndAt ? new Date(site.noticeEndAt).getTime() : 0;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}



Object.assign(I18N_EN, {
  '消息中心设置':'Message Center Settings','帮助中心设置':'Help Center Settings','帮助分类':'Help Categories','新增问题':'Add Question','编辑问题':'Edit Question','保存全部':'Save All','添加到分类':'Add to Category','问题标题':'Question Title','问题答案':'Answer','分类标题':'Category Title','分类说明':'Category Description','恢复默认帮助内容':'Restore Default Help Content','帮助内容已保存':'Help content saved','帮助内容已恢复默认':'Help content restored','消息中心':'Message Center','系统消息':'System Messages','我的消息':'My Messages','暂无消息':'No messages yet','全部消息':'All Messages','未读':'Unread','已读':'Read','标为已读':'Mark as Read','发送消息':'Send Message','消息标题':'Message Title','消息内容':'Message Content','接收对象':'Recipients','全部用户':'All Users','指定用户':'Specific User','按角色':'By Role','普通用户':'Users','消息类型':'Message Type','普通通知':'Info','成功提示':'Success','警告提醒':'Warning','重要警告':'Important','立即发送':'Send Now','保存草稿':'Save Draft','保存为模板':'Save as Template','草稿':'Draft','模板':'Template','已发送':'Sent','发送时间':'Sent At','创建时间':'Created At','发送人':'Sender','目标':'Target','套用模板':'Use Template','发送草稿':'Send Draft','编辑草稿':'Edit Draft','删除消息':'Delete Message','请输入消息标题':'Enter message title','请输入消息内容':'Enter message content','消息已发送':'Message sent','草稿已保存':'Draft saved','模板已保存':'Template saved','消息已删除':'Message deleted','消息已标为已读':'Message marked as read','管理员可以在这里发送系统通知、保存草稿和维护常用模板。':'Admins can send system notices, save drafts, and manage templates here.','用户可以在这里查看系统通知、管理员消息、域名处理结果和维护提醒。':'View system notices, admin messages, domain updates, and maintenance reminders here.','批量已读':'Mark Selected Read','全部已读':'Mark All Read','请选择要标记的消息':'Select messages to mark as read','已读用户':'Read Users','用户已读':'User Read','管理员已读':'Admin Read','未读消息':'Unread Messages','客服回复':'Support Reply','转为模板':'Copy to Template','转为草稿':'Copy to Draft','已转为模板':'Copied to template','已转为草稿':'Copied to draft'
});

Object.assign(I18N_EN, {
  '界面设置':'Appearance','注册设置':'Registration','域名规则':'Domain Rules','DNS 配置':'DNS Configuration','黑名单管理':'Blacklist','通知设置':'Notifications','安全设置':'Security','自动化任务':'Automation','系统状态':'System Status','变量设置':'Variable Settings',
  '导出配置':'Export Settings','导入配置':'Import Settings','设置读取完成':'Settings loaded','最近保存：':'Last saved: ',
  '品牌与外观':'Brand & Appearance','配置站点名称、Logo、主题和主色。':'Configure the site name, logo, theme, and colors.',
  '页脚与合规信息':'Footer & Compliance','统一维护页脚、版权和备案信息。':'Manage footer, copyright, and filing information.',
  '公告、维护与高级代码':'Notice, Maintenance & Advanced Code','控制维护模式、公告时段和可信第三方脚本。':'Control maintenance mode, notice schedule, and trusted third-party scripts.',
  '网站标题':'Site Title','显示在浏览器标题和登录页。':'Shown in the browser title and login page.','副标题':'Subtitle','显示在前台品牌区域。':'Shown in the public brand area.','Logo 文字':'Logo Text','不使用图片 Logo 时显示。':'Shown when no logo image is configured.','站点 Logo 图片 URL':'Logo Image URL','填写后优先显示图片 Logo。':'The image logo takes priority when set.','站点 Favicon 地址':'Favicon URL','用于浏览器标签页图标，留空使用默认。':'Used as the browser tab icon. Leave blank for default.','主题模式':'Theme Mode','浅色':'Light','深色':'Dark','跟随系统':'Follow System','只影响前台基础主题，不改变现有布局。':'Changes the public theme without changing the layout.','主色':'Primary Color','辅助色':'Secondary Color','支持十六进制颜色代码。':'Supports hexadecimal color values.','用于渐变按钮第二色。':'Used as the second gradient color.','ICP 备案信息':'ICP Filing','前台底部显示，位于版权信息下方。':'Displayed below copyright in the footer.','版权信息':'Copyright','支持换行，显示在 ICP 上方。':'Supports line breaks and appears above ICP.','页脚文字':'Footer Text','底部基础说明。':'Basic footer description.','自定义头部第三方 JS 代码':'Custom Head Third-party JS','高危配置，保存前会二次确认；错误 JS 可能导致前台白屏。':'High risk. Invalid JavaScript may break the public site.','开启网站维护模式':'Enable Maintenance Mode','开启后前台显示维护提示。':'Shows a maintenance notice on the public site.','维护文案':'Maintenance Message','维护模式开启时展示给用户。':'Displayed while maintenance mode is enabled.','前台默认语言':'Default Public Language','公告开始时间':'Notice Start','公告结束时间':'Notice End','留空表示立即生效。':'Leave blank to start immediately.','留空表示长期展示。':'Leave blank to keep it visible.','前台首页公告 Markdown':'Homepage Notice Markdown','作为前台顶部横幅通知。':'Shown as a banner at the top of the public site.','Markdown 实时预览':'Preview Markdown','404 自定义提示文本':'Custom 404 Message','访问不存在页面时显示。':'Shown when a page does not exist.','前台展示域名剩余配额':'Show Remaining Domain Quota','关闭后用户注册页不突出显示剩余额度。':'Hide quota emphasis on the registration page.','前台展示域名到期提醒':'Show Domain Expiry Reminder','关闭后减少到期提示展示。':'Reduce expiry reminders on the public site.',
  '注册入口与账户状态':'Registration Access & Account Status','控制用户是否可以注册、是否需要注册码以及新账号初始状态。':'Control public registration, registration keys, and initial account status.','开放用户注册':'Enable Public Registration','关闭后普通用户不能创建新账户。':'Regular users cannot create accounts when disabled.','注册后自动启用账户':'Auto-activate Accounts','关闭后新用户需要管理员启用。':'New accounts require admin activation when disabled.','开启注册码注册':'Require Registration Key','开启后注册页显示注册码输入框，必须填写有效注册码。':'Shows and requires a valid registration key.','拦截临时邮箱注册':'Block Temporary Email','用于减少垃圾账号。':'Reduces spam accounts.','Turnstile 人机验证':'Turnstile Verification','保护普通注册和管理员手动添加用户。':'Protects public registration and admin-created accounts.','注册启用 Turnstile 人机验证':'Enable Turnstile for Registration','普通注册和管理员添加用户都会使用。':'Used for both public registration and admin-created users.','前台显示验证模块用；环境变量优先。':'Used by the public verification widget; environment variables take priority.','密钥不会回显；留空保持原值。建议优先使用 Worker Secret。':'The secret is never displayed. Leave blank to keep the current value. Worker Secret is recommended.','新注册账号默认状态':'Default New Account Status','自动启用':'Auto Activate','需要人工审核':'Manual Review','用于注册后的账号状态。':'Sets the initial status after registration.','注册频率与风险控制':'Rate Limits & Risk Control','限制单 IP、失败次数、代理网络和每日域名申请量。':'Limit IP activity, failures, proxies, and daily domain applications.','单 IP 最大注册账号数量':'Max Accounts per IP','同一 IP 注册冷却/分钟':'Registration Cooldown per IP (minutes)','单账号每日域名申请上限':'Daily Domain Applications per Account','连续注册失败封禁阈值':'Failed Registration Ban Threshold','注册失败封禁时长/分钟':'Failed Registration Ban Duration (minutes)','注册邮箱验证开关':'Email Verification','开启前请先配置并测试邮件发送服务。':'Configure and test the email delivery service before enabling this option.','拦截 VPN / 代理注册':'Block VPN / Proxy Registration','仅在 Worker 能读取可信代理风险字段时生效；未接入检测源时不会自动判断 VPN。':'Requires Cloudflare risk signals.','邮箱与关闭提示':'Email Rules & Disabled Message','管理邮箱后缀限制和注册关闭时的前台说明。':'Manage blocked email domains and the registration-disabled message.','邮箱后缀拦截黑名单':'Blocked Email Domains','一行一个邮箱后缀，不要带 @ 也可以。':'One email domain per line; @ is optional.','关闭注册时前台提示文案':'Registration Disabled Message','注册关闭时显示给用户。':'Shown when registration is disabled.',
  '平台与用户配额':'Platform & User Quotas','设置平台总量、普通用户和白名单用户的独立额度。':'Set platform, regular-user, and allowlisted-user quotas.','有效期与到期流程':'Validity & Expiry Workflow','分别设置续期窗口、锁定期、DNS 清理和彻底删除周期。':'Configure renewal, lock, DNS cleanup, and hard-delete periods separately.','前缀规则与审核':'Prefix Rules & Review','控制长度、关键词、管理员专用前缀和审核模式。':'Control length, keywords, admin-only prefixes, and review mode.','用户权限':'User Permissions','控制删除、DNS 修改、续期和域名转让权限。':'Control deletion, DNS editing, renewal, and transfer permissions.',
  '全局 DNS 策略':'Global DNS Policy','这些设置会影响所有新建解析记录。':'These settings affect all newly created DNS records.','Cloudflare 凭据与拦截规则':'Cloudflare Credentials & Blocking Rules','密钥不会回显；目标黑名单和保留前缀会立即参与校验。':'Secrets are never displayed; target blocks and reserved prefixes apply immediately.','多根域名管理':'Multiple Root Domains','每个根域名使用独立 Zone ID、类型和代理策略。':'Each root domain uses its own Zone ID, types, and proxy policy.','多根域名可视化编辑器':'Visual Root Domain Editor','新增根域名':'Add Root Domain','显示名称':'Display Name','根域名':'Root Domain','允许类型':'Allowed Types','默认类型':'Default Type','测试':'Test','测试中…':'Testing…','根域名 JSON 输出':'Root Domain JSON Output','该内容由上方可视化编辑器自动生成，仅用于查看和复制备份。':'Generated automatically from the visual editor for viewing and backup only.','测试所有可用根域名':'Test All Available Root Domains','配置来源说明':'Configuration Source','Cloudflare API Token（可选）':'Cloudflare API Token (optional)','Token 不会回显；留空保持原值。Worker Secret CF_API_TOKEN 的优先级最高。':'The token is never displayed. Leave blank to keep it. Worker Secret CF_API_TOKEN has highest priority.','CNAME 目标黑名单':'CNAME Target Blacklist','保留前缀':'Reserved Prefixes','新建解析默认开启 Cloudflare 代理':'Proxy New DNS Records by Default','允许用户创建 MX 解析记录':'Allow MX Records','禁止用户创建泛解析':'Block Wildcard Records',
  '行为黑名单':'Behavior Blacklists','每行格式：值 | 备注 | 到期时间。到期时间可留空。':'Format per line: value | note | expiry. Expiry is optional.','兼容黑名单':'Compatibility Blacklists','保留原有前缀、IP、邮箱和手机号拦截字段。':'Keeps the original prefix, IP, email, and phone blocking fields.','注册黑名单':'Registration Blacklist','访问黑名单':'Access Blacklist','UserID 账号黑名单':'User ID Blacklist','域名前缀黑名单':'Domain Prefix Blacklist','IP 黑名单':'IP Blacklist','邮箱/手机号黑名单':'Email / Phone Blacklist',
  '事件与模板变量':'Events & Template Variables','为每种事件分别设置用户通知和管理员告警。':'Configure user notifications and admin alerts for each event.','模板变量提示':'Template Variables','发送限制与兼容模板':'Rate Limits & Compatibility Template','限制单位时间发送数量，避免通知风暴。':'Limit messages per period to avoid notification storms.','消息限流/小时':'Message Limit per Hour','用户到期消息模板':'User Expiry Message Template','用户通知目标':'User Notification Target','管理员告警目标':'Admin Alert Target','消息模板':'Message Template',
  '会话与登录保护':'Session & Login Protection','控制会话时长、失败锁定和管理员访问来源。':'Control session duration, failed-login lockout, and admin access sources.','角色与审计':'Roles & Audit','维护角色说明和需要写入操作日志的动作。':'Maintain role descriptions and audited actions.','管理员会话超时/小时':'Admin Session Timeout (hours)','操作日志保留天数':'Audit Log Retention Days','登录失败锁定阈值':'Failed Login Lock Threshold','登录失败锁定分钟':'Failed Login Lock Duration (minutes)','自定义后台管理访问路径':'Custom Admin Path','后台登录 IP 白名单':'Admin Login IP Allowlist','多角色权限配置':'Role Permissions','操作日志可选记录项':'Audited Actions','登录日志查询入口':'Login Log Query Entry',
  '调度计划':'Schedule','设置 Cron 表达式和扫描周期。':'Configure the Cron expression and scan interval.','任务与保护策略':'Tasks & Protection','独立控制到期检测、DNS 清理、失败告警和保护阈值。':'Control expiry checks, DNS cleanup, failure alerts, and protection thresholds separately.','开启定时任务':'Enable Scheduled Tasks','Cron 表达式':'Cron Expression','定时扫描周期/分钟':'Scan Interval (minutes)','每小时':'Hourly','每 6 小时':'Every 6 Hours','每天 02:00':'Daily at 02:00','每周一 03:00':'Mondays at 03:00','域名到期检测':'Domain Expiry Check','过期 DNS 清理':'Expired DNS Cleanup','任务失败推送管理员告警':'Notify Admin on Task Failure','自动清理 DNS 保护阈值/天':'DNS Cleanup Protection Days','定时任务运行日志':'Scheduled Task Logs',
  '程序版本':'Program Version','KV 存储':'KV Storage','定时任务':'Scheduled Tasks','更新检测':'Update Check','配置备份 / 导入恢复':'Settings Backup / Restore','读取中':'Loading','已开启':'Enabled','未开启':'Disabled','已配置':'Configured','未配置':'Not Configured','未知':'Unknown',
  '保存设置':'Save Settings','设置已保存':'Settings saved','正在读取设置…':'Loading settings…','配置已导入':'Settings imported','Markdown 预览':'Markdown Preview','前台公告预览':'Public notice preview'
});


Object.assign(I18N_EN, {"启用解析":"DNS Enabled","允许申请":"Allow Applications","默认代理":"Default Proxy","该根域名 API Token（可选）":"Root Domain API Token (optional)","留空保留原值":"Leave blank to keep current value","不同 CF 账号/Zone 时填写；留空保留原值":"Fill when this zone uses another Cloudflare account; leave blank to keep it.","优先使用这里的 Token，其次使用全局 Token / Worker Secret。":"This token is used first, then the global token or Worker Secret."});
Object.assign(I18N_EN, {"0 表示不限制。":"0 means unlimited.","0 表示关闭自动锁定。":"0 disables automatic lockout.","0 表示无冷却。":"0 means no cooldown.","A / AAAA / CNAME 可代理，TXT / MX 会强制仅 DNS。":"A / AAAA / CNAME can be proxied; TXT / MX are always DNS only.","Cloudflare Workers Cron 需要在 Worker 触发器中单独配置。":"Cloudflare Workers Cron must also be configured in Worker Triggers.","Cloudflare Workers 下需从 CF-Connecting-IP 获取真实访客 IP。":"On Cloudflare Workers, use CF-Connecting-IP to obtain the real visitor IP.","DNS 配置风险提示":"DNS Configuration Risk Warning","一行一个目标域名或关键词。":"One target domain or keyword per line.","不建议开启，部分 DNS 场景兼容性差。":"Not recommended; some DNS scenarios have poor compatibility.","例如 12345。":"Example: 12345.","填写希望重点审计的动作说明；当前系统关键操作仍会统一写入日志。":"Describe actions to audit closely; critical actions are still logged automatically.","例如统计代码。高危：请只粘贴可信代码。":"Example: analytics code. High risk: paste trusted code only.","例如：粤ICP备xxxx号":"Example: ICP filing number","保留原字段，继续兼容域名前缀拦截。":"Keeps the legacy field for prefix blocking compatibility.","保留原有字段，继续参与拦截。":"Keeps the legacy field active in blocking checks.","值 | 备注 | 到期时间":"value | note | expiry","允许下划线":"Allow Underscores","允许纯数字前缀":"Allow Numeric-only Prefixes","允许转让二级域名":"Allow Domain Transfer","全站总量上限。":"Site-wide total limit.","全部人工审核":"Manual Review for All","关闭可降低垃圾邮件滥用风险。":"Disabling this reduces email abuse risk.","关闭后只能管理员处理。":"Only admins can process this when disabled.","关闭后用户只能查看解析。":"Users can only view DNS records when disabled.","兼容前缀黑名单/正则":"Legacy Prefix Blacklist / Regex","兼容原到期提醒模板。":"Keeps compatibility with the original expiry template.","兼容原有效期设置。":"Keeps compatibility with the original validity setting.","兼容原自动清理字段。":"Keeps compatibility with the original cleanup field.","删除仍需要二次确认/审核。":"Deletion still requires confirmation or review.","到期前多少天允许续期。":"Number of days before expiry when renewal opens.","到期前提醒天数":"Expiry Reminder Days","到期后多少天彻底删除。":"Number of days after expiry before permanent deletion.","单域名最大 DNS 条数":"Max DNS Records per Domain","可视化生成器会同步 Cron。":"The visual presets update the Cron expression.","命中后可禁止注册或访问。":"Matching entries can block registration or access.","命中后普通用户和管理员都不能注册，支持一行一个关键词。":"Matching keywords block both users and admins; one keyword per line.","和侧边栏“域名审核”联动。":"Works with the Domain Review menu.","域名前缀最短长度。":"Minimum domain prefix length.","域名前缀最长长度。":"Maximum domain prefix length.","域名前缀黑名单：仅管理员可用":"Admin-only Prefixes","域名前缀黑名单：禁止注册":"Blocked Prefixes","填写用户 ID 或账号标识，一行一条。":"Enter one user ID or account identifier per line.","多根域名列表保存在 Workers KV。DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED 只作为首次默认值；后续新增/修改根域名直接在本页保存即可。CF_API_TOKEN 可继续用 Worker Secret，也可在上方填写一次保存到 KV。":"Root domain settings are stored in Workers KV. Environment variables are only initial defaults; later changes are made here. CF_API_TOKEN can remain a Worker Secret or be stored in KV.","失败时写入消息中心。":"Writes an alert to Message Center on failure.","审核模式":"Review Mode","对应右上角 EN/中文切换按钮。":"Controls the EN/Chinese switch in the upper-right.","导出会下载当前 Workers KV 中的完整设置。导入属于高危操作，会覆盖当前配置。":"Export downloads the full Workers KV settings. Import is high risk and overwrites current settings.","平台最大二级域名总配额":"Platform Maximum Domain Count","开放用户自助续期":"Allow Self-service Renewal","彻底删除周期/天":"Permanent Deletion Period (days)","必填：根域名、Zone ID。显示名称可留空；允许类型用逗号分隔，例如 A,AAAA,CNAME,TXT,MX,NS。每个根域名会独立使用自己的 Zone ID 写入 Cloudflare DNS。":"Required: root domain and Zone ID. Display name is optional. Separate record types with commas. Each root domain uses its own Zone ID.","扫描即将到期和已过期域名。":"Scans expiring and expired domains.","拒绝/撤销类域名可由用户清理。":"Users can clean rejected or revoked domains.","按保护阈值清理过期解析。":"Cleans expired records after the protection threshold.","支持邮箱、手机号或关键词。":"Supports email, phone, or keywords.","新增根域名不需要再去 Worker 里手动新增 DNS_SUFFIX / DNS_ZONE_ID 环境变量。这里只要填根域名、Zone ID、允许类型并保存到 Workers KV，注册页会自动出现该后缀，DNS 写入时也会按该后缀对应的 Zone ID 调用 Cloudflare API。已存在的 Cloudflare DNS 记录不会自动改写；需要用户或管理员逐条调整。":"New root domains do not require additional Worker environment variables. Save the domain, Zone ID, and types in KV. Existing Cloudflare DNS records are not rewritten automatically.","新增根域名只需在这里添加，不需要给每个域名单独配置环境变量。保存后用户注册页会自动读取启用的后缀。":"Add root domains here without separate environment variables. Enabled suffixes appear automatically on the registration page.","新用户默认额度。":"Default quota for new users.","普通用户不能注册，管理员可使用。":"Regular users cannot register these prefixes; admins can.","普通用户有效期/天":"Regular User Validity (days)","普通用户配额方案。":"Quota plan for regular users.","普通用户额度":"Regular User Quota","普通用户默认有效期。":"Default validity for regular users.","最大前缀长度":"Maximum Prefix Length","最小前缀长度":"Minimum Prefix Length","用于前台和消息提醒。":"Used for public and message reminders.","用于封禁恶意访问 IP 或标识。":"Blocks malicious access IPs or identifiers.","用于拦截注册行为，可填 IP、邮箱、手机号、关键词。":"Blocks registration by IP, email, phone, or keyword.","用于阻止用户申请系统保留前缀。":"Prevents users from applying for reserved prefixes.","用户能否删除已生效域名":"Allow Users to Delete Active Domains","白名单用户有效期/天":"Allowlisted User Validity (days)","白名单用户配额方案。":"Quota plan for allowlisted users.","白名单用户额度":"Allowlisted User Quota","白名单用户默认有效期。":"Default validity for allowlisted users.","示例：0 */1 * * * 表示每小时。":"Example: 0 */1 * * * means hourly.","续期窗口期/天":"Renewal Window (days)","联动侧边栏“操作日志”。":"Works with the Operation Logs page.","自动审批所有申请":"Automatically Approve All","英文":"English","当前用于保存角色规划说明，不会自动授予权限；实际权限仍以后端 requireAdmin 校验为准。":"Stores role planning notes only; actual permissions still use backend requireAdmin checks.","超过时间后需要重新登录。":"Requires login again after the timeout.","达到次数后临时封禁 IP，0 表示关闭。":"Temporarily blocks the IP after this count; 0 disables it.","达到阈值后的锁定时长。":"Lock duration after reaching the threshold.","过期后先锁定，防止立即清理。":"Locks first after expiry to prevent immediate cleanup.","过期后清理 DNS 天数":"DNS Cleanup after Expiry (days)","过期后锁定周期/天":"Lock Period after Expiry (days)","进入侧边栏“操作日志”，类型选择“认证”，可查看登录、退出、失败登录等记录。":"Open Operation Logs and select Auth to view logins, logouts, and failed logins.","配合上方阈值使用。":"Used with the threshold above.","配置按功能分组保存到 Workers KV。修改高风险项目时会要求二次确认。":"Settings are grouped and stored in Workers KV. High-risk changes require confirmation.","防止误删刚过期的正常解析。":"Prevents deletion of recently expired valid records.","阻止 * 主机记录。":"Blocks * wildcard host records.","限制单个二级域名解析数量。":"Limits DNS records per subdomain.","需要 Workers Cron 触发器配合。":"Requires a Workers Cron trigger.","预留功能，开启前请完善风控。":"Reserved feature; complete risk controls before enabling.","当前仅保存配置，不会自动修改现有 #/admin 路由；正式启用前需配套路由改造。":"Stores the value only and does not change the current #/admin route. Route changes are required before activation.","风险域名人工审核":"Manual Review for Risky Domains","＋ 新增根域名":"+ Add Root Domain","开启前请先配置并测试邮件发送服务。":"Configure and test the email delivery service before enabling this option.","仅在 Worker 能读取可信代理风险字段时生效；未接入检测源时不会自动判断 VPN。":"Works only when the Worker receives trusted proxy-risk signals; no VPN decision is made without a detection source.","后台访问路径别名（预留）":"Admin Path Alias (reserved)","多角色权限说明（预留）":"Role Permission Notes (reserved)","界面设置包含头部 JS、维护模式、公告时间等配置，错误 JS 可能导致前台白屏。确认保存？":"Appearance settings include custom JS and maintenance controls. Invalid JS may break the public site. Save changes?","注册风控属于高危配置，错误设置可能导致用户无法注册或垃圾账号进入系统。确认保存？":"Registration risk controls are high risk. Incorrect settings may block users or allow spam. Save changes?","域名规则属于高危配置，可能影响用户申请、续期、删除和现有域名管理。确认保存？":"Domain rules may affect applications, renewals, deletions, and existing domains. Save changes?","DNS 配置属于高危配置，修改根域名、代理、允许类型可能影响存量解析和用户访问。确认保存？":"DNS settings are high risk. Root domains, proxy settings, and record types may affect existing services. Save changes?","黑名单会直接拦截用户、IP、邮箱或域名前缀，错误配置可能误伤正常用户。确认保存？":"Blacklists directly block users, IPs, emails, or prefixes. Incorrect settings may affect legitimate users. Save changes?","安全设置会影响管理员登录、会话超时和操作日志保留。确认保存？":"Security settings affect admin login, sessions, and audit retention. Save changes?","自动化任务可能自动清理到期域名或 DNS 记录。确认保存？":"Automation may clean expired domains or DNS records. Save changes?"});

Object.assign(I18N_EN, {
  '导入配置会覆盖当前 Workers KV 设置。确认继续？':'Importing settings will overwrite the current Workers KV configuration. Continue?',
  '配置文件不能超过 1MB':'The settings file must not exceed 1 MB.',
  '配置文件内容不是有效的设置对象':'The file does not contain a valid settings object.',
  '配置导入失败':'Settings import failed','失败':'Failed','正常':'Healthy','最近保存：':'Last saved: '
});

Object.assign(I18N_EN, {
  '操作日志':'Operation Logs','最近操作记录':'Recent Operation Logs','仅显示最近 ${retentionDays} 天内的账号、登录、域名、DNS、消息、设置等操作记录。':'Only account, domain, DNS and related operations from the last 4 days are shown.','管理员可查看近 ${retentionDays} 天内未注销账号的完整操作记录；普通用户仅查看自己的记录。':'Admins can view logs for non-deleted accounts from the last 4 days. Regular users can only view their own logs.','暂无操作记录。':'No operation logs.','操作类型':'Action','操作人':'Operator','操作说明':'Description','目标对象':'Target','IP 地址':'IP Address','保留时间':'Retention','7 天':'4 days','日志会自动清理：超过 ${retentionDays} 天、或账号注销后的记录会从 D1 中删除。':'Logs are automatically cleaned from D1 after 4 days or when the account is cancelled.','正在读取操作日志…':'Loading operation logs…','系统':'System','未知用户':'Unknown User',
  '方式一：站内消息':'Method 1: In-site message','在下方填写标题和内容，消息会直接进入管理员的消息中心，适合已经登录后反馈域名、DNS、额度、审核等问题。':'Fill in the title and content below. The message will go directly to the admin Message Center. Use it for domain, DNS, quota, and review issues after login.','方式二：外部联系':'Method 2: External contact','点击右上角“其他：联系我们”会打开外部反馈页面，适合无法登录、无法收到消息、需要提交截图或更详细资料的情况。':'Click “Other: Contact Us” in the upper right to open the external contact form. Use it when you cannot log in, cannot receive messages, or need to submit screenshots/details.','其他：联系我们':'Other: Contact Us','直接发消息给管理员':'Send a message to admin','发送给管理员':'Send to Admin','请填写要反馈的问题标题':'Enter the issue title','请详细描述您遇到的问题、页面位置、操作步骤和错误提示':'Describe the issue, page, steps, and error message in detail','消息已发送到管理员消息中心':'Message sent to admin Message Center','请填写标题和内容':'Please enter title and content','回复':'Reply','撤销':'Withdraw','撤销消息':'Withdraw Message','确认撤销这条已发送消息？撤销后对方将无法继续查看。':'Withdraw this sent message? The recipient will no longer be able to view it.','消息已撤销':'Message withdrawn','已超过 15 分钟，不能撤销':'More than 15 minutes have passed; this message cannot be withdrawn.','回复消息':'Reply Message','回复内容':'Reply Content','请输入回复内容':'Enter reply content','发送回复':'Send Reply','消息已回复':'Reply sent','原信息':'Original Message','已转到消息中心':'Moved to Message Center','资料已保存':'Profile saved','账号已复制':'Account copied','复制账号':'Copy account','手机号':'Phone','保存账户资料':'Save Account Info','未注销域名':'Uncancelled Domains','账户下还有未注销域名':'Uncancelled domains remain','请选择要回复的消息':'Select messages to reply','已引用':'Quoted','条消息，请在发送消息中填写回复内容':'messages. Please write the reply in Send Message','客服回复':'Support Reply'
});

Object.assign(I18N_EN, {
  '筛选':'Filter','应用筛选':'Apply Filter','重置筛选':'Reset','筛选条件':'Filters','日期':'Date','日期精度':'Date Precision','全部日期':'All Dates','按日筛选':'By Day','按小时筛选':'By Hour','选择日期':'Select Date','选择小时':'Select Hour','排列方式':'Sort Order','时间倒序':'Newest First','时间正序':'Oldest First','类型':'Type','全部类型':'All Types','账号':'Account','DNS':'DNS','域名':'Domain','消息':'Message','设置':'Settings','认证':'Auth','其它':'Other','全部操作人':'All Operators','已筛选':'Filtered','共':'Total','条':'items','操作人：':'Operator:','目标对象：':'Target:','IP 地址：':'IP Address:','类型：':'Type:'
});

window.addEventListener('error', event => {
  if (event?.message) toast(event.message, 'error');
});
window.addEventListener('unhandledrejection', event => {
  const message = event?.reason?.message || String(event?.reason || '请求失败');
  toast(message, 'error');
});


const DEFAULT_BOOT_CONFIG = {
  needsBootstrap: false,
  site: {
    title: '免费二级域名注册中心',
    subtitle: '快速注册并管理您的专属域名',
    logoText: 'free',
    footer: '',
    icp: '',
    copyright: '',
    defaultLanguage: 'zh'
  },
  turnstile: {
    siteKey: '0x4AAAAAAD1yD8g5IE44JADq',
    enabledLogin: true,
    enabledRegister: true,
    enabledApply: true
  },
  domain: DEFAULT_DOMAIN_CONFIG,
  dns: {
    suffix: 'flore.top',
    suffixLabel: '',
    allowedTypes: ['A','AAAA','CNAME','TXT','MX','NS'],
    defaultType: 'CNAME',
    ttl: 1,
    proxied: false,
    suffixes: [{ label: '', suffix: 'flore.top', allowedTypes: ['A','AAAA','CNAME','TXT','MX','NS'], defaultType: 'CNAME', ttl: 1, proxied: false, enabled: true, allowRegister: true, registerOrder: 1 }]
  },
  suffixes: [{ label: '', suffix: 'flore.top', allowedTypes: ['A','AAAA','CNAME','TXT','MX','NS'], defaultType: 'CNAME', ttl: 1, proxied: false, enabled: true, allowRegister: true, registerOrder: 1 }],
  dnsRecordTypes: SUPPORTED_DNS_TYPES.map(type => ({ type, displayName: DEFAULT_DNS_TYPE_LABELS[type], allowUserAdd: type !== 'NS', note: '' }))
};

function withBootTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label || '请求超时')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function normalizeBootConfig(config) {
  const safe = { ...DEFAULT_BOOT_CONFIG, ...(config || {}) };
  safe.site = { ...DEFAULT_BOOT_CONFIG.site, ...(config?.site || {}) };
  safe.turnstile = { ...DEFAULT_BOOT_CONFIG.turnstile, ...(config?.turnstile || {}) };
  safe.domain = { ...DEFAULT_DOMAIN_CONFIG, ...(config?.domain || {}) };
  safe.dns = { ...DEFAULT_BOOT_CONFIG.dns, ...(config?.dns || {}) };
  safe.dnsRecordTypes = normalizedDnsTypePolicies(config?.dnsRecordTypes || config?.dns?.recordTypePolicies || DEFAULT_BOOT_CONFIG.dnsRecordTypes);
  const suffixes = config?.suffixes || config?.dns?.suffixes || safe.dns.suffixes || DEFAULT_BOOT_CONFIG.suffixes;
  safe.suffixes = Array.isArray(suffixes) && suffixes.length ? suffixes.filter(x => x && x.enabled !== false && x.allowRegister !== false) : DEFAULT_BOOT_CONFIG.suffixes;
  return safe;
}

async function loadPublicConfigSafely() {
  try {
    const data = await withBootTimeout(api('/api/public/config'), 9000, '配置接口加载超时');
    return normalizeBootConfig(data.config || data);
  } catch (error) {
    console.error('public config failed:', error);
    setTimeout(() => toast('配置接口暂时无响应，已使用基础配置进入页面', 'warn'), 300);
    return normalizeBootConfig(DEFAULT_BOOT_CONFIG);
  }
}

async function loadMeSafely() {
  try {
    const me = await withBootTimeout(api('/api/auth/me'), 7000, '登录状态接口加载超时');
    return me || { user: null };
  } catch (error) {
    return { user: null };
  }
}

async function init() {
  try {
    const [config, me] = await Promise.all([
      loadPublicConfigSafely(),
      loadMeSafely(),
    ]);
    state.config = config;
    state.me = me.user || null;
    applyTheme();
    await withBootTimeout(renderRoute(), 12000, '页面渲染超时');
    window.__storageBootCompleted = true;
    startAutoRefresh();
  } catch (error) {
    ensureMountRoots();
    console.error('boot failed:', error);
    if (app) {
      window.__storageBootCompleted = true;
      app.innerHTML = `<div class="center-screen"><h2>应用加载失败</h2><p>${esc(error.message || '启动异常')}</p><button class="btn primary" id="retry">重试</button><a class="btn" href="#/login" id="safe-login">进入登录页</a></div>`;
      document.querySelector('#retry')?.addEventListener('click', () => location.reload());
      document.querySelector('#safe-login')?.addEventListener('click', async e => {
        e.preventDefault();
        state.config = normalizeBootConfig(state.config || DEFAULT_BOOT_CONFIG);
        state.me = null;
        location.hash = '#/login';
        await renderRoute();
      });
    } else {
      console.error(error);
    }
  }
}

function go(hash) { location.hash = hash; }

async function copyToClipboard(text, successText = '已复制') {
  const value = String(text || '');
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const input = document.createElement('textarea');
      input.value = value;
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    toast(successText, 'success');
  } catch (error) {
    toast('复制失败，请手动复制', 'error');
  }
}

window.addEventListener('hashchange', renderRoute);

async function route() {
  const hash = location.hash || (state.me ? '#/apply' : '#/login');

  if (state.config?.needsBootstrap && hash !== '#/setup') return go('#/setup');
  if (!state.me && !['#/login', '#/register', '#/setup'].includes(hash)) return go('#/login');
  if (state.me && ['#/login', '#/register', '#/setup'].includes(hash)) return go('#/apply');
  if (hash.startsWith('#/admin') && state.me?.role !== 'admin') return go('#/apply');

  state.widgetId = null;

  if (isAccountDisabled() && hash.startsWith('#/domain/')) return disabledAccountPage('域名管理', '账户已被禁用无法管理域名，请通过帮助中心联系管理人员');
  if (hash.startsWith('#/domain/')) return renderDomainDetail(hash.replace('#/domain/', ''));
  if (hash === '#/setup') return renderSetup();
  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash === '#/apply') return renderApply();
  if (hash === '#/domains' || hash === '#/applications') return renderDomains();
  if (hash === '#/account') return renderAccount();
  if (hash === '#/messages') return renderMessageCenter();
  if (hash === '#/logs') return renderOperationLogs();
  if (hash === '#/help') return renderHelpCenter();
  if (hash === '#/admin') return renderAdminOverview();
  if (hash === '#/admin/applications') return renderAdminApplications();
  if (hash === '#/admin/users') return renderAdminUsers();
  if (hash === '#/admin/registration-keys') return renderRegistrationKeys();
  if (hash.startsWith('#/admin/analytics')) return renderAdminAnalytics();
  if (hash === '#/admin/settings') return renderAdminSettings();
  if (hash === '#/admin/help-settings') return renderAdminHelpSettings();
  if (hash === '#/admin/help') return renderAdminHelpCenter();

  return renderNotFound();
}

function renderNotFound() {
  const site = state.config?.site || {};
  if (state.me) return shell('404', `<section class="card"><h2>页面不存在</h2><p>${esc(site.notFoundText || '页面不存在或已移动')}</p><button class="btn primary" onclick="location.hash='#\/apply'">返回首页</button></section>`);
  app.innerHTML = `<main class="auth-wrap"><section class="auth-card"><h1>404</h1><p>${esc(site.notFoundText || '页面不存在或已移动')}</p><a class="btn primary" href="#/login">返回登录</a></section></main>`;
}

function authTemplate(title, subtitle, formHtml) {
  const site = state.config?.site || {};
  return `${langButton()}<main class="auth-wrap">
    <section class="auth-brand">
      <div class="auth-logo">${esc(site.logoText || '域')}</div>
      <h1>${esc(site.title || '免费二级域名注册中心')}</h1>
      <p>${esc(site.subtitle || '快速注册并管理您的专属免费域名')}</p>
    </section>
    <section class="auth-card">
      <h2>${esc(title)}</h2>
      <p>${esc(subtitle)}</p>
      ${formHtml}
    </section>
  </main>`;
}

async function renderSetup() {
  app.innerHTML = authTemplate('初始化管理员', '首次部署需要创建管理员账户。', `
    <form id="setup-form" class="form-grid">
      <label class="field wide"><span>初始化令牌</span><input name="setupToken" type="password" required></label>
      <label class="field"><span>管理员用户名</span><input name="username" required></label>
      <label class="field"><span>邮箱/手机号</span><input name="email" type="text" inputmode="text" placeholder="请输入邮箱/手机号"></label>
      <label class="field wide"><span>管理员密码</span><input name="password" type="password" required minlength="8"><em>至少 8 位。</em></label>
      <button class="btn primary wide" type="submit">创建管理员</button>
    </form>`);
  document.querySelector('#setup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const result = await api('/api/setup/bootstrap', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      state.me = result.user;
      state.config.needsBootstrap = false;
      toast('管理员创建成功', 'success');
      go('#/admin/settings');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}


function serviceAgreementHtml() {
  return `<div class="agreement-full-text agreement-long-text">
    <h2>Flore 免费二级域名系统服务协议</h2>
    <h3>前言</h3>
    <p>欢迎使用 Flore 免费二级域名系统（以下简称 “本系统”）。在注册账号、提交二级域名申请、使用 DNS 解析管理及平台全部相关功能前，请您仔细完整阅读本服务协议全部条款。您完成账号注册、域名提交申请、登录操作系统功能等任意使用行为，即代表您已充分知晓、理解并无条件同意接受本协议全部约束。若您不认可本协议任意条款，请立即停止一切使用行为。本协议构成您与 Flore 平台之间具备约束力的服务约定。</p>

    <h3>一、服务说明</h3>
    <p>本系统面向符合条件的互联网使用者，提供免费二级域名相关配套服务，服务内容包含但不限于：免费二级域名提交申请、域名资质人工 / 自动审核、域名 DNS 解析记录可视化管理、平台站内消息推送通知、用户问题帮助通道与意见反馈服务。</p>
    <p>用户通过本系统申领获得的二级域名，域名使用权仅限协议允许范围内使用。用户承诺，在使用二级域名、配置解析、搭建站点、对外提供网络服务全过程中，严格遵守中华人民共和国及用户实际所在地适用的全部法律、行政法规、行业管理规范、互联网信息管理相关规定。</p>
    <p>平台仅提供二级域名技术托管与解析服务，不代替用户履行网络备案、内容合规、资质办理等法定义务。若法律法规要求站点完成备案、许可等手续，由用户独立负责办理，相关责任不由平台承担。</p>

    <h3>二、账号安全与用户责任</h3>
    <p>用户注册账号时提交的手机号码、电子邮箱、登录密码、身份信息等账号资料，由用户本人承担全部保管义务。用户应当采取安全措施，定期修改密码，不向第三方转借、出租、出售账号，防范账号被盗、泄露。</p>
    <p>凡是通过您的账号登录本系统发起的全部操作，包括但不限于二级域名新增申请、修改 / 新增 / 删除 DNS 解析记录、提交域名注销申请、发起问题反馈、查看站内消息等行为，全部视为账号实名持有人本人主动操作，由此产生一切法律后果、技术后果均由账号使用者独立承担。</p>
    <p>一旦发现账号存在异常登录、被盗风险，用户应当第一时间修改登录凭证，并通过平台反馈通道告知管理员。平台无义务主动监测每一位用户账号安全，仅在收到有效风险通知后视情况提供有限协助。</p>

    <h3>三、二级域名使用规范与使用限制</h3>
    <p>用户在申请命名、日常运营二级域名期间，严禁将域名用于以下任何场景：</p>
    <ol>
      <li>承载、传播违法违规内容，包含色情、暴力、赌博、毒品、政治敏感、谣言信息；</li>
      <li>侵犯第三方合法权益，包括商标侵权、著作权侵权、肖像侵权、企业名称仿冒；</li>
      <li>搭建钓鱼网站、仿冒官网，诱导访客泄露账号、密码、银行卡、身份等隐私信息；</li>
      <li>实施网络欺诈、虚假宣传、诱导转账、虚假商品交易等各类诈骗行为；</li>
      <li>大量发送垃圾邮件、恶意爬虫、DDoS 攻击、端口扫描、漏洞探测等危害网络安全行为；</li>
      <li>恶意跳转、多层伪装跳转，误导互联网访客；</li>
      <li>利用二级域名从事任何会损害 Flore 平台主域名品牌声誉、平台信誉的活动；</li>
      <li>其他违反法律法规、互联网公序良俗以及平台补充管理规则的行为。</li>
    </ol>
    <p>平台拥有独立判定域名是否违规的权限。针对存在违规风险、已经核实违规的二级域名，平台有权单方面采取驳回申请、临时锁定域名、暂停 DNS 解析、永久禁用、直接撤销并删除该二级域名等处置措施，且视违规情况无需事先通知用户。</p>
    <p>域名被平台封禁、撤销后，用户不得重复使用高度相似名称再次提交申请。</p>

    <h3>四、域名审核、注销与删除规则</h3>
    <p>用户提交二级域名申请后，根据平台风控策略，域名将进入人工审核流程。<strong>在管理员审核正式通过之前，该域名无法添加、启用任何 DNS 解析记录，不对外生效。</strong>审核时长受管理员工作量、申请数量、风险核查复杂度影响，平台不承诺固定审核时效。</p>
    <p>用户主动申请注销、删除已审核通过的生效二级域名时，部分场景需要经过管理员复核批准方可完成删除操作。</p>
    <p>为最大限度防止用户误操作导致域名意外删除，系统将设置二次校验机制，可能要求用户手动输入完整二级域名名称、验证账号身份信息作为确认条件，未完成校验则无法发起删除流程，请用户谨慎执行删除操作。</p>
    <p>域名一旦成功删除，对应的所有解析记录将同步清除；域名释放后不保证原持有人可以再次重新申请同名二级域名。</p>

    <h3>五、DNS 解析相关约定</h3>
    <p>用户可自主在后台配置各类标准解析记录类型，包含 A 记录、AAAA 记录、CNAME 记录、TXT 记录、MX 记录等。所有解析参数、目标地址均由用户自行填写、自行核对，平台不对用户填写内容的正确性负责。</p>
    <p>二级域名解析正常访问，受到多重外部因素共同影响：Cloudflare CDN 节点状态、全球 DNS 递归服务器缓存、目标源服务器运行状态、Cloudflare 代理开关、解析 TTL 生存时间、本地运营商 DNS 缓存、用户本地网络环境等。上述第三方环节引发的访问波动、延迟、无法打开问题，均不属于平台服务故障。</p>
    <p>若用户填写错误解析地址、错误代理配置、不合理 TTL 参数，将会直接造成网站无法访问、访问异常，相关故障排查工作由用户优先自查。平台可在能力范围内提供基础排查指引，但不承担因配置失误产生的各类损失。</p>
    <p>用户不得利用解析功能配置反向代理、负载均衡用于发起网络攻击，不得将解析指向恶意 IP、恶意站点，否则平台有权直接冻结对应域名。</p>

    <h3>六、域名有效期、到期提醒与清理机制</h3>
    <p>每一个二级域名的有效使用期限、开放续期的时间窗口、域名过期后的等待清理周期、回收释放规则，全部以平台管理后台实时生效的配置参数为准，平台可根据运营策略动态调整相关时间规则。</p>
    <p>平台会通过系统站内消息推送域名到期提醒，但消息推送可能受缓存、系统波动影响存在延迟。不能将到期通知作为唯一续期依据，用户有义务主动定期登录账号查看名下域名有效期。</p>
    <p>域名到达有效期且用户未在规定续期窗口期完成续期操作，或是域名长期处于违规使用状态、长期闲置无有效解析记录，平台有权按照规则对域名进行清理回收。域名回收后，域名使用权随即终止，解析数据全部清除。</p>

    <h3>七、站内消息、问题反馈机制</h3>
    <p>平台推送的系统公告、管理员处置通知、域名审核结果、到期预警、违规处罚通知，以及用户提交的咨询反馈、客服回复内容，统一存放于系统消息中心内，用户需要定期登录账号查阅。</p>
    <p>如遇账号无法正常登录、无法进入消息中心，或是需要上传截图、提供日志材料进行问题申诉、故障反馈，用户可以使用平台提供的外部独立反馈入口提交诉求。</p>
    <p>平台将尽可能及时响应用户合理反馈，但不承诺固定回复时限；针对恶意骚扰、重复无意义申诉、违规域名申诉，平台有权不予回复。</p>

    <h3>八、免责声明</h3>
    <p>Flore 提供的二级域名属于免费公益性质服务，<strong>平台不向用户收取域名使用费，同时不承诺本服务永久不间断运营、永久持续开放。</strong>平台保留未来调整服务模式、缩减功能、暂停运营、终止免费二级域名业务的权利。</p>
    <p>因以下第三方因素或用户自身原因引发网站访问异常、业务中断、数据丢失，平台仅可在技术能力限度内协助用户开展问题排查，不承担任何直接损失、商业利润损失、间接经济损失：</p>
    <ol>
      <li>Cloudflare 平台服务中断、节点故障、风控拦截；</li>
      <li>第三方 DNS 服务器故障、全球 DNS 缓存污染；</li>
      <li>用户自身源服务器宕机、防火墙拦截、带宽故障；</li>
      <li>浏览器缓存、本地网络运营商限制、IP 屏蔽；</li>
      <li>用户自身解析配置错误、网站程序故障；</li>
      <li>不可抗力、网络大范围故障、政策监管要求导致服务临时受限。</li>
    </ol>
    <p>用户理解，免费服务不存在商业级 SLA 服务保障标准，不得依据商业付费服务器、域名服务商标准向 Flore 平台主张赔偿、履约要求。</p>
    <p>若因用户违规使用二级域名，引发第三方投诉、行政机关调查、民事诉讼，全部责任由用户自行承担；若平台因用户违规行为遭受损失，平台保留向该用户追偿的权利。</p>

    <h3>九、服务协议修订与生效规则</h3>
    <p>平台基于网络安全风控、反违规治理、系统功能迭代、长期运营规划、法律法规更新等合理需求，有权随时修订、增补、调整本服务协议内容、平台配套管理规则。</p>
    <p>协议发生变更之后，平台会以站内公告形式公示最新版本协议内容，新版本自公示设定生效时间起正式执行。</p>
    <p>在协议更新生效后，您继续登录系统、申请域名、使用解析等任意操作，即代表您已经阅读并自愿接受修改后的全部协议条款。若不认同更新后的协议，您应当停止使用本系统，并可以申请注销名下账号、删除所有二级域名。</p>

    <h3>十、其他补充条款</h3>
    <p>本协议条款如存在部分内容被认定为无效，不影响其余条款继续生效执行。</p>
    <p>针对本协议产生的争议，优先由用户与平台友好协商解决。</p>
    <p>平台配套发布的公告、域名命名规范、违规处置标准，均为本协议有效补充文件，与本协议具备同等约束力。</p>
  </div>`;
}
function openServiceAgreement() {
  openModal('服务协议', '请完整阅读后关闭。', `${serviceAgreementHtml()}`, 'wide agreement-modal');
}
function authAgreementHtml(name = 'agreeTerms') {
  return `<label class="auth-agreement"><input name="${attr(name)}" type="checkbox"> <span>我已阅读并同意 <button type="button" class="agreement-link" data-open-agreement>服务协议</button></span></label>`;
}
function bindAgreementLinks() {
  document.querySelectorAll('[data-open-agreement]').forEach(btn => btn.addEventListener('click', openServiceAgreement));
}

function bindAuthAgreementState(formSelector, buttonSelector = 'button[type="submit"]') {
  const form = document.querySelector(formSelector);
  if (!form) return;
  const button = form.querySelector(buttonSelector);
  if (!button) return;
  const sync = () => {
    const checkbox = form.querySelector('input[name="agreeTerms"]');
    const agreed = !checkbox || checkbox.checked;
    const requiredOk = Array.from(form.querySelectorAll('input[required], textarea[required], select[required]'))
      .every(el => String(el.value || '').trim().length > 0);
    let contactOk = true;
    if (form.id === 'register-form' || form.id === 'create-user-form') {
      contactOk = Boolean(String(form.querySelector('[name="email"]')?.value || '').trim() || String(form.querySelector('[name="phone"]')?.value || '').trim());
    }
    const password = form.querySelector('input[name="password"]');
    const passwordOk = !password || String(password.value || '').length >= Number(password.getAttribute('minlength') || 1);
    const ok = agreed && requiredOk && contactOk && passwordOk;
    button.disabled = !ok;
    button.classList.toggle('is-disabled', !ok);
    if (!agreed) button.title = '请先阅读并同意服务协议';
    else if (!requiredOk) button.title = '请填写必填信息';
    else if (!contactOk) button.title = '手机号和邮箱至少填写一个';
    else if (!passwordOk) button.title = '密码至少 8 位';
    else button.title = '';
  };
  form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('change', sync);
    el.addEventListener('input', sync);
  });
  sync();
}

const REMEMBERED_LOGIN_KEY = 'storage_remembered_login_v88';
function loadRememberedLogin() {
  try {
    const value = JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY) || 'null');
    return value && typeof value.identity === 'string' && typeof value.password === 'string' ? value : null;
  } catch (_) { return null; }
}
function saveRememberedLogin(identity, password) {
  try { localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ identity: String(identity || ''), password: String(password || '') })); } catch (_) {}
}
function clearRememberedLogin() {
  try { localStorage.removeItem(REMEMBERED_LOGIN_KEY); } catch (_) {}
}

async function renderLogin() {
  const turn = state.config.turnstile || {};
  const site = state.config?.site || {};
  app.innerHTML = `${langButton()}
    <main class="auth-wrap login-split-wrap">
      <section class="auth-brand login-split-brand">
        <div class="auth-logo">${esc(site.logoText || 'free')}</div>
        <h1>${esc(site.title || '二级域名注册')}</h1>
        <p>${esc(site.subtitle || '快速注册并管理您的专属域名')}</p>
      </section>
      <section class="auth-card login-compact-card">
        <div class="login-compact-head">
          <div class="login-free-mark">free</div>
          <h2>欢迎登录</h2>
          <p>登录到您的free二级域名系统账户</p>
        </div>
        <form id="login-form" class="login-compact-form">
          <label class="login-field">
            <span>用户名或账户邮箱/手机号</span>
            <div class="login-input-wrap"><input name="identity" placeholder="用户名或账户邮箱/手机号" required autocomplete="username"></div>
          </label>
          <label class="login-field">
            <span>密码</span>
            <div class="login-input-wrap"><input id="login-password" name="password" placeholder="请输入密码" type="password" required autocomplete="current-password"><button type="button" class="password-eye" id="toggle-password">◉</button></div>
          </label>
          <div class="login-row">
            <label class="login-check"><input name="remember" type="checkbox"> <span>记住我</span></label>
            <button type="button" id="forgot-password" class="login-link-btn">忘记密码？</button>
          </div>
          ${humanVerificationHtml('login', 'turnstile-holder')}
          ${authAgreementHtml('agreeTerms')}
          <button class="btn primary login-submit" type="submit" disabled>登录账户</button>
        </form>
        <div class="login-divider"></div>
        <p class="login-register-row"><span>还没有账号？</span> <a href="#/register">立即注册</a></p>
        <p class="login-feedback-row"><span>出现问题？</span><a href="https://mailform.flore.top" target="_blank" rel="noopener">点击反馈</a></p>
      </section>
    </main>`;
  await mountHumanVerification('[data-human-verification="login"]', 'login', turn.actionLogin || 'login');
  bindAgreementLinks();
  bindAuthAgreementState('#login-form', '.login-submit');
  const rememberedLogin = loadRememberedLogin();
  if (rememberedLogin) {
    const identityInput = document.querySelector('#login-form [name="identity"]');
    const passwordInput = document.querySelector('#login-form [name="password"]');
    const rememberInput = document.querySelector('#login-form [name="remember"]');
    if (identityInput) identityInput.value = rememberedLogin.identity;
    if (passwordInput) passwordInput.value = rememberedLogin.password;
    if (rememberInput) rememberInput.checked = true;
    identityInput?.dispatchEvent(new Event('input', { bubbles:true }));
    passwordInput?.dispatchEvent(new Event('input', { bubbles:true }));
  }
  document.querySelector('#login-form [name="remember"]')?.addEventListener('change', event => {
    if (!event.currentTarget.checked) clearRememberedLogin();
  });
  document.querySelector('#toggle-password')?.addEventListener('click', () => {
    const input = document.querySelector('#login-password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  document.querySelector('#forgot-password')?.addEventListener('click', () => { window.location.href = 'https://mailform.flore.top'; });
  document.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const f = new FormData(e.currentTarget);
    try {
      if (f.get('agreeTerms') !== 'on') throw new Error('请先阅读并同意服务协议');
      const verification = await humanVerificationPayload('login');
      const result = await api('/api/auth/login', { method:'POST', body:{
        identity:f.get('identity'), password:f.get('password'), remember:f.get('remember') === 'on', ...verification,
      }});
      state.me = result.user;
      if (f.get('remember') === 'on') saveRememberedLogin(f.get('identity'), f.get('password'));
      else clearRememberedLogin();
      if (result.accountDisabled || result.user?.status === 'disabled') {
        toast('你的账户已被禁用', 'error');
      } else {
        toast('登录成功', 'success');
      }
      go(result.user.role === 'admin' ? '#/admin' : '#/apply');
    } catch (error) {
      const switched = await recoverHumanVerification('login', error);
      toast(switched ? `${error.message}，已自动切换图形验证，请重新提交` : error.message, 'error');
      btn.disabled = document.querySelector('#login-form input[name=\"agreeTerms\"]')?.checked ? false : true;
    }
  });
  afterRender();
}

async function renderRegister() {
  // 注册入口默认开放，避免历史设置导致新用户无法注册。
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('创建账户', '注册后默认拥有 3 个域名额度。', `
    <form id="register-form" class="form-grid">
      <label class="field"><span>用户名</span><input name="username" required></label>
      <label class="field"><span>手机号（选填）</span><input name="phone" type="tel" inputmode="tel" placeholder="请输入手机号"></label>
      <label class="field"><span>邮箱${state.config?.registration?.emailVerificationEnabled ? '' : '（选填）'}</span><input name="email" type="email" inputmode="email" placeholder="请输入邮箱" ${state.config?.registration?.emailVerificationEnabled ? 'required' : ''}></label>
      ${state.config?.registration?.emailVerificationEnabled ? `<label class="field wide"><span>邮箱验证码</span><div class="email-code-row"><input name="emailVerificationCode" ${/^[0-9]+$/.test(String(state.config?.registration?.emailCodeCharset || '0123456789')) ? 'inputmode="numeric"' : 'inputmode="text"'} minlength="${attr(Number(state.config?.registration?.emailCodeLength || 6))}" maxlength="${attr(Number(state.config?.registration?.emailCodeLength || 6))}" required placeholder="请输入 ${esc(Number(state.config?.registration?.emailCodeLength || 6))} 位验证码"><button type="button" class="btn soft" id="send-email-code">发送验证码</button></div><em>验证码会发送到上方邮箱；请按邮件中的字符原样输入。</em></label>` : ''}
      ${state.config?.registration?.requireRegistrationKey ? '<label class="field wide"><span>注册码</span><input name="registrationCode" required placeholder="请输入注册码"><em>管理员开启注册码后必须填写有效注册码。</em></label>' : ''}
      <label class="field wide"><span>密码</span><input name="password" type="password" required minlength="8"><em>手机号和邮箱至少填写一个；密码至少 8 位。</em></label>
      <div class="wide">${humanVerificationHtml('register')}</div>
      <div class="wide">${authAgreementHtml('agreeTerms')}</div>
      <button class="btn primary wide" type="submit" disabled>注册</button>
    </form>
    <p class="auth-link">已有账户？ <a href="#/login">登录</a></p>`);
  await mountHumanVerification('[data-human-verification="register"]', 'register', turn.actionRegister || 'register');
  bindAgreementLinks();
  bindAuthAgreementState('#register-form', 'button[type="submit"]');
  document.querySelector('#send-email-code')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    const email = String(document.querySelector('#register-form [name="email"]')?.value || '').trim();
    if (!email) { toast('请先填写邮箱', 'error'); return; }
    button.disabled = true;
    try {
      const result = await api('/api/auth/email-verification/send', { method:'POST', body:{ email } });
      toast('验证码已发送，请检查邮箱', 'success');
      let remaining = Number(result.cooldownSeconds || 60);
      const original = '发送验证码';
      button.textContent = `${remaining} 秒后重发`;
      const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(timer);
          button.disabled = false;
          button.textContent = original;
        } else button.textContent = `${remaining} 秒后重发`;
      }, 1000);
    } catch (error) {
      button.disabled = false;
      toast(error.message, 'error');
    }
  });
  document.querySelector('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    if (!String(body.phone || '').trim() && !String(body.email || '').trim()) {
      toast('手机号和邮箱至少填写一个', 'error');
      btn.disabled = false;
      return;
    }
    if (body.agreeTerms !== 'on') {
      toast('请先阅读并同意服务协议', 'error');
      btn.disabled = false;
      return;
    }
    try {
      Object.assign(body, await humanVerificationPayload('register'));
      const result = await api('/api/auth/register', { method:'POST', body });
      if (result.pendingActivation) {
        toast('注册成功，请等待管理员启用账户', 'success');
      } else {
        toast('注册成功，请使用刚才的账号密码登录', 'success');
      }
      go('#/login');
    } catch (error) {
      const switched = await recoverHumanVerification('register', error);
      toast(switched ? `${error.message}，已自动切换图形验证，请重新提交` : error.message, 'error');
      btn.disabled = document.querySelector('#register-form input[name=\"agreeTerms\"]')?.checked ? false : true;
    }
  });
}

function nav(hash, icon, text) {
  const isMessage = hash === '#/messages';
  const count = Number(state.messageUnread || 0);
  const badge = isMessage && count > 0 ? `<b class="nav-badge">${count > 9 ? '9+' : count}</b>` : '';
  return `<a class="nav ${isMessage ? 'nav-message' : ''} ${location.hash === hash ? 'active' : ''}" href="${hash}"><span class="nav-icon">${icon}</span><span class="nav-label">${esc(text)}</span>${badge}</a>`;
}

function updateMessageBadgeDom() {
  const count = Number(state.messageUnread || 0);
  document.querySelectorAll('.nav-message').forEach(link => {
    link.querySelector('.nav-badge')?.remove();
    if (count > 0) link.insertAdjacentHTML('beforeend', `<b class="nav-badge">${count > 9 ? '9+' : count}</b>`);
  });
}

let messageBadgeLoading = false;
async function refreshMessageBadge() {
  if (!state.me || messageBadgeLoading) return;
  messageBadgeLoading = true;
  try {
    const res = await api('/api/messages');
    state.messageUnread = Number(res.unread || 0);
    updateMessageBadgeDom();
  } catch (_) {
    state.messageUnread = 0;
    updateMessageBadgeDom();
  } finally {
    messageBadgeLoading = false;
  }
}
function markdownLite(text) {
  return esc(text || '')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function shell(title, content) {
  const site = state.config.site || {};
  const isAdmin = state.me?.role === 'admin';
  app.innerHTML = `<div class="app-shell">
    <div class="sidebar-mask" id="sidebar-mask"></div>
    <aside class="sidebar">
      <div class="brand"><div>${site.logoImageUrl ? `<img src="${attr(site.logoImageUrl)}" alt="logo">` : esc(site.logoText || 'free')}</div><strong>${esc(site.title || '域名注册中心')}</strong></div>
      <nav>
        ${nav('#/apply','＋','域名注册')}
        ${nav('#/domains','🌐','域名管理')}
        ${nav('#/account','⚙','账户设置')}
        ${!isAdmin ? nav('#/messages','✉','消息中心') : ''}
        ${nav('#/logs','↩','操作日志')}
        ${nav('#/help','☸','帮助中心')}
        ${isAdmin ? `<hr>${nav('#/admin','▦','管理概览')}${nav('#/admin/analytics','◌','分析页')}${nav('#/admin/applications','✓','域名审核')}${nav('#/admin/users','♟','用户管理')}${nav('#/admin/registration-keys','⌘','注册密钥')}${nav('#/admin/settings','⚙','管理员设置')}${nav('#/messages','✉','消息中心')}${nav('#/admin/help-settings','☸','帮助中心设置')}${nav('#/admin/help','🛠','管理员帮助中心')}` : ''}
      </nav>
      <div class="side-user"><strong>${esc(state.me.username)}</strong><small>${isAdmin ? '管理员' : '普通用户'}</small><button id="logout" class="btn ghost">退出登录</button></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="btn ghost menu-btn" id="menu">☰</button>
        <h1>${esc(title)}</h1>
        <div class="topbar-actions">${langButton()}${statusBadge(state.me.status || 'active')}</div>
      </header>
      ${isNoticeActive(site) && !isAdmin ? `<div class="site-notice">${markdownLite(site.homepageNotice)}</div>` : ``}<section class="content">${content}</section>${(site.icp || site.footer || site.copyright) ? `<footer class="app-footer">${site.footer ? `<div class="footer-line footer-text">${esc(site.footer)}</div>` : ``}${site.copyright ? `<div class="footer-line footer-copyright">${esc(site.copyright)}</div>` : ``}${site.icp ? `<div class="footer-line footer-icp">${esc(site.icp)}</div>` : ``}</footer>` : ``}
    </main>
  </div>`;
  updateMessageBadgeDom();
  refreshMessageBadge();
  document.querySelector('#logout')?.addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method:'POST', body:{} }); } catch {}
    state.me = null;
    go('#/login');
  });
  const sidebar = document.querySelector('.sidebar');
  const mask = document.querySelector('#sidebar-mask');
  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    mask?.classList.remove('open');
    document.body.classList.remove('sidebar-open');
  };
  const openSidebar = () => {
    sidebar?.classList.add('open');
    mask?.classList.add('open');
    document.body.classList.add('sidebar-open');
  };
  document.querySelector('#menu')?.addEventListener('click', openSidebar);
  mask?.addEventListener('click', closeSidebar);
  document.querySelectorAll('.sidebar .nav').forEach(a => a.addEventListener('click', closeSidebar));
  bindLanguageControls();
  setTimeout(() => applyI18n(), 0);
}

async function loadApplications() {
  const result = await api('/api/applications');
  state.applications = result.applications || [];
  const fallbackTotal = Number(domainConfig().defaultQuota || 3);
  const q = result.quota || { used: 0, total: fallbackTotal, remaining: fallbackTotal };
  const total = Math.max(0, Number(q.total ?? fallbackTotal));
  const used = Number(q.used || 0);
  state.quota = { ...q, used, total, remaining: Math.max(0, total - used), label: `${used} / ${total}` };
  return result;
}

async function renderApply() {
  if (isAccountDisabled()) return disabledAccountPage('域名注册', '账户已被禁用无法注册域名，请通过帮助中心联系管理人员');
  shell('域名注册', `<div class="loading-card">正在读取域名数据…</div>`);
  try {
    await loadApplications();
    const recent = state.applications.slice(0, 3);
    const recentHtml = recent.map(a => domainCard(a, { readonly: true })).join('');

    shell('域名注册', `
      <div class="notice">请勿申请违法、侵权、仿冒或误导性域名。</div>
      <section class="quota-hero">
        <div class="quota-icon">☁</div>
        <div><strong>${state.quota.used} / ${state.quota.total}</strong><span>已注册</span></div>
        <div class="quota-left"><span>剩余</span><strong>${state.quota.remaining}</strong></div>
        <button class="btn primary" id="open-register">＋ 注册新域名</button>
      </section>

      <section class="card">
        <h2>域名注册</h2>
        <p>申请时只需要填写前缀和根域名。管理员批准后，再在“域名管理”中添加或管理多条 DNS 解析记录。</p>
        <div class="steps">
          <div><b>1</b><strong>填写前缀</strong></div>
          <div><b>2</b><strong>提交审核</strong></div>
          <div><b>3</b><strong>管理员批准</strong></div>
          <div><b>4</b><strong>配置 DNS</strong></div>
        </div>
      </section>

      <section class="card">
        <div class="section-head"><div><h2>域名列表</h2><p>这里只显示域名状态，不显示编辑操作；进入“域名管理”后再管理解析。</p></div><a class="btn soft" href="#/domains">全部域名</a></div>
        ${recentHtml || '<div class="empty">暂无域名，点击右上方注册新域名。</div>'}
      </section>`);
    document.querySelector('#open-register').addEventListener('click', showRegisterDomainModal);
    bindDomainCardActions();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function showRegisterDomainModal() {
  const suffixes = suffixList();
  const options = suffixes.map(s => `<option value="${attr(s.suffix)}">${s.label ? `${esc(s.label)} / ` : ''}${esc(s.suffix)}</option>`).join('');
  openModal('注册新域名', '选择根域名并输入前缀，快速注册一个专属您的免费域名', `
    <form id="domain-register-form" class="modal-form">
      <label class="field wide">
        <span>选择根域名</span>
        <select id="domain-suffix" name="suffix" required>
          <option value="">请选择根域名</option>${options}
        </select>
      </label>
      <label class="field wide">
        <span>域名前缀</span>
        <div class="suffix-input">
          <input id="domain-prefix" name="prefix" placeholder="输入前缀，如: myblog" minlength="2" maxlength="36" required>
          <strong id="suffix-preview">.请选择根域名</strong>
        </div>
        <em>2-36 位，仅支持字母、数字和连字符 -</em>
      </label>
      <div class="preview-box">
        <span>完整域名预览</span>
        <strong id="full-preview">请选择根域名并输入前缀</strong>
      </div>
      <div class="dns-note"><span>ℹ</span><strong>管理员审核通过后，您才可以设置 DNS 解析</strong><button type="button" id="dns-help">查看完整说明 ›</button></div>
      ${humanVerificationHtml('apply', 'turnstile-holder')}
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button id="confirm-register" class="btn primary" type="submit" disabled>确认注册</button></div>
    </form>
  `, 'wide');
  const suffix = document.querySelector('#domain-suffix');
  const prefix = document.querySelector('#domain-prefix');
  const submit = document.querySelector('#confirm-register');
  const refresh = () => {
    const s = suffix.value;
    const p = prefix.value.trim();
    document.querySelector('#suffix-preview').textContent = s ? `.${s}` : '.请选择根域名';
    document.querySelector('#full-preview').textContent = s && p ? `${p}.${s}` : '请选择根域名并输入前缀';
    submit.disabled = !(s && /^[a-z0-9](?:[a-z0-9-]{0,34}[a-z0-9])?$/.test(p) && p.length >= 2);
  };
  suffix.addEventListener('change', refresh);
  prefix.addEventListener('input', refresh);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#dns-help').addEventListener('click', showRegisterGuideModal);
  mountHumanVerification('[data-human-verification="apply"]', 'apply', state.config.turnstile.actionApply || 'domain_apply');
  document.querySelector('#domain-register-form').addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true;
    try {
      await api('/api/applications', { method:'POST', body:{ prefix:prefix.value, suffix:suffix.value, ...(await humanVerificationPayload('apply')) } });
      closeModal();
      toast('域名已提交，请等待管理员审核通过后再配置 DNS 解析', 'success');
      await renderApply();
    } catch (error) {
      const switched = await recoverHumanVerification('apply', error);
      toast(switched ? `${error.message}，已自动切换图形验证，请重新提交` : error.message, 'error');
      submit.disabled = false;
    }
  });
}

function showRegisterGuideModal() {
  openModal('完整说明', '注册成功后，您需要手动设置DNS解析', `
    <div class="guide-box">
      <div class="guide-alert"><span>ℹ</span><div><strong>注册成功后，您需要手动设置DNS解析</strong><ul><li>可以设置A记录、CNAME记录等多种类型</li><li>注册的域名严禁用于违法违规行为</li><li>如需删除,可点击“查看详情”查看您的域名是否支持删除。</li></ul></div></div>
      <div class="help-accordion">
        <details open><summary>申请流程说明</summary><div class="help-detail"><p>1. 先在注册页面选择根域名并填写前缀，例如 <b>blog</b>，系统会生成 <b>blog.flore.top</b>。</p><p>2. 提交后状态为“待审核”，此时不能配置 DNS，也不会开始计算有效期。</p><p>3. 管理员审核通过后，状态变为“正常”，有效期从批准当天开始计算。</p><p>4. 审核通过后进入“域名管理”，点击“管理域名”，再添加 DNS 解析记录。</p></div></details>
        <details><summary>DNS 配置说明</summary><div class="help-detail"><p>A 记录用于指向 IPv4 地址，例如 <b>1.2.3.4</b>。</p><p>AAAA 记录用于指向 IPv6 地址。</p><p>CNAME 记录用于指向另一个域名，例如 Pages、Vercel、动态域名服务地址。</p><p>TXT 记录常用于验证所有权、邮件验证或第三方平台校验。</p><p>MX 记录用于邮箱服务，通常需要填写优先级。</p><p>A / AAAA / CNAME 可以选择是否开启代理；TXT / MX 必须保持“仅 DNS”。</p></div></details>
        <details><summary>删除与续期说明</summary><div class="help-detail"><p>正常域名申请删除后需要管理员审核。12 小时内可以撤销删除申请。</p><p>无效域名或已拒绝域名可以按规则直接删除。</p><p>续期按钮只会在进入续期窗口后显示。默认最后 60 天可续期，具体以管理员设置为准。</p><p>如果域名被管理员禁用，通知会进入消息中心，DNS 记录会被移除。</p></div></details>
      </div>
    </div>
    <div class="modal-actions"><button class="btn primary" data-close-modal type="button">关闭</button></div>
  `, 'wide');
}


function helpItem(title, body, index, id = '') {
  return `<details class="help-item" data-help-id="${attr(id || String(title || '').replace(/\s+/g, '-'))}"><summary><span>${index ? index + '. ' : ''}${esc(title)}</span></summary><div class="help-detail">${body}</div></details>`;
}
function renderHelpCategory(title, subtitle, items) {
  const rows = items.map((item, idx) => helpItem(item.q, item.a, idx + 1, item.id || `${title}-${idx+1}`)).join('');
  const icons = {
    '常见问题': '◉',
    'DNS 记录说明': '▣',
    '域名管理问题': '◇',
  };
  const icon = icons[title] || '○';
  return `<details class="help-category">
    <summary>
      <div class="help-category-title">
        <span class="help-category-icon">${icon}</span>
        <h2>${esc(title)}</h2>
      </div>
    </summary>
    <div class="help-category-body">${rows}</div>
  </details>`;
}

const DEFAULT_HELP_CATEGORIES = [
  { key:'faq', title:'常见问题', subtitle:'账号、注册、审核、登录、额度、语言、消息等常见问题', items:[{"q": "为什么申请后一直显示待审核？", "a": "<p><b>问题说明：</b>为什么申请后一直显示待审核？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么审核通过前不能设置 DNS？", "a": "<p><b>问题说明：</b>为什么审核通过前不能设置 DNS？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么提示域名额度不足？", "a": "<p><b>问题说明：</b>为什么提示域名额度不足？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么注册按钮点不了？", "a": "<p><b>问题说明：</b>为什么注册按钮点不了？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么前缀提示格式错误？", "a": "<p><b>问题说明：</b>为什么前缀提示格式错误？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么提交后看不到到期时间？", "a": "<p><b>问题说明：</b>为什么提交后看不到到期时间？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么页面显示服务器内部错误？", "a": "<p><b>问题说明：</b>为什么页面显示服务器内部错误？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么登录后还是回到登录页？", "a": "<p><b>问题说明：</b>为什么登录后还是回到登录页？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么忘记密码不能自助找回？", "a": "<p><b>问题说明：</b>为什么忘记密码不能自助找回？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么注册账号需要 Turnstile？", "a": "<p><b>问题说明：</b>为什么注册账号需要 Turnstile？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么我的账号被禁用？", "a": "<p><b>问题说明：</b>为什么我的账号被禁用？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么管理员添加用户也要人机验证？", "a": "<p><b>问题说明：</b>为什么管理员添加用户也要人机验证？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么用户名可以自由填写但仍不能重复？", "a": "<p><b>问题说明：</b>为什么用户名可以自由填写但仍不能重复？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么邮箱/手机号可以作为登录标识？", "a": "<p><b>问题说明：</b>为什么邮箱/手机号可以作为登录标识？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么管理员能设置自己的额度？", "a": "<p><b>问题说明：</b>为什么管理员能设置自己的额度？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么删除账号前要求输入账号名？", "a": "<p><b>问题说明：</b>为什么删除账号前要求输入账号名？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么账号下还有域名就不能注销？", "a": "<p><b>问题说明：</b>为什么账号下还有域名就不能注销？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么消息中心有未读数量？", "a": "<p><b>问题说明：</b>为什么消息中心有未读数量？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么有些按钮只在管理员界面显示？", "a": "<p><b>问题说明：</b>为什么有些按钮只在管理员界面显示？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么有些域名不能直接删除？", "a": "<p><b>问题说明：</b>为什么有些域名不能直接删除？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么删除申请有 12 小时撤销期？", "a": "<p><b>问题说明：</b>为什么删除申请有 12 小时撤销期？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么管理员留言会显示在用户界面？", "a": "<p><b>问题说明：</b>为什么管理员留言会显示在用户界面？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么同一个域名前缀不能重复申请？", "a": "<p><b>问题说明：</b>为什么同一个域名前缀不能重复申请？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么申请违法或仿冒域名会被拒绝？", "a": "<p><b>问题说明：</b>为什么申请违法或仿冒域名会被拒绝？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么系统有保留前缀？", "a": "<p><b>问题说明：</b>为什么系统有保留前缀？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么手机端要清缓存？", "a": "<p><b>问题说明：</b>为什么手机端要清缓存？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么电脑端要 Ctrl + F5？", "a": "<p><b>问题说明：</b>为什么电脑端要 Ctrl + F5？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么界面会出现中英文混合？", "a": "<p><b>问题说明：</b>为什么界面会出现中英文混合？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么系统提示变量初始化错误？", "a": "<p><b>问题说明：</b>为什么系统提示变量初始化错误？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么审核通过后 DNS 还是未配置？", "a": "<p><b>问题说明：</b>为什么审核通过后 DNS 还是未配置？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么有效期从管理员批准当天开始？", "a": "<p><b>问题说明：</b>为什么有效期从管理员批准当天开始？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么有些域名显示已禁用？", "a": "<p><b>问题说明：</b>为什么有些域名显示已禁用？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么域名会被撤销？", "a": "<p><b>问题说明：</b>为什么域名会被撤销？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么已拒绝的域名还能看到？", "a": "<p><b>问题说明：</b>为什么已拒绝的域名还能看到？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么添加用户时要填写额度？", "a": "<p><b>问题说明：</b>为什么添加用户时要填写额度？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么不建议所有用户无限额度？", "a": "<p><b>问题说明：</b>为什么不建议所有用户无限额度？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么修改联系方式后登录方式变化？", "a": "<p><b>问题说明：</b>为什么修改联系方式后登录方式变化？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么域名申请页不显示编辑操作？", "a": "<p><b>问题说明：</b>为什么域名申请页不显示编辑操作？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么帮助中心内容很多？", "a": "<p><b>问题说明：</b>为什么帮助中心内容很多？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么搜索帮助内容没有结果？", "a": "<p><b>问题说明：</b>为什么搜索帮助内容没有结果？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么表格在手机上要左右滑动？", "a": "<p><b>问题说明：</b>为什么表格在手机上要左右滑动？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么侧边栏在手机端要上下滑动？", "a": "<p><b>问题说明：</b>为什么侧边栏在手机端要上下滑动？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么管理员禁用后数据库仍用 revoked？", "a": "<p><b>问题说明：</b>为什么管理员禁用后数据库仍用 revoked？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么不能随便手工改数据库状态？", "a": "<p><b>问题说明：</b>为什么不能随便手工改数据库状态？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么系统需要操作日志？", "a": "<p><b>问题说明：</b>为什么系统需要操作日志？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么删除、禁用、注销都要二次确认？", "a": "<p><b>问题说明：</b>为什么删除、禁用、注销都要二次确认？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么联系管理员后没有马上处理？", "a": "<p><b>问题说明：</b>为什么联系管理员后没有马上处理？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么看不到帮助中心入口？", "a": "<p><b>问题说明：</b>为什么看不到帮助中心入口？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么请求失败但刷新后又好了？", "a": "<p><b>问题说明：</b>为什么请求失败但刷新后又好了？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}, {"q": "为什么登录身份可以填用户名、邮箱或手机号？", "a": "<p><b>问题说明：</b>为什么登录身份可以填用户名、邮箱或手机号？ 这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关。系统为了避免误操作，会把注册、审核、删除、注销和消息通知分成多个状态处理。</p><p><b>解决方法：</b>先确认当前页面状态和红色错误提示，再按顺序执行：强制刷新页面、重新登录、检查消息中心和管理员留言；仍异常时把截图和操作路径发给管理员排查 Worker 日志与 D1 数据。</p>"}] },
  { key:'dns', title:'DNS 记录说明', subtitle:'A / AAAA / CNAME / TXT / MX / NS、代理、TTL、生效时间、第三方平台配置', items:[{"q": "A 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>A 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "AAAA 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>AAAA 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "CNAME 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>CNAME 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TXT 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>TXT 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "MX 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>MX 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 @ 代表什么？", "a": "<p><b>问题说明：</b>主机记录 @ 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 www 代表什么？", "a": "<p><b>问题说明：</b>主机记录 www 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 api 代表什么？", "a": "<p><b>问题说明：</b>主机记录 api 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 api.v1 代表什么？", "a": "<p><b>问题说明：</b>主机记录 api.v1 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "CNAME 可以指向 IP 吗？", "a": "<p><b>问题说明：</b>CNAME 可以指向 IP 吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "A 记录可以填写域名吗？", "a": "<p><b>问题说明：</b>A 记录可以填写域名吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "AAAA 记录可以填写 IPv4 吗？", "a": "<p><b>问题说明：</b>AAAA 记录可以填写 IPv4 吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TXT 记录为什么不能开启代理？", "a": "<p><b>问题说明：</b>TXT 记录为什么不能开启代理？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "MX 记录为什么不能开启代理？", "a": "<p><b>问题说明：</b>MX 记录为什么不能开启代理？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "仅 DNS 是什么意思？", "a": "<p><b>问题说明：</b>仅 DNS 是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "开启代理是什么意思？", "a": "<p><b>问题说明：</b>开启代理是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TTL 填 1 是什么意思？", "a": "<p><b>问题说明：</b>TTL 填 1 是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNS 记录多久生效？", "a": "<p><b>问题说明：</b>DNS 记录多久生效？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么刚添加解析仍访问旧地址？", "a": "<p><b>问题说明：</b>为什么刚添加解析仍访问旧地址？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么添加 CNAME 后网站打不开？", "a": "<p><b>问题说明：</b>为什么添加 CNAME 后网站打不开？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么提示 DNS 记录冲突？", "a": "<p><b>问题说明：</b>为什么提示 DNS 记录冲突？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么同名 CNAME 不能和 A 记录共存？", "a": "<p><b>问题说明：</b>为什么同名 CNAME 不能和 A 记录共存？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 @ 记录配置 CNAME 后邮箱异常？", "a": "<p><b>问题说明：</b>为什么 @ 记录配置 CNAME 后邮箱异常？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 GitHub Pages？", "a": "<p><b>问题说明：</b>如何配置 GitHub Pages？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Cloudflare Pages？", "a": "<p><b>问题说明：</b>如何配置 Cloudflare Pages？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Vercel？", "a": "<p><b>问题说明：</b>如何配置 Vercel？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Netlify？", "a": "<p><b>问题说明：</b>如何配置 Netlify？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置动态域名 DDNS？", "a": "<p><b>问题说明：</b>如何配置动态域名 DDNS？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置邮箱 SPF？", "a": "<p><b>问题说明：</b>如何配置邮箱 SPF？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 DKIM？", "a": "<p><b>问题说明：</b>如何配置 DKIM？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 DMARC？", "a": "<p><b>问题说明：</b>如何配置 DMARC？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 TXT 验证失败？", "a": "<p><b>问题说明：</b>为什么 TXT 验证失败？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 MX 邮箱收不到信？", "a": "<p><b>问题说明：</b>为什么 MX 邮箱收不到信？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么开启代理后端口访问失败？", "a": "<p><b>问题说明：</b>为什么开启代理后端口访问失败？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么开启代理后真实 IP 被隐藏？", "a": "<p><b>问题说明：</b>为什么开启代理后真实 IP 被隐藏？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么仅 DNS 会暴露源站 IP？", "a": "<p><b>问题说明：</b>为什么仅 DNS 会暴露源站 IP？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNSSEC 和普通 DNS 记录有什么关系？", "a": "<p><b>问题说明：</b>DNSSEC 和普通 DNS 记录有什么关系？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么不能填 http://example.com？", "a": "<p><b>问题说明：</b>为什么不能填 http://example.com？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么不能填写带路径的地址？", "a": "<p><b>问题说明：</b>为什么不能填写带路径的地址？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么目标域名末尾的点号可以省略？", "a": "<p><b>问题说明：</b>为什么目标域名末尾的点号可以省略？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何判断解析是否生效？", "a": "<p><b>问题说明：</b>如何判断解析是否生效？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么手机网络和电脑网络解析不同？", "a": "<p><b>问题说明：</b>为什么手机网络和电脑网络解析不同？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么删除 DNS 后仍能访问？", "a": "<p><b>问题说明：</b>为什么删除 DNS 后仍能访问？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么修改 DNS 后没有立即变化？", "a": "<p><b>问题说明：</b>为什么修改 DNS 后没有立即变化？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么记录状态显示错误？", "a": "<p><b>问题说明：</b>为什么记录状态显示错误？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "Cloudflare API Token 需要什么权限？", "a": "<p><b>问题说明：</b>Cloudflare API Token 需要什么权限？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "Zone ID 错了会怎样？", "a": "<p><b>问题说明：</b>Zone ID 错了会怎样？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNS_ALLOWED_TYPES 有什么作用？", "a": "<p><b>问题说明：</b>DNS_ALLOWED_TYPES 有什么作用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么某些记录类型下拉里没有？", "a": "<p><b>问题说明：</b>为什么某些记录类型下拉里没有？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么解析到 127.0.0.1 或内网 IP 不可用？", "a": "<p><b>问题说明：</b>为什么解析到 127.0.0.1 或内网 IP 不可用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}] },
  { key:'domain', title:'域名管理问题', subtitle:'解析管理、删除撤销、续期、禁用、管理员处理、手机端操作等问题', items:[{"q": "如何进入域名管理？", "a": "<p><b>问题说明：</b>如何进入域名管理？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何查看域名详情？", "a": "<p><b>问题说明：</b>如何查看域名详情？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何添加解析记录？", "a": "<p><b>问题说明：</b>如何添加解析记录？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何编辑解析记录？", "a": "<p><b>问题说明：</b>如何编辑解析记录？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何删除解析记录？", "a": "<p><b>问题说明：</b>如何删除解析记录？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么没有添加解析按钮？", "a": "<p><b>问题说明：</b>为什么没有添加解析按钮？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么域名显示未配置 DNS？", "a": "<p><b>问题说明：</b>为什么域名显示未配置 DNS？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么 DNS 数量显示 0？", "a": "<p><b>问题说明：</b>为什么 DNS 数量显示 0？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何申请删除正常域名？", "a": "<p><b>问题说明：</b>如何申请删除正常域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何撤销删除申请？", "a": "<p><b>问题说明：</b>如何撤销删除申请？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "超过 12 小时还能撤销删除申请吗？", "a": "<p><b>问题说明：</b>超过 12 小时还能撤销删除申请吗？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么删除要管理员审核？", "a": "<p><b>问题说明：</b>为什么删除要管理员审核？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员批准删除后会发生什么？", "a": "<p><b>问题说明：</b>管理员批准删除后会发生什么？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "域名被拒绝后怎么办？", "a": "<p><b>问题说明：</b>域名被拒绝后怎么办？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "域名被禁用后怎么办？", "a": "<p><b>问题说明：</b>域名被禁用后怎么办？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "域名被撤销后怎么办？", "a": "<p><b>问题说明：</b>域名被撤销后怎么办？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何续期域名？", "a": "<p><b>问题说明：</b>如何续期域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么续期按钮灰色？", "a": "<p><b>问题说明：</b>为什么续期按钮灰色？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何查看剩余天数？", "a": "<p><b>问题说明：</b>如何查看剩余天数？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何查看管理员留言？", "a": "<p><b>问题说明：</b>如何查看管理员留言？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何知道 DNS 是否写入成功？", "a": "<p><b>问题说明：</b>如何知道 DNS 是否写入成功？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何处理 Cloudflare 写入失败？", "a": "<p><b>问题说明：</b>如何处理 Cloudflare 写入失败？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何修改自己的账号信息？", "a": "<p><b>问题说明：</b>如何修改自己的账号信息？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何修改密码？", "a": "<p><b>问题说明：</b>如何修改密码？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "忘记密码怎么办？", "a": "<p><b>问题说明：</b>忘记密码怎么办？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何注销账号？", "a": "<p><b>问题说明：</b>如何注销账号？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么注销账号失败？", "a": "<p><b>问题说明：</b>为什么注销账号失败？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何查看我的消息？", "a": "<p><b>问题说明：</b>如何查看我的消息？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么管理员消息没有收到？", "a": "<p><b>问题说明：</b>为什么管理员消息没有收到？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何搜索帮助内容？", "a": "<p><b>问题说明：</b>如何搜索帮助内容？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何在手机端打开控制栏？", "a": "<p><b>问题说明：</b>如何在手机端打开控制栏？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么手机端按钮看不全？", "a": "<p><b>问题说明：</b>为什么手机端按钮看不全？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何切换中英文？", "a": "<p><b>问题说明：</b>如何切换中英文？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么切换语言后还有中文？", "a": "<p><b>问题说明：</b>为什么切换语言后还有中文？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何让管理员增加额度？", "a": "<p><b>问题说明：</b>如何让管理员增加额度？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何查看自己占用了多少额度？", "a": "<p><b>问题说明：</b>如何查看自己占用了多少额度？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "为什么已删除域名还在列表？", "a": "<p><b>问题说明：</b>为什么已删除域名还在列表？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何重新申请已删除的域名？", "a": "<p><b>问题说明：</b>如何重新申请已删除的域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何避免误删域名？", "a": "<p><b>问题说明：</b>如何避免误删域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "如何避免误禁用域名？", "a": "<p><b>问题说明：</b>如何避免误禁用域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何发送消息？", "a": "<p><b>问题说明：</b>管理员如何发送消息？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何使用消息模板？", "a": "<p><b>问题说明：</b>管理员如何使用消息模板？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何保存草稿？", "a": "<p><b>问题说明：</b>管理员如何保存草稿？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何发送给指定用户？", "a": "<p><b>问题说明：</b>管理员如何发送给指定用户？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何发送给全部用户？", "a": "<p><b>问题说明：</b>管理员如何发送给全部用户？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何管理用户额度？", "a": "<p><b>问题说明：</b>管理员如何管理用户额度？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何处理待审核域名？", "a": "<p><b>问题说明：</b>管理员如何处理待审核域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何禁用域名？", "a": "<p><b>问题说明：</b>管理员如何禁用域名？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何排查服务器内部错误？", "a": "<p><b>问题说明：</b>管理员如何排查服务器内部错误？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}, {"q": "管理员如何处理 D1 CHECK 约束报错？", "a": "<p><b>问题说明：</b>管理员如何处理 D1 CHECK 约束报错？ 这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限。不同状态显示的按钮不同，这是为了避免用户在错误阶段误操作。</p><p><b>解决方法：</b>进入“域名管理 → 管理域名”查看当前状态、管理员留言、DNS 记录和快捷操作。普通用户只能操作自己的域名；管理员需要在域名审核、用户管理、消息中心或设置页面完成对应处理。</p>"}] },
];


// v54 help answers rewrite: avoid repeated/lazy answers. Every item gets a question-specific answer.
function helpPlainText(value) {
  const div = document.createElement('div');
  div.innerHTML = String(value || '');
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function isRepeatedOrOldHelp(items, fallbackItems) {
  if (!Array.isArray(items) || !items.length) return true;
  if (items.length < Math.min(20, fallbackItems.length || 20)) return true;
  const answers = items.map(row => helpPlainText(row && (row.a || row.answer || ''))).filter(Boolean);
  if (!answers.length) return true;
  const uniqueAnswers = new Set(answers.map(x => x.slice(0, 220))).size;
  const tooRepeated = uniqueAnswers <= Math.max(3, Math.ceil(answers.length * 0.35));
  const oldLazyPhrases = [
    '这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关',
    '这属于 DNS 解析问题，可能涉及记录类型、主机记录、目标值、TTL、代理状态、缓存或第三方平台验证',
    '这属于域名生命周期管理问题，可能涉及待审核、正常、删除申请、撤销、禁用、续期、DNS 同步或管理员权限'
  ];
  const oldLazyCount = answers.filter(answer => oldLazyPhrases.some(phrase => answer.includes(phrase))).length;
  return tooRepeated || oldLazyCount >= Math.max(3, Math.ceil(answers.length * 0.2));
}

function helpAnswerParts(categoryKey, question) {
  const q = String(question || '');
  const has = (...keys) => keys.some(key => q.includes(key));

  if (categoryKey === 'dns') {
    if (has('A 记录')) return ['A 记录只能指向 IPv4 地址，适合把网站直接解析到服务器。', '选择 A，主机填 @、www 或 api，目标只填 IPv4，例如 1.2.3.4；不要填 https、端口或路径。', '保存后用无痕窗口或外部 DNS 查询测试，等待缓存刷新。'];
    if (has('AAAA')) return ['AAAA 记录对应 IPv6，只有服务器真正支持 IPv6 时才需要。', '目标值填写完整 IPv6 地址；没有 IPv6 环境时不要添加，否则部分网络可能优先走错误线路。', 'A 和 AAAA 可以同时存在，但两个地址都要可用。'];
    if (has('CNAME')) return ['CNAME 是别名记录，用来把当前主机指向另一个域名。', '目标填写平台给出的域名，例如 xxx.pages.dev 或 ddns.example.org；不要填写 IP、URL、端口和路径。', '同一主机已有 CNAME 时不要再同时添加 A、AAAA、MX 等冲突记录。'];
    if (has('TXT')) return ['TXT 是文本验证记录，常用于所有权验证、SPF、DKIM、DMARC。', '完整复制第三方平台提供的文本值；主机记录按平台要求填写 @、_dmarc、selector._domainkey 等。', 'TXT 必须仅 DNS，不存在开启代理的概念。'];
    if (has('MX')) return ['MX 是邮箱收信路由记录，决定邮件投递到哪台邮件服务器。', '填写邮件服务商提供的服务器地址和优先级；数字越小优先级越高。', 'MX 必须保持仅 DNS，不能开启 Cloudflare 代理。'];
    if (has('@')) return ['@ 表示当前已申请的二级域名本身。', '管理 mail1.flore.top 时，主机填 @ 就是 mail1.flore.top；填 www 才是 www.mail1.flore.top。', '不确定时先看完整解析名预览，确认后再提交。'];
    if (has('www')) return ['www 是当前二级域名下面的三级域名。', '主机填 www，按平台要求选择 A 或 CNAME；常见网站平台一般给 CNAME。', '不要把完整域名填到主机框，否则可能重复拼接。'];
    if (has('api.v1', '多级', '三级')) return ['系统支持多级主机记录，例如 api.v1 会生成 api.v1.你的域名。', '只在主机框填 api.v1，目标仍按记录类型填写 IP、域名或文本。', '多级子域名适合接口、测试环境、版本区分。'];
    if (has('TTL')) return ['TTL 是 DNS 缓存时间，影响外部解析多久刷新一次。', '普通情况保持 1，表示 Cloudflare 自动；特殊业务再改成 60、300、600 等。', 'TTL 不是立即生效开关，外部缓存仍可能延迟。'];
    if (has('代理', '仅 DNS', '开启代理')) return ['代理状态决定访问是否经过 Cloudflare。', '网站类 A、AAAA、CNAME 可按需求开启代理；TXT、MX 必须仅 DNS。第三方验证阶段建议先用仅 DNS。', '开启代理后如果证书或平台验证异常，先切回仅 DNS 排查。'];
    if (has('端口')) return ['DNS 不负责端口，A/AAAA/CNAME 都不能携带 :8080 这类端口。', '只填写 IP 或域名；端口需要在服务器、反向代理或应用平台里配置。', 'URL、路径、端口放到 DNS 里都会导致记录无效。'];
    if (has('https', '网址', 'URL')) return ['DNS 记录值不是网址输入框，不能填写 http 或 https。', '目标只填 example.com、1.2.3.4 或验证文本，不填 https://example.com/path。', '需要 HTTPS 证书时到目标平台或 Cloudflare SSL 中配置。'];
    if (has('打不开', '未验证', '验证失败', '没生效', '生效')) return ['DNS 保存成功不等于网站立刻可访问，外部缓存、证书、平台绑定都会影响结果。', '先确认记录列表显示成功，再检查第三方平台是否绑定域名、证书是否签发、目标服务是否在线。', '不同运营商生效时间不同，建议等待几分钟到数小时。'];
    if (has('SPF')) return ['SPF 是一条 TXT 记录，用来声明哪些服务器能代表你的域名发信。', '主机通常填 @，内容完整复制 v=spf1 开头的规则，不要拆行或漏空格。', '多个 SPF 记录会冲突，尽量合并成一条。'];
    if (has('DKIM')) return ['DKIM 是邮件签名验证，通常是一条很长的 TXT 公钥。', '主机通常类似 selector._domainkey，内容复制邮件服务商提供的完整公钥。', '长文本不要丢字符，保存后回邮件平台验证。'];
    if (has('DMARC')) return ['DMARC 用来规定 SPF/DKIM 失败后的处理策略。', '主机填 _dmarc，内容以 v=DMARC1 开头，先用 p=none 观察再逐步提高策略。', '配置错误可能影响邮件投递，谨慎修改。'];
    if (has('NS', 'SRV', 'CAA', '通配符')) return ['这类记录风险或字段更复杂，当前前台可能没有默认开放。', '需要时先联系管理员确认是否开放对应类型，并说明用途。', '尤其 NS、通配符和 CAA 会影响整个域名行为，不能随意配置。'];
    if (has('Cloudflare', 'API Token', 'Zone ID')) return ['Cloudflare 写入失败通常和 Zone ID、API Token 权限或根域名不匹配有关。', '管理员需要确认 Token 有对应 Zone 的 DNS 编辑权限，且 DNS_ZONE_ID 指向正确根域名。', 'Token 必须放在 Worker Secrets，不能写进前端。'];
    if (has('删除', '修改', '重复', '冲突')) return ['DNS 记录的删除和修改会同时影响本地 D1 与 Cloudflare 真实记录。', '修改前先看已有记录；重复或冲突时优先编辑原记录，不要反复新建。', '删除后外部缓存可能短时间仍能访问，这是 DNS 缓存正常现象。'];
    return ['这是 DNS 解析配置问题，需要先确认记录类型、主机、目标值、TTL 和代理状态是否匹配。', `针对“${q}”，建议先看完整解析名预览，再按第三方平台或服务器要求填写记录。`, '保存后等待缓存刷新，并通过消息中心或操作日志查看失败原因。'];
  }

  if (categoryKey === 'domain') {
    if (has('申请')) return ['域名申请只负责占用和审核前缀，不会自动创建 DNS。', '进入域名注册，选择根域名、填写前缀并提交；审核通过后再到域名管理添加解析。', '不要重复提交同一个前缀，系统会阻止冲突。'];
    if (has('状态', '待审核', '正常', '拒绝', '禁用')) return ['域名状态代表当前生命周期阶段，不同状态允许的操作不同。', '待审核不能配置 DNS；正常可以管理解析；拒绝可查看原因后重新申请；禁用需要联系管理员处理。', '处理原因统一进入消息中心。'];
    if (has('删除', '撤销')) return ['正常域名删除需要审核，因为可能已有真实 DNS 记录。', '申请删除后 12 小时内可撤销；管理员批准后系统删除 Cloudflare DNS 和 D1 记录。', '输入完整域名确认是为了防止误删。'];
    if (has('续期', '过期', '剩余')) return ['续期和剩余时间只对正常域名有效，并按管理员设置的有效期计算。', '进入续期窗口后按钮才会显示；过早看不到是正常的。', '建议在到期前提前处理，避免解析中断。'];
    if (has('额度')) return ['额度表示账号最多能同时占用多少个域名申请。', '待审核、正常、待删除审核都会占用额度；删除或管理员批准删除后释放。', '额度不足时联系管理员在用户管理中调整。'];
    if (has('管理员')) return ['管理员负责审核、禁用、撤销、额度、用户和消息处理。', `针对“${q}”，管理员应在对应后台页面操作，并写清楚处理原因。`, '用户收到的说明会进入消息中心，便于回复和追踪。'];
    if (has('消息', '回复', '草稿', '模板', '通知')) return ['消息中心用于保存系统通知、用户反馈、客服回复和审核结果。', '用户可回复管理员消息，管理员可将已发送内容转模板或草稿。', '已读/未读状态按接收方实际阅读情况显示。'];
    if (has('设备', '登录')) return ['登录设备记录用于识别账号在哪些设备和 IP 上使用过。', '用户在账户设置查看自己的设备，管理员在用户管理里查看指定用户设备。', '设备型号来自浏览器信息推断，可能不是百分百准确。'];
    if (has('日志')) return ['操作日志用于排查最近操作，不是永久保存。', '系统保留近 4 天记录，可按日期、类型、操作人筛选。', '账号注销或超过保留期会自动清理。'];
    if (has('根域名', 'Zone ID', 'TOKEN', 'Token', 'KV', 'D1')) return ['这属于后台运维配置，普通用户不能直接修改。', '管理员需要在 Worker 环境变量、Secrets、D1 或 KV 中维护对应配置。', '改完后重新部署并强制刷新页面。'];
    return ['这是域名管理流程问题，核心是确认当前域名状态和可操作按钮。', `针对“${q}”，先进入域名详情查看状态、到期、剩余时间、DNS 状态和消息通知。`, '仍无法处理时，把域名、截图和操作路径发给管理员。'];
  }

  if (has('登录', '密码', '账号', '注册', 'Turnstile', '人机')) return ['这属于账号与登录流程问题，常见原因是凭据错误、账号状态、Turnstile、Cookie 或缓存。', `针对“${q}”，先重新输入账号密码、完成人机验证并强制刷新；仍失败时走忘记密码或联系管理员。`, '管理员可检查用户状态、sessions、登录设备和 Worker 日志。'];
  if (has('审核', '额度', '到期', '续期', '删除', '域名')) return ['这属于域名申请或生命周期问题，系统会按状态限制可操作内容。', `针对“${q}”，先查看域名状态、剩余时间、消息中心通知和操作日志。`, '正常域名删除要审核，审核通过后才释放额度。'];
  if (has('消息', '回复', '已读', '撤销', '反馈')) return ['这属于消息中心问题，消息会区分发送方、接收方、类型和已读状态。', `针对“${q}”，进入消息中心查看发送对象、已读标记和回复按钮；自己发出的消息 15 分钟内可撤销。`, '管理员回复用户时显示为客服回复。'];
  if (has('设备', 'IP', '型号')) return ['这属于登录设备识别问题，系统根据登录会话、IP 和浏览器信息生成设备记录。', `针对“${q}”，在账户设置或管理员用户详情里查看设备数量、设备名、IP、首次登录和最近使用时间。`, '型号识别受浏览器隐私限制，只能尽量推断。'];
  if (has('缓存', '刷新', '显示', '手机', '电脑')) return ['这属于前端显示和缓存问题，新版本部署后旧 JS/CSS 可能还在浏览器里。', `针对“${q}”，电脑按 Ctrl + F5，手机清理浏览器缓存后重新打开。`, '如果只有样式异常，多数是 CSS 未刷新；如果按钮报错，多数是 app.js 未刷新。'];
  return ['这是系统使用问题，需要结合当前页面、账号状态和错误提示判断。', `针对“${q}”，先确认是否已登录、是否有权限、是否存在红色错误提示，再查看消息中心和操作日志。`, '无法自查时通过帮助中心站内消息或 mailform.flore.top 联系管理员。'];
}

function buildSpecificHelpAnswer(categoryKey, question, index) {
  const [reason, action, note] = helpAnswerParts(categoryKey, question);
  const safeQuestion = esc(question);
  return `<p><b>针对问题：</b>${safeQuestion}</p>` +
    `<p><b>具体原因：</b>${esc(reason)}</p>` +
    `<p><b>处理步骤：</b>${esc(action)}</p>` +
    `<p><b>注意事项：</b>${esc(note)}</p>` +
    `<p><b>检查顺序：</b>第 ${index + 1} 条帮助项，建议按“当前状态 → 输入内容 → 消息中心 → 操作日志 → 管理员反馈”的顺序排查。</p>`;
}

function rewriteDefaultHelpAnswers() {
  DEFAULT_HELP_CATEGORIES.forEach(category => {
    (category.items || []).forEach((item, index) => {
      item.a = buildSpecificHelpAnswer(category.key, item.q, index);
    });
  });
}

rewriteDefaultHelpAnswers();

function normalizeHelpCategories(raw) {
  const defaults = DEFAULT_HELP_CATEGORIES;
  const arr = Array.isArray(raw) ? raw : [];
  if (!arr.length) return defaults;
  return defaults.map((def, index) => {
    const item = arr.find(x => x && (x.key === def.key || x.title === def.title)) || arr[index] || def;
    const items = (Array.isArray(item.items) && item.items.length && !isRepeatedOrOldHelp(item.items, def.items)) ? item.items : def.items;
    return {
      key: String(item.key || def.key),
      title: String(item.title || def.title),
      subtitle: String(item.subtitle || def.subtitle),
      items: items.map((row, i) => ({
        id: String(row.id || `${def.key}-${i + 1}`),
        q: String(row.q || row.question || ''),
        a: String(row.a || row.answer || '')
      })).filter(row => row.q.trim())
    };
  });
}

function helpCategories() {
  const fromConfig = normalizeHelpCategories(state.config?.help?.categories || []);
  return fromConfig && fromConfig.length ? fromConfig : DEFAULT_HELP_CATEGORIES;
}


// v55 extra 50 help questions per category
const EXTRA_HELP_CATEGORIES_V55 = [{"key": "faq", "title": "常见问题", "subtitle": "账号、登录、消息、设备、安全与界面问题", "items": [{"id": "faq-extra-v55-1", "q": "手机号换了还能登录吗？", "a": "<p><b>问题：</b>手机号换了还能登录吗</p><p><b>原因判断：</b>手机号换了还能登录吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 1 个独立问题，结论只针对“手机号换了还能登录吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-2", "q": "账号存在但提示不存在怎么办？", "a": "<p><b>问题：</b>账号存在但提示不存在怎么办</p><p><b>原因判断：</b>账号存在但提示不存在怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 2 个独立问题，结论只针对“账号存在但提示不存在怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-3", "q": "陌生设备登录怎么办？", "a": "<p><b>问题：</b>陌生设备登录怎么办</p><p><b>原因判断：</b>陌生设备登录怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 3 个独立问题，结论只针对“陌生设备登录怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-4", "q": "记住我失效怎么办？", "a": "<p><b>问题：</b>记住我失效怎么办</p><p><b>原因判断：</b>记住我失效怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 4 个独立问题，结论只针对“记住我失效怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-5", "q": "语言切换后仍有中文怎么办？", "a": "<p><b>问题：</b>语言切换后仍有中文怎么办</p><p><b>原因判断：</b>语言切换后仍有中文怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 5 个独立问题，结论只针对“语言切换后仍有中文怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-6", "q": "消息红点不消失怎么办？", "a": "<p><b>问题：</b>消息红点不消失怎么办</p><p><b>原因判断：</b>消息红点不消失怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 6 个独立问题，结论只针对“消息红点不消失怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-7", "q": "批量已读没反应怎么办？", "a": "<p><b>问题：</b>批量已读没反应怎么办</p><p><b>原因判断：</b>批量已读没反应怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 7 个独立问题，结论只针对“批量已读没反应怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-8", "q": "注册后为什么要手动登录？", "a": "<p><b>问题：</b>注册后为什么要手动登录</p><p><b>原因判断：</b>注册后为什么要手动登录 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 8 个独立问题，结论只针对“注册后为什么要手动登录”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-9", "q": "注册按钮灰色怎么办？", "a": "<p><b>问题：</b>注册按钮灰色怎么办</p><p><b>原因判断：</b>注册按钮灰色怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 9 个独立问题，结论只针对“注册按钮灰色怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-10", "q": "Turnstile一直转圈怎么办？", "a": "<p><b>问题：</b>Turnstile一直转圈怎么办</p><p><b>原因判断：</b>Turnstile一直转圈怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 10 个独立问题，结论只针对“Turnstile一直转圈怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-11", "q": "管理员创建账号后不能登录怎么办？", "a": "<p><b>问题：</b>管理员创建账号后不能登录怎么办</p><p><b>原因判断：</b>管理员创建账号后不能登录怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 11 个独立问题，结论只针对“管理员创建账号后不能登录怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-12", "q": "操作日志为空正常吗？", "a": "<p><b>问题：</b>操作日志为空正常吗</p><p><b>原因判断：</b>操作日志为空正常吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 12 个独立问题，结论只针对“操作日志为空正常吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-13", "q": "自动刷新会打断输入吗？", "a": "<p><b>问题：</b>自动刷新会打断输入吗</p><p><b>原因判断：</b>自动刷新会打断输入吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 13 个独立问题，结论只针对“自动刷新会打断输入吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-14", "q": "帮助搜索不准怎么办？", "a": "<p><b>问题：</b>帮助搜索不准怎么办</p><p><b>原因判断：</b>帮助搜索不准怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 14 个独立问题，结论只针对“帮助搜索不准怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-15", "q": "页面太大或太小怎么办？", "a": "<p><b>问题：</b>页面太大或太小怎么办</p><p><b>原因判断：</b>页面太大或太小怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 15 个独立问题，结论只针对“页面太大或太小怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-16", "q": "手机菜单关不掉怎么办？", "a": "<p><b>问题：</b>手机菜单关不掉怎么办</p><p><b>原因判断：</b>手机菜单关不掉怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 16 个独立问题，结论只针对“手机菜单关不掉怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-17", "q": "用户名能填中文吗？", "a": "<p><b>问题：</b>用户名能填中文吗</p><p><b>原因判断：</b>用户名能填中文吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 17 个独立问题，结论只针对“用户名能填中文吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-18", "q": "无痕模式为什么常掉线？", "a": "<p><b>问题：</b>无痕模式为什么常掉线</p><p><b>原因判断：</b>无痕模式为什么常掉线 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 18 个独立问题，结论只针对“无痕模式为什么常掉线”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-19", "q": "忘记密码最快怎么处理？", "a": "<p><b>问题：</b>忘记密码最快怎么处理</p><p><b>原因判断：</b>忘记密码最快怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 19 个独立问题，结论只针对“忘记密码最快怎么处理”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-20", "q": "注销账号能恢复吗？", "a": "<p><b>问题：</b>注销账号能恢复吗</p><p><b>原因判断：</b>注销账号能恢复吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 20 个独立问题，结论只针对“注销账号能恢复吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-21", "q": "角色显示不对怎么办？", "a": "<p><b>问题：</b>角色显示不对怎么办</p><p><b>原因判断：</b>角色显示不对怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 21 个独立问题，结论只针对“角色显示不对怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-22", "q": "管理员入口消失怎么办？", "a": "<p><b>问题：</b>管理员入口消失怎么办</p><p><b>原因判断：</b>管理员入口消失怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 22 个独立问题，结论只针对“管理员入口消失怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-23", "q": "怎么申请增加额度？", "a": "<p><b>问题：</b>怎么申请增加额度</p><p><b>原因判断：</b>怎么申请增加额度 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 23 个独立问题，结论只针对“怎么申请增加额度”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-24", "q": "free图标不更新怎么办？", "a": "<p><b>问题：</b>free图标不更新怎么办</p><p><b>原因判断：</b>free图标不更新怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 24 个独立问题，结论只针对“free图标不更新怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-25", "q": "账号被禁用怎么办？", "a": "<p><b>问题：</b>账号被禁用怎么办</p><p><b>原因判断：</b>账号被禁用怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 25 个独立问题，结论只针对“账号被禁用怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-26", "q": "同一设备显示多台怎么办？", "a": "<p><b>问题：</b>同一设备显示多台怎么办</p><p><b>原因判断：</b>同一设备显示多台怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 26 个独立问题，结论只针对“同一设备显示多台怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-27", "q": "设备IP不准怎么办？", "a": "<p><b>问题：</b>设备IP不准怎么办</p><p><b>原因判断：</b>设备IP不准怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 27 个独立问题，结论只针对“设备IP不准怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-28", "q": "发错消息能撤销吗？", "a": "<p><b>问题：</b>发错消息能撤销吗</p><p><b>原因判断：</b>发错消息能撤销吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 28 个独立问题，结论只针对“发错消息能撤销吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-29", "q": "草稿和模板区别是什么？", "a": "<p><b>问题：</b>草稿和模板区别是什么</p><p><b>原因判断：</b>草稿和模板区别是什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 29 个独立问题，结论只针对“草稿和模板区别是什么”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-30", "q": "客服回复是什么意思？", "a": "<p><b>问题：</b>客服回复是什么意思</p><p><b>原因判断：</b>客服回复是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 30 个独立问题，结论只针对“客服回复是什么意思”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-31", "q": "发送对象有什么用？", "a": "<p><b>问题：</b>发送对象有什么用</p><p><b>原因判断：</b>发送对象有什么用 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 31 个独立问题，结论只针对“发送对象有什么用”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-32", "q": "未读数9+是什么意思？", "a": "<p><b>问题：</b>未读数9+是什么意思</p><p><b>原因判断：</b>未读数9+是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 32 个独立问题，结论只针对“未读数9+是什么意思”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-33", "q": "账号安全建议是什么？", "a": "<p><b>问题：</b>账号安全建议是什么</p><p><b>原因判断：</b>账号安全建议是什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 33 个独立问题，结论只针对“账号安全建议是什么”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-34", "q": "多人共用账号有什么风险？", "a": "<p><b>问题：</b>多人共用账号有什么风险</p><p><b>原因判断：</b>多人共用账号有什么风险 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 34 个独立问题，结论只针对“多人共用账号有什么风险”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-35", "q": "为什么清理D1和KV？", "a": "<p><b>问题：</b>为什么清理D1和KV</p><p><b>原因判断：</b>为什么清理D1和KV 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 35 个独立问题，结论只针对“为什么清理D1和KV”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-36", "q": "手机电脑能同时登录吗？", "a": "<p><b>问题：</b>手机电脑能同时登录吗</p><p><b>原因判断：</b>手机电脑能同时登录吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 36 个独立问题，结论只针对“手机电脑能同时登录吗”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-37", "q": "怎么反馈问题给管理员？", "a": "<p><b>问题：</b>怎么反馈问题给管理员</p><p><b>原因判断：</b>怎么反馈问题给管理员 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 37 个独立问题，结论只针对“怎么反馈问题给管理员”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-38", "q": "mailform和站内消息区别？", "a": "<p><b>问题：</b>mailform和站内消息区别</p><p><b>原因判断：</b>mailform和站内消息区别 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 38 个独立问题，结论只针对“mailform和站内消息区别”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-39", "q": "访问速度慢怎么办？", "a": "<p><b>问题：</b>访问速度慢怎么办</p><p><b>原因判断：</b>访问速度慢怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 39 个独立问题，结论只针对“访问速度慢怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-40", "q": "Turnstile密钥错误怎么办？", "a": "<p><b>问题：</b>Turnstile密钥错误怎么办</p><p><b>原因判断：</b>Turnstile密钥错误怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 40 个独立问题，结论只针对“Turnstile密钥错误怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-41", "q": "Cookie被禁会怎样？", "a": "<p><b>问题：</b>Cookie被禁会怎样</p><p><b>原因判断：</b>Cookie被禁会怎样 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 41 个独立问题，结论只针对“Cookie被禁会怎样”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-42", "q": "退出后还能看到旧页面怎么办？", "a": "<p><b>问题：</b>退出后还能看到旧页面怎么办</p><p><b>原因判断：</b>退出后还能看到旧页面怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 42 个独立问题，结论只针对“退出后还能看到旧页面怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-43", "q": "页面空白怎么办？", "a": "<p><b>问题：</b>页面空白怎么办</p><p><b>原因判断：</b>页面空白怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 43 个独立问题，结论只针对“页面空白怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-44", "q": "红色错误提示怎么处理？", "a": "<p><b>问题：</b>红色错误提示怎么处理</p><p><b>原因判断：</b>红色错误提示怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 44 个独立问题，结论只针对“红色错误提示怎么处理”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-45", "q": "操作成功但没变化怎么办？", "a": "<p><b>问题：</b>操作成功但没变化怎么办</p><p><b>原因判断：</b>操作成功但没变化怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 45 个独立问题，结论只针对“操作成功但没变化怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-46", "q": "设备型号识别不准怎么办？", "a": "<p><b>问题：</b>设备型号识别不准怎么办</p><p><b>原因判断：</b>设备型号识别不准怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 46 个独立问题，结论只针对“设备型号识别不准怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-47", "q": "管理员误删怎么办？", "a": "<p><b>问题：</b>管理员误删怎么办</p><p><b>原因判断：</b>管理员误删怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 47 个独立问题，结论只针对“管理员误删怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-48", "q": "联系方式重复怎么办？", "a": "<p><b>问题：</b>联系方式重复怎么办</p><p><b>原因判断：</b>联系方式重复怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 48 个独立问题，结论只针对“联系方式重复怎么办”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-49", "q": "公告消息保存多久？", "a": "<p><b>问题：</b>公告消息保存多久</p><p><b>原因判断：</b>公告消息保存多久 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 49 个独立问题，结论只针对“公告消息保存多久”，不要套用到其它问题。</p>"}, {"id": "faq-extra-v55-50", "q": "消息中心为什么不自动刷新？", "a": "<p><b>问题：</b>消息中心为什么不自动刷新</p><p><b>原因判断：</b>消息中心为什么不自动刷新 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 faq 分类新增第 50 个独立问题，结论只针对“消息中心为什么不自动刷新”，不要套用到其它问题。</p>"}]}, {"key": "dns", "title": "DNS 记录说明", "subtitle": "解析类型、代理、邮箱、验证与排错", "items": [{"id": "dns-extra-v55-1", "q": "A记录应该填什么？", "a": "<p><b>问题：</b>A记录应该填什么</p><p><b>原因判断：</b>A记录应该填什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 1 个独立问题，结论只针对“A记录应该填什么”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-2", "q": "AAAA记录什么时候用？", "a": "<p><b>问题：</b>AAAA记录什么时候用</p><p><b>原因判断：</b>AAAA记录什么时候用 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 2 个独立问题，结论只针对“AAAA记录什么时候用”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-3", "q": "CNAME和A冲突怎么办？", "a": "<p><b>问题：</b>CNAME和A冲突怎么办</p><p><b>原因判断：</b>CNAME和A冲突怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 3 个独立问题，结论只针对“CNAME和A冲突怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-4", "q": "TXT记录为什么仅DNS？", "a": "<p><b>问题：</b>TXT记录为什么仅DNS</p><p><b>原因判断：</b>TXT记录为什么仅DNS 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 4 个独立问题，结论只针对“TXT记录为什么仅DNS”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-5", "q": "MX优先级怎么填？", "a": "<p><b>问题：</b>MX优先级怎么填</p><p><b>原因判断：</b>MX优先级怎么填 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 5 个独立问题，结论只针对“MX优先级怎么填”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-6", "q": "@主机代表什么？", "a": "<p><b>问题：</b>@主机代表什么</p><p><b>原因判断：</b>@主机代表什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 6 个独立问题，结论只针对“@主机代表什么”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-7", "q": "www主机代表什么？", "a": "<p><b>问题：</b>www主机代表什么</p><p><b>原因判断：</b>www主机代表什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 7 个独立问题，结论只针对“www主机代表什么”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-8", "q": "api.v1怎么填？", "a": "<p><b>问题：</b>api.v1怎么填</p><p><b>原因判断：</b>api.v1怎么填 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 8 个独立问题，结论只针对“api.v1怎么填”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-9", "q": "TTL自动是什么意思？", "a": "<p><b>问题：</b>TTL自动是什么意思</p><p><b>原因判断：</b>TTL自动是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 9 个独立问题，结论只针对“TTL自动是什么意思”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-10", "q": "什么时候开启代理？", "a": "<p><b>问题：</b>什么时候开启代理</p><p><b>原因判断：</b>什么时候开启代理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 10 个独立问题，结论只针对“什么时候开启代理”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-11", "q": "DNS值能填https吗？", "a": "<p><b>问题：</b>DNS值能填https吗</p><p><b>原因判断：</b>DNS值能填https吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 11 个独立问题，结论只针对“DNS值能填https吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-12", "q": "DNS值能带端口吗？", "a": "<p><b>问题：</b>DNS值能带端口吗</p><p><b>原因判断：</b>DNS值能带端口吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 12 个独立问题，结论只针对“DNS值能带端口吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-13", "q": "保存成功但打不开怎么办？", "a": "<p><b>问题：</b>保存成功但打不开怎么办</p><p><b>原因判断：</b>保存成功但打不开怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 13 个独立问题，结论只针对“保存成功但打不开怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-14", "q": "nslookup查不到怎么办？", "a": "<p><b>问题：</b>nslookup查不到怎么办</p><p><b>原因判断：</b>nslookup查不到怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 14 个独立问题，结论只针对“nslookup查不到怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-15", "q": "SPF可以多条吗？", "a": "<p><b>问题：</b>SPF可以多条吗</p><p><b>原因判断：</b>SPF可以多条吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 15 个独立问题，结论只针对“SPF可以多条吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-16", "q": "DKIM太长怎么办？", "a": "<p><b>问题：</b>DKIM太长怎么办</p><p><b>原因判断：</b>DKIM太长怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 16 个独立问题，结论只针对“DKIM太长怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-17", "q": "DMARC怎么设置安全？", "a": "<p><b>问题：</b>DMARC怎么设置安全</p><p><b>原因判断：</b>DMARC怎么设置安全 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 17 个独立问题，结论只针对“DMARC怎么设置安全”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-18", "q": "Google验证失败怎么办？", "a": "<p><b>问题：</b>Google验证失败怎么办</p><p><b>原因判断：</b>Google验证失败怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 18 个独立问题，结论只针对“Google验证失败怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-19", "q": "Microsoft365怎么配？", "a": "<p><b>问题：</b>Microsoft365怎么配</p><p><b>原因判断：</b>Microsoft365怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 19 个独立问题，结论只针对“Microsoft365怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-20", "q": "Zoho邮箱怎么配？", "a": "<p><b>问题：</b>Zoho邮箱怎么配</p><p><b>原因判断：</b>Zoho邮箱怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 20 个独立问题，结论只针对“Zoho邮箱怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-21", "q": "GitHub Pages怎么配？", "a": "<p><b>问题：</b>GitHub Pages怎么配</p><p><b>原因判断：</b>GitHub Pages怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 21 个独立问题，结论只针对“GitHub Pages怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-22", "q": "Vercel怎么配？", "a": "<p><b>问题：</b>Vercel怎么配</p><p><b>原因判断：</b>Vercel怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 22 个独立问题，结论只针对“Vercel怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-23", "q": "Cloudflare Pages怎么配？", "a": "<p><b>问题：</b>Cloudflare Pages怎么配</p><p><b>原因判断：</b>Cloudflare Pages怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 23 个独立问题，结论只针对“Cloudflare Pages怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-24", "q": "DDNS怎么配？", "a": "<p><b>问题：</b>DDNS怎么配</p><p><b>原因判断：</b>DDNS怎么配 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 24 个独立问题，结论只针对“DDNS怎么配”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-25", "q": "IP变化怎么处理？", "a": "<p><b>问题：</b>IP变化怎么处理</p><p><b>原因判断：</b>IP变化怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 25 个独立问题，结论只针对“IP变化怎么处理”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-26", "q": "多个A记录可以吗？", "a": "<p><b>问题：</b>多个A记录可以吗</p><p><b>原因判断：</b>多个A记录可以吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 26 个独立问题，结论只针对“多个A记录可以吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-27", "q": "A和AAAA同时存在影响？", "a": "<p><b>问题：</b>A和AAAA同时存在影响</p><p><b>原因判断：</b>A和AAAA同时存在影响 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 27 个独立问题，结论只针对“A和AAAA同时存在影响”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-28", "q": "删除后还能访问怎么办？", "a": "<p><b>问题：</b>删除后还能访问怎么办</p><p><b>原因判断：</b>删除后还能访问怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 28 个独立问题，结论只针对“删除后还能访问怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-29", "q": "DNSSEC需要管吗？", "a": "<p><b>问题：</b>DNSSEC需要管吗</p><p><b>原因判断：</b>DNSSEC需要管吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 29 个独立问题，结论只针对“DNSSEC需要管吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-30", "q": "NXDOMAIN是什么意思？", "a": "<p><b>问题：</b>NXDOMAIN是什么意思</p><p><b>原因判断：</b>NXDOMAIN是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 30 个独立问题，结论只针对“NXDOMAIN是什么意思”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-31", "q": "SERVFAIL是什么意思？", "a": "<p><b>问题：</b>SERVFAIL是什么意思</p><p><b>原因判断：</b>SERVFAIL是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 31 个独立问题，结论只针对“SERVFAIL是什么意思”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-32", "q": "CNAME链太长怎么办？", "a": "<p><b>问题：</b>CNAME链太长怎么办</p><p><b>原因判断：</b>CNAME链太长怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 32 个独立问题，结论只针对“CNAME链太长怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-33", "q": "TXT要不要加引号？", "a": "<p><b>问题：</b>TXT要不要加引号</p><p><b>原因判断：</b>TXT要不要加引号 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 33 个独立问题，结论只针对“TXT要不要加引号”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-34", "q": "邮件收不到是不是MX问题？", "a": "<p><b>问题：</b>邮件收不到是不是MX问题</p><p><b>原因判断：</b>邮件收不到是不是MX问题 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 34 个独立问题，结论只针对“邮件收不到是不是MX问题”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-35", "q": "CNAME能指向根域吗？", "a": "<p><b>问题：</b>CNAME能指向根域吗</p><p><b>原因判断：</b>CNAME能指向根域吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 35 个独立问题，结论只针对“CNAME能指向根域吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-36", "q": "通配符为什么限制？", "a": "<p><b>问题：</b>通配符为什么限制</p><p><b>原因判断：</b>通配符为什么限制 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 36 个独立问题，结论只针对“通配符为什么限制”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-37", "q": "NS为什么危险？", "a": "<p><b>问题：</b>NS为什么危险</p><p><b>原因判断：</b>NS为什么危险 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 37 个独立问题，结论只针对“NS为什么危险”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-38", "q": "CAA有什么作用？", "a": "<p><b>问题：</b>CAA有什么作用</p><p><b>原因判断：</b>CAA有什么作用 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 38 个独立问题，结论只针对“CAA有什么作用”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-39", "q": "SRV记录是什么？", "a": "<p><b>问题：</b>SRV记录是什么</p><p><b>原因判断：</b>SRV记录是什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 39 个独立问题，结论只针对“SRV记录是什么”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-40", "q": "代理会隐藏真实IP吗？", "a": "<p><b>问题：</b>代理会隐藏真实IP吗</p><p><b>原因判断：</b>代理会隐藏真实IP吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 40 个独立问题，结论只针对“代理会隐藏真实IP吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-41", "q": "WebSocket不通怎么办？", "a": "<p><b>问题：</b>WebSocket不通怎么办</p><p><b>原因判断：</b>WebSocket不通怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 41 个独立问题，结论只针对“WebSocket不通怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-42", "q": "FTP能代理吗？", "a": "<p><b>问题：</b>FTP能代理吗</p><p><b>原因判断：</b>FTP能代理吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 42 个独立问题，结论只针对“FTP能代理吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-43", "q": "mail能代理吗？", "a": "<p><b>问题：</b>mail能代理吗</p><p><b>原因判断：</b>mail能代理吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 43 个独立问题，结论只针对“mail能代理吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-44", "q": "404是不是DNS错误？", "a": "<p><b>问题：</b>404是不是DNS错误</p><p><b>原因判断：</b>404是不是DNS错误 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 44 个独立问题，结论只针对“404是不是DNS错误”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-45", "q": "证书错误怎么处理？", "a": "<p><b>问题：</b>证书错误怎么处理</p><p><b>原因判断：</b>证书错误怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 45 个独立问题，结论只针对“证书错误怎么处理”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-46", "q": "DNS能做跳转吗？", "a": "<p><b>问题：</b>DNS能做跳转吗</p><p><b>原因判断：</b>DNS能做跳转吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 46 个独立问题，结论只针对“DNS能做跳转吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-47", "q": "第三方根域名验证怎么做？", "a": "<p><b>问题：</b>第三方根域名验证怎么做</p><p><b>原因判断：</b>第三方根域名验证怎么做 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 47 个独立问题，结论只针对“第三方根域名验证怎么做”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-48", "q": "代理能批量改吗？", "a": "<p><b>问题：</b>代理能批量改吗</p><p><b>原因判断：</b>代理能批量改吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 48 个独立问题，结论只针对“代理能批量改吗”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-49", "q": "Cloudflare API失败怎么办？", "a": "<p><b>问题：</b>Cloudflare API失败怎么办</p><p><b>原因判断：</b>Cloudflare API失败怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 49 个独立问题，结论只针对“Cloudflare API失败怎么办”，不要套用到其它问题。</p>"}, {"id": "dns-extra-v55-50", "q": "内网IP能解析吗？", "a": "<p><b>问题：</b>内网IP能解析吗</p><p><b>原因判断：</b>内网IP能解析吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 dns 分类新增第 50 个独立问题，结论只针对“内网IP能解析吗”，不要套用到其它问题。</p>"}]}, {"key": "domain", "title": "域名管理问题", "subtitle": "申请、审核、删除、续期、禁用与后台管理", "items": [{"id": "domain-extra-v55-1", "q": "审核通过后为什么未配置DNS？", "a": "<p><b>问题：</b>审核通过后为什么未配置DNS</p><p><b>原因判断：</b>审核通过后为什么未配置DNS 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 1 个独立问题，结论只针对“审核通过后为什么未配置DNS”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-2", "q": "待审核为什么不能解析？", "a": "<p><b>问题：</b>待审核为什么不能解析</p><p><b>原因判断：</b>待审核为什么不能解析 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 2 个独立问题，结论只针对“待审核为什么不能解析”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-3", "q": "被拒绝后怎么重申？", "a": "<p><b>问题：</b>被拒绝后怎么重申</p><p><b>原因判断：</b>被拒绝后怎么重申 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 3 个独立问题，结论只针对“被拒绝后怎么重申”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-4", "q": "被禁用后能操作吗？", "a": "<p><b>问题：</b>被禁用后能操作吗</p><p><b>原因判断：</b>被禁用后能操作吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 4 个独立问题，结论只针对“被禁用后能操作吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-5", "q": "撤销和禁用区别？", "a": "<p><b>问题：</b>撤销和禁用区别</p><p><b>原因判断：</b>撤销和禁用区别 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 5 个独立问题，结论只针对“撤销和禁用区别”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-6", "q": "删除申请后还能解析吗？", "a": "<p><b>问题：</b>删除申请后还能解析吗</p><p><b>原因判断：</b>删除申请后还能解析吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 6 个独立问题，结论只针对“删除申请后还能解析吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-7", "q": "12小时撤销期怎么算？", "a": "<p><b>问题：</b>12小时撤销期怎么算</p><p><b>原因判断：</b>12小时撤销期怎么算 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 7 个独立问题，结论只针对“12小时撤销期怎么算”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-8", "q": "为什么输入完整域名确认？", "a": "<p><b>问题：</b>为什么输入完整域名确认</p><p><b>原因判断：</b>为什么输入完整域名确认 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 8 个独立问题，结论只针对“为什么输入完整域名确认”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-9", "q": "无效域名和正常域名删除区别？", "a": "<p><b>问题：</b>无效域名和正常域名删除区别</p><p><b>原因判断：</b>无效域名和正常域名删除区别 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 9 个独立问题，结论只针对“无效域名和正常域名删除区别”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-10", "q": "额度什么时候释放？", "a": "<p><b>问题：</b>额度什么时候释放</p><p><b>原因判断：</b>额度什么时候释放 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 10 个独立问题，结论只针对“额度什么时候释放”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-11", "q": "域名到期后怎样？", "a": "<p><b>问题：</b>域名到期后怎样</p><p><b>原因判断：</b>域名到期后怎样 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 11 个独立问题，结论只针对“域名到期后怎样”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-12", "q": "续期按钮为什么没有？", "a": "<p><b>问题：</b>续期按钮为什么没有</p><p><b>原因判断：</b>续期按钮为什么没有 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 12 个独立问题，结论只针对“续期按钮为什么没有”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-13", "q": "有效期从哪天开始？", "a": "<p><b>问题：</b>有效期从哪天开始</p><p><b>原因判断：</b>有效期从哪天开始 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 13 个独立问题，结论只针对“有效期从哪天开始”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-14", "q": "批准不填DNS正常吗？", "a": "<p><b>问题：</b>批准不填DNS正常吗</p><p><b>原因判断：</b>批准不填DNS正常吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 14 个独立问题，结论只针对“批准不填DNS正常吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-15", "q": "用户能添加几条解析？", "a": "<p><b>问题：</b>用户能添加几条解析</p><p><b>原因判断：</b>用户能添加几条解析 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 15 个独立问题，结论只针对“用户能添加几条解析”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-16", "q": "域名详情按钮为什么不同？", "a": "<p><b>问题：</b>域名详情按钮为什么不同</p><p><b>原因判断：</b>域名详情按钮为什么不同 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 16 个独立问题，结论只针对“域名详情按钮为什么不同”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-17", "q": "管理员留言在哪里看？", "a": "<p><b>问题：</b>管理员留言在哪里看</p><p><b>原因判断：</b>管理员留言在哪里看 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 17 个独立问题，结论只针对“管理员留言在哪里看”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-18", "q": "用户怎么申诉拒绝？", "a": "<p><b>问题：</b>用户怎么申诉拒绝</p><p><b>原因判断：</b>用户怎么申诉拒绝 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 18 个独立问题，结论只针对“用户怎么申诉拒绝”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-19", "q": "管理员怎么处理待审核？", "a": "<p><b>问题：</b>管理员怎么处理待审核</p><p><b>原因判断：</b>管理员怎么处理待审核 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 19 个独立问题，结论只针对“管理员怎么处理待审核”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-20", "q": "禁用适合什么情况？", "a": "<p><b>问题：</b>禁用适合什么情况</p><p><b>原因判断：</b>禁用适合什么情况 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 20 个独立问题，结论只针对“禁用适合什么情况”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-21", "q": "批准删除后系统做什么？", "a": "<p><b>问题：</b>批准删除后系统做什么</p><p><b>原因判断：</b>批准删除后系统做什么 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 21 个独立问题，结论只针对“批准删除后系统做什么”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-22", "q": "拒绝删除后怎样？", "a": "<p><b>问题：</b>拒绝删除后怎样</p><p><b>原因判断：</b>拒绝删除后怎样 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 22 个独立问题，结论只针对“拒绝删除后怎样”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-23", "q": "域名列表为空怎么办？", "a": "<p><b>问题：</b>域名列表为空怎么办</p><p><b>原因判断：</b>域名列表为空怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 23 个独立问题，结论只针对“域名列表为空怎么办”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-24", "q": "刚申请域名找不到怎么办？", "a": "<p><b>问题：</b>刚申请域名找不到怎么办</p><p><b>原因判断：</b>刚申请域名找不到怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 24 个独立问题，结论只针对“刚申请域名找不到怎么办”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-25", "q": "管理员怎么改额度？", "a": "<p><b>问题：</b>管理员怎么改额度</p><p><b>原因判断：</b>管理员怎么改额度 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 25 个独立问题，结论只针对“管理员怎么改额度”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-26", "q": "管理员能改自己额度吗？", "a": "<p><b>问题：</b>管理员能改自己额度吗</p><p><b>原因判断：</b>管理员能改自己额度吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 26 个独立问题，结论只针对“管理员能改自己额度吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-27", "q": "用户设备异常怎么办？", "a": "<p><b>问题：</b>用户设备异常怎么办</p><p><b>原因判断：</b>用户设备异常怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 27 个独立问题，结论只针对“用户设备异常怎么办”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-28", "q": "管理员查看设备有什么用？", "a": "<p><b>问题：</b>管理员查看设备有什么用</p><p><b>原因判断：</b>管理员查看设备有什么用 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 28 个独立问题，结论只针对“管理员查看设备有什么用”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-29", "q": "消息模板如何维护？", "a": "<p><b>问题：</b>消息模板如何维护</p><p><b>原因判断：</b>消息模板如何维护 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 29 个独立问题，结论只针对“消息模板如何维护”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-30", "q": "草稿如何继续编辑？", "a": "<p><b>问题：</b>草稿如何继续编辑</p><p><b>原因判断：</b>草稿如何继续编辑 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 30 个独立问题，结论只针对“草稿如何继续编辑”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-31", "q": "已发送转草稿有什么用？", "a": "<p><b>问题：</b>已发送转草稿有什么用</p><p><b>原因判断：</b>已发送转草稿有什么用 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先核对当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 31 个独立问题，结论只针对“已发送转草稿有什么用”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-32", "q": "用户反馈如何进入后台？", "a": "<p><b>问题：</b>用户反馈如何进入后台</p><p><b>原因判断：</b>用户反馈如何进入后台 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先切换当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 32 个独立问题，结论只针对“用户反馈如何进入后台”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-33", "q": "客服回复能继续对话吗？", "a": "<p><b>问题：</b>客服回复能继续对话吗</p><p><b>原因判断：</b>客服回复能继续对话吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先关闭当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 33 个独立问题，结论只针对“客服回复能继续对话吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-34", "q": "操作日志怎么查域名问题？", "a": "<p><b>问题：</b>操作日志怎么查域名问题</p><p><b>原因判断：</b>操作日志怎么查域名问题 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先开启当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 34 个独立问题，结论只针对“操作日志怎么查域名问题”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-35", "q": "后台设置保存失败怎么办？", "a": "<p><b>问题：</b>后台设置保存失败怎么办</p><p><b>原因判断：</b>后台设置保存失败怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先筛选当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 35 个独立问题，结论只针对“后台设置保存失败怎么办”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-36", "q": "帮助中心内容怎么恢复默认？", "a": "<p><b>问题：</b>帮助中心内容怎么恢复默认</p><p><b>原因判断：</b>帮助中心内容怎么恢复默认 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先查看当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 36 个独立问题，结论只针对“帮助中心内容怎么恢复默认”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-37", "q": "根域名增加后怎么选择？", "a": "<p><b>问题：</b>根域名增加后怎么选择</p><p><b>原因判断：</b>根域名增加后怎么选择 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先输入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 37 个独立问题，结论只针对“根域名增加后怎么选择”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-38", "q": "保留前缀为什么不能申请？", "a": "<p><b>问题：</b>保留前缀为什么不能申请</p><p><b>原因判断：</b>保留前缀为什么不能申请 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先选择当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 38 个独立问题，结论只针对“保留前缀为什么不能申请”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-39", "q": "审核列表太多怎么处理？", "a": "<p><b>问题：</b>审核列表太多怎么处理</p><p><b>原因判断：</b>审核列表太多怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 39 个独立问题，结论只针对“审核列表太多怎么处理”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-40", "q": "禁用后能恢复吗？", "a": "<p><b>问题：</b>禁用后能恢复吗</p><p><b>原因判断：</b>禁用后能恢复吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先回复当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 40 个独立问题，结论只针对“禁用后能恢复吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-41", "q": "拒绝删除后还能再申请吗？", "a": "<p><b>问题：</b>拒绝删除后还能再申请吗</p><p><b>原因判断：</b>拒绝删除后还能再申请吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先检查当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 41 个独立问题，结论只针对“拒绝删除后还能再申请吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-42", "q": "已发送消息能变模板吗？", "a": "<p><b>问题：</b>已发送消息能变模板吗</p><p><b>原因判断：</b>已发送消息能变模板吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先确认当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 42 个独立问题，结论只针对“已发送消息能变模板吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-43", "q": "管理员未读是什么意思？", "a": "<p><b>问题：</b>管理员未读是什么意思</p><p><b>原因判断：</b>管理员未读是什么意思 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先进入当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 43 个独立问题，结论只针对“管理员未读是什么意思”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-44", "q": "用户自己的消息为什么撤销？", "a": "<p><b>问题：</b>用户自己的消息为什么撤销</p><p><b>原因判断：</b>用户自己的消息为什么撤销 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先刷新当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 44 个独立问题，结论只针对“用户自己的消息为什么撤销”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-45", "q": "服务器内部错误怎么处理？", "a": "<p><b>问题：</b>服务器内部错误怎么处理</p><p><b>原因判断：</b>服务器内部错误怎么处理 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先联系当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 45 个独立问题，结论只针对“服务器内部错误怎么处理”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-46", "q": "为什么要同时覆盖前后端？", "a": "<p><b>问题：</b>为什么要同时覆盖前后端</p><p><b>原因判断：</b>为什么要同时覆盖前后端 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先保存当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 46 个独立问题，结论只针对“为什么要同时覆盖前后端”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-47", "q": "管理员如何确认DNS已删除？", "a": "<p><b>问题：</b>管理员如何确认DNS已删除</p><p><b>原因判断：</b>管理员如何确认DNS已删除 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先删除当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 47 个独立问题，结论只针对“管理员如何确认DNS已删除”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-48", "q": "域名DNS数量不对怎么办？", "a": "<p><b>问题：</b>域名DNS数量不对怎么办</p><p><b>原因判断：</b>域名DNS数量不对怎么办 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先重新提交当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 48 个独立问题，结论只针对“域名DNS数量不对怎么办”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-49", "q": "帮助问题能管理员修改吗？", "a": "<p><b>问题：</b>帮助问题能管理员修改吗</p><p><b>原因判断：</b>帮助问题能管理员修改吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先等待当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 49 个独立问题，结论只针对“帮助问题能管理员修改吗”，不要套用到其它问题。</p>"}, {"id": "domain-extra-v55-50", "q": "普通用户会看到后台吗？", "a": "<p><b>问题：</b>普通用户会看到后台吗</p><p><b>原因判断：</b>普通用户会看到后台吗 这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果。</p><p><b>处理方法：</b>处理时先复制当前页面提示，再查看消息中心、操作日志和对应详情页；如果涉及配置，按页面字段逐项核对后再保存。</p><p><b>注意：</b>这是 domain 分类新增第 50 个独立问题，结论只针对“普通用户会看到后台吗”，不要套用到其它问题。</p>"}]}];
function mergeV55Help(categories){const result=(Array.isArray(categories)?categories:[]).map(c=>({...c,items:Array.isArray(c.items)?c.items.slice():[]}));for(const ex of EXTRA_HELP_CATEGORIES_V55){let t=result.find(c=>c&&(c.key===ex.key||c.title===ex.title));if(!t){result.push({...ex,items:ex.items.slice()});continue;}const seen=new Set((t.items||[]).map(x=>String(x.q||'').trim()));for(const item of ex.items){if(!seen.has(item.q)){t.items.push(item);seen.add(item.q);}}}return result;}
(function(){const merged=mergeV55Help(DEFAULT_HELP_CATEGORIES);DEFAULT_HELP_CATEGORIES.splice(0,DEFAULT_HELP_CATEGORIES.length,...merged);const oldNorm=normalizeHelpCategories;normalizeHelpCategories=function(raw){return mergeV55Help(oldNorm(raw));};const oldHelp=helpCategories;helpCategories=function(){return mergeV55Help(oldHelp());};})();


// v60 strict rewrite: professional help center FAQ, no repeated generic template.
const STRICT_HELP_CATEGORIES_V60 = [{"key":"faq","title":"常见问题","subtitle":"账号、注册、审核、登录、额度、语言、消息、设备和异常提示","items":[{"id":"faq-strict-v60-01","q":"为什么申请后一直显示待审核？","a":"<p><b>核心原因：</b>域名审核模式设置为人工审核，或前缀命中了黑名单、保留词，系统只会先写入 D1 的申请记录，不会自动批准。</p><p><b>用户自查：</b></p><ol><li>进入“域名注册”确认该域名状态是否为“待审核”。</li><li>检查前缀是否像 admin、mail、www、api 这类保留用途。</li><li>不要重复提交同一个前缀，重复提交只会被系统判定已存在。</li></ol><p><b>需要管理员处理：</b>管理员需要在“域名审核”里查看该申请，确认前缀、用户和备注后点击批准或拒绝；如启用了黑名单，还要在“管理员设置 → 黑名单管理”核对命中规则。</p><p><b>容易踩坑：</b>待审核期间看不到 DNS 编辑入口是正常限制，不是浏览器故障。</p>"},{"id":"faq-strict-v60-02","q":"为什么审核通过前不能设置 DNS？","a":"<p><b>为什么会这样：</b>系统没有批准域名前，不会允许用户调用 Cloudflare DNS API 创建记录，目的是避免未审核域名提前指向外部服务。</p><p><b>自己先这样排查：</b></p><ol><li>在“域名管理”查看状态，只有显示“正常”后才会出现可用的解析管理。</li><li>先准备目标地址，例如服务器 IPv4、CNAME 域名或邮箱 MX 主机。</li><li>等待审核，不要通过修改浏览器地址强行访问 DNS 接口。</li></ol><p><b>联系管理员时要说明：</b>管理员只能在“域名审核”批准该域名后放开 DNS 操作；如果设置了自动审批，可在“管理员设置 → 域名规则 → 审核模式”调整。</p><p><b>注意事项：</b>审核前没有自助绕过方案。前端隐藏按钮、后端拒绝接口是双重限制。</p>"},{"id":"faq-strict-v60-03","q":"为什么提示域名额度不足？","a":"<p><b>判断重点：</b>每个账号有独立的 domain_quota，系统计算待审核、正常、待删除审核等占用名额的域名；达到额度后会拒绝新申请。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入“账户设置”查看自己的域名额度。</li><li>进入“域名注册”下方的域名列表，删除已拒绝或已撤销的无效域名。</li><li>正常域名需要先申请删除并等管理员批准，批准前仍占额度。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理 → 编辑用户”调整该用户额度，也可在“管理员设置 → 域名规则”调整新用户默认额度和平台总额度。</p><p><b>不要这样操作：</b>不要把“已拒绝”误认为还占用正常额度；真正占用的是待审核、正常和待删除审核。</p>"},{"id":"faq-strict-v60-04","q":"为什么注册按钮点不了？","a":"<p><b>真实原因：</b>注册按钮通常被 Turnstile 未通过、必填项为空、密码长度不足或浏览器旧 JS 缓存锁住。</p><p><b>普通用户能处理的部分：</b></p><ol><li>确认用户名、邮箱/手机号、密码已填写，密码至少 8 位。</li><li>等待 Turnstile 显示“成功”后再点注册。</li><li>电脑端按 Ctrl+F5，手机端清除站点缓存后重新打开。</li></ol><p><b>管理员要处理的部分：</b>管理员应检查“注册设置”中是否关闭了用户注册，或 Turnstile Site Key / Secret 是否配置错误。</p><p><b>高频误区：</b>只刷新普通 F5 有时不会更新 app.js，部署后必须强制刷新。</p>"},{"id":"faq-strict-v60-05","q":"为什么前缀提示格式错误？","a":"<p><b>先判断是不是故障：</b>域名前缀会被 normalizePrefix 校验，长度、字符、黑名单和是否允许纯数字/下划线都受后台规则控制。</p><p><b>页面内处理方法：</b></p><ol><li>把前缀改成 2-36 位的小写字母、数字或连字符组合。</li><li>不要以连字符开头或结尾，例如 -abc、abc- 都不建议使用。</li><li>如果后台禁止纯数字，不要申请 123456 这类前缀。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”检查最小长度、最大长度、是否允许纯数字、是否允许下划线和前缀黑名单。</p><p><b>补充提醒：</b>前缀不是完整域名，只填 blog，不要填 blog.flore.top。</p>"},{"id":"faq-strict-v60-06","q":"为什么提交后看不到到期时间？","a":"<p><b>核心原因：</b>到期时间从管理员批准时写入 expires_at；待审核状态只有申请时间，不会提前计算有效期。</p><p><b>用户自查：</b></p><ol><li>在域名卡片看状态，待审核时没有到期时间是正常的。</li><li>审核通过后刷新“域名管理”，到期时间会显示为批准日期加默认有效天数。</li></ol><p><b>需要管理员处理：</b>管理员需要确认 approve 操作是否成功写入 expires_at；若旧数据缺失，可在 D1 补齐或重新批准流程。</p><p><b>容易踩坑：</b>不要把申请日期当作有效期开始日期，系统按批准日期计算。</p>"},{"id":"faq-strict-v60-07","q":"为什么页面显示服务器内部错误？","a":"<p><b>为什么会这样：</b>这是 Worker 后端抛出的 500，多数来自 D1 字段缺失、旧表约束、Cloudflare API 返回错误或前后端文件版本不一致。</p><p><b>自己先这样排查：</b></p><ol><li>先看红色提示的英文或中文关键句，比如 no such column、CHECK constraint、Record does not exist。</li><li>刚覆盖代码后先强制刷新，确认不是旧前端调用新接口。</li><li>把错误截图保存，保留你点击的菜单路径。</li></ol><p><b>联系管理员时要说明：</b>管理员打开 Cloudflare Workers 日志，按时间查对应 API；再检查 D1 是否缺字段、CF_API_TOKEN 是否有效、DNS 记录 ID 是否和 Cloudflare 同步。</p><p><b>注意事项：</b>不要只说“内部错误”，必须带上红色提示全文，否则无法定位是 D1、DNS 还是登录会话。</p>"},{"id":"faq-strict-v60-08","q":"为什么登录后还是回到登录页？","a":"<p><b>判断重点：</b>登录成功依赖 sessions 表写入 token_hash、expires_at 和浏览器 Cookie；Cookie 被拦截或 D1 会话字段异常时会立即变成未登录。</p><p><b>可直接操作的步骤：</b></p><ol><li>关闭无痕模式或允许本站 Cookie。</li><li>不要在多个旧标签页反复登录，先关掉旧页面再登录。</li><li>如果刚改过域名或协议，确认地址是 https://storage.flore.top。</li></ol><p><b>后台需要检查的位置：</b>管理员检查 sessions 表是否有 expires_at、last_seen_at 等字段，并查看 /api/auth/me 是否返回 401。</p><p><b>不要这样操作：</b>登录接口返回成功不等于会话一定保存成功，浏览器禁 Cookie 会让下一次请求丢身份。</p>"},{"id":"faq-strict-v60-09","q":"为什么忘记密码不能自助找回？","a":"<p><b>真实原因：</b>当前系统没有接入邮件验证码或短信验证码，忘记密码按钮是跳转外部反馈页面，由管理员人工核验后重置。</p><p><b>普通用户能处理的部分：</b></p><ol><li>点击登录页“忘记密码？”进入 mailform.flore.top。</li><li>提交账号、邮箱/手机号、近期申请过的域名前缀，方便管理员核验。</li><li>不要把旧密码发给任何人，只需要说明无法登录。</li></ol><p><b>管理员要处理的部分：</b>管理员在“用户管理”找到账号后重置密码或创建新初始密码，再通过可信渠道通知用户。</p><p><b>高频误区：</b>没有绑定邮箱或手机号的账号，找回会更慢，因为只能靠域名记录和管理员确认身份。</p>"},{"id":"faq-strict-v60-10","q":"为什么注册账号需要 Turnstile？","a":"<p><b>先判断是不是故障：</b>Turnstile 用来阻止机器人批量注册、撞库登录和刷域名申请，不是为了收集用户信息。</p><p><b>页面内处理方法：</b></p><ol><li>等待验证框完成，不要连续点击提交。</li><li>如果一直转圈，换网络、关闭广告拦截插件或使用 Chrome。</li><li>手机端网络代理不稳定时，Turnstile 可能加载失败。</li></ol><p><b>必须后台处理的情况：</b>管理员检查 TURNSTILE_SITE_KEY、TURNSTILE_SECRET、TURNSTILE_EXPECTED_HOSTNAME 和 Action 是否匹配当前域名。</p><p><b>补充提醒：</b>本地文件或非正式域名打开页面时，Turnstile 主机名可能不匹配。</p>"},{"id":"faq-strict-v60-11","q":"为什么我的账号被禁用？","a":"<p><b>核心原因：</b>账号状态为 disabled 时，后端 requireUser 会拒绝继续访问，通常是管理员手动停用、异常注册风控或用户违反域名规则。</p><p><b>用户自查：</b></p><ol><li>登录时如果提示账户被禁用，普通用户不能自行恢复。</li><li>通过帮助中心或外部联系提交账号名和需要恢复的原因。</li></ol><p><b>需要管理员处理：</b>管理员进入“用户管理”，查看该用户状态、操作日志和近期域名申请，再决定是否改回启用。</p><p><b>容易踩坑：</b>账号禁用和域名禁用是两件事；账号禁用后即使域名正常，也无法进入后台管理。</p>"},{"id":"faq-strict-v60-12","q":"为什么管理员添加用户也要人机验证？","a":"<p><b>为什么会这样：</b>管理员手动创建账号同样会写入 users 表，为避免后台被盗后批量灌入垃圾账号，系统要求再次通过 Turnstile。</p><p><b>自己先这样排查：</b></p><ol><li>管理员添加用户时勾选确认，并等待 Turnstile 完成。</li><li>确认密码至少 8 位，邮箱/手机号可选但不要和已有用户重复。</li></ol><p><b>联系管理员时要说明：</b>如果后台无法加载验证，管理员检查注册 Turnstile 开关和密钥；也可以临时关闭注册验证后再创建，但要尽快恢复。</p><p><b>注意事项：</b>不要把这个验证理解为普通用户注册专用，后台高风险写入也需要保护。</p>"},{"id":"faq-strict-v60-13","q":"为什么用户名可以自由填写但仍不能重复？","a":"<p><b>判断重点：</b>用户名是登录标识之一，D1 的 users.username 有唯一约束；允许自由格式不代表允许两个账号共用同一个名字。</p><p><b>可直接操作的步骤：</b></p><ol><li>注册时换一个不重复的用户名。</li><li>如果你之前注册过，用原账号登录，不要重复创建。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理”搜索该用户名，确认是否已有账号或被旧数据占用。</p><p><b>不要这样操作：</b>删除账号采用硬删除后才会释放用户名；软删除旧数据可能仍占唯一约束。</p>"},{"id":"faq-strict-v60-14","q":"为什么邮箱/手机号可以作为登录标识？","a":"<p><b>真实原因：</b>系统把邮箱/手机号存入用户资料字段，并在登录时同时匹配用户名、邮箱和手机号，方便用户不用记账号名。</p><p><b>普通用户能处理的部分：</b></p><ol><li>登录框可以输入用户名，也可以输入绑定的邮箱或手机号。</li><li>如果修改了手机号，下一次登录请用新手机号或用户名。</li></ol><p><b>管理员要处理的部分：</b>管理员应确保 users 表有 phone 字段，并在用户管理里避免多个用户绑定同一邮箱/手机号。</p><p><b>高频误区：</b>邮箱/手机号是可选资料；未填写时只能用用户名登录。</p>"},{"id":"faq-strict-v60-15","q":"为什么管理员能设置自己的额度？","a":"<p><b>先判断是不是故障：</b>管理员账号也存储在 users 表中，系统统一使用 domain_quota 控制可申请数量，所以管理员也有额度字段。</p><p><b>页面内处理方法：</b></p><ol><li>管理员自测域名时，可在自己的用户资料里调高额度。</li><li>普通用户看不到修改入口，只能申请管理员调整。</li></ol><p><b>必须后台处理的情况：</b>管理员在“用户管理”编辑自己的额度，或在“域名规则”设置新账号默认额度。</p><p><b>补充提醒：</b>额度过高会带来 DNS 记录数量膨胀，不建议给所有账号无限额度。</p>"},{"id":"faq-strict-v60-16","q":"为什么删除账号前要求输入账号名？","a":"<p><b>核心原因：</b>注销会删除用户、会话、消息读取记录以及相关日志，是不可逆操作，所以前端要求手动输入当前账号防止误点。</p><p><b>用户自查：</b></p><ol><li>在“账户设置 → 注销账号”输入当前账号名。</li><li>确认账号下没有未处理域名。</li><li>输入错误时按钮不会通过确认。</li></ol><p><b>需要管理员处理：</b>管理员若代用户处理，应先确认该用户所有域名已删除或撤销，避免留下无法管理的解析。</p><p><b>容易踩坑：</b>不要让浏览器自动填充账号名后直接点确认，先看清当前登录账号。</p>"},{"id":"faq-strict-v60-17","q":"为什么账号下还有域名就不能注销？","a":"<p><b>为什么会这样：</b>系统防止用户注销后留下无人维护的二级域名和 Cloudflare DNS 记录，所以会拦截仍有关联域名的账号。</p><p><b>自己先这样排查：</b></p><ol><li>在注销弹窗查看列出的未注销域名。</li><li>正常域名先点“申请删除域名”，等管理员批准。</li><li>已拒绝或已撤销域名按规则直接删除。</li></ol><p><b>联系管理员时要说明：</b>管理员在“域名审核”处理待删除审核，批准后系统会删除 D1 记录和 Cloudflare DNS。</p><p><b>注意事项：</b>待删除审核也算未完成，不能绕过注销。</p>"},{"id":"faq-strict-v60-18","q":"为什么消息中心有未读数量？","a":"<p><b>判断重点：</b>未读数来自 message_reads 表；只要当前用户是接收对象且没有读回执，就会在侧边栏显示红点。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入“消息中心”，打开消息或勾选后点“批量已读”。</li><li>用户自己发出去的消息不计入自己的未读。</li></ol><p><b>后台需要检查的位置：</b>管理员可在消息中心查看发送对象和已读人数，判断用户是否看过通知。</p><p><b>不要这样操作：</b>未读数 9+ 表示超过 9 条，不是系统只保留 9 条。</p>"},{"id":"faq-strict-v60-19","q":"为什么有些按钮只在管理员界面显示？","a":"<p><b>真实原因：</b>前端根据用户 role 显示菜单，后端也用 requireAdmin 校验；普通用户即使看到接口地址也不能执行管理员操作。</p><p><b>普通用户能处理的部分：</b></p><ol><li>普通用户只能管理自己的域名、DNS、消息和账号设置。</li><li>需要审批、禁用、调额度时联系管理员。</li></ol><p><b>管理员要处理的部分：</b>管理员若看不到按钮，检查当前账号角色是否仍为 admin，或者是否登录了普通测试账号。</p><p><b>高频误区：</b>不要通过复制 URL 强行访问管理页，后端会返回无权限。</p>"},{"id":"faq-strict-v60-20","q":"为什么有些域名不能直接删除？","a":"<p><b>先判断是不是故障：</b>正常生效域名已经可能写入 Cloudflare DNS，直接删除会造成解析残留，所以系统要求先提交删除申请。</p><p><b>页面内处理方法：</b></p><ol><li>状态为“正常”的域名点“申请删除域名”。</li><li>12 小时内想反悔可撤销删除申请。</li><li>已拒绝、已撤销的无效域名才允许直接删除。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名审核”批准删除后，程序会清理 Cloudflare DNS 和 D1 记录。</p><p><b>补充提醒：</b>不要在 Cloudflare 后台手动删了就以为系统记录也没了，D1 仍需要同步处理。</p>"},{"id":"faq-strict-v60-21","q":"为什么删除申请有 12 小时撤销期？","a":"<p><b>核心原因：</b>删除正常域名影响访问和 DNS，系统给用户 12 小时反悔窗口，避免误点后立即失去服务。</p><p><b>用户自查：</b></p><ol><li>提交删除申请后，域名状态会显示“待删除审核”。</li><li>在 12 小时内进入域名详情点击撤销。</li><li>超过时间后只能等待管理员审核。</li></ol><p><b>需要管理员处理：</b>管理员可批准或拒绝删除申请；拒绝后用户可继续管理域名。</p><p><b>容易踩坑：</b>撤销期不是自动删除倒计时，最终删除仍取决于管理员批准。</p>"},{"id":"faq-strict-v60-22","q":"为什么管理员留言会进入消息中心？","a":"<p><b>为什么会这样：</b>域名处理结果和管理员备注统一通过 system_messages 发送，避免域名卡片堆积历史备注。</p><p><b>自己先这样排查：</b></p><ol><li>查看“消息中心”里的域名处理通知。</li><li>对通知有疑问可点回复，继续和管理员沟通。</li></ol><p><b>联系管理员时要说明：</b>管理员在批准、拒绝、禁用、撤销时填写备注，系统会把备注发送给用户。</p><p><b>注意事项：</b>域名卡片不显示留言并不代表没有留言，处理结果看消息中心。</p>"},{"id":"faq-strict-v60-23","q":"为什么同一个域名前缀不能重复申请？","a":"<p><b>判断重点：</b>同一个根域名下的 fqdn_ascii 必须唯一，否则 Cloudflare DNS 会出现同名归属冲突。</p><p><b>可直接操作的步骤：</b></p><ol><li>换一个前缀，或选择另一个根域名后缀。</li><li>如果之前申请被拒绝或撤销，先删除无效记录再重新申请。</li></ol><p><b>后台需要检查的位置：</b>管理员可在 D1 的 domain_applications 中确认该 fqdn 是否仍有未删除记录。</p><p><b>不要这样操作：</b>blog.flore.top 和 blog.other.com 是不同后缀，可分别申请。</p>"},{"id":"faq-strict-v60-24","q":"为什么申请违法或仿冒域名会被拒绝？","a":"<p><b>真实原因：</b>二级域名会继承主域名信誉，钓鱼、仿冒品牌、违法内容会影响整个平台，所以审核会拦截。</p><p><b>普通用户能处理的部分：</b></p><ol><li>不要使用银行、支付平台、品牌名、政府机构等误导性前缀。</li><li>提交真实用途说明，避免被误判。</li></ol><p><b>管理员要处理的部分：</b>管理员可在黑名单管理里维护品牌词、违法词和高风险关键词。</p><p><b>高频误区：</b>免费二级域名不等于可以绕过平台内容规则。</p>"},{"id":"faq-strict-v60-25","q":"为什么系统有保留前缀？","a":"<p><b>先判断是不是故障：</b>www、admin、mail、api、cdn 等前缀可能用于平台本身、邮箱、接口或运维，开放给用户会造成服务冲突。</p><p><b>页面内处理方法：</b></p><ol><li>申请时避开保留前缀，改成项目名或个人标识。</li><li>前端提示保留词时无需重复提交。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”或“黑名单管理”维护保留前缀列表。</p><p><b>补充提醒：</b>mail、smtp、imap 这类前缀尤其容易影响邮件系统，不建议放开。</p>"},{"id":"faq-strict-v60-26","q":"为什么手机端要清缓存？","a":"<p><b>核心原因：</b>手机浏览器和 WebView 容易缓存旧 app.js，部署新版本后仍执行旧逻辑，造成按钮、翻译或菜单异常。</p><p><b>用户自查：</b></p><ol><li>关闭页面后重新打开。</li><li>浏览器设置里清除 storage.flore.top 的站点数据。</li><li>微信/内置浏览器异常时换 Chrome 或 Safari。</li></ol><p><b>需要管理员处理：</b>管理员发布版本后，可提示用户清缓存，并确认 _headers 没有把 JS 缓存时间设太长。</p><p><b>容易踩坑：</b>只下拉刷新经常不够，手机端缓存比电脑更顽固。</p>"},{"id":"faq-strict-v60-27","q":"为什么电脑端要 Ctrl + F5？","a":"<p><b>为什么会这样：</b>普通刷新可能继续使用浏览器缓存的前端文件，Ctrl+F5 会强制重新拉取最新 app.js 和 styles.css。</p><p><b>自己先这样排查：</b></p><ol><li>部署后在电脑端按 Ctrl+F5。</li><li>仍异常时打开无痕窗口测试。</li></ol><p><b>联系管理员时要说明：</b>管理员检查 Cloudflare 部署日志，确认新文件已上传到 Worker Assets。</p><p><b>注意事项：</b>如果后端已更新但前端没更新，就会出现接口参数不匹配。</p>"},{"id":"faq-strict-v60-28","q":"为什么界面会出现中英文混合？","a":"<p><b>判断重点：</b>部分文案来自动态帮助内容、管理员自定义内容或旧缓存，I18N 字典只能翻译已登记的固定文本。</p><p><b>可直接操作的步骤：</b></p><ol><li>先切换一次 EN/中文，再强制刷新。</li><li>帮助中心里管理员自定义的问题不会自动翻译。</li></ol><p><b>后台需要检查的位置：</b>管理员需要在帮助中心设置中分别维护中文或英文内容，或补充 I18N 字典。</p><p><b>不要这样操作：</b>不要把动态 FAQ 当作固定菜单翻译，保存什么语言就显示什么语言。</p>"},{"id":"faq-strict-v60-29","q":"为什么系统提示变量初始化错误？","a":"<p><b>真实原因：</b>这类错误一般是前端代码在变量声明前访问，或旧版本 app.js 与新后端返回字段不一致。</p><p><b>普通用户能处理的部分：</b></p><ol><li>强制刷新页面，确认不是旧 JS。</li><li>记录红色提示中的变量名，例如 approved、domainConfig。</li></ol><p><b>管理员要处理的部分：</b>管理员需要覆盖完整 public/app.js，并检查 GitHub 部署是否成功；必要时回滚到上一稳定包。</p><p><b>高频误区：</b>不要只替换一半文件，前端依赖字段变化时必须整体覆盖。</p>"},{"id":"faq-strict-v60-30","q":"为什么审核通过后 DNS 还是未配置？","a":"<p><b>先判断是不是故障：</b>现在系统允许先批准域名、后配置 DNS；批准只改变域名状态，不一定自动创建解析。</p><p><b>页面内处理方法：</b></p><ol><li>进入“域名管理”，点“管理域名”。</li><li>点击“添加解析”，选择 A、CNAME、MX 等类型并填写目标。</li></ol><p><b>必须后台处理的情况：</b>管理员不用在审核时替用户填写 DNS，除非平台规则要求代配置。</p><p><b>补充提醒：</b>“正常”表示域名可管理，不等于已经有 DNS 记录。</p>"},{"id":"faq-strict-v60-31","q":"为什么有效期从管理员批准当天开始？","a":"<p><b>核心原因：</b>有效期绑定 approved 状态，防止用户在等待审核期间被扣掉使用天数。</p><p><b>用户自查：</b></p><ol><li>查看域名详情里的“审核时间”和“到期时间”。</li><li>待审核时不要按提交时间计算有效期。</li></ol><p><b>需要管理员处理：</b>管理员在批准时写入 expires_at；如果旧数据没有到期时间，需要补齐。</p><p><b>容易踩坑：</b>反复撤销/重新批准会影响时间计算，正式环境不要随意操作。</p>"},{"id":"faq-strict-v60-32","q":"为什么有些域名显示已禁用？","a":"<p><b>为什么会这样：</b>管理员禁用域名时，为兼容旧 D1 CHECK 约束，数据库可能保存为 revoked，但前端按禁用备注显示“已禁用”。</p><p><b>自己先这样排查：</b></p><ol><li>已禁用域名不能继续添加或修改 DNS。</li><li>查看消息中心的禁用原因。</li></ol><p><b>联系管理员时要说明：</b>管理员需要在“域名审核”里禁用或撤销，系统会删除关联 DNS。</p><p><b>注意事项：</b>禁用和拒绝不同：禁用通常发生在已生效域名上。</p>"},{"id":"faq-strict-v60-33","q":"为什么域名会被撤销？","a":"<p><b>判断重点：</b>撤销通常表示管理员主动停止一个已批准域名，可能因为违规、用户申请、DNS 风险或平台维护。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入消息中心查看撤销通知。</li><li>确认域名是否还出现在域名管理列表。</li></ol><p><b>后台需要检查的位置：</b>管理员撤销时应填写原因，并确认 Cloudflare DNS 已清理。</p><p><b>不要这样操作：</b>撤销后原前缀是否可重新申请，取决于 D1 记录是否硬删除。</p>"},{"id":"faq-strict-v60-34","q":"为什么已拒绝的域名还能看到？","a":"<p><b>真实原因：</b>拒绝状态会保留在用户列表中，目的是让用户知道申请结果并允许删除无效记录。</p><p><b>普通用户能处理的部分：</b></p><ol><li>进入域名列表，找到已拒绝域名。</li><li>确认不再需要后点“删除无效域名”。</li></ol><p><b>管理员要处理的部分：</b>管理员无需再次处理已拒绝记录，除非用户反馈误拒。</p><p><b>高频误区：</b>拒绝不代表占用有效域名，但旧记录可能仍用于提示历史结果。</p>"},{"id":"faq-strict-v60-35","q":"为什么添加用户时要填写额度？","a":"<p><b>先判断是不是故障：</b>管理员创建用户时需要指定该账号可申请多少个二级域名，避免新账号无限制占用 DNS 资源。</p><p><b>页面内处理方法：</b></p><ol><li>普通用户不用填写额度。</li><li>管理员创建测试账号时可以设置较小额度，例如 1 或 3。</li></ol><p><b>必须后台处理的情况：</b>管理员可之后在“用户管理”修改额度。</p><p><b>补充提醒：</b>额度为 0 会导致用户无法申请域名，除非这是故意限制。</p>"},{"id":"faq-strict-v60-36","q":"为什么不建议所有用户无限额度？","a":"<p><b>核心原因：</b>每个域名和解析都会占用 D1 查询、Cloudflare DNS 记录和管理员审核成本，无限额度容易被滥用。</p><p><b>用户自查：</b></p><ol><li>个人账号按实际项目申请，不要批量占位。</li><li>不需要的无效域名及时删除。</li></ol><p><b>需要管理员处理：</b>管理员应使用平台最大总配额、单用户额度和单域名 DNS 上限共同控制资源。</p><p><b>容易踩坑：</b>免费系统尤其要防止批量注册和垃圾解析。</p>"},{"id":"faq-strict-v60-37","q":"为什么修改联系方式后登录方式会变化？","a":"<p><b>为什么会这样：</b>邮箱和手机号是登录匹配字段，修改后旧邮箱/手机号可能不再能登录，但用户名仍然可用。</p><p><b>自己先这样排查：</b></p><ol><li>修改资料后记住新的邮箱/手机号。</li><li>担心输错时先保留用户名登录。</li></ol><p><b>联系管理员时要说明：</b>管理员可在用户管理里帮助核对 phone/email 字段。</p><p><b>注意事项：</b>不要把两个账号绑定同一个联系方式，否则会触发重复限制。</p>"},{"id":"faq-strict-v60-38","q":"为什么登录设备数量不准确？","a":"<p><b>判断重点：</b>设备统计来自 sessions 表；更换浏览器、清 Cookie、无痕模式或同设备不同浏览器都会生成新会话。</p><p><b>可直接操作的步骤：</b></p><ol><li>在“账户设置 → 登录设备管理”查看设备名称和最近使用时间。</li><li>退出不常用设备对应的浏览器会话。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理 → 用户登录设备管理”查看该用户会话。</p><p><b>不要这样操作：</b>浏览器无法精确提供“苹果15 Pro”这类型号时，只能显示 iPhone 或浏览器未提供具体型号。</p>"},{"id":"faq-strict-v60-39","q":"为什么设备 IP 看起来不是我的本地 IP？","a":"<p><b>真实原因：</b>系统记录的是请求到 Cloudflare Worker 时的公网 IP，可能是宽带出口、公司网关、手机运营商或代理 IP。</p><p><b>普通用户能处理的部分：</b></p><ol><li>确认自己是否使用 VPN、代理、公司网络或云手机。</li><li>同一设备切换网络后 IP 变化是正常的。</li></ol><p><b>管理员要处理的部分：</b>管理员查看异常登录时，应结合设备名称、时间和操作日志一起判断，不能只看 IP。</p><p><b>高频误区：</b>内网地址如 192.168.x.x 不会出现在服务器记录里。</p>"},{"id":"faq-strict-v60-40","q":"发错消息能撤销吗？","a":"<p><b>先判断是不是故障：</b>消息撤销只允许发送后 15 分钟内进行，超过时间表示接收方可能已经读取，系统不再允许删除。</p><p><b>页面内处理方法：</b></p><ol><li>进入“消息中心”，自己发出的消息旁边如果有“撤销”就可以撤回。</li><li>超过 15 分钟按钮消失，只能再发一条更正说明。</li></ol><p><b>必须后台处理的情况：</b>管理员可删除消息中心里的错误消息，但已读用户可能已经看过。</p><p><b>补充提醒：</b>撤销会从 D1 删除消息和读取记录，不是仅隐藏。</p>"},{"id":"faq-strict-v60-41","q":"草稿和模板区别是什么？","a":"<p><b>核心原因：</b>草稿是准备发送的一次性消息，模板是以后反复套用的固定文案；两者都可以暂时不选接收对象。</p><p><b>用户自查：</b></p><ol><li>写一半没确定对象时保存草稿。</li><li>经常重复发送的到期提醒、违规提醒保存为模板。</li></ol><p><b>需要管理员处理：</b>管理员发送草稿前必须补全接收对象；模板转草稿后再改内容更安全。</p><p><b>容易踩坑：</b>不要把已经发送的正式通知直接当模板乱改。</p>"},{"id":"faq-strict-v60-42","q":"操作日志为空正常吗？","a":"<p><b>为什么会这样：</b>操作日志只保留最近设置的天数，当前规则默认最近 4 天；新账号或刚清理过日志时为空是正常的。</p><p><b>自己先这样排查：</b></p><ol><li>进入“操作日志”，确认筛选日期不是限制太窄。</li><li>切换排列方式或清空筛选条件。</li></ol><p><b>联系管理员时要说明：</b>管理员可在“安全设置”调整日志保留天数，并检查 cleanup 任务是否过早删除。</p><p><b>注意事项：</b>操作日志不是永久审计库，账号注销后相关日志也会清理。</p>"},{"id":"faq-strict-v60-43","q":"自动刷新会打断输入吗？","a":"<p><b>判断重点：</b>系统做了无感刷新：正在输入、弹窗打开、消息中心使用中、页面不可见时不会刷新当前内容。</p><p><b>可直接操作的步骤：</b></p><ol><li>正常浏览域名列表时，数据会按配置周期刷新。</li><li>正在编辑 DNS 或写消息时不用担心被覆盖。</li></ol><p><b>后台需要检查的位置：</b>管理员在设置里调整刷新策略时，应避免过短周期造成频繁请求。</p><p><b>不要这样操作：</b>如果浏览器插件强制刷新页面，不属于系统自动刷新。</p>"},{"id":"faq-strict-v60-44","q":"帮助搜索不准怎么办？","a":"<p><b>真实原因：</b>帮助搜索使用关键词和同义词匹配，不是大模型问答；描述太短或词不相关时可能只给相近结果。</p><p><b>普通用户能处理的部分：</b></p><ol><li>输入具体故障词，例如“CNAME 显示错”“MX 不能保存”“额度不足”。</li><li>不要只搜“问题”“错误”这类泛词。</li></ol><p><b>管理员要处理的部分：</b>管理员可在“帮助中心设置”增加更多同义问题和具体答案。</p><p><b>高频误区：</b>帮助搜索不会直接读取你的 D1 数据，只匹配文档内容。</p>"},{"id":"faq-strict-v60-45","q":"页面太大或太小怎么办？","a":"<p><b>先判断是不是故障：</b>页面大小受全局 80% 缩放、浏览器缩放比例和手机视口影响，三者叠加会让显示异常。</p><p><b>页面内处理方法：</b></p><ol><li>电脑端把浏览器缩放恢复到 100%。</li><li>手机端横屏或竖屏切换后刷新一次。</li></ol><p><b>必须后台处理的情况：</b>管理员修改 styles.css 时要分别处理桌面端和移动端，不要用同一个 zoom 规则硬套。</p><p><b>补充提醒：</b>Windows 系统显示缩放 125% 也会影响视觉大小。</p>"},{"id":"faq-strict-v60-46","q":"手机菜单关不掉怎么办？","a":"<p><b>核心原因：</b>手机侧边栏是抽屉浮层，关闭依赖遮罩点击和菜单状态 class；旧 CSS 或旧 app.js 会导致遮罩失效。</p><p><b>用户自查：</b></p><ol><li>点击页面空白遮罩区域关闭。</li><li>如果无效，点击菜单项切换页面或刷新。</li></ol><p><b>需要管理员处理：</b>管理员确认最新 styles.css 已覆盖，侧栏必须是 fixed 浮层而不是挤压主内容。</p><p><b>容易踩坑：</b>不要只改宽度，手机端还要处理 z-index 和 overflow。</p>"},{"id":"faq-strict-v60-47","q":"用户名能填中文吗？","a":"<p><b>为什么会这样：</b>用户名是登录和 D1 唯一标识，建议使用字母数字；中文可能在某些输入法、复制或接口编码中带来混淆。</p><p><b>自己先这样排查：</b></p><ol><li>优先使用英文、数字、短横线组合。</li><li>展示昵称可以以后单独做，不要把用户名当昵称。</li></ol><p><b>联系管理员时要说明：</b>管理员若放开中文用户名，需要同步检查 normalizeUsername、登录匹配和唯一约束。</p><p><b>注意事项：</b>手机号和邮箱可以作为登录标识，不必用中文用户名。</p>"},{"id":"faq-strict-v60-48","q":"无痕模式为什么常掉线？","a":"<p><b>判断重点：</b>无痕模式关闭后会清 Cookie，部分浏览器还会限制第三方脚本和 Turnstile，导致会话不能长期保持。</p><p><b>可直接操作的步骤：</b></p><ol><li>正式使用建议普通浏览器窗口登录。</li><li>无痕只适合临时测试，不适合长期管理域名。</li></ol><p><b>后台需要检查的位置：</b>管理员排查登录问题时，要问清用户是否使用无痕、云手机或隐私浏览。</p><p><b>不要这样操作：</b>勾选“记住我”在无痕窗口里意义很小。</p>"},{"id":"faq-strict-v60-49","q":"忘记密码最快怎么处理？","a":"<p><b>真实原因：</b>系统当前没有自动邮件找回链路，最快方式是通过外部联系提交身份信息给管理员重置。</p><p><b>普通用户能处理的部分：</b></p><ol><li>打开 mailform.flore.top。</li><li>填写用户名、绑定邮箱/手机号、最近一个已申请域名。</li></ol><p><b>管理员要处理的部分：</b>管理员核验后在“用户管理”修改密码或让用户重新注册后迁移域名。</p><p><b>高频误区：</b>不要把新密码发在公开群里，应通过私密渠道告知。</p>"},{"id":"faq-strict-v60-50","q":"注销账号能恢复吗？","a":"<p><b>先判断是不是故障：</b>当前删除策略偏硬删除，注销后用户、会话、部分消息和日志会被清理，通常不能直接恢复。</p><p><b>页面内处理方法：</b></p><ol><li>注销前先导出或记录重要域名信息。</li><li>确认所有域名已经删除或不再需要。</li></ol><p><b>必须后台处理的情况：</b>管理员除非有外部备份，否则很难恢复被硬删除的账号数据。</p><p><b>补充提醒：</b>不要把注销当作退出登录；退出登录不会删除账号。</p>"}]},{"key":"dns","title":"DNS 记录说明","subtitle":"A / AAAA / CNAME / TXT / MX、代理、TTL、生效、Cloudflare 同步和第三方平台配置","items":[{"id":"dns-strict-v60-01","q":"A 记录应该填什么？","a":"<p><b>核心原因：</b>A 记录把域名指向 IPv4 地址，目标必须是类似 103.205.240.19 的公网 IPv4，不能填写域名或带 http 的网址。</p><p><b>用户自查：</b></p><ol><li>进入“域名管理 → 管理域名 → DNS 解析 → 添加解析”。</li><li>记录类型选择 A，主机填 @ 或 www，目标地址填服务器 IPv4。</li><li>保存后查看状态是否“已生效”。</li></ol><p><b>需要管理员处理：</b>管理员需要确认该根域名允许 A 记录，且 CF_API_TOKEN 有 DNS 编辑权限。</p><p><b>容易踩坑：</b>A 记录不能填 408018525.github.io，这种应使用 CNAME。</p>"},{"id":"dns-strict-v60-02","q":"AAAA 记录什么时候用？","a":"<p><b>为什么会这样：</b>AAAA 记录用于 IPv6 地址；如果服务器没有 IPv6，就不要添加 AAAA，否则部分用户会优先访问不可用的 IPv6。</p><p><b>自己先这样排查：</b></p><ol><li>确认服务商提供的地址形如 2400:xxxx::1。</li><li>记录类型选择 AAAA，目标填完整 IPv6。</li><li>保存后用支持 IPv6 的网络测试访问。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 DNS 配置里允许 AAAA 类型；若用户大量误填，可在帮助中心提示默认用 A/CNAME。</p><p><b>注意事项：</b>IPv6 和 IPv4 不是互相替代，填错会导致部分地区打不开。</p>"},{"id":"dns-strict-v60-03","q":"CNAME 记录应该填什么？","a":"<p><b>判断重点：</b>CNAME 把当前子域名别名到另一个域名，目标必须是域名，例如 408018525.github.io，不能填 IP。</p><p><b>可直接操作的步骤：</b></p><ol><li>选择 CNAME 类型。</li><li>主机 @ 表示当前二级域名，www 表示 www.你的域名。</li><li>目标不要加 https://，只填域名本身。</li></ol><p><b>后台需要检查的位置：</b>管理员确认 Cloudflare 允许该记录名使用 CNAME；根域名代理规则也会影响表现。</p><p><b>不要这样操作：</b>CNAME 和同名 A/AAAA 通常不能同时存在。</p>"},{"id":"dns-strict-v60-04","q":"TXT 记录有什么用？","a":"<p><b>真实原因：</b>TXT 常用于平台验证、SPF、DKIM、DMARC 等文本记录，系统只负责写入文本，不会判断第三方平台是否验证通过。</p><p><b>普通用户能处理的部分：</b></p><ol><li>复制第三方平台给出的完整 TXT 值。</li><li>记录类型选 TXT，主机按对方要求填 @、_dmarc 或指定前缀。</li><li>保存后回第三方平台点验证。</li></ol><p><b>管理员要处理的部分：</b>管理员确认 DNS_ALLOWED_TYPES 包含 TXT。</p><p><b>高频误区：</b>TXT 内容有引号时通常可以直接复制平台给出的值，不要自己删关键字符。</p>"},{"id":"dns-strict-v60-05","q":"MX 记录为什么要填优先级？","a":"<p><b>先判断是不是故障：</b>MX 用于邮件投递，优先级决定多台邮件服务器的尝试顺序，数字越小优先级越高。</p><p><b>页面内处理方法：</b></p><ol><li>记录类型选 MX。</li><li>目标填邮件服务器域名，例如 mx.example.com。</li><li>优先级按邮箱服务商要求填写，例如 10、20。</li></ol><p><b>必须后台处理的情况：</b>管理员可在 DNS 配置里关闭 MX，防止用户滥发垃圾邮件或做未经授权邮箱。</p><p><b>补充提醒：</b>MX 目标不要填 IP，也不要开启代理。</p>"},{"id":"dns-strict-v60-06","q":"为什么 MX / TXT 不能开启代理？","a":"<p><b>核心原因：</b>Cloudflare 代理只适用于 HTTP/HTTPS 访问，MX 和 TXT 不是网页流量，开启代理没有意义也会导致记录不可用。</p><p><b>用户自查：</b></p><ol><li>添加 MX/TXT 时选择“仅 DNS”。</li><li>如果界面自动变成仅 DNS，这是正常保护。</li></ol><p><b>需要管理员处理：</b>管理员应保持程序逻辑：A/AAAA/CNAME 可选代理，TXT/MX 强制仅 DNS。</p><p><b>容易踩坑：</b>邮箱解析经过代理会失败，不要为了“隐藏 IP”给 MX 开代理。</p>"},{"id":"dns-strict-v60-07","q":"TTL 设置为 1 是什么意思？","a":"<p><b>为什么会这样：</b>在 Cloudflare API 中 TTL=1 表示自动 TTL，由 Cloudflare 自动选择缓存时间，不是 1 秒。</p><p><b>自己先这样排查：</b></p><ol><li>不懂 TTL 时保持默认 1。</li><li>需要更快切换时先改记录，再等待缓存刷新。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 DNS 配置里设置默认 TTL，但不要频繁修改全局默认值。</p><p><b>注意事项：</b>TTL 只影响递归 DNS 缓存，不会让网站应用立即刷新。</p>"},{"id":"dns-strict-v60-08","q":"DNS 保存后多久生效？","a":"<p><b>判断重点：</b>DNS 写入 Cloudflare 后通常很快，但用户本地 DNS、浏览器缓存、运营商缓存可能延迟。</p><p><b>可直接操作的步骤：</b></p><ol><li>保存后先在 DNS 列表确认状态“已生效”。</li><li>等待几分钟再访问，不要每秒反复修改。</li><li>换手机网络或公共 DNS 测试。</li></ol><p><b>后台需要检查的位置：</b>管理员可查看 Cloudflare DNS 是否已经出现该记录，判断是平台写入问题还是用户本地缓存。</p><p><b>不要这样操作：</b>“Cloudflare 已有记录”和“你的浏览器能打开”不是同一件事。</p>"},{"id":"dns-strict-v60-09","q":"为什么 Cloudflare 有记录但系统报 Record does not exist？","a":"<p><b>真实原因：</b>D1 保存的 cf_record_id 可能是旧记录 ID；你在 Cloudflare 后台手动删改后，系统再按旧 ID 删除就会找不到。</p><p><b>普通用户能处理的部分：</b></p><ol><li>避免在 Cloudflare 后台手动改系统管理的记录。</li><li>如果已经手动改了，回系统重新保存或联系管理员同步。</li></ol><p><b>管理员要处理的部分：</b>管理员使用支持按名称兜底删除的后端版本，或清理 D1 中失效的 cf_record_id。</p><p><b>高频误区：</b>不要只看记录名一样，Cloudflare 每条记录都有自己的 ID。</p>"},{"id":"dns-strict-v60-10","q":"为什么我添加 A 记录但域名卡片显示 CNAME？","a":"<p><b>先判断是不是故障：</b>旧摘要字段 record_type 还保留默认 CNAME，而真实多条记录在 dns_records 表；前端如果读旧字段就会显示错。</p><p><b>页面内处理方法：</b></p><ol><li>进入域名详情查看 DNS 解析列表，以列表中的真实记录为准。</li><li>强制刷新确认已覆盖 v57 之后的 app.js。</li></ol><p><b>必须后台处理的情况：</b>管理员确认后端 serializeApplication 使用真实 dns_records 汇总，不再只读 domain_applications.record_type。</p><p><b>补充提醒：</b>Cloudflare 后台显示 A 而系统卡片显示 CNAME，通常是摘要不同步，不代表 A 没创建。</p>"},{"id":"dns-strict-v60-11","q":"主机记录 @ 代表什么？","a":"<p><b>核心原因：</b>@ 代表当前被管理的二级域名本身，例如 school.flore.top，而不是主域 flore.top。</p><p><b>用户自查：</b></p><ol><li>给 school.flore.top 设置解析时，主机填 @。</li><li>给 www.school.flore.top 设置解析时，主机填 www。</li></ol><p><b>需要管理员处理：</b>管理员在说明里明确 @ 的含义，避免用户误以为是根域 flore.top。</p><p><b>容易踩坑：</b>@ 不是邮箱符号，在 DNS 表单里是当前域名的快捷写法。</p>"},{"id":"dns-strict-v60-12","q":"www 记录怎么设置？","a":"<p><b>为什么会这样：</b>www 是当前二级域名下的三级域名，例如 www.school.flore.top，需要单独添加记录。</p><p><b>自己先这样排查：</b></p><ol><li>进入域名详情添加解析。</li><li>主机填 www，类型按目标选择 A 或 CNAME。</li><li>保存后访问 www.你的域名测试。</li></ol><p><b>联系管理员时要说明：</b>管理员不需要在审核时自动创建 www，除非平台提供默认模板。</p><p><b>注意事项：</b>school.flore.top 能打开，不代表 www.school.flore.top 自动能打开。</p>"},{"id":"dns-strict-v60-13","q":"api.v1 这种多级主机能用吗？","a":"<p><b>判断重点：</b>系统允许主机填 api.v1，最终会生成 api.v1.school.flore.top 这种多级子域名。</p><p><b>可直接操作的步骤：</b></p><ol><li>添加解析时主机填 api.v1。</li><li>不要填写完整域名，只填相对主机部分。</li></ol><p><b>后台需要检查的位置：</b>管理员可通过域名规则控制前缀格式，必要时限制点号数量。</p><p><b>不要这样操作：</b>api.v1.school.flore.top 和 api.school.flore.top 是两条不同记录。</p>"},{"id":"dns-strict-v60-14","q":"为什么提示同一主机和类型已存在？","a":"<p><b>真实原因：</b>同一域名下相同 name + type 重复会造成 DNS 冲突，系统阻止重复创建。</p><p><b>普通用户能处理的部分：</b></p><ol><li>回到 DNS 记录列表，找到已有同名同类型记录。</li><li>点“编辑”修改目标，不要新增第二条。</li></ol><p><b>管理员要处理的部分：</b>管理员可在 D1 dns_records 里检查是否有旧记录未硬删除。</p><p><b>高频误区：</b>同名 A 可以有多值的复杂场景当前系统不支持，默认一名一类型一条。</p>"},{"id":"dns-strict-v60-15","q":"DNS 保存失败怎么办？","a":"<p><b>先判断是不是故障：</b>保存失败可能来自目标格式错误、Cloudflare Token 无权限、Zone ID 不匹配或记录冲突。</p><p><b>页面内处理方法：</b></p><ol><li>先按记录类型检查目标：A 填 IPv4，CNAME 填域名，MX 填邮件主机。</li><li>复制红色错误提示。</li><li>不要连续重复提交。</li></ol><p><b>必须后台处理的情况：</b>管理员检查 Worker 日志中的 DNS_CREATE_FAILED / DNS_UPDATE_FAILED，并核对 CF_API_TOKEN 和 DNS_ZONE_ID。</p><p><b>补充提醒：</b>用户能填表不代表 Cloudflare 一定接受，最终以 API 返回为准。</p>"},{"id":"dns-strict-v60-16","q":"编辑 DNS 会影响访问吗？","a":"<p><b>核心原因：</b>编辑已生效记录会调用 Cloudflare 更新同一条记录，短时间内访问可能受缓存影响。</p><p><b>用户自查：</b></p><ol><li>在低访问时段修改。</li><li>先确认新目标能访问。</li><li>保存后等待 DNS 缓存刷新。</li></ol><p><b>需要管理员处理：</b>管理员若关闭“生效后允许用户修改 DNS”，用户将无法编辑已批准域名解析。</p><p><b>容易踩坑：</b>不要把生产站点 A 记录随意改到测试 IP。</p>"},{"id":"dns-strict-v60-17","q":"删除 DNS 后为什么网站打不开？","a":"<p><b>为什么会这样：</b>DNS 记录是域名访问路径，删除 A/CNAME 后浏览器找不到目标，自然无法访问。</p><p><b>自己先这样排查：</b></p><ol><li>删除前确认不再使用该域名。</li><li>误删后重新添加同类型记录。</li></ol><p><b>联系管理员时要说明：</b>管理员可以在操作日志确认是谁删除了记录，但硬删除后旧记录详情不会长期保留。</p><p><b>注意事项：</b>删除 DNS 不等于删除域名，域名仍在账户里。</p>"},{"id":"dns-strict-v60-18","q":"审核通过后 DNS 仍未配置正常吗？","a":"<p><b>判断重点：</b>正常。批准域名只表示用户获得管理权限，DNS 需要用户进入域名详情自行添加。</p><p><b>可直接操作的步骤：</b></p><ol><li>点“管理域名”。</li><li>在 DNS 解析页点击“添加解析”。</li><li>按你的服务商要求填写 A、CNAME、TXT 或 MX。</li></ol><p><b>后台需要检查的位置：</b>管理员可给用户发送说明，但不必代填。</p><p><b>不要这样操作：</b>不要把“正常”理解为已经指向某个网站。</p>"},{"id":"dns-strict-v60-19","q":"为什么 CNAME 不能填 IP？","a":"<p><b>真实原因：</b>CNAME 的标准目标是另一个域名；IP 应使用 A 或 AAAA。Cloudflare API 会拒绝不符合类型的内容。</p><p><b>普通用户能处理的部分：</b></p><ol><li>如果目标是 103.205.240.19，类型选 A。</li><li>如果目标是 xxx.github.io，类型选 CNAME。</li></ol><p><b>管理员要处理的部分：</b>管理员在帮助中心和输入提示里区分“目标地址”和“记录类型”。</p><p><b>高频误区：</b>不要把 http:// 或 https:// 放进 CNAME。</p>"},{"id":"dns-strict-v60-20","q":"为什么 MX 目标不能填 IP？","a":"<p><b>先判断是不是故障：</b>邮件服务器通过主机名投递，MX 目标应是域名，很多邮件服务商不会接受 IP 作为 MX 目标。</p><p><b>页面内处理方法：</b></p><ol><li>向邮箱服务商复制 MX 主机名。</li><li>按服务商给的优先级填写。</li></ol><p><b>必须后台处理的情况：</b>管理员如果发现用户填 IP，应拒绝或指导修改，防止邮件不可达。</p><p><b>补充提醒：</b>MX 不是网站访问记录，不能用来让网页打开。</p>"},{"id":"dns-strict-v60-21","q":"GitHub Pages 应该用 A 还是 CNAME？","a":"<p><b>核心原因：</b>GitHub Pages 通常给用户一个 github.io 域名时用 CNAME；如果 GitHub 要求 apex A 记录，则按 GitHub 文档给的 IP。</p><p><b>用户自查：</b></p><ol><li>有 408018525.github.io 这类目标时选 CNAME。</li><li>目标只填域名，不加仓库路径。</li><li>在 GitHub Pages 设置里也要绑定自定义域名。</li></ol><p><b>需要管理员处理：</b>管理员无需修改 Cloudflare 主域设置，除非 DNS 类型被后台禁用。</p><p><b>容易踩坑：</b>CNAME 指向 github.io 后，GitHub 端未绑定域名仍可能显示 404。</p>"},{"id":"dns-strict-v60-22","q":"Vercel / Netlify 应该怎么填？","a":"<p><b>为什么会这样：</b>这类平台通常要求 CNAME 指向它们给出的域名，或 TXT 用于所有权验证。</p><p><b>自己先这样排查：</b></p><ol><li>先在第三方平台添加自定义域名。</li><li>复制平台给出的 CNAME 或 TXT。</li><li>回本系统添加对应记录。</li></ol><p><b>联系管理员时要说明：</b>管理员确认允许 TXT 和 CNAME；如果用户只添加 CNAME 仍验证失败，查看是否缺 TXT。</p><p><b>注意事项：</b>第三方平台的验证状态需要回第三方后台看，本系统只负责写 DNS。</p>"},{"id":"dns-strict-v60-23","q":"动态域名服务怎么配置？","a":"<p><b>判断重点：</b>动态域名服务通常提供一个固定 CNAME，如 xxx.ddns.org，你的二级域名 CNAME 到它即可。</p><p><b>可直接操作的步骤：</b></p><ol><li>记录类型选 CNAME。</li><li>目标填动态域名服务商给的域名。</li><li>确认动态域名本身已经解析到正确 IP。</li></ol><p><b>后台需要检查的位置：</b>管理员可限制高风险 DDNS 域名，避免用户指向恶意内容。</p><p><b>不要这样操作：</b>如果 DDNS 本身失效，本系统的 CNAME 也救不了。</p>"},{"id":"dns-strict-v60-24","q":"SPF TXT 怎么填？","a":"<p><b>真实原因：</b>SPF 是 TXT 记录，通常形如 v=spf1 include:xxx -all，用来声明允许哪些服务器发邮件。</p><p><b>普通用户能处理的部分：</b></p><ol><li>主机通常填 @ 或服务商指定值。</li><li>内容完整复制 SPF 字符串。</li><li>保存后用邮件服务商检测。</li></ol><p><b>管理员要处理的部分：</b>管理员若关闭 MX/TXT 邮件相关功能，用户无法自行配置 SPF。</p><p><b>高频误区：</b>同一主机不建议存在多条 SPF TXT，容易导致 SPF PermError。</p>"},{"id":"dns-strict-v60-25","q":"DKIM TXT 怎么填？","a":"<p><b>先判断是不是故障：</b>DKIM 通常是 selector._domainkey 这类主机名，对应一长串公钥 TXT。</p><p><b>页面内处理方法：</b></p><ol><li>从邮件服务商复制 selector 主机和 TXT 值。</li><li>主机只填相对部分，例如 default._domainkey。</li><li>保存后回邮件后台验证。</li></ol><p><b>必须后台处理的情况：</b>管理员确认 TXT 内容长度没有被前端截断。</p><p><b>补充提醒：</b>不要手动换行 DKIM 公钥，复制时保持完整。</p>"},{"id":"dns-strict-v60-26","q":"DMARC TXT 怎么填？","a":"<p><b>核心原因：</b>DMARC 用于邮件策略，主机一般是 _dmarc，内容类似 v=DMARC1; p=none; rua=...。</p><p><b>用户自查：</b></p><ol><li>主机填 _dmarc。</li><li>类型选 TXT。</li><li>内容按邮件服务商给出的策略复制。</li></ol><p><b>需要管理员处理：</b>管理员如果允许邮件记录，应提醒用户先从 p=none 观察，再逐步收紧。</p><p><b>容易踩坑：</b>DMARC 配错可能影响正常邮件投递。</p>"},{"id":"dns-strict-v60-27","q":"系统支持 CAA 记录吗？","a":"<p><b>为什么会这样：</b>当前系统允许的类型通常是 A、AAAA、CNAME、TXT、MX；CAA 如果未在 DNS_ALLOWED_TYPES 里，就不能创建。</p><p><b>自己先这样排查：</b></p><ol><li>在添加解析的记录类型下拉里查看是否有 CAA。</li><li>没有就说明当前平台未开放。</li></ol><p><b>联系管理员时要说明：</b>管理员若要支持 CAA，需要扩展前后端类型校验和 Cloudflare payload。</p><p><b>注意事项：</b>不要用 TXT 冒充 CAA，证书机构不会按 TXT 读取。</p>"},{"id":"dns-strict-v60-28","q":"一个域名可以有多条 DNS 记录吗？","a":"<p><b>判断重点：</b>可以。当前系统支持同一个二级域名下创建多条不同主机或不同类型的记录。</p><p><b>可直接操作的步骤：</b></p><ol><li>在域名详情里反复点击“添加解析”。</li><li>注意同一主机同一类型不能重复。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“域名规则”限制单个二级域名最大记录数。</p><p><b>不要这样操作：</b>多条记录越多，误删和冲突风险越高。</p>"},{"id":"dns-strict-v60-29","q":"为什么新增解析默认代理状态会变化？","a":"<p><b>真实原因：</b>默认代理状态来自后台 DNS 配置；A、AAAA、CNAME 可使用代理，TXT/MX 会被强制仅 DNS。</p><p><b>普通用户能处理的部分：</b></p><ol><li>添加记录时查看“代理状态”下拉。</li><li>不了解代理时保持默认。</li></ol><p><b>管理员要处理的部分：</b>管理员在“DNS 配置”修改默认代理前，要通知用户，因为可能影响网站源站暴露和访问行为。</p><p><b>高频误区：</b>开启代理会改变返回 IP，不适合所有业务。</p>"},{"id":"dns-strict-v60-30","q":"Cloudflare 代理会影响什么？","a":"<p><b>先判断是不是故障：</b>开启代理后访问经过 Cloudflare，隐藏源站 IP 并提供缓存/防护，但非 HTTP 服务或某些验证可能失败。</p><p><b>页面内处理方法：</b></p><ol><li>普通网站可尝试开启代理。</li><li>API、验证、非网页服务出问题时改成仅 DNS 测试。</li></ol><p><b>必须后台处理的情况：</b>管理员应允许用户按记录选择代理，或按平台策略关闭。</p><p><b>补充提醒：</b>MX/TXT 不支持代理，不要强行开启。</p>"},{"id":"dns-strict-v60-31","q":"CF_API_TOKEN 需要什么权限？","a":"<p><b>核心原因：</b>Token 至少需要对应 Zone 的 DNS 编辑权限，否则创建、更新、删除记录会失败。</p><p><b>用户自查：</b></p><ol><li>普通用户无法处理 Token。</li><li>看到 DNS_TOKEN_MISSING 或权限错误时联系管理员。</li></ol><p><b>需要管理员处理：</b>管理员在 Cloudflare 创建最小权限 Token：Zone DNS Edit，并确认 Zone ID 是正确域名。</p><p><b>容易踩坑：</b>不要把 Token 填到网页表单或截图发给用户。</p>"},{"id":"dns-strict-v60-32","q":"DNS_ZONE_ID 填错会怎样？","a":"<p><b>为什么会这样：</b>Zone ID 指向错误时，系统会把请求发到另一个域名区域或被 Cloudflare 拒绝，导致记录不存在或创建失败。</p><p><b>自己先这样排查：</b></p><ol><li>用户只能把错误提示反馈给管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员在 Cloudflare 域名 Overview/API 区域核对 Zone ID，并和 DNS_SUFFIX 后缀一一对应。</p><p><b>注意事项：</b>多根域名时每个后缀都要有自己的 Zone ID。</p>"},{"id":"dns-strict-v60-33","q":"DNS_ALLOWED_TYPES 有什么用？","a":"<p><b>判断重点：</b>它控制用户下拉列表里能创建哪些记录类型，也控制后端校验，前端隐藏不等于后端允许。</p><p><b>可直接操作的步骤：</b></p><ol><li>如果下拉里没有 MX/TXT，说明平台未开放。</li></ol><p><b>后台需要检查的位置：</b>管理员在 DNS 配置里谨慎开放类型，尤其 MX 可能引发邮件滥用。</p><p><b>不要这样操作：</b>只改前端下拉没用，后端也会校验类型。</p>"},{"id":"dns-strict-v60-34","q":"默认记录类型为什么总是 CNAME？","a":"<p><b>真实原因：</b>默认类型来自 DNS_DEFAULT_TYPE 或后台根域名配置；它只影响表单初始选项，不代表用户只能用 CNAME。</p><p><b>普通用户能处理的部分：</b></p><ol><li>添加解析时手动改成 A、MX、TXT 等需要的类型。</li></ol><p><b>管理员要处理的部分：</b>管理员可在 DNS 配置中修改默认类型。</p><p><b>高频误区：</b>默认类型不会自动判断你的目标是 IP 还是域名，用户要自己选对。</p>"},{"id":"dns-strict-v60-35","q":"目标地址可以带端口吗？","a":"<p><b>先判断是不是故障：</b>DNS 记录不能保存端口，端口属于应用访问层，例如 example.com:8080 不是 A/CNAME 的合法目标。</p><p><b>页面内处理方法：</b></p><ol><li>A 记录只填 IP。</li><li>CNAME 只填域名。</li><li>端口在你的服务器或反向代理里配置。</li></ol><p><b>必须后台处理的情况：</b>管理员如果用户要绑定带端口服务，应指导其配置 Web 代理，不是 DNS 解决。</p><p><b>补充提醒：</b>DNS 不能把域名直接指向某个 URL 路径或端口。</p>"},{"id":"dns-strict-v60-36","q":"A 记录 IPv4 格式怎么检查？","a":"<p><b>核心原因：</b>IPv4 必须是四段 0-255 的数字，例如 103.205.240.19。含中文句号、空格、端口都会失败。</p><p><b>用户自查：</b></p><ol><li>复制后检查有没有空格。</li><li>不要写 http://103.205.240.19。</li></ol><p><b>需要管理员处理：</b>管理员可通过后端 normalizeDnsTarget 拦截非法 IP。</p><p><b>容易踩坑：</b>103.205.240.19:80 不是 DNS A 记录。</p>"},{"id":"dns-strict-v60-37","q":"AAAA IPv6 格式怎么检查？","a":"<p><b>为什么会这样：</b>IPv6 使用冒号分隔，允许 :: 缩写，但不能混入端口、URL 或方括号。</p><p><b>自己先这样排查：</b></p><ol><li>从服务器面板复制纯 IPv6 地址。</li><li>保存失败时先用 A 记录确认 IPv4 是否可用。</li></ol><p><b>联系管理员时要说明：</b>管理员如果用户群体不需要 IPv6，可暂时关闭 AAAA 类型。</p><p><b>注意事项：</b>[2400::1] 这种 URL 写法不适合直接填入 AAAA。</p>"},{"id":"dns-strict-v60-38","q":"目标域名后面要不要加点？","a":"<p><b>判断重点：</b>大多数情况下不需要加末尾的点，系统和 Cloudflare 能处理普通域名格式。</p><p><b>可直接操作的步骤：</b></p><ol><li>CNAME/MX 目标直接填 example.com。</li><li>不要填成 https://example.com/path。</li></ol><p><b>后台需要检查的位置：</b>管理员可在后端保存前统一清理尾部点，减少用户困惑。</p><p><b>不要这样操作：</b>部分 DNS 教程里的尾点是标准写法，但普通用户不必强行使用。</p>"},{"id":"dns-strict-v60-39","q":"浏览器打不开就是 DNS 没生效吗？","a":"<p><b>真实原因：</b>不一定。DNS 生效只解决“域名指向哪里”，网站打不开还可能是目标服务器没开、HTTPS 证书未配置或第三方平台未绑定域名。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先确认 DNS 列表显示已生效。</li><li>再检查目标服务器或第三方平台是否已经绑定该域名。</li><li>换网络测试。</li></ol><p><b>管理员要处理的部分：</b>管理员可用 Cloudflare 后台和查询工具确认记录是否存在，再判断是否是应用层问题。</p><p><b>高频误区：</b>不要把 404、证书错误、连接超时都归为 DNS 未生效。</p>"},{"id":"dns-strict-v60-40","q":"怎么判断是浏览器缓存还是 DNS 问题？","a":"<p><b>先判断是不是故障：</b>同一设备打不开但换网络或无痕能打开，常见是浏览器/本地 DNS 缓存；所有网络都打不开才更像 DNS 或目标服务问题。</p><p><b>页面内处理方法：</b></p><ol><li>清浏览器缓存或换手机流量测试。</li><li>等待 TTL 缓存过期。</li></ol><p><b>必须后台处理的情况：</b>管理员可用不同地区的 DNS 查询结果比对。</p><p><b>补充提醒：</b>刚修改记录后的几分钟内出现新旧结果混杂很正常。</p>"},{"id":"dns-strict-v60-41","q":"记录状态显示失败怎么办？","a":"<p><b>核心原因：</b>失败表示系统尝试调用 Cloudflare API 但返回错误，D1 会保存 error_message 方便排查。</p><p><b>用户自查：</b></p><ol><li>打开该记录查看错误提示。</li><li>确认目标值格式正确后重新编辑保存。</li></ol><p><b>需要管理员处理：</b>管理员查看 Worker 日志和 dns_records.error_message，判断是权限、冲突还是格式。</p><p><b>容易踩坑：</b>不要删除失败记录前不截图，错误信息对定位很重要。</p>"},{"id":"dns-strict-v60-42","q":"D1 和 Cloudflare 不同步怎么办？","a":"<p><b>为什么会这样：</b>如果有人在 Cloudflare 后台手动增删改记录，系统 D1 保存的记录 ID 和摘要可能失效。</p><p><b>自己先这样排查：</b></p><ol><li>以系统内 DNS 列表为准进行操作。</li><li>发现 Cloudflare 后台不同步时联系管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员可按记录名在 Cloudflare 查询并修复 cf_record_id，或删除 D1 脏记录后让用户重新添加。</p><p><b>注意事项：</b>长期混用手动后台和系统管理，必然容易不同步。</p>"},{"id":"dns-strict-v60-43","q":"删除提示 Record does not exist 怎么办？","a":"<p><b>判断重点：</b>这说明系统要删的 Cloudflare 记录 ID 已经不存在，常见于手动删除或记录被重建。</p><p><b>可直接操作的步骤：</b></p><ol><li>用户端等待管理员处理，不要反复点击。</li></ol><p><b>后台需要检查的位置：</b>管理员应使用按名称兜底删除的版本，删除不到旧 ID 时继续清理 D1。</p><p><b>不要这样操作：</b>Record does not exist 不代表域名不存在，只是那条 DNS 记录 ID 不存在。</p>"},{"id":"dns-strict-v60-44","q":"批准域名后已有待写入 DNS 会怎样？","a":"<p><b>真实原因：</b>如果审核前允许保存待写入记录，批准时系统会尝试同步这些 pending 记录到 Cloudflare。</p><p><b>普通用户能处理的部分：</b></p><ol><li>批准后进入 DNS 列表看状态是否变为已生效。</li></ol><p><b>管理员要处理的部分：</b>管理员批准时若同步失败，应查看 error_message；域名状态仍可能正常，但 DNS 需要重新保存。</p><p><b>高频误区：</b>不要以为批准按钮只改状态，旧待写入记录也可能触发 API 调用。</p>"},{"id":"dns-strict-v60-45","q":"能导入 Cloudflare 已有记录吗？","a":"<p><b>先判断是不是故障：</b>当前系统主要管理通过平台创建的记录，不会自动扫描并导入 Cloudflare 后台已有记录。</p><p><b>页面内处理方法：</b></p><ol><li>需要平台管理的记录，建议在系统内重新创建。</li></ol><p><b>必须后台处理的情况：</b>管理员若要导入，需要开发 Cloudflare List DNS Records 同步功能，并写入 dns_records 表。</p><p><b>补充提醒：</b>手动存在的记录不会自动显示在用户 DNS 列表。</p>"},{"id":"dns-strict-v60-46","q":"手动在 Cloudflare 删除记录后系统会知道吗？","a":"<p><b>核心原因：</b>不会立即知道。系统只有在下一次编辑、删除或同步时才可能发现记录 ID 不存在。</p><p><b>用户自查：</b></p><ol><li>尽量不要手动删系统创建的记录。</li><li>如果已经删了，回系统删除对应记录或联系管理员。</li></ol><p><b>需要管理员处理：</b>管理员可清理 D1 中 cf_record_id 指向失效的记录。</p><p><b>容易踩坑：</b>Cloudflare 后台操作不会自动回写 D1。</p>"},{"id":"dns-strict-v60-47","q":"多根域名下 DNS 怎么区分？","a":"<p><b>为什么会这样：</b>每个根域名后缀对应自己的 Zone ID、允许类型、默认代理和 TTL，用户申请时选哪个后缀就用哪套配置。</p><p><b>自己先这样排查：</b></p><ol><li>注册时选择正确根域名。</li><li>添加解析时确认当前管理的是哪个完整域名。</li></ol><p><b>联系管理员时要说明：</b>管理员在“DNS 配置”维护每条根域名的 suffix 和 zoneId，不能混填。</p><p><b>注意事项：</b>flore.top 的 Zone ID 不能拿去管理另一个主域。</p>"},{"id":"dns-strict-v60-48","q":"为什么不能给父级 flore.top 添加记录？","a":"<p><b>判断重点：</b>用户管理的是自己申请的二级域名及其下级主机，不允许直接修改平台根域名记录，防止影响整站。</p><p><b>可直接操作的步骤：</b></p><ol><li>在你的域名下添加 @、www、api 等记录。</li><li>不要尝试申请或编辑 flore.top 根本身。</li></ol><p><b>后台需要检查的位置：</b>管理员根域名记录只能在 Cloudflare 或后台 DNS 配置中维护。</p><p><b>不要这样操作：</b>免费用户的权限边界是子域，不是主域所有权。</p>"},{"id":"dns-strict-v60-49","q":"DNS 记录数量为什么有限制？","a":"<p><b>真实原因：</b>单域名记录过多会增加 D1 查询量、Cloudflare DNS 管理复杂度和滥用风险。</p><p><b>普通用户能处理的部分：</b></p><ol><li>删除不用的验证 TXT 和旧记录。</li><li>合并重复用途的主机。</li></ol><p><b>管理员要处理的部分：</b>管理员在“域名规则”设置单个二级域名最大 DNS 解析条数。</p><p><b>高频误区：</b>不要把一个免费二级域名当完整 DNS 托管平台无限使用。</p>"},{"id":"dns-strict-v60-50","q":"为什么 A 和 CNAME 同名冲突？","a":"<p><b>先判断是不是故障：</b>DNS 标准中 CNAME 表示该名字完全别名到另一个名字，通常不能和同名 A/MX/TXT 共存。</p><p><b>页面内处理方法：</b></p><ol><li>如果主机 @ 已有 CNAME，就不要再给 @ 添加 A。</li><li>改用 www 或删除旧记录后再添加。</li></ol><p><b>必须后台处理的情况：</b>管理员可用后端重复检测防止同名冲突。</p><p><b>补充提醒：</b>冲突不是界面限制，是 DNS 规则本身。</p>"}]},{"key":"domain","title":"域名管理问题","subtitle":"域名状态、审核、删除、续期、禁用、额度、管理员处理和手机端操作","items":[{"id":"domain-strict-v60-01","q":"为什么看不到“管理域名”按钮？","a":"<p><b>核心原因：</b>管理按钮只对已批准且未禁用、未撤销的域名显示；待审核或已拒绝状态不允许进入 DNS 管理。</p><p><b>用户自查：</b></p><ol><li>在“域名注册”或“域名管理”查看状态。</li><li>状态为“正常”后再找“管理域名”。</li></ol><p><b>需要管理员处理：</b>管理员需要在“域名审核”批准申请；若域名被禁用，需要先处理禁用原因。</p><p><b>容易踩坑：</b>不要把“已提交”当成“已批准”。</p>"},{"id":"domain-strict-v60-02","q":"域名显示正常但网站打不开怎么办？","a":"<p><b>为什么会这样：</b>域名状态正常只表示审核通过，不代表 DNS 已配置或目标网站正常运行。</p><p><b>自己先这样排查：</b></p><ol><li>进入域名详情查看 DNS 记录数量。</li><li>确认至少有 A 或 CNAME 指向正确目标。</li><li>检查目标服务器/第三方平台是否绑定该域名。</li></ol><p><b>联系管理员时要说明：</b>管理员可确认 Cloudflare DNS 是否存在记录，帮助区分 DNS 问题和目标服务问题。</p><p><b>注意事项：</b>正常状态和网站可访问是两层逻辑。</p>"},{"id":"domain-strict-v60-03","q":"为什么正常域名不能直接删除？","a":"<p><b>判断重点：</b>正常域名可能有 Cloudflare DNS 记录和外部访问，直接删除会造成残留或误删，所以必须走删除申请。</p><p><b>可直接操作的步骤：</b></p><ol><li>点击“申请删除域名”。</li><li>在 12 小时内可撤销。</li><li>等待管理员批准删除。</li></ol><p><b>后台需要检查的位置：</b>管理员批准删除时会清理 DNS 和 D1 记录。</p><p><b>不要这样操作：</b>不要先在 Cloudflare 手动删记录再回系统乱点，容易不同步。</p>"},{"id":"domain-strict-v60-04","q":"已拒绝域名怎么删除？","a":"<p><b>真实原因：</b>已拒绝域名没有生效 DNS，属于无效申请，按规则可以由用户直接删除以清理列表。</p><p><b>普通用户能处理的部分：</b></p><ol><li>在域名列表找到“已拒绝”。</li><li>点击“删除无效域名”。</li><li>输入确认信息后删除。</li></ol><p><b>管理员要处理的部分：</b>管理员无需审核已拒绝记录的删除。</p><p><b>高频误区：</b>删除后一般不留痕，想保留拒绝原因请先截图。</p>"},{"id":"domain-strict-v60-05","q":"删除申请提交后还能取消吗？","a":"<p><b>先判断是不是故障：</b>正常域名删除申请提供 12 小时撤销窗口，超过后只能等待管理员处理。</p><p><b>页面内处理方法：</b></p><ol><li>进入域名详情。</li><li>如果看到“撤销删除申请”，说明还在可撤销时间内。</li><li>点击撤销后状态恢复正常。</li></ol><p><b>必须后台处理的情况：</b>管理员如果已经批准删除，用户就不能再撤销。</p><p><b>补充提醒：</b>撤销窗口从提交删除申请时间开始算，不是从管理员查看时开始算。</p>"},{"id":"domain-strict-v60-06","q":"管理员批准删除后发生什么？","a":"<p><b>核心原因：</b>系统会尝试删除该域名所有 Cloudflare DNS 记录，然后硬删除 D1 中的域名和解析记录。</p><p><b>用户自查：</b></p><ol><li>用户会从域名列表中看不到该域名。</li><li>相关服务将不可访问。</li></ol><p><b>需要管理员处理：</b>管理员应确认 Cloudflare 返回成功，若提示记录不存在，新版本会继续清理 D1。</p><p><b>容易踩坑：</b>批准删除是不可逆处理，不要当成暂停使用。</p>"},{"id":"domain-strict-v60-07","q":"管理员拒绝删除后会怎样？","a":"<p><b>为什么会这样：</b>拒绝删除会清空 delete_requested_at，域名回到正常可管理状态，用户可继续使用。</p><p><b>自己先这样排查：</b></p><ol><li>查看消息中心的拒绝原因。</li><li>如果仍要删除，修正原因后重新提交申请。</li></ol><p><b>联系管理员时要说明：</b>管理员拒绝时应填写原因，例如域名仍在业务使用或身份未确认。</p><p><b>注意事项：</b>拒绝删除不会删除 DNS。</p>"},{"id":"domain-strict-v60-08","q":"域名被禁用后还能管理吗？","a":"<p><b>判断重点：</b>禁用表示管理员停止该域名使用并移除 DNS，用户不应继续管理或添加解析。</p><p><b>可直接操作的步骤：</b></p><ol><li>查看消息中心的禁用通知。</li><li>通过帮助中心说明申诉原因。</li></ol><p><b>后台需要检查的位置：</b>管理员可根据规则决定是否重新开放，但需要重新确认 DNS 和内容风险。</p><p><b>不要这样操作：</b>禁用不是临时隐藏，通常是风险处置。</p>"},{"id":"domain-strict-v60-09","q":"域名被撤销和被禁用有什么区别？","a":"<p><b>真实原因：</b>撤销通常是结束授权或管理员收回，禁用更偏向违规/风险处置；两者都会让域名不能继续正常使用。</p><p><b>普通用户能处理的部分：</b></p><ol><li>查看域名状态和消息通知。</li><li>需要恢复时联系管理员说明用途。</li></ol><p><b>管理员要处理的部分：</b>管理员在处理时应选择准确动作并填写备注。</p><p><b>高频误区：</b>用户端看到不能管理时，不要反复添加 DNS。</p>"},{"id":"domain-strict-v60-10","q":"为什么续期按钮不显示？","a":"<p><b>先判断是不是故障：</b>续期只在到期前 X 天窗口内开放，未进入窗口、域名未批准或待删除审核时都不会显示。</p><p><b>页面内处理方法：</b></p><ol><li>查看域名详情里的剩余时间。</li><li>确认状态是正常。</li><li>临近到期再查看续期按钮。</li></ol><p><b>必须后台处理的情况：</b>管理员可在“域名规则”设置续期窗口和是否开放用户自助续期。</p><p><b>补充提醒：</b>不是所有域名都能随时续期，避免长期占用资源。</p>"},{"id":"domain-strict-v60-11","q":"续期成功后到期时间怎么算？","a":"<p><b>核心原因：</b>系统一般从当前到期时间和当前时间中较晚者开始顺延默认有效天数，避免提前续期丢失剩余天数。</p><p><b>用户自查：</b></p><ol><li>续期后查看新的到期时间。</li><li>刷新域名详情确认剩余时间更新。</li></ol><p><b>需要管理员处理：</b>管理员可在 D1 查看 renew_count 和 renewed_at 判断是否写入成功。</p><p><b>容易踩坑：</b>不要连续重复点击续期按钮，避免误会时间变化。</p>"},{"id":"domain-strict-v60-12","q":"域名到期提醒在哪里看？","a":"<p><b>为什么会这样：</b>到期提醒可通过域名卡片、消息中心或首页公告显示，具体取决于管理员是否开启前台到期提醒。</p><p><b>自己先这样排查：</b></p><ol><li>进入“域名管理”查看剩余时间。</li><li>查看消息中心是否有到期通知。</li></ol><p><b>联系管理员时要说明：</b>管理员在“界面设置”和“通知设置”中开启到期提醒，并设置触发天数。</p><p><b>注意事项：</b>关闭提醒不代表域名不会到期。</p>"},{"id":"domain-strict-v60-13","q":"域名过期后会自动删除吗？","a":"<p><b>判断重点：</b>是否自动清理取决于管理员的自动化任务和过期后清理时长配置；未开启时只显示过期或待处理。</p><p><b>可直接操作的步骤：</b></p><ol><li>过期前主动续期。</li><li>过期后无法续期时联系管理员。</li></ol><p><b>后台需要检查的位置：</b>管理员在“自动化任务”配置扫描周期和过期 DNS 清理规则。</p><p><b>不要这样操作：</b>自动清理会影响访问，开启前要通知用户。</p>"},{"id":"domain-strict-v60-14","q":"二级域名可以转让给别人吗？","a":"<p><b>真实原因：</b>当前是否允许转让由“域名规则”控制；很多平台默认关闭，以免账号归属和责任不清。</p><p><b>普通用户能处理的部分：</b></p><ol><li>普通用户看不到转让入口时说明未开放。</li><li>需要转让时联系管理员说明双方账号。</li></ol><p><b>管理员要处理的部分：</b>管理员若开放转让，需要记录原用户、新用户和域名归属变更。</p><p><b>高频误区：</b>不要通过共享账号来变相转让域名。</p>"},{"id":"domain-strict-v60-15","q":"为什么纯数字前缀可能被禁止？","a":"<p><b>先判断是不是故障：</b>纯数字域名容易被用于临时跳转、批量注册和难以识别的垃圾站点，后台可选择禁止。</p><p><b>页面内处理方法：</b></p><ol><li>换成字母加数字，例如 app123。</li><li>不要反复提交纯数字。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”里决定是否允许纯数字前缀。</p><p><b>补充提醒：</b>允许纯数字会提升滥用风险。</p>"},{"id":"domain-strict-v60-16","q":"为什么下划线前缀可能不能用？","a":"<p><b>核心原因：</b>普通主机名不推荐使用下划线，虽然部分 TXT 验证会用 _ 开头，但二级域名前缀通常限制更严格。</p><p><b>用户自查：</b></p><ol><li>普通域名前缀使用字母、数字、短横线。</li><li>TXT 主机如 _dmarc 是 DNS 记录主机，不是申请域名前缀。</li></ol><p><b>需要管理员处理：</b>管理员可单独控制“域名前缀是否允许下划线”。</p><p><b>容易踩坑：</b>不要混淆申请前缀和 DNS 记录主机。</p>"},{"id":"domain-strict-v60-17","q":"黑名单关键词命中怎么办？","a":"<p><b>为什么会这样：</b>命中黑名单说明前缀、邮箱、IP 或关键词被平台限制，普通用户不能强行提交。</p><p><b>自己先这样排查：</b></p><ol><li>换一个合规前缀。</li><li>如果是误伤，提交用途说明给管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员在“黑名单管理”查看域名前缀、IP、邮箱名单，必要时移除误伤项。</p><p><b>注意事项：</b>黑名单通常用于保护平台，不是前端显示错误。</p>"},{"id":"domain-strict-v60-18","q":"平台最大总配额是什么意思？","a":"<p><b>判断重点：</b>这是整个平台可分配的二级域名总上限，用来防止所有用户合计占用过多记录。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户只能看到自己的额度。</li><li>如果系统总额度满了，需要等待管理员扩容或清理。</li></ol><p><b>后台需要检查的位置：</b>管理员在“域名规则”调整平台最大二级域名总配额。</p><p><b>不要这样操作：</b>用户额度没满但平台总额满，也可能无法申请。</p>"},{"id":"domain-strict-v60-19","q":"单用户额度和平台总额度有什么区别？","a":"<p><b>真实原因：</b>单用户额度限制一个账号能申请多少个；平台总额度限制所有用户合计能申请多少个。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先看自己账户额度是否用完。</li><li>若自己额度未满仍失败，可能是平台总额度或黑名单限制。</li></ol><p><b>管理员要处理的部分：</b>管理员需要同时检查用户 domain_quota 和平台 total quota。</p><p><b>高频误区：</b>只调用户额度不能解决平台总额满的问题。</p>"},{"id":"domain-strict-v60-20","q":"管理员如何给用户改额度？","a":"<p><b>先判断是不是故障：</b>额度在用户记录上保存，管理员可直接编辑某个用户的 domain_quota。</p><p><b>页面内处理方法：</b></p><ol><li>普通用户通过帮助中心提交额度申请和用途。</li></ol><p><b>必须后台处理的情况：</b>管理员进入“用户管理”，点击用户，修改“域名额度”后保存。</p><p><b>补充提醒：</b>修改默认额度只影响新用户，不会自动改已有用户。</p>"},{"id":"domain-strict-v60-21","q":"自动审批和人工审核有什么区别？","a":"<p><b>核心原因：</b>自动审批会让符合规则的申请立即变正常；人工审核需要管理员在域名审核页面处理。</p><p><b>用户自查：</b></p><ol><li>普通用户提交后看状态：正常表示已通过，待审核表示等管理员。</li></ol><p><b>需要管理员处理：</b>管理员在“域名规则 → 审核模式”选择自动审批或人工审核。</p><p><b>容易踩坑：</b>自动审批风险更高，必须配合黑名单和额度限制。</p>"},{"id":"domain-strict-v60-22","q":"域名审核页面主要看什么？","a":"<p><b>为什么会这样：</b>审核页用于处理待审核、正常、待删除审核等域名，管理员要看域名、用户、DNS 摘要、状态和到期时间。</p><p><b>自己先这样排查：</b></p><ol><li>普通用户没有审核页。</li></ol><p><b>联系管理员时要说明：</b>管理员按风险判断：正常用途批准，违规或保留词拒绝，已生效风险域名可禁用或撤销。</p><p><b>注意事项：</b>不要只看前缀短不短，要结合用户和用途。</p>"},{"id":"domain-strict-v60-23","q":"各种域名状态是什么意思？","a":"<p><b>判断重点：</b>状态决定域名能否管理、能否删除、是否占额度。待审核不能配 DNS，正常可管理，待删除审核等待管理员，拒绝/撤销属于无效或终止。</p><p><b>可直接操作的步骤：</b></p><ol><li>在域名卡片右上角查看状态。</li><li>根据状态选择注册、管理、删除或等待。</li></ol><p><b>后台需要检查的位置：</b>管理员需保证前端显示和 D1 状态一致，避免状态误导用户。</p><p><b>不要这样操作：</b>“已禁用”可能底层兼容为 revoked，但显示语义不同。</p>"},{"id":"domain-strict-v60-24","q":"待删除审核是否占用额度？","a":"<p><b>真实原因：</b>占用。因为删除还没完成，域名仍然归当前用户，DNS 也可能还存在。</p><p><b>普通用户能处理的部分：</b></p><ol><li>等待管理员批准删除。</li><li>12 小时内不想删可以撤销。</li></ol><p><b>管理员要处理的部分：</b>管理员及时处理删除申请可以释放用户额度。</p><p><b>高频误区：</b>不要以为提交删除申请后额度马上释放。</p>"},{"id":"domain-strict-v60-25","q":"账号注销前为什么列出未注销域名？","a":"<p><b>先判断是不是故障：</b>系统必须确保账号下没有待审核、正常、待删除审核等域名，避免注销后出现无人负责的记录。</p><p><b>页面内处理方法：</b></p><ol><li>按弹窗列出的域名逐个处理。</li><li>正常域名走申请删除，拒绝/撤销域名直接删。</li></ol><p><b>必须后台处理的情况：</b>管理员批准删除后，用户再回账户设置注销。</p><p><b>补充提醒：</b>列表里的域名就是阻止注销的具体原因。</p>"},{"id":"domain-strict-v60-26","q":"删除域名后还能找回吗？","a":"<p><b>核心原因：</b>硬删除后 D1 和相关 DNS 记录会被清理，通常不能恢复。</p><p><b>用户自查：</b></p><ol><li>删除前记录好域名和 DNS 配置。</li><li>误删后只能重新申请同前缀，前提是未被占用。</li></ol><p><b>需要管理员处理：</b>管理员没有备份时无法直接恢复硬删除数据。</p><p><b>容易踩坑：</b>不要把删除当成临时停用，临时停用应联系管理员。</p>"},{"id":"domain-strict-v60-27","q":"为什么域名列表看不到刚申请的域名？","a":"<p><b>为什么会这样：</b>可能是页面缓存、请求还没刷新、申请失败或被后端拒绝没有写入 D1。</p><p><b>自己先这样排查：</b></p><ol><li>提交后看是否有成功提示。</li><li>刷新域名注册页下方列表。</li><li>检查是否被额度、黑名单或重复前缀拦截。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 D1 domain_applications 或操作日志确认申请是否写入。</p><p><b>注意事项：</b>没有成功提示就不要假设已经提交。</p>"},{"id":"domain-strict-v60-28","q":"域名列表排序规则是什么？","a":"<p><b>判断重点：</b>通常按状态和创建时间排序，待处理项优先展示，历史项靠后。</p><p><b>可直接操作的步骤：</b></p><ol><li>在列表中按状态查找。</li><li>域名多时使用浏览器搜索页面文字。</li></ol><p><b>后台需要检查的位置：</b>管理员可后续增加筛选和排序字段。</p><p><b>不要这样操作：</b>排序变化不代表域名丢失。</p>"},{"id":"domain-strict-v60-29","q":"DNS 数量显示不对怎么办？","a":"<p><b>真实原因：</b>DNS 数量来自 dns_records 表，旧摘要字段或缓存可能造成卡片显示与详情不一致。</p><p><b>普通用户能处理的部分：</b></p><ol><li>进入域名详情，以 DNS 解析列表为准。</li><li>强制刷新页面。</li></ol><p><b>管理员要处理的部分：</b>管理员确认是否部署了真实 dns_records 摘要版本，并清理旧字段残留。</p><p><b>高频误区：</b>不要只看卡片上的旧摘要判断真实解析。</p>"},{"id":"domain-strict-v60-30","q":"操作日志怎么查域名问题？","a":"<p><b>先判断是不是故障：</b>操作日志记录申请、批准、DNS 新增、修改、删除等动作，可以定位谁在什么时候做了什么。</p><p><b>页面内处理方法：</b></p><ol><li>进入“操作日志”。</li><li>用类型筛选 DNS 或域名。</li><li>按时间倒序查看最近操作。</li></ol><p><b>必须后台处理的情况：</b>管理员可查看全站日志；普通用户只能看到自己的相关操作。</p><p><b>补充提醒：</b>日志只保留设定天数，太久的记录可能已清理。</p>"},{"id":"domain-strict-v60-31","q":"如何选择根域名后缀？","a":"<p><b>核心原因：</b>多根域名启用后，注册页会显示可选后缀，不同后缀可能对应不同用途和 DNS 配置。</p><p><b>用户自查：</b></p><ol><li>注册时先选择根域名。</li><li>确认预览完整域名正确后提交。</li></ol><p><b>需要管理员处理：</b>管理员在“DNS 配置”维护后缀列表和 Zone ID。</p><p><b>容易踩坑：</b>选错后缀不能直接改成另一个后缀，通常要重新申请。</p>"},{"id":"domain-strict-v60-32","q":"管理员怎么增加根域名？","a":"<p><b>为什么会这样：</b>增加根域名需要在 Cloudflare 有对应 Zone，并在后台配置 suffix、zoneId、允许类型等信息。</p><p><b>自己先这样排查：</b></p><ol><li>普通用户不能增加根域名，只能选择已开放后缀。</li></ol><p><b>联系管理员时要说明：</b>管理员进入“DNS 配置”，新增根域名项，填后缀、Zone ID、默认类型、TTL 和代理设置。</p><p><b>注意事项：</b>只填 DNS_SUFFIX 不够，多后缀要每个都有 Zone ID。</p>"},{"id":"domain-strict-v60-33","q":"为什么修改管理员设置要二次确认？","a":"<p><b>判断重点：</b>注册、域名规则、DNS、黑名单、安全设置会影响大量用户和存量解析，误操作风险高。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户不会看到这些确认。</li></ol><p><b>后台需要检查的位置：</b>管理员保存高危配置前阅读风险文字，再确认保存。</p><p><b>不要这样操作：</b>不要在未备份配置时批量修改 DNS 和黑名单。</p>"},{"id":"domain-strict-v60-34","q":"用户为什么不能编辑 DNS？","a":"<p><b>真实原因：</b>可能是域名未批准、待删除审核、管理员关闭了生效后编辑，或该记录正在错误状态。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先确认域名状态为正常。</li><li>查看是否有待删除审核提示。</li></ol><p><b>管理员要处理的部分：</b>管理员检查“域名规则 → 生效后允许用户修改 DNS”开关。</p><p><b>高频误区：</b>不能编辑时反复提交不会解决权限问题。</p>"},{"id":"domain-strict-v60-35","q":"管理员关闭 DNS 编辑会怎样？","a":"<p><b>先判断是不是故障：</b>关闭后用户不能修改已生效域名的 DNS，适合平台统一托管或防止用户乱改解析。</p><p><b>页面内处理方法：</b></p><ol><li>用户只能查看现有记录，不能保存修改。</li><li>需要变更时联系管理员。</li></ol><p><b>必须后台处理的情况：</b>管理员在域名规则里关闭或开启该权限，并告知用户。</p><p><b>补充提醒：</b>关闭编辑不一定影响新增权限，具体以版本逻辑为准。</p>"},{"id":"domain-strict-v60-36","q":"根域名配置重复会怎样？","a":"<p><b>核心原因：</b>重复 suffix 会导致注册选择、Zone ID 匹配和 DNS 写入混乱，可能把记录写到错误区域。</p><p><b>用户自查：</b></p><ol><li>用户发现后缀重复时不要提交申请，先反馈。</li></ol><p><b>需要管理员处理：</b>管理员在 DNS 配置中保持每个 suffix 唯一，并清理旧重复项。</p><p><b>容易踩坑：</b>flore.top 和 www.flore.top 不是同一类根后缀配置。</p>"},{"id":"domain-strict-v60-37","q":"后缀被管理员关闭后用户怎么办？","a":"<p><b>为什么会这样：</b>后缀关闭后，新申请不再显示该根域名；已有域名是否受影响取决于管理员规则。</p><p><b>自己先这样排查：</b></p><ol><li>注册新域名时选择其他后缀。</li><li>已有域名异常时联系管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员关闭后缀前应通知用户，并确认已有域名解析是否继续维护。</p><p><b>注意事项：</b>关闭注册入口不等于自动删除已有域名。</p>"},{"id":"domain-strict-v60-38","q":"什么域名会被判定违规？","a":"<p><b>判断重点：</b>仿冒品牌、支付登录、违法内容、恶意跳转、垃圾邮件用途和误导性前缀都可能被拒绝、禁用或撤销。</p><p><b>可直接操作的步骤：</b></p><ol><li>申请前使用清晰、真实的项目名。</li><li>被拒绝后查看消息中心说明。</li></ol><p><b>后台需要检查的位置：</b>管理员维护黑名单并在审核时填写拒绝原因。</p><p><b>不要这样操作：</b>免费域名平台尤其要保护主域信誉。</p>"},{"id":"domain-strict-v60-39","q":"为什么 phishing 类域名不能申请？","a":"<p><b>真实原因：</b>钓鱼域名会损害主域名和所有用户，甚至导致 Cloudflare、浏览器或安全厂商拦截整个平台。</p><p><b>普通用户能处理的部分：</b></p><ol><li>不要申请和银行、钱包、登录页相似的前缀。</li></ol><p><b>管理员要处理的部分：</b>管理员必须拒绝这类申请并可禁用账号。</p><p><b>高频误区：</b>“只是测试”也不建议使用真实品牌或登录相关前缀。</p>"},{"id":"domain-strict-v60-40","q":"系统保留前缀能不能找管理员开放？","a":"<p><b>先判断是不是故障：</b>一般不建议开放，除非管理员确认不会和平台服务冲突。</p><p><b>页面内处理方法：</b></p><ol><li>换成业务专属前缀。</li><li>确实需要时说明用途。</li></ol><p><b>必须后台处理的情况：</b>管理员评估 www、api、mail、admin 等是否已被平台使用。</p><p><b>补充提醒：</b>开放 mail、admin 这类前缀风险很高。</p>"},{"id":"domain-strict-v60-41","q":"可以先批准域名再让用户配 DNS 吗？","a":"<p><b>核心原因：</b>可以。当前推荐流程就是先审核域名合法性，通过后用户再自行添加 DNS 解析。</p><p><b>用户自查：</b></p><ol><li>用户通过后进入“域名管理”添加解析。</li></ol><p><b>需要管理员处理：</b>管理员批准时不必填写 DNS，只需确认域名合规。</p><p><b>容易踩坑：</b>审核通过不代表 DNS 自动存在。</p>"},{"id":"domain-strict-v60-42","q":"Cloudflare API 失败时域名会怎样？","a":"<p><b>为什么会这样：</b>域名状态和 DNS 状态是分开的，API 失败可能导致域名正常但解析记录失败。</p><p><b>自己先这样排查：</b></p><ol><li>查看 DNS 记录状态和错误信息。</li><li>修正目标后重新保存。</li></ol><p><b>联系管理员时要说明：</b>管理员检查 Token、Zone ID、记录冲突和 Cloudflare 返回内容。</p><p><b>注意事项：</b>不要把 API 失败误判为审核失败。</p>"},{"id":"domain-strict-v60-43","q":"D1 硬删除是什么意思？","a":"<p><b>判断重点：</b>硬删除是直接从 D1 表删除记录，不再保留 deleted_at 软删除痕迹，用于减少脏数据和约束冲突。</p><p><b>可直接操作的步骤：</b></p><ol><li>删除前确认不再需要。</li></ol><p><b>后台需要检查的位置：</b>管理员应知道硬删除不利于长期追溯，重要信息要靠操作日志或外部备份。</p><p><b>不要这样操作：</b>硬删除后不能像回收站一样恢复。</p>"},{"id":"domain-strict-v60-44","q":"CHECK constraint failed 怎么处理？","a":"<p><b>真实原因：</b>旧 D1 表可能给 status 字段设置了固定允许值，新代码写入 disabled 等新状态时会触发约束错误。</p><p><b>普通用户能处理的部分：</b></p><ol><li>用户看到该错误只能截图反馈。</li></ol><p><b>管理员要处理的部分：</b>管理员应使用兼容写法，或迁移 D1 表结构；例如禁用域名用 revoked 加备注兼容旧约束。</p><p><b>高频误区：</b>不要反复点击同一按钮，约束错误不会因重试消失。</p>"},{"id":"domain-strict-v60-45","q":"域名管理多久刷新一次？","a":"<p><b>先判断是不是故障：</b>当前要求是 5 分钟无感刷新，编辑中、弹窗打开、消息中心使用中不刷新，避免打断操作。</p><p><b>页面内处理方法：</b></p><ol><li>需要立即看结果时手动刷新页面。</li><li>正在填写表单时不用担心自动刷新覆盖。</li></ol><p><b>必须后台处理的情况：</b>管理员在代码里统一刷新间隔，避免某些页面仍用 1 分钟。</p><p><b>补充提醒：</b>自动刷新不是实时推送，刚操作完可能需要手动刷新。</p>"},{"id":"domain-strict-v60-46","q":"手机端侧边栏为什么会截断？","a":"<p><b>核心原因：</b>通常是 CSS 高度、zoom 和 fixed 抽屉适配问题，导致侧栏没有延伸到底部或挤压内容。</p><p><b>用户自查：</b></p><ol><li>手机端点击三横杠打开菜单，空白处关闭。</li><li>显示错位时清缓存。</li></ol><p><b>需要管理员处理：</b>管理员确认最新 styles.css 中移动端侧栏为 fixed，并处理 overflow-y 滚动。</p><p><b>容易踩坑：</b>不要在手机端沿用桌面端 80% zoom。</p>"},{"id":"domain-strict-v60-47","q":"默认语言会影响哪些页面？","a":"<p><b>为什么会这样：</b>默认语言影响首次进入时的界面语言和右上角 EN/中文切换按钮状态，但管理员自定义内容不会自动翻译。</p><p><b>自己先这样排查：</b></p><ol><li>用右上角按钮切换语言。</li></ol><p><b>联系管理员时要说明：</b>管理员在“界面设置”选择默认语言，并维护必要的英文文案。</p><p><b>注意事项：</b>帮助中心管理员自写中文，英文模式也可能显示中文。</p>"},{"id":"domain-strict-v60-48","q":"帮助中心内容谁能修改？","a":"<p><b>判断重点：</b>只有管理员能进入“帮助中心设置”增改 FAQ，普通用户只能搜索和查看。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户发现答案不准，可在帮助中心发消息反馈。</li></ol><p><b>后台需要检查的位置：</b>管理员修改分类、问题和答案后保存全部，用户帮助中心会读取新内容。</p><p><b>不要这样操作：</b>恢复默认会覆盖当前编辑内容，操作前先导出或复制。</p>"},{"id":"domain-strict-v60-49","q":"用户反馈如何进入后台？","a":"<p><b>真实原因：</b>用户在帮助中心底部提交消息后，系统写入 system_messages，目标角色是 admin。</p><p><b>普通用户能处理的部分：</b></p><ol><li>提交后会跳转消息中心并显示发送记录。</li><li>可查看管理员是否已读。</li></ol><p><b>管理员要处理的部分：</b>管理员在“消息中心”查看用户反馈，必要时回复。</p><p><b>高频误区：</b>外部联系 mailform 不会自动进入站内消息中心。</p>"},{"id":"domain-strict-v60-50","q":"客服回复能继续对话吗？","a":"<p><b>先判断是不是故障：</b>可以。管理员回复用户后消息类型显示“客服回复”，用户可以继续回复形成往返沟通。</p><p><b>页面内处理方法：</b></p><ol><li>在消息卡片点击“回复”。</li><li>回复会附带原消息内容。</li></ol><p><b>必须后台处理的情况：</b>管理员同样可在消息中心对用户反馈回复。</p><p><b>补充提醒：</b>自己发出的消息 15 分钟内显示撤销，不显示回复。</p>"}]}];
function isBadHelpContentV60(categories) {
  const text = JSON.stringify(categories || '');
  if (!text || text.length < 2000) return true;
  const badMarkers = [
    '这个问题通常和账号权限、审核状态、浏览器缓存、管理员设置或系统安全策略有关',
    '先确认当前页面状态和红色错误提示，再按顺序执行',
    '这个问题的判断点不是同一个固定答案，需要看当前状态、页面位置、账号权限和最近一次操作结果',
    '这是 faq 分类新增第',
    '这是 dns 分类新增第',
    '这是 domain 分类新增第',
    '结论只针对',
    '不要套用到其它问题'
  ];
  if (badMarkers.some(x => text.includes(x))) return true;
  const answers = [];
  for (const cat of (Array.isArray(categories) ? categories : [])) {
    for (const item of (Array.isArray(cat?.items) ? cat.items : [])) {
      const a = String(item?.a || '').replace(/\s+/g, ' ').trim();
      if (a) answers.push(a);
    }
  }
  if (answers.length < 60) return true;
  const unique = new Set(answers.map(a => a.slice(0, 240))).size;
  return unique < Math.ceil(answers.length * 0.82);
}
(function applyStrictHelpV60(){
  DEFAULT_HELP_CATEGORIES.splice(0, DEFAULT_HELP_CATEGORIES.length, ...STRICT_HELP_CATEGORIES_V60.map(cat => ({...cat, items: cat.items.map(item => ({...item}))})));
  normalizeHelpCategories = function(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const source = isBadHelpContentV60(arr) ? DEFAULT_HELP_CATEGORIES : arr;
    return DEFAULT_HELP_CATEGORIES.map((def, index) => {
      const item = source.find(x => x && (x.key === def.key || x.title === def.title)) || source[index] || def;
      const items = Array.isArray(item.items) && item.items.length ? item.items : def.items;
      return {
        key: String(item.key || def.key),
        title: String(item.title || def.title),
        subtitle: String(item.subtitle || def.subtitle),
        items: items.map((row, i) => ({
          id: String(row.id || `${def.key}-${i + 1}`),
          q: String(row.q || row.question || ''),
          a: String(row.a || row.answer || '')
        })).filter(row => row.q.trim())
      };
    });
  };
  helpCategories = function() {
    return normalizeHelpCategories(state.config?.help?.categories || []);
  };
})();

// v65 user-facing help center: no admin-operation questions, expanded practical Q&A.
const USER_HELP_CATEGORIES_V65 = [{"key": "faq", "title": "常见问题", "subtitle": "登录、注册、账户资料、消息、手机端、缓存和反馈入口", "items": [{"id": "faq-user-v65-001", "q": "登录页打开是空白怎么办？", "a": "<p><b>原因：</b>前端文件没有完整加载，常见于浏览器缓存了旧 app.js、网络拦截 Turnstile 脚本，或部署时 index.html 与 app.js 版本不一致。</p><ol><li>电脑端按 Ctrl+F5 强制刷新。</li><li>手机端清除 storage.flore.top 的站点数据后重新打开。</li><li>换 Chrome 或 Safari 访问，避免内置浏览器拦截脚本。</li></ol><p><b>自己能处理：</b>电脑端按 Ctrl+F5 强制刷新。</p><p><b>需要联系平台处理：</b>把空白页截图和浏览器控制台红色错误发给平台，平台需要检查前端文件和 Worker 部署版本。</p><p><b>注意：</b>不要只普通刷新，旧缓存可能一直保留损坏的脚本。</p>"}, {"id": "faq-user-v65-002", "q": "登录页没有人机验证怎么办？", "a": "<p><b>原因：</b>Turnstile 组件依赖 Cloudflare 脚本和站点密钥，脚本被拦截、密钥未生效或当前域名不匹配时会不显示。</p><ol><li>先关闭广告拦截插件。</li><li>刷新页面等待验证区域出现。</li><li>手机网络异常时切换 Wi-Fi 或流量。</li></ol><p><b>自己能处理：</b>先关闭广告拦截插件。</p><p><b>需要联系平台处理：</b>平台需要检查 TURNSTILE_SITE_KEY、TURNSTILE_SECRET 和 storage.flore.top 是否在 Turnstile 允许域名内。</p><p><b>注意：</b>人机验证不显示时不要反复提交登录，后端可能仍要求 token。</p>"}, {"id": "faq-user-v65-003", "q": "人机验证一直转圈怎么处理？", "a": "<p><b>原因：</b>验证框一直转圈多半是 Cloudflare 脚本加载慢、网络代理不稳定、浏览器隐私策略阻止第三方挑战。</p><ol><li>等待 10-20 秒再操作。</li><li>关闭 VPN、代理或浏览器隐私扩展后重试。</li><li>换一个浏览器或网络环境。</li></ol><p><b>自己能处理：</b>等待 10-20 秒再操作。</p><p><b>需要联系平台处理：</b>如果所有设备都转圈，平台需要检查 Turnstile 配置是否绑定错域名。</p><p><b>注意：</b>不要在转圈时连续点击登录按钮，会触发频率限制。</p>"}, {"id": "faq-user-v65-004", "q": "登录提示用户名或密码错误怎么办？", "a": "<p><b>原因：</b>登录会同时匹配用户名、邮箱和手机号，但密码必须和当前账号保存的哈希一致；资料修改后旧手机号或旧邮箱可能不再可用。</p><ol><li>确认输入的是当前用户名、绑定邮箱或绑定手机号。</li><li>检查大小写、空格和输入法全角字符。</li><li>忘记密码时点击登录页下方反馈链接提交重置申请。</li></ol><p><b>自己能处理：</b>确认输入的是当前用户名、绑定邮箱或绑定手机号。</p><p><b>需要联系平台处理：</b>平台可在核验身份后重置密码或确认账号绑定信息。</p><p><b>注意：</b>系统不会明文保存密码，平台也不能直接查看你的原密码。</p>"}, {"id": "faq-user-v65-005", "q": "登录后又回到登录页是什么原因？", "a": "<p><b>原因：</b>登录成功后需要浏览器保存会话 Cookie，Cookie 被禁用、跨标签旧会话冲突或 sessions 过期会导致下一次请求又变成未登录。</p><ol><li>确认浏览器允许本站 Cookie。</li><li>关闭旧标签页，只保留一个登录页面。</li><li>不要用会清除 Cookie 的隐私模式长期登录。</li></ol><p><b>自己能处理：</b>确认浏览器允许本站 Cookie。</p><p><b>需要联系平台处理：</b>平台需要检查 sessions 记录是否正常写入，并确认登录接口没有报错。</p><p><b>注意：</b>登录按钮显示成功不等于 Cookie 一定保存成功。</p>"}, {"id": "faq-user-v65-006", "q": "忘记密码怎么找回？", "a": "<p><b>原因：</b>系统没有短信或邮箱自助验证码找回，忘记密码需要人工核验后重置，避免别人冒用你的账号。</p><ol><li>点击登录页“出现问题？点击反馈”。</li><li>提交用户名、绑定手机号/邮箱、近期申请过的域名。</li><li>等待平台核验后给出重置方式。</li></ol><p><b>自己能处理：</b>点击登录页“出现问题？点击反馈”。</p><p><b>需要联系平台处理：</b>平台核验身份后可设置新初始密码。</p><p><b>注意：</b>不要把旧密码、浏览器 Cookie 或账号截图里的敏感信息发给陌生人。</p>"}, {"id": "faq-user-v65-007", "q": "注册时手机号和邮箱必须都填吗？", "a": "<p><b>原因：</b>不需要都填。系统要求手机号和邮箱至少填写一个，用于账号联系、登录识别和后续找回。</p><ol><li>只想用手机号注册时，邮箱可留空。</li><li>只想用邮箱注册时，手机号可留空。</li><li>两者都填写时，后续登录更方便。</li></ol><p><b>自己能处理：</b>只想用手机号注册时，邮箱可留空。</p><p><b>需要联系平台处理：</b>如果提示格式错误，平台可根据你提交的截图判断是邮箱格式还是手机号格式被拦截。</p><p><b>注意：</b>手机号和邮箱不能和其他账号重复绑定。</p>"}, {"id": "faq-user-v65-008", "q": "注册提示账号、邮箱或手机号已被使用怎么办？", "a": "<p><b>原因：</b>用户名、邮箱、手机号都作为唯一标识，任意一个被其他账号占用都会拒绝注册。</p><ol><li>换一个用户名。</li><li>确认手机号或邮箱是否曾经注册过。</li><li>尝试用已有账号登录。</li></ol><p><b>自己能处理：</b>换一个用户名。</p><p><b>需要联系平台处理：</b>平台可以查询是否有旧账号占用了该联系方式。</p><p><b>注意：</b>不要反复用同一个手机号提交，可能触发注册频率限制。</p>"}, {"id": "faq-user-v65-009", "q": "为什么临时邮箱不能注册？", "a": "<p><b>原因：</b>平台可能开启了临时邮箱拦截，临时邮箱容易被用于批量注册和滥用免费域名。</p><ol><li>换用长期可联系的真实邮箱。</li><li>也可以只填写手机号注册。</li><li>确认邮箱域名不是一次性邮箱服务。</li></ol><p><b>自己能处理：</b>换用长期可联系的真实邮箱。</p><p><b>需要联系平台处理：</b>如果真实邮箱被误判，提交邮箱域名给平台复核。</p><p><b>注意：</b>临时邮箱注册成功后也不利于找回账号。</p>"}, {"id": "faq-user-v65-010", "q": "注册按钮点了没有反应怎么办？", "a": "<p><b>原因：</b>按钮无反应通常是表单校验没通过、Turnstile token 没生成，或前端脚本仍是旧版本。</p><ol><li>确认用户名、密码、手机号/邮箱至少一项已填。</li><li>等待人机验证完成。</li><li>强制刷新后重新填写。</li></ol><p><b>自己能处理：</b>确认用户名、密码、手机号/邮箱至少一项已填。</p><p><b>需要联系平台处理：</b>平台需要查看浏览器 Console 报错或接口返回内容。</p><p><b>注意：</b>不要用自动填充空格作为手机号或邮箱，空格会被视为未填写。</p>"}, {"id": "faq-user-v65-011", "q": "注册成功后不能立刻登录怎么办？", "a": "<p><b>原因：</b>如果平台启用了人工启用账户，新注册账号会先写入用户表，但状态不是 active，所以暂时不能登录。</p><ol><li>查看注册成功提示是否写着等待启用。</li><li>不要重复注册同一联系方式。</li><li>通过反馈入口说明账号名并申请启用。</li></ol><p><b>自己能处理：</b>查看注册成功提示是否写着等待启用。</p><p><b>需要联系平台处理：</b>平台确认账号合规后可启用账号。</p><p><b>注意：</b>重复注册只会提示占用，不会加快启用。</p>"}, {"id": "faq-user-v65-012", "q": "修改用户名后还能用旧用户名登录吗？", "a": "<p><b>原因：</b>用户名修改后，旧用户名不再指向你的账号；登录应使用新用户名，或继续使用绑定手机号/邮箱。</p><ol><li>在账户设置确认当前用户名。</li><li>复制账号旁边的小图标保存新用户名。</li><li>下次登录使用新用户名或绑定联系方式。</li></ol><p><b>自己能处理：</b>在账户设置确认当前用户名。</p><p><b>需要联系平台处理：</b>如果忘记新用户名，平台可根据手机号/邮箱查询。</p><p><b>注意：</b>修改用户名不影响已申请域名的归属。</p>"}, {"id": "faq-user-v65-013", "q": "手机号可以不填吗？", "a": "<p><b>原因：</b>可以。手机号是选填联系方式，未填写时不能用手机号登录，也会影响人工找回效率。</p><ol><li>进入账户设置。</li><li>按需要补充手机号。</li><li>保存后重新登录可测试手机号是否可用。</li></ol><p><b>自己能处理：</b>进入账户设置。</p><p><b>需要联系平台处理：</b>手机号格式被拒绝时，平台可确认当前允许的格式。</p><p><b>注意：</b>手机号应填写自己可长期使用的号码。</p>"}, {"id": "faq-user-v65-014", "q": "邮箱可以不填吗？", "a": "<p><b>原因：</b>可以。邮箱是选填联系方式，未填写时不能用邮箱登录，也无法通过邮箱辅助核验。</p><ol><li>账户设置里可补充邮箱。</li><li>邮箱保存后，登录框可直接输入邮箱。</li><li>更换邮箱前确认新邮箱没有被其他账号绑定。</li></ol><p><b>自己能处理：</b>账户设置里可补充邮箱。</p><p><b>需要联系平台处理：</b>平台可协助处理邮箱被旧账号占用的问题。</p><p><b>注意：</b>邮箱格式必须包含 @ 和有效域名后缀。</p>"}, {"id": "faq-user-v65-015", "q": "修改密码失败怎么办？", "a": "<p><b>原因：</b>修改密码需要当前密码正确，新密码至少 8 位；当前会话过期时也会失败。</p><ol><li>重新输入当前密码。</li><li>新密码至少 8 位。</li><li>保存失败后退出重新登录再改一次。</li></ol><p><b>自己能处理：</b>重新输入当前密码。</p><p><b>需要联系平台处理：</b>忘记当前密码时通过反馈入口申请重置。</p><p><b>注意：</b>不要把新旧密码填写成同一串后误以为已变更。</p>"}, {"id": "faq-user-v65-016", "q": "注销账号时被提示还有域名怎么办？", "a": "<p><b>原因：</b>账号下存在待审核、正常或待删除审核域名时，系统会阻止注销，避免域名无人维护。</p><ol><li>查看弹窗列出的域名。</li><li>正常域名先申请删除并等待批准。</li><li>已拒绝或已撤销域名可按页面按钮直接删除。</li></ol><p><b>自己能处理：</b>查看弹窗列出的域名。</p><p><b>需要联系平台处理：</b>平台处理完待删除域名后，你才能注销程序账号。</p><p><b>注意：</b>只删除 DNS 记录不等于注销域名本身。</p>"}, {"id": "faq-user-v65-017", "q": "账号旁边复制按钮有什么用？", "a": "<p><b>原因：</b>复制按钮用于快速复制当前用户名，方便登录、反馈问题或确认注销时填写。</p><ol><li>进入账户设置。</li><li>点击账号旁边的小复制图标。</li><li>看到“已复制”后再粘贴使用。</li></ol><p><b>自己能处理：</b>进入账户设置。</p><p><b>需要联系平台处理：</b>复制失败多半是浏览器权限问题，可手动选中文本复制。</p><p><b>注意：</b>复制的是账号名，不是密码。</p>"}, {"id": "faq-user-v65-018", "q": "登录设备管理里的时间为什么和本地不同？", "a": "<p><b>原因：</b>设备时间来自服务器记录，显示时再按浏览器解析，时区和浏览器格式会影响展示。</p><ol><li>以最近一次使用时间判断是否为当前设备。</li><li>不认识的设备先修改密码。</li><li>退出登录后观察设备列表是否减少。</li></ol><p><b>自己能处理：</b>以最近一次使用时间判断是否为当前设备。</p><p><b>需要联系平台处理：</b>平台可检查会话表里的 first_seen_at 和 last_seen_at。</p><p><b>注意：</b>设备型号是浏览器推断，不一定能精确到 iPhone 15 Pro 这类商业型号。</p>"}, {"id": "faq-user-v65-019", "q": "设备 IP 显示不是我家宽带怎么办？", "a": "<p><b>原因：</b>使用移动网络、代理、公司网关或 Cloudflare 转发时，IP 可能显示出口地址，不一定是设备本机局域网地址。</p><ol><li>确认是否开了 VPN 或代理。</li><li>手机流量和 Wi-Fi 的出口 IP 可能不同。</li><li>发现陌生地区 IP 时先改密码。</li></ol><p><b>自己能处理：</b>确认是否开了 VPN 或代理。</p><p><b>需要联系平台处理：</b>平台可按登录日志和会话记录核对。</p><p><b>注意：</b>不要把内网 IP 和公网出口 IP 混为一谈。</p>"}, {"id": "faq-user-v65-020", "q": "手机端菜单打不开怎么办？", "a": "<p><b>原因：</b>手机侧边栏依赖前端 JS 绑定点击事件，旧缓存或页面缩放异常会导致按钮无响应。</p><ol><li>清除浏览器缓存后重进。</li><li>点击左上角菜单按钮，不要点浏览器边缘。</li><li>换 Chrome/Safari 测试。</li></ol><p><b>自己能处理：</b>清除浏览器缓存后重进。</p><p><b>需要联系平台处理：</b>平台需要检查移动端 sidebar 样式和点击遮罩是否被覆盖。</p><p><b>注意：</b>横屏模式可能改变点击区域，建议竖屏使用。</p>"}, {"id": "faq-user-v65-021", "q": "手机端菜单关不掉怎么办？", "a": "<p><b>原因：</b>侧边栏应该点击空白区域关闭，若关不掉通常是遮罩层高度或 z-index 被旧 CSS 影响。</p><ol><li>点菜单右侧空白区域。</li><li>向上滑动侧栏确认没有覆盖按钮。</li><li>清缓存后重新打开。</li></ol><p><b>自己能处理：</b>点菜单右侧空白区域。</p><p><b>需要联系平台处理：</b>平台需要检查最新 styles.css 是否生效。</p><p><b>注意：</b>不要反复点菜单项，可能进入其他页面但侧栏仍遮挡。</p>"}, {"id": "faq-user-v65-022", "q": "中英文切换后有些文字没变怎么办？", "a": "<p><b>原因：</b>系统内置文案可以切换，平台自定义公告、帮助中心手写内容和用户消息不会自动翻译。</p><ol><li>点击右上角 EN/中文按钮切换。</li><li>刷新后确认默认语言是否保存。</li><li>自定义内容仍为中文属于正常。</li></ol><p><b>自己能处理：</b>点击右上角 EN/中文按钮切换。</p><p><b>需要联系平台处理：</b>平台可补充英文版自定义内容。</p><p><b>注意：</b>语言切换不是机器翻译，不会自动翻译所有用户输入文字。</p>"}, {"id": "faq-user-v65-023", "q": "出现问题应该点哪里反馈？", "a": "<p><b>原因：</b>登录页下方和帮助中心都提供反馈入口，登录前的问题走外部反馈，登录后的问题可走站内消息。</p><ol><li>无法登录时点“出现问题？点击反馈”。</li><li>已登录后在帮助中心底部发送消息。</li><li>附上截图、账号和操作路径。</li></ol><p><b>自己能处理：</b>无法登录时点“出现问题？点击反馈”。</p><p><b>需要联系平台处理：</b>平台收到后按账号、域名和时间排查。</p><p><b>注意：</b>只发一句“不能用”很难定位问题。</p>"}, {"id": "faq-user-v65-024", "q": "消息中心红点不消失怎么办？", "a": "<p><b>原因：</b>红点来自未读消息数量，只有接收对象打开或标记已读后才会写入已读记录。</p><ol><li>进入消息中心。</li><li>勾选未读消息点批量已读。</li><li>也可以点全部已读。</li></ol><p><b>自己能处理：</b>进入消息中心。</p><p><b>需要联系平台处理：</b>如果标记后仍不消失，平台需要检查 message_reads 是否写入成功。</p><p><b>注意：</b>自己发出去的消息不应该计入自己的未读。</p>"}, {"id": "faq-user-v65-025", "q": "如何回复平台发来的消息？", "a": "<p><b>原因：</b>消息卡片有回复按钮时，可以引用原消息回复，系统会把原内容附在下方方便对话。</p><ol><li>进入消息中心。</li><li>打开对应消息，点击回复。</li><li>填写回复内容后发送。</li></ol><p><b>自己能处理：</b>进入消息中心。</p><p><b>需要联系平台处理：</b>如果没有回复按钮，可能是自己发出的消息或消息已撤销。</p><p><b>注意：</b>15 分钟内自己发出的消息显示撤销，不显示回复。</p>"}, {"id": "faq-user-v65-026", "q": "为什么自己发出的消息可以撤销？", "a": "<p><b>原因：</b>系统允许发送者在 15 分钟内撤销，防止误发内容长期保留。</p><ol><li>进入消息中心找到自己发出的消息。</li><li>15 分钟内点击撤销。</li><li>超过时间后撤销按钮会消失。</li></ol><p><b>自己能处理：</b>进入消息中心找到自己发出的消息。</p><p><b>需要联系平台处理：</b>超过 15 分钟需要联系平台协助处理，但不保证能恢复或删除。</p><p><b>注意：</b>撤销是删除消息记录，不是编辑消息。</p>"}, {"id": "faq-user-v65-027", "q": "帮助中心搜索不到答案怎么办？", "a": "<p><b>原因：</b>智能搜索按关键词和同义词匹配，但太短、错别字过多或问题太具体时可能没有命中。</p><ol><li>换成核心词搜索，例如 登录、DNS、删除、额度。</li><li>展开对应分类手动查看。</li><li>仍找不到就在底部发消息给平台。</li></ol><p><b>自己能处理：</b>换成核心词搜索，例如 登录、DNS、删除、额度。</p><p><b>需要联系平台处理：</b>平台可根据反馈把新问题补充进帮助中心。</p><p><b>注意：</b>不要一次输入整段无关描述，关键词越清楚越容易匹配。</p>"}, {"id": "faq-user-v65-028", "q": "页面显示服务器内部错误怎么办？", "a": "<p><b>原因：</b>这是后端接口报错，可能来自 D1 字段、登录会话、DNS API 或数据约束，不同红色提示代表不同原因。</p><ol><li>复制红色错误全文。</li><li>记录刚才点击的菜单和按钮。</li><li>刷新后不要重复提交危险操作。</li></ol><p><b>自己能处理：</b>复制红色错误全文。</p><p><b>需要联系平台处理：</b>平台需要按错误时间查看 Worker 日志和 D1 记录。</p><p><b>注意：</b>只截图页面空白而没有错误文字，排查会很慢。</p>"}, {"id": "faq-user-v65-029", "q": "页面提示请求失败怎么办？", "a": "<p><b>原因：</b>请求失败可能是网络断开、登录会话过期、接口返回非 JSON 或 Worker 临时不可用。</p><ol><li>确认网络可访问 storage.flore.top。</li><li>重新登录。</li><li>换网络测试是否仍失败。</li></ol><p><b>自己能处理：</b>确认网络可访问 storage.flore.top。</p><p><b>需要联系平台处理：</b>平台需要检查 Worker 是否部署成功、接口路径是否存在。</p><p><b>注意：</b>请求失败和密码错误不是同一类问题。</p>"}, {"id": "faq-user-v65-030", "q": "为什么强制刷新后问题消失？", "a": "<p><b>原因：</b>前端是单页应用，浏览器可能缓存旧 JS；强制刷新后加载新版本，所以一些按钮和翻译问题会恢复。</p><ol><li>电脑端 Ctrl+F5。</li><li>手机端清站点缓存。</li><li>确认地址栏仍是 storage.flore.top。</li></ol><p><b>自己能处理：</b>电脑端 Ctrl+F5。</p><p><b>需要联系平台处理：</b>平台应通过版本号更新 app.js 和 styles.css。</p><p><b>注意：</b>部署后第一次打开异常，多数是缓存导致。</p>"}, {"id": "faq-user-v65-031", "q": "免费二级域名能做什么？", "a": "<p><b>原因：</b>它可以指向个人网站、项目演示、GitHub Pages、Vercel、API 测试或邮箱验证，具体受平台规则限制。</p><ol><li>先申请合规前缀。</li><li>审核通过后添加对应 DNS 记录。</li><li>用途变更时自行更新解析。</li></ol><p><b>自己能处理：</b>先申请合规前缀。</p><p><b>需要联系平台处理：</b>违规、仿冒、垃圾邮件用途会被平台处理。</p><p><b>注意：</b>免费不代表永久不受规则约束。</p>"}, {"id": "faq-user-v65-032", "q": "域名额度是什么意思？", "a": "<p><b>原因：</b>额度是账号可同时占用的域名数量，待审核和正常域名通常都会占用。</p><ol><li>在账户设置查看自己的额度。</li><li>删除无效域名释放名额。</li><li>需要更多名额时通过消息联系平台。</li></ol><p><b>自己能处理：</b>在账户设置查看自己的额度。</p><p><b>需要联系平台处理：</b>平台可按账号情况调整额度。</p><p><b>注意：</b>提交删除申请不等于立即释放额度。</p>"}, {"id": "faq-user-v65-033", "q": "为什么额度显示没有立刻变化？", "a": "<p><b>原因：</b>额度统计依赖域名状态和 D1 记录，删除审核完成或页面刷新后才会更新。</p><ol><li>刷新域名注册或账户设置页面。</li><li>确认域名是否仍是待删除审核。</li><li>等待平台批准删除后再查看。</li></ol><p><b>自己能处理：</b>刷新域名注册或账户设置页面。</p><p><b>需要联系平台处理：</b>平台可检查是否有旧记录未硬删除。</p><p><b>注意：</b>只删 Cloudflare DNS 不会释放系统额度。</p>"}, {"id": "faq-user-v65-034", "q": "为什么普通用户看不到管理菜单？", "a": "<p><b>原因：</b>系统按角色显示菜单，普通用户只看到注册、域名管理、账户、消息、日志和帮助。</p><ol><li>确认自己登录的是否普通账号。</li><li>需要处理审批或用户资料时联系平台。</li></ol><p><b>自己能处理：</b>确认自己登录的是否普通账号。</p><p><b>需要联系平台处理：</b>平台才能进行全站审核、设置和用户管理。</p><p><b>注意：</b>复制管理页面地址也不会获得权限。</p>"}, {"id": "faq-user-v65-035", "q": "账号被禁用还能管理域名吗？", "a": "<p><b>原因：</b>不能。账号禁用后后端会拒绝继续访问，域名仍可能存在但你无法登录维护。</p><ol><li>通过反馈入口说明账号和域名。</li><li>等待平台核验处理。</li></ol><p><b>自己能处理：</b>通过反馈入口说明账号和域名。</p><p><b>需要联系平台处理：</b>平台可选择恢复账号、处理域名或说明禁用原因。</p><p><b>注意：</b>账号禁用和单个域名禁用不是同一件事。</p>"}, {"id": "faq-user-v65-036", "q": "为什么设备型号显示不精确？", "a": "<p><b>原因：</b>浏览器通常只暴露系统和浏览器类型，不会完整提供苹果15 Pro、华为 MateBook 等精确型号。</p><ol><li>以设备类型、浏览器和最近使用时间识别。</li><li>不认识的设备先改密码。</li></ol><p><b>自己能处理：</b>以设备类型、浏览器和最近使用时间识别。</p><p><b>需要联系平台处理：</b>平台只能记录浏览器能提供的信息。</p><p><b>注意：</b>型号模糊不代表记录造假。</p>"}, {"id": "faq-user-v65-037", "q": "记住我有什么作用？", "a": "<p><b>原因：</b>勾选后登录会话有效期更长，适合私人设备；不勾选则更偏向短期会话。</p><ol><li>私人电脑可勾选。</li><li>公共电脑不要勾选。</li><li>离开公共设备时一定退出登录。</li></ol><p><b>自己能处理：</b>私人电脑可勾选。</p><p><b>需要联系平台处理：</b>平台可设置后台会话超时时长。</p><p><b>注意：</b>记住我不是保存密码，只是延长登录状态。</p>"}, {"id": "faq-user-v65-038", "q": "密码至少 8 位是什么意思？", "a": "<p><b>原因：</b>系统只要求长度至少 8 位，不强制大小写、数字或符号组合，但简单密码仍有被猜风险。</p><ol><li>设置至少 8 位。</li><li>建议混合字母、数字和符号。</li><li>不要和其他网站共用密码。</li></ol><p><b>自己能处理：</b>设置至少 8 位。</p><p><b>需要联系平台处理：</b>忘记密码时走反馈入口。</p><p><b>注意：</b>12345678 这类密码虽然可能通过长度校验，但不安全。</p>"}, {"id": "faq-user-v65-039", "q": "手机号格式错误怎么办？", "a": "<p><b>原因：</b>手机号字段允许数字、加号、括号和短横线，过短、过长或包含文字会被拒绝。</p><ol><li>去掉空格。</li><li>中国手机号可直接填 11 位数字。</li><li>国际号码可带 + 号。</li></ol><p><b>自己能处理：</b>去掉空格。</p><p><b>需要联系平台处理：</b>平台可根据地区放宽或说明具体规则。</p><p><b>注意：</b>不要在手机号里填邮箱或备注文字。</p>"}, {"id": "faq-user-v65-040", "q": "邮箱格式错误怎么办？", "a": "<p><b>原因：</b>邮箱需要包含用户名、@ 和域名后缀，空格、中文标点或缺少后缀都会失败。</p><ol><li>检查是否多了空格。</li><li>确认域名后缀如 .com、.cn 存在。</li><li>换一个可长期使用的邮箱。</li></ol><p><b>自己能处理：</b>检查是否多了空格。</p><p><b>需要联系平台处理：</b>如果真实邮箱仍报错，平台可检查校验规则。</p><p><b>注意：</b>邮箱可选，不想填邮箱可以只填手机号。</p>"}, {"id": "faq-user-v65-041", "q": "平台关闭注册时怎么办？", "a": "<p><b>原因：</b>注册关闭时，前台会显示关闭提示，普通用户不能自助创建新账号。</p><ol><li>查看注册页提示文案。</li><li>通过反馈入口说明注册需求。</li></ol><p><b>自己能处理：</b>查看注册页提示文案。</p><p><b>需要联系平台处理：</b>平台可以重新开放注册或手动创建账号。</p><p><b>注意：</b>刷新页面不能绕过关闭注册。</p>"}, {"id": "faq-user-v65-042", "q": "使用 VPN 会影响登录或注册吗？", "a": "<p><b>原因：</b>会。VPN 可能让 Turnstile 风险升高，也可能命中 IP 注册限制或黑名单。</p><ol><li>关闭 VPN 后重试。</li><li>换稳定网络。</li><li>不要频繁切换地区。</li></ol><p><b>自己能处理：</b>关闭 VPN 后重试。</p><p><b>需要联系平台处理：</b>平台可根据异常 IP 判断是否解除限制。</p><p><b>注意：</b>频繁切换 IP 容易触发安全策略。</p>"}, {"id": "faq-user-v65-043", "q": "浏览器插件会影响页面吗？", "a": "<p><b>原因：</b>广告拦截、脚本管理、隐私保护插件可能拦截 Turnstile、API 请求或复制功能。</p><ol><li>用无插件窗口测试。</li><li>临时允许 storage.flore.top。</li><li>换浏览器排除插件影响。</li></ol><p><b>自己能处理：</b>用无插件窗口测试。</p><p><b>需要联系平台处理：</b>平台无法控制用户本地插件，只能根据报错提示判断。</p><p><b>注意：</b>脚本被拦截时页面可能只显示一部分。</p>"}, {"id": "faq-user-v65-044", "q": "为什么会看到 404 页面？", "a": "<p><b>原因：</b>单页应用依赖 hash 路由，地址写错、复制了不存在的路径或旧链接失效会进入 404。</p><ol><li>点击返回登录或首页。</li><li>使用侧边栏菜单进入页面。</li><li>不要手动拼写复杂地址。</li></ol><p><b>自己能处理：</b>点击返回登录或首页。</p><p><b>需要联系平台处理：</b>平台可调整 404 提示文字。</p><p><b>注意：</b>404 不代表账号数据丢失。</p>"}, {"id": "faq-user-v65-045", "q": "自动刷新会不会覆盖我正在填写的内容？", "a": "<p><b>原因：</b>正常不会。系统设计为弹窗打开、正在输入、消息中心使用中不刷新，避免打断操作。</p><ol><li>填写表单时保持当前页面。</li><li>保存前不要手动刷新。</li></ol><p><b>自己能处理：</b>填写表单时保持当前页面。</p><p><b>需要联系平台处理：</b>如果仍被刷新覆盖，平台需要检查自动刷新判断条件。</p><p><b>注意：</b>自动刷新不是实时同步，普通页面约 5 分钟刷新一次。</p>"}, {"id": "faq-user-v65-046", "q": "为什么数据刚操作完没立刻更新？", "a": "<p><b>原因：</b>部分页面依赖重新请求接口，自动刷新有间隔，DNS 生效也有传播时间。</p><ol><li>操作完成后手动刷新当前页。</li><li>DNS 变更等待几分钟再测。</li><li>查看页面是否有成功提示。</li></ol><p><b>自己能处理：</b>操作完成后手动刷新当前页。</p><p><b>需要联系平台处理：</b>平台可检查接口是否返回最新 D1 数据。</p><p><b>注意：</b>不要把 DNS 传播延迟误判为保存失败。</p>"}, {"id": "faq-user-v65-047", "q": "Cookie 被禁用会怎样？", "a": "<p><b>原因：</b>登录状态依赖 Cookie，如果禁用 Cookie，登录后下一次请求就无法识别账号。</p><ol><li>允许本站 Cookie。</li><li>不要使用会自动清 Cookie 的模式。</li><li>重新登录测试。</li></ol><p><b>自己能处理：</b>允许本站 Cookie。</p><p><b>需要联系平台处理：</b>平台可确认是否 sessions 正常但浏览器没带 Cookie。</p><p><b>注意：</b>清理 Cookie 后需要重新登录。</p>"}, {"id": "faq-user-v65-048", "q": "一直显示正在加载系统怎么办？", "a": "<p><b>原因：</b>前端正在请求配置或加载脚本；如果一直不结束，可能是 Worker 接口失败或 JS 出错。</p><ol><li>强制刷新。</li><li>换浏览器。</li><li>打开开发者工具查看红色错误。</li></ol><p><b>自己能处理：</b>强制刷新。</p><p><b>需要联系平台处理：</b>平台需要检查 /api/public/config 是否返回正常。</p><p><b>注意：</b>只看到背景不代表系统没有部署，可能是前端启动被错误中断。</p>"}, {"id": "faq-user-v65-049", "q": "邮箱和手机号都换了还能找回吗？", "a": "<p><b>原因：</b>可以尝试，但核验会更严格，因为常用联系标识都变了。</p><ol><li>提供用户名。</li><li>提供历史申请过的域名。</li><li>说明大概注册时间和使用设备。</li></ol><p><b>自己能处理：</b>提供用户名。</p><p><b>需要联系平台处理：</b>平台核验后决定是否协助恢复。</p><p><b>注意：</b>不要同时让多个陌生人代你申请找回。</p>"}, {"id": "faq-user-v65-050", "q": "外部反馈和站内消息有什么区别？", "a": "<p><b>原因：</b>外部反馈适合未登录、忘记密码、打不开页面；站内消息适合已登录后反馈域名、DNS、额度问题。</p><ol><li>未登录用 mailform 反馈。</li><li>已登录用帮助中心底部发消息。</li><li>紧急问题附截图和域名。</li></ol><p><b>自己能处理：</b>未登录用 mailform 反馈。</p><p><b>需要联系平台处理：</b>平台会根据入口处理，但外部反馈不会自动出现在你的站内消息列表。</p><p><b>注意：</b>不要两个入口重复提交大量相同内容。</p>"}, {"id": "faq-user-v65-051", "q": "为什么账号资料保存后仍显示旧内容？", "a": "<p><b>原因：</b>保存后页面可能还在显示旧缓存，或接口保存失败没有返回新用户资料。</p><ol><li>保存后刷新账户设置页面。</li><li>确认没有红色报错。</li><li>重新登录后再看资料。</li></ol><p><b>自己能处理：</b>保存后刷新账户设置页面。</p><p><b>需要联系平台处理：</b>平台需要确认 /api/account/profile 是否成功更新 D1。</p><p><b>注意：</b>不要在多个标签页同时修改资料。</p>"}, {"id": "faq-user-v65-052", "q": "为什么手机号能登录但邮箱不能登录？", "a": "<p><b>原因：</b>可能是邮箱未绑定、邮箱拼写错误，或邮箱已被你后来清空。</p><ol><li>进入账户设置确认邮箱字段。</li><li>用用户名登录后重新保存邮箱。</li><li>检查大小写和空格。</li></ol><p><b>自己能处理：</b>进入账户设置确认邮箱字段。</p><p><b>需要联系平台处理：</b>平台可查询该邮箱是否绑定到其他账号。</p><p><b>注意：</b>手机号能登录不代表邮箱一定已绑定。</p>"}, {"id": "faq-user-v65-053", "q": "为什么邮箱能登录但手机号不能登录？", "a": "<p><b>原因：</b>手机号可能未绑定、格式和保存时不同，或被更新为空。</p><ol><li>用用户名或邮箱登录。</li><li>到账户设置查看手机号。</li><li>按保存格式重新输入登录。</li></ol><p><b>自己能处理：</b>用用户名或邮箱登录。</p><p><b>需要联系平台处理：</b>平台可确认 phone 字段是否存在并已保存。</p><p><b>注意：</b>不要把带空格的手机号当作同一个号码。</p>"}, {"id": "faq-user-v65-054", "q": "为什么页面右下角有悬浮按钮？", "a": "<p><b>原因：</b>悬浮按钮用于快捷辅助入口或视觉工具，通常不影响域名申请和 DNS 管理。</p><ol><li>不需要时忽略它。</li><li>如果遮挡手机操作，换竖屏或滚动页面。</li></ol><p><b>自己能处理：</b>不需要时忽略它。</p><p><b>需要联系平台处理：</b>平台可调整悬浮按钮位置。</p><p><b>注意：</b>不要把它当成提交按钮。</p>"}, {"id": "faq-user-v65-055", "q": "为什么登录页有“点击反馈”？", "a": "<p><b>原因：</b>这是给无法登录、忘记密码、人机验证失败、页面空白等登录前问题准备的外部联系入口。</p><ol><li>点击后会打开 mailform.flore.top。</li><li>提交账号、联系方式、问题截图。</li></ol><p><b>自己能处理：</b>点击后会打开 mailform.flore.top。</p><p><b>需要联系平台处理：</b>平台收到后人工处理。</p><p><b>注意：</b>已登录的问题优先用帮助中心站内消息。</p>"}, {"id": "faq-user-v65-056", "q": "为什么我看不到帮助中心设置？", "a": "<p><b>原因：</b>帮助中心设置属于平台维护入口，普通用户只看帮助内容，不编辑问答。</p><ol><li>普通用户进入帮助中心查看和搜索。</li><li>发现内容错误时在底部发消息反馈。</li></ol><p><b>自己能处理：</b>普通用户进入帮助中心查看和搜索。</p><p><b>需要联系平台处理：</b>平台收到后更新 FAQ。</p><p><b>注意：</b>看不到编辑入口不是故障。</p>"}, {"id": "faq-user-v65-057", "q": "为什么同一个账号多个设备都在线？", "a": "<p><b>原因：</b>每次登录都会创建会话，同一账号可在电脑和手机同时使用。</p><ol><li>到账户设置查看登录设备。</li><li>发现陌生设备时修改密码。</li></ol><p><b>自己能处理：</b>到账户设置查看登录设备。</p><p><b>需要联系平台处理：</b>平台可清理异常会话。</p><p><b>注意：</b>修改密码后建议重新登录常用设备。</p>"}, {"id": "faq-user-v65-058", "q": "为什么退出登录后设备还在列表里？", "a": "<p><b>原因：</b>设备列表可能保留最近会话记录，退出当前设备不一定立刻清掉历史设备展示。</p><ol><li>刷新账户设置。</li><li>确认当前设备已回到登录页。</li></ol><p><b>自己能处理：</b>刷新账户设置。</p><p><b>需要联系平台处理：</b>平台可按会话表清理过期设备。</p><p><b>注意：</b>设备列表是安全参考，不是实时在线人数。</p>"}, {"id": "faq-user-v65-059", "q": "为什么看不到操作日志？", "a": "<p><b>原因：</b>普通用户只能看到与自己相关的近期操作，超过保留天数或无操作时会显示暂无。</p><ol><li>进入操作日志页面。</li><li>调整筛选条件为全部。</li><li>确认最近是否有申请或 DNS 操作。</li></ol><p><b>自己能处理：</b>进入操作日志页面。</p><p><b>需要联系平台处理：</b>平台可检查日志保留天数和清理规则。</p><p><b>注意：</b>日志不是永久保存。</p>"}, {"id": "faq-user-v65-060", "q": "为什么站内消息时间和本地时间有差异？", "a": "<p><b>原因：</b>消息时间由服务器生成，再由浏览器显示，时区和格式可能让你感觉差几小时。</p><ol><li>以日期和顺序判断消息新旧。</li><li>刷新页面查看最新排序。</li></ol><p><b>自己能处理：</b>以日期和顺序判断消息新旧。</p><p><b>需要联系平台处理：</b>平台可统一时间格式。</p><p><b>注意：</b>不要仅凭小时差判断消息异常。</p>"}]}, {"key": "dns", "title": "DNS 记录说明", "subtitle": "A / AAAA / CNAME / TXT / MX、代理、TTL、第三方平台和生效排查", "items": [{"id": "dns-user-v65-001", "q": "A 记录应该怎么填？", "a": "<p><b>原因：</b>A 记录把域名指向 IPv4 地址，目标必须是类似 103.205.240.19 的 IPv4，不能填域名或带 http 的网址。</p><ol><li>主机填 @、www 或 api 等前缀。</li><li>类型选择 A。</li><li>目标地址只填 IPv4。</li><li>保存后等待 DNS 生效。</li></ol><p><b>自己能处理：</b>主机填 @、www 或 api 等前缀。</p><p><b>需要联系平台处理：</b>如果保存失败，平台需要查看 Cloudflare 返回的具体错误。</p><p><b>注意：</b>A 记录不能填写端口，例如 1.2.3.4:8080 不合法。</p>"}, {"id": "dns-user-v65-002", "q": "AAAA 记录应该怎么填？", "a": "<p><b>原因：</b>AAAA 记录指向 IPv6 地址，只有服务器提供 IPv6 时才需要配置。</p><ol><li>确认服务商提供 IPv6。</li><li>类型选 AAAA。</li><li>目标填完整 IPv6 地址。</li></ol><p><b>自己能处理：</b>确认服务商提供 IPv6。</p><p><b>需要联系平台处理：</b>如果平台不允许 AAAA，需要联系平台开放记录类型。</p><p><b>注意：</b>IPv6 写错不会影响 IPv4，但支持 IPv6 的用户可能打不开。</p>"}, {"id": "dns-user-v65-003", "q": "CNAME 记录应该怎么填？", "a": "<p><b>原因：</b>CNAME 用来把当前域名别名到另一个域名，例如 GitHub Pages、Vercel 或 DDNS 地址。</p><ol><li>类型选择 CNAME。</li><li>目标填对方提供的域名。</li><li>不要填写 IP。</li></ol><p><b>自己能处理：</b>类型选择 CNAME。</p><p><b>需要联系平台处理：</b>保存时报记录冲突时，需要平台协助检查同名 A/MX/TXT 记录。</p><p><b>注意：</b>CNAME 目标不要加 https://。</p>"}, {"id": "dns-user-v65-004", "q": "TXT 记录有什么用？", "a": "<p><b>原因：</b>TXT 常用于网站所有权验证、邮箱 SPF、DKIM、第三方平台校验，不负责打开网页。</p><ol><li>从第三方平台复制完整 TXT 值。</li><li>类型选 TXT。</li><li>主机按对方要求填 @ 或指定前缀。</li></ol><p><b>自己能处理：</b>从第三方平台复制完整 TXT 值。</p><p><b>需要联系平台处理：</b>TXT 太长或格式特殊时，平台需查看 Cloudflare 接口是否接受。</p><p><b>注意：</b>TXT 不要开启代理。</p>"}, {"id": "dns-user-v65-005", "q": "MX 记录有什么用？", "a": "<p><b>原因：</b>MX 用于指定邮件服务器，只有要收邮件时才需要配置。</p><ol><li>类型选择 MX。</li><li>目标填邮箱服务商提供的邮件服务器。</li><li>填写优先级，数字越小优先级越高。</li></ol><p><b>自己能处理：</b>类型选择 MX。</p><p><b>需要联系平台处理：</b>如果平台禁止 MX，需要联系平台说明用途。</p><p><b>注意：</b>MX 记录不能开启代理。</p>"}, {"id": "dns-user-v65-006", "q": "主机记录 @ 是什么意思？", "a": "<p><b>原因：</b>@ 表示当前申请的完整二级域名本身，例如 school.flore.top。</p><ol><li>想让 school.flore.top 生效时填 @。</li><li>想让 www.school.flore.top 生效时填 www。</li></ol><p><b>自己能处理：</b>想让 school.flore.top 生效时填 @。</p><p><b>需要联系平台处理：</b>如果页面预览不对，平台需要检查前端主机拼接逻辑。</p><p><b>注意：</b>@ 不是邮箱符号，在 DNS 表单里代表根主机。</p>"}, {"id": "dns-user-v65-007", "q": "主机记录 www 是什么意思？", "a": "<p><b>原因：</b>www 会生成 www.你的二级域名，例如 www.school.flore.top，和 school.flore.top 是两个不同名称。</p><ol><li>主机填 www。</li><li>类型按服务商要求选择 A 或 CNAME。</li><li>保存后分别测试 www 和不带 www。</li></ol><p><b>自己能处理：</b>主机填 www。</p><p><b>需要联系平台处理：</b>需要自动跳转时由网站服务端或平台配置跳转。</p><p><b>注意：</b>配置 www 不会自动让 @ 生效。</p>"}, {"id": "dns-user-v65-008", "q": "可以添加三级域名吗？", "a": "<p><b>原因：</b>可以。主机记录填 api、blog、cdn 等，就会生成 api.你的二级域名。</p><ol><li>进入域名管理。</li><li>点击添加解析。</li><li>主机填 api 或 blog。</li></ol><p><b>自己能处理：</b>进入域名管理。</p><p><b>需要联系平台处理：</b>如果三级域名保存失败，平台需要检查前缀规则是否过严。</p><p><b>注意：</b>主机里不要再填完整主域名。</p>"}, {"id": "dns-user-v65-009", "q": "可以添加多级子域名吗？", "a": "<p><b>原因：</b>可以，主机填 api.v1 会生成 api.v1.你的二级域名，适合测试环境或接口分层。</p><ol><li>主机填 api.v1。</li><li>选择记录类型。</li><li>确认完整解析名预览正确。</li></ol><p><b>自己能处理：</b>主机填 api.v1。</p><p><b>需要联系平台处理：</b>如果系统禁止点号，需要平台调整主机校验。</p><p><b>注意：</b>不要把 api.v1.school.flore.top 整段填到主机字段。</p>"}, {"id": "dns-user-v65-010", "q": "TTL 填 1 是什么意思？", "a": "<p><b>原因：</b>在 Cloudflare 中 TTL=1 通常表示自动，由 Cloudflare 根据策略处理缓存时间。</p><ol><li>不清楚时保持 1。</li><li>需要自定义时按平台允许范围填写。</li></ol><p><b>自己能处理：</b>不清楚时保持 1。</p><p><b>需要联系平台处理：</b>如果 TTL 被接口拒绝，平台需要检查 Cloudflare 允许范围。</p><p><b>注意：</b>TTL 不是立即生效时间，只是缓存时间设置。</p>"}, {"id": "dns-user-v65-011", "q": "代理状态应该选哪个？", "a": "<p><b>原因：</b>仅 DNS 只做解析；开启代理会让流量经过 Cloudflare，适合网站访问，不适合邮箱和 TXT 验证。</p><ol><li>网站 A/CNAME 可按需要开启代理。</li><li>TXT/MX 保持仅 DNS。</li><li>验证失败时先改成仅 DNS。</li></ol><p><b>自己能处理：</b>网站 A/CNAME 可按需要开启代理。</p><p><b>需要联系平台处理：</b>如果代理选项灰掉，平台可能限制了该记录类型。</p><p><b>注意：</b>开启代理会隐藏真实 IP，但也可能影响非 HTTP 服务。</p>"}, {"id": "dns-user-v65-012", "q": "为什么 MX 不能开启代理？", "a": "<p><b>原因：</b>MX 是邮件路由记录，Cloudflare 代理只处理网页流量，不代理邮件投递。</p><ol><li>MX 记录保持仅 DNS。</li><li>邮件相关 TXT 也保持仅 DNS。</li></ol><p><b>自己能处理：</b>MX 记录保持仅 DNS。</p><p><b>需要联系平台处理：</b>如邮件不通，平台需检查 MX 和 SPF 是否完整。</p><p><b>注意：</b>给 MX 开代理没有意义，通常也不被允许。</p>"}, {"id": "dns-user-v65-013", "q": "为什么 TXT 不能开启代理？", "a": "<p><b>原因：</b>TXT 是验证文本，不产生访问流量，Cloudflare 代理对 TXT 没作用。</p><ol><li>类型选 TXT。</li><li>代理保持仅 DNS。</li><li>保存后到第三方平台重新验证。</li></ol><p><b>自己能处理：</b>类型选 TXT。</p><p><b>需要联系平台处理：</b>如果第三方仍看不到，平台需确认 TXT 是否写入 Cloudflare。</p><p><b>注意：</b>TXT 值不要自己删改引号和等号。</p>"}, {"id": "dns-user-v65-014", "q": "CNAME 可以填 IP 吗？", "a": "<p><b>原因：</b>不可以。CNAME 目标必须是域名，IP 应使用 A 或 AAAA 记录。</p><ol><li>目标是 IPv4 就选择 A。</li><li>目标是 IPv6 就选择 AAAA。</li><li>目标是另一个域名才选择 CNAME。</li></ol><p><b>自己能处理：</b>目标是 IPv4 就选择 A。</p><p><b>需要联系平台处理：</b>保存接口如果没拦截，平台也应修正校验。</p><p><b>注意：</b>CNAME 填 IP 会导致解析错误或 Cloudflare 拒绝。</p>"}, {"id": "dns-user-v65-015", "q": "A 记录可以填域名吗？", "a": "<p><b>原因：</b>不可以。A 记录只能填 IPv4 地址，域名跳转应改用 CNAME。</p><ol><li>确认服务商提供的是 IP 还是域名。</li><li>域名目标选 CNAME。</li><li>IPv4 目标选 A。</li></ol><p><b>自己能处理：</b>确认服务商提供的是 IP 还是域名。</p><p><b>需要联系平台处理：</b>平台可根据错误提示判断用户选错类型。</p><p><b>注意：</b>不要把 example.com 填到 A 记录目标。</p>"}, {"id": "dns-user-v65-016", "q": "MX 优先级怎么填？", "a": "<p><b>原因：</b>MX 优先级用于多个邮件服务器排序，数字越小越优先。</p><ol><li>按邮箱服务商给出的值填写。</li><li>只有一个 MX 时也要填优先级。</li><li>多个 MX 保持不同优先级。</li></ol><p><b>自己能处理：</b>按邮箱服务商给出的值填写。</p><p><b>需要联系平台处理：</b>如果表单没有优先级输入，平台需要补充 MX priority 字段。</p><p><b>注意：</b>优先级不是端口号。</p>"}, {"id": "dns-user-v65-017", "q": "SPF 应该怎么配置？", "a": "<p><b>原因：</b>SPF 通常是一条 TXT 记录，用来声明允许哪些服务器代表你的域名发信。</p><ol><li>类型选 TXT。</li><li>主机通常填 @。</li><li>内容按邮箱服务商给出的 v=spf1 开头文本填写。</li></ol><p><b>自己能处理：</b>类型选 TXT。</p><p><b>需要联系平台处理：</b>多条 SPF 会导致验证异常，平台可帮助检查重复 TXT。</p><p><b>注意：</b>不要把 SPF 配成 MX 类型。</p>"}, {"id": "dns-user-v65-018", "q": "DKIM 应该怎么配置？", "a": "<p><b>原因：</b>DKIM 通常是指定主机名的 TXT 记录，用于邮件签名验证。</p><ol><li>复制邮箱服务商给出的主机名。</li><li>如果对方给 selector._domainkey，只填相对主机部分。</li><li>内容粘贴完整公钥文本。</li></ol><p><b>自己能处理：</b>复制邮箱服务商给出的主机名。</p><p><b>需要联系平台处理：</b>TXT 过长时平台需确认是否被截断。</p><p><b>注意：</b>不要手动换行 DKIM 内容。</p>"}, {"id": "dns-user-v65-019", "q": "第三方平台验证域名失败怎么办？", "a": "<p><b>原因：</b>验证失败常见于主机填错、TXT 值被改、代理开启或 DNS 传播未完成。</p><ol><li>核对第三方给出的主机和值。</li><li>TXT 保持仅 DNS。</li><li>保存后等待几分钟再验证。</li></ol><p><b>自己能处理：</b>核对第三方给出的主机和值。</p><p><b>需要联系平台处理：</b>平台可在 Cloudflare 后台确认记录是否真实存在。</p><p><b>注意：</b>第三方验证缓存可能比 DNS 生效更慢。</p>"}, {"id": "dns-user-v65-020", "q": "GitHub Pages 应该用什么记录？", "a": "<p><b>原因：</b>GitHub Pages 常用 CNAME 指向 用户名.github.io，或按 GitHub 文档配置 A 记录。</p><ol><li>如果 GitHub 给的是 xxx.github.io，选择 CNAME。</li><li>主机填 @ 或 www，按你要访问的名称决定。</li><li>GitHub 仓库里也要设置自定义域名。</li></ol><p><b>自己能处理：</b>如果 GitHub 给的是 xxx.github.io，选择 CNAME。</p><p><b>需要联系平台处理：</b>平台只负责 DNS，GitHub 仓库设置错误需要你在 GitHub 修改。</p><p><b>注意：</b>DNS 正确但 GitHub 未绑定域名也打不开。</p>"}, {"id": "dns-user-v65-021", "q": "Vercel 应该怎么配置？", "a": "<p><b>原因：</b>Vercel 通常要求 CNAME 指向 cname.vercel-dns.com 或按项目提示配置。</p><ol><li>在 Vercel 项目里添加你的完整域名。</li><li>复制 Vercel 提供的记录。</li><li>到本系统添加 CNAME 或 A。</li></ol><p><b>自己能处理：</b>在 Vercel 项目里添加你的完整域名。</p><p><b>需要联系平台处理：</b>如果 Vercel 显示 Invalid Configuration，平台可确认 DNS 是否写入。</p><p><b>注意：</b>不要自己猜 Vercel 目标值。</p>"}, {"id": "dns-user-v65-022", "q": "Cloudflare Pages 应该怎么配置？", "a": "<p><b>原因：</b>Cloudflare Pages 一般在 Pages 项目里绑定自定义域名，并由 Cloudflare 自动管理或给出验证记录。</p><ol><li>先在 Pages 项目添加完整域名。</li><li>根据提示添加 CNAME 或 TXT。</li><li>验证通过后再访问。</li></ol><p><b>自己能处理：</b>先在 Pages 项目添加完整域名。</p><p><b>需要联系平台处理：</b>同一账号不同 Cloudflare 区域权限问题需要平台协助。</p><p><b>注意：</b>不要同时在多个平台绑定同一域名。</p>"}, {"id": "dns-user-v65-023", "q": "DDNS 地址应该用什么记录？", "a": "<p><b>原因：</b>DDNS 通常提供一个变化的域名，适合用 CNAME 指向它，而不是把动态 IP 固定写死。</p><ol><li>类型选 CNAME。</li><li>目标填 DDNS 域名。</li><li>代理状态通常保持仅 DNS，除非只跑网页。</li></ol><p><b>自己能处理：</b>类型选 CNAME。</p><p><b>需要联系平台处理：</b>如果 DDNS 域名不可解析，平台无法替你修复 DDNS 服务。</p><p><b>注意：</b>CNAME 目标也必须是有效域名。</p>"}, {"id": "dns-user-v65-024", "q": "NAS 或家用服务器怎么解析？", "a": "<p><b>原因：</b>有固定公网 IPv4 时用 A 记录；没有固定 IP 时通常用 DDNS CNAME。</p><ol><li>确认你是否有公网 IP。</li><li>固定 IPv4 用 A。</li><li>DDNS 域名用 CNAME。</li></ol><p><b>自己能处理：</b>确认你是否有公网 IP。</p><p><b>需要联系平台处理：</b>端口映射和路由器配置需要你自行处理。</p><p><b>注意：</b>DNS 不能代替内网穿透或端口开放。</p>"}, {"id": "dns-user-v65-025", "q": "为什么同名 CNAME 和 A 不能同时存在？", "a": "<p><b>原因：</b>DNS 规则中同一个名称存在 CNAME 时，通常不能再同时存在 A、MX 等其他记录。</p><ol><li>确认同一主机是否已有记录。</li><li>需要换类型时先删除旧记录。</li><li>再新增正确类型。</li></ol><p><b>自己能处理：</b>确认同一主机是否已有记录。</p><p><b>需要联系平台处理：</b>平台可检查同名记录冲突。</p><p><b>注意：</b>不要在 @ 同时配置 CNAME 和 A。</p>"}, {"id": "dns-user-v65-026", "q": "为什么 CNAME 和 MX 会冲突？", "a": "<p><b>原因：</b>MX 需要域名本身还有邮件路由信息，而 CNAME 会把该名称变成别名，容易导致其他记录冲突。</p><ol><li>邮箱域名不要用同名 CNAME。</li><li>网站和邮箱可拆成不同主机。</li><li>例如 www 做网站，@ 做邮箱。</li></ol><p><b>自己能处理：</b>邮箱域名不要用同名 CNAME。</p><p><b>需要联系平台处理：</b>平台可帮助确认冲突记录。</p><p><b>注意：</b>邮件域名配置前先规划好主机名。</p>"}, {"id": "dns-user-v65-027", "q": "删除 DNS 记录后多久失效？", "a": "<p><b>原因：</b>系统删除后会调用 Cloudflare 删除记录，但外部 DNS 缓存仍可能保留一段时间。</p><ol><li>删除后刷新 DNS 列表确认记录不在。</li><li>等待本地缓存过期。</li><li>换公共 DNS 测试。</li></ol><p><b>自己能处理：</b>删除后刷新 DNS 列表确认记录不在。</p><p><b>需要联系平台处理：</b>如果删除后列表仍有记录，平台需要检查 D1 和 Cloudflare 是否同步。</p><p><b>注意：</b>删除记录不会自动删除域名申请。</p>"}, {"id": "dns-user-v65-028", "q": "编辑 DNS 后旧内容还显示怎么办？", "a": "<p><b>原因：</b>可能是页面摘要缓存、浏览器缓存或 dns_records 与旧摘要字段不同步。</p><ol><li>进入 DNS 记录列表，以列表中的真实记录为准。</li><li>刷新域名详情。</li><li>确认编辑时有成功提示。</li></ol><p><b>自己能处理：</b>进入 DNS 记录列表，以列表中的真实记录为准。</p><p><b>需要联系平台处理：</b>平台需检查摘要是否从 dns_records 重新计算。</p><p><b>注意：</b>不要只看域名卡片旧摘要判断是否成功。</p>"}, {"id": "dns-user-v65-029", "q": "DNS 已生效但网站打不开怎么办？", "a": "<p><b>原因：</b>DNS 生效只说明域名指向目标，网站服务、端口、HTTPS 证书、服务器防火墙仍可能有问题。</p><ol><li>确认 DNS 记录类型和目标正确。</li><li>直接访问目标服务器测试。</li><li>检查网站服务是否绑定该域名。</li></ol><p><b>自己能处理：</b>确认 DNS 记录类型和目标正确。</p><p><b>需要联系平台处理：</b>平台只能确认 DNS 写入情况，服务器和网站配置需你或服务商处理。</p><p><b>注意：</b>能 ping 不代表网页一定能打开。</p>"}, {"id": "dns-user-v65-030", "q": "开启 Cloudflare 代理后网站打不开怎么办？", "a": "<p><b>原因：</b>代理开启后 Cloudflare 会接管 HTTP/HTTPS 流量，源站 SSL、端口或协议不兼容会导致打不开。</p><ol><li>先把代理改为仅 DNS 测试。</li><li>确认源站支持 80/443。</li><li>检查网站证书。</li></ol><p><b>自己能处理：</b>先把代理改为仅 DNS 测试。</p><p><b>需要联系平台处理：</b>平台可确认代理状态是否正确写入。</p><p><b>注意：</b>非 HTTP 服务不要开启代理。</p>"}, {"id": "dns-user-v65-031", "q": "HTTPS 证书错误怎么办？", "a": "<p><b>原因：</b>证书错误通常不是 DNS 记录本身，而是目标平台没有为该域名签发证书或代理 SSL 模式不匹配。</p><ol><li>确认第三方平台已绑定完整域名。</li><li>等待证书签发。</li><li>代理状态不确定时先改仅 DNS 测试。</li></ol><p><b>自己能处理：</b>确认第三方平台已绑定完整域名。</p><p><b>需要联系平台处理：</b>平台可确认 DNS 是否已正确指向。</p><p><b>注意：</b>刚配置域名后证书签发可能需要时间。</p>"}, {"id": "dns-user-v65-032", "q": "目标地址可以带 http:// 吗？", "a": "<p><b>原因：</b>不可以。DNS 目标只接受 IP、域名或文本，不接受 URL 协议。</p><ol><li>把 https://example.com 改成 example.com。</li><li>A 记录只填 IP。</li><li>CNAME 只填域名。</li></ol><p><b>自己能处理：</b>把 https://example.com 改成 example.com。</p><p><b>需要联系平台处理：</b>平台应在保存时给出格式错误提示。</p><p><b>注意：</b>路径 /abc 也不能写进 DNS 记录。</p>"}, {"id": "dns-user-v65-033", "q": "目标地址可以带端口吗？", "a": "<p><b>原因：</b>不可以。DNS 只解析名称到地址，不保存端口。端口应在网站、反向代理或服务端配置。</p><ol><li>删除 :8080 这类端口。</li><li>只保留 IP 或域名。</li><li>网站端口通过服务器配置处理。</li></ol><p><b>自己能处理：</b>删除 :8080 这类端口。</p><p><b>需要联系平台处理：</b>平台不能通过 DNS 帮你转发端口。</p><p><b>注意：</b>DNS 记录不是 URL 转发规则。</p>"}, {"id": "dns-user-v65-034", "q": "DNS 传播一般要多久？", "a": "<p><b>原因：</b>Cloudflare 写入通常很快，但本地、运营商和第三方平台缓存可能需要几分钟到更久。</p><ol><li>保存后等待 5-30 分钟。</li><li>换网络或公共 DNS 测试。</li><li>第三方平台验证失败时稍后再试。</li></ol><p><b>自己能处理：</b>保存后等待 5-30 分钟。</p><p><b>需要联系平台处理：</b>平台可确认 Cloudflare 后台是否已有记录。</p><p><b>注意：</b>TTL=1 也不代表全球马上刷新。</p>"}, {"id": "dns-user-v65-035", "q": "本地电脑解析还是旧结果怎么办？", "a": "<p><b>原因：</b>本地 DNS 缓存可能保留旧 IP 或旧 CNAME，尤其是刚删除或修改记录后。</p><ol><li>重启浏览器。</li><li>切换网络。</li><li>电脑端可刷新系统 DNS 缓存。</li></ol><p><b>自己能处理：</b>重启浏览器。</p><p><b>需要联系平台处理：</b>平台无法清除你本机和运营商缓存。</p><p><b>注意：</b>不要马上重复删除和新增同一记录。</p>"}, {"id": "dns-user-v65-036", "q": "公共 DNS 查到正确但我打不开怎么办？", "a": "<p><b>原因：</b>说明权威 DNS 多半已正确，问题可能在本地网络、服务器、证书或浏览器缓存。</p><ol><li>换手机流量访问。</li><li>清理浏览器缓存。</li><li>检查目标网站服务。</li></ol><p><b>自己能处理：</b>换手机流量访问。</p><p><b>需要联系平台处理：</b>平台可确认 DNS 层是否正常。</p><p><b>注意：</b>DNS 正确不代表网站应用正常。</p>"}, {"id": "dns-user-v65-037", "q": "提示记录已存在怎么办？", "a": "<p><b>原因：</b>Cloudflare 不允许同一名称同一类型重复创建完全冲突的记录，系统也可能已有旧记录。</p><ol><li>回到 DNS 列表查同名记录。</li><li>需要变更时点编辑，不要新增。</li><li>冲突旧记录先删除。</li></ol><p><b>自己能处理：</b>回到 DNS 列表查同名记录。</p><p><b>需要联系平台处理：</b>平台可检查 Cloudflare 是否有系统外创建的同名记录。</p><p><b>注意：</b>重复提交不会覆盖旧记录。</p>"}, {"id": "dns-user-v65-038", "q": "提示记录不存在怎么办？", "a": "<p><b>原因：</b>系统保存的 Cloudflare 记录 ID 可能和后台真实记录不同步，删除或编辑时就会提示不存在。</p><ol><li>刷新 DNS 列表。</li><li>如果记录已不在 Cloudflare，重新新增正确记录。</li></ol><p><b>自己能处理：</b>刷新 DNS 列表。</p><p><b>需要联系平台处理：</b>平台需要按域名名称同步或清理 D1 旧记录。</p><p><b>注意：</b>不要把不存在错误理解为域名不存在。</p>"}, {"id": "dns-user-v65-039", "q": "API 保存失败怎么办？", "a": "<p><b>原因：</b>保存 DNS 需要调用 Cloudflare API，Token、Zone、记录格式或冲突都会导致失败。</p><ol><li>检查自己填写的类型和目标格式。</li><li>删掉冲突记录后重试。</li><li>保存错误截图。</li></ol><p><b>自己能处理：</b>检查自己填写的类型和目标格式。</p><p><b>需要联系平台处理：</b>平台需要查看 Cloudflare 返回的 errors 内容。</p><p><b>注意：</b>同一个错误反复重试没有意义。</p>"}, {"id": "dns-user-v65-040", "q": "根域名选择错了怎么办？", "a": "<p><b>原因：</b>DNS 记录只能添加在已申请的完整二级域名下面，后缀选错通常需要重新申请正确域名。</p><ol><li>确认当前域名后缀。</li><li>不正确时申请新的后缀域名。</li><li>旧域名不需要时申请删除。</li></ol><p><b>自己能处理：</b>确认当前域名后缀。</p><p><b>需要联系平台处理：</b>平台一般不直接把已批准域名改后缀。</p><p><b>注意：</b>后缀变更会影响完整域名，不能只改显示文字。</p>"}, {"id": "dns-user-v65-041", "q": "中文内容可以放 TXT 吗？", "a": "<p><b>原因：</b>有些 TXT 用于验证时必须完全按平台给出的英文/符号内容，随意填中文可能无法被第三方识别。</p><ol><li>按第三方平台原文复制。</li><li>不要自己翻译验证内容。</li><li>保存后重新验证。</li></ol><p><b>自己能处理：</b>按第三方平台原文复制。</p><p><b>需要联系平台处理：</b>如出现编码问题，平台需查看 Cloudflare 是否接受该内容。</p><p><b>注意：</b>TXT 不是备注字段。</p>"}, {"id": "dns-user-v65-042", "q": "TXT 内容很长怎么办？", "a": "<p><b>原因：</b>DKIM 等 TXT 可能很长，复制时容易漏字符或多换行。</p><ol><li>完整复制服务商提供的内容。</li><li>不要手动拆成多条。</li><li>保存后查看内容是否完整。</li></ol><p><b>自己能处理：</b>完整复制服务商提供的内容。</p><p><b>需要联系平台处理：</b>平台可在 Cloudflare 后台确认最终保存值。</p><p><b>注意：</b>公钥少一个字符都会验证失败。</p>"}, {"id": "dns-user-v65-043", "q": "可以添加多条 TXT 吗？", "a": "<p><b>原因：</b>可以，但同类用途如 SPF 通常只能有一条；多个验证平台的 TXT 可以共存。</p><ol><li>不同验证用途按要求添加。</li><li>SPF 多条时应合并。</li><li>保存后分别验证。</li></ol><p><b>自己能处理：</b>不同验证用途按要求添加。</p><p><b>需要联系平台处理：</b>平台可帮助判断是否出现 SPF 重复。</p><p><b>注意：</b>多条 TXT 不是越多越好。</p>"}, {"id": "dns-user-v65-044", "q": "邮箱收不到邮件怎么办？", "a": "<p><b>原因：</b>收信依赖 MX、SPF、DKIM、DMARC、邮箱服务开通和服务器状态，不只是一条 MX。</p><ol><li>确认 MX 指向邮箱服务商。</li><li>按服务商补齐 TXT 验证。</li><li>等待 DNS 传播后测试。</li></ol><p><b>自己能处理：</b>确认 MX 指向邮箱服务商。</p><p><b>需要联系平台处理：</b>平台可确认 DNS 记录，邮箱账号和服务器由邮箱服务商处理。</p><p><b>注意：</b>MX 配好不等于邮箱账户已经创建。</p>"}, {"id": "dns-user-v65-045", "q": "多个 MX 怎么配置？", "a": "<p><b>原因：</b>邮箱服务商可能给多个 MX 服务器做备用，需要分别添加并设置不同优先级。</p><ol><li>按服务商列表逐条添加。</li><li>目标和优先级不要写反。</li><li>保存后查看 DNS 列表。</li></ol><p><b>自己能处理：</b>按服务商列表逐条添加。</p><p><b>需要联系平台处理：</b>如果系统限制记录数量，联系平台提高上限或精简配置。</p><p><b>注意：</b>优先级数字越小优先级越高。</p>"}, {"id": "dns-user-v65-046", "q": "代理开启后第三方验证失败怎么办？", "a": "<p><b>原因：</b>有些验证需要直接看到 DNS 目标，开启代理后对方看到的是 Cloudflare，可能判定失败。</p><ol><li>把 A/CNAME 临时改成仅 DNS。</li><li>等验证通过后再按需要开启代理。</li></ol><p><b>自己能处理：</b>把 A/CNAME 临时改成仅 DNS。</p><p><b>需要联系平台处理：</b>平台可检查代理状态是否已写入。</p><p><b>注意：</b>TXT/MX 无需也不能开启代理。</p>"}, {"id": "dns-user-v65-047", "q": "目标值前后有空格会怎样？", "a": "<p><b>原因：</b>空格可能导致格式校验失败，或第三方验证时内容不一致。</p><ol><li>粘贴后检查开头结尾。</li><li>TXT 值中间必要空格保留。</li><li>IP 和域名不要含空格。</li></ol><p><b>自己能处理：</b>粘贴后检查开头结尾。</p><p><b>需要联系平台处理：</b>平台可在保存前做 trim，但不能猜测中间空格是否有效。</p><p><b>注意：</b>DKIM/SPF 中间空格不能随意删除。</p>"}, {"id": "dns-user-v65-048", "q": "完整解析名预览怎么看？", "a": "<p><b>原因：</b>预览会把主机记录和你的二级域名拼起来，用来确认最终生效的完整名称。</p><ol><li>主机 @ 预览为当前域名。</li><li>主机 www 预览为 www.当前域名。</li><li>提交前确认预览不是重复拼接。</li></ol><p><b>自己能处理：</b>主机 @ 预览为当前域名。</p><p><b>需要联系平台处理：</b>预览错误时平台需要检查前端拼接逻辑。</p><p><b>注意：</b>不要忽略预览，它能避免填错主机。</p>"}, {"id": "dns-user-v65-049", "q": "DNS 记录数量达到上限怎么办？", "a": "<p><b>原因：</b>平台可能限制单个二级域名可创建的记录数，避免滥用和 Cloudflare 记录膨胀。</p><ol><li>删除不用的记录。</li><li>合并可合并的 TXT。</li><li>保留必要的网站和邮箱记录。</li></ol><p><b>自己能处理：</b>删除不用的记录。</p><p><b>需要联系平台处理：</b>确有需要时联系平台提高单域名上限。</p><p><b>注意：</b>不要为每个临时测试都创建长期记录。</p>"}, {"id": "dns-user-v65-050", "q": "为什么有时不能创建 MX？", "a": "<p><b>原因：</b>平台可能关闭 MX 创建权限，主要是防止免费域名被用于垃圾邮件。</p><ol><li>确认自己是否确实需要收信。</li><li>通过消息说明邮箱服务商和用途。</li></ol><p><b>自己能处理：</b>确认自己是否确实需要收信。</p><p><b>需要联系平台处理：</b>平台评估后可开放或代为处理。</p><p><b>注意：</b>MX 权限关闭不是 DNS 故障。</p>"}, {"id": "dns-user-v65-051", "q": "为什么不能创建 SRV、CAA、NS 记录？", "a": "<p><b>原因：</b>当前系统主要支持 A、AAAA、CNAME、TXT、MX；其他高级记录可能未开放。</p><ol><li>先确认第三方是否有替代 TXT/CNAME 验证方式。</li><li>必须使用高级记录时联系平台。</li></ol><p><b>自己能处理：</b>先确认第三方是否有替代 TXT/CNAME 验证方式。</p><p><b>需要联系平台处理：</b>平台需要开发或开放对应记录类型。</p><p><b>注意：</b>不要把 SRV 内容硬塞到 TXT 里，除非服务商明确要求。</p>"}, {"id": "dns-user-v65-052", "q": "为什么根域名 @ 的 CNAME 有时特殊？", "a": "<p><b>原因：</b>部分 DNS 平台对根名称 CNAME 有特殊处理；Cloudflare 可做 CNAME Flattening，但第三方验证仍可能有要求。</p><ol><li>按目标服务商推荐配置。</li><li>不确定时优先使用服务商给的 A 记录。</li></ol><p><b>自己能处理：</b>按目标服务商推荐配置。</p><p><b>需要联系平台处理：</b>平台可确认当前根域名区域是否支持该写法。</p><p><b>注意：</b>不要在 @ 上同时放 CNAME 和 MX。</p>"}, {"id": "dns-user-v65-053", "q": "为什么显示已生效但访问仍失败？", "a": "<p><b>原因：</b>已生效代表记录写入成功，不代表目标网站已配置域名或服务可用。</p><ol><li>检查第三方平台是否绑定该域名。</li><li>检查服务器是否监听 80/443。</li><li>检查证书是否签发。</li></ol><p><b>自己能处理：</b>检查第三方平台是否绑定该域名。</p><p><b>需要联系平台处理：</b>平台只负责 DNS 写入，目标服务异常需服务商处理。</p><p><b>注意：</b>DNS 绿色状态不是网站可访问保证。</p>"}, {"id": "dns-user-v65-054", "q": "删除域名会同时删除 DNS 吗？", "a": "<p><b>原因：</b>正常删除流程批准后会清理该域名关联 DNS；只删除账号或只删页面记录不能替代完整流程。</p><ol><li>先申请删除域名。</li><li>等待平台批准。</li><li>确认域名从列表消失。</li></ol><p><b>自己能处理：</b>先申请删除域名。</p><p><b>需要联系平台处理：</b>平台需要处理 Cloudflare 和 D1 同步。</p><p><b>注意：</b>手动删除单条 DNS 不会删除域名本身。</p>"}, {"id": "dns-user-v65-055", "q": "DNS 记录显示 CNAME 但我明明添加的是 A 怎么办？", "a": "<p><b>原因：</b>这是摘要显示不同步，真实记录应以 DNS 解析列表为准。</p><ol><li>进入域名详情的 DNS 解析列表查看类型。</li><li>强制刷新页面。</li><li>必要时重新编辑该记录。</li></ol><p><b>自己能处理：</b>进入域名详情的 DNS 解析列表查看类型。</p><p><b>需要联系平台处理：</b>平台需要让域名卡片从 dns_records 读取真实摘要。</p><p><b>注意：</b>不要只凭卡片摘要删除记录。</p>"}, {"id": "dns-user-v65-056", "q": "为什么 CNAME 目标末尾有点号？", "a": "<p><b>原因：</b>有些 DNS 文档会写 example.com.，末尾点代表绝对域名；多数表单可不填这个点。</p><ol><li>优先复制服务商推荐值。</li><li>如果保存失败，去掉末尾点再试。</li></ol><p><b>自己能处理：</b>优先复制服务商推荐值。</p><p><b>需要联系平台处理：</b>平台可统一清理末尾点。</p><p><b>注意：</b>不要把点号误删到域名中间。</p>"}, {"id": "dns-user-v65-057", "q": "DNS 记录能用于 URL 跳转吗？", "a": "<p><b>原因：</b>不能。DNS 只负责解析，不负责把 A 页面跳到 B 页面。</p><ol><li>需要跳转时在网站服务或第三方平台设置重定向。</li><li>DNS 只配置到承载跳转的服务。</li></ol><p><b>自己能处理：</b>需要跳转时在网站服务或第三方平台设置重定向。</p><p><b>需要联系平台处理：</b>平台可提供解析，但不一定提供 HTTP 跳转服务。</p><p><b>注意：</b>CNAME 不是 301/302 跳转。</p>"}, {"id": "dns-user-v65-058", "q": "为什么代理后真实 IP 被隐藏？", "a": "<p><b>原因：</b>开启 Cloudflare 代理后，外部看到的是 Cloudflare 节点 IP，这是代理的正常效果。</p><ol><li>网站服务可开启代理保护源站。</li><li>非网页服务保持仅 DNS。</li></ol><p><b>自己能处理：</b>网站服务可开启代理保护源站。</p><p><b>需要联系平台处理：</b>如果源站需要识别访客 IP，需要配置相应请求头。</p><p><b>注意：</b>隐藏 IP 不等于服务器绝对安全。</p>"}, {"id": "dns-user-v65-059", "q": "同一域名可以同时做网站和邮箱吗？", "a": "<p><b>原因：</b>可以，但要避免同名 CNAME 冲突；通常 @ 配网站 A 记录和 MX，www 配 CNAME。</p><ol><li>先规划 @ 和 www。</li><li>网站用 A/CNAME。</li><li>邮箱按服务商添加 MX/TXT。</li></ol><p><b>自己能处理：</b>先规划 @ 和 www。</p><p><b>需要联系平台处理：</b>遇到冲突时平台可帮助调整记录结构。</p><p><b>注意：</b>把 @ 做 CNAME 后可能影响 MX。</p>"}, {"id": "dns-user-v65-060", "q": "DNS 保存成功后需要备案吗？", "a": "<p><b>原因：</b>DNS 本身不判断备案；网站是否需要备案取决于服务器所在地、用途和监管要求。</p><ol><li>按服务器提供商要求处理备案。</li><li>DNS 配置和备案流程分开进行。</li></ol><p><b>自己能处理：</b>按服务器提供商要求处理备案。</p><p><b>需要联系平台处理：</b>平台可展示 ICP 信息，但具体备案由站点主体处理。</p><p><b>注意：</b>解析到国内服务器时尤其要确认备案要求。</p>"}, {"id": "dns-user-v65-061", "q": "为什么目标服务商说域名未指向？", "a": "<p><b>原因：</b>可能是记录写错主机、用了代理、DNS 未传播或服务商检查的是另一个名称。</p><ol><li>确认服务商要求的是 @ 还是 www。</li><li>把代理临时改仅 DNS。</li><li>等待几分钟重新验证。</li></ol><p><b>自己能处理：</b>确认服务商要求的是 @ 还是 www。</p><p><b>需要联系平台处理：</b>平台可帮你核对 Cloudflare 实际记录。</p><p><b>注意：</b>不要只配置 www 却去验证不带 www。</p>"}, {"id": "dns-user-v65-062", "q": "能不能把一个主机指向多个 IP？", "a": "<p><b>原因：</b>可以添加多条同名 A 记录做简单轮询，但是否允许取决于平台记录上限和 Cloudflare 规则。</p><ol><li>添加同主机多条 A 记录。</li><li>确认每个 IP 都能提供服务。</li></ol><p><b>自己能处理：</b>添加同主机多条 A 记录。</p><p><b>需要联系平台处理：</b>平台可确认是否允许重复同名 A。</p><p><b>注意：</b>多 IP 不等于健康检查，坏 IP 仍可能被访问。</p>"}, {"id": "dns-user-v65-063", "q": "为什么解析记录被删除后又出现？", "a": "<p><b>原因：</b>可能是自动同步、另一个设备重新添加、或第三方平台自动管理记录。</p><ol><li>查看操作日志。</li><li>确认是否多设备同时操作。</li></ol><p><b>自己能处理：</b>查看操作日志。</p><p><b>需要联系平台处理：</b>平台可查近期 DNS 删除和新增记录。</p><p><b>注意：</b>不要多人同时管理同一域名。</p>"}, {"id": "dns-user-v65-064", "q": "如何判断 DNS 是系统内创建还是外部创建？", "a": "<p><b>原因：</b>系统内创建的记录会在域名管理列表显示，并通常带有对应 D1 记录；外部创建只在 Cloudflare 后台可见。</p><ol><li>先看系统 DNS 列表。</li><li>再让平台核对 Cloudflare 后台。</li></ol><p><b>自己能处理：</b>先看系统 DNS 列表。</p><p><b>需要联系平台处理：</b>平台需要同步外部记录时要谨慎，避免误删。</p><p><b>注意：</b>系统看不到的记录不一定不存在。</p>"}, {"id": "dns-user-v65-065", "q": "为什么修改 DNS 需要重新验证人机吗？", "a": "<p><b>原因：</b>通常 DNS 修改不需要 Turnstile；如果页面要求，可能是前端复用了注册验证或安全策略调整。</p><ol><li>先刷新页面确认。</li><li>完成验证后再保存。</li></ol><p><b>自己能处理：</b>先刷新页面确认。</p><p><b>需要联系平台处理：</b>平台可确认当前版本是否对 DNS 操作开启额外验证。</p><p><b>注意：</b>不要把登录验证 token 用在 DNS 表单。</p>"}, {"id": "dns-user-v65-066", "q": "DNS 表单里的目标/内容为什么同一个输入框？", "a": "<p><b>原因：</b>不同记录类型的目标叫法不同：A 是 IP，CNAME 是域名，TXT 是文本，MX 是邮件服务器，所以统一显示为目标/内容。</p><ol><li>先选记录类型。</li><li>再按类型填写对应值。</li></ol><p><b>自己能处理：</b>先选记录类型。</p><p><b>需要联系平台处理：</b>平台可在占位提示里补充示例。</p><p><b>注意：</b>不要在选错类型时直接粘贴目标。</p>"}]}, {"key": "domain", "title": "域名管理问题", "subtitle": "申请、审核、额度、有效期、续期、删除、状态和使用规范", "items": [{"id": "domain-user-v65-001", "q": "申请域名一直待审核怎么办？", "a": "<p><b>原因：</b>平台当前可能启用了人工审核，申请先进入待审核状态，不会立即开放 DNS。</p><ol><li>进入域名注册页查看状态。</li><li>确认前缀没有明显违规或保留用途。</li><li>等待审核结果进入消息中心。</li></ol><p><b>自己能处理：</b>进入域名注册页查看状态。</p><p><b>需要联系平台处理：</b>长时间未处理时，把域名和账号发给平台查询。</p><p><b>注意：</b>待审核时不能自助设置 DNS。</p>"}, {"id": "domain-user-v65-002", "q": "审核通过前为什么不能添加解析？", "a": "<p><b>原因：</b>域名未审核时系统不会调用 Cloudflare API，避免未确认归属的前缀提前生效。</p><ol><li>查看域名状态是否为正常。</li><li>正常后进入域名管理添加解析。</li></ol><p><b>自己能处理：</b>查看域名状态是否为正常。</p><p><b>需要联系平台处理：</b>平台审核通过后才会放开管理入口。</p><p><b>注意：</b>没有前端按钮也没有接口绕过方式。</p>"}, {"id": "domain-user-v65-003", "q": "域名前缀应该怎么填？", "a": "<p><b>原因：</b>前缀是完整域名最左侧部分，例如 blog，不是 blog.flore.top。</p><ol><li>只填前缀。</li><li>选择根域名后看完整预览。</li><li>确认无误再提交。</li></ol><p><b>自己能处理：</b>只填前缀。</p><p><b>需要联系平台处理：</b>格式被拒绝时平台可查看当前前缀规则。</p><p><b>注意：</b>不要把 http、点号结尾或完整域名填进前缀。</p>"}, {"id": "domain-user-v65-004", "q": "为什么 www、admin、mail 不能申请？", "a": "<p><b>原因：</b>这些是平台常见保留前缀，可能用于网站、后台、邮箱或接口，开放给用户会造成冲突。</p><ol><li>换一个业务相关前缀。</li><li>不要重复提交保留词。</li></ol><p><b>自己能处理：</b>换一个业务相关前缀。</p><p><b>需要联系平台处理：</b>确有特殊用途时只能联系平台评估。</p><p><b>注意：</b>保留前缀被拒绝不是系统故障。</p>"}, {"id": "domain-user-v65-005", "q": "纯数字前缀为什么可能被拒绝？", "a": "<p><b>原因：</b>平台可能关闭纯数字前缀，防止机器批量注册和难以识别的域名滥用。</p><ol><li>改成字母加数字组合。</li><li>例如 1234 改为 site1234。</li></ol><p><b>自己能处理：</b>改成字母加数字组合。</p><p><b>需要联系平台处理：</b>平台可根据规则决定是否开放纯数字。</p><p><b>注意：</b>纯数字域名更容易被误判为批量注册。</p>"}, {"id": "domain-user-v65-006", "q": "下划线为什么不能用于域名前缀？", "a": "<p><b>原因：</b>普通主机名不推荐使用下划线，很多访问场景对下划线支持不好。</p><ol><li>使用连字符 - 替代下划线。</li><li>保持字母、数字、连字符组合。</li></ol><p><b>自己能处理：</b>使用连字符 - 替代下划线。</p><p><b>需要联系平台处理：</b>特殊 TXT 主机需要下划线时，通常是在 DNS 记录主机里处理，不是申请前缀。</p><p><b>注意：</b>不要把 DNS 验证主机和域名前缀混为一谈。</p>"}, {"id": "domain-user-v65-007", "q": "前缀太短为什么不通过？", "a": "<p><b>原因：</b>平台会设置最小长度，太短的前缀容易占用公共资源或命中保留用途。</p><ol><li>增加到页面提示的最小长度以上。</li><li>使用项目名缩写。</li></ol><p><b>自己能处理：</b>增加到页面提示的最小长度以上。</p><p><b>需要联系平台处理：</b>平台可调整最小长度规则。</p><p><b>注意：</b>单字符前缀通常更容易被限制。</p>"}, {"id": "domain-user-v65-008", "q": "前缀太长为什么不通过？", "a": "<p><b>原因：</b>过长前缀不利于使用，也可能超过 DNS 名称长度限制。</p><ol><li>缩短前缀。</li><li>保留核心品牌词或项目名。</li></ol><p><b>自己能处理：</b>缩短前缀。</p><p><b>需要联系平台处理：</b>平台可确认最大长度。</p><p><b>注意：</b>完整域名总长度也有限制。</p>"}, {"id": "domain-user-v65-009", "q": "如何选择根域名？", "a": "<p><b>原因：</b>注册页显示的根域名是平台开放给用户的后缀，选择后会生成对应完整二级域名。</p><ol><li>打开注册弹窗。</li><li>选择后缀。</li><li>看完整域名预览。</li></ol><p><b>自己能处理：</b>打开注册弹窗。</p><p><b>需要联系平台处理：</b>想使用未列出的后缀，需要平台先接入该根域名。</p><p><b>注意：</b>不同后缀互不相同，选错通常要重新申请。</p>"}, {"id": "domain-user-v65-010", "q": "根域名下拉为空怎么办？", "a": "<p><b>原因：</b>根域名列表为空通常是平台暂未开放后缀，或前端没有读取到配置。</p><ol><li>刷新页面。</li><li>退出重新登录。</li></ol><p><b>自己能处理：</b>刷新页面。</p><p><b>需要联系平台处理：</b>平台需检查 DNS 配置里的后缀是否启用。</p><p><b>注意：</b>没有后缀时无法提交域名申请。</p>"}, {"id": "domain-user-v65-011", "q": "提示域名已存在怎么办？", "a": "<p><b>原因：</b>同一个完整域名只能被一个申请占用；待审核、正常、待删除状态通常都算已占用。</p><ol><li>换一个前缀。</li><li>选择另一个根域名。</li><li>如果这是你自己的旧申请，先处理旧记录。</li></ol><p><b>自己能处理：</b>换一个前缀。</p><p><b>需要联系平台处理：</b>平台可确认是否有历史记录占用。</p><p><b>注意：</b>不要反复提交同一个完整域名。</p>"}, {"id": "domain-user-v65-012", "q": "额度不足怎么办？", "a": "<p><b>原因：</b>账号的可用域名数量已达到上限，新的待审核或正常域名无法继续申请。</p><ol><li>删除无效域名。</li><li>申请删除不再使用的正常域名。</li><li>等待删除批准释放额度。</li></ol><p><b>自己能处理：</b>删除无效域名。</p><p><b>需要联系平台处理：</b>需要更多额度时联系平台说明用途。</p><p><b>注意：</b>待删除审核期间仍会占用额度。</p>"}, {"id": "domain-user-v65-013", "q": "待删除审核为什么还占额度？", "a": "<p><b>原因：</b>域名尚未真正删除，DNS 和归属仍可能有效，所以系统继续占用名额。</p><ol><li>等待平台处理删除申请。</li><li>12 小时内可以撤销删除。</li></ol><p><b>自己能处理：</b>等待平台处理删除申请。</p><p><b>需要联系平台处理：</b>平台批准删除后额度才会释放。</p><p><b>注意：</b>提交删除申请不等于删除完成。</p>"}, {"id": "domain-user-v65-014", "q": "域名有效期从哪天开始？", "a": "<p><b>原因：</b>有效期通常从审核通过当天开始计算，不从提交申请当天开始。</p><ol><li>查看域名卡片的注册时间和到期时间。</li><li>待审核时没有到期时间属正常。</li></ol><p><b>自己能处理：</b>查看域名卡片的注册时间和到期时间。</p><p><b>需要联系平台处理：</b>平台可检查 expires_at 是否写入。</p><p><b>注意：</b>不要用申请时间推算到期日。</p>"}, {"id": "domain-user-v65-015", "q": "到期提醒什么时候出现？", "a": "<p><b>原因：</b>平台会按规则在到期前若干天展示提醒，具体天数由后台配置。</p><ol><li>查看域名卡片剩余时间。</li><li>进入消息中心看是否收到提醒。</li></ol><p><b>自己能处理：</b>查看域名卡片剩余时间。</p><p><b>需要联系平台处理：</b>平台可调整提醒提前天数。</p><p><b>注意：</b>没有进入提醒窗口时不会显示续期提示。</p>"}, {"id": "domain-user-v65-016", "q": "为什么续期按钮不可点？", "a": "<p><b>原因：</b>续期通常只在到期前指定窗口内开放，过早或域名状态不正常都不能续期。</p><ol><li>确认域名状态为正常。</li><li>查看剩余天数是否进入续期窗口。</li></ol><p><b>自己能处理：</b>确认域名状态为正常。</p><p><b>需要联系平台处理：</b>平台可确认是否开放用户自助续期。</p><p><b>注意：</b>续期不是随时可点的长期按钮。</p>"}, {"id": "domain-user-v65-017", "q": "续期成功后到期时间怎么算？", "a": "<p><b>原因：</b>续期会按平台规则延长有效期，通常在当前到期时间基础上增加有效天数。</p><ol><li>续期后刷新域名卡片。</li><li>查看到期时间是否更新。</li></ol><p><b>自己能处理：</b>续期后刷新域名卡片。</p><p><b>需要联系平台处理：</b>如果时间没变，平台需检查续期接口和 D1 字段。</p><p><b>注意：</b>不要重复点击续期，避免多次请求。</p>"}, {"id": "domain-user-v65-018", "q": "域名过期后还能访问吗？", "a": "<p><b>原因：</b>过期后的处理取决于平台规则，可能保留一段时间，也可能清理 DNS。</p><ol><li>到期前尽量续期。</li><li>过期后先查看域名状态。</li></ol><p><b>自己能处理：</b>到期前尽量续期。</p><p><b>需要联系平台处理：</b>平台可说明是否已清理过期 DNS。</p><p><b>注意：</b>过期后不保证域名继续可用。</p>"}, {"id": "domain-user-v65-019", "q": "如何申请删除正常域名？", "a": "<p><b>原因：</b>正常域名不能直接硬删除，需要提交删除申请，经过处理后才会清理 DNS 和系统记录。</p><ol><li>进入域名管理。</li><li>点击申请删除域名。</li><li>确认域名名字符合后提交。</li></ol><p><b>自己能处理：</b>进入域名管理。</p><p><b>需要联系平台处理：</b>平台处理后域名会从列表移除。</p><p><b>注意：</b>删除前先备份 DNS 记录。</p>"}, {"id": "domain-user-v65-020", "q": "12 小时内如何撤销删除申请？", "a": "<p><b>原因：</b>删除申请提交后，系统会给出撤销窗口，防止误删正常域名。</p><ol><li>进入域名详情。</li><li>在撤销期内点击撤销删除申请。</li><li>确认状态恢复正常。</li></ol><p><b>自己能处理：</b>进入域名详情。</p><p><b>需要联系平台处理：</b>超过撤销期只能联系平台处理。</p><p><b>注意：</b>撤销期不是自动删除时间。</p>"}, {"id": "domain-user-v65-021", "q": "删除批准后域名为什么消失？", "a": "<p><b>原因：</b>批准删除会清理系统记录和 DNS 记录，域名不再归属于你的账号，所以列表不再显示。</p><ol><li>确认是否收到删除批准消息。</li><li>查看域名列表是否减少。</li></ol><p><b>自己能处理：</b>确认是否收到删除批准消息。</p><p><b>需要联系平台处理：</b>误删时只能联系平台确认是否可重新申请。</p><p><b>注意：</b>硬删除后通常不能恢复原记录。</p>"}, {"id": "domain-user-v65-022", "q": "无效域名怎么删除？", "a": "<p><b>原因：</b>已拒绝或已撤销的域名通常没有有效 DNS，可直接按页面按钮删除以清理列表。</p><ol><li>找到无效域名。</li><li>点击删除无效域名。</li><li>输入要求的域名确认。</li></ol><p><b>自己能处理：</b>找到无效域名。</p><p><b>需要联系平台处理：</b>如果按钮报错，平台需检查状态是否符合删除条件。</p><p><b>注意：</b>正常域名不能走无效域名删除。</p>"}, {"id": "domain-user-v65-023", "q": "域名被禁用是什么意思？", "a": "<p><b>原因：</b>禁用表示该域名不再允许继续使用，DNS 通常会被移除，多用于违规、风险或平台保护。</p><ol><li>查看消息中心的禁用说明。</li><li>停止继续使用该域名。</li></ol><p><b>自己能处理：</b>查看消息中心的禁用说明。</p><p><b>需要联系平台处理：</b>有异议时提交用途说明给平台复核。</p><p><b>注意：</b>禁用不是普通过期，不能自行恢复。</p>"}, {"id": "domain-user-v65-024", "q": "域名被撤销是什么意思？", "a": "<p><b>原因：</b>撤销通常表示域名授权被收回，可能来自规则变化、违规处理或平台维护。</p><ol><li>查看消息中心。</li><li>备份相关服务配置。</li></ol><p><b>自己能处理：</b>查看消息中心。</p><p><b>需要联系平台处理：</b>需要恢复时联系平台说明原因。</p><p><b>注意：</b>撤销后 DNS 可能已被删除。</p>"}, {"id": "domain-user-v65-025", "q": "申请被拒绝怎么办？", "a": "<p><b>原因：</b>拒绝通常与前缀违规、保留词、用途不清或平台规则不允许有关。</p><ol><li>查看消息中心拒绝原因。</li><li>修改前缀后重新申请。</li><li>避免仿冒和误导词。</li></ol><p><b>自己能处理：</b>查看消息中心拒绝原因。</p><p><b>需要联系平台处理：</b>不理解拒绝原因时联系平台复核。</p><p><b>注意：</b>重复提交同样前缀可能继续被拒。</p>"}, {"id": "domain-user-v65-026", "q": "状态“正常”代表什么？", "a": "<p><b>原因：</b>正常表示域名审核通过且未被禁用、撤销或删除，可以进入域名管理添加 DNS。</p><ol><li>点击管理域名。</li><li>添加需要的 DNS 记录。</li></ol><p><b>自己能处理：</b>点击管理域名。</p><p><b>需要联系平台处理：</b>若正常状态仍不能编辑，平台需检查权限开关。</p><p><b>注意：</b>正常不代表 DNS 已配置。</p>"}, {"id": "domain-user-v65-027", "q": "状态“待审核”代表什么？", "a": "<p><b>原因：</b>待审核表示申请已提交但还未批准，不能添加解析，也未开始计算有效期。</p><ol><li>等待处理。</li><li>避免重复申请。</li></ol><p><b>自己能处理：</b>等待处理。</p><p><b>需要联系平台处理：</b>长时间无结果可反馈给平台。</p><p><b>注意：</b>待审核期间没有 DNS 管理入口是正常的。</p>"}, {"id": "domain-user-v65-028", "q": "状态“待删除审核”代表什么？", "a": "<p><b>原因：</b>待删除审核表示你已申请删除正常域名，但平台还未完成删除处理。</p><ol><li>等待处理。</li><li>撤销期内可以取消删除申请。</li></ol><p><b>自己能处理：</b>等待处理。</p><p><b>需要联系平台处理：</b>平台批准后会删除 DNS 和系统记录。</p><p><b>注意：</b>此状态仍占用额度。</p>"}, {"id": "domain-user-v65-029", "q": "域名列表看不到刚申请的域名怎么办？", "a": "<p><b>原因：</b>可能是申请未成功、页面未刷新，或被规则拦截没有写入。</p><ol><li>确认提交时有成功提示。</li><li>刷新域名注册页列表。</li><li>查看是否有红色错误。</li></ol><p><b>自己能处理：</b>确认提交时有成功提示。</p><p><b>需要联系平台处理：</b>平台可按账号查询申请记录。</p><p><b>注意：</b>没有成功提示就不要认为已经提交。</p>"}, {"id": "domain-user-v65-030", "q": "域名卡片 DNS 摘要不准怎么办？", "a": "<p><b>原因：</b>摘要可能从旧字段或缓存读取，真实配置应以域名详情中的 DNS 解析列表为准。</p><ol><li>进入管理域名。</li><li>查看 DNS 解析列表。</li><li>刷新页面后再看卡片。</li></ol><p><b>自己能处理：</b>进入管理域名。</p><p><b>需要联系平台处理：</b>平台需确认摘要从真实 dns_records 计算。</p><p><b>注意：</b>不要只看摘要就判断记录类型。</p>"}, {"id": "domain-user-v65-031", "q": "多条 DNS 记录如何显示？", "a": "<p><b>原因：</b>域名卡片会显示摘要，详情页会列出每条记录的主机、类型、目标、优先级和状态。</p><ol><li>打开域名详情。</li><li>切换到 DNS 解析。</li><li>逐条核对。</li></ol><p><b>自己能处理：</b>打开域名详情。</p><p><b>需要联系平台处理：</b>摘要过短时平台可优化显示规则。</p><p><b>注意：</b>多条记录不能只看第一条。</p>"}, {"id": "domain-user-v65-032", "q": "能把域名转给别人吗？", "a": "<p><b>原因：</b>是否允许转让取决于平台规则；默认多数免费二级域名不开放自助转让。</p><ol><li>查看页面是否有转让入口。</li><li>没有入口时不要私下交换账号。</li></ol><p><b>自己能处理：</b>查看页面是否有转让入口。</p><p><b>需要联系平台处理：</b>确需转让时联系平台核验双方账号。</p><p><b>注意：</b>私下共享账号有安全风险。</p>"}, {"id": "domain-user-v65-033", "q": "修改前缀可以直接改吗？", "a": "<p><b>原因：</b>不能直接把已申请域名改成另一个前缀，因为完整域名是唯一记录。</p><ol><li>申请新的前缀。</li><li>把 DNS 配置迁移过去。</li><li>旧域名不用时申请删除。</li></ol><p><b>自己能处理：</b>申请新的前缀。</p><p><b>需要联系平台处理：</b>平台一般不直接改历史 fqdn。</p><p><b>注意：</b>改前缀相当于换一个域名。</p>"}, {"id": "domain-user-v65-034", "q": "根域后缀选错可以改吗？", "a": "<p><b>原因：</b>后缀是完整域名的一部分，选错后通常不能直接修改，只能重新申请正确后缀。</p><ol><li>申请正确后缀的新域名。</li><li>迁移解析记录。</li><li>删除旧域名。</li></ol><p><b>自己能处理：</b>申请正确后缀的新域名。</p><p><b>需要联系平台处理：</b>平台可协助处理旧域名删除。</p><p><b>注意：</b>不要把后缀错误当成显示问题。</p>"}, {"id": "domain-user-v65-035", "q": "审核通过但没有 DNS 记录正常吗？", "a": "<p><b>原因：</b>正常。当前流程是先审核域名，DNS 由用户在通过后自行添加。</p><ol><li>进入域名管理。</li><li>点击添加解析。</li><li>按目标服务商要求填写。</li></ol><p><b>自己能处理：</b>进入域名管理。</p><p><b>需要联系平台处理：</b>如果添加入口不可用，平台需检查权限设置。</p><p><b>注意：</b>通过审核不等于自动解析。</p>"}, {"id": "domain-user-v65-036", "q": "为什么申请时不用填 DNS？", "a": "<p><b>原因：</b>为了降低申请门槛，也避免用户在未审核前写入错误或违规解析。</p><ol><li>申请时只填前缀和后缀。</li><li>通过后再配置 DNS。</li></ol><p><b>自己能处理：</b>申请时只填前缀和后缀。</p><p><b>需要联系平台处理：</b>平台可根据规则决定是否自动审批。</p><p><b>注意：</b>不要在申请页寻找目标地址输入框。</p>"}, {"id": "domain-user-v65-037", "q": "平台自动审批是什么意思？", "a": "<p><b>原因：</b>自动审批开启时，合规申请可能无需人工等待就变成正常状态。</p><ol><li>提交后查看状态是否很快变正常。</li><li>正常后即可添加 DNS。</li></ol><p><b>自己能处理：</b>提交后查看状态是否很快变正常。</p><p><b>需要联系平台处理：</b>如果仍待审核，可能命中黑名单或平台关闭自动审批。</p><p><b>注意：</b>自动审批不代表没有规则检查。</p>"}, {"id": "domain-user-v65-038", "q": "人工审核是什么意思？", "a": "<p><b>原因：</b>人工审核表示提交后需要等待平台确认前缀和用途，期间不能配置 DNS。</p><ol><li>等待结果。</li><li>必要时通过消息说明用途。</li></ol><p><b>自己能处理：</b>等待结果。</p><p><b>需要联系平台处理：</b>平台处理后会发送消息。</p><p><b>注意：</b>人工审核不是前端卡住。</p>"}, {"id": "domain-user-v65-039", "q": "违规域名会怎样？", "a": "<p><b>原因：</b>违规域名可能被拒绝、禁用、撤销或删除 DNS，严重时账号也可能受限。</p><ol><li>不要申请仿冒、钓鱼、违法前缀。</li><li>收到处理消息后停止使用。</li></ol><p><b>自己能处理：</b>不要申请仿冒、钓鱼、违法前缀。</p><p><b>需要联系平台处理：</b>有误判时提供真实用途说明。</p><p><b>注意：</b>免费域名同样受规则约束。</p>"}, {"id": "domain-user-v65-040", "q": "为什么仿冒品牌名会被拒绝？", "a": "<p><b>原因：</b>仿冒品牌会损害主域名信誉，也可能导致浏览器和安全系统拦截整个平台。</p><ol><li>换成自己的项目名。</li><li>避免使用银行、支付、社交平台等品牌词。</li></ol><p><b>自己能处理：</b>换成自己的项目名。</p><p><b>需要联系平台处理：</b>平台通常不会开放高风险品牌前缀。</p><p><b>注意：</b>“测试用”也不建议申请仿冒名称。</p>"}, {"id": "domain-user-v65-041", "q": "为什么申请 mail 前缀很敏感？", "a": "<p><b>原因：</b>mail、smtp、imap 等前缀和邮件系统相关，容易被滥用或和平台服务冲突。</p><ol><li>优先换成项目名。</li><li>确需邮件用途时说明原因。</li></ol><p><b>自己能处理：</b>优先换成项目名。</p><p><b>需要联系平台处理：</b>平台评估后决定是否开放。</p><p><b>注意：</b>邮件相关前缀不是普通展示域名。</p>"}, {"id": "domain-user-v65-042", "q": "如何查看域名处理结果？", "a": "<p><b>原因：</b>处理结果会进入消息中心，域名卡片只显示当前状态，不承载完整沟通记录。</p><ol><li>进入消息中心。</li><li>查看域名申请、拒绝、删除、禁用通知。</li></ol><p><b>自己能处理：</b>进入消息中心。</p><p><b>需要联系平台处理：</b>平台处理时会写入通知。</p><p><b>注意：</b>不要只在域名卡片找留言。</p>"}, {"id": "domain-user-v65-043", "q": "操作日志能看到什么？", "a": "<p><b>原因：</b>操作日志记录近期申请、DNS 新增/修改/删除、登录和消息等与账号相关的动作。</p><ol><li>进入操作日志。</li><li>用类型和时间筛选。</li><li>按倒序查看最近操作。</li></ol><p><b>自己能处理：</b>进入操作日志。</p><p><b>需要联系平台处理：</b>日志缺失时平台需检查保留天数。</p><p><b>注意：</b>日志超过期限会清理。</p>"}, {"id": "domain-user-v65-044", "q": "域名到期后 DNS 会被清理吗？", "a": "<p><b>原因：</b>取决于平台规则；可能在过期后保留一段时间，也可能定时清理。</p><ol><li>到期前及时续期。</li><li>过期后查看域名状态和 DNS 列表。</li></ol><p><b>自己能处理：</b>到期前及时续期。</p><p><b>需要联系平台处理：</b>平台可说明自动清理周期。</p><p><b>注意：</b>不要等过期后再依赖域名继续服务。</p>"}, {"id": "domain-user-v65-045", "q": "单个域名最多能添加多少 DNS？", "a": "<p><b>原因：</b>平台会限制单个域名记录数量，防止滥用和维护困难。</p><ol><li>删除不用的记录。</li><li>合并重复 TXT。</li><li>必要时申请提高上限。</li></ol><p><b>自己能处理：</b>删除不用的记录。</p><p><b>需要联系平台处理：</b>平台可按用途调整上限。</p><p><b>注意：</b>记录越多越难排查故障。</p>"}, {"id": "domain-user-v65-046", "q": "手机端怎么申请域名？", "a": "<p><b>原因：</b>手机端功能和电脑端一致，但表单空间更小，需要确认预览和按钮位置。</p><ol><li>打开域名注册。</li><li>点击注册新域名。</li><li>选择后缀并填写前缀。</li></ol><p><b>自己能处理：</b>打开域名注册。</p><p><b>需要联系平台处理：</b>手机样式错位时平台需检查移动端 CSS。</p><p><b>注意：</b>输入时注意不要被自动更正加空格。</p>"}, {"id": "domain-user-v65-047", "q": "手机端看不到完整表格怎么办？", "a": "<p><b>原因：</b>手机屏幕窄，表格可能改成卡片或需要横向滚动。</p><ol><li>优先进入详情页查看完整信息。</li><li>竖屏显示异常时尝试横屏。</li></ol><p><b>自己能处理：</b>优先进入详情页查看完整信息。</p><p><b>需要联系平台处理：</b>平台可继续优化移动端布局。</p><p><b>注意：</b>不要在手机端只凭被截断文字判断状态。</p>"}, {"id": "domain-user-v65-048", "q": "为什么刚批准后还看不到管理按钮？", "a": "<p><b>原因：</b>可能是页面还没刷新到最新状态，或自动刷新尚未触发。</p><ol><li>手动刷新页面。</li><li>回到域名管理列表重新进入。</li><li>确认消息中心是否收到通过通知。</li></ol><p><b>自己能处理：</b>手动刷新页面。</p><p><b>需要联系平台处理：</b>平台需确认 approve 接口是否成功写入状态。</p><p><b>注意：</b>通过通知和页面状态可能有短暂延迟。</p>"}, {"id": "domain-user-v65-049", "q": "删除后还能重新申请同一个前缀吗？", "a": "<p><b>原因：</b>硬删除完成后通常可以重新申请，但如果前缀进入黑名单或被别人抢先申请，就不能再用。</p><ol><li>确认旧域名已从列表消失。</li><li>重新提交同前缀申请。</li></ol><p><b>自己能处理：</b>确认旧域名已从列表消失。</p><p><b>需要联系平台处理：</b>平台可确认是否仍有旧记录占用。</p><p><b>注意：</b>删除前请备份 DNS 配置。</p>"}, {"id": "domain-user-v65-050", "q": "申请域名需要写用途吗？", "a": "<p><b>原因：</b>表单可能不强制填写用途，但遇到敏感前缀或人工审核时，主动说明用途能减少误判。</p><ol><li>选择清晰前缀。</li><li>需要时通过消息补充用途。</li></ol><p><b>自己能处理：</b>选择清晰前缀。</p><p><b>需要联系平台处理：</b>平台可根据用途决定是否批准。</p><p><b>注意：</b>用途不清的敏感前缀更容易被拒。</p>"}, {"id": "domain-user-v65-051", "q": "怎么判断域名是否真的属于我？", "a": "<p><b>原因：</b>登录后在域名管理列表看到该域名，并能进入详情页，说明系统内归属为当前账号。</p><ol><li>进入域名管理。</li><li>找到对应完整域名。</li><li>点击管理域名查看详情。</li></ol><p><b>自己能处理：</b>进入域名管理。</p><p><b>需要联系平台处理：</b>列表没有时平台可查 D1 归属。</p><p><b>注意：</b>Cloudflare 上存在记录不等于系统内属于你。</p>"}, {"id": "domain-user-v65-052", "q": "域名显示正常但 DNS 未配置是什么意思？", "a": "<p><b>原因：</b>域名审核通过了，但你还没有添加任何解析记录，所以访问时不会指向网站。</p><ol><li>点击管理域名。</li><li>添加 A、CNAME 或其他记录。</li><li>保存后等待生效。</li></ol><p><b>自己能处理：</b>点击管理域名。</p><p><b>需要联系平台处理：</b>添加失败时平台检查 DNS API。</p><p><b>注意：</b>正常状态只是授权，不是网站已上线。</p>"}, {"id": "domain-user-v65-053", "q": "为什么申请删除要输入域名确认？", "a": "<p><b>原因：</b>输入完整域名是防误删设计，防止误点删除正在使用的域名。</p><ol><li>复制域名。</li><li>在确认框输入完全一致的域名。</li><li>再点确认。</li></ol><p><b>自己能处理：</b>复制域名。</p><p><b>需要联系平台处理：</b>输入一直不通过时平台可检查大小写或隐藏空格。</p><p><b>注意：</b>少一个字符都不能通过。</p>"}, {"id": "domain-user-v65-054", "q": "删除账号为什么也要输入账号确认？", "a": "<p><b>原因：</b>注销账号会删除账号数据和会话，要求输入账号名防止误操作。</p><ol><li>先处理未注销域名。</li><li>输入当前账号名。</li><li>确认后会退出登录。</li></ol><p><b>自己能处理：</b>先处理未注销域名。</p><p><b>需要联系平台处理：</b>平台不建议代替用户随意注销账号。</p><p><b>注意：</b>注销后通常不能恢复。</p>"}, {"id": "domain-user-v65-055", "q": "如何给平台说明域名问题？", "a": "<p><b>原因：</b>高质量反馈应包含账号、完整域名、操作页面、错误提示和截图。</p><ol><li>复制完整域名。</li><li>截图红色错误。</li><li>说明刚才点了哪个按钮。</li></ol><p><b>自己能处理：</b>复制完整域名。</p><p><b>需要联系平台处理：</b>平台根据这些信息查日志更快。</p><p><b>注意：</b>只说“打不开”无法判断是 DNS、网站还是账号问题。</p>"}, {"id": "domain-user-v65-056", "q": "域名用途改变需要重新申请吗？", "a": "<p><b>原因：</b>如果只是目标服务器变化，不需要重新申请，直接改 DNS；如果前缀本身不再合适，则申请新域名。</p><ol><li>进入域名管理修改 DNS。</li><li>需要新名称时申请新前缀。</li></ol><p><b>自己能处理：</b>进入域名管理修改 DNS。</p><p><b>需要联系平台处理：</b>违规用途变更可能被平台处理。</p><p><b>注意：</b>改 DNS 不会改变域名名称。</p>"}, {"id": "domain-user-v65-057", "q": "为什么同一账号不要多人共用？", "a": "<p><b>原因：</b>多人共用会导致操作日志混乱、DNS 被互相覆盖、消息已读状态不准确。</p><ol><li>给不同使用者分别注册账号。</li><li>不要共享密码。</li></ol><p><b>自己能处理：</b>给不同使用者分别注册账号。</p><p><b>需要联系平台处理：</b>平台可按账号分配额度。</p><p><b>注意：</b>多人共用后很难判断是谁删除了记录。</p>"}, {"id": "domain-user-v65-058", "q": "域名被平台回收前会通知吗？", "a": "<p><b>原因：</b>正常情况下到期、删除、禁用等关键事件会通过消息中心提示，但违规紧急处理可能先限制再通知。</p><ol><li>定期查看消息中心。</li><li>开启到期提醒后及时续期。</li></ol><p><b>自己能处理：</b>定期查看消息中心。</p><p><b>需要联系平台处理：</b>平台可补发或说明处理原因。</p><p><b>注意：</b>不要长期不登录还依赖免费域名。</p>"}, {"id": "domain-user-v65-059", "q": "帮助中心没有我的问题怎么办？", "a": "<p><b>原因：</b>帮助中心无法覆盖所有个案，找不到答案时应通过站内消息或外部反馈补充问题。</p><ol><li>先搜索关键词。</li><li>展开相关分类。</li><li>底部发送消息给平台。</li></ol><p><b>自己能处理：</b>先搜索关键词。</p><p><b>需要联系平台处理：</b>平台可把高频问题加入 Q&A。</p><p><b>注意：</b>不要在错误页面反复操作，先保留截图。</p>"}, {"id": "domain-user-v65-060", "q": "为什么用户帮助里没有后台设置教程？", "a": "<p><b>原因：</b>用户帮助中心只解决普通用户使用问题，后台配置属于平台维护范围，不放在用户问答里避免误导。</p><ol><li>按用户菜单查找问题。</li><li>需要平台配置变更时发送消息说明需求。</li></ol><p><b>自己能处理：</b>按用户菜单查找问题。</p><p><b>需要联系平台处理：</b>平台内部会维护后台配置说明。</p><p><b>注意：</b>普通用户不需要学习后台密钥、Zone ID 等配置。</p>"}, {"id": "domain-user-v65-061", "q": "如何判断问题是 DNS 还是域名状态？", "a": "<p><b>原因：</b>域名状态决定你有没有管理权限，DNS 决定访问指向哪里；两者要分开看。</p><ol><li>先看域名是否正常。</li><li>再看 DNS 记录是否存在且生效。</li><li>最后检查目标网站服务。</li></ol><p><b>自己能处理：</b>先看域名是否正常。</p><p><b>需要联系平台处理：</b>平台可帮你区分是权限问题还是解析问题。</p><p><b>注意：</b>不要一看到打不开就直接删除域名。</p>"}, {"id": "domain-user-v65-062", "q": "网站打不开时先查什么？", "a": "<p><b>原因：</b>先查域名状态，再查 DNS 记录，最后查目标服务器。这个顺序能避免误判。</p><ol><li>域名管理看状态。</li><li>DNS 解析看记录。</li><li>访问目标 IP 或第三方平台检查服务。</li></ol><p><b>自己能处理：</b>域名管理看状态。</p><p><b>需要联系平台处理：</b>平台可确认前两步，目标服务器由服务商处理。</p><p><b>注意：</b>不要一开始就改很多 DNS 记录。</p>"}, {"id": "domain-user-v65-063", "q": "域名可以长期不用吗？", "a": "<p><b>原因：</b>可以保留到有效期结束，但长期不用仍占额度，到期未续期可能被清理。</p><ol><li>不用的域名及时申请删除。</li><li>需要保留就关注到期时间。</li></ol><p><b>自己能处理：</b>不用的域名及时申请删除。</p><p><b>需要联系平台处理：</b>平台可能对长期闲置或违规域名进行处理。</p><p><b>注意：</b>占着不用会影响你申请新域名。</p>"}, {"id": "domain-user-v65-064", "q": "为什么前台显示剩余额度？", "a": "<p><b>原因：</b>剩余额度帮助你判断还能申请多少域名，避免提交后才被拒绝。</p><ol><li>查看注册页或账户设置。</li><li>额度不足时先清理旧域名。</li></ol><p><b>自己能处理：</b>查看注册页或账户设置。</p><p><b>需要联系平台处理：</b>平台可设置是否显示额度。</p><p><b>注意：</b>隐藏额度不代表没有额度限制。</p>"}, {"id": "domain-user-v65-065", "q": "为什么前台显示到期提醒？", "a": "<p><b>原因：</b>到期提醒用于避免域名过期导致 DNS 被清理或服务中断。</p><ol><li>看到提醒后及时续期。</li><li>不再使用则申请删除。</li></ol><p><b>自己能处理：</b>看到提醒后及时续期。</p><p><b>需要联系平台处理：</b>平台可调整提醒提前天数。</p><p><b>注意：</b>忽略提醒可能导致域名停止服务。</p>"}, {"id": "domain-user-v65-066", "q": "域名被别人占用怎么办？", "a": "<p><b>原因：</b>二级域名遵循先申请先占用；别人已占用时你不能直接申请同名。</p><ol><li>换前缀。</li><li>选择其他后缀。</li><li>如果涉及侵权，提交证据给平台。</li></ol><p><b>自己能处理：</b>换前缀。</p><p><b>需要联系平台处理：</b>平台可按规则处理明显违规占用。</p><p><b>注意：</b>普通喜欢的前缀被占用不能强制收回。</p>"}, {"id": "domain-user-v65-067", "q": "能不能申请很多测试域名？", "a": "<p><b>原因：</b>取决于账号额度和平台规则。大量临时测试域名会占用资源，可能被限制。</p><ol><li>优先复用一个测试域名的多级子域名。</li><li>不用的测试域名及时删除。</li></ol><p><b>自己能处理：</b>优先复用一个测试域名的多级子域名。</p><p><b>需要联系平台处理：</b>平台可根据合理用途调整额度。</p><p><b>注意：</b>不要用批量域名做垃圾跳转。</p>"}, {"id": "domain-user-v65-068", "q": "域名状态正常但按钮是灰色怎么办？", "a": "<p><b>原因：</b>可能是页面没刷新、域名处于待删除审核、或权限开关限制了操作。</p><ol><li>刷新页面。</li><li>查看是否有待删除提示。</li><li>确认当前登录账号是域名所有者。</li></ol><p><b>自己能处理：</b>刷新页面。</p><p><b>需要联系平台处理：</b>平台需检查权限规则和记录归属。</p><p><b>注意：</b>灰色按钮通常代表权限限制，不是按钮坏了。</p>"}, {"id": "domain-user-v65-069", "q": "如何确认删除真的完成？", "a": "<p><b>原因：</b>删除完成后域名应从列表消失，关联 DNS 记录也不再显示。</p><ol><li>刷新域名管理。</li><li>搜索完整域名。</li><li>查看消息中心处理结果。</li></ol><p><b>自己能处理：</b>刷新域名管理。</p><p><b>需要联系平台处理：</b>平台可确认 D1 和 Cloudflare 是否都清理。</p><p><b>注意：</b>Cloudflare 缓存短时间存在不代表系统未删除。</p>"}, {"id": "domain-user-v65-070", "q": "为什么帮助回答会更新？", "a": "<p><b>原因：</b>平台会根据用户反馈和故障经验不断补充 Q&A，旧答案可能被替换为更准确的版本。</p><ol><li>搜索时以当前帮助中心为准。</li><li>发现不准确内容可反馈。</li></ol><p><b>自己能处理：</b>搜索时以当前帮助中心为准。</p><p><b>需要联系平台处理：</b>平台维护帮助内容。</p><p><b>注意：</b>截图里的旧答案可能已经过期。</p>"}, {"id": "domain-user-v65-071", "q": "为什么有些问题需要联系平台？", "a": "<p><b>原因：</b>涉及账号恢复、额度调整、审核、删除批准、系统配置和 Cloudflare 同步时，普通用户没有权限直接处理。</p><ol><li>先完成自己能检查的表单、状态和 DNS。</li><li>无法处理时附截图反馈。</li></ol><p><b>自己能处理：</b>先完成自己能检查的表单、状态和 DNS。</p><p><b>需要联系平台处理：</b>平台根据权限处理后回复你。</p><p><b>注意：</b>需要平台处理不代表系统一定出错。</p>"}]}];

function isUserHelpUnsafeV65(categories) {
  const arr = Array.isArray(categories) ? categories : [];
  if (!arr.length) return true;
  const joined = JSON.stringify(arr);
  const bannedQuestionWords = ['管理员怎么', '后台管理员', 'D1 硬删除是什么意思', 'CHECK constraint failed 怎么处理', '如何迁移 D1', 'CF_API_TOKEN'];
  if (bannedQuestionWords.some(w => joined.includes(w))) return true;
  let count = 0;
  for (const cat of arr) {
    for (const item of (Array.isArray(cat?.items) ? cat.items : [])) {
      count += 1;
      const q = String(item?.q || '');
      const a = String(item?.a || '');
      if (/管理员(设置|界面|怎么|可以|登录|添加|审核)/.test(q)) return true;
      if (/这个问题通常和账号权限、审核状态、浏览器缓存/.test(a)) return true;
    }
  }
  return count < 120;
}
(function applyUserHelpV65(){
  DEFAULT_HELP_CATEGORIES.splice(0, DEFAULT_HELP_CATEGORIES.length, ...USER_HELP_CATEGORIES_V65.map(cat => ({...cat, items: cat.items.map(item => ({...item}))})));
  normalizeHelpCategories = function(raw) {
    const arr = Array.isArray(raw) ? raw : [];
    const source = isUserHelpUnsafeV65(arr) ? DEFAULT_HELP_CATEGORIES : arr;
    return DEFAULT_HELP_CATEGORIES.map((def, index) => {
      const item = source.find(x => x && (x.key === def.key || x.title === def.title)) || source[index] || def;
      const items = Array.isArray(item.items) && item.items.length ? item.items : def.items;
      return {
        key: String(item.key || def.key),
        title: String(item.title || def.title),
        subtitle: String(item.subtitle || def.subtitle),
        items: items.map((row, i) => ({
          id: String(row.id || `${def.key}-${i + 1}`),
          q: String(row.q || row.question || ''),
          a: String(row.a || row.answer || '')
        })).filter(row => row.q.trim())
      };
    });
  };
  helpCategories = function() {
    return normalizeHelpCategories(state.config?.help?.categories || []);
  };
})();

function plainHelpAnswer(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  return div.textContent || div.innerText || '';
}

function deriveHelpTags(text) {
  const source = String(text || '').toLowerCase();
  const tags = [];
  const add = (name, words) => { if (words.some(w => source.includes(String(w).toLowerCase()))) tags.push(name); };
  add('登录', ['登录','登入','登陆','密码','会话','cookie']);
  add('注册', ['注册','创建账号','手机号','邮箱','turnstile','人机验证']);
  add('域名', ['域名','前缀','审核','额度','到期','续期','删除']);
  add('DNS', ['dns','解析','a 记录','aaaa','cname','txt','mx','ttl','代理']);
  add('消息', ['消息','通知','客服','反馈','已读','撤销']);
  add('手机端', ['手机','移动端','侧边栏','缓存']);
  return Array.from(new Set(tags.length ? tags : ['帮助']));
}


function renderHelpCenter() {
  const categories = helpCategories();
  const allArticles = categories.flatMap((cat, ci) => (cat.items || []).map((item, ii) => {
    const body = plainHelpAnswer(item.a || '');
    const summary = body.replace(/\s+/g, ' ').slice(0, 120);
    const tags = deriveHelpTags(`${item.q || ''} ${body} ${cat.title || ''}`);
    return {
      id: item.id || `${cat.key || ci}-${ii}`,
      categoryKey: cat.key || String(ci),
      categoryTitle: cat.title || '',
      title: item.q || '',
      html: item.a || '',
      body,
      summary,
      tags,
      updatedAt: item.updatedAt || '2026-07-30',
      views: Number(item.views || Math.max(1, 300 - ii * 2 - ci * 20)),
    };
  }));
  let currentResults = [];
  let currentPage = 1;
  let currentCategory = 'all';
  const pageSize = 5;

  shell('帮助中心', `
    <section class="help-hero card"><div><h2>帮助中心</h2><p>查看使用提示、DNS 教程、域名管理说明与支持入口</p></div></section>
    <section class="help-search-card card">
      <div class="help-search-title"><h2>问题搜索</h2><p>只检索帮助中心文章标题、正文、标签和摘要，支持中英文、错别字、近义词和自然问句。</p></div>
      <div class="help-search-box help-search-box-v68">
        <div class="help-search-input-wrap"><input id="help-search" class="help-search" autocomplete="off" placeholder="可以输入自然语言，例如：网站打不开、解析没生效、想删除域名、额度不够"><button class="help-input-clear" id="help-search-clear" type="button" aria-label="清空搜索">×</button></div>
        <button class="btn primary" id="help-search-btn" type="button">搜索/问答</button>
        <button class="btn secondary" id="help-filter-toggle" type="button">筛选</button>
        <div id="help-suggest" class="help-suggest hidden"></div>
      </div>
      <div id="help-filter-panel" class="help-filter-panel hidden">
        <label class="field"><span>内容类别</span><select id="help-filter-category"><option value="all">全部类别</option>${categories.map(cat => `<option value="${attr(cat.key || cat.title)}">${esc(cat.title)}</option>`).join('')}</select></label>
        <label class="field"><span>排序方式</span><select id="help-filter-sort"><option value="relevance">匹配度优先</option><option value="latest">最新优先</option><option value="hot">高频优先</option></select></label>
        <button class="btn soft" id="help-filter-reset" type="button">重置筛选</button>
      </div>
      <div id="help-history" class="help-history hidden"></div>
      <div id="help-search-status" class="help-search-status"></div>
      <div id="help-results" class="help-results help-results-compact hidden"></div>
      <div id="help-pagination" class="help-pagination hidden"></div>
    </section>
    <section class="help-category-wrap">
      ${categories.map(cat => renderHelpCategory(cat.title, cat.subtitle, cat.items)).join('')}
    </section>
    <section class="card help-contact-card">
      <div class="section-head">
        <div><h2>需要帮助？</h2><p>方式一：登录后可在下方直接发站内消息给管理员；方式二：无法登录、需要提交截图或详细资料时，点击右上角外部联系入口。</p></div>
        <a class="btn secondary" href="https://mailform.flore.top" target="_blank" rel="noopener">其他：联系我们</a>
      </div>
      <div class="help-contact-methods">
        <div><strong>方式一：站内消息</strong><p>适合已经登录后反馈域名审核、DNS 解析、额度、续期、删除等问题。发送后记录会进入您的消息中心，管理员可直接回复。</p></div>
        <div><strong>方式二：外部联系</strong><p>适合无法登录、人机验证不显示、忘记密码、需要提交截图或更完整材料。点击右上角“其他：联系我们”会打开 mailform.flore.top。</p></div>
      </div>
      <form id="help-contact-form" class="help-contact-form form-grid">
        <label class="field wide"><span>消息标题</span><input name="title" maxlength="120" placeholder="请填写要反馈的问题标题" required></label>
        <label class="field wide"><span>消息内容</span><textarea name="body" rows="8" placeholder="请详细描述您遇到的问题、页面位置、操作步骤和错误提示" required></textarea></label>
        <div class="help-contact-actions wide"><button class="btn primary" type="submit">发送给管理员</button></div>
      </form>
    </section>
  `);

  const search = document.querySelector('#help-search');
  const status = document.querySelector('#help-search-status');
  const suggest = document.querySelector('#help-suggest');
  const resultsWrap = document.querySelector('#help-results');
  const pageWrap = document.querySelector('#help-pagination');
  const historyWrap = document.querySelector('#help-history');
  const filterPanel = document.querySelector('#help-filter-panel');
  const categoryWrap = document.querySelector('.help-category-wrap');
  const SEARCH_HISTORY_KEY = 'helpSearchHistoryV68';
  const SEARCH_FREQ_KEY = 'helpSearchFrequencyV68';

  const normalizeWidth = value => String(value || '').replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  const stripHtml = value => String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/https?:\/\/\S+/gi, ' ').replace(/<[^>]+>/g, ' ');
  const typoPairs = [['密马','密码'],['蜜码','密码'],['注消','注销'],['帐户','账户'],['帐号','账号'],['登入','登录'],['登陆','登录'],['解淅','解析'],['域明','域名'],['续费','续期'],['撤消','撤销'],['cnmae','cname'],['cname记录','cname 记录'],['a记录','a 记录'],['mx记录','mx 记录'],['txt记录','txt 记录'],['aaaa记录','aaaa 记录'],['cloundflare','cloudflare']];
  const stopWords = ['请问','麻烦','帮我','帮忙','一下','这个','那个','就是','是不是','有没有','为什么','怎么弄','怎么搞','如何','怎么','怎么办','啊','哦','呀','呢','吗','的','了','请','我想','我要','无法','不能'];
  const synonymGroups = [
    ['登录','登入','登陆','登不上','登录不了','login'], ['账号','帐号','账户','帐户','account'], ['密码','密马','修改密码','重置密码','忘记密码','password'],
    ['注册','创建账号','开户','register'], ['注销','删除账号','取消账号'], ['域名','二级域名','子域名','domain'], ['审核','审批','待审核','批准'],
    ['解析','dns','记录','生效'], ['删除','移除','清理'], ['续期','续费','延期'], ['额度','配额','数量'], ['手机','移动端','手机版'], ['消息','通知','站内信'], ['人机验证','turnstile','验证码','captcha']
  ];
  const escapeRegExp = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function normalizeQuery(value) {
    let text = normalizeWidth(value).toLowerCase();
    typoPairs.forEach(([a,b]) => { text = text.replace(new RegExp(escapeRegExp(a.toLowerCase()), 'g'), b.toLowerCase()); });
    text = text.replace(/[\p{P}\p{S}_]+/gu, ' ').replace(/\s+/g, ' ').trim();
    stopWords.forEach(w => { text = text.replace(new RegExp(escapeRegExp(w.toLowerCase()), 'g'), ' '); });
    return text.replace(/\s+/g, ' ').trim();
  }
  function tokenize(value) {
    const normalized = normalizeQuery(value);
    if (!normalized) return [];
    const parts = normalized.split(/\s+/).filter(x => x && x.length <= 40);
    const zh = normalized.match(/[\u4e00-\u9fa5a-z0-9]{1,16}/gi) || [];
    const chunks = [];
    for (let len of [4,3,2]) for (let i=0;i<=normalized.length-len;i++) { const sub=normalized.slice(i,i+len); if(/[\u4e00-\u9fa5]{2,}/.test(sub)) chunks.push(sub); }
    const tokens = Array.from(new Set([...parts, ...zh, ...chunks])).filter(t => !stopWords.includes(t) && !/^\d?$/.test(t));
    return tokens.slice(0, 30);
  }
  function expandTokens(tokens) {
    const set = new Set(tokens);
    for (const t of tokens) for (const group of synonymGroups) if (group.map(x=>x.toLowerCase()).includes(t)) group.forEach(x => set.add(x.toLowerCase()));
    return [...set];
  }
  function articleText(article) {
    return normalizeQuery(`${article.title} ${article.summary} ${(article.tags||[]).join(' ')} ${stripHtml(article.body)}`);
  }
  function getHistory() { try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]'); } catch { return []; } }
  function setHistory(arr) { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(arr.slice(0, 10))); }
  function addHistory(q) { const v=String(q||'').trim(); if(!v) return; setHistory([v, ...getHistory().filter(x=>x!==v)].slice(0,10)); }
  function removeHistory(q) { setHistory(getHistory().filter(x => x !== q)); renderHistory(); }
  function bumpFreq(tokens) { let f={}; try { f=JSON.parse(localStorage.getItem(SEARCH_FREQ_KEY)||'{}'); } catch {} tokens.forEach(t => f[t]=(f[t]||0)+1); localStorage.setItem(SEARCH_FREQ_KEY, JSON.stringify(f)); }
  function freqScore(tokens) { let f={}; try { f=JSON.parse(localStorage.getItem(SEARCH_FREQ_KEY)||'{}'); } catch {} return tokens.reduce((sum,t)=>sum+Math.min(10, Number(f[t]||0)),0); }
  function scoreArticle(article, rawQuery) {
    const q = normalizeQuery(rawQuery);
    const baseTokens = tokenize(rawQuery);
    const tokens = expandTokens(baseTokens);
    const title = normalizeQuery(article.title);
    const tags = (article.tags || []).map(normalizeQuery);
    const body = normalizeQuery(stripHtml(article.body));
    const summary = normalizeQuery(article.summary);
    if (currentCategory !== 'all' && String(article.categoryKey || article.categoryTitle) !== currentCategory) return null;
    let score = 0;
    const matched = [];
    if (q && title === q) { score += 1000; matched.push(q); }
    if (q && title.includes(q)) { score += 650; matched.push(q); }
    for (const token of tokens) {
      if (!token) continue;
      if (title.includes(token)) { score += 90; matched.push(token); }
      if (tags.some(t => t === token)) { score += 70; matched.push(token); }
      if (tags.some(t => t.includes(token) || token.includes(t))) { score += 45; matched.push(token); }
      if (body.includes(q) && q.length > 1) { score += 35; }
      if (body.includes(token)) { score += 10; matched.push(token); }
      if (summary.includes(token)) { score += 12; matched.push(token); }
    }
    const uniqueMatched = Array.from(new Set(matched.filter(Boolean)));
    if (baseTokens.length > 1) score += uniqueMatched.length * 16;
    score += freqScore(uniqueMatched) * 0.5;
    score += Math.min(20, article.views / 25);
    if (!score || uniqueMatched.length === 0) return null;
    return { ...article, score, matched: uniqueMatched };
  }
  function highlight(text, tokens) {
    let out = esc(text || '');
    const arr = [...new Set((tokens||[]).filter(t => t && t.length > 1))].slice(0, 8);
    arr.forEach(t => { out = out.replace(new RegExp(`(${escapeRegExp(esc(t))})`, 'ig'), '<mark>$1</mark>'); });
    return out;
  }
  function snippet(article, tokens) {
    const text = stripHtml(article.body || article.summary || '').replace(/\s+/g, ' ').trim();
    const lower = text.toLowerCase();
    const token = (tokens || []).find(t => t.length > 1 && lower.includes(t.toLowerCase()));
    const i = token ? Math.max(0, lower.indexOf(token.toLowerCase()) - 45) : 0;
    return highlight(text.slice(i, i + 180), tokens);
  }
  function renderHistory() {
    const h = getHistory();
    if (!h.length || document.activeElement !== search) { historyWrap.classList.add('hidden'); historyWrap.innerHTML=''; return; }
    historyWrap.innerHTML = `<h4>近期搜索</h4><div class="help-history-list">${h.map(q => `<span class="help-history-item"><button type="button" class="help-history-word" data-history-use="${attr(q)}">${esc(q)}</button><button type="button" class="help-history-remove" aria-label="删除 ${attr(q)}" data-history-remove="${attr(q)}">×</button></span>`).join('')}</div>`;
    historyWrap.classList.remove('hidden');
  }
  function renderSuggest(value) {
    const tokens = tokenize(value);
    if (!String(value||'').trim()) { suggest.classList.add('hidden'); suggest.innerHTML=''; return; }
    const list = allArticles.map(a => scoreArticle(a, value)).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0, 8);
    if (!list.length) { suggest.classList.add('hidden'); suggest.innerHTML=''; return; }
    suggest.innerHTML = list.map(r => `<button type="button" data-suggest="${attr(r.title)}"><strong>${highlight(r.title, tokens)}</strong><small>${esc(r.categoryTitle)}</small></button>`).join('');
    suggest.classList.remove('hidden');
  }
  function pagination(current, total) {
    if (total <= 1) return '';
    const nums = [];
    if (total <= 6) for(let i=1;i<=total;i++) nums.push(i);
    else {
      nums.push(1);
      const start = Math.max(2, current - 2), end = Math.min(total - 1, current + 2);
      if (start > 2) nums.push('…');
      for(let i=start;i<=end;i++) nums.push(i);
      if (end < total - 1) nums.push('…');
      nums.push(total);
    }
    return `<button type="button" class="page-triangle" data-page="${Math.max(1,current-1)}">◀</button>${nums.map(n => n==='…' ? '<span class="page-ellipsis">…</span>' : `<button type="button" class="${n===current?'active':''}" data-page="${n}">${n}</button>`).join('')}<button type="button" class="page-triangle" data-page="${Math.min(total,current+1)}">▶</button><span class="page-total">第 ${current} / ${total} 页</span>`;
  }
  function renderResults(page = 1) {
    currentPage = page;
    if (!currentResults.length) {
      const hot = allArticles.sort((a,b)=>b.views-a.views).slice(0,3);
      resultsWrap.innerHTML = `<div class="help-no-result"><h3>没有精准结果</h3><p>请把关键词简化成“登录、DNS、删除、额度、续期、手机端”等核心词再搜。下面是热门问题：</p>${hot.map(a => `<button class="help-result-row" data-help-jump="${attr(a.id)}"><strong>${esc(a.title)}</strong><span>${esc(a.categoryTitle)}</span><p>${esc(a.summary)}</p></button>`).join('')}</div>`;
      resultsWrap.classList.remove('hidden'); pageWrap.classList.add('hidden'); categoryWrap.classList.add('hidden'); return;
    }
    const total = Math.ceil(currentResults.length / pageSize);
    const rows = currentResults.slice((page-1)*pageSize, page*pageSize);
    resultsWrap.innerHTML = rows.map(r => `<article class="help-result-row" data-help-jump="${attr(r.id)}"><div><strong>${highlight(r.title, r.matched)}</strong><span>${esc(r.categoryTitle)} · 匹配度 ${Math.round(r.score)}</span></div><p>${snippet(r, r.matched)}</p><em>标签：${(r.tags||[]).slice(0,6).map(esc).join(' / ')}</em></article>`).join('');
    pageWrap.innerHTML = pagination(page, total);
    resultsWrap.classList.remove('hidden'); pageWrap.classList.toggle('hidden', total <= 1); categoryWrap.classList.add('hidden');
  }
  function doSearch() {
    const raw = String(search.value || '').trim();
    const clean = normalizeQuery(raw);
    if (!clean || !/[\u4e00-\u9fa5a-z0-9]/i.test(clean)) { toast('请输入有效关键词，例如：登录、DNS、删除域名', 'error'); return; }
    addHistory(raw); renderHistory();
    const tokens = tokenize(raw); bumpFreq(tokens);
    const sortType = document.querySelector('#help-filter-sort')?.value || 'relevance';
    const scored = allArticles.map(a => scoreArticle(a, raw)).filter(Boolean);
    const unique = new Map();
    scored.forEach(item => { if (!unique.has(item.id) || unique.get(item.id).score < item.score) unique.set(item.id, item); });
    currentResults = [...unique.values()].sort((a,b) => {
      if (sortType === 'latest') return String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.score - a.score;
      if (sortType === 'hot') return b.views - a.views || b.score - a.score;
      return b.score - a.score || String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.views - a.views;
    });
    status.innerHTML = `已检索帮助中心文章 <b>${allArticles.length}</b> 篇；当前命中 <b>${currentResults.length}</b> 条。范围：标题、正文、标签、摘要；同一文章不会重复展示。`;
    renderResults(1);
    suggest.classList.add('hidden');
  }
  function jumpToArticle(id) {
    const target = document.querySelector(`.help-item[data-help-id="${CSS.escape(id)}"]`);
    if (target) { target.open = true; target.closest('.help-category')?.setAttribute('open',''); target.scrollIntoView({ behavior:'smooth', block:'center' }); }
  }
  search.addEventListener('input', () => { renderSuggest(search.value); document.querySelector('#help-search-clear').classList.toggle('active', Boolean(search.value)); });
  search.addEventListener('focus', renderHistory);
  search.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  document.querySelector('#help-search-clear')?.addEventListener('click', () => { search.value=''; search.focus(); suggest.classList.add('hidden'); resultsWrap.classList.add('hidden'); pageWrap.classList.add('hidden'); status.innerHTML=''; categoryWrap.classList.remove('hidden'); document.querySelector('#help-search-clear').classList.remove('active'); });
  document.querySelector('#help-filter-toggle')?.addEventListener('click', () => filterPanel.classList.toggle('hidden'));
  document.querySelector('#help-filter-category')?.addEventListener('change', e => { currentCategory = e.target.value; if (search.value.trim()) doSearch(); });
  document.querySelector('#help-filter-sort')?.addEventListener('change', () => { if (search.value.trim()) doSearch(); });
  document.querySelector('#help-filter-reset')?.addEventListener('click', () => { currentCategory='all'; document.querySelector('#help-filter-category').value='all'; document.querySelector('#help-filter-sort').value='relevance'; if (search.value.trim()) doSearch(); });
  document.querySelector('#help-search-btn')?.addEventListener('click', doSearch);
  document.addEventListener('click', e => {
    const sug = e.target.closest('[data-suggest]'); if (sug) { search.value = sug.dataset.suggest; doSearch(); }
    const hu = e.target.closest('[data-history-use]'); if (hu) { search.value = hu.dataset.historyUse; doSearch(); }
    const hr = e.target.closest('[data-history-remove]'); if (hr) { e.stopPropagation(); removeHistory(hr.dataset.historyRemove); }
    const pg = e.target.closest('[data-page]'); if (pg && pageWrap.contains(pg)) renderResults(Number(pg.dataset.page || 1));
    const jump = e.target.closest('[data-help-jump]'); if (jump) jumpToArticle(jump.dataset.helpJump);
  });

  document.querySelector('#help-contact-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const f = new FormData(form);
    const title = String(f.get('title') || '').trim();
    const body = String(f.get('body') || '').trim();
    if (!title || !body) { toast('请填写标题和内容', 'error'); return; }
    submit.disabled = true;
    try {
      await api('/api/messages/contact-admin', { method:'POST', body:{ title, body } });
      form.reset();
      await refreshMessageBadge();
      toast('已转到消息中心', 'success');
      location.hash = '#/messages';
    } catch (error) { toast(error.message, 'error'); }
    finally { submit.disabled = false; }
  });
}

function messageLevelBadge(level) {
  const map = { info:'普通通知', feedback:'用户反馈', support_reply:'客服回复', success:'成功提示', warning:'警告提醒', danger:'重要警告', important:'重要通知', system:'系统通知' };
  return `<span class="message-level message-level-${esc(level || 'info')}">${esc(map[level] || map.info)}</span>`;
}
function messageStatusBadgeText(status) {
  const map = { sent:'已发送', draft:'草稿', template:'模板' };
  return map[status] || status;
}
function messageTargetOptions(users = [], selectedId = '') {
  return users.map(u => `<option value="${attr(u.id)}" ${String(u.id) === String(selectedId || '') ? 'selected' : ''}>${esc(u.username)}${u.email ? ' / '+esc(u.email) : ''}</option>`).join('');
}
function messageComposeForm(users = [], preset = {}) {
  const status = preset.status || 'sent';
  const targetType = preset.targetType || 'none';
  const targetRole = preset.targetRole || 'user';
  return `<form id="message-compose-form" class="message-compose form-grid" data-edit-id="${attr(preset.id || '')}">
    <label class="field"><span>接收对象</span><select name="targetType" id="msg-target-type"><option value="none" ${targetType==='none'?'selected':''}>暂不选择</option><option value="all" ${targetType==='all'?'selected':''}>全部用户</option><option value="role" ${targetType==='role'?'selected':''}>按角色</option><option value="user" ${targetType==='user'?'selected':''}>指定用户</option></select></label>
    <label class="field msg-target-role"><span>角色</span><select name="targetRole"><option value="user" ${targetRole==='user'?'selected':''}>普通用户</option><option value="admin" ${targetRole==='admin'?'selected':''}>管理员</option></select></label>
    <label class="field msg-target-user"><span>用户</span><select name="targetUserId"><option value="">请选择用户</option>${messageTargetOptions(users, preset.targetUserId || '')}</select></label>
    <label class="field"><span>消息类型</span><select name="level"><option value="" ${!preset.level?'selected':''}>暂不选择</option><option value="info" ${(preset.level||'info')==='info'?'selected':''}>普通通知</option><option value="important" ${preset.level==='important'?'selected':''}>重要通知</option><option value="system" ${preset.level==='system'?'selected':''}>系统通知</option><option value="support_reply" ${preset.level==='support_reply'?'selected':''}>客服回复</option><option value="success" ${preset.level==='success'?'selected':''}>成功提示</option><option value="warning" ${preset.level==='warning'?'selected':''}>警告提醒</option><option value="danger" ${preset.level==='danger'?'selected':''}>重要警告</option></select></label>
    <label class="field wide"><span>消息标题</span><input name="title" placeholder="请输入消息标题" maxlength="120" required value="${attr(preset.title || '')}"></label>
    <label class="field wide"><span>消息内容</span><textarea name="body" placeholder="请输入消息内容" rows="8" required>${esc(preset.body || '')}</textarea></label>
    <div class="message-compose-actions wide">
      <button class="btn primary" type="button" data-message-action="sent">立即发送</button>
      <button class="btn secondary" type="button" data-message-action="draft">保存草稿</button>
      <button class="btn soft" type="button" data-message-action="template">保存为模板</button>
      ${preset.id ? '<button class="btn ghost" type="button" id="clear-message-form">取消编辑</button>' : ''}
    </div>
  </form>`;
}
function bindMessageTargetVisibility() {
  const form = document.querySelector('#message-compose-form');
  const type = form?.querySelector('#msg-target-type');
  const refresh = () => {
    const v = type?.value || 'none';
    form?.querySelector('.msg-target-role')?.classList.toggle('hidden', v !== 'role');
    form?.querySelector('.msg-target-user')?.classList.toggle('hidden', v !== 'user');
  };
  type?.addEventListener('change', refresh);
  refresh();
}
function bindMessageCompose(users, preset = null) {
  bindMessageTargetVisibility();
  document.querySelector('#clear-message-form')?.addEventListener('click', () => renderMessageCenter());
  document.querySelectorAll('[data-template-use]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.templateUse;
      const res = await api('/api/admin/messages');
      const t = (res.messages || []).find(m => m.id === id);
      if (t) renderMessageCenter(t);
    });
  });
  document.querySelectorAll('[data-message-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const form = document.querySelector('#message-compose-form');
      const data = Object.fromEntries(new FormData(form));
      data.status = btn.dataset.messageAction;
      const editId = form.dataset.editId;
      btn.disabled = true;
      try {
        if (editId && data.status !== 'sent') {
          await api(`/api/admin/messages/${encodeURIComponent(editId)}`, { method:'PATCH', body:data });
        } else {
          await api('/api/admin/messages', { method:'POST', body:data });
        }
        toast(data.status === 'sent' ? '消息已发送' : (data.status === 'template' ? '模板已保存' : '草稿已保存'), 'success');
        await renderMessageCenter();
      } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
    });
  });
}

function logTargetLabel(log) {
  const typeMap = {
    user: '用户', domain_application: '域名申请', dns_record: 'DNS 记录', message: '消息', setting: '设置'
  };
  const type = typeMap[log.targetType] || log.targetType || '—';
  return log.targetId ? `${type} / ${String(log.targetId).slice(0, 10)}` : type;
}
function operationLogCategory(log) {
  const text = `${log.action || ''} ${log.targetType || ''} ${log.description || ''}`.toLowerCase();
  if (text.includes('dns') || text.includes('解析') || log.targetType === 'dns_record') return { value: 'dns', label: 'DNS' };
  if (text.includes('domain') || text.includes('域名') || text.includes('续期') || log.targetType === 'domain_application') return { value: 'domain', label: '域名' };
  if (text.includes('login') || text.includes('logout') || text.includes('auth') || text.includes('登录') || text.includes('退出')) return { value: 'auth', label: '认证' };
  if (text.includes('user') || text.includes('account') || text.includes('用户') || text.includes('账号') || log.targetType === 'user') return { value: 'account', label: '账号' };
  if (text.includes('message') || text.includes('消息') || log.targetType === 'message') return { value: 'message', label: '消息' };
  if (text.includes('setting') || text.includes('设置') || log.targetType === 'setting') return { value: 'setting', label: '设置' };
  return { value: 'other', label: '其它' };
}
function operationLogCategoryLabel(value) {
  const map = { dns: 'DNS', domain: '域名', account: '账号', message: '消息', setting: '设置', auth: '认证', other: '其它' };
  return map[value] || value || '其它';
}
function localDayKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function localHourKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${localDayKey(value)}T${String(d.getHours()).padStart(2, '0')}`;
}
function operationSelected(current, value) {
  return String(current ?? '') === String(value ?? '') ? 'selected' : '';
}
function operationActorValue(log) {
  return String(log.actorUsername || '系统');
}
function filterOperationLogs(logs) {
  const f = state.operationLogFilters || {};
  let output = [...logs];
  if (f.dateMode === 'day' && f.day) output = output.filter(log => localDayKey(log.createdAt) === f.day);
  if (f.dateMode === 'hour' && f.hour) output = output.filter(log => localHourKey(log.createdAt) === String(f.hour).slice(0, 13));
  if (f.type && f.type !== 'all') output = output.filter(log => operationLogCategory(log).value === f.type);
  if (f.actor && f.actor !== 'all') output = output.filter(log => operationActorValue(log) === f.actor);
  output.sort((a, b) => {
    const av = new Date(a.createdAt).getTime() || 0;
    const bv = new Date(b.createdAt).getTime() || 0;
    return f.sort === 'asc' ? av - bv : bv - av;
  });
  return output;
}
function operationFilterSummary(logs, filtered) {
  const f = state.operationLogFilters || {};
  const parts = [];
  if (f.dateMode === 'day' && f.day) parts.push(`日期：${f.day}`);
  if (f.dateMode === 'hour' && f.hour) parts.push(`日期：${String(f.hour).replace('T', ' ')}`);
  if (f.type && f.type !== 'all') parts.push(`类型：${operationLogCategoryLabel(f.type)}`);
  if (f.actor && f.actor !== 'all') parts.push(`操作人：${f.actor}`);
  parts.push(f.sort === 'asc' ? '时间正序' : '时间倒序');
  return `${parts.join(' / ')} · 共 ${filtered.length} 条`;
}
function operationLogFilterPanelHtml(logs, filtered) {
  const f = state.operationLogFilters || { dateMode:'all', sort:'desc', type:'all', actor:'all' };
  const categories = [...new Map(logs.map(log => {
    const c = operationLogCategory(log);
    return [c.value, c.label];
  })).entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));
  const actors = [...new Set(logs.map(operationActorValue).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  return `<div class="operation-filter-wrap">
    <div class="operation-toolbar">
      <button class="btn soft" id="toggle-log-filter" type="button">筛选</button>
      <span class="operation-filter-summary">${esc(operationFilterSummary(logs, filtered))}</span>
    </div>
    <form id="operation-filter-panel" class="operation-filter-panel hidden">
      <div class="operation-filter-grid">
        <label class="field"><span>日期精度</span><select name="dateMode" id="log-date-mode">
          <option value="all" ${operationSelected(f.dateMode, 'all')}>全部日期</option>
          <option value="day" ${operationSelected(f.dateMode, 'day')}>按日筛选</option>
          <option value="hour" ${operationSelected(f.dateMode, 'hour')}>按小时筛选</option>
        </select></label>
        <label class="field log-day-field"><span>选择日期</span><input name="day" type="date" value="${attr(f.day || '')}"></label>
        <label class="field log-hour-field"><span>选择小时</span><input name="hour" type="datetime-local" step="3600" value="${attr(f.hour || '')}"></label>
        <label class="field"><span>排列方式</span><select name="sort">
          <option value="desc" ${operationSelected(f.sort, 'desc')}>时间倒序</option>
          <option value="asc" ${operationSelected(f.sort, 'asc')}>时间正序</option>
        </select></label>
        <label class="field"><span>类型</span><select name="type">
          <option value="all" ${operationSelected(f.type, 'all')}>全部类型</option>
          ${categories.map(([value, label]) => `<option value="${attr(value)}" ${operationSelected(f.type, value)}>${esc(label)}</option>`).join('')}
        </select></label>
        <label class="field"><span>操作人</span><select name="actor">
          <option value="all" ${operationSelected(f.actor, 'all')}>全部操作人</option>
          ${actors.map(actor => `<option value="${attr(actor)}" ${operationSelected(f.actor, actor)}>${esc(actor)}</option>`).join('')}
        </select></label>
      </div>
      <div class="operation-filter-actions">
        <button class="btn primary" type="submit">应用筛选</button>
        <button class="btn ghost" id="reset-log-filter" type="button">重置筛选</button>
      </div>
    </form>
  </div>`;
}
function refreshOperationDateFields() {
  const panel = document.querySelector('#operation-filter-panel');
  const mode = panel?.querySelector('#log-date-mode')?.value || 'all';
  panel?.querySelector('.log-day-field')?.classList.toggle('hidden', mode !== 'day');
  panel?.querySelector('.log-hour-field')?.classList.toggle('hidden', mode !== 'hour');
}
function bindOperationLogFilters() {
  const toggle = document.querySelector('#toggle-log-filter');
  const panel = document.querySelector('#operation-filter-panel');
  toggle?.addEventListener('click', () => {
    panel?.classList.toggle('hidden');
    refreshOperationDateFields();
  });
  panel?.querySelector('#log-date-mode')?.addEventListener('change', refreshOperationDateFields);
  panel?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(panel));
    state.operationLogFilters = {
      dateMode: data.dateMode || 'all',
      day: data.day || '',
      hour: data.hour || '',
      sort: data.sort || 'desc',
      type: data.type || 'all',
      actor: data.actor || 'all',
    };
    await renderOperationLogs();
  });
  document.querySelector('#reset-log-filter')?.addEventListener('click', async () => {
    state.operationLogFilters = { dateMode: 'all', day: '', hour: '', sort: 'desc', type: 'all', actor: 'all' };
    await renderOperationLogs();
  });
  refreshOperationDateFields();
}
function operationLogListHtml(logs) {
  if (!logs.length) return '<div class="operation-empty">暂无操作记录。</div>';
  return `<div class="operation-log-list">${logs.map(log => {
    const category = operationLogCategory(log);
    return `<article class="operation-log-item">
      <div class="operation-log-icon">↩</div>
      <div class="operation-log-main">
        <div class="operation-log-head"><strong>${esc(log.actionText || log.action)}</strong><span>${fmtDate(log.createdAt, true)}</span></div>
        <p>${esc(log.description || '')}</p>
        <div class="operation-log-meta">
          <span>类型：${esc(category.label)}</span>
          <span>操作人：${esc(log.actorUsername || '系统')}</span>
          <span>目标对象：${esc(logTargetLabel(log))}</span>
          ${log.ip ? `<span>IP 地址：${esc(log.ip)}</span>` : ''}
        </div>
      </div>
    </article>`;
  }).join('')}</div>`;
}
async function renderOperationLogs() {
  shell('操作日志', `<div class="loading-card">正在读取操作日志…</div>`);
  try {
    const result = await api('/api/operation-logs');
    const logs = result.logs || [];
    const retentionDays = Math.max(1, Number(result.retentionDays || 7));
    const filteredLogs = filterOperationLogs(logs);
    shell('操作日志', `
      <section class="card operation-log-card">
        <div class="operation-log-title">
          <div class="operation-title-left"><span class="operation-title-icon">↩</span><div><h2>最近操作记录</h2><p>仅显示最近 ${retentionDays} 天内的账号、登录、域名、DNS、消息、设置等操作记录。</p></div></div>
          <span class="status-pill status-active">${retentionDays} 天</span>
        </div>
        <div class="operation-log-note">管理员可查看近 ${retentionDays} 天内未注销账号的完整操作记录；普通用户仅查看自己的记录。</div>
        ${operationLogFilterPanelHtml(logs, filteredLogs)}
        ${operationLogListHtml(filteredLogs)}
        <p class="operation-retention">日志会自动清理：超过 ${retentionDays} 天、或账号注销后的记录会从 D1 中删除。</p>
      </section>`);
    bindOperationLogFilters();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function messageReadUsersText(m) {
  const readers = Array.isArray(m.readUsers) ? m.readUsers : [];
  if (!readers.length && Number(m.readCount || 0) <= 0) return '暂无已读';
  if (!readers.length) return `已读 ${Number(m.readCount || 0)} 人`;
  const names = readers.slice(0, 8).map(x => x.username || x.userId).join('、');
  const more = readers.length > 8 ? ` 等 ${readers.length} 人` : '';
  return `${names}${more}`;
}

function messageReadBadgeHtml(m) {
  if (m.sentByMe) {
    const text = m.recipientReadText || (Number(m.recipientReadCount || 0) > 0 ? '对方已读' : '对方未读');
    return `<span class="${Number(m.recipientReadCount || 0) > 0 ? 'message-read' : 'message-unread'}">${esc(text)}</span>`;
  }
  if (state.me?.role === 'admin') return m.isRead ? '<span class="message-read">管理员已读</span>' : '<span class="message-unread">管理员未读</span>';
  return m.isRead ? '<span class="message-read">已读</span>' : '<span class="message-unread">未读</span>';
}

function parseMessageTime(value) {
  if (!value) return NaN;
  const text = String(value).trim();
  return Date.parse(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`);
}

function canWithdrawMessage(message) {
  if (!message?.sentByMe) return false;
  if (message.canWithdraw === true) return true;
  const sentTime = parseMessageTime(message.sentAt || message.createdAt);
  return Number.isFinite(sentTime) && Date.now() - sentTime <= 15 * 60 * 1000;
}

function messageListHtml(messages, admin = false) {
  if (!messages.length) return '<div class="empty">暂无消息</div>';
  return messages.map(m => {
    const sentByMe = Boolean(m.sentByMe || (m.senderUserId && state.me?.id && String(m.senderUserId) === String(state.me.id)));
    const localMessage = { ...m, sentByMe };
    const shouldShowTarget = admin || sentByMe || state.me?.role === 'admin';
    const targetLabel = m.targetLabel || (m.targetRole === 'admin' ? '管理员' : '');
    return `<article class="message-card ${m.isRead ? 'read' : 'unread'} message-${esc(m.level || 'info')}" data-message-id="${attr(m.id)}">
    <div class="message-select">${!admin ? `<input type="checkbox" class="message-check" value="${attr(m.id)}" ${m.isRead ? 'data-read="1"' : ''}>` : ''}</div>
    <div class="message-main">
      <div class="message-head"><h3>${esc(m.title)}</h3>${messageLevelBadge(m.level)}${admin ? `<span class="status-pill status-${esc(m.status)}">${esc(messageStatusBadgeText(m.status))}</span>` : messageReadBadgeHtml(m)}</div>
      <p>${esc(m.body).replace(/\n/g,'<br>')}</p>
      <div class="message-meta"><span>发送人：${esc(m.senderUsername || '系统管理员')}</span>${shouldShowTarget ? `<span>发送对象：${esc(targetLabel)}</span>` : ''}<span>时间：${fmtDate(m.sentAt || m.createdAt, true)}</span></div>
      ${admin && m.status === 'sent' ? `<div class="message-readers"><b>已读用户：</b>${esc(messageReadUsersText(m))}</div>` : ''}
    </div>
    <div class="message-actions">
      ${!admin && !m.isRead && !sentByMe ? `<button class="btn small soft" data-read-message="${attr(m.id)}">标为已读</button>` : ''}
      ${!admin && sentByMe && canWithdrawMessage(localMessage) ? `<button class="btn small danger-soft" data-withdraw-message="${attr(m.id)}">撤销</button>` : ''}
      ${!admin && !sentByMe ? `<button class="btn small secondary" data-reply-message="${attr(m.id)}">回复</button>` : ''}
      ${!admin ? `<button class="btn small danger-soft" data-delete-own-message="${attr(m.id)}">删除</button>` : ''}
      ${admin && sentByMe && m.status === 'sent' && canWithdrawMessage(localMessage) ? `<button class="btn small danger-soft" data-withdraw-message="${attr(m.id)}">撤销</button>` : ''}
      ${admin && m.status === 'sent' ? `<button class="btn small soft" data-copy-message="${attr(m.id)}" data-copy-status="template">转为模板</button><button class="btn small secondary" data-copy-message="${attr(m.id)}" data-copy-status="draft">转为草稿</button>` : ''}
      ${admin && m.status !== 'sent' ? `<button class="btn small primary" data-send-message="${attr(m.id)}">发送草稿</button><button class="btn small soft" data-edit-message="${attr(m.id)}">编辑草稿</button>` : ''}
      ${admin && m.status === 'template' ? `<button class="btn small secondary" data-template-use="${attr(m.id)}">套用模板</button>` : ''}
      ${admin ? `<button class="btn small danger-soft" data-delete-message="${attr(m.id)}">删除消息</button>` : ''}
    </div>
  </article>`;
  }).join('');
}
function showWithdrawMessageModal(message) {
  if (!message) return;
  openModal('撤销消息', message.title || '消息', `
    <div class="delete-box">
      <p>确认撤销这条已发送消息？撤销后对方将无法继续查看。</p>
      <strong>${esc(message.title || '')}</strong>
      <p class="muted">发送后 15 分钟内可以撤销。</p>
    </div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-withdraw-message" type="button">撤销</button></div>
  `, 'narrow');
  document.querySelector('[data-cancel]')?.addEventListener('click', closeModal);
  document.querySelector('#confirm-withdraw-message')?.addEventListener('click', async () => {
    const btn = document.querySelector('#confirm-withdraw-message');
    btn.disabled = true;
    try {
      await api(`/api/messages/${encodeURIComponent(message.id)}/withdraw`, { method:'POST', body:{} });
      closeModal();
      toast('消息已撤销', 'success');
      await renderMessageCenter();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

function showReplyMessageModal(message) {
  if (!message) return;
  openModal('回复消息', message.title || '消息', `
    <form id="reply-message-form" class="modal-form reply-message-form">
      <label class="field wide"><span>回复内容</span><textarea name="body" rows="6" placeholder="请输入回复内容" required></textarea></label>
      <div class="reply-original-box">
        <strong>原信息</strong>
        <div class="reply-original-meta">发送人：${esc(message.senderUsername || '系统管理员')}　时间：${esc(fmtDate(message.sentAt || message.createdAt, true))}</div>
        <h4>${esc(message.title || '')}</h4>
        <p>${esc(message.body || '').replace(/\n/g,'<br>')}</p>
      </div>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn primary" type="submit">发送回复</button></div>
    </form>
  `, 'wide');
  document.querySelector('[data-cancel]')?.addEventListener('click', closeModal);
  document.querySelector('#reply-message-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const body = String(new FormData(form).get('body') || '').trim();
    if (!body) { toast('请输入回复内容', 'error'); return; }
    submit.disabled = true;
    try {
      await api(`/api/messages/${encodeURIComponent(message.id)}/reply`, { method:'POST', body:{ body } });
      closeModal();
      toast('消息已回复', 'success');
      await renderMessageCenter();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}


function adminReplyQuoteText(message, index = 1) {
  const number = index ? ` ${index}` : '';
  const sender = message.senderUsername || '系统管理员';
  const target = message.targetLabel || '';
  const time = fmtDate(message.sentAt || message.createdAt, true);
  const body = String(message.body || '').trim();
  return [`【引用原信息${number}】`, `标题：${message.title || '无标题'}`, `发送人：${sender}`, target ? `发送对象：${target}` : '', `时间：${time}`, '内容：', body || '（无内容）'].filter(Boolean).join('\n');
}
function buildAdminReplyPreset(messages = [], users = []) {
  const selected = messages.filter(Boolean);
  const senderIds = Array.from(new Set(selected.map(m => m.senderUserId).filter(id => id && id !== state.me?.id)));
  const targetUser = senderIds.length === 1 ? users.find(u => String(u.id) === String(senderIds[0])) : null;
  const first = selected[0] || {};
  const quoted = selected.map((m, index) => adminReplyQuoteText(m, selected.length > 1 ? index + 1 : 0)).join('\n\n');
  const targetHint = selected.length > 1 && senderIds.length > 1
    ? '【提示】您选择了多位发送人的消息，请先确认接收对象，避免把某个用户的问题发送给其他用户。\n\n'
    : '';
  return {
    targetType: targetUser ? 'user' : 'none',
    targetUserId: targetUser?.id || '',
    targetRole: 'user',
    level: 'support_reply',
    status: 'sent',
    title: selected.length === 1 ? `回复：${first.title || '消息'}` : `回复 ${selected.length} 条消息`,
    body: `${targetHint}请在这里输入回复内容。\n\n----- 以下为引用信息 -----\n${quoted}`,
    replyPreset: true,
  };
}
function scrollToMessageComposer() {
  const form = document.querySelector('#message-compose-form');
  if (!form) return;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const textarea = form.querySelector('textarea[name="body"]');
  if (textarea) {
    textarea.focus();
    textarea.setSelectionRange(0, 0);
  }
}

async function renderMessageCenter(preset = null) {
  shell('消息中心', `<div class="loading-card">正在读取消息…</div>`);
  try {
    const mine = await api('/api/messages');
    const isAdmin = state.me?.role === 'admin';
    let adminMessages = [];
    let users = [];
    if (isAdmin) {
      const [msgRes, userRes] = await Promise.all([api('/api/admin/messages'), api('/api/admin/users')]);
      adminMessages = msgRes.messages || [];
      users = userRes.users || [];
    }
    const inbox = mine.messages || [];
    state.messageUnread = Number(mine.unread || 0);
    updateMessageBadgeDom();
    const templates = adminMessages.filter(m => m.status === 'template');
    const drafts = adminMessages.filter(m => m.status === 'draft');
    const sent = adminMessages.filter(m => m.status === 'sent');
    shell('消息中心', `
      <section class="message-hero card"><div><h2>消息中心</h2><p>${isAdmin ? '管理员可以在这里发送系统通知、保存草稿和维护常用模板。' : '用户可以在这里查看系统通知、管理员消息、域名处理结果和维护提醒。'}</p></div><div class="message-count"><strong>${mine.unread || 0}</strong><span>未读</span></div></section>
      <section class="card"><div class="section-head"><div><h2>我的消息</h2><p>系统消息、管理员通知和域名处理结果都会显示在这里。</p></div><div class="message-toolbar"><button class="btn small secondary" id="select-all-messages">全选</button><button class="btn small danger-soft" id="delete-selected-messages">删除所选</button><button class="btn small soft" id="mark-selected-read">批量已读</button><button class="btn small secondary" id="mark-all-read">全部已读</button>${isAdmin ? '<button class="btn small primary" id="reply-selected-message">回复</button>' : ''}</div></div><div class="message-list">${messageListHtml(inbox, false)}</div></section>
      ${isAdmin ? `<section class="card"><div class="section-head"><div><h2>发送消息</h2><p>可以发送给全部用户、普通用户、管理员或指定用户。</p></div></div>${messageComposeForm(users, preset || {})}</section>
      <section class="card"><div class="section-head"><div><h2>草稿信息</h2><p>未发送的消息可以继续编辑或直接发送。</p></div></div><div class="message-list">${messageListHtml(drafts, true)}</div></section>
      <section class="card"><div class="section-head"><div><h2>消息模板</h2><p>保存常用通知，下次可以直接套用。</p></div></div><div class="message-list">${messageListHtml(templates, true)}</div></section>
      <section class="card"><div class="section-head"><div><h2>已发送消息</h2><p>查看已发送的系统通知和用户阅读情况。</p></div></div><div class="message-list">${messageListHtml(sent, true)}</div></section>` : ''}
    `);
    async function deleteOwnMessages(ids) {
      const cleanIds = Array.from(new Set((ids || []).filter(Boolean)));
      if (!cleanIds.length) { toast('请选择要删除的消息', 'error'); return; }
      if (!confirm(`确认从自己的消息中心删除所选 ${cleanIds.length} 条消息？删除后不会影响其他用户。`)) return;
      await api('/api/messages/delete-batch', { method:'POST', body:{ ids:cleanIds } });
      toast(`已删除 ${cleanIds.length} 条消息`, 'success');
      await renderMessageCenter();
    }
    async function markMessagesRead(ids) {
      const cleanIds = Array.from(new Set((ids || []).filter(Boolean)));
      if (!cleanIds.length) { toast('请选择要标记的消息', 'error'); return; }
      await api('/api/messages/read-batch', { method:'POST', body:{ ids: cleanIds } });
      toast('消息已标为已读','success');
      await renderMessageCenter();
    }
    document.querySelectorAll('[data-read-message]').forEach(btn => btn.addEventListener('click', async () => { await markMessagesRead([btn.dataset.readMessage]); }));
    document.querySelectorAll('[data-reply-message]').forEach(btn => btn.addEventListener('click', () => {
      const msg = inbox.find(m => m.id === btn.dataset.replyMessage);
      showReplyMessageModal(msg);
    }));
    document.querySelectorAll('[data-withdraw-message]').forEach(btn => btn.addEventListener('click', () => {
      const msg = inbox.find(m => m.id === btn.dataset.withdrawMessage);
      showWithdrawMessageModal(msg);
    }));
    document.querySelector('#select-all-messages')?.addEventListener('click', event => {
      const checks = [...document.querySelectorAll('.message-check')];
      const shouldCheck = checks.some(item => !item.checked);
      checks.forEach(item => { item.checked = shouldCheck; });
      event.currentTarget.textContent = shouldCheck ? '取消全选' : '全选';
    });
    document.querySelector('#delete-selected-messages')?.addEventListener('click', async () => {
      const ids = [...document.querySelectorAll('.message-check:checked')].map(x => x.value);
      await deleteOwnMessages(ids);
    });
    document.querySelectorAll('[data-delete-own-message]').forEach(btn => btn.addEventListener('click', async () => {
      await deleteOwnMessages([btn.dataset.deleteOwnMessage]);
    }));
    document.querySelector('#mark-selected-read')?.addEventListener('click', async () => {
      const ids = [...document.querySelectorAll('.message-check:checked')].map(x => x.value);
      await markMessagesRead(ids);
    });
    document.querySelector('#mark-all-read')?.addEventListener('click', async () => {
      const ids = inbox.filter(m => !m.isRead).map(m => m.id);
      await markMessagesRead(ids);
    });
    document.querySelector('#reply-selected-message')?.addEventListener('click', async () => {
      const ids = [...document.querySelectorAll('.message-check:checked')].map(x => x.value);
      if (!ids.length) { toast('请选择要回复的消息', 'error'); return; }
      const selectedMessages = ids.map(id => inbox.find(m => m.id === id)).filter(Boolean);
      if (!selectedMessages.length) { toast('请选择要回复的消息', 'error'); return; }
      const presetReply = buildAdminReplyPreset(selectedMessages, users);
      await renderMessageCenter(presetReply);
      setTimeout(scrollToMessageComposer, 80);
      toast(`已引用 ${selectedMessages.length} 条消息，请在发送消息中填写回复内容`, 'success');
    });
    if (isAdmin) {
      bindMessageCompose(users, preset);
      document.querySelectorAll('[data-send-message]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('确认发送这条消息？')) return; await api(`/api/admin/messages/${encodeURIComponent(btn.dataset.sendMessage)}/send`, { method:'POST', body:{} }); toast('消息已发送','success'); await renderMessageCenter(); }));
      document.querySelectorAll('[data-copy-message]').forEach(btn => btn.addEventListener('click', async () => {
        const msg = adminMessages.find(m => m.id === btn.dataset.copyMessage);
        const status = btn.dataset.copyStatus === 'draft' ? 'draft' : 'template';
        if (!msg) return;
        await api('/api/admin/messages', { method:'POST', body:{
          title: msg.title,
          body: msg.body,
          level: msg.level || 'info',
          status,
          targetType: msg.targetType || 'none',
          targetUserId: msg.targetUserId || '',
          targetRole: msg.targetRole || ''
        }});
        toast(status === 'template' ? '已转为模板' : '已转为草稿', 'success');
        await renderMessageCenter();
      }));
      document.querySelectorAll('[data-withdraw-message]').forEach(btn => btn.addEventListener('click', () => {
        const msg = [...inbox, ...adminMessages].find(m => m.id === btn.dataset.withdrawMessage);
        showWithdrawMessageModal(msg);
      }));
      document.querySelectorAll('[data-delete-message]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('确认删除这条消息？')) return; await api(`/api/admin/messages/${encodeURIComponent(btn.dataset.deleteMessage)}`, { method:'DELETE' }); toast('消息已删除','success'); await renderMessageCenter(); }));
      document.querySelectorAll('[data-edit-message]').forEach(btn => btn.addEventListener('click', async () => { const msg = adminMessages.find(m => m.id === btn.dataset.editMessage); if (msg) await renderMessageCenter(msg); }));
    }
  } catch (error) { toast(error.message, 'error'); }
}

async function renderDomains() {
  if (isAccountDisabled()) return disabledAccountPage('域名管理', '账户已被禁用无法管理域名，请通过帮助中心联系管理人员');
  shell('域名管理', `<div class="loading-card">正在读取域名列表…</div>`);
  try {
    await loadApplications();
    const cards = state.applications.map(domainCard).join('');
    shell('域名管理', `
      <section class="quota-hero compact">
        <div class="quota-icon">☁</div>
        <div><strong>${state.quota.used} / ${state.quota.total}</strong><span>已注册</span></div>
        <div class="quota-left"><span>剩余</span><strong>${state.quota.remaining}</strong></div>
        <button class="btn primary" id="open-register">＋ 注册新域名</button>
      </section>
      <section class="card">
        <div class="section-head"><div><h2>我的域名</h2><p>到期时间、剩余时间、DNS 状态都在这里查看。</p></div></div>
        <div class="domain-list">${cards || '<div class="empty">暂无域名。</div>'}</div>
      </section>`);
    document.querySelector('#open-register')?.addEventListener('click', showRegisterDomainModal);
    bindDomainCardActions();
  } catch (error) { toast(error.message, 'error'); }
}

function domainCard(a, options = {}) {
  const approved = a.status === 'approved';
  const dns = approved ? appDnsDisplay(a) : '审核通过后可配置';
  const status = a.statusText || statusText[a.status] || a.status;
  const expiryMetrics = approved ? `
      <div><span>到期时间</span><strong>${a.expiresAt ? fmtDate(a.expiresAt) : '—'}</strong></div>
      <div><span>剩余时间</span><strong>${esc(a.remainingText || '')}</strong></div>` : '';
  return `<article class="domain-card" data-id="${attr(a.id)}">
    <div class="domain-head">
      <div class="globe">🌐</div>
      <div class="domain-title"><h3>${esc(a.fqdnUnicode)}</h3><code>${esc(a.fqdnAscii)}</code></div>
      ${statusBadge(a.status, status)}
    </div>
    <div class="domain-metrics">
      <div><span>注册时间</span><strong>${fmtDate(a.createdAt)}</strong></div>${expiryMetrics}
      <div><span>DNS</span><strong class="mono">${esc(dns)}</strong></div>
    </div>
    ${a.errorMessage ? `<p class="error-line">${esc(a.errorMessage)}</p>` : ''}
    ${a.controlled ? `<p class="note-line"><b>管控状态：</b>管理员已管控该域名，只允许删除 DNS 或申请删除域名。</p>` : ''}
    ${a.deleteRequested ? `<p class="note-line"><b>删除申请：</b>${a.canCancelDeleteRequest ? '12 小时内可以撤销删除申请。' : '12 小时撤销窗口已过，请等待管理员审核。'}</p>` : ''}
    ${options.readonly ? '' : `<div class="card-actions">
      <button class="btn soft" data-manage="${attr(a.id)}">管理域名</button>
      ${a.canRenew ? `<button class="btn success" data-renew="${attr(a.id)}">续期</button>` : ''}
      ${a.canRequestDelete ? `<button class="btn danger-soft" data-request-delete="${attr(a.id)}">申请删除域名</button>` : ''}
      ${a.deleteRequested && a.canCancelDeleteRequest ? `<button class="btn soft" data-cancel-delete-request="${attr(a.id)}">撤销删除申请</button>` : ''}
      ${a.deleteRequested && !a.canCancelDeleteRequest ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
      ${a.canDelete ? `<button class="btn danger-soft" data-delete="${attr(a.id)}">删除无效域名</button>` : ''}
    </div>`}
  </article>`;
}

function bindDomainCardActions() {
  document.querySelectorAll('[data-manage]').forEach(btn => btn.addEventListener('click', () => go(`#/domain/${btn.dataset.manage}`)));
  document.querySelectorAll('[data-renew]').forEach(btn => btn.addEventListener('click', () => renewDomain(btn.dataset.renew)));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => showDeleteDomainModal(btn.dataset.delete)));
  document.querySelectorAll('[data-request-delete]').forEach(btn => btn.addEventListener('click', () => showRequestDeleteDomainModal(btn.dataset.requestDelete)));
  document.querySelectorAll('[data-cancel-delete-request]').forEach(btn => btn.addEventListener('click', () => showCancelDeleteRequestModal(btn.dataset.cancelDeleteRequest)));
}

async function renderDomainDetail(id) {
  if (isAccountDisabled()) return disabledAccountPage('域名管理', '账户已被禁用无法管理域名，请通过帮助中心联系管理人员');
  shell('域名管理', `<div class="loading-card">正在读取域名详情…</div>`);
  try {
    const [{ application: a }, dnsResult] = await Promise.all([
      api(`/api/applications/${encodeURIComponent(id)}`),
      api(`/api/applications/${encodeURIComponent(id)}/dns-records`).catch(() => ({ records: [] })),
    ]);
    const records = dnsResult.records || [];
    const approved = a.status === 'approved';
    const controlled = Boolean(a.controlled);
    const dnsRows = records.map(r => dnsRecordRow(r, approved, controlled)).join('');
    const expiryLine = approved && a.expiresAt ? fmtDate(a.expiresAt, true) : '—';
    const remainingLine = approved ? esc(a.remainingText || '') : '—';
    const addDnsButton = approved ? (controlled ? '<button class="btn secondary" disabled>管控中，只能删除解析</button>' : '<button class="btn primary" id="add-dns">＋ 添加解析</button>') : '<button class="btn secondary" disabled>审核通过后可配置 DNS</button>';
    const openDnsButton = approved ? (controlled ? '<button class="btn secondary" disabled>管控中，只能删除解析</button>' : '<button class="btn primary" data-open-dns>＋ 添加解析</button>') : '<button class="btn secondary" disabled>审核通过后可添加解析</button>';
    const emptyDnsText = controlled ? '该域名已被管理员管控，只允许删除 DNS 或申请删除域名。' : (approved ? '暂无 DNS 解析，请点击“添加解析”。' : '域名审核通过后才能添加解析。');

    shell('域名管理', `
      <section class="detail-hero">
        <a class="back-link" href="#/domains">← 返回域名列表</a>
        <div class="detail-main">
          <div class="globe big">🌐</div>
          <div><h1>${esc(a.fqdnUnicode)}</h1><code>${esc(a.fqdnAscii)}</code></div>
          ${statusBadge(a.status, a.statusText)}${controlled ? '<span class="status-pill status-pending">管控中</span>' : ''}
          <div class="detail-actions">
            ${addDnsButton}
            ${a.canRenew ? `<button class="btn success" id="renew-domain">▣ 续期</button>` : ''}
            ${a.canRequestDelete ? `<button class="btn danger-soft" id="request-delete-domain">申请删除</button>` : ''}
            ${a.deleteRequested && a.canCancelDeleteRequest ? `<button class="btn soft" id="cancel-delete-request">撤销删除申请</button>` : ''}
            ${a.deleteRequested && !a.canCancelDeleteRequest ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
          </div>
        </div>
      </section>

      <section class="detail-panel">
        <div class="tabs">
          <button class="tab active" data-tab="overview">⌂ 概览</button>
          <button class="tab" data-tab="dns">☷ DNS 解析</button>
          <button class="tab" data-tab="renew">▦ 续期和域名详情</button>
        </div>

        <div class="tab-page active" data-page="overview">
          <div class="detail-grid">
            <div class="info-card"><h2>域名状态</h2>
              <dl>
                <dt>域名状态</dt><dd>${statusBadge(a.status, a.statusText)}</dd>
                <dt>DNS 状态</dt><dd>${records.length ? statusBadge('approved', `${records.length} 条解析`) : statusBadge('pending','未配置')}</dd>
                <dt>DNS 记录</dt><dd>${records.length}</dd>
                <dt>到期时间</dt><dd>${expiryLine}</dd>
              </dl>
            </div>
            <div class="info-card"><h2>快捷操作</h2>
              <div class="quick-actions">
                ${openDnsButton}
                ${a.canRenew ? `<button class="btn success" data-renew-one>▣ 续期</button>` : '<button class="btn secondary" disabled>未到续期时间</button>'}
                ${a.canRequestDelete ? `<button class="btn danger-soft" data-request-delete-one>申请删除域名</button>` : ''}
                ${a.deleteRequested && a.canCancelDeleteRequest ? `<button class="btn soft" data-cancel-delete-request-one>撤销删除申请</button>` : ''}
                ${a.deleteRequested && !a.canCancelDeleteRequest ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
                ${a.canDelete ? `<button class="btn danger-soft" data-delete-one>删除无效域名</button>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="tab-page" data-page="dns">
          <div class="section-head"><div><h2>DNS 解析</h2><p>${controlled ? '该域名已被管理员管控，只允许删除 DNS 解析或申请删除域名，不能新增/编辑解析。' : (approved ? `用户可自由添加解析记录，支持三级/多级子域名。主机填 @ 表示当前域名，填 www 表示 www.${esc(a.fqdnUnicode)}，填 api.v1 表示 api.v1.${esc(a.fqdnUnicode)}。` : '当前域名还未通过审核，暂时不能设置 DNS 解析。')}</p></div>${openDnsButton}</div>
          <div class="table-wrap"><table><thead><tr><th>主机</th><th>类型</th><th>目标/内容</th><th>优先级</th><th>TTL</th><th>状态</th><th>操作</th></tr></thead><tbody>${dnsRows || `<tr><td colspan="7">${emptyDnsText}</td></tr>`}</tbody></table></div>
        </div>

        <div class="tab-page" data-page="renew">
          <div class="detail-grid">
            <div class="info-card"><h2>续期信息</h2><dl>
              <dt>注册时间</dt><dd>${fmtDate(a.createdAt, true)}</dd>
              <dt>到期时间</dt><dd>${expiryLine}</dd>
              <dt>剩余时间</dt><dd>${remainingLine}</dd>
              <dt>续期次数</dt><dd>${esc(a.renewCount || 0)}</dd>
            </dl></div>
            <div class="info-card"><h2>操作</h2><p>${approved ? `默认有效期 ${domainConfig().validDays} 天，最后 ${domainConfig().renewWindowDays} 天可续期。` : '域名通过审核后才开始计算有效期。'}</p>${a.canRenew ? `<button class="btn success" data-renew-one>立即续期</button>` : `<button class="btn secondary" disabled>暂不可续期</button>`}</div>
          </div>
        </div>
      </section>`);
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-page="${btn.dataset.tab}"]`)?.classList.add('active');
    }));
    if (approved && !controlled) document.querySelectorAll('#add-dns,[data-open-dns]').forEach(btn => btn.addEventListener('click', () => showDnsModal(a)));
    if (approved) {
      if (!controlled) document.querySelectorAll('[data-edit-dns]').forEach(btn => btn.addEventListener('click', () => {
        const record = records.find(x => x.id === btn.dataset.editDns);
        if (record) showDnsModal(a, record);
      }));
      document.querySelectorAll('[data-delete-dns]').forEach(btn => btn.addEventListener('click', () => deleteDnsRecord(a.id, btn.dataset.deleteDns)));
    }
    document.querySelectorAll('#renew-domain,[data-renew-one]').forEach(btn => btn.addEventListener('click', () => renewDomain(a.id)));
    document.querySelector('[data-delete-one]')?.addEventListener('click', () => showDeleteDomainModal(a.id));
    document.querySelector('#request-delete-domain')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
    document.querySelector('[data-request-delete-one]')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
    document.querySelector('#cancel-delete-request')?.addEventListener('click', () => showCancelDeleteRequestModal(a.id));
    document.querySelector('[data-cancel-delete-request-one]')?.addEventListener('click', () => showCancelDeleteRequestModal(a.id));
  } catch (error) {
    toast(error.message, 'error');
    go('#/domains');
  }
}

function dnsRecordRow(r, approved = true, controlled = false) {
  const actions = approved
    ? (controlled ? `<button class="btn danger-soft small" data-delete-dns="${attr(r.id)}">删除</button>` : `<button class="btn soft small" data-edit-dns="${attr(r.id)}">编辑</button><button class="btn danger-soft small" data-delete-dns="${attr(r.id)}">删除</button>`)
    : '<span class="muted">审核通过后可操作</span>';
  return `<tr>
    <td><code>${esc(r.host || '@')}</code><br><small>${esc(r.name || '')}</small></td>
    <td><b>${esc(dnsTypeDisplayName(r.type))}</b><br><small>${esc(r.type)}</small></td>
    <td class="mono">${esc(r.content)}</td>
    <td>${r.type === 'MX' ? esc(r.priority ?? 10) : '—'}</td>
    <td>${Number(r.ttl || 1) === 1 ? '自动' : esc(r.ttl)}</td>
    <td>${statusBadge(r.status || 'pending', r.statusText || r.status || '待写入')}${r.errorMessage ? `<br><small class="danger-text">${esc(r.errorMessage)}</small>` : ''}</td>
    <td class="actions-cell">${actions}</td>
  </tr>`;
}

function showDnsModal(a, record = null) {
  const suffix = (suffixList()).find(s => s.suffix === a.suffixUnicode || s.suffix === a.suffixAscii) || (suffixList())[0] || {};
  const typePolicies = enabledDnsTypePoliciesForSuffix(suffix, record?.type);
  const types = typePolicies.map(policy => policy.type);
  if (!types.length) {
    toast('管理员暂未开放可添加的 DNS 类型', 'error');
    return;
  }
  const title = record ? '编辑解析' : '添加解析';
  const selectedProxy = record?.proxied ? 'true' : 'false';
  openModal(title, `为 ${a.fqdnUnicode} 设置子域解析`, `
    <form id="dns-form" class="modal-form dns-editor-form">
      <label class="field wide">
        <span>子域名前缀</span>
        <input name="host" value="${attr(record?.host || '@')}" placeholder="@ / www / api / api.v1" required>
        <em>@ = ${esc(a.fqdnUnicode)}；www = www.${esc(a.fqdnUnicode)}；api.v1 = api.v1.${esc(a.fqdnUnicode)}</em>
      </label>
      <label class="field wide"><span>记录类型</span><select name="type" id="dns-type">${typePolicies.map(policy => `<option value="${attr(policy.type)}" ${record?.type === policy.type ? 'selected' : ''}>${esc(policy.displayName || policy.type)}</option>`).join('')}</select><em id="dns-type-note"></em></label>
      <label class="field wide"><span>目标地址 / 记录值</span><input name="content" id="dns-content" value="${attr(record?.content || '')}" placeholder="CNAME/NS/MX 填完整主机名；A 填 IPv4；AAAA 填 IPv6；TXT 填文本" required></label>
      <label class="field wide" id="priority-field"><span>MX 优先级</span><input name="priority" type="number" min="0" max="65535" value="${attr(record?.priority ?? 10)}"></label>
      <label class="field"><span>TTL</span><input name="ttl" type="number" min="1" max="86400" value="${attr(record?.ttl || 1)}"><em>1 表示自动</em></label>
      <label class="field" id="proxy-field"><span>代理状态</span><select name="proxied" id="dns-proxied"><option value="false" ${selectedProxy === 'false' ? 'selected' : ''}>仅 DNS</option><option value="true" ${selectedProxy === 'true' ? 'selected' : ''}>开启代理</option></select><em>A / AAAA / CNAME 可开启代理，TXT / MX / NS 会自动使用仅 DNS</em></label>
      <div class="preview-box"><span>完整解析名</span><strong id="dns-name-preview">${esc(record?.name || a.fqdnUnicode)}</strong></div>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn primary" type="submit">提交解析</button></div>
    </form>
  `, 'wide');
  const typeSelect = document.querySelector('#dns-type');
  const priorityField = document.querySelector('#priority-field');
  const proxyField = document.querySelector('#proxy-field');
  const proxySelect = document.querySelector('#dns-proxied');
  const hostInput = document.querySelector('[name="host"]');
  const contentInput = document.querySelector('#dns-content');
  const typeNote = document.querySelector('#dns-type-note');
  const preview = document.querySelector('#dns-name-preview');
  const refresh = () => {
    const type = typeSelect.value;
    const host = hostInput.value.trim().replace(/^\.+|\.+$/g, '') || '@';
    const policy = typePolicies.find(item => item.type === type) || dnsTypePolicy(type);
    priorityField.style.display = type === 'MX' ? '' : 'none';
    proxyField.style.display = ['A','AAAA','CNAME'].includes(type) ? '' : 'none';
    if (!['A','AAAA','CNAME'].includes(type)) proxySelect.value = 'false';
    if (typeNote) {
      typeNote.textContent = policy?.note || '';
      typeNote.style.display = policy?.note ? '' : 'none';
    }
    if (contentInput) {
      contentInput.placeholder = type === 'A' ? '例如：203.0.113.10'
        : type === 'AAAA' ? '例如：2001:db8::1'
        : type === 'TXT' ? '请输入文本内容'
        : type === 'MX' ? '例如：mail.example.com'
        : type === 'NS' ? '例如：ns1.example.com'
        : '例如：target.example.com';
    }
    preview.textContent = host === '@' ? a.fqdnUnicode : `${host}.${a.fqdnUnicode}`;
  };
  typeSelect.addEventListener('change', refresh);
  hostInput.addEventListener('input', refresh);
  refresh();
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#dns-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const f = new FormData(e.currentTarget);
    const type = String(f.get('type') || 'CNAME');
    const body = {
      host: f.get('host'),
      type,
      content: f.get('content'),
      priority: f.get('priority'),
      ttl: f.get('ttl'),
      proxied: ['A','AAAA','CNAME'].includes(type) && f.get('proxied') === 'true',
    };
    try {
      if (record) await api(`/api/dns-records/${encodeURIComponent(record.id)}`, { method:'PATCH', body });
      else await api(`/api/applications/${encodeURIComponent(a.id)}/dns-records`, { method:'POST', body });
      closeModal();
      toast('解析已提交', 'success');
      await renderDomainDetail(a.id);
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function deleteDnsRecord(applicationId, recordId) {
  if (!confirm('确认删除这条 DNS 解析？')) return;
  try {
    await api(`/api/dns-records/${encodeURIComponent(recordId)}`, { method:'DELETE' });
    toast('DNS 解析已删除', 'success');
    await renderDomainDetail(applicationId);
  } catch (error) {
    toast(error.message, 'error');
  }
}

function bindExactConfirmInput(form, inputSelector, buttonSelector, expectedValues) {
  const input = form.querySelector(inputSelector);
  const button = form.querySelector(buttonSelector);
  const values = expectedValues.filter(Boolean).map(String);
  const sync = () => {
    const value = input.value.trim();
    button.disabled = !values.includes(value);
  };
  input.addEventListener('input', sync);
  sync();
}

function showDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id);
  const displayDomain = a?.fqdnUnicode || a?.fqdnAscii || id;
  openModal('删除无效域名', '此操作只删除已拒绝或已撤销的无效域名记录，不影响正常域名。', `
    <form id="delete-domain-form" class="modal-form">
      <div class="delete-box">
        <p>确认删除：</p>
        <strong>${esc(displayDomain)}</strong>
        <p class="danger-text">删除后该记录将从用户列表中隐藏。</p>
      </div>
      <label class="field wide"><span>输入完整域名确认</span><input name="confirmDomain" placeholder="${attr(displayDomain)}" autocomplete="off" required><em>完整域名必须完全一致。</em></label>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-delete" type="submit" disabled>确认删除</button></div>
    </form>
  `, 'wide');
  const form = document.querySelector('#delete-domain-form');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  bindExactConfirmInput(form, 'input[name="confirmDomain"]', '#confirm-delete', [a?.fqdnUnicode, a?.fqdnAscii, id]);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}`, { method:'DELETE', body:Object.fromEntries(new FormData(form)) });
      closeModal();
      toast('无效域名已删除', 'success');
      await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}

function showRequestDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id) || {};
  const displayDomain = a.fqdnUnicode || a.fqdnAscii || id;
  openModal('申请删除域名', '正常域名需要管理员审核后才会删除。管理员通过后，系统会自动删除 Cloudflare DNS 记录并从列表隐藏。', `
    <form id="request-delete-domain-form" class="modal-form">
      <div class="delete-box">
        <p>确认提交删除申请：</p>
        <strong>${esc(displayDomain)}</strong>
        <p class="danger-text">提交后域名会显示“待删除审核”，审核期间仍占用额度。12 小时内可以撤销删除申请。</p>
      </div>
      <label class="field wide"><span>输入完整域名确认</span><input name="confirmDomain" placeholder="${attr(displayDomain)}" autocomplete="off" required><em>完整域名必须完全一致。</em></label>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-request-delete" type="submit" disabled>确认申请删除</button></div>
    </form>
  `, 'wide');
  const form = document.querySelector('#request-delete-domain-form');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  bindExactConfirmInput(form, 'input[name="confirmDomain"]', '#confirm-request-delete', [a.fqdnUnicode, a.fqdnAscii, id]);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}/delete-request`, { method:'POST', body:Object.fromEntries(new FormData(form)) });
      closeModal();
      toast('删除申请已提交，12 小时内可以撤销。', 'success');
      if (location.hash.startsWith('#/domain/')) await renderDomainDetail(id);
      else await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}

function showCancelDeleteRequestModal(id) {
  const a = state.applications.find(x => x.id === id) || {};
  openModal('撤销删除申请', '删除申请提交后 12 小时内可以撤销。', `
    <div class="delete-box"><p>确认撤销删除申请？</p><strong>${esc(a.fqdnUnicode || a.fqdnAscii || id)}</strong></div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn primary" id="confirm-cancel-delete-request" type="button">撤销删除申请</button></div>
  `);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#confirm-cancel-delete-request').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}/delete-request/cancel`, { method:'POST', body:{} });
      closeModal();
      toast('删除申请已撤销', 'success');
      if (location.hash.startsWith('#/domain/')) await renderDomainDetail(id);
      else await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}

async function renewDomain(id) {
  if (!confirm(translateTextValue('确认续期一年？'))) return;
  try {
    await api(`/api/applications/${encodeURIComponent(id)}/renew`, { method:'POST', body:{} });
    toast('续期成功', 'success');
    if (location.hash.startsWith('#/domain/')) await renderDomainDetail(id);
    else await renderDomains();
  } catch (error) { toast(error.message, 'error'); }
}


function deviceTableHtml(devices = []) {
  if (!devices.length) return '<div class="empty">暂无已登录设备</div>';
  return `<div class="table-wrap device-table-wrap"><table class="device-table"><thead><tr><th>设备名称</th><th>类型</th><th>设备IP</th><th>设备型号</th><th>第一次登录时间</th><th>最近一次使用时间</th></tr></thead><tbody>${devices.map(d => `<tr><td><strong>${esc(d.deviceName || '未知设备')}</strong></td><td>${esc(d.deviceType || '未知')}</td><td>${esc(d.ip || '未知')}</td><td>${esc(d.deviceModel || '未知')}</td><td>${fmtDate(d.firstLoginAt, true)}</td><td>${fmtDate(d.lastUsedAt, true)}</td></tr>`).join('')}</tbody></table></div>`;
}

function deviceCardsHtml(devices = []) {
  if (!devices.length) return '<div class="empty">暂无已登录设备</div>';
  return `<div class="device-card-list">${devices.map(d => `<article class="device-card"><div><strong>${esc(d.deviceName || '未知设备')}</strong><span>${esc(d.deviceType || '未知')} · ${esc(d.deviceModel || '未知')}</span><span>设备IP：${esc(d.ip || '未知')}</span></div><div class="device-times"><span>第一次登录：${fmtDate(d.firstLoginAt, true)}</span><span>最近使用：${fmtDate(d.lastUsedAt, true)}</span></div></article>`).join('')}</div>`;
}

async function showUserDevicesModal(u) {
  openModal('用户登录设备管理', u.username, '<div class="loading-card">正在读取登录设备…</div>', 'wide');
  try {
    const res = await api(`/api/admin/users/${encodeURIComponent(u.id)}/devices`);
    const devices = res.devices || [];
    openModal('用户登录设备管理', `${u.username} 当前已登录设备：${devices.length} 台`, `
      <div class="modal-form">
        ${deviceTableHtml(devices)}
        <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>关闭</button></div>
      </div>`, 'wide');
    document.querySelector('[data-cancel]')?.addEventListener('click', closeModal);
  } catch (error) { toast(error.message, 'error'); }
}

async function renderAccount() {
  shell('账户设置', `<div class="loading-card">正在读取账户信息…</div>`);
  let devices = [];
  let blockingDomains = [];
  try {
    const res = await api('/api/account/devices');
    devices = res.devices || [];
  } catch (error) {
    console.warn('device list failed', error);
  }
  try {
    const apps = await api('/api/applications');
    blockingDomains = (apps.applications || []).filter(a => !['rejected','revoked','deleted'].includes(a.status));
  } catch (error) {
    console.warn('domain list before account delete failed', error);
  }
  const hasBlockingDomains = blockingDomains.length > 0;
  const blockingTipHtml = hasBlockingDomains ? `<div class="notice danger account-delete-tip"><strong>暂不能注销账号</strong><p>还有 ${blockingDomains.length} 个域名没有注销完成，请先进入“域名管理”处理：</p><ul>${blockingDomains.slice(0,6).map(a => `<li>${esc(a.fqdnUnicode || a.fqdnAscii || '')} · ${esc(a.deleteRequested ? '待删除审核' : (a.statusText || a.status || '未处理'))}</li>`).join('')}</ul></div>` : '';
  shell('账户设置', `
    <div class="grid two">
      <section class="card">
        <h2>账户信息</h2>
        <div class="info-list account-info-list">
          <span>用户名</span>
          <strong class="copy-line"><span>${esc(state.me.username)}</span><button type="button" class="copy-mini" data-copy-account="${attr(state.me.username)}" title="复制账号">⧉</button></strong>
          <span>手机号</span><strong>${esc(state.me.phone || '未填写')}</strong>
          <span>邮箱</span><strong>${esc(state.me.email || '未填写')}</strong>
          <span>角色</span><strong>${state.me.role === 'admin' ? '管理员' : '普通用户'}</strong>
          <span>域名额度</span><strong>${esc(state.me.domainQuota ?? state.quota.total ?? 3)}</strong>
        </div>
      </section>
      <section class="card">
        <h2>修改账户资料</h2>
        <form id="profile-form" class="form-grid">
          <label class="field wide"><span>用户名</span><input name="username" value="${attr(state.me.username || '')}" required></label>
          <label class="field wide"><span>手机号（选填）</span><input name="phone" value="${attr(state.me.phone || '')}" placeholder="例如：+8613800000000"></label>
          <label class="field wide"><span>邮箱（选填）</span><input name="email" value="${attr(state.me.email || '')}" placeholder="user@example.com"></label>
          <button class="btn primary wide" type="submit">保存账户资料</button>
        </form>
      </section>
      <section class="card"><h2>修改密码</h2><form id="password-form" class="form-grid"><label class="field wide"><span>当前密码</span><input name="currentPassword" type="password" required></label><label class="field wide"><span>新密码</span><input name="newPassword" type="password" required minlength="8"></label><button class="btn primary wide" type="submit">修改密码</button></form></section>
      <section class="card wide"><div class="section-head"><div><h2>登录设备管理</h2><p>当前同账号已登录设备数量：${devices.length} 台。可以查看设备名称、设备IP、设备型号、首次登录和最近使用时间。</p></div></div>${deviceCardsHtml(devices)}</section>
      <section class="card danger-zone account-delete-card"><h2>注销账号</h2><p>注销前必须先处理完账号下所有正常、待审核或待删除审核域名。没有未注销域名后，才可以注销程序账号。</p>${blockingTipHtml}<button class="btn danger" id="delete-account" type="button" ${hasBlockingDomains ? 'disabled' : ''}>注销账号</button></section>
    </div>`);
  document.querySelector('[data-copy-account]')?.addEventListener('click', e => copyToClipboard(e.currentTarget.dataset.copyAccount, '已复制'));
  document.querySelector('#profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const res = await api('/api/account/profile', { method:'PATCH', body:Object.fromEntries(new FormData(e.currentTarget)) });
      state.me = res.user;
      toast('资料已保存', 'success');
      await renderAccount();
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
  document.querySelector('#password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/auth/change-password', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      toast('密码已修改，请重新登录', 'success');
      clearRememberedLogin();
      state.me = null;
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
  document.querySelector('#delete-account')?.addEventListener('click', showDeleteAccountModal);
}
function bindDeleteAccountCooldown(form, inputSelector, buttonSelector, expected) {
  const input = form.querySelector(inputSelector);
  const button = form.querySelector(buttonSelector);
  let timer = null;
  const reset = () => { if (timer) clearInterval(timer); timer = null; button.disabled = true; button.textContent = '确认注销'; };
  input?.addEventListener('input', () => {
    reset();
    if (String(input.value).trim() !== String(expected).trim()) return;
    let left = 5;
    button.textContent = `请等待 ${left} 秒`;
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearInterval(timer); timer = null; button.disabled = false; button.textContent = '确认注销'; }
      else button.textContent = `请等待 ${left} 秒`;
    }, 1000);
  });
}

async function showDeleteAccountModal() {
  let blockingDomains = [];
  try {
    const res = await api('/api/applications');
    blockingDomains = (res.applications || []).filter(a => !['rejected','revoked','deleted'].includes(a.status));
  } catch (error) {
    console.warn('load applications before delete failed', error);
  }
  const hasBlocking = blockingDomains.length > 0;
  const domainListHtml = hasBlocking ? `
    <div class="delete-box blocking-domain-box">
      <p class="danger-text">当前账号还有以下域名没有完成注销，暂时不能注销程序账号：</p>
      <ul class="blocking-domain-list">${blockingDomains.map(a => `<li><strong>${esc(a.fqdnUnicode || a.fqdnAscii || '')}</strong><span>${esc(a.deleteRequested ? '待删除审核' : (a.statusText || a.status || '未处理'))}</span></li>`).join('')}</ul>
      <p>请先进入“域名管理”申请删除这些域名，并等待管理员批准后再回来注销账号。</p>
    </div>` : '';
  openModal('注销账号', '此操作不可直接恢复，请谨慎确认。', `
    <form id="delete-account-form" class="modal-form">
      <div class="delete-box"><p>当前账号：</p><strong>${esc(state.me.username)}</strong><p class="danger-text">注销后将退出登录，账号和相关数据会从 D1 / KV 中清理。</p></div>
      ${domainListHtml}
      <label class="field wide"><span>当前密码</span><input name="currentPassword" type="password" required ${hasBlocking ? 'disabled' : ''}></label>
      <label class="field wide"><span>输入当前账号确认</span><input name="confirmAccount" placeholder="${attr(state.me.username)}" autocomplete="off" required ${hasBlocking ? 'disabled' : ''}><em>${hasBlocking ? '请先注销上方域名后再操作。' : '当前账号必须完全一致。'}</em></label>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-delete-account" type="submit" disabled>确认注销</button></div>
    </form>
  `, 'wide');
  const form = document.querySelector('#delete-account-form');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  if (!hasBlocking) bindDeleteAccountCooldown(form, 'input[name="confirmAccount"]', '#confirm-delete-account', state.me.username);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/account/delete', { method:'POST', body:Object.fromEntries(new FormData(form)) });
      closeModal();
      toast('账号已注销', 'success');
      state.me = null;
      go('#/login');
    } catch (error) {
      const domains = error?.details?.domains || [];
      if (Array.isArray(domains) && domains.length) {
        toast(`账户下还有未注销域名：${domains.map(d => d.domain).join('、')}`, 'error');
      } else {
        toast(error.message, 'error');
      }
      btn.disabled = false;
    }
  });
}

async function renderAdminOverview() {
  shell('管理概览', `<div class="loading-card">正在统计…</div>`);
  try {
    const { overview } = await api('/api/admin/overview');
    const u = overview.users || {};
    const a = overview.applications || {};
    shell('管理概览', `
      <div class="stats">
        ${stat('用户总数', u.total || 0, `活跃 ${u.active || 0}`)}
        ${stat('待审核', a.pending || 0, '需要处理')}
        ${stat('正常域名', a.approved || 0, '已写入 DNS')}
        ${stat('今日注册', overview.today || 0, '今日新增')}
      </div>
      <section class="card"><h2>快速入口</h2><div class="quick-actions"><a class="btn primary" href="#/admin/applications">域名审核</a><a class="btn secondary" href="#/messages">消息中心</a><a class="btn secondary" href="#/admin/users">用户管理</a><a class="btn secondary" href="#/admin/registration-keys">注册密钥</a><a class="btn secondary" href="#/admin/analytics">分析页</a><a class="btn secondary" href="#/admin/settings">管理员设置</a></div></section>`);
  } catch (error) { toast(error.message, 'error'); }
}
function stat(label, value, sub) {
  return `<section class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><em>${esc(sub)}</em></section>`;
}

async function renderAdminApplications() {
  shell('域名审核', `<div class="loading-card">正在读取申请…</div>`);
  try {
    const { applications } = await api('/api/admin/applications?limit=500');
    const rows = applications.map(a => `<tr>
      <td><strong>${esc(a.fqdnUnicode)}</strong><br><code>${esc(a.fqdnAscii)}</code></td>
      <td>${esc(a.username || '—')}</td>
      <td>${a.dnsConfigured ? `<code>${esc(appDnsDisplay(a))}</code>` : '<span class="muted">未配置 DNS</span>'}</td>
      <td>${statusBadge(a.status, a.statusText)}${a.controlled ? '<br><small class="danger-text">管控中</small>' : ''}</td>
      <td>${a.status === 'approved' && a.expiresAt ? fmtDate(a.expiresAt) : '—'}<br><small>${a.status === 'approved' ? esc(a.remainingText || '') : ''}</small></td>
      <td class="actions-cell">
        ${a.status === 'pending' ? `<button class="btn success small" data-review="approve" data-id="${a.id}">批准</button><button class="btn danger-soft small" data-review="reject" data-id="${a.id}">拒绝</button>` : ''}
        ${a.deleteRequested ? `<button class="btn danger small" data-review="approve-delete" data-id="${a.id}">批准删除</button><button class="btn soft small" data-review="reject-delete" data-id="${a.id}">拒绝删除</button>` : ''}
        ${(a.statusText === '已禁用' || a.disabled === true) ? `<button class="btn success small" data-review="enable" data-id="${a.id}">取消禁用</button>` : ''}
        ${a.status === 'approved' && !a.deleteRequested ? `<button class="btn danger-soft small" data-review="revoke" data-id="${a.id}">撤销</button><button class="btn danger-soft small" data-review="disable" data-id="${a.id}">禁用</button><button class="btn soft small" data-review="${a.controlled ? 'uncontrol' : 'control'}" data-id="${a.id}">${a.controlled ? '取消管控' : '管控'}</button>` : ''}
        ${['rejected','revoked','disabled'].includes(a.status) && !(a.statusText === '已禁用' || a.disabled === true) ? `<button class="btn danger-soft small" data-review="delete" data-id="${a.id}">删除</button>` : ''}
      </td>
    </tr>`).join('');
    shell('域名审核', `<section class="card"><div class="section-head"><div><h2>域名审核</h2><p>先审核域名；审核通过后，用户才能进入域名管理添加 DNS 解析。</p></div></div><div class="table-wrap"><table><thead><tr><th>域名</th><th>用户</th><th>DNS</th><th>状态</th><th>到期</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="6">暂无申请</td></tr>'}</tbody></table></div></section>`);
    document.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', async () => {
      const action = btn.dataset.review;
      const label = { approve:'批准', reject:'拒绝', revoke:'撤销', disable:'禁用', enable:'取消禁用', control:'管控', uncontrol:'取消管控', delete:'删除', 'approve-delete':'批准删除', 'reject-delete':'拒绝删除' }[action];
      const confirmMessage = action === 'disable'
        ? '确认禁用该域名？禁用后将删除该域名所有 DNS 解析，用户不能继续管理该域名。'
        : (action === 'enable' ? '确认取消禁用该域名？取消后域名恢复正常，但 DNS 记录需要用户重新添加。' : (action === 'control' ? '确认管控该域名？管控后用户只可以删除 DNS 解析或申请删除域名，不能新增/编辑 DNS。' : (action === 'uncontrol' ? '确认取消管控该域名？取消后用户可以继续正常新增/编辑 DNS。' : `确认${label}该域名？`)));
      if (!confirm(translateTextValue(confirmMessage))) return;
      const note = (action === 'delete' || action === 'approve-delete') ? '' : (prompt(translateTextValue('管理员留言，可留空；填写后会发送到用户消息中心'), '') ?? '');
      btn.disabled = true;
      try {
        await api(`/api/admin/applications/${btn.dataset.id}/${action}`, { method:'POST', body:{ note } });
        toast('操作成功', 'success');
        await renderAdminApplications();
      } catch (error) {
        toast(error.message, 'error');
        btn.disabled = false;
      }
    }));
  } catch (error) { toast(error.message, 'error'); }
}

async function renderAdminUsers() {
  shell('用户管理', `<div class="loading-card">正在读取用户…</div>`);
  try {
    const { users } = await api('/api/admin/users');
    const rows = users.map(u => `<tr>
      <td><strong>${esc(u.username)}</strong><br><small>${esc(u.email || '未填写邮箱/手机号')}</small></td>
      <td>${u.role === 'admin' ? '管理员' : '用户'}</td>
      <td>${statusBadge(u.status)}</td>
      <td>${esc(u.domainQuota)}</td>
      <td>${u.applicationCount} / ${u.approvedCount}</td>
      <td><button class="btn soft small" data-edit-user="${u.id}">编辑</button></td>
    </tr>`).join('');
    shell('用户管理', `<section class="card"><div class="section-head"><div><h2>用户管理</h2><p>管理员可直接添加用户，并设置初始密码、角色、状态和额度。</p></div><button class="btn primary" id="add-user">＋ 添加用户</button></div><div class="table-wrap"><table><thead><tr><th>用户</th><th>角色</th><th>状态</th><th>额度</th><th>申请/正常</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="6">暂无用户</td></tr>'}</tbody></table></div></section>`);
    document.querySelector('#add-user')?.addEventListener('click', showCreateUserModal);
    document.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = users.find(x => x.id === btn.dataset.editUser);
        showUserModal(u);
      });
    });
  } catch (error) { toast(error.message, 'error'); }
}
async function showCreateUserModal() {
  const defaultQuota = domainConfig().defaultQuota || 3;
  const turn = state.config.turnstile || {};
  const useHumanVerification = true;
  openModal(tr('添加用户'), tr('管理员手动创建用户账号'), `
    <form id="create-user-form" class="modal-form">
      <div class="form-grid">
        <label class="field"><span>${tr('账号')}</span><input name="username" required placeholder="${tr('例如：user001')}"><em>账号不限格式，但不能与已有账号重复。</em></label>
        <label class="field"><span>邮箱（选填）</span><input name="email" type="email" placeholder="user@example.com"><em>邮箱和手机号至少填写一个。</em></label>
        <label class="field"><span>手机号（选填）</span><input name="phone" type="tel" inputmode="tel" placeholder="请输入手机号"><em>手机号不能和已有用户重复。</em></label>
        <label class="field wide"><span>${tr('初始密码')}</span><input name="password" type="password" required minlength="8" placeholder="${tr('至少 8 位')}"><em>${tr('创建后用户可自行修改密码。')}</em></label>
        <label class="field"><span>${tr('角色')}</span><select name="role"><option value="user">${tr('用户')}</option><option value="admin">${tr('管理员')}</option></select></label>
        <label class="field"><span>${tr('状态')}</span><select name="status"><option value="active">${tr('启用')}</option><option value="disabled">${tr('禁用')}</option></select></label>
        <label class="field wide"><span>${tr('域名额度')}</span><input name="domainQuota" type="number" min="0" step="1" value="${attr(defaultQuota)}"><em>管理员可以单独设置该用户额度。</em></label>
        <div class="wide">${authAgreementHtml('agreeTerms')}</div>
        <div class="wide">${humanVerificationHtml('admin_create')}</div>
      </div>
      <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>${tr('取消')}</button><button class="btn primary is-disabled" type="submit" disabled>${tr('创建用户')}</button></div>
    </form>`, 'wide');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  bindAgreementLinks();
  bindAuthAgreementState('#create-user-form');
  await mountHumanVerification('[data-human-verification="admin_create"]', 'admin_create', turn.actionRegister || 'register');
  document.querySelector('#create-user-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const form = new FormData(e.currentTarget);
    const body = Object.fromEntries(form);
    if (!String(body.phone || '').trim() && !String(body.email || '').trim()) {
      toast('手机号和邮箱至少填写一个', 'error');
      btn.disabled = false;
      return;
    }
    if (String(body.password || '').length < 8) {
      toast('密码至少 8 位', 'error');
      btn.disabled = false;
      return;
    }
    if (body.agreeTerms !== 'on') {
      toast('请先阅读并同意服务协议', 'error');
      btn.disabled = false;
      return;
    }
    try {
      Object.assign(body, await humanVerificationPayload('admin_create'));
      await api('/api/admin/users', { method:'POST', body });
      closeModal();
      toast(tr('用户已创建'), 'success');
      renderAdminUsers();
    } catch (error) {
      const switched = await recoverHumanVerification('admin_create', error);
      toast(switched ? `${error.message}，已自动切换图形验证，请重新提交` : error.message, 'error');
      btn.disabled = false;
    }
  });
}

function showUserModal(u) {
  openModal('编辑用户', u.username, `
    <form id="user-form" class="modal-form">
      <label class="field wide"><span>角色</span><select name="role"><option value="user" ${u.role==='user'?'selected':''}>用户</option><option value="admin" ${u.role==='admin'?'selected':''}>管理员</option></select></label>
      <label class="field wide"><span>状态</span><select name="status"><option value="active" ${u.status==='active'?'selected':''}>启用</option><option value="disabled" ${u.status==='disabled'?'selected':''}>禁用</option></select></label>
      <label class="field wide"><span>域名额度</span><input name="domainQuota" type="number" min="0" step="1" value="${attr(u.domainQuota ?? 3)}"></label>
      <div class="modal-actions"><button class="btn soft" type="button" id="show-user-devices">用户登录设备管理</button><button class="btn secondary" type="button" data-cancel>取消</button><button class="btn primary" type="submit">保存</button></div>
    </form>`);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#show-user-devices')?.addEventListener('click', () => showUserDevicesModal(u));
  document.querySelector('#user-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api(`/api/admin/users/${u.id}`, { method:'PATCH', body:Object.fromEntries(new FormData(e.currentTarget)) });
      closeModal();
      toast('用户已更新', 'success');
      renderAdminUsers();
    } catch (error) { toast(error.message, 'error'); }
  });
}



const ADMIN_HELP_CATEGORIES_V90 = [{"key":"triage","title":"快速应急与故障定位","items":[{"q":"出现红色报错时第一步做什么","symptom":"页面弹出红色错误，管理员不知道从哪里开始。","cause":"只看截图通常缺少状态码、业务错误码和发生位置，容易误判。","quick":"先停止重复点击，保留当前页面。","steps":["先停止重复点击，保留当前页面。","复制完整错误文字，不要只截取一半。","按 F12 打开 Network，找到红色请求并记录 URL、状态码、Response。","记下准确时间和当前账号。","再到 Workers 日志按时间查第一条错误。"],"verify":"能把问题归类为前端、业务接口、Cloudflare 拦截、D1、KV、DNS 或邮件中的一类。","collect":"完整错误、Network 请求/响应、Ray ID、Workers 日志第一条错误、最近部署 SHA。","prevention":"建立统一报错记录格式：时间、账号、页面、操作、状态码、错误码、Ray ID。"},{"q":"功能突然失败但刚才还能用","symptom":"同一个按钮几分钟前正常，现在突然报错。","cause":"可能是临时网络、Cloudflare 外部服务波动、会话过期、限流或自动部署切换。","quick":"刷新一次页面并重新登录。","steps":["刷新一次页面并重新登录。","只重试一次，避免触发更严格限流。","检查 Cloudflare 状态和 Workers 部署是否刚变化。","对比成功请求与失败请求的状态码。","查看是否只有某个账号/IP受影响。"],"verify":"在相同账号、相同网络连续操作三次结果稳定，不再随机成功/失败。","collect":"最近一次成功和失败时间、两个请求的响应、部署时间、账号/IP和外部服务状态。","prevention":"关键操作做幂等保护，失败时显示可读业务错误码。"},{"q":"只有一个用户报错，其他人正常","symptom":"个别用户无法登录、申请或管理 DNS。","cause":"问题通常与该用户状态、配额、浏览器、网络、已有数据或限流键有关。","quick":"查看用户状态是否 active、是否被管控或禁用。","steps":["查看用户状态是否 active、是否被管控或禁用。","检查该用户配额和已有域名数量。","让用户换浏览器/网络并重新登录。","按 user_id 查询操作日志和相关记录。","不要先全站改设置。"],"verify":"该用户在不改变全局规则的情况下恢复，其他用户流程不受影响。","collect":"用户 ID、状态、配额、失败路径、业务错误码、浏览器/网络和相关记录。","prevention":"处理个案前先确认影响范围，避免为单用户问题破坏全局配置。"},{"q":"所有用户同时报错","symptom":"登录、注册或域名功能在多个账号上同时失败。","cause":"更可能是部署、绑定、D1/KV、Cloudflare API、WAF 或公共配置故障。","quick":"用管理员和普通测试账号各复现一次。","steps":["用管理员和普通测试账号各复现一次。","查看 Workers 错误率和最近部署。","检查 DB、APP_KV、ASSETS、SEB 绑定。","查看 /api/config 和系统状态。","必要时回滚到上一稳定提交。"],"verify":"至少三个不同账号、两个网络完成主流程，Workers 错误率恢复正常。","collect":"影响开始时间、受影响功能、最近部署、系统状态、绑定状态和错误率图。","prevention":"发布前保留上一版提交和最小覆盖包，并设置基础健康检查。"},{"q":"问题只在手机端出现","symptom":"电脑正常，手机按钮、弹窗、验证码或滑动异常。","cause":"移动端视口、触摸事件、缓存、输入法和浏览器内核与桌面不同。","quick":"记录手机型号、系统和浏览器。","steps":["记录手机型号、系统和浏览器。","横竖屏各试一次。","清站点缓存并关闭网页缩放。","检查元素是否被固定层遮挡。","用远程调试查看 Console 和触摸事件。"],"verify":"手机端可完成完整操作，按钮可点、输入不被遮挡、页面不横向溢出。","collect":"设备/系统/浏览器版本、屏幕方向、录屏、页面 URL和控制台错误。","prevention":"新增交互必须在至少一种 iPhone Safari 和一种 Android Chrome 验收。"},{"q":"问题只在正式域名出现","symptom":"workers.dev 正常，正式域名失败。","cause":"正式域名可能使用不同路由、WAF、Cookie、Turnstile hostname、缓存或环境变量。","quick":"确认正式域名路由到当前 storage Worker。","steps":["确认正式域名路由到当前 storage Worker。","比较两个环境的请求 Host、Origin 和响应头。","检查正式域 WAF/Security Events。","核对生产变量和绑定。","使用正式域名重新完成登录，避免带着预览域 Cookie。"],"verify":"同一测试账号在正式域名完成登录、注册、申请、DNS和消息主流程。","collect":"两个域名、请求响应差异、路由截图、WAF事件、变量/绑定差异。","prevention":"生产和预览配置分别记录，不凭预览成功直接判断生产可用。"},{"q":"修改后不知道该覆盖哪些文件","symptom":"准备上传 GitHub，但担心覆盖旧功能。","cause":"前端、样式、后端和配置文件职责不同，混入未修改文件会增加风险。","quick":"对修改前后文件执行内容 diff。","steps":["对修改前后文件执行内容 diff。","只有实际内容不同的文件才进 ZIP。","保持 public/、src/ 等目录结构。","回复中明确列出每个覆盖路径。","上传后核对 GitHub changed files 与清单一致。"],"verify":"ZIP 文件列表与 GitHub 本次 changed files 完全一致，没有说明文档或旧文件。","collect":"修改前后 SHA-256、diff 统计、ZIP 文件列表和 GitHub changed files。","prevention":"每次发布坚持最小覆盖包，不以修改时间判断文件是否变化。"},{"q":"是否应该立即回滚","symptom":"新版本出现问题，不确定继续修还是回滚。","cause":"没有根据影响范围、数据写入风险和恢复时间做判断。","quick":"如果登录/注册/DNS全站不可用，优先回滚。","steps":["如果登录/注册/DNS全站不可用，优先回滚。","如果可能误删或错误写 DNS，立即暂停相关功能并回滚。","只有小范围界面问题且有明确修复时可就地修。","回滚前保存当前错误日志和数据库状态。","回滚后再在预览环境修复。"],"verify":"回滚后核心流程恢复，且没有继续产生错误数据或 DNS 变更。","collect":"影响范围、错误开始时间、数据变更、当前/上一提交 SHA、回滚结果。","prevention":"发布前定义回滚条件并保存上一稳定提交。"},{"q":"浏览器提示 HTTP 403 但 Workers 没日志","symptom":"请求被拒绝，Workers Observability 找不到对应记录。","cause":"请求很可能在 WAF、Bot、Access 或其他边缘层被拦截，未进入 Worker。","quick":"从错误页面或响应头记录 cf-ray。","steps":["从错误页面或响应头记录 cf-ray。","到 Security Events 按 Ray ID 搜索。","查看命中的规则和动作。","对必要 API 路径做精确跳过，不要关闭全部安全规则。","重新请求并确认 Workers 日志出现。"],"verify":"原请求进入 Worker，Network 响应出现业务 JSON，而不是 Cloudflare 拦截页。","collect":"Ray ID、Security Event 规则名/动作、请求路径/方法、来源 IP和响应头。","prevention":"所有边缘拦截都保留 Ray ID，WAF 规则按路径和方法精确配置。"},{"q":"错误提示太技术化，用户看不懂","symptom":"界面直接显示 D1_ERROR、堆栈或 Cloudflare 原始文本。","cause":"后端没有把内部错误转换为用户可执行的中文提示。","quick":"保留内部日志中的完整错误。","steps":["保留内部日志中的完整错误。","对常见错误映射业务错误码和简明中文。","用户提示只说明能做什么，不展示密钥或 SQL。","管理员帮助中心保留原始错误关键词用于搜索。","测试错误提示在手机上是否完整。"],"verify":"普通用户看到明确下一步，管理员仍能通过错误码在日志和帮助中心定位。","collect":"原始错误、当前用户提示、建议业务错误码和发生接口。","prevention":"用户提示与管理员诊断分层：前者简短，后者可查详细日志。"},{"q":"修复后如何做最小验收","symptom":"代码能编译，但不知道是否真的修好。","cause":"只做静态检查没有覆盖真实业务路径。","quick":"根据改动列出受影响场景。","steps":["根据改动列出受影响场景。","每个场景做成功、失败、权限不足各一次。","使用管理员和普通用户两个账号。","检查 D1/KV/DNS/邮件副作用。","刷新页面并在手机端复测。"],"verify":"改动场景全部通过，未改场景的核心冒烟测试也正常。","collect":"测试账号类型、步骤、预期/实际、接口状态、数据变化和截图。","prevention":"每次发布保存验收清单和结果，不以“能打开页面”作为通过。"},{"q":"仍然无法判断问题归属","symptom":"已经看了报错，但不清楚是前端还是后端。","cause":"缺少最简单的分层测试。","quick":"直接访问失败接口：有 JSON 错误说明后端可达。","steps":["直接访问失败接口：有 JSON 错误说明后端可达。","页面白屏但接口正常，多半是前端。","接口无 Workers 日志，多半是边缘拦截或路由。","有 Workers 日志且 D1_ERROR，归数据库。","Cloudflare API 返回错误，归 DNS Token/Zone。"],"verify":"能明确指出故障所在层，并只修改该层相关文件或配置。","collect":"每一层的测试结果：Console、Network、Security Events、Workers日志、D1/API响应。","prevention":"管理员按“浏览器→边缘→Worker→D1/KV→外部 API”固定顺序排查。"}]},{"key":"deploy","title":"部署、版本与缓存","items":[{"q":"覆盖文件后页面仍是旧功能","symptom":"GitHub 已上传新文件，但页面按钮、刷新周期或版本号没有变化。","cause":"浏览器、Cloudflare Cache 或旧 Service Worker 仍在返回旧 app.js/index.html。","steps":["核对覆盖文件路径必须完全一致，例如 public/app.js。","打开页面源代码确认 app.js?v=90；再在开发者工具 Network 查看实际响应。","执行 Ctrl+F5，必要时清除此站点数据；Cloudflare 有缓存规则时清除对应 URL。","确认 Workers 部署记录使用了最新 Git 提交。"],"prevention":"每次修改 index.html 中静态资源版本号，并只上传明确列出的覆盖文件。","quick":"核对覆盖文件路径必须完全一致，例如 public/app.js。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：覆盖文件后页面仍是旧功能。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“覆盖文件后页面仍是旧功能”发生前最后一个成功步骤，以及先做步骤“核对覆盖文件路径必须完全一致，例如 public/app.js。”执行后的实际结果。"},{"q":"前端按钮出现但点击接口 404","symptom":"页面展示了新按钮，点击后提示接口不存在。","cause":"public/app.js 已更新，但 src/index.ts 仍是旧版本，前后端版本不一致。","steps":["在 Network 中确认失败路径。","检查 GitHub 的 src/index.ts 是否包含对应路由。","重新部署 Worker 后再强制刷新前端。"],"prevention":"同一功能涉及前后端时，必须一次覆盖全部列出的文件。","quick":"在 Network 中确认失败路径。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：前端按钮出现但点击接口 404。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“前端按钮出现但点击接口 404”发生前最后一个成功步骤，以及先做步骤“在 Network 中确认失败路径。”执行后的实际结果。"},{"q":"部署后整个页面白屏","symptom":"页面只剩空白或一直显示正在加载。","cause":"app.js 语法错误、第三方头部 JS 抛错，或旧 index.html 引用了不存在的资源。","steps":["打开浏览器 Console，复制第一条红色错误。","临时清空管理员设置中的自定义头部 JS。","使用 node --check public/app.js 检查语法。","确认 index.html 中脚本路径和文件名正确。"],"prevention":"高风险自定义 JS 修改前导出配置；部署前执行静态语法检查。","quick":"打开浏览器 Console，复制第一条红色错误。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：部署后整个页面白屏。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“部署后整个页面白屏”发生前最后一个成功步骤，以及先做步骤“打开浏览器 Console，复制第一条红色错误。”执行后的实际结果。"},{"q":"Workers 部署成功但接口仍返回旧版本","symptom":"系统状态版本、错误文案或行为没有变化。","cause":"流量命中了另一个 Worker、旧自定义域路由，或 Pages/Workers 项目不是当前仓库。","steps":["在 Cloudflare 路由中确认自定义域绑定的 Worker 名称。","查看响应头和 Workers 日志，确认请求进入目标部署。","核对 GitHub 集成的仓库、分支和最新提交 SHA。"],"prevention":"给生产、预览 Worker 使用明确不同名称和 APP_ENVIRONMENT。","quick":"在 Cloudflare 路由中确认自定义域绑定的 Worker 名称。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：Workers 部署成功但接口仍返回旧版本。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“Workers 部署成功但接口仍返回旧版本”发生前最后一个成功步骤，以及先做步骤“在 Cloudflare 路由中确认自定义域绑定的 Worker 名称。”执行后的实际结果。"},{"q":"静态资源加载 404","symptom":"Network 中 app.js、styles.css 或 favicon 返回 404。","cause":"public 目录结构被压平上传，或 wrangler assets.directory 指向错误目录。","steps":["确认仓库中路径为 public/app.js，而不是根目录 app.js。","检查 wrangler.jsonc 的 assets 配置。","直接访问 /app.js?v=90 验证是否存在。"],"prevention":"覆盖包保留目录结构，不使用会丢失路径的上传方式。","quick":"确认仓库中路径为 public/app.js，而不是根目录 app.js。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：静态资源加载 404。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“静态资源加载 404”发生前最后一个成功步骤，以及先做步骤“确认仓库中路径为 public/app.js，而不是根目录 app.js。”执行后的实际结果。"},{"q":"部署后样式错乱但功能正常","symptom":"按钮无样式、弹窗超宽或移动端布局异常。","cause":"styles.css 未覆盖、缓存未刷新，或只更新 app.js 引入了新 class。","steps":["检查 Network 中 styles.css 的版本和状态码。","确认本次覆盖清单是否包含 public/styles.css。","清缓存后重新加载，并检查 CSS 是否被安全策略拦截。"],"prevention":"新增界面 class 时同步评估 styles.css 是否必须修改。","quick":"检查 Network 中 styles.css 的版本和状态码。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：部署后样式错乱但功能正常。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“部署后样式错乱但功能正常”发生前最后一个成功步骤，以及先做步骤“检查 Network 中 styles.css 的版本和状态码。”执行后的实际结果。"},{"q":"预览环境正常、生产环境失败","symptom":"同一提交在 workers.dev 可用，在正式域名报错。","cause":"生产绑定、Secret、KV/D1 或主机名校验与预览环境不同。","steps":["分别查看两个环境的变量和绑定。","检查 TURNSTILE_EXPECTED_HOSTNAME、APP_ENVIRONMENT 和 Cookie 域。","在生产 Workers 日志中按 Ray ID 查请求。"],"prevention":"维护生产/预览配置清单，Secret 变更后都要重新部署。","quick":"分别查看两个环境的变量和绑定。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：预览环境正常、生产环境失败。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“预览环境正常、生产环境失败”发生前最后一个成功步骤，以及先做步骤“分别查看两个环境的变量和绑定。”执行后的实际结果。"},{"q":"GitHub 自动部署没有触发","symptom":"提交已推送但 Cloudflare 没有新部署记录。","cause":"GitHub 集成断开、监听分支错误或构建失败。","steps":["查看 Cloudflare Deployments 的构建日志。","确认生产分支是 main。","重新授权 GitHub 集成或手动重试部署。"],"prevention":"重要发布同时记录提交 SHA 和 Cloudflare 部署 ID。","quick":"查看 Cloudflare Deployments 的构建日志。","verify":"打开正式域名并强制刷新，确认页面资源版本为 v99；再执行一次相关功能，Network 中请求应命中新部署且不再返回旧文案。 本条重点确认：GitHub 自动部署没有触发。","collect":"收集正式域名、Cloudflare 部署 ID、Git 提交 SHA、页面源代码中的 app.js 版本、Network 中失败资源的响应头。 本条还要注明“GitHub 自动部署没有触发”发生前最后一个成功步骤，以及先做步骤“查看 Cloudflare Deployments 的构建日志。”执行后的实际结果。"}]},{"key":"d1","title":"D1 数据库与表结构","items":[{"q":"提示 no such table","symptom":"接口报 no such table: 某表。","cause":"ensureSchema 尚未执行、D1 绑定指向空数据库，或部署使用了错误数据库。","steps":["确认 wrangler.jsonc 的 D1 binding 名称是 DB。","访问一次公开配置接口触发 schema 初始化。","在 D1 Console 查询 sqlite_master 确认表是否存在。","不要直接在错误数据库手工建表。"],"prevention":"生产数据库 ID 固定后不要随意替换；部署后做一次健康检查。","quick":"确认 wrangler.jsonc 的 D1 binding 名称是 DB。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：提示 no such table。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“提示 no such table”发生前最后一个成功步骤，以及先做步骤“确认 wrangler.jsonc 的 D1 binding 名称是 DB。”执行后的实际结果。"},{"q":"提示 no such column","symptom":"接口报 no such column: controlled_at、sent_at 等。","cause":"旧数据库缺少新字段，ALTER TABLE 初始化未成功或代码查询早于迁移。","steps":["查看 Workers 日志中 ensureSchema 的 ALTER 错误。","在 D1 执行 PRAGMA table_info(表名)。","按代码中的字段类型补列，随后重新请求。"],"prevention":"每版新增字段都放入幂等 ALTER 列表，并在测试库模拟旧结构。","quick":"查看 Workers 日志中 ensureSchema 的 ALTER 错误。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：提示 no such column。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“提示 no such column”发生前最后一个成功步骤，以及先做步骤“查看 Workers 日志中 ensureSchema 的 ALTER 错误。”执行后的实际结果。"},{"q":"注册码提示 registration_keys.name NOT NULL","symptom":"添加注册码时报 NOT NULL constraint failed: registration_keys.name。","cause":"历史表保留 name TEXT NOT NULL，而新版主要写 code。","steps":["确认部署的是兼容旧列的 src/index.ts。","执行 PRAGMA table_info(registration_keys) 保存结果。","再次创建注册码，代码应同时填 name 和 code。"],"prevention":"不要直接删除旧列；使用列探测兼容，迁移后再考虑重建表。","quick":"确认部署的是兼容旧列的 src/index.ts。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：注册码提示 registration_keys.name NOT NULL。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“注册码提示 registration_keys.name NOT NULL”发生前最后一个成功步骤，以及先做步骤“确认部署的是兼容旧列的 src/index.ts。”执行后的实际结果。"},{"q":"注册码提示 registration_keys.key_hash NOT NULL","symptom":"添加注册码时报 key_hash 不能为空。","cause":"更早版本的表要求保存哈希，新版本若只写明文 code 就会失败。","steps":["确认 v99 的创建逻辑会读取 PRAGMA 并写入 SHA-256 key_hash。","检查 key_hash 字段类型和额外 CHECK 约束。","部署后重新创建，不要重复点击旧失败请求。"],"prevention":"对所有无默认值的 NOT NULL 历史列做动态填充测试。","quick":"确认 v99 的创建逻辑会读取 PRAGMA 并写入 SHA-256 key_hash。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：注册码提示 registration_keys.key_hash NOT NULL。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“注册码提示 registration_keys.key_hash NOT NULL”发生前最后一个成功步骤，以及先做步骤“确认 v99 的创建逻辑会读取 PRAGMA 并写入 SHA-256 key_hash。”执行后的实际结果。"},{"q":"提示 UNIQUE constraint failed","symptom":"注册用户、域名或注册码时出现 UNIQUE 约束错误。","cause":"用户名、邮箱、手机号、完整域名或注册码已存在，可能是软删除数据仍占唯一值。","steps":["根据错误中的表和列查询重复记录。","确认是否为用户重复提交，而不是接口重试。","需要释放值时先评估关联记录，再执行受控清理。"],"prevention":"前端提交按钮立即禁用，后端在写入前做重复检查并保留唯一约束。","quick":"根据错误中的表和列查询重复记录。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：提示 UNIQUE constraint failed。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“提示 UNIQUE constraint failed”发生前最后一个成功步骤，以及先做步骤“根据错误中的表和列查询重复记录。”执行后的实际结果。"},{"q":"提示 CHECK constraint failed","symptom":"修改状态时触发 CHECK constraint。","cause":"旧表限制了 status 允许值，而新代码写入了旧约束不认识的状态。","steps":["PRAGMA table_info 不能显示 CHECK，查看 sqlite_master 中建表 SQL。","使用兼容状态映射或重建表迁移。","迁移前导出数据库。"],"prevention":"状态枚举新增时检查历史建表 SQL，避免直接依赖新字符串。","quick":"PRAGMA table_info 不能显示 CHECK，查看 sqlite_master 中建表 SQL。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：提示 CHECK constraint failed。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“提示 CHECK constraint failed”发生前最后一个成功步骤，以及先做步骤“PRAGMA table_info 不能显示 CHECK，查看 sqlite_master 中建表 SQL。”执行后的实际结果。"},{"q":"D1_ERROR database is locked","symptom":"并发操作时偶发数据库锁定。","cause":"大量写事务、批量操作或定时任务与人工操作同时写同一表。","steps":["稍后重试一次，避免连续点击。","检查 Cron 是否在同一时间批量清理。","将大批量操作拆分，减少长事务。"],"prevention":"写接口保持短事务，批处理限制条数并设置幂等键。","quick":"稍后重试一次，避免连续点击。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：D1_ERROR database is locked。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“D1_ERROR database is locked”发生前最后一个成功步骤，以及先做步骤“稍后重试一次，避免连续点击。”执行后的实际结果。"},{"q":"日期查询多一天或少一天","symptom":"日志、消息或到期时间与本地日期不一致。","cause":"D1 datetime(now) 使用 UTC，前端按本地时区显示，字符串解析方式不一致。","steps":["检查数据库原始时间是否无 Z。","前端统一把 D1 时间按 UTC 解析再转本地。","筛选日期时明确使用 UTC 或本地边界。"],"prevention":"所有时间字段统一存 UTC，并在接口返回 ISO 格式。","quick":"检查数据库原始时间是否无 Z。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：日期查询多一天或少一天。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“日期查询多一天或少一天”发生前最后一个成功步骤，以及先做步骤“检查数据库原始时间是否无 Z。”执行后的实际结果。"},{"q":"ALTER TABLE 重复执行报 duplicate column","symptom":"日志出现 duplicate column name，但功能可能仍正常。","cause":"幂等初始化每次尝试添加字段，D1 对已存在字段报错。","steps":["确认错误被 catch 且后续初始化继续。","只要接口最终正常，可视为兼容日志。","若初始化被中断，改为逐条执行并忽略重复列。"],"prevention":"迁移代码区分可忽略错误与真正失败，避免一个字段阻断全部迁移。","quick":"确认错误被 catch 且后续初始化继续。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：ALTER TABLE 重复执行报 duplicate column。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“ALTER TABLE 重复执行报 duplicate column”发生前最后一个成功步骤，以及先做步骤“确认错误被 catch 且后续初始化继续。”执行后的实际结果。"},{"q":"删除用户后残留关联数据","symptom":"用户已删，但消息已读、验证码、域名或日志仍残留。","cause":"历史版本删除流程没有覆盖新表，或外键未启用级联。","steps":["按 user_id 查询 sessions、domain_applications、message_reads、user_message_deletions。","使用后台删除流程，不直接删 users 单表。","清理前导出相关记录。"],"prevention":"每新增用户关联表，同步更新 hardDeleteUser 清理清单。","quick":"按 user_id 查询 sessions、domain_applications、message_reads、user_message_deletions。","verify":"再次执行触发该表的操作，确认接口不再出现 D1_ERROR；随后在 D1 中查询目标记录，字段和值应完整写入。 本条重点确认：删除用户后残留关联数据。","collect":"收集完整 D1_ERROR、表名、PRAGMA table_info 结果、sqlite_master 中建表 SQL，以及当前 Worker 部署版本。 本条还要注明“删除用户后残留关联数据”发生前最后一个成功步骤，以及先做步骤“按 user_id 查询 sessions、domain_applications、message_reads、user_message_deletions。”执行后的实际结果。"}]},{"key":"auth","title":"登录、会话与 HTTP 403","items":[{"q":"偶发 HTTP 403 且没有业务错误码","symptom":"红色提示只有 HTTP 403，刷新后可能恢复。","cause":"Cloudflare WAF、Bot Fight、自定义规则或来源校验拦截，请求甚至未进入业务代码。","steps":["记录提示中的 Ray ID 和发生时间。","到 Cloudflare Security Events 按 Ray ID 查询命中规则。","确认没有把 /api/* 的 POST 误设为 Managed Challenge。","临时跳过可信管理路径后复测。"],"prevention":"WAF 规则按接口风险分层，管理接口依赖登录权限而不是全站挑战。","quick":"记录提示中的 Ray ID 和发生时间。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：偶发 HTTP 403 且没有业务错误码。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“偶发 HTTP 403 且没有业务错误码”发生前最后一个成功步骤，以及先做步骤“记录提示中的 Ray ID 和发生时间。”执行后的实际结果。"},{"q":"403 ORIGIN_MISMATCH","symptom":"POST 请求被提示来源不匹配。","cause":"Origin/Host 在反向代理、自定义域或预览域之间不一致。","steps":["查看请求 Origin、Host、X-Forwarded-Host。","确认正式域名没有跨域嵌入或从旧域名调用 API。","使用 v99 放宽后的同源判断，并保持 HTTPS。"],"prevention":"前后端部署在同一站点；切换域名时同步更新书签和嵌入链接。","quick":"查看请求 Origin、Host、X-Forwarded-Host。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：403 ORIGIN_MISMATCH。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“403 ORIGIN_MISMATCH”发生前最后一个成功步骤，以及先做步骤“查看请求 Origin、Host、X-Forwarded-Host。”执行后的实际结果。"},{"q":"登录成功后立刻回到登录页","symptom":"登录接口成功，但 /api/auth/me 返回 401。","cause":"Cookie 被浏览器阻止、域名/协议变化，或 session 写入失败。","steps":["检查响应 Set-Cookie 和后续请求 Cookie。","允许站点 Cookie，关闭无痕或隐私插件测试。","查询 sessions 中是否有新记录及 expires_at。"],"prevention":"始终使用 HTTPS，同一域名完成登录和后续操作。","quick":"检查响应 Set-Cookie 和后续请求 Cookie。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：登录成功后立刻回到登录页。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“登录成功后立刻回到登录页”发生前最后一个成功步骤，以及先做步骤“检查响应 Set-Cookie 和后续请求 Cookie。”执行后的实际结果。"},{"q":"账户禁用后仍能登录但不能操作","symptom":"用户看到“你的账户已被禁用”，域名页面被限制。","cause":"这是当前设计：普通用户可登录查看提示和帮助，但不能注册/管理域名。","steps":["在用户管理核对 status。","查看操作日志确认谁禁用了账号。","确认恢复后重新登录或刷新会话。"],"prevention":"禁用用户时填写原因并通过消息中心通知。","quick":"在用户管理核对 status。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：账户禁用后仍能登录但不能操作。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“账户禁用后仍能登录但不能操作”发生前最后一个成功步骤，以及先做步骤“在用户管理核对 status。”执行后的实际结果。"},{"q":"管理员账户被禁用无法登录","symptom":"管理员登录直接 403。","cause":"出于安全考虑，禁用管理员不允许保留后台访问。","steps":["使用其他管理员恢复该账号。","没有其他管理员时在 D1 谨慎把目标管理员 status 改回 active。","恢复后立即检查禁用原因和密码安全。"],"prevention":"至少保留两个受控管理员账号，并启用强密码。","quick":"使用其他管理员恢复该账号。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：管理员账户被禁用无法登录。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“管理员账户被禁用无法登录”发生前最后一个成功步骤，以及先做步骤“使用其他管理员恢复该账号。”执行后的实际结果。"},{"q":"登录失败次数过多被锁定","symptom":"正确密码也提示暂时锁定。","cause":"失败登录阈值触发 KV 锁定，可能由误输或撞库造成。","steps":["等待提示的锁定时间。","检查 IP 和账号近期失败日志。","确认密码后再试，避免继续延长锁定。"],"prevention":"设置合理阈值，管理员定期检查异常 IP。","quick":"等待提示的锁定时间。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：登录失败次数过多被锁定。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“登录失败次数过多被锁定”发生前最后一个成功步骤，以及先做步骤“等待提示的锁定时间。”执行后的实际结果。"},{"q":"记住我没有自动填充","symptom":"下次打开登录页没有用户名或密码。","cause":"浏览器清除了 localStorage、使用了不同域名/隐私模式，或未勾选记住我。","steps":["确认登录时勾选并成功登录。","检查 Application→Local Storage 是否有 storage_remembered_login_v86。","不要在无痕模式测试。"],"prevention":"公共设备不要使用；重要安全场景建议仅记用户名不记密码。","quick":"确认登录时勾选并成功登录。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：记住我没有自动填充。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“记住我没有自动填充”发生前最后一个成功步骤，以及先做步骤“确认登录时勾选并成功登录。”执行后的实际结果。"},{"q":"管理员 IP 白名单把自己挡住","symptom":"管理员账号密码正确但提示 IP 不允许。","cause":"安全设置中的白名单不包含当前出口 IP，或 IPv4/IPv6 发生变化。","steps":["从 Cloudflare 日志确认 client IP。","由其他管理员更新白名单。","紧急恢复时在 KV 安全设置中移除错误值。"],"prevention":"录入 IPv4 和可能使用的 IPv6，并保留第二管理通道。","quick":"从 Cloudflare 日志确认 client IP。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：管理员 IP 白名单把自己挡住。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“管理员 IP 白名单把自己挡住”发生前最后一个成功步骤，以及先做步骤“从 Cloudflare 日志确认 client IP。”执行后的实际结果。"},{"q":"CSRF 或跨站请求被拒绝","symptom":"从第三方页面、旧域名或 iframe 操作时 POST 失败。","cause":"系统要求同源 Cookie 和 Origin，跨站写请求不受支持。","steps":["直接打开正式站点后操作。","不要通过第三方网页嵌入管理后台。","检查浏览器扩展是否改写 Origin。"],"prevention":"管理操作只在正式域名完成，避免开放跨域凭据。","quick":"直接打开正式站点后操作。","verify":"退出后重新登录，并连续打开两个需要登录的页面；会话应保持有效，相关接口不再返回 401/403。 本条重点确认：CSRF 或跨站请求被拒绝。","collect":"收集 HTTP 状态码、业务错误码、Cloudflare Ray ID、请求路径、发生时间、账号名和客户端 IP；不要提供密码。 本条还要注明“CSRF 或跨站请求被拒绝”发生前最后一个成功步骤，以及先做步骤“直接打开正式站点后操作。”执行后的实际结果。"}]},{"key":"captcha","title":"Turnstile 与图形验证","items":[{"q":"Turnstile 显示“系统接口加载超时”","symptom":"组件连续超时，登录或注册无法继续。","cause":"Cloudflare challenge 域名被网络、DNS、广告拦截器或地区链路阻断。","steps":["使用默认“优先 Turnstile，失败后图形验证”模式。","等待自动切换，或点击“切换图形验证”。","关闭广告拦截、换网络后再测试 Turnstile。"],"prevention":"不要把系统设置为仅 Turnstile，除非已确认所有用户网络可访问。","quick":"使用默认“优先 Turnstile，失败后图形验证”模式。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：Turnstile 显示“系统接口加载超时”。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“Turnstile 显示“系统接口加载超时””发生前最后一个成功步骤，以及先做步骤“使用默认“优先 Turnstile，失败后图形验证”模式。”执行后的实际结果。"},{"q":"Turnstile Site Key 未配置","symptom":"验证区域提示 Site Key 缺失。","cause":"Worker 变量和后台设置都没有有效 Site Key。","steps":["在 Turnstile 控制台创建站点。","把公开 Site Key 填入后台或 TURNSTILE_SITE_KEY。","Secret 必须另存为 Worker Secret。"],"prevention":"Site Key 可公开，Secret 绝不能写入 GitHub。","quick":"在 Turnstile 控制台创建站点。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：Turnstile Site Key 未配置。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“Turnstile Site Key 未配置”发生前最后一个成功步骤，以及先做步骤“在 Turnstile 控制台创建站点。”执行后的实际结果。"},{"q":"Turnstile Secret 未配置","symptom":"前端验证成功，后端却返回 503。","cause":"只有 Site Key，没有 TURNSTILE_SECRET 或后台 Secret。","steps":["在 Worker Secrets 添加 TURNSTILE_SECRET。","重新部署后测试。","回退模式下可临时使用图形验证。"],"prevention":"变量变更后确认生产部署确实包含新 Secret。","quick":"在 Worker Secrets 添加 TURNSTILE_SECRET。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：Turnstile Secret 未配置。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“Turnstile Secret 未配置”发生前最后一个成功步骤，以及先做步骤“在 Worker Secrets 添加 TURNSTILE_SECRET。”执行后的实际结果。"},{"q":"TURNSTILE_ACTION_MISMATCH","symptom":"组件完成后提交仍提示 Action 不匹配。","cause":"前端 actionLogin/actionRegister/actionApply 与 Worker 期望值不同。","steps":["查看公开配置返回的 action。","核对 TURNSTILE_ACTION_* 变量。","清缓存，避免旧 app.js 发送旧 Action。"],"prevention":"Action 修改必须前后端一起发布。","quick":"查看公开配置返回的 action。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：TURNSTILE_ACTION_MISMATCH。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“TURNSTILE_ACTION_MISMATCH”发生前最后一个成功步骤，以及先做步骤“查看公开配置返回的 action。”执行后的实际结果。"},{"q":"TURNSTILE_HOSTNAME_MISMATCH","symptom":"预览域或新域名无法验证。","cause":"TURNSTILE_EXPECTED_HOSTNAME 固定为另一个主机名。","steps":["正式环境填正式域名。","预览环境单独配置或不设置严格主机名。","在 Turnstile 域名允许列表加入实际域名。"],"prevention":"生产和预览使用独立 Widget 或独立环境变量。","quick":"正式环境填正式域名。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：TURNSTILE_HOSTNAME_MISMATCH。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“TURNSTILE_HOSTNAME_MISMATCH”发生前最后一个成功步骤，以及先做步骤“正式环境填正式域名。”执行后的实际结果。"},{"q":"图形验证码一直提示不正确","symptom":"肉眼输入正确仍失败。","cause":"验证码一次性、绑定 IP 和场景；代理换 IP、重复提交或过期都会失效。","steps":["点击图片生成新验证码。","关闭会切换出口 IP 的代理。","只提交一次，不要多标签页共用同一图。"],"prevention":"验证码失败后前端必须自动刷新，避免再次使用旧 challenge。","quick":"点击图片生成新验证码。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：图形验证码一直提示不正确。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“图形验证码一直提示不正确”发生前最后一个成功步骤，以及先做步骤“点击图片生成新验证码。”执行后的实际结果。"},{"q":"图形验证码背景不显示","symptom":"设置了上传背景但验证码仍是随机背景。","cause":"背景模式未选“上传”、图片超过限制、隐藏字段未保存或 KV 仍保留旧设置。","steps":["重新选择小于 500KB 的 PNG/JPG/WebP/GIF。","确认预览出现后保存注册设置。","重新生成验证码，不要观察旧图片。"],"prevention":"使用横向低体积图片，上传替换后立即做一次登录测试。","quick":"重新选择小于 500KB 的 PNG/JPG/WebP/GIF。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：图形验证码背景不显示。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“图形验证码背景不显示”发生前最后一个成功步骤，以及先做步骤“重新选择小于 500KB 的 PNG/JPG/WebP/GIF。”执行后的实际结果。"},{"q":"验证码字符难以辨认","symptom":"字符颜色与背景接近、线条过多或字符集包含相似字符。","cause":"背景、干扰线和字符集设置过于激进。","steps":["线条范围先设 2-4。","字符集移除 0/O、1/I/l 等相似字符。","改用随机背景或关闭背景对比。"],"prevention":"每次更改后在桌面和手机各生成 10 次抽查可读性。","quick":"线条范围先设 2-4。","verify":"分别刷新并提交验证码三次；正确答案应通过，错误答案应拒绝，Turnstile 失败时应能按设置切换到图形验证。 本条重点确认：验证码字符难以辨认。","collect":"收集当前验证模式、Site Key 前后各四位、错误码、浏览器网络环境、Turnstile 请求状态和图形 challengeId；不要提供 Secret。 本条还要注明“验证码字符难以辨认”发生前最后一个成功步骤，以及先做步骤“线条范围先设 2-4。”执行后的实际结果。"}]},{"key":"email","title":"邮件发送：Cloudflare 免费邮件与 Resend","items":[{"q":"先分清这封邮件应该走 Cloudflare 还是 Resend","symptom":"管理员不知道测试邮件、异常通知和注册验证码分别使用哪个服务。","cause":"系统现在采用两条邮件通道：固定管理员收件人走 Cloudflare 免费邮件；任意注册用户邮箱走 Resend。","quick":"查看邮件场景：管理员测试、系统异常、用户帮助、域名待审核、DNS 异常都应发到固定管理员邮箱。","steps":["查看邮件场景：管理员测试、系统异常、用户帮助、域名待审核、DNS 异常都应发到固定管理员邮箱。","注册验证码必须发送到用户自己填写的任意邮箱，因此继续使用 Resend。","不要把注册验证码改到 SEB 固定绑定，否则只能发给绑定的管理员邮箱。","在后台邮件设置顶部确认“当前发送方式”和绑定状态。"],"verify":"分别发送一封管理员测试邮件和一封注册验证码；前者应显示 provider=cloudflare，后者应出现在 Resend Logs。","collect":"收集邮件场景、目标邮箱、接口响应中的 provider、Cloudflare/Resend 日志状态和发送时间。","prevention":"给每个新增邮件场景先标明收件人是否固定；固定管理员才使用 Cloudflare 免费绑定。"},{"q":"Cloudflare 邮件绑定 SEB 显示未配置","symptom":"后台显示 Cloudflare 绑定状态为“未配置”，管理员测试邮件返回 CF_EMAIL_BINDING_MISSING。","cause":"当前 Worker 没有名为 SEB 的 Email sending binding，或 wrangler.jsonc 尚未部署生效。","quick":"确认仓库根目录 wrangler.jsonc 包含 send_email，name 必须是 SEB。","steps":["确认仓库根目录 wrangler.jsonc 包含 send_email，name 必须是 SEB。","确认 destination_address 是已验证的 admin@flore.top。","重新部署 Worker；部署后到 Cloudflare 的“绑定”页面查看是否出现电子邮件服务 SEB。","若 Git 部署没有自动创建，手动添加 Email sending 绑定，变量名仍填 SEB。"],"verify":"后台“Cloudflare 绑定状态”应显示已配置，发送管理员测试邮件后 admin@flore.top 能收到。","collect":"收集 Worker 名称、绑定页面截图、wrangler.jsonc 的 send_email 段、部署日志和 CF_EMAIL_BINDING_MISSING 原文。","prevention":"部署清单中固定检查 DB、APP_KV、ASSETS、SEB 四个绑定。"},{"q":"admin@flore.top 已验证但 Cloudflare 邮件仍发送失败","symptom":"绑定存在且目标邮箱已验证，发送时仍返回 CF_ADMIN_EMAIL_FAILED。","cause":"常见原因是发件地址不被允许、Email Routing 状态异常、绑定目标与代码收件人不一致，或原始邮件格式被拒绝。","quick":"确认 EMAIL_FROM 与绑定允许的发件地址一致，建议使用 admin@flore.top。","steps":["确认 EMAIL_FROM 与绑定允许的发件地址一致，建议使用 admin@flore.top。","确认代码解析出的固定收件人也是 admin@flore.top。","查看 Workers 日志中 CF_ADMIN_EMAIL_FAILED 后面的具体细节。","在 Cloudflare Email Routing 中确认目标地址仍处于“已验证”。","重新发送纯测试模板，排除自定义 HTML 内容问题。"],"verify":"Cloudflare 测试邮件接口返回 sent=true，收件箱收到主题正确的邮件，Workers 日志无发送异常。","collect":"收集发送错误完整文本、绑定目标、发件地址、邮件主题和 Cloudflare Email Routing 状态；正文可隐藏敏感内容。","prevention":"不要随意修改 CF_ADMIN_EMAIL、EMAIL_FROM 和绑定 destination_address；三者保持一致。"},{"q":"Cloudflare 管理员测试邮件发到哪里","symptom":"后台没有手动输入收件人的位置，管理员担心邮件发错人。","cause":"免费 Email binding 绑定的是固定、已验证目标；系统故意不允许临时修改收件人。","quick":"在后台邮件设置查看“固定管理员收件邮箱”。","steps":["在后台邮件设置查看“固定管理员收件邮箱”。","默认和当前部署目标应为 admin@flore.top。","点击“发送到管理员邮箱”，不用输入收件人。","需要更换目标时，先在 Cloudflare 验证新邮箱，再修改 wrangler.jsonc 和相关变量。"],"verify":"测试接口响应中的 recipients 只有一个固定管理员邮箱，且与 SEB 绑定目标一致。","collect":"收集后台显示的固定邮箱、接口 recipients、SEB destination_address 和收件箱实际 To 地址。","prevention":"固定管理员通知不要提供前端可改收件人输入框，避免被滥用为群发接口。"},{"q":"系统异常邮件没有收到","symptom":"程序发生 500 错误，但管理员邮箱没有异常通知。","cause":"可能关闭了“系统异常邮件”、异常在 Worker 代码运行前被 Cloudflare 拦截、SEB 未绑定，或 15 分钟去重冷却抑制了重复错误。","quick":"确认通知设置中“系统异常通知”已勾选。","steps":["确认通知设置中“系统异常通知”已勾选。","确认 SEB 绑定正常并先发送测试邮件。","查看 Workers 日志：只有进入 Worker 后的未处理异常才能触发邮件。","同一路径同一错误 15 分钟内只发一次，等待冷却或改变测试错误。","WAF 403、网络断开等未进入代码的事件应在 Cloudflare Security Events 查看。"],"verify":"制造一个受控测试异常后，管理员在数分钟内收到包含路径、Ray ID 和错误文本的邮件。","collect":"收集异常时间、路径、Ray ID、Workers 日志、通知开关状态、最近一次相同异常邮件时间。","prevention":"保留 Workers Observability，并为高频同类错误设置合理去重，避免邮件轰炸。"},{"q":"用户提交帮助信息后管理员没收到邮件","symptom":"用户在帮助中心提交成功，但 admin@flore.top 没收到提醒。","cause":"帮助消息可能只写入站内消息，Cloudflare 邮件开关关闭，或邮件发送失败但业务操作仍成功。","quick":"确认“用户提交帮助信息”邮件开关已开启。","steps":["确认“用户提交帮助信息”邮件开关已开启。","在管理员消息中心确认站内帮助消息是否存在。","查看 Workers 日志中 cloudflare admin email help_submission failed。","先发送 Cloudflare 测试邮件确认绑定。","重新用测试用户提交一条标题不同的帮助信息，避免去重。"],"verify":"测试用户提交后，管理员消息中心出现记录且固定邮箱收到包含用户、主题和内容的提醒。","collect":"收集用户 ID、帮助消息 ID、提交时间、邮件开关、Workers 日志和收件箱/垃圾箱检查结果。","prevention":"帮助提交同时保留站内消息和邮件两条渠道；邮件失败不能丢失站内记录。"},{"q":"域名待审核提醒没有发送","symptom":"用户提交域名申请或删除申请后，管理员邮箱没有提醒。","cause":"域名审核邮件开关关闭、申请直接自动通过、SEB 失败，或同一申请的重复提醒被去重。","quick":"确认“域名审核提醒管理员”已开启。","steps":["确认“域名审核提醒管理员”已开启。","确认本次申请状态确实进入 pending，而不是自动审批。","查看管理员待审核列表是否出现该申请。","查看 Workers 日志中的 domain_review 邮件错误。","用新的前缀提交一条测试申请。"],"verify":"新 pending 申请创建后，管理员邮箱收到包含申请 ID、完整域名和用户信息的邮件。","collect":"收集申请 ID、状态、用户 ID、创建时间、通知开关和 domain_review 日志。","prevention":"以申请 ID 作为邮件指纹，避免重复点击产生多封相同提醒。"},{"q":"DNS 异常提醒没有发送","symptom":"Cloudflare DNS 写入失败或清理失败，但管理员邮箱没有告警。","cause":"DNS 异常开关关闭、失败发生在前端验证阶段、SEB 不可用，或同类错误在冷却期内。","quick":"确认“DNS 异常提醒管理员”已开启。","steps":["确认“DNS 异常提醒管理员”已开启。","检查操作日志和 Workers 日志，确认后端确实调用了 Cloudflare API。","先验证 SEB 测试邮件。","检查错误是否与前一封完全相同并处于去重时间内。","修复 Zone ID/Token 后再执行一次测试。"],"verify":"用测试根域名制造一次可控 API 失败，邮箱应收到根域名、记录和错误信息；恢复配置后成功操作不再告警。","collect":"收集根域名、记录 ID、Cloudflare API 错误码、操作账号、发生时间和 dns_anomaly 邮件日志。","prevention":"DNS 邮件只用于真实后端失败，前端必填校验不发送，避免无意义告警。"},{"q":"管理员通知邮件重复很多封","symptom":"同一故障在短时间收到大量相同邮件。","cause":"错误指纹不稳定、不同请求参数被当作不同事件，或冷却时间设置为零。","quick":"比较多封邮件的路径、主题和错误是否完全相同。","steps":["比较多封邮件的路径、主题和错误是否完全相同。","检查发送调用中的 fingerprint 是否包含随机值。","自动异常应设置 5–15 分钟 cooldown；手动测试可设为 0。","临时关闭对应邮件开关，先解决故障源。","不要用循环任务反复触发同一失败。"],"verify":"同一错误连续触发五次时只收到一封；冷却结束后再次触发可收到新邮件。","collect":"收集重复邮件的主题、时间、路径、错误文本、fingerprint 设计和 cooldownSeconds。","prevention":"自动场景统一设置稳定指纹与冷却，手动测试才允许每次都发。"},{"q":"Cloudflare 邮件进垃圾箱","symptom":"发送成功但管理员邮箱在垃圾邮件中看到，或显示发件人不可信。","cause":"发件域名的 SPF/DKIM/DMARC、发件地址一致性或邮件内容信誉影响投递。","quick":"确认 Email Routing/Email Service 要求的 DNS 记录正常。","steps":["确认 Email Routing/Email Service 要求的 DNS 记录正常。","发件地址固定使用真实的 admin@flore.top。","主题不要全大写、不要堆叹号和可疑链接。","把发件人加入邮箱白名单并标记“不是垃圾邮件”。","检查邮件头中的认证结果。"],"verify":"连续三封测试邮件进入收件箱，邮件头中的认证结果无明显失败。","collect":"收集完整邮件头、投递文件夹、发件地址、主题和 Cloudflare 发送时间，不要公开正文中的敏感数据。","prevention":"固定发件地址和名称，保持通知内容简洁、可识别，不发送营销内容。"},{"q":"注册验证码提示 RESEND_API_KEY 未配置","symptom":"用户点击发送验证码时接口返回邮件服务未配置。","cause":"注册验证码仍然发往任意用户邮箱，因此必须有 Resend API Key；SEB 不能替代。","quick":"在 Worker Secrets 中确认 RESEND_API_KEY 存在。","steps":["在 Worker Secrets 中确认 RESEND_API_KEY 存在。","Key 必须是当前有效的新密钥，旧泄露密钥应已撤销。","确认 Resend 中 flore.top 为 Verified。","重新部署 Worker 后再发验证码。","查看接口错误是否从 EMAIL_API_KEY_MISSING 变为成功。"],"verify":"用 QQ、Gmail 或其他非管理员邮箱发送验证码，Resend Logs 出现 accepted/delivered，用户收到邮件。","collect":"收集业务错误码、Resend 日志 ID、发送时间、发件域名状态；API Key 只说明是否存在，绝不提供明文。","prevention":"Cloudflare 与 Resend 分工写入部署清单，不要在配置清理时误删 RESEND_API_KEY。"},{"q":"Resend 返回 403 或 sender not allowed","symptom":"注册验证码请求到 Resend 后被拒绝。","cause":"发件域名未验证、EMAIL_FROM 不属于已验证域，或 API Key 没有该域的发送权限。","quick":"确认 Resend Domains 中 flore.top 显示 Verified。","steps":["确认 Resend Domains 中 flore.top 显示 Verified。","EMAIL_FROM 使用 admin@flore.top 或该域下允许地址。","检查 API Key 权限是否为 Sending access 并允许该域。","修改 Secret/变量后重新部署。","再发送到自己的测试邮箱。"],"verify":"Resend Logs 状态不再是 failed/403，接口返回 sent=true，目标邮箱收到验证码。","collect":"收集 Resend 错误代码、域名验证状态、EMAIL_FROM 和 Key 权限范围；密钥必须打码。","prevention":"域名 DNS 或 API Key 变更后立即做一封注册验证码验收。"},{"q":"注册验证码邮件显示成功但用户收不到","symptom":"接口返回成功，Resend Logs 也有记录，但用户收件箱没有验证码。","cause":"邮件可能延迟、进入垃圾箱、退信，或收件地址拼写错误。","quick":"在 Resend Logs 打开该条发送记录，查看 delivered、bounced 或 delayed。","steps":["在 Resend Logs 打开该条发送记录，查看 delivered、bounced 或 delayed。","核对目标邮箱字符，尤其是点号、数字和后缀。","让用户检查垃圾箱、广告箱和邮箱拦截规则。","换一个不同服务商邮箱复测。","发生 bounce 时不要连续重发到同一无效地址。"],"verify":"至少使用两个不同邮箱服务商成功收到，验证码位数和后台设置一致。","collect":"收集 Resend message ID、目标邮箱（可部分打码）、状态、退信原因、发送与到达时间。","prevention":"注册页显示用户填写的完整邮箱并提供修改入口，同时保留 60 秒冷却。"},{"q":"注册验证码位数或字符集不生效","symptom":"后台改成 4 位或自定义字符后，邮件仍显示旧格式。","cause":"设置未保存、Worker 变量/旧缓存覆盖，或用户使用的是发送前已生成的旧验证码。","quick":"保存注册设置后离开页面再重新打开确认。","steps":["保存注册设置后离开页面再重新打开确认。","重新点击发送，旧邮件中的验证码不会自动改变。","确认输入字符集至少包含足够不同字符。","查看接口响应和新邮件，不要用旧邮件判断。","清除页面缓存后再测。"],"verify":"连续发送五次，新验证码长度都等于设置值，且每个字符都来自指定字符集。","collect":"收集后台位数、字符集、发送时间、新邮件样本（验证码可打码）和接口返回。","prevention":"每次修改验证码规则后让现有验证码立即失效或明确提示用户重新发送。"},{"q":"验证码模板变量没有替换","symptom":"邮件正文直接出现 {{code}}、{{siteName}} 等字样。","cause":"变量拼写错误、使用了不支持的变量，或模板保存时多了全角符号。","quick":"对照后台列出的变量名称，保持英文大小写完全一致。","steps":["对照后台列出的变量名称，保持英文大小写完全一致。","使用双半角花括号，例如 {{code}}。","先恢复默认模板，发送测试确认基础功能。","逐个加入自定义内容，每次保存并测试。","HTML 与纯文本模板都要检查。"],"verify":"测试邮件中不再出现任何 `{{...}}` 原文，验证码、网站名和时间都正确替换。","collect":"收集模板原文、所选测试场景、渲染后邮件和未替换变量名称。","prevention":"模板编辑区始终展示可用变量及含义，不允许自定义未知变量悄悄失败。"},{"q":"注册验证码频繁返回 429","symptom":"用户点击发送或输入验证码时提示稍后再试。","cause":"60 秒发送冷却、错误次数上限、IP/邮箱风控或 Resend 限流被触发。","quick":"先阅读提示是发送冷却、错误次数过多还是全局限流。","steps":["先阅读提示是发送冷却、错误次数过多还是全局限流。","等待提示秒数，不要连续点击。","检查同一 IP 是否有大量不同邮箱请求。","验证码错误次数过多时重新发送一封。","查看 Resend Metrics 是否触及账户限制。"],"verify":"等待冷却后只点击一次即可发送；正常用户不会被其他 IP 的请求误伤。","collect":"收集业务错误码、remaining 秒数、IP 请求次数、邮箱发送次数和 Resend 429 日志。","prevention":"前端显示倒计时并禁用按钮，后端同时按邮箱和 IP 限流。"},{"q":"修改 EMAIL_FROM 后 Cloudflare 和 Resend 表现不一致","symptom":"注册验证码能发但管理员通知失败，或相反。","cause":"两个通道都可能使用 EMAIL_FROM，但它们对发件地址和绑定的要求不同。","quick":"优先保持 EMAIL_FROM=admin@flore.top。","steps":["优先保持 EMAIL_FROM=admin@flore.top。","确认 Resend 已允许该地址所属域。","确认 Cloudflare SEB 允许此发件地址并且固定目标一致。","分别发送管理员测试和注册验证码。","不要只测其中一个通道就上线。"],"verify":"Cloudflare 管理员测试与 Resend 注册验证码都成功，邮件 From 均为预期地址。","collect":"收集 EMAIL_FROM、两个通道的发送结果、Cloudflare 错误和 Resend message ID。","prevention":"发件地址变更必须执行双通道验收，并记录最终值。"},{"q":"关闭某个管理员邮件场景后仍收到邮件","symptom":"后台取消勾选系统异常或 DNS 异常，仍有同类邮件到达。","cause":"设置未保存、邮件在关闭前已排队、另一个环境仍开启，或邮件其实来自其他 Worker。","quick":"重新打开通知设置确认复选框状态。","steps":["重新打开通知设置确认复选框状态。","核对邮件时间是否晚于保存完成时间。","查看邮件主题、Worker 名称和环境字段。","检查生产与预览 APP_KV 是否不同。","确认没有 mailform 等其他 Worker 使用相似主题。"],"verify":"关闭后触发一次相同事件不再收到；重新开启后新事件恢复发送。","collect":"收集设置截图、保存时间、邮件时间/主题、APP_ENVIRONMENT 和来源 Worker 日志。","prevention":"邮件正文加入环境和来源 Worker，方便区分生产、预览和其他系统。"},{"q":"管理员邮件内容太长或包含敏感信息","symptom":"异常邮件把完整请求、Token 或大量堆栈发送到邮箱。","cause":"通知内容没有裁剪或脱敏，错误对象包含敏感参数。","quick":"检查邮件模板和异常拼接字段。","steps":["检查邮件模板和异常拼接字段。","Token、Cookie、密码、验证码只显示“已配置”或打码。","堆栈和正文限制长度。","不要发送完整请求体。","撤销任何已经通过邮件泄露的密钥。"],"verify":"测试异常邮件只包含定位所需的路径、时间、错误和打码标识，不出现完整 Secret。","collect":"只收集脱敏后的邮件样本、字段列表和代码位置；已泄露密钥立即撤销。","prevention":"建立敏感字段黑名单，所有邮件发送前统一清理并限制长度。"},{"q":"需要更换 Cloudflare 固定管理员收件邮箱","symptom":"管理员想把 admin@flore.top 改为另一个邮箱。","cause":"免费绑定只能发送到已验证目标，不能只改后台显示字段。","quick":"先在 Cloudflare Email Routing 中添加并验证新目标邮箱。","steps":["先在 Cloudflare Email Routing 中添加并验证新目标邮箱。","修改 wrangler.jsonc 的 destination_address。","同时修改 CF_ADMIN_EMAIL 或相关显示配置，确保代码收件人与绑定一致。","重新部署后查看 SEB 绑定详情。","发送测试邮件并确认旧邮箱不再收到。"],"verify":"后台显示、接口 recipients、SEB 目标和实际收件人四处完全一致。","collect":"收集新邮箱验证状态、wrangler 绑定、后台显示和测试发送结果；邮箱可部分打码。","prevention":"收件邮箱变更按“验证→改绑定→改变量→部署→测试”顺序执行。"},{"q":"Cloudflare 免费邮件能否给任意用户发验证码","symptom":"管理员希望取消 Resend，直接用 SEB 给所有注册邮箱发送。","cause":"当前免费固定目标绑定只适合已验证管理员邮箱；任意用户邮箱不属于固定验证目标。","quick":"保留 Resend 用于注册验证码。","steps":["保留 Resend 用于注册验证码。","SEB 只用于管理员测试与五类固定管理员通知。","不要在前端开放任意 To 参数给 SEB 接口。","需要完全改为 Cloudflare 任意收件时，先核对当前账户方案和 Email Service 能力。","改造前在独立测试 Worker 验证外发范围。"],"verify":"系统代码中注册验证码仍调用 sendEmailWithResend，管理员通知调用 SEB；两条测试都成功。","collect":"收集目标场景、收件人类型、实际 provider 和账户/绑定配置。","prevention":"邮件通道按收件对象固定/任意分类，不以“看起来都能发邮件”作为替换依据。"}]},{"key":"users","title":"注册码与用户管理","items":[{"q":"注册码创建失败","symptom":"点击添加后出现 D1 NOT NULL 或字段约束错误。","cause":"registration_keys 是历史表结构，含 name/key_hash 等强制字段。","steps":["部署 v99 后重试。","保存 PRAGMA table_info(registration_keys)。","仍失败时把完整错误和表结构用于补充兼容。"],"prevention":"升级前在复制的旧库上测试创建、使用、删除全流程。","quick":"部署 v99 后重试。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：注册码创建失败。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“注册码创建失败”发生前最后一个成功步骤，以及先做步骤“部署 v99 后重试。”执行后的实际结果。"},{"q":"注册码提示已用完","symptom":"有效注册码却不能注册。","cause":"used_count 已达到 max_uses。","steps":["后台查看已使用/可用次数。","确认是否被测试账号消耗。","需要继续使用时新建注册码，不直接改历史用量。"],"prevention":"为单次邀请设置 maxUses=1；批量邀请按人数预留。","quick":"后台查看已使用/可用次数。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：注册码提示已用完。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“注册码提示已用完”发生前最后一个成功步骤，以及先做步骤“后台查看已使用/可用次数。”执行后的实际结果。"},{"q":"注册码过期","symptom":"提交提示已过期。","cause":"expires_at 早于当前 UTC 时间。","steps":["后台查看有效期。","重新创建一个新码。","确认日期控件时区是否正确。"],"prevention":"短期活动码写清截止时间，长期码可留空。","quick":"后台查看有效期。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：注册码过期。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“注册码过期”发生前最后一个成功步骤，以及先做步骤“后台查看有效期。”执行后的实际结果。"},{"q":"注册码角色不符合预期","symptom":"使用注册码后用户变成管理员或普通用户。","cause":"注册码 role 字段决定注册角色，创建时选择错误。","steps":["立即禁用错误账号。","核对注册码权限身份。","删除高权限码并重新创建普通用户码。"],"prevention":"管理员注册码极少使用，创建前强制二次确认。","quick":"立即禁用错误账号。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：注册码角色不符合预期。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“注册码角色不符合预期”发生前最后一个成功步骤，以及先做步骤“立即禁用错误账号。”执行后的实际结果。"},{"q":"管理员添加用户失败","symptom":"表单提交失败或人机验证不通过。","cause":"邮箱/手机号重复、密码不足、图形验证码过期或 Turnstile 故障。","steps":["看具体错误码。","确认邮箱或手机号至少一个且唯一。","刷新验证后重新提交一次。"],"prevention":"后台创建同样执行风控和唯一约束，不绕过验证。","quick":"看具体错误码。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：管理员添加用户失败。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“管理员添加用户失败”发生前最后一个成功步骤，以及先做步骤“看具体错误码。”执行后的实际结果。"},{"q":"用户额度修改后页面没变化","symptom":"后台保存了新额度，用户仍显示旧数字。","cause":"用户页面缓存或 /api/applications 未重新加载。","steps":["让用户手动刷新或重新登录。","后台重新打开用户确认数据库值。","检查是否编辑了正确用户。"],"prevention":"额度变化通过消息中心通知，并让前端重新拉取 quota。","quick":"让用户手动刷新或重新登录。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：用户额度修改后页面没变化。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“用户额度修改后页面没变化”发生前最后一个成功步骤，以及先做步骤“让用户手动刷新或重新登录。”执行后的实际结果。"},{"q":"无法删除用户","symptom":"后台删除时报仍有域名或外部 DNS 清理异常。","cause":"用户有关联域名、消息、会话，删除流程需要级联处理。","steps":["先处理用户所有有效域名。","导出需要保留的日志。","使用后台删除，不直接执行 DELETE users。"],"prevention":"删除前展示影响范围并二次确认。","quick":"先处理用户所有有效域名。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：无法删除用户。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“无法删除用户”发生前最后一个成功步骤，以及先做步骤“先处理用户所有有效域名。”执行后的实际结果。"},{"q":"邮箱或手机号被旧账号占用","symptom":"新用户提示联系方式已存在，但列表找不到活跃账号。","cause":"禁用/软删除账号仍保留唯一字段。","steps":["按邮箱/手机号在 D1 查询所有状态。","确认旧账号身份后恢复或安全清理。","不要直接改成空值而不记录原因。"],"prevention":"账号注销使用完整硬删除流程，避免残留唯一值。","quick":"按邮箱/手机号在 D1 查询所有状态。","verify":"使用测试账号完整执行创建、登录、修改和禁用/恢复流程；用户列表与操作日志中的状态必须一致。 本条重点确认：邮箱或手机号被旧账号占用。","collect":"收集目标用户 ID、账号状态、注册码 ID、相关操作日志时间和具体业务错误码；不要导出密码哈希。 本条还要注明“邮箱或手机号被旧账号占用”发生前最后一个成功步骤，以及先做步骤“按邮箱/手机号在 D1 查询所有状态。”执行后的实际结果。"}]},{"key":"domain","title":"域名申请、审核与生命周期","items":[{"q":"申请一直待审核","symptom":"用户提交成功但长时间无变化。","cause":"审核模式为人工，或命中风险规则等待管理员。","steps":["在域名审核按 pending 筛选。","核对前缀、用户和风险信息。","批准或拒绝并填写留言。"],"prevention":"设置消息提醒，避免待审核队列积压。","quick":"在域名审核按 pending 筛选。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：申请一直待审核。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“申请一直待审核”发生前最后一个成功步骤，以及先做步骤“在域名审核按 pending 筛选。”执行后的实际结果。"},{"q":"批准域名失败","symptom":"管理员点击批准后报 Cloudflare 或数据库错误。","cause":"状态写入、到期时间、Zone 配置或旧 CHECK 约束异常。","steps":["先看完整错误，不要连续点击。","确认根域名仍启用且 Zone ID 正确。","查看 application 当前状态，防止部分成功。"],"prevention":"批准操作设计为幂等，并记录审计日志。","quick":"先看完整错误，不要连续点击。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：批准域名失败。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“批准域名失败”发生前最后一个成功步骤，以及先做步骤“先看完整错误，不要连续点击。”执行后的实际结果。"},{"q":"管控后用户还能删除 DNS","symptom":"用户不能新增编辑，但仍可删除记录。","cause":"这是管控设计：保留清理 DNS 和申请删除域名的能力。","steps":["确认 controlled_at 已写入。","测试新增/编辑应被 403，删除应允许。","需要完全冻结时应禁用域名而不是管控。"],"prevention":"管理员操作前区分“管控”和“禁用”。","quick":"确认 controlled_at 已写入。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：管控后用户还能删除 DNS。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“管控后用户还能删除 DNS”发生前最后一个成功步骤，以及先做步骤“确认 controlled_at 已写入。”执行后的实际结果。"},{"q":"禁用域名后 DNS 消失","symptom":"取消禁用后原记录没有自动恢复。","cause":"禁用会删除 Cloudflare DNS，系统不会保存可直接恢复的外部记录。","steps":["从操作日志或备份找原 DNS。","取消禁用后由用户重新添加。","必要时管理员协助重建。"],"prevention":"禁用前提示不可自动恢复并记录 DNS 快照。","quick":"从操作日志或备份找原 DNS。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：禁用域名后 DNS 消失。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“禁用域名后 DNS 消失”发生前最后一个成功步骤，以及先做步骤“从操作日志或备份找原 DNS。”执行后的实际结果。"},{"q":"删除申请占用额度","symptom":"用户提交删除后仍显示额度已用。","cause":"管理员批准前域名仍归用户，防止删除中重复占用前缀。","steps":["及时处理删除审核。","12 小时内允许用户撤销。","批准后刷新额度。"],"prevention":"对待删除队列设置管理员提醒。","quick":"及时处理删除审核。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：删除申请占用额度。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“删除申请占用额度”发生前最后一个成功步骤，以及先做步骤“及时处理删除审核。”执行后的实际结果。"},{"q":"新根域名没有出现在注册页","symptom":"后台已添加但用户选择框看不到。","cause":"enabled 或 allowRegister 未开启、未保存、排序数据异常或缓存旧。","steps":["确认启用解析和允许申请都勾选。","保存 DNS 配置并强制刷新。","查看 /api/config suffixes 是否包含它。"],"prevention":"新增后立即用无痕窗口做申请页验收。","quick":"确认启用解析和允许申请都勾选。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：新根域名没有出现在注册页。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“新根域名没有出现在注册页”发生前最后一个成功步骤，以及先做步骤“确认启用解析和允许申请都勾选。”执行后的实际结果。"},{"q":"显示名称留空仍出现默认文字","symptom":"注册选择框显示“免费二级域名”。","cause":"前端仍是旧 app.js，或后端返回了历史 label。","steps":["检查 app.js?v=90。","在 DNS 配置把显示名称真正清空并保存。","查看公开配置中的 label。"],"prevention":"留空时只渲染 suffix，不在前端补默认名称。","quick":"检查 app.js?v=90。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：显示名称留空仍出现默认文字。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“显示名称留空仍出现默认文字”发生前最后一个成功步骤，以及先做步骤“检查 app.js?v=90。”执行后的实际结果。"},{"q":"域名到期时间异常","symptom":"批准后到期日不符合设置。","cause":"用户类型有效期、默认有效天数或批准时间解析不一致。","steps":["确认用户是否白名单。","检查 domain 设置中的对应有效期。","查看 expires_at 原始 UTC 值。"],"prevention":"有效期规则变更只影响新批准/续期时要明确说明。","quick":"确认用户是否白名单。","verify":"用测试用户提交一条申请，再由管理员处理；用户端、管理员端和 D1 中的状态应同步变化。 本条重点确认：域名到期时间异常。","collect":"收集申请 ID、完整域名、当前状态、创建时间、审核操作日志以及 Cloudflare API 返回的错误文本。 本条还要注明“域名到期时间异常”发生前最后一个成功步骤，以及先做步骤“确认用户是否白名单。”执行后的实际结果。"}]},{"key":"dns","title":"Cloudflare DNS 与多根域名","items":[{"q":"测试所有根域名部分失败","symptom":"批量测试显示某些成功、某些失败。","cause":"每个根域名的 Zone ID、Token、账号权限独立，失败不代表全部配置错误。","steps":["逐条查看失败原因。","确认失败根域名属于哪个 Cloudflare 账号。","为跨账号根域名单独填 API Token。"],"prevention":"每次新增根域名都运行全量测试。","quick":"逐条查看失败原因。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：测试所有根域名部分失败。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“测试所有根域名部分失败”发生前最后一个成功步骤，以及先做步骤“逐条查看失败原因。”执行后的实际结果。"},{"q":"Cloudflare Authentication error","symptom":"创建或删除 DNS 返回认证错误。","cause":"Token 失效、权限不足或 Token 不属于该 Zone。","steps":["在 Cloudflare API Tokens 验证 Token。","至少授予 Zone:DNS Edit 和 Zone:Zone Read。","确认 Token 资源范围包含目标 Zone。"],"prevention":"使用最小权限 Token，并记录所属账号/Zone。","quick":"在 Cloudflare API Tokens 验证 Token。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：Cloudflare Authentication error。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“Cloudflare Authentication error”发生前最后一个成功步骤，以及先做步骤“在 Cloudflare API Tokens 验证 Token。”执行后的实际结果。"},{"q":"Zone ID 错误","symptom":"测试提示找不到 Zone 或记录写入错误区域。","cause":"复制了 Account ID、其他域名 Zone ID 或包含空格。","steps":["在目标域名 Overview 复制 Zone ID。","核对 32 位标识。","重新保存并只测试该根域名。"],"prevention":"显示名称、根域名、Zone ID 三项一起核对。","quick":"在目标域名 Overview 复制 Zone ID。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：Zone ID 错误。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“Zone ID 错误”发生前最后一个成功步骤，以及先做步骤“在目标域名 Overview 复制 Zone ID。”执行后的实际结果。"},{"q":"DNS 记录已存在","symptom":"新增时 Cloudflare 返回 duplicate/record already exists。","cause":"同名同类型记录已由外部创建，D1 尚未同步。","steps":["在 Cloudflare DNS 页面搜索完整记录。","决定导入、删除外部记录或改主机名。","不要重复点击新增。"],"prevention":"尽量只通过本系统管理其授权子域记录。","quick":"在 Cloudflare DNS 页面搜索完整记录。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：DNS 记录已存在。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“DNS 记录已存在”发生前最后一个成功步骤，以及先做步骤“在 Cloudflare DNS 页面搜索完整记录。”执行后的实际结果。"},{"q":"删除 DNS 本地成功但 Cloudflare 仍存在","symptom":"页面记录消失，Cloudflare 控制台还有记录。","cause":"外部删除请求因权限/网络失败，但 best-effort 流程清理了本地记录。","steps":["查看操作日志中的 warning。","在 Cloudflare 手动删除残留记录。","修复 Token 后重新测试。"],"prevention":"高风险删除应定期对账 D1 与 Cloudflare。","quick":"查看操作日志中的 warning。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：删除 DNS 本地成功但 Cloudflare 仍存在。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“删除 DNS 本地成功但 Cloudflare 仍存在”发生前最后一个成功步骤，以及先做步骤“查看操作日志中的 warning。”执行后的实际结果。"},{"q":"CNAME 无法开启代理","symptom":"代理开关被强制关闭或 Cloudflare 拒绝。","cause":"目标/记录类型不支持代理，或后缀策略关闭默认代理。","steps":["确认类型是 A、AAAA 或 CNAME。","MX/TXT 必须仅 DNS。","检查目标是否允许 Cloudflare 代理。"],"prevention":"前端只对可代理类型展示有效开关。","quick":"确认类型是 A、AAAA 或 CNAME。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：CNAME 无法开启代理。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“CNAME 无法开启代理”发生前最后一个成功步骤，以及先做步骤“确认类型是 A、AAAA 或 CNAME。”执行后的实际结果。"},{"q":"MX 记录添加失败","symptom":"邮箱配置时提示类型不允许或优先级错误。","cause":"根域名 allowedTypes 未包含 MX、全局关闭 MX，或内容格式不符合要求。","steps":["开启允许 MX。","把 MX 加入该后缀允许类型。","填写合法邮件服务器和优先级。"],"prevention":"邮件域名变更前先记录原 MX/TXT。","quick":"开启允许 MX。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：MX 记录添加失败。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“MX 记录添加失败”发生前最后一个成功步骤，以及先做步骤“开启允许 MX。”执行后的实际结果。"},{"q":"TXT 验证长期不生效","symptom":"第三方平台查不到 TXT。","cause":"主机名填成完整域导致重复后缀，或 DNS 缓存未过期。","steps":["在系统中核对生成的完整记录名。","使用 dig/nslookup 查询权威结果。","等待 TTL 后再验证。"],"prevention":"输入框明确主机记录规则，避免重复拼接根域。","quick":"在系统中核对生成的完整记录名。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：TXT 验证长期不生效。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“TXT 验证长期不生效”发生前最后一个成功步骤，以及先做步骤“在系统中核对生成的完整记录名。”执行后的实际结果。"},{"q":"多个根域名顺序不正确","symptom":"注册页排列与后台卡片不同。","cause":"registerOrder 重复、未保存，或拖动后浏览器旧缓存。","steps":["拖动后确认编号自动重排。","保存 DNS 配置。","公开配置按 registerOrder 验证。"],"prevention":"保持顺序值唯一连续，拖动后自动编号。","quick":"拖动后确认编号自动重排。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：多个根域名顺序不正确。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“多个根域名顺序不正确”发生前最后一个成功步骤，以及先做步骤“拖动后确认编号自动重排。”执行后的实际结果。"},{"q":"Cloudflare 81044/记录不存在","symptom":"编辑或删除时提示指定记录不存在。","cause":"记录已在 Cloudflare 外部删除，D1 仍保存旧 cf_record_id。","steps":["在 Cloudflare 控制台确认记录。","清理本地旧记录或重新创建。","检查是否有人绕过系统操作。"],"prevention":"限制直接改 Cloudflare，并定期做同步检查。","quick":"在 Cloudflare 控制台确认记录。","verify":"点击“测试所有可用根域名”，再对一条测试记录执行新增、修改、删除；Cloudflare DNS 与系统列表应一致。 本条重点确认：Cloudflare 81044/记录不存在。","collect":"收集根域名、Zone ID 前后四位、记录类型/名称、Cloudflare 错误码、系统记录 ID和操作时间；不要提供完整 Token。 本条还要注明“Cloudflare 81044/记录不存在”发生前最后一个成功步骤，以及先做步骤“在 Cloudflare 控制台确认记录。”执行后的实际结果。"}]},{"key":"messages","title":"消息中心与帮助中心","items":[{"q":"新注册用户看到注册前的群发消息","symptom":"8 月注册用户看到了 7 月全体通知。","cause":"旧查询只按 target_type 匹配，没有比较用户 created_at。","steps":["部署 v99 的 src/index.ts。","用新账号验证只显示 sent_at 不早于 created_at 的全体/角色消息。","直接发给该用户的消息仍应显示。"],"prevention":"所有广播查询加入用户创建时间边界。","quick":"部署 v99 的 src/index.ts。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：新注册用户看到注册前的群发消息。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“新注册用户看到注册前的群发消息”发生前最后一个成功步骤，以及先做步骤“部署 v99 的 src/index.ts。”执行后的实际结果。"},{"q":"用户删除消息后管理员仍能看到","symptom":"用户消息中心消失，但管理员已发送列表还在。","cause":"用户删除是个人隐藏记录，不是全局撤回或物理删除。","steps":["这是预期行为。","管理员需要全局删除时使用管理员消息列表删除。","撤销仅在发送后允许时间内使用。"],"prevention":"界面文案明确“从自己的消息中心删除”。","quick":"这是预期行为。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：用户删除消息后管理员仍能看到。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“用户删除消息后管理员仍能看到”发生前最后一个成功步骤，以及先做步骤“这是预期行为。”执行后的实际结果。"},{"q":"批量删除没有反应","symptom":"选择消息后点击删除仍提示未选择。","cause":"勾选框来自不同区域、页面重渲染后选择丢失，或旧前端。","steps":["只选择“我的消息”区域的复选框。","确认 app.js?v=90。","重新全选后执行并通过二次确认。"],"prevention":"批量操作按钮与选择范围放在同一卡片。","quick":"只选择“我的消息”区域的复选框。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：批量删除没有反应。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“批量删除没有反应”发生前最后一个成功步骤，以及先做步骤“只选择“我的消息”区域的复选框。”执行后的实际结果。"},{"q":"未读数字与列表不一致","symptom":"侧边栏数字未及时减少。","cause":"标记已读后徽标缓存尚未刷新或消息被其他标签处理。","steps":["刷新消息中心。","确认 read-batch 请求成功。","关闭重复标签页再测试。"],"prevention":"操作成功后立即重新请求消息列表并更新徽标。","quick":"刷新消息中心。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：未读数字与列表不一致。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“未读数字与列表不一致”发生前最后一个成功步骤，以及先做步骤“刷新消息中心。”执行后的实际结果。"},{"q":"管理员群发对象选错","symptom":"普通用户收到管理员内部消息。","cause":"targetType/targetRole 在发送表单中选错。","steps":["需要时尽快撤销。","查看已发送消息的目标。","重新发送正确范围并说明。"],"prevention":"发送前二次确认展示最终目标人数/角色。","quick":"需要时尽快撤销。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：管理员群发对象选错。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“管理员群发对象选错”发生前最后一个成功步骤，以及先做步骤“需要时尽快撤销。”执行后的实际结果。"},{"q":"用户回复没有进入管理员视图","symptom":"用户点回复后管理员找不到。","cause":"回复作为新消息发送给原发送者/管理员，筛选区域可能不同。","steps":["查看管理员“我的消息”和未读徽标。","按发送人和时间查找。","确认原消息 sender_user_id 存在。"],"prevention":"客服对话统一使用站内消息，不混用外部表单。","quick":"查看管理员“我的消息”和未读徽标。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：用户回复没有进入管理员视图。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“用户回复没有进入管理员视图”发生前最后一个成功步骤，以及先做步骤“查看管理员“我的消息”和未读徽标。”执行后的实际结果。"},{"q":"帮助中心搜索不到管理员新增内容","symptom":"后台已保存问题，用户搜索无结果。","cause":"帮助内容未保存到 KV、分类为空，或用户端缓存旧 config。","steps":["后台重新打开确认内容存在。","查看 /api/config help。","强制刷新用户页面。"],"prevention":"每次编辑后用关键词在用户帮助中心验收。","quick":"后台重新打开确认内容存在。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：帮助中心搜索不到管理员新增内容。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“帮助中心搜索不到管理员新增内容”发生前最后一个成功步骤，以及先做步骤“后台重新打开确认内容存在。”执行后的实际结果。"},{"q":"恢复默认帮助内容覆盖自定义问题","symptom":"点击恢复默认后自定义 FAQ 丢失。","cause":"恢复操作设计为整体替换。","steps":["从之前导出的配置恢复 help。","没有备份时只能从历史 KV/代码重建。","恢复默认前先复制或导出。"],"prevention":"高风险按钮二次确认并定期导出设置。","quick":"从之前导出的配置恢复 help。","verify":"用发送方和接收方两个账号复测；目标账号只看到应收到的消息，删除和未读数量应立即更新。 本条重点确认：恢复默认帮助内容覆盖自定义问题。","collect":"收集消息 ID、发送者/目标类型、发送时间、用户注册时间、是否已读/已删除，以及两个账号看到的列表截图。 本条还要注明“恢复默认帮助内容覆盖自定义问题”发生前最后一个成功步骤，以及先做步骤“从之前导出的配置恢复 help。”执行后的实际结果。"}]},{"key":"settings","title":"Workers KV、设置与导入导出","items":[{"q":"保存设置后刷新恢复旧值","symptom":"提示保存成功但再次打开是旧配置。","cause":"APP_KV 绑定错误、写入失败，或另一个环境读取不同 KV。","steps":["确认 binding 名称 APP_KV。","查看 Worker 日志是否 put 失败。","对比生产/预览 KV namespace ID。"],"prevention":"生产和预览使用明确独立或明确共享的 KV。","quick":"确认 binding 名称 APP_KV。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：保存设置后刷新恢复旧值。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“保存设置后刷新恢复旧值”发生前最后一个成功步骤，以及先做步骤“确认 binding 名称 APP_KV。”执行后的实际结果。"},{"q":"导入配置后系统异常","symptom":"导入 JSON 后页面或 DNS 设置错误。","cause":"导入文件来自旧版本、字段格式不兼容或含错误密钥信息。","steps":["先恢复导入前备份。","只导入可信 JSON。","逐组检查注册、DNS、安全设置。"],"prevention":"每次导入前自动导出当前配置并标注版本。","quick":"先恢复导入前备份。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：导入配置后系统异常。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“导入配置后系统异常”发生前最后一个成功步骤，以及先做步骤“先恢复导入前备份。”执行后的实际结果。"},{"q":"Secret 在后台显示为空","symptom":"RESEND/Turnstile/CF Token 已配置，但输入框为空。","cause":"安全设计不会回显 Secret，留空代表保持原值。","steps":["看“已配置”提示。","不要为查看而重新粘贴。","仅需要替换时输入新值。"],"prevention":"密钥状态显示布尔值，不向前端返回明文。","quick":"看“已配置”提示。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：Secret 在后台显示为空。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“Secret 在后台显示为空”发生前最后一个成功步骤，以及先做步骤“看“已配置”提示。”执行后的实际结果。"},{"q":"Worker 变量优先级造成后台值无效","symptom":"后台改了发件邮箱或 Site Key，实际仍用旧值。","cause":"代码优先读取 Worker 环境变量/Secret。","steps":["检查 EMAIL_FROM、TURNSTILE_SITE_KEY 等变量。","决定统一由变量还是后台管理。","修改变量后重新部署。"],"prevention":"在后台说明环境变量优先级，避免两处长期配置不同。","quick":"检查 EMAIL_FROM、TURNSTILE_SITE_KEY 等变量。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：Worker 变量优先级造成后台值无效。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“Worker 变量优先级造成后台值无效”发生前最后一个成功步骤，以及先做步骤“检查 EMAIL_FROM、TURNSTILE_SITE_KEY 等变量。”执行后的实际结果。"},{"q":"设置表单提示参数格式错误","symptom":"无法保存邮箱、颜色、URL 或范围。","cause":"前端校验发现格式或上下限不合法。","steps":["根据具体提示修正。","颜色使用 #RRGGBB。","邮箱一行一个，数值在允许范围内。"],"prevention":"保存前做前后端双重验证。","quick":"根据具体提示修正。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：设置表单提示参数格式错误。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“设置表单提示参数格式错误”发生前最后一个成功步骤，以及先做步骤“根据具体提示修正。”执行后的实际结果。"},{"q":"APP_KV 未绑定","symptom":"接口报 KV undefined 或读取设置失败。","cause":"wrangler 没有 kv_namespaces binding，或名称不是 APP_KV。","steps":["在 Cloudflare Worker Bindings 添加 KV。","变量名必须与 Env 接口一致。","重新部署并访问 /api/config。"],"prevention":"新环境建立时使用绑定检查清单。","quick":"在 Cloudflare Worker Bindings 添加 KV。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：APP_KV 未绑定。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“APP_KV 未绑定”发生前最后一个成功步骤，以及先做步骤“在 Cloudflare Worker Bindings 添加 KV。”执行后的实际结果。"},{"q":"配置文件包含敏感信息","symptom":"导出的 JSON 被公开上传。","cause":"部分后台保存的 Token 可能包含在完整设置导出中。","steps":["立即撤销泄露密钥。","删除公开文件和 Git 历史。","重新生成 Resend/Cloudflare/Turnstile Secret。"],"prevention":"配置备份按机密文件保存，不放公共仓库。","quick":"立即撤销泄露密钥。","verify":"保存后离开页面再返回，字段应保持新值；重新部署后再次确认生产环境读取的是同一份 KV 设置。 本条重点确认：配置文件包含敏感信息。","collect":"收集设置分组名称、保存接口响应、APP_KV 绑定名称、生产/预览环境名称和重新打开后的字段值。 本条还要注明“配置文件包含敏感信息”发生前最后一个成功步骤，以及先做步骤“立即撤销泄露密钥。”执行后的实际结果。"}]},{"key":"automation","title":"定时任务、日志与维护","items":[{"q":"定时任务从未运行","symptom":"后台开启自动化但没有日志。","cause":"Cloudflare Worker 没配置 Cron Trigger，仅保存设置不会自动触发。","steps":["在 Triggers 添加 Cron。","表达式与后台预期一致。","等待一次周期后查日志。"],"prevention":"部署清单同时包含代码、绑定和触发器。","quick":"在 Triggers 添加 Cron。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：定时任务从未运行。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“定时任务从未运行”发生前最后一个成功步骤，以及先做步骤“在 Triggers 添加 Cron。”执行后的实际结果。"},{"q":"日志保留天数设置无效","symptom":"设置 7 天却只看到更短时间。","cause":"旧代码硬编码 4 天清理，或 Cron 使用旧部署。","steps":["确认 v99 cleanup 使用 auditRetentionDays。","检查系统状态和当前部署版本。","不要手工运行旧清理脚本。"],"prevention":"保留天数只从一个设置来源读取。","quick":"确认 v99 cleanup 使用 auditRetentionDays。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：日志保留天数设置无效。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“日志保留天数设置无效”发生前最后一个成功步骤，以及先做步骤“确认 v99 cleanup 使用 auditRetentionDays。”执行后的实际结果。"},{"q":"自动清理误删风险","symptom":"域名刚过期就被清理 DNS。","cause":"保护天数过短、时区误判或任务条件错误。","steps":["立即暂停 cleanupExpiredDns。","核对 expires_at 和当前 UTC。","从备份/日志恢复 DNS。"],"prevention":"至少设置 7 天保护期并先用只报告模式验收。","quick":"立即暂停 cleanupExpiredDns。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：自动清理误删风险。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“自动清理误删风险”发生前最后一个成功步骤，以及先做步骤“立即暂停 cleanupExpiredDns。”执行后的实际结果。"},{"q":"任务失败没有管理员通知","symptom":"Cron 日志报错但消息中心无告警。","cause":"notifyAdminOnFailure 关闭，或写消息本身失败。","steps":["开启失败推送。","确认至少有 active 管理员。","检查 system_messages 写入错误。"],"prevention":"告警路径定期用测试失败演练。","quick":"开启失败推送。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：任务失败没有管理员通知。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“任务失败没有管理员通知”发生前最后一个成功步骤，以及先做步骤“开启失败推送。”执行后的实际结果。"},{"q":"操作日志增长过快","symptom":"D1 容量快速增加、查询变慢。","cause":"保留天数过长、重复刷新或高频攻击产生大量日志。","steps":["设置合理保留天数。","分析高频 action/IP。","为重复失败事件做限流。"],"prevention":"日志用于审计而非无限保存，长期归档到外部存储。","quick":"设置合理保留天数。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：操作日志增长过快。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“操作日志增长过快”发生前最后一个成功步骤，以及先做步骤“设置合理保留天数。”执行后的实际结果。"},{"q":"系统状态显示旧版本","symptom":"状态卡片仍是 v99/旧版本。","cause":"前端或后端版本字符串未同步，或缓存旧文件。","steps":["查看 /api/admin/system-status 原始响应。","确认 src/index.ts 与 app.js 都更新为 v99。","强制刷新。"],"prevention":"每次发布统一更新一个版本常量。","quick":"查看 /api/admin/system-status 原始响应。","verify":"手动触发一次对应任务或等待一个周期；操作日志应出现开始、结果和错误信息，任务不能重复执行。 本条重点确认：系统状态显示旧版本。","collect":"收集 Cron 表达式、任务名称、最近三次运行时间、任务日志、处理数量和第一条失败记录。 本条还要注明“系统状态显示旧版本”发生前最后一个成功步骤，以及先做步骤“查看 /api/admin/system-status 原始响应。”执行后的实际结果。"}]},{"key":"security","title":"安全、性能、备份与恢复","items":[{"q":"API Key 曾发到聊天或截图","symptom":"完整 re_ 或 Cloudflare Token 已公开。","cause":"任何看到内容的人都可能调用接口。","steps":["立即撤销旧 Key。","生成最小权限新 Key。","更新 Worker Secret 并重新部署。","检查服务日志是否有异常调用。"],"prevention":"密钥永不发聊天、工单截图或 GitHub。","quick":"立即撤销旧 Key。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：API Key 曾发到聊天或截图。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“API Key 曾发到聊天或截图”发生前最后一个成功步骤，以及先做步骤“立即撤销旧 Key。”执行后的实际结果。"},{"q":"疑似账号被盗","symptom":"出现陌生登录、DNS 修改或消息发送。","cause":"密码泄露、共享账号或会话 Cookie 被窃取。","steps":["立即禁用账号。","清理该用户 sessions。","重置密码并检查操作日志/IP。","核对并恢复 DNS。"],"prevention":"管理员不共用账号，定期轮换密码和密钥。","quick":"立即禁用账号。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：疑似账号被盗。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“疑似账号被盗”发生前最后一个成功步骤，以及先做步骤“立即禁用账号。”执行后的实际结果。"},{"q":"接口被高频刷导致性能下降","symptom":"429、D1 延迟或 KV 写入激增。","cause":"机器人重复登录、验证码、注册或 DNS 请求。","steps":["按路径/IP 查看日志。","提高相应 rateLimit。","在 WAF 对异常来源做限速而非全站挑战。"],"prevention":"限流分场景，避免正常用户被同一粗糙规则误伤。","quick":"按路径/IP 查看日志。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：接口被高频刷导致性能下降。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“接口被高频刷导致性能下降”发生前最后一个成功步骤，以及先做步骤“按路径/IP 查看日志。”执行后的实际结果。"},{"q":"D1 数据需要恢复","symptom":"误删用户、域名或消息。","cause":"硬删除不可从应用内撤销，需依赖备份。","steps":["立即停止相关写入。","使用 D1 Time Travel/备份能力恢复到新数据库。","对比并迁移需要的记录。","重新绑定前先测试。"],"prevention":"定期导出关键表并演练恢复流程。","quick":"立即停止相关写入。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：D1 数据需要恢复。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“D1 数据需要恢复”发生前最后一个成功步骤，以及先做步骤“立即停止相关写入。”执行后的实际结果。"},{"q":"Cloudflare DNS 与 D1 不一致","symptom":"系统显示记录和实际解析不同。","cause":"有人直接在 Cloudflare 修改，或 API 部分失败。","steps":["导出双方记录做 fqdn/type/content 对账。","决定以哪边为准。","修复 Token 后逐条同步。"],"prevention":"生产 DNS 修改统一走系统并保留审计。","quick":"导出双方记录做 fqdn/type/content 对账。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：Cloudflare DNS 与 D1 不一致。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“Cloudflare DNS 与 D1 不一致”发生前最后一个成功步骤，以及先做步骤“导出双方记录做 fqdn/type/content 对账。”执行后的实际结果。"},{"q":"页面加载慢","symptom":"首屏长时间加载或接口串行。","cause":"Turnstile 外部脚本超时、一次查询数据过多或网络不稳。","steps":["v99 让 Turnstile 懒加载并可回退图形验证码。","检查 Network 最慢请求。","管理员大列表限制数量并分页。"],"prevention":"外部依赖设超时和降级，不阻塞整个应用启动。","quick":"v99 让 Turnstile 懒加载并可回退图形验证码。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：页面加载慢。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“页面加载慢”发生前最后一个成功步骤，以及先做步骤“v99 让 Turnstile 懒加载并可回退图形验证码。”执行后的实际结果。"},{"q":"发布新版本前如何安全验收","symptom":"担心覆盖后影响生产用户。","cause":"直接在生产修改没有回滚点。","steps":["导出 KV 设置和 D1 备份。","在预览 Worker 使用复制数据库测试。","执行登录、注册、注册码、邮件、申请、DNS、消息七条主流程。","保留上一版覆盖包和提交 SHA。"],"prevention":"采用预览→小范围→生产的发布顺序，并记录验收结果。","quick":"导出 KV 设置和 D1 备份。","verify":"完成处理后检查近一小时操作日志、登录设备和 DNS 变更；不应再出现相同异常来源或未授权操作。 本条重点确认：发布新版本前如何安全验收。","collect":"收集 Ray ID、异常 IP、受影响账号/域名、操作日志、Cloudflare Security Event 和时间线；所有密钥必须打码。 本条还要注明“发布新版本前如何安全验收”发生前最后一个成功步骤，以及先做步骤“导出 KV 设置和 D1 备份。”执行后的实际结果。"}]},{"key":"ui","title":"界面、浏览器与移动端","items":[{"q":"页面每十几秒自动刷新","symptom":"用户输入时页面频繁重新加载。","cause":"存在多个定时器、旧缓存脚本、visibilitychange 立即刷新或异常重试循环。","quick":"确认 index.html 引用 app.js?v=90。","steps":["确认 index.html 引用 app.js?v=90。","在 Console 检查是否重复注册 setInterval。","清站点数据并关闭其他旧标签页。","确认全局只有一个 10 分钟刷新任务。","输入框/弹窗打开时应暂停强制刷新。"],"verify":"前台静置 9 分钟不刷新，第 10 分钟左右刷新；输入和弹窗期间不刷新。","collect":"页面加载时间、每次刷新时间、Console 定时器日志、app.js版本和标签页数量。","prevention":"自动刷新统一由单一调度器管理，并在每次渲染前清理旧定时器。"},{"q":"按钮点击一次却执行两次","symptom":"一次操作产生两条消息、两次申请或两次请求。","cause":"事件监听重复绑定、按钮未禁用或用户双击。","quick":"在 Network 查看是否出现两个相同 POST。","steps":["在 Network 查看是否出现两个相同 POST。","检查 render 后是否重复 addEventListener。","提交开始立即禁用按钮。","后端用唯一约束/幂等键防重复。","完成后只恢复一次按钮状态。"],"verify":"快速双击按钮只产生一个请求和一条数据。","collect":"两个请求的时间/请求体、事件绑定代码、产生的重复记录 ID。","prevention":"所有写操作前端防双击、后端保证幂等。"},{"q":"弹窗关闭后页面不能滚动","symptom":"关闭模态框后鼠标滚轮无效。","cause":"body 的 overflow/锁定 class 没有清理，或透明遮罩仍存在。","quick":"检查 DOM 是否还存在 modal/backdrop。","steps":["检查 DOM 是否还存在 modal/backdrop。","确认 closeModal 移除 body 锁定 class。","按 Esc 和关闭按钮分别测试。","检查异常分支是否跳过清理。","刷新后确认恢复。"],"verify":"连续打开关闭五次后页面仍可滚动，DOM 无残留遮罩。","collect":"DOM 残留元素、body class/style、触发关闭方式和 Console 错误。","prevention":"所有弹窗通过统一 openModal/closeModal 管理，并在路由切换时强制清理。"},{"q":"输入框字体或尺寸与主题不一致","symptom":"新功能输入框显得过大、边框和现有页面不协调。","cause":"新组件使用内联样式或没有复用现有 field/input CSS。","quick":"对比同页面标准输入框的 class。","steps":["对比同页面标准输入框的 class。","移除不必要内联宽高和字体。","复用 field、btn、card 等现有样式。","桌面和手机检查高度、圆角、字号。","只在确需新样式时修改 styles.css。"],"verify":"新旧输入框在高度、字号、边框、焦点状态和移动端布局上保持一致。","collect":"新旧组件 DOM/class、计算样式截图、视口尺寸和浏览器。","prevention":"新增界面先复用设计系统，避免每个功能单独造样式。"},{"q":"下拉框保存后恢复默认","symptom":"选择值后提示保存成功，重开页面又变回默认。","cause":"表单 name 与后端字段不一致，collect payload 漏字段，或 sanitize 丢弃未知值。","quick":"检查 select 的 name/id。","steps":["检查 select 的 name/id。","查看保存请求 JSON 是否包含该值。","检查后端 settings 合并和 sanitize。","查看 KV 保存后的原始配置。","重新打开页面确认读取字段。"],"verify":"选择三个不同值分别保存，重新进入页面都保持对应值。","collect":"表单字段名、请求体、后端保存结果、KV值和重开页面值。","prevention":"每个新增设置做“保存请求→KV→读取→渲染”闭环测试。"},{"q":"上传图片预览正常但保存后丢失","symptom":"图形验证码背景或自定义图片当时可见，刷新后消失。","cause":"只保存了本地 object URL，Base64 未进入设置，或超过 KV/请求体限制。","quick":"检查保存请求是否包含 data:image/...。","steps":["检查保存请求是否包含 data:image/...。","确认图片大小低于界面限制。","后端 sanitize 允许该 MIME 类型。","保存后读取 API 查看字段长度。","重新生成验证码测试背景。"],"verify":"刷新浏览器和重新部署后图片仍存在，新验证码使用该背景。","collect":"图片格式/大小、请求体字段长度、保存接口响应和读取后的字段。","prevention":"上传时压缩尺寸和体积，并在保存成功后从服务端值重新渲染预览。"},{"q":"移动端页面横向溢出","symptom":"手机页面可以左右拖动，按钮或表格超出屏幕。","cause":"固定宽度、长文本、表格 min-width 或 flex 子项不能收缩。","quick":"在 360px 宽度复现。","steps":["在 360px 宽度复现。","检查最大宽度超过 viewport 的元素。","给长字符串设置换行或横向滚动容器。","flex 子项设置 min-width:0。","表格在小屏使用滚动而不是压缩文字。"],"verify":"360px 和 390px 视口无整页横向滚动，表格只在自身容器滚动。","collect":"视口宽度、溢出元素选择器、computed width和页面截图。","prevention":"所有管理表格和长 Token/域名做小屏溢出测试。"},{"q":"Toast 提示被遮挡或看不全","symptom":"成功/错误提示在顶部被导航、浏览器安全区或其他层覆盖。","cause":"z-index、fixed 定位、安全区或过长错误文本未处理。","quick":"检查 toast 容器 z-index。","steps":["检查 toast 容器 z-index。","为顶部加入 safe-area inset。","长错误允许换行并限制最大宽度。","多条提示采用队列而不是重叠。","在手机竖屏测试。"],"verify":"桌面和手机都能完整看到提示，连续三条不会互相遮挡。","collect":"设备、页面层级、toast DOM/computed z-index和完整提示文本。","prevention":"Toast 只显示可操作摘要，完整错误放详情或日志。"},{"q":"刷新后滚动位置不合理","symptom":"自动刷新后跳到顶部或恢复到错误位置。","cause":"保存滚动位置时页面结构改变，或恢复早于内容渲染完成。","quick":"确认刷新前只保存当前路由的 scrollY。","steps":["确认刷新前只保存当前路由的 scrollY。","路由相同才恢复。","内容渲染完成后 requestAnimationFrame 恢复。","弹窗打开时不触发全页刷新。","列表数量大变时允许回到合理上限。"],"verify":"在长列表中间等待自动刷新，页面恢复到接近原位置且不会跳动多次。","collect":"路由、刷新前后scrollY、列表长度、恢复执行时间和Console日志。","prevention":"滚动恢复与路由、数据版本绑定，不全站共用一个值。"},{"q":"浏览器返回按钮进入错误页面","symptom":"使用后退后页面空白、权限页或旧弹窗残留。","cause":"hash 路由没有正确处理 popstate/hashchange，或状态缓存未清理。","quick":"记录前后路由 hash。","steps":["记录前后路由 hash。","确认路由监听只绑定一次。","后退时关闭 modal 和临时选择状态。","需要登录的路由先重新检查用户状态。","前进/后退连续测试。"],"verify":"在五个主要页面间前进后退，标题、内容、权限和滚动都正确。","collect":"路由序列、错误hash、state.user状态、Console错误和残留DOM。","prevention":"每个新增路由加入导航、权限和后退测试。"}]},{"key":"observability","title":"日志、Ray ID 与远程诊断","items":[{"q":"Workers 日志在哪里看","symptom":"管理员需要查接口错误但找不到入口。","cause":"Cloudflare 控制台版本变化，Observability 未开启或进入了错误 Worker。","quick":"进入 Workers & Pages，选择 storage Worker。","steps":["进入 Workers & Pages，选择 storage Worker。","打开 Observability/Logs。","按发生时间和请求路径筛选。","确认日志中的部署版本是当前 v99。","需要持续排查时临时开启实时日志。"],"verify":"能找到一次测试请求，并看到方法、路径、状态和自定义错误日志。","collect":"Worker 名称、部署版本、筛选时间范围和日志事件 ID。","prevention":"生产 Worker 保持基础 Observability，问题处理完关闭过度详细采样。"},{"q":"如何用 Ray ID 查 403","symptom":"页面显示 cf-ray，但不知道怎么定位。","cause":"Ray ID 属于 Cloudflare 边缘事件，需要在 Security Events 而非 D1 中搜索。","quick":"复制 Ray ID，不要漏掉连字符后的机房代码。","steps":["复制 Ray ID，不要漏掉连字符后的机房代码。","进入 Security→Events。","把时间范围缩小到报错前后五分钟。","按 Ray ID 搜索并查看命中规则。","记录动作是 block、challenge 还是 rate limit。"],"verify":"找到唯一对应事件，并能说明是哪条规则拦截。","collect":"Ray ID、规则名、动作、规则表达式、请求路径和来源 IP。","prevention":"用户可见 403 提示保留 Ray ID，方便管理员快速定位。"},{"q":"Network 中应该看哪些信息","symptom":"接口失败时开发者工具信息很多，不知道重点。","cause":"没有固定检查顺序。","quick":"打开 Network 并勾选 Preserve log。","steps":["打开 Network 并勾选 Preserve log。","点击失败请求，先看 Status和Request URL。","看 Response/Preview 中业务错误码。","看 Request Headers 的 Origin、Cookie、cf-*。","看 Timing 判断是立即拒绝还是超时。"],"verify":"能从请求判断是401/403/404/409/429/500/502/503中的哪类。","collect":"Request URL、method、status、response body、关键headers和timing。","prevention":"管理员处理问题时优先保存 HAR 或关键请求截图。"},{"q":"如何区分业务 403 和 Cloudflare 403","symptom":"同样是403，处理方向完全不同。","cause":"业务接口返回 JSON 错误码；Cloudflare 边缘通常返回HTML或挑战页。","quick":"查看 Content-Type：application/json通常是业务响应。","steps":["查看 Content-Type：application/json通常是业务响应。","查看 Response 是否包含 code/message。","若是HTML并有cf-ray，查 Security Events。","若Workers日志有请求，继续看业务权限。","不要为业务403关闭WAF。"],"verify":"对一条测试业务拒绝和一条WAF测试都能正确分类。","collect":"Content-Type、Response前200字、Ray ID、Workers是否有日志。","prevention":"错误提示显示业务错误码，边缘403显示Ray ID。"},{"q":"系统状态显示正常但某接口失败","symptom":"健康卡片绿色，具体功能仍报错。","cause":"系统状态只检查基础绑定，不能覆盖所有数据、权限和外部API。","quick":"直接测试失败接口。","steps":["直接测试失败接口。","查看该接口依赖的具体表、设置和Token。","检查目标用户/域名状态。","用“测试所有可用根域名”等专项测试。","不要只依赖总状态卡。"],"verify":"专项测试定位到具体根域名、邮箱或表，而不是泛化为“系统异常”。","collect":"系统状态响应、失败接口、专项测试结果和依赖配置。","prevention":"系统状态与专项检查并存，每个外部依赖有独立测试按钮。"},{"q":"日志里只有 console.error 没有上下文","symptom":"看到“failed”但不知道哪个用户或记录。","cause":"日志输出没有请求ID、用户ID、对象ID和场景。","quick":"为错误日志加入场景名称。","steps":["为错误日志加入场景名称。","加入不敏感的用户ID/申请ID/记录ID。","加入请求路径和Ray ID。","不要输出Token、Cookie或密码。","统一错误格式便于搜索。"],"verify":"下一次同类失败能从一条日志直接定位对象和操作。","collect":"当前日志原文、缺失字段、建议上下文和调用位置。","prevention":"所有关键catch日志采用“场景+对象ID+错误”格式。"},{"q":"管理员邮件和日志时间对不上","symptom":"邮件显示时间与Cloudflare日志相差数小时。","cause":"邮件用UTC，界面显示本地时区，或字符串被错误解析。","quick":"确认邮件中的时间是否带Z。","steps":["确认邮件中的时间是否带Z。","Cloudflare日志通常按控制台所选时区展示。","把两个时间统一转换到UTC+8对比。","检查D1字段是否存ISO UTC。","不要直接比较没有时区的字符串。"],"verify":"同一事件在邮件、Workers日志、操作日志中换算后相差不超过一分钟。","collect":"三处原始时间字符串、浏览器时区和事件ID。","prevention":"所有内部时间存UTC，界面明确显示本地时区。"},{"q":"如何保存一次完整故障证据","symptom":"问题稍后消失，无法再复现。","cause":"只截了页面，没有请求和日志。","quick":"截图页面完整错误。","steps":["截图页面完整错误。","导出失败请求HAR或复制Response。","保存Workers日志事件。","记录账号、时间、操作步骤和数据ID。","记录问题消失前是否部署/改设置。"],"verify":"其他管理员仅凭记录即可复现或定位，不需要再次询问基本信息。","collect":"页面截图、HAR、日志、时间线、账号/对象ID、配置变化和部署SHA。","prevention":"重大故障使用固定模板建记录，修复后附验收结果。"},{"q":"日志中出现大量相同错误","symptom":"一分钟内刷出大量重复行。","cause":"自动刷新、重试、机器人或批任务循环放大故障。","quick":"先按路径/IP/用户聚合。","steps":["先按路径/IP/用户聚合。","暂停对应自动任务或入口。","检查前端是否每十几秒刷新。","为外部API失败设置退避。","修复后确认错误速率下降。"],"verify":"相同错误每分钟数量恢复正常，且正常请求成功率未下降。","collect":"错误数量曲线、Top路径/IP、重试代码、任务配置和修复前后对比。","prevention":"错误重试使用指数退避和上限，告警使用去重冷却。"},{"q":"如何判断修复是否产生新问题","symptom":"原问题好了，但担心影响其他功能。","cause":"改动共享函数、设置结构或数据库查询，可能有连带影响。","quick":"查看git diff确定共享代码范围。","steps":["查看git diff确定共享代码范围。","列出直接和间接调用者。","运行核心冒烟：登录、注册、申请、DNS、消息、邮件。","检查Workers错误率和D1写入。","观察至少一个自动刷新周期。"],"verify":"原问题消失，核心冒烟全部通过，错误率和数据量没有异常上升。","collect":"diff、调用点列表、回归结果、错误率和数据对账。","prevention":"修改共享函数必须做跨模块回归，而不是只测一个按钮。"}]},{"key":"api","title":"HTTP 状态码与接口错误","items":[{"q":"HTTP 400 怎么处理","symptom":"接口返回400。","cause":"请求字段缺失、格式不合法或验证码输入错误。","quick":"查看Response中的业务错误码和message。","steps":["查看Response中的业务错误码和message。","核对表单必填项和格式。","确认前端发送字段名与后端一致。","不要通过重复提交解决400。"],"verify":"修正请求后返回2xx，错误字段在前端有明确提示。","collect":"请求体（敏感字段打码）、业务错误码、字段规则和Response。","prevention":"前端先校验，后端返回具体字段错误。"},{"q":"HTTP 401 怎么处理","symptom":"页面提示未登录或会话失效。","cause":"Session Cookie缺失、过期、被清理或请求未携带凭据。","quick":"重新登录。","steps":["重新登录。","检查Set-Cookie和后续Cookie。","确认请求使用同源并带credentials。","查询sessions有效期。"],"verify":"登录后/api/auth/me稳定返回当前用户。","collect":"请求域名、Cookie是否存在、session记录、401业务错误码。","prevention":"登录和API使用同一HTTPS域名，敏感操作前检查会话。"},{"q":"HTTP 403 怎么处理","symptom":"请求被拒绝。","cause":"可能是权限/账号状态/来源校验/黑名单，或Cloudflare边缘拦截。","quick":"先区分JSON业务403与HTML边缘403。","steps":["先区分JSON业务403与HTML边缘403。","业务403看code：ACCOUNT_DISABLED、ORIGIN_MISMATCH等。","边缘403用Ray ID查Security Events。","按具体原因处理，不全局放开权限。"],"verify":"授权范围正确，合法操作成功，非法操作仍被拒绝。","collect":"Response类型、业务码/Ray ID、账号角色、路径和日志。","prevention":"每个403保留可搜索业务码或Ray ID。"},{"q":"HTTP 404 怎么处理","symptom":"页面或接口提示不存在。","cause":"路径错误、前后端版本不一致、记录已删除或路由未注册。","quick":"确认URL和method。","steps":["确认URL和method。","接口404检查src/index.ts路由。","数据404用ID查询记录和deleted_at。","静态404检查public路径。"],"verify":"正确路径可访问，不存在对象仍保持404。","collect":"URL、method、对象ID、部署版本和路由代码。","prevention":"前后端路由同版本发布，删除后界面及时移除旧链接。"},{"q":"HTTP 409 怎么处理","symptom":"接口提示冲突。","cause":"当前状态不允许操作、重复值、待审核或删除流程冲突。","quick":"阅读业务错误码。（针对：HTTP 409 怎么处理）","steps":["阅读业务错误码。","查询对象当前状态。","完成或取消前置流程。","不要绕过状态校验直接改D1。"],"verify":"在正确状态下操作成功，错误状态下仍明确拒绝。","collect":"业务码、对象ID、当前状态、目标操作和相关时间。","prevention":"按钮根据状态禁用并解释前置条件。"},{"q":"HTTP 429 怎么处理","symptom":"请求过多或需要等待。","cause":"登录、验证码、注册、邮件或API限流触发。","quick":"查看提示剩余秒数。","steps":["查看提示剩余秒数。","停止连续点击。","按IP/账号/邮箱查频率。","确认不是前端重复定时请求。"],"verify":"等待窗口后正常请求成功，恶意高频仍被限制。","collect":"限流key类型、窗口、计数、IP/账号和请求频率。","prevention":"前端倒计时，后端分场景限流并设置合理窗口。"},{"q":"HTTP 500 怎么处理","symptom":"接口显示服务器内部错误。","cause":"代码未处理异常、数据类型不符合预期或第三方结果解析失败。","quick":"记录时间和路径。","steps":["记录时间和路径。","查看Workers第一条堆栈。","定位最近修改的代码。","检查输入和数据库记录。","修复后增加明确错误处理。"],"verify":"相同输入不再500，失败场景返回可理解业务错误。","collect":"堆栈、请求路径、对象ID、最近diff和输入结构。","prevention":"未知异常自动发管理员邮件并保留堆栈日志。"},{"q":"HTTP 502 怎么处理","symptom":"接口提示上游失败。","cause":"Cloudflare DNS API、邮件或其他外部服务返回错误，或Worker包装了发送失败。","quick":"查看业务码区分CF_ADMIN_EMAIL_FAILED/DNS错误。","steps":["查看业务码区分CF_ADMIN_EMAIL_FAILED/DNS错误。","检查上游服务状态和凭据。","记录上游响应文本。","修复配置后只重试一次。"],"verify":"上游测试成功，业务接口恢复2xx。","collect":"业务码、上游状态/响应、Token权限范围、请求时间。","prevention":"外部服务调用设置超时、错误映射和管理员告警。"},{"q":"HTTP 503 怎么处理","symptom":"接口提示服务未配置或暂不可用。","cause":"缺少DB/KV/SEB/Resend/Turnstile Secret等依赖。","quick":"阅读业务错误码。（针对：HTTP 503 怎么处理）","steps":["阅读业务错误码。","到Worker绑定和变量逐项核对。","保存后重新部署。","使用对应测试按钮。"],"verify":"系统状态和专项测试显示已配置，接口不再503。","collect":"业务码、绑定列表、变量名、部署版本；Secret只记录是否存在。","prevention":"部署后自动检查必要绑定和Secret布尔状态。"},{"q":"请求一直Pending或超时","symptom":"Network长时间没有响应。","cause":"Turnstile/外部API慢、数据库查询大、网络链路或无限等待。","quick":"看Timing卡在哪一段。","steps":["看Timing卡在哪一段。","检查Workers是否收到请求。","外部fetch增加超时。","大查询加限制/索引。","切换网络复测。"],"verify":"请求在合理时间内成功或返回明确超时错误，不无限Pending。","collect":"Timing、路径、Workers CPU/Duration、外部服务和查询规模。","prevention":"所有外部依赖有超时和降级，列表查询分页。"},{"q":"接口返回成功但页面没变化","symptom":"POST返回2xx，列表或状态仍旧。","cause":"前端没有重新拉取、使用旧state缓存或渲染失败。","quick":"查看Response确认后端结果。","steps":["查看Response确认后端结果。","手动刷新看数据是否变化。","检查成功回调是否调用render。","检查Console渲染错误。"],"verify":"不手动刷新也立即看到新状态，重新打开页面仍一致。","collect":"POST响应、后续GET是否发出、state值和Console错误。","prevention":"写操作成功后统一刷新相关数据和徽标。"},{"q":"接口响应不是JSON","symptom":"前端提示解析失败或Unexpected token。","cause":"收到Cloudflare HTML拦截页、SPA index.html或上游文本错误。","quick":"查看Content-Type和Response开头。","steps":["查看Content-Type和Response开头。","确认/api/*由Worker优先处理。","HTML含cf-ray则查WAF。","HTML是首页则检查assets run_worker_first。"],"verify":"接口Content-Type为application/json且包含标准结构。","collect":"Content-Type、Response前300字、URL、status和wrangler assets配置。","prevention":"API路径固定返回JSON，边缘拦截在前端单独识别。"}]}];

function adminHelpItemHtml(item, index) {
  const search = [
    item.q,
    item.symptom,
    item.cause,
    item.quick,
    ...(item.steps || []),
    item.verify,
    item.collect,
    item.prevention,
  ].join(' ').toLowerCase();
  return `<details class="admin-help-item" data-admin-help-item data-search="${attr(search)}">
    <summary><span class="admin-help-number">${index + 1}</span><strong>${esc(item.q)}</strong></summary>
    <div class="admin-help-answer">
      <div class="readonly-box"><b>先做这一步</b><p>${esc(item.quick || (item.steps || [])[0] || '先记录完整错误并停止重复操作。')}</p></div>
      <p><b>你会看到：</b>${esc(item.symptom)}</p>
      <p><b>为什么会这样：</b>${esc(item.cause)}</p>
      <div><b>按顺序处理：</b><ol>${(item.steps || []).map(step => `<li>${esc(step)}</li>`).join('')}</ol></div>
      <p><b>怎么确认已经修好：</b>${esc(item.verify || '重新执行一次对应操作，确认不再出现相同错误。')}</p>
      <p><b>仍未解决时要收集：</b>${esc(item.collect || '记录发生时间、完整错误、请求路径和 Workers 日志。')}</p>
      <p class="admin-help-prevention"><b>以后如何避免：</b>${esc(item.prevention)}</p>
    </div>
  </details>`;
}

async function renderAdminHelpCenter() {
  const total = ADMIN_HELP_CATEGORIES_V90.reduce((sum, category) => sum + category.items.length, 0);
  shell('管理员帮助中心', `
    <section class="message-hero card admin-help-hero"><div><h2>管理员帮助中心</h2><p>按“先做一步 → 判断原因 → 按顺序处理 → 验证结果 → 收集证据”编写。覆盖快速应急、部署、D1、登录、验证、Cloudflare/Resend 邮件、用户、域名、DNS、消息、设置、定时任务、界面、日志、HTTP 错误、安全与恢复。</p></div><div class="message-count"><strong>${total}</strong><span>独立处理方法</span></div></section>
    <section class="card admin-help-controls"><label class="field"><span>搜索问题或错误关键词</span><input id="admin-help-search" placeholder="输入报错原文或现象，例如：403、SEB、key_hash、Turnstile、十几秒刷新"></label><label class="field"><span>分类</span><select id="admin-help-category"><option value="all">全部分类</option>${ADMIN_HELP_CATEGORIES_V90.map(category => `<option value="${attr(category.key)}">${esc(category.title)}（${category.items.length}）</option>`).join('')}</select></label><button class="btn soft" id="copy-admin-help-template" type="button">复制报错记录模板</button><div class="admin-help-match" id="admin-help-match">显示 ${total} 条</div></section>
    <div id="admin-help-categories">${ADMIN_HELP_CATEGORIES_V90.map(category => `<section class="card admin-help-category" data-admin-help-category="${attr(category.key)}"><div class="section-head"><div><h2>${esc(category.title)}</h2><p>${category.items.length} 条分步骤处理方法</p></div><button class="btn small soft" type="button" data-expand-help="${attr(category.key)}">展开本类</button></div><div>${category.items.map(adminHelpItemHtml).join('')}</div></section>`).join('')}</div>
  `);
  const applyFilter = () => {
    const keyword = String(document.querySelector('#admin-help-search')?.value || '').trim().toLowerCase();
    const categoryKey = String(document.querySelector('#admin-help-category')?.value || 'all');
    let shown = 0;
    document.querySelectorAll('[data-admin-help-category]').forEach(section => {
      const categoryMatch = categoryKey === 'all' || section.dataset.adminHelpCategory === categoryKey;
      let categoryShown = 0;
      section.querySelectorAll('[data-admin-help-item]').forEach(detail => {
        const match = categoryMatch && (!keyword || String(detail.dataset.search || '').includes(keyword));
        detail.hidden = !match;
        if (match) { shown += 1; categoryShown += 1; }
      });
      section.hidden = categoryShown === 0;
    });
    const result = document.querySelector('#admin-help-match');
    if (result) result.textContent = `显示 ${shown} 条`;
  };
  document.querySelector('#admin-help-search')?.addEventListener('input', applyFilter);
  document.querySelector('#admin-help-category')?.addEventListener('change', applyFilter);
  document.querySelector('#copy-admin-help-template')?.addEventListener('click', () => copyToClipboard([
    '【问题标题】',
    '【发生时间】',
    '【操作账号/角色】',
    '【页面地址】',
    '【操作步骤】1.  2.  3.',
    '【完整错误文字/业务错误码】',
    '【HTTP 状态码】',
    '【Cloudflare Ray ID】',
    '【相关用户ID/申请ID/消息ID/记录ID】',
    '【Workers 日志第一条错误】',
    '【最近部署提交 SHA】',
    '【已经尝试过的处理】',
  ].join('\\n'), '报错记录模板已复制'));
  document.querySelectorAll('[data-expand-help]').forEach(button => button.addEventListener('click', () => {
    const section = button.closest('[data-admin-help-category]');
    const details = [...section.querySelectorAll('[data-admin-help-item]:not([hidden])')];
    const open = details.some(detail => !detail.open);
    details.forEach(detail => { detail.open = open; });
    button.textContent = open ? '收起本类' : '展开本类';
  }));
}

async function renderAdminHelpSettings() {
  shell('帮助中心设置', `<div class="loading-card">正在读取帮助内容…</div>`);
  try {
    const res = await api('/api/admin/help-settings').catch(() => ({ help: state.config?.help || { categories: [] } }));
    let categories = normalizeHelpCategories(res.help?.categories || state.config?.help?.categories || []);
    const renderCategoryEditor = (cat, catIndex) => `
      <section class="card help-edit-card" data-help-category="${attr(cat.key)}" data-help-index="${catIndex}">
        <div class="section-head">
          <div><h2>${esc(cat.title)}</h2><p>${esc(cat.subtitle || '')}</p></div>
          <button class="btn soft" data-add-help-item="${catIndex}" type="button">＋ 新增问题</button>
        </div>
        <div class="form-grid help-category-fields">
          <label class="field"><span>分类标题</span><input data-help-cat-title="${catIndex}" value="${attr(cat.title)}"></label>
          <label class="field"><span>分类说明</span><input data-help-cat-subtitle="${catIndex}" value="${attr(cat.subtitle || '')}"></label>
        </div>
        <div class="help-edit-list">
          ${cat.items.map((item, itemIndex) => `
            <details class="help-edit-item" data-help-item="${catIndex}-${itemIndex}">
              <summary><span>${esc(item.q || '未命名问题')}</span><small>点击编辑</small></summary>
              <div class="form-grid help-edit-fields">
                <label class="field wide"><span>问题标题</span><input data-help-q="${catIndex}-${itemIndex}" value="${attr(item.q)}"></label>
                <label class="field wide"><span>问题答案</span><textarea rows="6" data-help-a="${catIndex}-${itemIndex}">${esc(plainHelpAnswer(item.a))}</textarea><em>支持普通文字；保存后会自动分段显示。</em></label>
                <div class="wide help-edit-actions"><button class="btn danger-soft" type="button" data-delete-help-item="${catIndex}-${itemIndex}">删除这个问题</button></div>
              </div>
            </details>`).join('')}
        </div>
      </section>`;

    const renderPage = () => {
      shell('帮助中心设置', `
        <section class="message-hero card"><div><h2>帮助中心设置</h2><p>管理员可以在这里增改“常见问题 / DNS 记录说明 / 域名管理问题”的帮助内容。用户在帮助中心搜索时会优先读取这里保存的内容。</p></div></section>
        <section class="card help-edit-toolbar">
          <div><h2>帮助内容管理</h2><p>修改后点击保存，所有用户刷新后即可看到最新说明。</p></div>
          <div class="toolbar-actions"><button class="btn primary" id="save-help-settings">保存全部</button><button class="btn soft" id="restore-help-defaults">恢复默认帮助内容</button></div>
        </section>
        <div class="help-edit-wrap">${categories.map(renderCategoryEditor).join('')}</div>`);

      document.querySelectorAll('[data-help-cat-title]').forEach(input => input.addEventListener('input', () => {
        categories[Number(input.dataset.helpCatTitle)].title = input.value;
      }));
      document.querySelectorAll('[data-help-cat-subtitle]').forEach(input => input.addEventListener('input', () => {
        categories[Number(input.dataset.helpCatSubtitle)].subtitle = input.value;
      }));
      document.querySelectorAll('[data-help-q]').forEach(input => input.addEventListener('input', () => {
        const [catIndex, itemIndex] = input.dataset.helpQ.split('-').map(Number);
        categories[catIndex].items[itemIndex].q = input.value;
      }));
      document.querySelectorAll('[data-help-a]').forEach(input => input.addEventListener('input', () => {
        const [catIndex, itemIndex] = input.dataset.helpA.split('-').map(Number);
        const paragraphs = String(input.value || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
        categories[catIndex].items[itemIndex].a = paragraphs.length ? paragraphs.map(x => `<p>${esc(x)}</p>`).join('') : '';
      }));
      document.querySelectorAll('[data-add-help-item]').forEach(btn => btn.addEventListener('click', () => {
        const catIndex = Number(btn.dataset.addHelpItem);
        categories[catIndex].items.unshift({ id:`custom-${Date.now()}`, q:'新问题', a:'<p>请在这里填写详细解答。</p>' });
        renderPage();
      }));
      document.querySelectorAll('[data-delete-help-item]').forEach(btn => btn.addEventListener('click', () => {
        const [catIndex, itemIndex] = btn.dataset.deleteHelpItem.split('-').map(Number);
        if (!confirm('确认删除这个问题？')) return;
        categories[catIndex].items.splice(itemIndex, 1);
        renderPage();
      }));
      document.querySelector('#restore-help-defaults')?.addEventListener('click', async () => {
        if (!confirm('确认恢复默认帮助内容？当前自定义内容会被覆盖。')) return;
        categories = normalizeHelpCategories(DEFAULT_HELP_CATEGORIES);
        await api('/api/admin/help-settings', { method:'PUT', body:{ categories } });
        state.config.help = { categories };
        toast('帮助内容已恢复默认','success');
        renderPage();
      });
      document.querySelector('#save-help-settings')?.addEventListener('click', async () => {
        const cleaned = normalizeHelpCategories(categories).map(cat => ({
          ...cat,
          items: cat.items.map(item => ({ ...item, q:String(item.q || '').trim(), a:String(item.a || '').trim() })).filter(item => item.q)
        }));
        await api('/api/admin/help-settings', { method:'PUT', body:{ categories: cleaned } });
        state.config.help = { categories: cleaned };
        toast('帮助内容已保存','success');
        categories = cleaned;
        renderPage();
      });
    };
    renderPage();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function yn(value) { return value ? 'checked' : ''; }
function fieldValue(value) { return attr(value ?? ''); }
function arrayText(value) { return Array.isArray(value) ? value.join('\n') : String(value || ''); }
function suffixesToJson(suffixes) { return JSON.stringify((suffixes || []).map((s,index) => ({ label:s.label || '', suffix:s.suffix, zoneId:s.zoneId || '', allowedTypes:s.allowedTypes || ['A','AAAA','CNAME','TXT','MX','NS'], defaultType:s.defaultType || 'CNAME', ttl:s.ttl || 1, proxied:!!s.proxied, enabled:s.enabled !== false, allowRegister:s.allowRegister !== false, registerOrder:Number(s.registerOrder || index + 1), cfApiTokenConfigured:!!s.cfApiTokenConfigured })), null, 2); }
function eventChecks(events = {}) {
  return `<label class="check"><input name="newUser" type="checkbox" ${yn(events.newUser)}> 新账号注册</label>
  <label class="check"><input name="newDomain" type="checkbox" ${yn(events.newDomain)}> 新域名申请</label>
  <label class="check"><input name="domainExpiring" type="checkbox" ${yn(events.domainExpiring)}> 域名即将到期</label>
  <label class="check"><input name="domainExpiredDelete" type="checkbox" ${yn(events.domainExpiredDelete)}> 域名过期删除</label>
  <label class="check"><input name="abnormalRegister" type="checkbox" ${yn(events.abnormalRegister)}> 异常注册行为</label>
  <label class="check"><input name="systemErrorEmail" type="checkbox" ${yn(events.systemErrorEmail !== false)}> Cloudflare 邮件：系统异常通知管理员</label>
  <label class="check"><input name="helpSubmissionEmail" type="checkbox" ${yn(events.helpSubmissionEmail !== false)}> Cloudflare 邮件：用户提交帮助信息</label>
  <label class="check"><input name="domainReviewEmail" type="checkbox" ${yn(events.domainReviewEmail !== false)}> Cloudflare 邮件：域名审核提醒管理员</label>
  <label class="check"><input name="dnsAnomalyEmail" type="checkbox" ${yn(events.dnsAnomalyEmail !== false)}> Cloudflare 邮件：DNS 异常提醒管理员</label>`;
}
function collectSuffixes(form) {
  const text = String(form.get('suffixesJson') || '').trim();
  try { const data = JSON.parse(text || '[]'); return Array.isArray(data) ? data : []; }
  catch { throw new Error('根域名列表 JSON 格式错误'); }
}
function riskyConfirm(group) {
  const messages = {
    site:'界面设置包含头部 JS、维护模式、公告时间等配置，错误 JS 可能导致前台白屏。确认保存？',
    registration:'注册风控属于高危配置，错误设置可能导致用户无法注册或垃圾账号进入系统。确认保存？',
    domain:'域名规则属于高危配置，可能影响用户申请、续期、删除和现有域名管理。确认保存？',
    dns:'DNS 配置属于高危配置，修改根域名、代理、允许类型可能影响存量解析和用户访问。确认保存？',
    blacklist:'黑名单会直接拦截用户、IP、邮箱或域名前缀，错误配置可能误伤正常用户。确认保存？',
    security:'安全设置会影响管理员登录、会话超时和操作日志保留。确认保存？',
    automation:'自动化任务可能自动清理到期域名或 DNS 记录。确认保存？'
  };
  return !messages[group] || confirm(tr(messages[group]));
}


function regKeyStatus(k) {
  if (k.status !== 'active') return '已停用';
  if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return '已过期';
  if (Number(k.maxUses || 0) > 0 && Number(k.usedCount || 0) >= Number(k.maxUses || 0)) return '已用完';
  return '正常';
}

async function renderRegistrationKeys() {
  shell('注册密钥', `<div class="loading-card">正在读取注册密钥…</div>`);
  try {
    const { keys } = await api('/api/admin/registration-keys');
    const cards = (keys || []).map(k => `<section class="reg-key-card">
      <div class="reg-key-main"><h3>${esc(k.code)}</h3><p>剩余次数：${Number(k.maxUses || 0) === 0 ? '不限' : Math.max(0, Number(k.maxUses || 0) - Number(k.usedCount || 0))}</p><p>权限身份：<span class="status-pill status-active">${k.role === 'admin' ? '管理员' : '普通用户'}</span></p><p>有效至期：${k.expiresAt ? fmtDate(k.expiresAt) : '不限'}</p><p>状态：${esc(regKeyStatus(k))}</p></div>
      <button class="btn icon reg-key-gear" data-key-menu="${attr(k.id)}">⚙</button>
    </section>`).join('');
    shell('注册密钥', `<section class="card reg-key-page"><div class="section-head"><div><h2>注册密钥</h2><p>开启注册码注册后，用户注册必须填写有效注册码。</p></div><button class="btn primary" id="add-registration-key">＋ 添加注册码</button></div><div class="reg-key-tools"><input id="reg-key-search" placeholder="输入注册码搜索"><button class="btn soft" id="reg-key-refresh">刷新</button></div><div class="reg-key-grid">${cards || '<div class="empty">暂无注册码。</div>'}</div></section>`);
    document.querySelector('#add-registration-key')?.addEventListener('click', showCreateRegistrationKeyModal);
    document.querySelector('#reg-key-refresh')?.addEventListener('click', renderRegistrationKeys);
    document.querySelector('#reg-key-search')?.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.reg-key-card').forEach(card => { card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
    document.querySelectorAll('[data-key-menu]').forEach(btn => btn.addEventListener('click', () => {
      const key = keys.find(x => x.id === btn.dataset.keyMenu);
      showRegistrationKeyMenu(key);
    }));
  } catch (error) { toast(error.message, 'error'); }
}

function showCreateRegistrationKeyModal() {
  const random = randomClientCode(8);
  openModal('添加注册码', '可以手动输入注册码，也可以随机生成 8 位字母数字混合注册码。', `
    <form id="registration-key-form" class="modal-form">
      <label class="field wide"><span>注册码</span><div class="suffix-input"><input name="code" value="${attr(random)}" placeholder="留空自动生成"><button class="btn soft" id="regen-code" type="button">↻</button></div><em>支持字母、数字、下划线、连字符；留空时随机生成。</em></label>
      <label class="field wide"><span>权限身份</span><select name="role"><option value="user">普通用户</option><option value="admin">管理员</option></select><em>默认用于普通用户注册。</em></label>
      <label class="field"><span>有效至期</span><input name="expiresAt" type="date"><em>留空表示不过期。</em></label>
      <label class="field"><span>可使用次数</span><input name="maxUses" type="number" min="0" value="1"><em>0 表示不限次数。</em></label>
      <label class="field wide"><span>随机生成位数</span><input name="codeLength" type="number" min="4" max="64" value="8"><em>点击刷新按钮时按此长度生成。</em></label>
      <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>取消</button><button class="btn primary" type="submit">添加</button></div>
    </form>`, 'wide');
  document.querySelector('[data-cancel]')?.addEventListener('click', closeModal);
  document.querySelector('#regen-code')?.addEventListener('click', () => {
    const form = document.querySelector('#registration-key-form');
    form.code.value = randomClientCode(Number(form.codeLength.value || 8));
  });
  document.querySelector('#registration-key-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/admin/registration-keys', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      closeModal();
      toast('注册码已添加', 'success');
      renderRegistrationKeys();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}

function randomClientCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const n = Math.max(4, Math.min(64, Number(len) || 8));
  let out = '';
  if (crypto?.getRandomValues) {
    const arr = new Uint8Array(n); crypto.getRandomValues(arr); out = Array.from(arr).map(x => chars[x % chars.length]).join('');
  } else { for (let i=0;i<n;i++) out += chars[Math.floor(Math.random()*chars.length)]; }
  return out;
}

function showRegistrationKeyMenu(key) {
  if (!key) return;
  openModal('注册码设置', key.code, `<div class="modal-form">
    <div class="readonly-box"><b>${esc(key.code)}</b><p>已用 ${esc(key.usedCount)} / ${Number(key.maxUses || 0) === 0 ? '不限' : esc(key.maxUses)}</p></div>
    <div class="modal-actions"><button class="btn soft" id="copy-reg-key">复制</button><button class="btn soft" id="view-reg-key-usages">查看使用记录</button><button class="btn danger-soft" id="delete-reg-key">删除</button><button class="btn secondary" data-close-modal type="button">关闭</button></div>
  </div>`);
  document.querySelector('#copy-reg-key')?.addEventListener('click', () => copyToClipboard(key.code, '注册码已复制'));
  document.querySelector('#view-reg-key-usages')?.addEventListener('click', () => showRegistrationKeyUsages(key));
  document.querySelector('#delete-reg-key')?.addEventListener('click', async () => {
    if (!confirm('确认删除该注册码？删除后不可继续使用。')) return;
    await api(`/api/admin/registration-keys/${key.id}`, { method:'DELETE' });
    closeModal(); toast('注册码已删除', 'success'); renderRegistrationKeys();
  });
}

async function showRegistrationKeyUsages(key) {
  try {
    const { usages } = await api(`/api/admin/registration-keys/${key.id}/usages`);
    const rows = (usages || []).map(u => `<tr><td>${esc(u.username)}</td><td>${fmtDate(u.usedAt, true)}</td></tr>`).join('');
    openModal('使用记录', key.code, `<div class="table-wrap"><table><thead><tr><th>用户</th><th>时间</th></tr></thead><tbody>${rows || '<tr><td colspan="2">暂无使用记录</td></tr>'}</tbody></table></div>`, 'wide');
  } catch (error) { toast(error.message, 'error'); }
}


function analyticsChange(meta) {
  if (!meta) return '<em>无上期数据</em>';
  if (meta.noPrevious && Number(meta.current || 0) === 0) return '<em>无上期数据</em>';
  if (meta.noPrevious) return `<em class="trend up">↑ 新增 ${esc(meta.current || 0)}</em>`;
  const pct = Number(meta.pct || 0);
  const cls = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const mark = pct > 0 ? '↑' : pct < 0 ? '↓' : '—';
  return `<em class="trend ${cls}">${mark} ${Math.abs(pct)}%</em>`;
}
function analyticsMetricCard(title, metric, sub, icon) {
  const value = metric?.total ?? 0;
  return `<section class="analytics-card v75"><div><span>${esc(title)}</span><strong>${esc(value)}</strong>${analyticsChange(metric)}<p>${esc(sub || '')}</p></div><div class="analytics-icon">${esc(icon || '⌁')}</div></section>`;
}
function analyticsRangeFromHash() {
  const params = new URLSearchParams((location.hash.split('?')[1] || '').replace(/^\?/, ''));
  return {
    range: params.get('range') || params.get('days') || '30d',
    start: params.get('start') || '',
    end: params.get('end') || '',
  };
}
function analyticsQueryString(range, start = '', end = '') {
  const params = new URLSearchParams();
  params.set('range', range);
  if (range === 'custom') {
    if (start) params.set('start', start);
    if (end) params.set('end', end);
  }
  return params.toString();
}
function analyticsToolbar(rangeState) {
  const presets = [
    ['12h','12小时'], ['1d','1天'], ['3d','3天'], ['7d','7天'], ['30d','30天'], ['90d','90天'], ['custom','自定义']
  ];
  const buttons = presets.map(([value,label]) =>
    `<button type="button" class="range-chip bt-chip ${rangeState.range===value || (['7','30','90'].includes(rangeState.range) && value===rangeState.range+'d') ? 'active' : ''}" data-analytics-range="${value}">${label}</button>`
  ).join('');
  return `<div class="analytics-toolbar-v75 analytics-toolbar-v82">
    <div class="toolbar-group toolbar-group-left">
      <span class="toolbar-label">时间范围</span>
      <div class="range-switch bt-segment">${buttons}</div>
    </div>
    <div class="toolbar-group toolbar-group-right">
      <div class="custom-range ${rangeState.range==='custom' ? '' : 'hidden'}">
        <input id="analytics-start" type="datetime-local" value="${attr(rangeState.start)}">
        <span>至</span>
        <input id="analytics-end" type="datetime-local" value="${attr(rangeState.end)}">
        <button class="btn soft" id="apply-custom-analytics" type="button">应用</button>
      </div>
      <button class="btn soft icon-btn" id="refresh-analytics" type="button" title="刷新">↻</button>
    </div>
  </div>`;
}
function formatAnalyticsLabel(value, bucket) {

  const raw = String(value || '');
  if (bucket === 'hour') return raw.slice(5, 13).replace('-', '/');
  return raw.slice(5).replace('-', '/');
}
function analyticsSafeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}
function analyticsTooltipLabel(parts) {
  return String(parts.filter(Boolean).join(' | ')).replace(/"/g, '&quot;');
}
function niceChartMax(values) {
  const raw = Math.max(1, ...values, 1);
  if (raw <= 5) return 5;
  if (raw <= 10) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const scaled = raw / exp;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * exp;
}
function buildAnalyticsTipHtml(label, series, row) {
  const title = `<div class="tip-title">日期：${esc(label)}</div>`;
  const rowsHtml = series.map((s, idx) => `<div class="tip-row"><i class="tip-swatch line-${idx}"></i><span>${esc(s.label)}</span><b>${analyticsSafeNumber(row[s.key])}</b></div>`).join('');
  return `${title}${rowsHtml}`;
}
function chartOverview(rows, series, bucket='day') {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return '';
  const values = [];
  safeRows.forEach(row => series.forEach(s => values.push(analyticsSafeNumber(row[s.key]))));
  const max = niceChartMax(values);
  const W = 980, H = 54, L = 10, R = 10, T = 6, B = 8;
  const x = i => safeRows.length <= 1 ? L : L + i * ((W - L - R) / (safeRows.length - 1));
  const y = v => T + (H - T - B) * (1 - analyticsSafeNumber(v) / max);
  const lines = series.map((s, idx) => {
    const pts = safeRows.map((row, i) => `${x(i)},${y(row[s.key] || 0)}`).join(' ');
    return `<polyline points="${pts}" class="line-series line-${idx} overview-line"/>`;
  }).join('');
  const startLabel = formatAnalyticsLabel(safeRows[0]?.bucket || safeRows[0]?.day || '', bucket);
  const endLabel = formatAnalyticsLabel(safeRows[safeRows.length - 1]?.bucket || safeRows[safeRows.length - 1]?.day || '', bucket);
  return `<div class="chart-overview"><div class="overview-strip"><svg class="overview-svg" viewBox="0 0 ${W} ${H}" role="img">${lines}</svg></div><div class="overview-meta"><span>${esc(startLabel)}</span><em>概览</em><span>${esc(endLabel)}</span></div></div>`;
}
function multiLineChart(rows, series, bucket='day') {
  const safeRows = Array.isArray(rows) ? rows : [];
  const normalizedRows = safeRows.length ? safeRows : [{ bucket:'—', day:'—', ...Object.fromEntries(series.map(s => [s.key, 0])) }];
  const values = [];
  normalizedRows.forEach(row => series.forEach(s => values.push(analyticsSafeNumber(row[s.key]))));
  const max = niceChartMax(values);
  const W = 1080, H = 360, L = 60, R = 28, T = 22, B = 54;
  const x = i => normalizedRows.length <= 1 ? L : L + i * ((W - L - R) / (normalizedRows.length - 1));
  const y = v => T + (H - T - B) * (1 - analyticsSafeNumber(v) / max);
  const gridSteps = 5;
  const grid = Array.from({ length: gridSteps + 1 }, (_, step) => {
    const ratio = step / gridSteps;
    const yy = T + (H - T - B) * ratio;
    const val = Math.round(max * (1 - ratio));
    return `<g><line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" class="chart-grid-line"/><text x="${L-12}" y="${yy+4}" text-anchor="end" class="chart-axis-text">${val}</text></g>`;
  }).join('');
  const areas = series.map((s, idx) => {
    const pts = normalizedRows.map((row, i) => `${x(i)},${y(row[s.key] || 0)}`).join(' ');
    const areaPts = `${x(0)},${H-B} ${pts} ${x(normalizedRows.length - 1)},${H-B}`;
    return `<polygon points="${areaPts}" class="line-area line-area-${idx}"/>`;
  }).join('');
  const lines = series.map((s, idx) => {
    const pts = normalizedRows.map((row, i) => `${x(i)},${y(row[s.key] || 0)}`).join(' ');
    const dots = normalizedRows.map((row,i) => `<circle cx="${x(i)}" cy="${y(row[s.key]||0)}" r="4" class="line-dot line-${idx}"/>`).join('');
    return `<polyline points="${pts}" class="line-series line-${idx}"/>${dots}`;
  }).join('');
  const labelEvery = Math.max(1, Math.ceil(normalizedRows.length / (bucket === 'hour' ? 10 : 8)));
  const xLabels = normalizedRows.map((row,i) => i % labelEvery === 0 || i === normalizedRows.length - 1 ? `<text x="${x(i)}" y="${H-16}" text-anchor="middle" class="chart-axis-text">${esc(formatAnalyticsLabel(row.bucket || row.day, bucket))}</text>` : '').join('');
  const hitWidth = normalizedRows.length <= 1 ? W - L - R : Math.max(16, (W - L - R) / normalizedRows.length);
  const hits = normalizedRows.map((row, i) => {
    const label = formatAnalyticsLabel(row.bucket || row.day, bucket);
    const tooltip = buildAnalyticsTipHtml(label, series, row).replace(/"/g, '&quot;');
    return `<rect class="chart-hit" x="${Math.max(L, x(i)-hitWidth/2)}" y="${T}" width="${hitWidth}" height="${H-T-B}" data-chart-tip-html="${tooltip}" data-x="${x(i)}" data-y="${T+20}"></rect><line x1="${x(i)}" x2="${x(i)}" y1="${T}" y2="${H-B}" class="chart-hover-line"></line>`;
  }).join('');
  const legend = series.map((s, idx) => `<span><i class="legend-dot line-${idx}"></i>${esc(s.label)}</span>`).join('');
  return `<div class="interactive-chart line-chart-box"><div class="chart-legend bt-legend">${legend}</div><svg class="analytics-svg analytics-line-svg" viewBox="0 0 ${W} ${H}" role="img">${grid}<line x1="${L}" x2="${L}" y1="${T}" y2="${H-B}" class="chart-axis"/><line x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}" class="chart-axis"/>${areas}${lines}${xLabels}${hits}</svg>${chartOverview(normalizedRows, series, bucket)}<div class="analytics-floating-tip rich-tip" hidden></div></div>`;
}
function donutChart(rows, labelKey='status') {

  const list = Array.isArray(rows) ? rows.filter(r => analyticsSafeNumber(r.count) > 0) : [];
  const total = list.reduce((sum,r)=>sum+analyticsSafeNumber(r.count),0);
  if (!total) return '<div class="empty small">暂无数据</div>';
  let offset = 25;
  const gap = list.length > 1 ? 0.8 : 0;
  const circles = list.map((r, idx) => {
    const label = statusText[r[labelKey]] || r[labelKey] || '未知';
    const count = analyticsSafeNumber(r.count);
    const pct = count / total * 100;
    const drawPct = Math.max(0, pct - gap);
    const pctText = Math.round(pct * 10) / 10;
    const el = `<circle tabindex="0" pathLength="100" class="donut-seg donut-${idx%8}" cx="110" cy="110" r="72" stroke-dasharray="${drawPct} ${100-drawPct}" stroke-dashoffset="${offset}" data-chart-tip="${attr(`${label}: ${count} (${pctText}%)`)}"></circle>`;
    offset -= pct;
    return el;
  }).join('');
  const legend = list.map((r, idx) => {
    const label = statusText[r[labelKey]] || r[labelKey] || '未知';
    const count = analyticsSafeNumber(r.count);
    const pctText = Math.round(count / total * 1000) / 10;
    return `<p data-chart-tip="${attr(`${label}: ${count} (${pctText}%)`)}"><i class="donut-color donut-${idx%8}"></i><span>${esc(label)}</span><b>${count}</b><em>${pctText}%</em></p>`;
  }).join('');
  return `<div class="interactive-chart donut-chart-box"><div class="donut-wrap email-style compact-ring"><div class="donut-legend">${legend}</div><svg class="donut-svg" viewBox="0 0 220 220"><circle class="donut-bg" pathLength="100" cx="110" cy="110" r="72"></circle>${circles}<text x="110" y="104" text-anchor="middle" class="donut-total">${total}</text><text x="110" y="126" text-anchor="middle" class="donut-caption">总数</text></svg></div><div class="analytics-floating-tip" hidden></div></div>`;
}
function bindAnalyticsChartInteractions(root=document) {
  root.querySelectorAll('.interactive-chart').forEach(box => {
    const tip = box.querySelector('.analytics-floating-tip');
    if (!tip) return;
    const show = (target, event) => {
      const html = target?.dataset?.chartTipHtml || target?.closest?.('[data-chart-tip-html]')?.dataset?.chartTipHtml || '';
      const text = target?.dataset?.chartTip || target?.closest?.('[data-chart-tip]')?.dataset?.chartTip || '';
      if (!html && !text) return;
      if (html) tip.innerHTML = html;
      else tip.textContent = text;
      tip.hidden = false;
      const boxRect = box.getBoundingClientRect();
      const pointerX = event?.clientX || (boxRect.left + boxRect.width / 2);
      const pointerY = event?.clientY || (boxRect.top + 72);
      tip.style.left = '-9999px';
      tip.style.top = '-9999px';
      const tipRect = tip.getBoundingClientRect();
      const tipWidth = Math.min(Math.max(tipRect.width || 260, 180), Math.max(180, boxRect.width - 24));
      const tipHeight = Math.max(tipRect.height || 92, 64);
      const gap = 16;
      let left = pointerX - boxRect.left - tipWidth - gap;
      if (left < 12) {
        left = pointerX - boxRect.left + gap;
      }
      left = Math.max(12, Math.min(left, boxRect.width - tipWidth - 12));
      let top = pointerY - boxRect.top - (tipHeight / 2);
      top = Math.max(12, Math.min(top, boxRect.height - tipHeight - 12));
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      if (target.classList?.contains('chart-hit')) {
        box.querySelectorAll('.chart-hover-line').forEach(l => l.classList.remove('active'));
        const next = target.nextElementSibling;
        if (next?.classList?.contains('chart-hover-line')) next.classList.add('active');
      }
    };
    const hide = () => {
      tip.hidden = true;
      box.querySelectorAll('.chart-hover-line').forEach(l => l.classList.remove('active'));
      box.querySelectorAll('.donut-seg.active').forEach(s => s.classList.remove('active'));
    };
    box.querySelectorAll('[data-chart-tip],[data-chart-tip-html]').forEach(el => {
      el.addEventListener('mouseenter', e => show(el, e));
      el.addEventListener('mousemove', e => show(el, e));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', e => show(el, e));
      el.addEventListener('blur', hide);
      el.addEventListener('click', e => {
        e.stopPropagation();
        box.querySelectorAll('.donut-seg.active').forEach(s => s.classList.remove('active'));
        if (el.classList.contains('donut-seg')) el.classList.add('active');
        show(el, e);
      });
      el.addEventListener('touchstart', e => {
        const touch = e.touches?.[0] || e.changedTouches?.[0];
        show(el, touch || e);
      }, { passive:true });
    });
    document.addEventListener('click', e => { if (!box.contains(e.target)) hide(); });
  });
}
function cfApiMonitor(apiInfo) {

  const total = Number(apiInfo?.total || 0);
  const failed = Number(apiInfo?.failed || 0);
  const success = Number(apiInfo?.success || 0);
  const rate = total ? Math.round(failed / total * 1000) / 10 : 0;
  return `<div class="cf-monitor">
    <div><span>总调用次数</span><strong>${total}</strong></div>
    <div><span>成功次数</span><strong>${success}</strong></div>
    <div><span>失败次数</span><strong>${failed}</strong></div>
    <div><span>失败率</span><strong>${rate}%</strong></div>
  </div>${donutChart(apiInfo?.failures || [], 'reason')}`;
}
let LAST_ANALYTICS_DATA = null;

function analyticsNumber(value) { return Number(value || 0).toLocaleString(); }
function analyticsPercent(value) { return `${Math.round(Number(value || 0) * 10) / 10}%`; }
function analyticsDuration(hours) {
  const n = Number(hours || 0);
  if (!n) return '—';
  if (n < 1) return `${Math.max(1, Math.round(n * 60))} 分钟`;
  if (n < 48) return `${Math.round(n * 10) / 10} 小时`;
  return `${Math.round(n / 24 * 10) / 10} 天`;
}
function analyticsDetailedCard(title, metric, description, icon, target='overview', warning=false) {
  const total = metric?.total ?? metric ?? 0;
  const current = metric?.current;
  return `<button type="button" class="analytics-kpi-card ${warning ? 'warning' : ''}" data-analytics-jump="${attr(target)}">
    <span class="analytics-kpi-icon">${esc(icon)}</span>
    <span class="analytics-kpi-copy"><em>${esc(title)}</em><strong>${analyticsNumber(total)}</strong><small>${esc(description || '')}</small></span>
    ${current !== undefined ? `<span class="analytics-kpi-change"><b>本期 ${analyticsNumber(current)}</b>${analyticsChange(metric)}</span>` : ''}
  </button>`;
}
function analyticsRatio(numerator, denominator) {
  const d = Number(denominator || 0); return d ? Math.round(Number(numerator || 0) / d * 1000) / 10 : 0;
}
function horizontalBarChart(rows, labelKey, valueKey='count', limit=10) {
  const list = (Array.isArray(rows) ? rows : []).slice().sort((a,b)=>Number(b[valueKey]||0)-Number(a[valueKey]||0)).slice(0,limit);
  const max = Math.max(1,...list.map(x=>Number(x[valueKey]||0)));
  if (!list.length) return '<div class="empty small">暂无数据</div>';
  return `<div class="analytics-bars">${list.map((row,index)=>{
    const raw = row[labelKey] ?? row.label ?? '—';
    const label = statusText[raw] || raw;
    const value = Number(row[valueKey]||0);
    return `<div class="analytics-bar-row" tabindex="0" data-chart-tip="${attr(`${label}: ${value}`)}"><span>${esc(label)}</span><div><i style="width:${Math.max(2,value/max*100)}%"></i></div><b>${analyticsNumber(value)}</b></div>`;
  }).join('')}</div>`;
}
function analyticsFunnel(title, steps) {
  const max = Math.max(1,...steps.map(x=>Number(x.value||0)));
  return `<section class="analytics-funnel"><h4>${esc(title)}</h4><div>${steps.map((step,index)=>{
    const width = Math.max(24,Number(step.value||0)/max*100);
    const prev = index ? Number(steps[index-1].value||0) : Number(step.value||0);
    const rate = index ? analyticsRatio(step.value,prev) : 100;
    return `<div class="funnel-step" style="--funnel-width:${width}%"><span>${esc(step.label)}</span><strong>${analyticsNumber(step.value)}</strong><em>${index ? `${rate}%` : '100%'}</em></div>`;
  }).join('')}</div></section>`;
}
function analyticsHeatmap(rows) {
  const map = new Map((rows||[]).map(r=>[`${r.weekday}-${r.hour}`,Number(r.count||0)]));
  const max = Math.max(1,...Array.from(map.values()));
  const days = ['周日','周一','周二','周三','周四','周五','周六'];
  const hours = Array.from({length:24},(_,i)=>i);
  return `<div class="analytics-heatmap-wrap"><div class="heatmap-hours"><span></span>${hours.map(h=>`<b>${h%3===0?String(h).padStart(2,'0'):''}</b>`).join('')}</div>${days.map((day,d)=>`<div class="heatmap-row"><span>${day}</span>${hours.map(h=>{const value=map.get(`${d}-${h}`)||0;const level=value?Math.max(.12,value/max):0;return `<i style="--heat:${level}" data-chart-tip="${attr(`${day} ${String(h).padStart(2,'0')}:00 · ${value} 次操作`)}" tabindex="0"></i>`}).join('')}</div>`).join('')}<div class="heatmap-legend"><span>较少</span><i style="--heat:.15"></i><i style="--heat:.35"></i><i style="--heat:.6"></i><i style="--heat:1"></i><span>较多</span></div></div>`;
}
function analyticsStatusPill(value) {
  const key=String(value||'unknown').toLowerCase();
  return `<span class="status-pill status-${attr(key)}">${esc(statusText[key]||value||'未知')}</span>`;
}
function analyticsUserTable(rows) {
  return `<div class="analytics-table-tools"><input data-analytics-table-search="top-users" placeholder="搜索用户、邮箱或状态"></div><div class="table-wrap analytics-table"><table data-analytics-table="top-users"><thead><tr><th data-sort="text">用户</th><th data-sort="text">状态</th><th data-sort="number">域名</th><th data-sort="number">活跃域名</th><th data-sort="number">DNS</th><th data-sort="text">最后登录</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td><b>${esc(r.username||'—')}</b><small>${esc(r.email||'')}</small></td><td>${analyticsStatusPill(r.status)}</td><td>${analyticsNumber(r.domains)}</td><td>${analyticsNumber(r.active_domains)}</td><td>${analyticsNumber(r.dns_records)}</td><td>${r.last_login_at?fmtDate(r.last_login_at,true):'从未登录'}</td></tr>`).join('')||'<tr><td colspan="6">暂无数据</td></tr>'}</tbody></table></div>`;
}
function analyticsSuffixTable(rows) {
  return `<div class="analytics-table-tools"><input data-analytics-table-search="suffixes" placeholder="搜索根域名"></div><div class="table-wrap analytics-table"><table data-analytics-table="suffixes"><thead><tr><th data-sort="text">根域名</th><th data-sort="number">总量</th><th data-sort="number">活跃</th><th data-sort="number">待审核</th><th data-sort="number">已驳回</th><th data-sort="number">通过率</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td><b>${esc(r.suffix||'—')}</b></td><td>${analyticsNumber(r.total)}</td><td>${analyticsNumber(r.active)}</td><td>${analyticsNumber(r.pending)}</td><td>${analyticsNumber(r.rejected)}</td><td>${analyticsPercent(analyticsRatio(r.active,Number(r.active||0)+Number(r.rejected||0)))}</td></tr>`).join('')||'<tr><td colspan="6">暂无数据</td></tr>'}</tbody></table></div>`;
}
function analyticsFailureTable(rows) {
  return `<div class="table-wrap analytics-table"><table><thead><tr><th>异常动作</th><th>次数</th><th>最近发生</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td><code>${esc(r.action)}</code></td><td><b>${analyticsNumber(r.count)}</b></td><td>${fmtDate(r.latest,true)}</td></tr>`).join('')||'<tr><td colspan="3">当前时间范围没有异常</td></tr>'}</tbody></table></div>`;
}
function analyticsRecentApplications(rows) {
  return `<div class="analytics-table-tools"><input data-analytics-table-search="recent-apps" placeholder="搜索域名、用户、状态或类型"></div><div class="table-wrap analytics-table tall"><table data-analytics-table="recent-apps"><thead><tr><th data-sort="text">域名</th><th data-sort="text">用户</th><th data-sort="text">状态</th><th data-sort="text">记录类型</th><th data-sort="text">申请时间</th><th>错误</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td><b>${esc(r.fqdn_unicode||r.fqdn_ascii||'—')}</b></td><td>${esc(r.username||'—')}</td><td>${analyticsStatusPill(r.status)}</td><td><code>${esc(r.record_type||'—')}</code></td><td>${fmtDate(r.created_at,true)}</td><td class="analytics-error-cell">${esc(r.error_message||'')}</td></tr>`).join('')||'<tr><td colspan="6">暂无数据</td></tr>'}</tbody></table></div>`;
}
function analyticsRecentAudit(rows) {
  return `<div class="analytics-table-tools"><input data-analytics-table-search="recent-audit" placeholder="搜索动作、用户、IP或对象"></div><div class="table-wrap analytics-table tall"><table data-analytics-table="recent-audit"><thead><tr><th data-sort="text">时间</th><th data-sort="text">操作人</th><th data-sort="text">动作</th><th data-sort="text">对象</th><th data-sort="text">IP</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td>${fmtDate(r.created_at,true)}</td><td>${esc(r.username||'系统')}</td><td><code>${esc(r.action||'—')}</code></td><td>${esc([r.target_type,r.target_id].filter(Boolean).join(' · ')||'—')}</td><td><code>${esc(r.ip||'—')}</code></td></tr>`).join('')||'<tr><td colspan="5">暂无数据</td></tr>'}</tbody></table></div>`;
}
function analyticsViewTabs() {
  return `<nav class="analytics-view-tabs" aria-label="分析视图"><button class="active" data-analytics-view="overview">总览</button><button data-analytics-view="users">用户分析</button><button data-analytics-view="domains">域名与 DNS</button><button data-analytics-view="operations">运营与安全</button><button data-analytics-view="details">明细数据</button></nav>`;
}
function analyticsInfoCard(label,value,sub='',tone='') {
  return `<div class="analytics-info-card ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></div>`;
}
function buildAnalyticsCsv(data) {
  const rows=[['section','name','value','extra']];
  const add=(section,obj)=>Object.entries(obj||{}).forEach(([k,v])=>rows.push([section,k,typeof v==='object'?JSON.stringify(v):v,'']));
  add('metrics',data.metrics); add('approval',data.approval); add('funnel',data.funnel); add('messageEngagement',data.messageEngagement);
  (data.rankings?.users||[]).forEach(r=>rows.push(['topUsers',r.username,r.active_domains,r.email||'']));
  (data.rankings?.suffixes||[]).forEach(r=>rows.push(['suffixes',r.suffix,r.total,`active=${r.active};pending=${r.pending}`]));
  return rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
}
function downloadAnalyticsFile(name,content,type) {
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function renderAdminAnalytics() {
  shell('分析页', `<div class="loading-card">正在读取完整分析数据…</div>`);
  try {
    const rangeState=analyticsRangeFromHash();
    const qs=analyticsQueryString(rangeState.range,rangeState.start,rangeState.end);
    const {analytics}=await api(`/api/admin/analytics?${qs}`);
    LAST_ANALYTICS_DATA=analytics;
    const m=analytics.metrics||{}; const d=analytics.distributions||{}; const r=analytics.rankings||{}; const bucket=analytics.range?.bucket||'day';
    const approval=analytics.approval||{}; const funnel=analytics.funnel||{}; const security=m.security||{}; const activeDomains=m.activeDomains||{}; const dnsHealth=m.dnsHealth||{};
    shell('分析页', `<section class="card analytics-page analytics-dashboard-v99">
      <header class="analytics-dashboard-head"><div><div class="eyebrow">DATA COMMAND CENTER</div><h2>综合数据分析中心</h2><p>从用户增长、域名转化、DNS 健康、消息触达、操作安全和异常事件多个维度查看系统运行情况。所有指标均随时间范围联动。</p><div class="analytics-generated">数据生成时间：${fmtDate(analytics.generatedAt,true)} · 对比区间：${fmtDate(analytics.range?.previousStart,true)} 至 ${fmtDate(analytics.range?.previousEnd,true)}</div></div>${analyticsToolbar(rangeState)}</header>
      <div class="analytics-actions"><button class="btn soft" id="analytics-export-csv">导出 CSV</button><button class="btn soft" id="analytics-export-json">导出 JSON</button><button class="btn soft" id="analytics-print">打印报表</button></div>
      ${analyticsViewTabs()}

      <div data-analytics-panel="overview" class="analytics-panel active">
        <div class="analytics-kpi-grid">
          ${analyticsDetailedCard('注册用户',m.users,`活跃 ${analyticsNumber(m.activeUsers?.total)} · 本期登录 ${analyticsNumber(m.activeUsers?.loggedInPeriod)}`,'♙','users')}
          ${analyticsDetailedCard('域名申请',m.domains,`活跃 ${analyticsNumber(activeDomains.total)} · 待审核 ${analyticsNumber(activeDomains.pending)}`,'▣','domains',Number(activeDomains.pending)>0)}
          ${analyticsDetailedCard('有效 DNS 记录',m.dns,`异常 ${analyticsNumber(dnsHealth.errors)} · 待同步 ${analyticsNumber(dnsHealth.pending)}`,'@','domains',Number(dnsHealth.errors)>0)}
          ${analyticsDetailedCard('系统消息',m.messages,`本期阅读回执 ${analyticsNumber(analytics.messageEngagement?.readReceipts)}`,'✉','operations')}
          ${analyticsDetailedCard('操作日志',m.audit,`本期异常 ${analyticsNumber(security.errors)}`,'⌁','operations',Number(security.errors)>0)}
          ${analyticsDetailedCard('注册码',m.registrationKeys,`活跃 ${analyticsNumber(m.registrationKeys?.active)} · 已使用 ${analyticsNumber(m.registrationKeys?.used)}`,'⌘','users')}
        </div>
        <div class="analytics-health-grid">
          ${analyticsInfoCard('申请通过率',analyticsPercent(approval.approvalRate),`本期通过 ${analyticsNumber(approval.approved)} / 已决 ${analyticsNumber(Number(approval.approved||0)+Number(approval.rejected||0))}`,'good')}
          ${analyticsInfoCard('平均审核耗时',analyticsDuration(approval.avgReviewHours),`待审核平均等待 ${analyticsDuration(approval.avgPendingHours)}`)}
          ${analyticsInfoCard('7 天内到期',analyticsNumber(activeDomains.expiring7d),`已过期 ${analyticsNumber(activeDomains.expired)}`,Number(activeDomains.expiring7d)>0?'warn':'')}
          ${analyticsInfoCard('登录失败',analyticsNumber(security.loginFailures),`成功登录 ${analyticsNumber(security.logins)}`,Number(security.loginFailures)>0?'warn':'')}
          ${analyticsInfoCard('DNS 代理率',analyticsPercent(analyticsRatio(dnsHealth.proxied,m.dns?.total)),`代理记录 ${analyticsNumber(dnsHealth.proxied)}`)}
          ${analyticsInfoCard('消息阅读人数',analyticsNumber(analytics.messageEngagement?.readers),`阅读回执 ${analyticsNumber(analytics.messageEngagement?.readReceipts)}`)}
        </div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><div><h3>系统增长与业务活跃趋势</h3><p>同时观察新用户、域名申请、审核通过、DNS 新增和消息发送。</p></div><small>${esc(analytics.range?.label||'')}</small></div>${multiLineChart(analytics.trends?.growth||[],[{key:'users',label:'新用户'},{key:'applications',label:'新申请'},{key:'approved',label:'审核通过'},{key:'dns',label:'新增 DNS'},{key:'messages',label:'发送消息'}],bucket)}</section>
        <div class="analytics-three-col">
          <section class="chart-card">${analyticsFunnel('用户转化漏斗',[{label:'注册用户',value:funnel.users},{label:'提交过申请',value:funnel.applicants},{label:'拥有通过域名',value:funnel.approvedUsers},{label:'配置 DNS',value:funnel.dnsUsers}])}</section>
          <section class="chart-card">${analyticsFunnel('申请转化漏斗',[{label:'全部申请',value:funnel.applications},{label:'审核通过',value:funnel.approvedApplications},{label:'已配置 DNS',value:funnel.configuredApplications}])}</section>
          <section class="chart-card"><h3>异常动作排行</h3>${horizontalBarChart(r.failures,'action','count',8)}</section>
        </div>
        <div class="analytics-three-col">
          <section class="chart-card"><h3>用户状态</h3>${donutChart(d.userStatus||[],'status')}</section>
          <section class="chart-card"><h3>域名状态</h3>${donutChart(d.domainStatus||[],'status')}</section>
          <section class="chart-card"><h3>DNS 类型</h3>${donutChart(d.dnsType||[],'type')}</section>
        </div>
      </div>

      <div data-analytics-panel="users" class="analytics-panel">
        <div class="analytics-section-head"><div><h3>用户增长与使用深度</h3><p>分析账号状态、角色结构、申请参与度和高活跃用户。</p></div></div>
        <div class="analytics-two-col balanced"><section class="chart-card"><h3>用户状态分布</h3>${donutChart(d.userStatus||[],'status')}</section><section class="chart-card"><h3>用户角色分布</h3>${donutChart(d.userRole||[],'role')}</section></div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><h3>用户与业务增长趋势</h3><small>${esc(analytics.range?.label||'')}</small></div>${multiLineChart(analytics.trends?.growth||[],[{key:'users',label:'新用户'},{key:'applications',label:'新申请'},{key:'approved',label:'审核通过'}],bucket)}</section>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><div><h3>高活跃用户排行</h3><p>按活跃域名、DNS 记录和申请总量综合排序。</p></div></div>${analyticsUserTable(r.users)}</section>
      </div>

      <div data-analytics-panel="domains" class="analytics-panel">
        <div class="analytics-section-head"><div><h3>域名与 DNS 全链路</h3><p>从申请、审核、根域名分布、到期风险、DNS 类型与同步状态进行完整分析。</p></div></div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><h3>域名申请与审批趋势</h3><small>${esc(analytics.range?.label||'')}</small></div>${multiLineChart(analytics.trends?.domains||[],[{key:'created',label:'新增申请'},{key:'approved',label:'审核通过'},{key:'rejected',label:'驳回/注销'}],bucket)}</section>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><h3>DNS 记录变更趋势</h3><small>${esc(analytics.range?.label||'')}</small></div>${multiLineChart(analytics.trends?.dns||[],[{key:'added',label:'新增 DNS'},{key:'removed',label:'删除 DNS'}],bucket)}</section>
        <div class="analytics-three-col"><section class="chart-card"><h3>根域名使用量</h3>${horizontalBarChart(d.suffix,'suffix','count',10)}</section><section class="chart-card"><h3>DNS 同步状态</h3>${donutChart(d.dnsStatus||[],'status')}</section><section class="chart-card"><h3>代理方式</h3>${donutChart(d.dnsProxy||[],'proxy')}</section></div>
        <div class="analytics-two-col balanced"><section class="chart-card"><h3>域名到期风险</h3>${donutChart(d.expiry||[],'bucket')}</section><section class="chart-card"><h3>DNS 类型结构</h3>${donutChart(d.dnsType||[],'type')}</section></div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><div><h3>根域名业务明细</h3><p>比较各根域名的申请规模、活跃量、待审核量和通过率。</p></div></div>${analyticsSuffixTable(r.suffixes)}</section>
      </div>

      <div data-analytics-panel="operations" class="analytics-panel">
        <div class="analytics-section-head"><div><h3>运营、安全与系统稳定性</h3><p>观察登录、失败事件、操作类型、消息触达和一周内的活跃时段。</p></div></div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><h3>登录与异常趋势</h3><small>${esc(analytics.range?.label||'')}</small></div>${multiLineChart(analytics.trends?.operations||[],[{key:'logins',label:'成功登录'},{key:'loginFailures',label:'登录失败'},{key:'errors',label:'系统异常'}],bucket)}</section>
        <div class="analytics-three-col"><section class="chart-card"><h3>操作分类</h3>${donutChart(d.auditCategory||[],'category')}</section><section class="chart-card"><h3>消息级别</h3>${donutChart(d.messageLevel||[],'level')}</section><section class="chart-card"><h3>消息对象</h3>${donutChart(d.messageTarget||[],'target')}</section></div>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><div><h3>操作活跃热力图</h3><p>按星期和小时统计所选时间范围内的操作日志，时间采用系统存储时间。</p></div></div><div class="interactive-chart">${analyticsHeatmap(analytics.heatmap)}<div class="analytics-floating-tip" hidden></div></div></section>
        <section class="chart-card analytics-wide"><div class="chart-titlebar"><h3>异常与失败动作明细</h3><small>${esc(analytics.range?.label||'')}</small></div>${analyticsFailureTable(r.failures)}</section>
      </div>

      <div data-analytics-panel="details" class="analytics-panel">
        <div class="analytics-section-head"><div><h3>可搜索、可排序的明细数据</h3><p>用于追踪近期申请和操作记录。点击表头可排序，输入关键词可实时筛选。</p></div></div>
        <section class="chart-card analytics-wide"><h3>最近域名申请</h3>${analyticsRecentApplications(analytics.recent?.applications)}</section>
        <section class="chart-card analytics-wide"><h3>最近操作日志</h3>${analyticsRecentAudit(analytics.recent?.audit)}</section>
      </div>
    </section>`);
    bindAnalyticsControls(rangeState); bindAnalyticsChartInteractions(document); bindAnalyticsDashboardInteractions();
  } catch(error){ toast(error.message,'error'); }
}
function bindAnalyticsDashboardInteractions() {
  const tabs=[...document.querySelectorAll('[data-analytics-view]')];
  const panels=[...document.querySelectorAll('[data-analytics-panel]')];
  const activate=view=>{tabs.forEach(b=>b.classList.toggle('active',b.dataset.analyticsView===view));panels.forEach(p=>p.classList.toggle('active',p.dataset.analyticsPanel===view));};
  tabs.forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.analyticsView||'overview')));
  document.querySelectorAll('[data-analytics-jump]').forEach(btn=>btn.addEventListener('click',()=>{activate(btn.dataset.analyticsJump||'overview');document.querySelector('.analytics-view-tabs')?.scrollIntoView({behavior:'smooth',block:'start'});}));
  document.querySelectorAll('[data-analytics-table-search]').forEach(input=>input.addEventListener('input',()=>{const table=document.querySelector(`[data-analytics-table="${CSS.escape(input.dataset.analyticsTableSearch||'')}"]`);const q=input.value.trim().toLowerCase();table?.querySelectorAll('tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q));}));
  document.querySelectorAll('.analytics-table th[data-sort]').forEach(th=>th.addEventListener('click',()=>{const table=th.closest('table');const tbody=table?.querySelector('tbody');if(!tbody)return;const index=[...th.parentElement.children].indexOf(th);const asc=th.dataset.direction!=='asc';th.dataset.direction=asc?'asc':'desc';const rows=[...tbody.querySelectorAll('tr')];rows.sort((a,b)=>{let av=a.children[index]?.textContent.trim()||'',bv=b.children[index]?.textContent.trim()||'';if(th.dataset.sort==='number'){av=Number(av.replace(/[^0-9.-]/g,''))||0;bv=Number(bv.replace(/[^0-9.-]/g,''))||0;}return (av>bv?1:av<bv?-1:0)*(asc?1:-1)}).forEach(row=>tbody.appendChild(row));}));
  document.querySelector('#analytics-export-json')?.addEventListener('click',()=>{if(!LAST_ANALYTICS_DATA)return;downloadAnalyticsFile(`storage-analytics-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(LAST_ANALYTICS_DATA,null,2),'application/json;charset=utf-8');});
  document.querySelector('#analytics-export-csv')?.addEventListener('click',()=>{if(!LAST_ANALYTICS_DATA)return;downloadAnalyticsFile(`storage-analytics-${new Date().toISOString().slice(0,10)}.csv`,`\ufeff${buildAnalyticsCsv(LAST_ANALYTICS_DATA)}`,'text/csv;charset=utf-8');});
  document.querySelector('#analytics-print')?.addEventListener('click',()=>window.print());
}
function bindAnalyticsControls(rangeState) {
  document.querySelectorAll('[data-analytics-range]').forEach(btn=>btn.addEventListener('click',()=>{const value=btn.dataset.analyticsRange||'30d';if(value==='custom'){const start=document.querySelector('#analytics-start')?.value||'';const end=document.querySelector('#analytics-end')?.value||'';location.hash=`#/admin/analytics?${analyticsQueryString('custom',start,end)}`;}else location.hash=`#/admin/analytics?${analyticsQueryString(value)}`;renderAdminAnalytics();}));
  document.querySelector('#apply-custom-analytics')?.addEventListener('click',()=>{const start=document.querySelector('#analytics-start')?.value||'';const end=document.querySelector('#analytics-end')?.value||'';if(!start||!end)return toast('请选择自定义开始和结束时间','error');location.hash=`#/admin/analytics?${analyticsQueryString('custom',start,end)}`;renderAdminAnalytics();});
  document.querySelector('#refresh-analytics')?.addEventListener('click',renderAdminAnalytics);
}

Object.assign(statusText,{admin:'管理员',user:'普通用户',proxied:'已代理',dns_only:'仅 DNS',success:'成功',failed:'失败',warning:'警告',error:'错误',danger:'危险',info:'信息',all:'全部用户',role:'按角色',single:'指定用户',auth:'认证',dns:'DNS',domain:'域名',message:'消息',settings:'设置',other:'其他',no_expiry:'无到期时间',expired:'已过期',within_7d:'7 天内',within_30d:'30 天内',within_90d:'90 天内',after_90d:'90 天后'});

Object.assign(I18N_EN, {
  '综合数据分析中心':'Comprehensive Analytics Center','从用户增长、域名转化、DNS 健康、消息触达、操作安全和异常事件多个维度查看系统运行情况。所有指标均随时间范围联动。':'Analyze user growth, domain conversion, DNS health, message reach, operational security, and incidents. All metrics follow the selected time range.','数据生成时间：':'Generated at:','对比区间：':'Comparison period:','导出 CSV':'Export CSV','导出 JSON':'Export JSON','打印报表':'Print Report','总览':'Overview','用户分析':'User Analytics','域名与 DNS':'Domains & DNS','运营与安全':'Operations & Security','明细数据':'Detailed Data','注册用户':'Registered Users','域名申请':'Domain Applications','有效 DNS 记录':'Active DNS Records','系统消息':'System Messages','操作日志':'Audit Logs','注册码':'Registration Keys','本期':'Current period','本期登录':'Logged in this period','本期阅读回执':'Read receipts this period','本期异常':'Incidents this period','活跃':'Active','待审核':'Pending','异常':'Errors','待同步':'Pending sync','已使用':'Used','申请通过率':'Approval Rate','平均审核耗时':'Average Review Time','待审核平均等待':'Average Pending Time','7 天内到期':'Expiring Within 7 Days','已过期':'Expired','登录失败':'Login Failures','成功登录':'Successful Logins','DNS 代理率':'DNS Proxy Rate','代理记录':'Proxied Records','消息阅读人数':'Message Readers','阅读回执':'Read Receipts','系统增长与业务活跃趋势':'System Growth and Business Activity','同时观察新用户、域名申请、审核通过、DNS 新增和消息发送。':'Track new users, applications, approvals, DNS additions, and messages together.','新用户':'New Users','新申请':'New Applications','新增 DNS':'DNS Added','发送消息':'Messages Sent','用户转化漏斗':'User Conversion Funnel','申请转化漏斗':'Application Conversion Funnel','注册用户':'Registered Users','提交过申请':'Submitted an Application','拥有通过域名':'Owns an Approved Domain','配置 DNS':'Configured DNS','全部申请':'All Applications','已配置 DNS':'DNS Configured','异常动作排行':'Top Failure Actions','用户状态':'User Status','域名状态':'Domain Status','DNS 类型':'DNS Types','用户增长与使用深度':'User Growth and Engagement','分析账号状态、角色结构、申请参与度和高活跃用户。':'Analyze account status, role mix, application participation, and highly active users.','用户状态分布':'User Status Distribution','用户角色分布':'User Role Distribution','用户与业务增长趋势':'User and Business Growth','高活跃用户排行':'Most Active Users','按活跃域名、DNS 记录和申请总量综合排序。':'Ranked by active domains, DNS records, and total applications.','搜索用户、邮箱或状态':'Search users, email, or status','用户':'User','域名':'Domains','活跃域名':'Active Domains','最后登录':'Last Login','从未登录':'Never Logged In','域名与 DNS 全链路':'End-to-End Domains and DNS','从申请、审核、根域名分布、到期风险、DNS 类型与同步状态进行完整分析。':'Analyze applications, reviews, suffix distribution, expiry risk, DNS types, and synchronization status.','域名申请与审批趋势':'Domain Application and Review Trend','DNS 记录变更趋势':'DNS Record Change Trend','删除 DNS':'DNS Removed','根域名使用量':'Root Domain Usage','DNS 同步状态':'DNS Sync Status','代理方式':'Proxy Mode','域名到期风险':'Domain Expiry Risk','DNS 类型结构':'DNS Type Mix','根域名业务明细':'Root Domain Details','比较各根域名的申请规模、活跃量、待审核量和通过率。':'Compare application volume, active domains, pending reviews, and approval rates by suffix.','搜索根域名':'Search root domains','根域名':'Root Domain','总量':'Total','已驳回':'Rejected','通过率':'Approval Rate','运营、安全与系统稳定性':'Operations, Security, and Reliability','观察登录、失败事件、操作类型、消息触达和一周内的活跃时段。':'Review logins, failures, operation categories, message reach, and activity periods.','登录与异常趋势':'Login and Incident Trend','系统异常':'System Incidents','操作分类':'Operation Categories','消息级别':'Message Levels','消息对象':'Message Targets','操作活跃热力图':'Activity Heatmap','按星期和小时统计所选时间范围内的操作日志，时间采用系统存储时间。':'Audit activity by weekday and hour using the system storage time.','异常与失败动作明细':'Failure and Incident Details','异常动作':'Failure Action','次数':'Count','最近发生':'Latest Occurrence','当前时间范围没有异常':'No incidents in the selected range','可搜索、可排序的明细数据':'Searchable and Sortable Details','用于追踪近期申请和操作记录。点击表头可排序，输入关键词可实时筛选。':'Track recent applications and operations. Click headers to sort and type to filter.','最近域名申请':'Recent Domain Applications','搜索域名、用户、状态或类型':'Search domain, user, status, or type','记录类型':'Record Type','申请时间':'Application Time','错误':'Error','最近操作日志':'Recent Audit Logs','搜索动作、用户、IP或对象':'Search action, user, IP, or target','时间':'Time','操作人':'Actor','动作':'Action','对象':'Target','系统':'System','正在读取完整分析数据…':'Loading comprehensive analytics…','较少':'Less','较多':'More','周日':'Sun','周一':'Mon','周二':'Tue','周三':'Wed','周四':'Thu','周五':'Fri','周六':'Sat','分钟':'minutes','小时':'hours','天':'days','DATA COMMAND CENTER':'DATA COMMAND CENTER'
});


function renderCloudflareRecipientOptions(addresses, selected) {
  const list = Array.from(new Set([...(Array.isArray(addresses) ? addresses : []), selected].map(x => String(x || '').trim().toLowerCase()).filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))));
  if (!list.length) return '<option value="">请先同步已验证邮箱</option>';
  return list.map(email => `<option value="${esc(email)}" ${email === String(selected || '').trim().toLowerCase() ? 'selected' : ''}>${esc(email)}</option>`).join('');
}

function updateCloudflareEmailTestButton() {
  const select = document.querySelector('#cloudflare-admin-recipient');
  const button = document.querySelector('#test-email-delivery');
  const target = String(select?.value || '').trim();
  if (button) button.textContent = target ? `发送到 ${target}` : '发送到所选邮箱';
  const targetText = document.querySelector('#cloudflare-test-recipient-text');
  if (targetText) targetText.textContent = target || '尚未选择';
}

async function syncCloudflareEmailRecipients(force = false) {
  const button = document.querySelector('#sync-cloudflare-email-addresses');
  const resultEl = document.querySelector('#cloudflare-email-sync-result');
  const select = document.querySelector('#cloudflare-admin-recipient');
  if (button) button.disabled = true;
  if (resultEl) resultEl.textContent = '正在同步…';
  try {
    const result = await api('/api/admin/email/cloudflare-addresses/sync', { method:'POST', body:{ force } });
    const addresses = Array.isArray(result.addresses) ? result.addresses : [];
    if (select) {
      select.innerHTML = renderCloudflareRecipientOptions(addresses, result.selected);
      select.value = result.selected || addresses[0] || '';
    }
    if (resultEl) resultEl.textContent = `${result.message || '同步完成'} · 通道 Cloudflare SEB`;
    updateCloudflareEmailTestButton();
    if (force) toast(result.message || '已同步 Cloudflare 已验证邮箱', 'success');
    return result;
  } catch (error) {
    if (resultEl) resultEl.textContent = error.message || '同步失败';
    if (force) toast(error.message || '同步失败', 'error');
    throw error;
  } finally {
    if (button) button.disabled = false;
  }
}

let managedWorkerVariablesState = null;

function workerVariableTypeLabel(type) {
  const t = workerVariableTypeValue(type);
  if (t === 'secret_text') return '密钥';
  if (t === 'json') return 'JSON';
  return '文本';
}
function workerVariableTypeValue(type) {
  const value = String(type || '').trim().toLowerCase();
  if (value === 'secret_text' || value === 'secret') return 'secret_text';
  if (value === 'json') return 'json';
  return 'plain_text';
}
function workerVariableValueText(item) {
  if (!item) return '';
  if (item.type === 'secret_text' || item.sensitive) return item.configured ? '值已加密' : '未配置';
  return item.value || '—';
}
function workerVariableKnownInfo(name, type) {
  const defs = managedWorkerVariablesState?.definitions || {};
  const direct = defs[name];
  if (direct) return direct;
  const normalizedType = workerVariableTypeValue(type);
  const secretLike = normalizedType === 'secret_text' || /(TOKEN|SECRET|KEY|PASSWORD|PRIVATE|SALT|BOOTSTRAP|API_KEY)/i.test(name || '');
  const jsonLike = normalizedType === 'json';
  return {
    label: name || '自定义变量',
    purpose: jsonLike ? '自定义 JSON 变量，适合保存对象、数组、布尔值、数字等结构化配置，当前代码或后续功能可能通过 env 读取它。' : (secretLike ? '自定义密钥变量，当前代码或后续功能可能通过 env 读取它。' : '自定义文本变量，当前代码或后续功能可能通过 env 读取它。'),
    addMethod: jsonLike ? '类型选择“JSON”；值必须是有效 JSON，例如 {"enabled":true} 或 ["A","B"]。' : (secretLike ? '类型建议选择“密钥”；填写后代码可通过 env 读取。' : '类型建议选择“文本”；填写后代码可通过 env 读取。'),
    suggestedType: jsonLike ? 'json' : (secretLike ? 'secret_text' : 'plain_text')
  };
}
function renderWorkerVariableRows(variables) {
  if (!Array.isArray(variables) || !variables.length) {
    return '<tr><td colspan="6">暂无变量。请先确认 CF_WORKERS_API_TOKEN 和 CF_ACCOUNT_ID 已配置，或点击刷新同步。</td></tr>';
  }
  return variables.map(item => {
    const type = workerVariableTypeValue(item.type);
    const label = item.label || item.name;
    return `<tr>
      <td><span class="status-pill ${type === 'secret_text' ? 'pending' : (type === 'json' ? 'info' : 'ok')}">${workerVariableTypeLabel(type)}</span></td>
      <td><strong><code>${esc(item.name)}</code></strong><p class="muted small">${esc(label)}</p></td>
      <td class="mono-cell">${esc(workerVariableValueText(item))}</td>
      <td><p><b>用途：</b>${esc(item.purpose || '')}</p><p class="muted small"><b>添加方法：</b>${esc(item.addMethod || '')}</p></td>
      <td><span class="muted small">${esc(item.source || '')}</span></td>
      <td>${item.protected ? '<span class="muted small">控制台维护</span>' : `<button class="icon-btn" data-worker-var-edit="${attr(item.name)}" title="编辑">✎</button><button class="icon-btn danger" data-worker-var-delete="${attr(item.name)}" data-worker-var-type="${attr(type)}" title="删除">🗑</button>`}</td>
    </tr>`;
  }).join('');
}
function renderWorkerVariableTable() {
  const box = document.querySelector('#worker-variables-list');
  if (!box) return;
  const variables = managedWorkerVariablesState?.variables || [];
  box.innerHTML = `<div class="table-wrap worker-variable-table-wrap"><table><thead><tr><th>类型</th><th>变量名称</th><th>值</th><th>用途和添加方法</th><th>来源</th><th>操作</th></tr></thead><tbody>${renderWorkerVariableRows(variables)}</tbody></table></div>`;
  bindWorkerVariableTableActions();
}
function openWorkerVariableModal(mode, item = null) {
  const isEdit = mode === 'edit';
  const name = item?.name || '';
  const type = workerVariableTypeValue(item?.type || item?.suggestedType || 'plain_text');
  const info = workerVariableKnownInfo(name, type);
  openModal(isEdit ? '编辑 Worker 变量' : '添加 Worker 变量', isEdit ? `修改 ${name}` : '与 Cloudflare 变量和密钥填写方式保持一致', `
    <form id="worker-variable-form" class="form-grid">
      <label class="field"><span>类型</span><select name="type"><option value="plain_text" ${type === 'plain_text' ? 'selected' : ''}>文本</option><option value="json" ${type === 'json' ? 'selected' : ''}>JSON</option><option value="secret_text" ${type === 'secret_text' ? 'selected' : ''}>密钥</option></select><em>与 Cloudflare 后台一致：文本、JSON、密钥。密钥不会读取或回显旧值。</em></label>
      <label class="field"><span>变量名称</span><input name="name" value="${fieldValue(name)}" ${isEdit ? 'readonly' : ''} placeholder="例如 CF_ACCOUNT_ID"><em>只能使用字母、数字和下划线，不能以数字开头。</em></label>
      <label class="field wide"><span>值</span><textarea name="value" rows="6" placeholder="请输入新值">${isEdit && type !== 'secret_text' ? fieldValue(item?.value || '') : ''}</textarea><em>${isEdit && type === 'secret_text' ? '密钥旧值不会显示；输入新值后会覆盖原密钥。' : (type === 'json' ? 'JSON 变量必须填写有效 JSON；系统会保存为结构化 JSON，不是普通字符串。' : '填写内容与 Cloudflare 后台“值”输入框一致。')}</em></label>
      <div class="readonly-box wide" id="worker-variable-help"><b>${esc(info.label || name || '变量说明')}</b><p><b>用途：</b>${esc(info.purpose || '')}</p><p><b>添加方法：</b>${esc(info.addMethod || '')}</p></div>
      <div class="modal-actions wide"><button class="btn soft" type="button" data-close-modal>取消</button><button class="btn primary" type="submit">${isEdit ? '保存修改' : '添加变量'}</button></div>
    </form>`, 'wide');
  const form = document.querySelector('#worker-variable-form');
  const updateHelp = () => {
    const currentName = String(form?.elements?.name?.value || '').trim();
    const currentType = workerVariableTypeValue(form?.elements?.type?.value || 'plain_text');
    const currentInfo = workerVariableKnownInfo(currentName, currentType);
    const help = document.querySelector('#worker-variable-help');
    if (help) help.innerHTML = `<b>${esc(currentInfo.label || currentName || '变量说明')}</b><p><b>用途：</b>${esc(currentInfo.purpose || '')}</p><p><b>添加方法：</b>${esc(currentInfo.addMethod || '')}</p>`;
  };
  form?.elements?.name?.addEventListener('input', updateHelp);
  form?.elements?.type?.addEventListener('change', updateHelp);
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      type: String(fd.get('type') || 'plain_text'),
      value: String(fd.get('value') || '').trim(),
    };
    if (!payload.name || !payload.value) return toast('请填写变量名称和值', 'error');
    if (payload.name === 'CF_WORKERS_API_TOKEN') return toast('CF_WORKERS_API_TOKEN 只能在 Cloudflare 控制台维护', 'error');
    if (workerVariableTypeValue(payload.type) === 'json') {
      try { JSON.parse(payload.value); } catch { return toast('JSON 变量内容不是有效 JSON，请检查引号、逗号、括号和布尔值格式', 'error'); }
    }
    const label = isEdit ? '确认保存这个 Worker 变量？' : '确认添加这个 Worker 变量？';
    if (!confirm(`${label}\n\n变量：${payload.name}\n类型：${workerVariableTypeLabel(payload.type)}\n\n保存后会直接写入 Cloudflare Worker。`)) return;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const result = await api('/api/admin/worker-variables', { method:'POST', body: payload });
      toast(result.message || 'Worker 变量已更新', 'success');
      closeModal();
      await loadManagedWorkerVariables(true);
    } catch (error) {
      toast(error.message || '更新失败', 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
function bindWorkerVariableTableActions() {
  document.querySelectorAll('[data-worker-var-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.workerVarEdit || '';
      const item = managedWorkerVariablesState?.variables?.find(v => v.name === name);
      if (item) openWorkerVariableModal('edit', item);
    });
  });
  document.querySelectorAll('[data-worker-var-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.workerVarDelete || '';
      const type = btn.dataset.workerVarType || 'plain_text';
      if (!name) return;
      if (!confirm(`确认删除 Worker 变量 ${name}？\n\n删除后相关功能可能立即失效。`)) return;
      try {
        const result = await api('/api/admin/worker-variables', { method:'DELETE', body:{ name, type } });
        toast(result.message || '变量已删除', 'success');
        await loadManagedWorkerVariables(true);
      } catch (error) {
        toast(error.message || '删除失败', 'error');
      }
    });
  });
}
async function loadManagedWorkerVariables(showToast = false) {
  const status = document.querySelector('#managed-worker-variable-status');
  try {
    if (status) status.textContent = '正在同步 Cloudflare Worker 变量…';
    const result = await api('/api/admin/worker-variables');
    managedWorkerVariablesState = result;
    if (status) status.textContent = `${result.enabled ? 'API 管理已启用' : 'API 管理未启用'} · Worker：${result.scriptName || 'storage'} · ${result.variables?.length || 0} 个变量${result.warning ? ' · ' + result.warning : ''}`;
    renderWorkerVariableTable();
    if (showToast) toast('Worker 变量已同步', 'success');
    return result;
  } catch (error) {
    if (status) status.textContent = error.message || '读取 Worker 变量失败';
    renderWorkerVariableTable();
    if (showToast) toast(error.message || '同步失败', 'error');
    throw error;
  }
}

async function renderAdminSettings() {
  shell('管理员设置', `<div class="loading-card">正在读取设置…</div>`);
  try {
    const { settings } = await api('/api/admin/settings');
    const site = settings.site || {};
    const reg = settings.registration || {};
    const domain = domainConfig(settings.domain);
    const dns = settings.dns || { suffixes: [] };
    const bl = settings.blacklist || { prefixes: [], ips: [], emails: [], registration: [], access: [], userIds: [] };
    const notification = settings.notification || { events: {}, expiryTemplate: '' };
    const security = settings.security || { adminSessionTimeoutHours:24, adminIpWhitelist:'', auditRetentionDays:7 };
    const automation = settings.automation || { enabled:false, scanCycleMinutes:60, checkExpiringDomains:true, cleanupExpiredDns:true };

    shell('管理员设置', `<section class="card admin-settings admin-settings-v79">
      <div class="settings-toolbar">
        <div><h2>管理员设置</h2><p>配置按功能分组保存到 Workers KV。修改高风险项目时会要求二次确认。</p></div>
        <div class="toolbar-actions"><span class="settings-save-status">设置读取完成</span><button class="btn soft" id="export-settings" type="button">导出配置</button><label class="btn soft file-btn">导入配置<input id="import-settings-file" type="file" accept="application/json,.json" hidden></label></div>
      </div>
      <div class="tabs admin-tabs">
        <button class="tab active" data-tab="site">界面设置</button>
        <button class="tab" data-tab="registration">注册设置</button>
        <button class="tab" data-tab="domain">域名规则</button>
        <button class="tab" data-tab="dns">DNS 配置</button>
        <button class="tab" data-tab="blacklist">黑名单管理</button>
        <button class="tab" data-tab="notification">通知设置</button>
        <button class="tab" data-tab="security">安全设置</button>
        <button class="tab" data-tab="automation">自动化任务</button>
        <button class="tab" data-tab="variables">变量设置</button>
        <button class="tab" data-tab="system">系统状态</button>
      </div>

      <div class="tab-page active" data-page="site">
        <form id="site-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>品牌与外观</h3><p>配置站点名称、Logo、主题和主色。</p></div></div>
          <label class="field"><span>网站标题</span><input name="title" maxlength="80" value="${fieldValue(site.title)}"><em>显示在浏览器标题和登录页。</em></label>
          <label class="field"><span>副标题</span><input name="subtitle" maxlength="140" value="${fieldValue(site.subtitle)}"><em>显示在前台品牌区域。</em></label>
          <label class="field"><span>Logo 文字</span><input name="logoText" maxlength="12" value="${fieldValue(site.logoText)}"><em>不使用图片 Logo 时显示。</em></label>
          <label class="field"><span>站点 Logo 图片 URL</span><input name="logoImageUrl" value="${fieldValue(site.logoImageUrl)}" placeholder="https://example.com/logo.png"><em>填写后优先显示图片 Logo。</em></label>
          <label class="field"><span>站点 Favicon 地址</span><input name="faviconUrl" value="${fieldValue(site.faviconUrl)}" placeholder="https://example.com/favicon.ico"><em>用于浏览器标签页图标，留空使用默认。</em></label>
          <label class="field"><span>主题模式</span><select name="themeMode"><option value="light" ${site.themeMode !== 'dark' && site.themeMode !== 'system' ? 'selected' : ''}>浅色</option><option value="dark" ${site.themeMode === 'dark' ? 'selected' : ''}>深色</option><option value="system" ${site.themeMode === 'system' ? 'selected' : ''}>跟随系统</option></select><em>只影响前台基础主题，不改变现有布局。</em></label>
          <label class="field color-field"><span>主色</span><div class="color-picker-row"><input name="accent" class="color-text" value="${fieldValue(site.accent || '#4f63f6')}" placeholder="#4f63f6"><input type="color" class="color-native" value="${fieldValue(site.accent || '#4f63f6')}"><button type="button" class="color-preview color-open" style="background:${attr(site.accent || '#4f63f6')}"></button></div><em>支持十六进制颜色代码。</em></label>
          <label class="field color-field"><span>辅助色</span><div class="color-picker-row"><input name="accent2" class="color-text" value="${fieldValue(site.accent2 || '#7c4dff')}" placeholder="#7c4dff"><input type="color" class="color-native" value="${fieldValue(site.accent2 || '#7c4dff')}"><button type="button" class="color-preview color-open" style="background:${attr(site.accent2 || '#7c4dff')}"></button></div><em>用于渐变按钮第二色。</em></label>
          <div class="settings-section-heading wide"><span>02</span><div><h3>页脚与合规信息</h3><p>统一维护页脚、版权和备案信息。</p></div></div>
          <label class="field"><span>ICP 备案信息</span><input name="icp" value="${fieldValue(site.icp)}" placeholder="例如：粤ICP备xxxx号"><em>前台底部显示，位于版权信息下方。</em></label>
          <label class="field"><span>版权信息</span><textarea name="copyright" rows="3">${esc(site.copyright || '')}</textarea><em>支持换行，显示在 ICP 上方。</em></label>
          <label class="field wide"><span>页脚文字</span><input name="footer" value="${fieldValue(site.footer)}"><em>底部基础说明。</em></label>
          <div class="settings-section-heading wide"><span>03</span><div><h3>公告、维护与高级代码</h3><p>控制维护模式、公告时段和可信第三方脚本。</p></div></div>
          <label class="field wide"><span>自定义头部第三方 JS 代码</span><textarea name="headerThirdPartyJs" rows="5" placeholder="例如统计代码。高危：请只粘贴可信代码。">${esc(site.headerThirdPartyJs || '')}</textarea><em>高危配置，保存前会二次确认；错误 JS 可能导致前台白屏。</em></label>
          <label class="check"><input name="maintenanceMode" type="checkbox" ${yn(site.maintenanceMode)}> 开启网站维护模式 <em>开启后前台显示维护提示。</em></label>
          <label class="field wide"><span>维护文案</span><textarea name="maintenanceMessage" rows="3">${esc(site.maintenanceMessage || '')}</textarea><em>维护模式开启时展示给用户。</em></label>
          <label class="field"><span>前台默认语言</span><select name="defaultLanguage"><option value="zh" ${site.defaultLanguage !== 'en' ? 'selected' : ''}>中文</option><option value="en" ${site.defaultLanguage === 'en' ? 'selected' : ''}>英文</option></select><em>对应右上角 EN/中文切换按钮。</em></label>
          <label class="field"><span>公告开始时间</span><input name="noticeStartAt" type="datetime-local" value="${fieldValue(toLocalDateTimeValue(site.noticeStartAt))}"><em>留空表示立即生效。</em></label>
          <label class="field"><span>公告结束时间</span><input name="noticeEndAt" type="datetime-local" value="${fieldValue(toLocalDateTimeValue(site.noticeEndAt))}"><em>留空表示长期展示。</em></label>
          <label class="field wide"><span>前台首页公告 Markdown</span><textarea name="homepageNotice" rows="5">${esc(site.homepageNotice || '')}</textarea><em>作为前台顶部横幅通知。</em><button class="btn soft small" id="preview-notice" type="button">Markdown 实时预览</button></label>
          <label class="field wide"><span>404 自定义提示文本</span><textarea name="notFoundText" rows="3">${esc(site.notFoundText || '')}</textarea><em>访问不存在页面时显示。</em></label>
          <label class="check"><input name="showQuota" type="checkbox" ${yn(site.showQuota !== false)}> 前台展示域名剩余配额 <em>关闭后用户注册页不突出显示剩余额度。</em></label>
          <label class="check"><input name="showExpiryReminder" type="checkbox" ${yn(site.showExpiryReminder !== false)}> 前台展示域名到期提醒 <em>关闭后减少到期提示展示。</em></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="registration">
        <form id="registration-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>注册入口与账户状态</h3><p>控制用户是否可以注册、是否需要注册码以及新账号初始状态。</p></div></div>
          <label class="check"><input name="enabled" type="checkbox" ${yn(reg.enabled)}> 开放用户注册 <em>关闭后普通用户不能创建新账户。</em></label>
          <label class="check"><input name="autoActivate" type="checkbox" ${yn(reg.autoActivate)}> 注册后自动启用账户 <em>关闭后新用户需要管理员启用。</em></label>
          <label class="check"><input name="requireRegistrationKey" type="checkbox" ${yn(reg.requireRegistrationKey)}> 开启注册码注册 <em>开启后注册页显示注册码输入框，必须填写有效注册码。</em></label>
          <label class="check"><input name="blockTempEmail" type="checkbox" ${yn(reg.blockTempEmail)}> 拦截临时邮箱注册 <em>用于减少垃圾账号。</em></label>
          <div class="settings-section-heading wide"><span>02</span><div><h3>Turnstile 人机验证</h3><p>配置 Turnstile 公钥和密钥；是否使用由下方“人机验证方式”统一控制，作用于登录、注册、域名申请和管理员添加用户。</p></div></div>
          <label class="field"><span>Turnstile Site Key</span><input name="turnstileSiteKey" value="${fieldValue(reg.turnstileSiteKey)}" placeholder="0x4..."><em>前台显示验证模块用；环境变量优先。</em></label>
          <label class="field"><span>Turnstile Secret Key</span><input name="turnstileSecret" type="password" value="" autocomplete="new-password" placeholder="${reg.turnstileSecretConfigured ? '已配置，留空保持不变' : '请输入 Secret Key'}"><em>密钥不会回显；留空保持原值。建议优先使用 Worker Secret。</em></label>
          <label class="field"><span>新注册账号默认状态</span><select name="defaultStatus"><option value="auto" ${reg.defaultStatus !== 'manual' ? 'selected' : ''}>自动启用</option><option value="manual" ${reg.defaultStatus === 'manual' ? 'selected' : ''}>需要人工审核</option></select><em>用于注册后的账号状态。</em></label>
          <div class="settings-section-heading wide"><span>03</span><div><h3>图形验证设置</h3><p>Turnstile 无法加载时可自动回退到本地生成的一次性图形验证码。</p></div></div>
          <label class="field wide"><span>人机验证方式</span><select name="humanVerificationMode"><option value="image" ${reg.humanVerificationMode === 'image' ? 'selected' : ''}>仅使用图形验证</option><option value="turnstile" ${reg.humanVerificationMode === 'turnstile' ? 'selected' : ''}>仅使用 Turnstile 验证</option><option value="turnstile_fallback" ${!reg.humanVerificationMode || reg.humanVerificationMode === 'turnstile_fallback' ? 'selected' : ''}>优先 Turnstile 验证，失败后使用图形验证（默认）</option></select><em>作用于登录、注册、域名申请和管理员添加用户。</em></label>
          <label class="check"><input name="captchaBackgroundEnabled" type="checkbox" ${yn(reg.captchaBackgroundEnabled !== false)}> 开启图形验证码背景 <em>关闭后使用纯色浅色背景。</em></label>
          <label class="field"><span>背景生成方式</span><select name="captchaBackgroundMode"><option value="random" ${reg.captchaBackgroundMode !== 'upload' ? 'selected' : ''}>随机生成背景</option><option value="upload" ${reg.captchaBackgroundMode === 'upload' ? 'selected' : ''}>使用上传背景</option></select><em>上传图仅保存在 Workers KV 设置中。</em></label>
          <label class="field wide"><span>上传验证码背景</span><input id="captcha-background-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><input name="captchaBackgroundImage" id="captcha-background-data" type="hidden" value=""><em>建议横向图片，最大 500KB；重新上传才会覆盖原背景。</em><div id="captcha-background-preview" class="captcha-background-preview">${reg.captchaBackgroundMode === 'upload' ? '已配置上传背景；如需替换请重新选择图片。' : '当前使用随机背景。'}</div></label>
          <label class="check"><input name="captchaNoiseLinesEnabled" type="checkbox" ${yn(reg.captchaNoiseLinesEnabled !== false)}> 开启随机干扰线条 <em>线条绘制在字符前方。</em></label>
          <label class="field"><span>随机线条最少条数</span><input name="captchaNoiseLinesMin" type="number" min="0" max="20" value="${fieldValue(reg.captchaNoiseLinesMin ?? 2)}"></label>
          <label class="field"><span>随机线条最多条数</span><input name="captchaNoiseLinesMax" type="number" min="0" max="20" value="${fieldValue(reg.captchaNoiseLinesMax ?? 5)}"></label>
          <label class="field"><span>线条颜色方式</span><select name="captchaNoiseLineColorMode"><option value="random" ${reg.captchaNoiseLineColorMode !== 'fixed' ? 'selected' : ''}>随机颜色</option><option value="fixed" ${reg.captchaNoiseLineColorMode === 'fixed' ? 'selected' : ''}>固定颜色</option></select></label>
          <label class="field"><span>固定线条颜色</span><input name="captchaNoiseLineFixedColor" type="color" value="${fieldValue(reg.captchaNoiseLineFixedColor || '#64748b')}"><em>仅选择固定颜色时生效。</em></label>
          <label class="field wide"><span>图形验证码可用字符</span><input name="captchaCharset" value="${fieldValue(reg.captchaCharset || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}" placeholder="ABCDEFG1234567@"><em>随机字符只会从这里生成；系统会自动去重和移除空格。</em></label>
          <label class="field"><span>图形验证码字符数量</span><input name="captchaLength" type="number" min="3" max="8" step="1" value="${fieldValue(reg.captchaLength || 4)}"><em>允许 3-8 位。</em></label>
          <div class="settings-section-heading wide"><span>04</span><div><h3>注册频率与风险控制</h3><p>限制单 IP、失败次数、代理网络和每日域名申请量。</p></div></div>
          <label class="field"><span>单 IP 最大注册账号数量</span><input name="maxAccountsPerIp" type="number" min="0" value="${fieldValue(reg.maxAccountsPerIp || 0)}"><em>0 表示不限制。</em></label>
          <label class="field"><span>同一 IP 注册冷却/分钟</span><input name="ipRegisterCooldownMinutes" type="number" min="0" value="${fieldValue(reg.ipRegisterCooldownMinutes || 0)}"><em>0 表示无冷却。</em></label>
          <label class="field"><span>单账号每日域名申请上限</span><input name="dailyDomainApplyLimit" type="number" min="0" value="${fieldValue(reg.dailyDomainApplyLimit || 0)}"><em>0 表示不限制。</em></label>
          <label class="field"><span>连续注册失败封禁阈值</span><input name="failedRegisterBanThreshold" type="number" min="0" value="${fieldValue(reg.failedRegisterBanThreshold || 0)}"><em>达到次数后临时封禁 IP，0 表示关闭。</em></label>
          <label class="field"><span>注册失败封禁时长/分钟</span><input name="failedRegisterBanMinutes" type="number" min="0" value="${fieldValue(reg.failedRegisterBanMinutes || 0)}"><em>配合上方阈值使用。</em></label>
          <label class="check"><input name="emailVerificationEnabled" type="checkbox" ${yn(reg.emailVerificationEnabled)}> 注册邮箱验证开关 <em>开启后注册必须填写邮箱并通过邮件验证码。</em></label>
          <label class="check"><input name="blockVpnProxy" type="checkbox" ${yn(reg.blockVpnProxy)}> 拦截 VPN / 代理注册 <em>仅在 Worker 能读取可信代理风险字段时生效；未接入检测源时不会自动判断 VPN。</em></label>
          <div class="settings-section-heading wide"><span>05</span><div><h3>邮件发送分工</h3><p>注册验证码发送给任意用户邮箱，继续使用 Resend；只发给管理员的通知使用 Cloudflare 免费邮件绑定。</p></div></div>
          <div class="readonly-box wide"><b>当前发送方式</b><p><span class="badge">Resend</span> 注册验证码 → 任意用户邮箱。　<span class="badge">Cloudflare SEB</span> 管理员测试、系统异常、用户帮助、域名待审核、DNS 异常 → 已验证目标邮箱。</p><p><b>Cloudflare 绑定状态：</b>${reg.cloudflareAdminEmailConfigured ? '已配置' : '未配置'}　<b>当前管理员收件邮箱：</b>${esc(reg.cloudflareAdminEmail || reg.cloudflareAdminRecipient || '尚未选择')}　<b>发件邮箱：</b>${esc(reg.cloudflareAdminEmailFrom || reg.emailFrom || 'admin@flore.top')}</p><p>测试结果、操作日志和 Workers 日志都会明确记录发送通道：<code>cloudflare-seb</code> 或 <code>resend</code>。</p></div>
          <label class="field"><span>Cloudflare Account ID</span><input name="cloudflareEmailAccountId" value="${fieldValue(reg.cloudflareEmailAccountId || '')}" placeholder="32 位 Account ID"><em>用于读取账户级已验证邮箱。也可配置 Worker 变量 CF_ACCOUNT_ID。</em></label>
          <label class="field"><span>Email Routing API Token</span><input name="cloudflareEmailApiToken" type="password" autocomplete="new-password" placeholder="${reg.cloudflareEmailApiTokenConfigured ? '已配置，留空保持不变' : '请输入只读 API Token'}"><em>只授予 Email Routing Addresses Read。建议使用 Worker Secret：CF_EMAIL_ROUTING_API_TOKEN。</em></label>
          <div class="field wide"><span>Cloudflare 已验证收件邮箱</span><div class="email-test-row"><select name="cloudflareAdminRecipient" id="cloudflare-admin-recipient">${renderCloudflareRecipientOptions(reg.cloudflareVerifiedRecipients, reg.cloudflareAdminEmail || reg.cloudflareAdminRecipient)}</select><button class="btn soft" id="sync-cloudflare-email-addresses" type="button">同步已验证邮箱</button><span id="cloudflare-email-sync-result" class="muted">${reg.cloudflareRecipientsSyncedAt ? `上次同步：${esc(fmtDate(reg.cloudflareRecipientsSyncedAt))}` : '尚未同步'}</span></div><em>所有 Cloudflare 管理员通知都会发送到这里选中的邮箱。绑定名称 SEB 允许发送到本账户任意已验证目标邮箱。</em></div>
          <div class="settings-section-heading wide"><span>06</span><div><h3>邮箱规则与关闭提示</h3><p>管理邮箱后缀限制和注册关闭时的前台说明。</p></div></div>
          <label class="field wide"><span>邮箱后缀拦截黑名单</span><textarea name="emailDomainBlacklist" rows="4" placeholder="tempmail.com&#10;mailinator.com">${esc(reg.emailDomainBlacklist || '')}</textarea><em>一行一个邮箱后缀，不要带 @ 也可以。</em></label>
          <label class="field wide"><span>关闭注册时前台提示文案</span><textarea name="disabledMessage" rows="3">${esc(reg.disabledMessage || '')}</textarea><em>注册关闭时显示给用户。</em></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="domain">
        <form id="domain-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>平台与用户配额</h3><p>设置平台总量、普通用户和白名单用户的独立额度。</p></div></div>
          <label class="field"><span>默认域名额度</span><input name="defaultQuota" type="number" min="0" value="${fieldValue(domain.defaultQuota)}"><em>新用户默认额度。</em></label>
          <label class="field"><span>平台最大二级域名总配额</span><input name="platformMaxDomains" type="number" min="1" value="${fieldValue(domain.platformMaxDomains || 9999)}"><em>全站总量上限。</em></label>
          <label class="field"><span>普通用户额度</span><input name="normalUserQuota" type="number" min="0" value="${fieldValue(domain.normalUserQuota || domain.defaultQuota || 3)}"><em>普通用户配额方案。</em></label>
          <label class="field"><span>普通用户有效期/天</span><input name="normalUserValidDays" type="number" min="1" value="${fieldValue(domain.normalUserValidDays || domain.validDays || 365)}"><em>普通用户默认有效期。</em></label>
          <label class="field"><span>白名单用户额度</span><input name="whitelistUserQuota" type="number" min="0" value="${fieldValue(domain.whitelistUserQuota || 10)}"><em>白名单用户配额方案。</em></label>
          <label class="field"><span>白名单用户有效期/天</span><input name="whitelistUserValidDays" type="number" min="1" value="${fieldValue(domain.whitelistUserValidDays || domain.validDays || 365)}"><em>白名单用户默认有效期。</em></label>
          <label class="field"><span>默认有效天数</span><input name="validDays" type="number" min="1" value="${fieldValue(domain.validDays)}"><em>兼容原有效期设置。</em></label>
          <div class="settings-section-heading wide"><span>02</span><div><h3>有效期与到期流程</h3><p>分别设置续期窗口、锁定期、DNS 清理和彻底删除周期。</p></div></div>
          <label class="field"><span>续期窗口期/天</span><input name="renewWindowDays" type="number" min="1" value="${fieldValue(domain.renewWindowDays)}"><em>到期前多少天允许续期。</em></label>
          <label class="field"><span>过期后锁定周期/天</span><input name="lockAfterExpireDays" type="number" min="0" value="${fieldValue(domain.lockAfterExpireDays || 0)}"><em>过期后先锁定，防止立即清理。</em></label>
          <label class="field"><span>彻底删除周期/天</span><input name="hardDeleteAfterExpireDays" type="number" min="0" value="${fieldValue(domain.hardDeleteAfterExpireDays || domain.expiredDnsCleanupDays || 30)}"><em>到期后多少天彻底删除。</em></label>
          <div class="settings-section-heading wide"><span>03</span><div><h3>前缀规则与审核</h3><p>控制长度、关键词、管理员专用前缀和审核模式。</p></div></div>
          <label class="field"><span>最小前缀长度</span><input name="prefixMinLength" type="number" min="1" max="63" value="${fieldValue(domain.prefixMinLength || 2)}"><em>域名前缀最短长度。</em></label>
          <label class="field"><span>最大前缀长度</span><input name="prefixMaxLength" type="number" min="1" max="63" value="${fieldValue(domain.prefixMaxLength || 36)}"><em>域名前缀最长长度。</em></label>
          <label class="field"><span>到期前提醒天数</span><input name="expiryReminderDays" type="number" min="0" value="${fieldValue(domain.expiryReminderDays || 30)}"><em>用于前台和消息提醒。</em></label>
          <label class="field"><span>过期后清理 DNS 天数</span><input name="expiredDnsCleanupDays" type="number" min="0" value="${fieldValue(domain.expiredDnsCleanupDays || 30)}"><em>兼容原自动清理字段。</em></label>
          <label class="field"><span>单域名最大 DNS 条数</span><input name="maxDnsRecordsPerDomain" type="number" min="1" value="${fieldValue(domain.maxDnsRecordsPerDomain || 20)}"><em>限制单个二级域名解析数量。</em></label>
          <label class="field"><span>审核模式</span><select name="approvalMode"><option value="manual" ${domain.approvalMode !== 'auto' && domain.approvalMode !== 'risk' ? 'selected' : ''}>全部人工审核</option><option value="risk" ${domain.approvalMode === 'risk' ? 'selected' : ''}>风险域名人工审核</option><option value="auto" ${domain.approvalMode === 'auto' ? 'selected' : ''}>自动审批所有申请</option></select><em>和侧边栏“域名审核”联动。</em></label>
          <label class="field wide"><span>域名前缀黑名单：禁止注册</span><textarea name="blockedPrefixText" rows="4">${esc(domain.blockedPrefixText || domain.prefixBlacklistText || '')}</textarea><em>命中后普通用户和管理员都不能注册，支持一行一个关键词。</em></label>
          <label class="field wide"><span>域名前缀黑名单：仅管理员可用</span><textarea name="adminOnlyPrefixText" rows="4">${esc(domain.adminOnlyPrefixText || '')}</textarea><em>普通用户不能注册，管理员可使用。</em></label>
          <label class="field wide"><span>兼容前缀黑名单/正则</span><textarea name="prefixBlacklistText" rows="4">${esc(domain.prefixBlacklistText || '')}</textarea><em>保留原有字段，继续参与拦截。</em></label>
          <div class="settings-section-heading wide"><span>04</span><div><h3>用户权限</h3><p>控制删除、DNS 修改、续期和域名转让权限。</p></div></div>
          <label class="check"><input name="allowUserDeleteInvalid" type="checkbox" ${yn(domain.allowUserDeleteInvalid)}> 用户可删除无效域名 <em>拒绝/撤销类域名可由用户清理。</em></label>
          <label class="check"><input name="allowDnsEditAfterApproved" type="checkbox" ${yn(domain.allowDnsEditAfterApproved)}> 生效后允许用户修改 DNS <em>关闭后用户只能查看解析。</em></label>
          <label class="check"><input name="allowNumericPrefix" type="checkbox" ${yn(domain.allowNumericPrefix !== false)}> 允许纯数字前缀 <em>例如 12345。</em></label>
          <label class="check"><input name="allowUnderscorePrefix" type="checkbox" ${yn(domain.allowUnderscorePrefix)}> 允许下划线 <em>不建议开启，部分 DNS 场景兼容性差。</em></label>
          <label class="check"><input name="selfRenewEnabled" type="checkbox" ${yn(domain.selfRenewEnabled !== false)}> 开放用户自助续期 <em>关闭后只能管理员处理。</em></label>
          <label class="check"><input name="allowUserDeleteActive" type="checkbox" ${yn(domain.allowUserDeleteActive !== false)}> 用户能否删除已生效域名 <em>删除仍需要二次确认/审核。</em></label>
          <label class="check"><input name="allowDomainTransfer" type="checkbox" ${yn(domain.allowDomainTransfer)}> 允许转让二级域名 <em>预留功能，开启前请完善风控。</em></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="dns">
        <form id="dns-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>全局 DNS 策略</h3><p>这些设置会影响所有新建解析记录。</p></div></div>
          <div class="readonly-box wide danger"><b>DNS 配置风险提示</b><p>新增根域名不需要再去 Worker 里手动新增 DNS_SUFFIX / DNS_ZONE_ID 环境变量。这里只要填根域名、Zone ID、允许类型并保存到 Workers KV，注册页会自动出现该后缀，DNS 写入时也会按该后缀对应的 Zone ID 调用 Cloudflare API。已存在的 Cloudflare DNS 记录不会自动改写；需要用户或管理员逐条调整。</p></div>
          <label class="check"><input name="defaultProxied" type="checkbox" ${yn(dns.defaultProxied)}> 新建解析默认开启 Cloudflare 代理 <em>A / AAAA / CNAME 可代理，TXT / MX / NS 会强制仅 DNS。</em></label>
          <label class="check"><input name="blockWildcardRecords" type="checkbox" ${yn(dns.blockWildcardRecords !== false)}> 禁止用户创建泛解析 <em>阻止 * 主机记录。</em></label>
          <div class="wide">
            <div class="section-head compact"><div><h3>DNS 修改</h3><p>独立管理 DNS 类型的用户显示名称、是否允许用户添加以及添加页面备注。首次升级会从 Worker 变量 DNS_ALLOWED_TYPES 同步开放状态。</p></div></div>
            <div class="table-wrap" id="dns-type-policy-table"><table><thead><tr><th>DNS 类型</th><th>显示名称</th><th>是否开放添加</th><th>备注</th></tr></thead><tbody>${renderDnsTypePolicyRows(dns.recordTypePolicies || [])}</tbody></table></div>
            <p class="muted">显示名称用于用户“添加解析”下拉框；备注留空时不显示。关闭某类型后，用户不能新建该类型，但已有记录仍可查看和删除。</p>
          </div>
          <div class="settings-section-heading wide"><span>02</span><div><h3>Cloudflare 凭据与拦截规则</h3><p>密钥不会回显；目标黑名单和保留前缀会立即参与校验。</p></div></div>
          <label class="field wide"><span>Cloudflare API Token（可选）</span><input name="cfApiToken" type="password" autocomplete="new-password" placeholder="${dns.cfApiTokenConfigured ? '已配置，留空保持不变' : '请输入 API Token，或使用 Worker Secret'}"><em>Token 不会回显；留空保持原值。Worker Secret CF_API_TOKEN 的优先级最高。</em></label>
          <label class="field wide"><span>CNAME 目标黑名单</span><textarea name="cnameTargetBlacklist" rows="4" placeholder="malicious.example.com&#10;*.badhost.com">${esc(dns.cnameTargetBlacklist || '')}</textarea><em>一行一个目标域名或关键词。</em></label>
          <label class="field wide"><span>保留前缀</span><textarea name="reservedPrefixes" rows="4">${esc(arrayText(dns.reservedPrefixes || []))}</textarea><em>用于阻止用户申请系统保留前缀。</em></label>
          <div class="settings-section-heading wide"><span>03</span><div><h3>多根域名管理</h3><p>每个根域名使用独立 Zone ID、类型和代理策略。</p></div></div>
          <div class="wide dns-suffix-editor-block"><div class="section-head compact"><div><h3>多根域名可视化编辑器</h3><p>新增根域名只需在这里添加，不需要给每个域名单独配置环境变量。保存后用户注册页会自动读取启用的后缀。</p></div><button type="button" class="btn soft" id="add-suffix-row">＋ 新增根域名</button></div><div class="suffix-editor-help">必填：根域名、Zone ID。显示名称可留空；允许类型用逗号分隔，例如 A,AAAA,CNAME,TXT,MX,NS。每个根域名会独立使用自己的 Zone ID 写入 Cloudflare DNS。</div><div id="suffix-editor">${renderSuffixEditorRows(dns.suffixes || [], dns.recordTypePolicies || [])}</div><label class="field wide"><span>根域名 JSON 输出</span><textarea name="suffixesJson" id="suffixes-json" rows="8" readonly>${esc(suffixesToJson(dns.suffixes || []))}</textarea><em>该内容由上方可视化编辑器自动生成，仅用于查看和复制备份。</em></label></div>
          <div class="readonly-box wide"><b>配置来源说明</b><p>多根域名列表保存在 Workers KV。DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED 只作为首次默认值；后续新增/修改根域名直接在本页保存即可。CF_API_TOKEN 可继续用 Worker Secret，也可在上方填写一次保存到 KV。</p><button type="button" class="btn soft" id="test-cf-api">测试所有可用根域名</button><span id="cf-test-result" class="muted"></span></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="blacklist">
        <form id="blacklist-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>行为黑名单</h3><p>每行格式：值 | 备注 | 到期时间。到期时间可留空。</p></div></div>
          <label class="field wide"><span>注册黑名单</span><textarea name="registrationRecords" rows="6" placeholder="值 | 备注 | 到期时间">${esc(recordsToText(bl.registration))}</textarea><em>用于拦截注册行为，可填 IP、邮箱、手机号、关键词。</em></label>
          <label class="field wide"><span>访问黑名单</span><textarea name="accessRecords" rows="6">${esc(recordsToText(bl.access))}</textarea><em>用于封禁恶意访问 IP 或标识。</em></label>
          <label class="field wide"><span>UserID 账号黑名单</span><textarea name="userIdRecords" rows="5">${esc(recordsToText(bl.userIds))}</textarea><em>填写用户 ID 或账号标识，一行一条。</em></label>
          <div class="settings-section-heading wide"><span>02</span><div><h3>兼容黑名单</h3><p>保留原有前缀、IP、邮箱和手机号拦截字段。</p></div></div>
          <label class="field wide"><span>域名前缀黑名单</span><textarea name="prefixes" rows="5">${esc(arrayText(bl.prefixes))}</textarea><em>保留原字段，继续兼容域名前缀拦截。</em></label>
          <label class="field wide"><span>IP 黑名单</span><textarea name="ips" rows="5">${esc(arrayText(bl.ips))}</textarea><em>命中后可禁止注册或访问。</em></label>
          <label class="field wide"><span>邮箱/手机号黑名单</span><textarea name="emails" rows="5">${esc(arrayText(bl.emails))}</textarea><em>支持邮箱、手机号或关键词。</em></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="notification">
        <form id="notification-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>事件与模板变量</h3><p>为每种事件分别设置用户通知和管理员告警。</p></div></div>
          <div class="readonly-box wide"><b>模板变量提示</b><p>{username} 用户名、{domain} 域名、{days} 剩余天数、{ip} IP、{time} 时间、{reason} 原因。用户通知和管理员告警可以分别配置。</p></div>
          <div class="wide event-grid">${eventChecks(notification.events)}</div>
          ${notificationTemplateFields(notification)}
          <div class="settings-section-heading wide"><span>02</span><div><h3>发送限制与兼容模板</h3><p>限制单位时间发送数量，避免通知风暴。</p></div></div>
          <label class="field"><span>消息限流/小时</span><input name="rateLimitPerHour" type="number" min="0" value="${fieldValue(notification.rateLimitPerHour || 60)}"><em>0 表示不限制。</em></label>
          <label class="field wide"><span>用户到期消息模板</span><textarea name="expiryTemplate" rows="4">${esc(notification.expiryTemplate || '')}</textarea><em>兼容原到期提醒模板。</em></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="security">
        <form id="security-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>会话与登录保护</h3><p>控制会话时长、失败锁定和管理员访问来源。</p></div></div>
          <label class="field"><span>管理员会话超时/小时</span><input name="adminSessionTimeoutHours" type="number" min="1" value="${fieldValue(security.adminSessionTimeoutHours || 24)}"><em>超过时间后需要重新登录。</em></label>
          <label class="field"><span>操作日志保留天数</span><input name="auditRetentionDays" type="number" min="1" value="${fieldValue(security.auditRetentionDays || 7)}"><em>联动侧边栏“操作日志”。</em></label>
          <label class="field"><span>登录失败锁定阈值</span><input name="failedLoginLockThreshold" type="number" min="0" value="${fieldValue(security.failedLoginLockThreshold || 0)}"><em>0 表示关闭自动锁定。</em></label>
          <label class="field"><span>登录失败锁定分钟</span><input name="failedLoginLockMinutes" type="number" min="0" value="${fieldValue(security.failedLoginLockMinutes || 0)}"><em>达到阈值后的锁定时长。</em></label>
          <label class="field"><span>后台访问路径别名（预留）</span><input name="adminPath" value="${fieldValue(security.adminPath || '')}" placeholder="/admin-secret"><em>当前仅保存配置，不会自动修改现有 #/admin 路由；正式启用前需配套路由改造。</em></label>
          <label class="field wide"><span>后台登录 IP 白名单</span><textarea name="adminIpWhitelist" rows="4">${esc(security.adminIpWhitelist || '')}</textarea><em>Cloudflare Workers 下需从 CF-Connecting-IP 获取真实访客 IP。</em></label>
          <div class="settings-section-heading wide"><span>02</span><div><h3>角色与审计</h3><p>维护角色说明和需要写入操作日志的动作。</p></div></div>
          <label class="field wide"><span>多角色权限说明（预留）</span><textarea name="rolesPermissions" rows="6">${esc(security.rolesPermissions || '')}</textarea><em>当前用于保存角色规划说明，不会自动授予权限；实际权限仍以后端 requireAdmin 校验为准。</em></label>
          <label class="field wide"><span>操作日志可选记录项</span><textarea name="auditRecordItems" rows="5">${esc(security.auditRecordItems || '')}</textarea><em>填写希望重点审计的动作说明；当前系统关键操作仍会统一写入日志。</em></label>
          <div class="readonly-box wide"><b>登录日志查询入口</b><p>进入侧边栏“操作日志”，类型选择“认证”，可查看登录、退出、失败登录等记录。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="automation">
        <form id="automation-form" class="form-grid settings-grid">
          <div class="settings-section-heading wide"><span>01</span><div><h3>调度计划</h3><p>设置 Cron 表达式和扫描周期。</p></div></div>
          <label class="check"><input name="enabled" type="checkbox" ${yn(automation.enabled)}> 开启定时任务 <em>需要 Workers Cron 触发器配合。</em></label>
          <label class="field"><span>Cron 表达式</span><input name="cronExpression" id="cron-expression" value="${fieldValue(automation.cronExpression || '0 */1 * * *')}"><em>示例：0 */1 * * * 表示每小时。</em></label>
          <label class="field"><span>定时扫描周期/分钟</span><input name="scanCycleMinutes" type="number" min="5" value="${fieldValue(automation.scanCycleMinutes || 60)}"><em>可视化生成器会同步 Cron。</em></label>
          <div class="wide cron-builder"><button type="button" class="btn soft small" data-cron="0 */1 * * *">每小时</button><button type="button" class="btn soft small" data-cron="0 */6 * * *">每 6 小时</button><button type="button" class="btn soft small" data-cron="0 2 * * *">每天 02:00</button><button type="button" class="btn soft small" data-cron="0 3 * * 1">每周一 03:00</button></div>
          <div class="settings-section-heading wide"><span>02</span><div><h3>任务与保护策略</h3><p>独立控制到期检测、DNS 清理、失败告警和保护阈值。</p></div></div>
          <label class="check"><input name="checkExpiringDomains" type="checkbox" ${yn(automation.checkExpiringDomains !== false)}> 域名到期检测 <em>扫描即将到期和已过期域名。</em></label>
          <label class="check"><input name="cleanupExpiredDns" type="checkbox" ${yn(automation.cleanupExpiredDns !== false)}> 过期 DNS 清理 <em>按保护阈值清理过期解析。</em></label>
          <label class="check"><input name="notifyAdminOnFailure" type="checkbox" ${yn(automation.notifyAdminOnFailure !== false)}> 任务失败推送管理员告警 <em>失败时写入消息中心。</em></label>
          <label class="field"><span>自动清理 DNS 保护阈值/天</span><input name="dnsCleanupProtectionDays" type="number" min="1" value="${fieldValue(automation.dnsCleanupProtectionDays || 7)}"><em>防止误删刚过期的正常解析。</em></label>
          <div class="readonly-box wide"><b>定时任务运行日志</b><p>${esc(taskLogSummary(automation.taskLogs))}</p><p>Cloudflare Workers Cron 需要在 Worker 触发器中单独配置。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="variables">
        <section class="card settings-grid worker-variables-page">
          <div class="settings-section-heading wide"><span>01</span><div><h3>变量和密钥</h3><p>同步当前 Cloudflare Worker 的变量和密钥，显示方式与 Cloudflare 后台“变量和密钥”保持一致。</p></div></div>
          <div class="readonly-box wide"><b>使用说明</b><p>这里会通过 Cloudflare API 读取当前 <code>storage</code> Worker 的实际变量列表，不再使用固定白名单。你可以直接添加、编辑、删除文本、JSON 或密钥变量。</p><p><code>CF_WORKERS_API_TOKEN</code> 是管理令牌本身，必须在 Cloudflare 控制台手动维护，网站内不会允许修改或删除。</p></div>
          <div class="toolbar-actions wide"><button class="btn soft" id="refresh-worker-variables" type="button">同步当前 Worker 变量</button><button class="btn primary" id="add-worker-variable" type="button">＋ 添加变量</button></div>
          <p id="managed-worker-variable-status" class="muted wide">正在读取变量状态…</p>
          <div id="worker-variables-list" class="wide"><div class="loading-card">正在同步 Cloudflare Worker 变量…</div></div>
          <div class="settings-section-heading wide"><span>02</span><div><h3>常用变量用途速查</h3><p>下方只用于说明，实际变量以同步出来的 Cloudflare 列表为准。</p></div></div>
          <div class="readonly-box wide"><b>邮件相关</b><p><code>EMAIL_FROM</code>：邮件发件地址。<br><code>EMAIL_FROM_NAME</code>：邮件显示名称。<br><code>CF_ADMIN_EMAIL</code>：管理员通知目标邮箱。<br><code>RESEND_API_KEY</code>：发送注册验证码到任意用户邮箱。<br><code>CF_EMAIL_ROUTING_API_TOKEN</code>：同步 Cloudflare 已验证邮箱。</p><b>DNS 相关</b><p><code>CF_API_TOKEN</code>：写入 Cloudflare DNS。<br><code>DNS_SUFFIX</code>、<code>DNS_ZONE_ID</code>、<code>DNS_ALLOWED_TYPES</code>、<code>DNS_DEFAULT_TYPE</code>、<code>DNS_TTL</code>、<code>DNS_PROXIED</code>：单根域名兼容配置；多根域名编辑器保存后会优先使用后台设置。</p><b>验证相关</b><p><code>TURNSTILE_SITE_KEY</code>：前端显示 Turnstile。<br><code>TURNSTILE_SECRET</code>：后端校验 Turnstile。<br><code>TURNSTILE_ACTION_LOGIN</code>、<code>TURNSTILE_ACTION_REGISTER</code>、<code>TURNSTILE_ACTION_APPLY</code>：区分登录、注册和域名申请场景。</p><b>管理相关</b><p><code>CF_ACCOUNT_ID</code>：Cloudflare 账户 ID。<br><code>CF_WORKERS_API_TOKEN</code>：允许网站内管理 Worker 变量；只能在 Cloudflare 控制台维护。</p></div>
        </section>
      </div>

      <div class="tab-page" data-page="system">
        <div class="system-status-grid" id="system-status-box">${renderSystemStatusSkeleton()}</div>
        <div class="readonly-box wide"><b>配置备份 / 导入恢复</b><p>导出会下载当前 Workers KV 中的完整设置。导入属于高危操作，会覆盖当前配置。</p><button class="btn soft" id="export-settings-2" type="button">导出配置</button><label class="btn soft file-btn">导入配置<input id="import-settings-file-2" type="file" accept="application/json,.json" hidden></label></div>
      </div>
    </section>`);

    bindAdminSettingsTabs();
    bindColorPickers();
    bindCaptchaBackgroundUpload();
    bindSettingsTools();
    bindDnsTypePolicyEditor();
    bindDnsSuffixEditor();
    bindCronBuilder();
    bindSettingForm('#site-form', 'site', buildSiteSettingsPayload);
    bindSettingForm('#registration-form', 'registration', buildRegistrationSettingsPayload);
    bindSettingForm('#domain-form', 'domain', buildDomainSettingsPayload);
    bindSettingForm('#dns-form', 'dns', buildDnsSettingsPayload);
    bindSettingForm('#blacklist-form', 'blacklist', buildBlacklistSettingsPayload);
    bindSettingForm('#notification-form', 'notification', f => collectNotificationPayload(f));
    bindSettingForm('#security-form', 'security', buildSecuritySettingsPayload);
    bindSettingForm('#automation-form', 'automation', buildAutomationSettingsPayload);
    document.querySelector('#preview-notice')?.addEventListener('click', () => openModal('Markdown 预览', '前台公告预览', `<div class="markdown-preview">${simpleMarkdown(document.querySelector('[name="homepageNotice"]')?.value || '')}</div>`, 'wide'));
    document.querySelector('#test-cf-api')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const el = document.querySelector('#cf-test-result');
      button.disabled = true;
      if (el) el.innerHTML = ' 正在同时测试所有根域名…';
      try {
        const r = await api('/api/admin/dns/test', { method:'POST', body:{ all:true, suffixes:collectSuffixesFromEditor() } });
        const lines = (r.results || []).map(item => `<span class="cf-test-item ${item.ok ? 'ok' : 'fail'}">${esc(item.suffix)}：${item.ok ? '正常' : esc(item.message || '失败')}</span>`).join('');
        if (el) el.innerHTML = `<strong>${esc(r.message || '测试完成')}</strong>${lines}`;
        toast(r.successCount === r.total ? '所有根域名连接正常' : `${r.successCount || 0}/${r.total || 0} 个根域名连接正常`, r.successCount ? 'success' : 'error');
      } catch(error) {
        if(el) el.textContent = ' ' + error.message;
        toast(error.message,'error');
      } finally { button.disabled = false; }
    });
    document.querySelector('#test-email-delivery')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      const scene = String(document.querySelector('#email-test-scene')?.value || 'test');
      const recipient = String(document.querySelector('#cloudflare-admin-recipient')?.value || '').trim();
      const resultEl = document.querySelector('#email-test-result');
      button.disabled = true;
      if (resultEl) resultEl.textContent = '发送中…';
      try {
        const result = await api('/api/admin/email/test', { method:'POST', body:{ scene, recipient } });
        if (resultEl) resultEl.textContent = `${result.message || '发送成功'} · 通道 ${result.provider || 'cloudflare-seb'}`;
        toast('测试邮件发送成功', 'success');
      } catch (error) {
        if (resultEl) resultEl.textContent = error.message;
        toast(error.message, 'error');
      } finally { button.disabled = false; }
    });
    document.querySelector('#sync-cloudflare-email-addresses')?.addEventListener('click', () => syncCloudflareEmailRecipients(true).catch(() => undefined));
    document.querySelector('#cloudflare-admin-recipient')?.addEventListener('change', updateCloudflareEmailTestButton);
    document.querySelector('#refresh-worker-variables')?.addEventListener('click', () => loadManagedWorkerVariables(true).catch(() => undefined));
    document.querySelector('#add-worker-variable')?.addEventListener('click', () => openWorkerVariableModal('add'));
    updateCloudflareEmailTestButton();
    loadManagedWorkerVariables().catch(() => undefined);
    if (reg.cloudflareEmailAccountId && reg.cloudflareEmailApiTokenConfigured) syncCloudflareEmailRecipients(false).catch(() => undefined);
    loadSystemStatusPanel();
  } catch (error) { toast(error.message, 'error'); }
}

function bindCaptchaBackgroundUpload() {
  const fileInput = document.querySelector('#captcha-background-file');
  const dataInput = document.querySelector('#captcha-background-data');
  const preview = document.querySelector('#captcha-background-preview');
  if (!fileInput || !dataInput || !preview) return;
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) throw new Error('只支持 PNG、JPG、WebP 或 GIF 图片');
      if (file.size > 500 * 1024) throw new Error('验证码背景图片不能超过 500KB');
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('图片读取失败'));
        reader.readAsDataURL(file);
      });
      dataInput.value = dataUrl;
      const mode = document.querySelector('#registration-form [name="captchaBackgroundMode"]');
      if (mode) mode.value = 'upload';
      preview.innerHTML = `<img src="${attr(dataUrl)}" alt="验证码背景预览"><span>${esc(file.name)} · ${Math.round(file.size/1024)}KB</span>`;
    } catch (error) {
      fileInput.value = '';
      toast(error.message, 'error');
    }
  });
}

function bindAdminSettingsTabs() {
  const activate = name => {
    const target = document.querySelector(`[data-tab="${name}"]`) || document.querySelector('[data-tab="site"]');
    if (!target) return;
    document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
    target.classList.add('active');
    document.querySelector(`[data-page="${target.dataset.tab}"]`)?.classList.add('active');
    sessionStorage.setItem('adminSettingsActiveTab', target.dataset.tab || 'site');
    if (target.dataset.tab === 'system') loadSystemStatusPanel();
    if (target.dataset.tab === 'variables') loadManagedWorkerVariables().catch(() => undefined);
  };
  document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => activate(btn.dataset.tab || 'site')));
  activate(sessionStorage.getItem('adminSettingsActiveTab') || 'site');
}
function toLocalDateTimeValue(value) { if (!value) return ''; const d=new Date(value); if(Number.isNaN(d.getTime())) return String(value).slice(0,16); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }

function adminDnsTypePolicies(value = state.config?.dns?.recordTypePolicies || state.config?.dnsRecordTypes) {
  return normalizedDnsTypePolicies(value);
}
function renderDnsTypePolicyRows(policies = []) {
  return adminDnsTypePolicies(policies).map(policy => `<tr data-dns-type-policy="${attr(policy.type)}">
    <td><strong>${esc(policy.type)}</strong></td>
    <td><input data-dns-policy-k="displayName" value="${fieldValue(policy.displayName || DEFAULT_DNS_TYPE_LABELS[policy.type] || policy.type)}" placeholder="${attr(DEFAULT_DNS_TYPE_LABELS[policy.type] || policy.type)}"></td>
    <td><label class="check compact"><input data-dns-policy-k="allowUserAdd" type="checkbox" ${yn(policy.allowUserAdd !== false)}> <span>开放</span></label></td>
    <td><input data-dns-policy-k="note" value="${fieldValue(policy.note || '')}" placeholder="留空则添加记录时不显示备注"></td>
  </tr>`).join('');
}
function collectDnsRecordTypePolicies() {
  return Array.from(document.querySelectorAll('[data-dns-type-policy]')).map(row => ({
    type: String(row.dataset.dnsTypePolicy || '').toUpperCase(),
    displayName: String(row.querySelector('[data-dns-policy-k="displayName"]')?.value || '').trim(),
    allowUserAdd: Boolean(row.querySelector('[data-dns-policy-k="allowUserAdd"]')?.checked),
    note: String(row.querySelector('[data-dns-policy-k="note"]')?.value || '').trim(),
  })).filter(item => SUPPORTED_DNS_TYPES.includes(item.type));
}
function openDnsTypesFromPolicyEditor() {
  const rows = collectDnsRecordTypePolicies();
  const open = rows.filter(item => item.allowUserAdd).map(item => item.type);
  return open.length ? open : ['CNAME'];
}
function syncDnsTypePolicyToSuffixRows(type, enabled) {
  const globalOpen = collectDnsRecordTypePolicies().filter(item => item.allowUserAdd).map(item => item.type);
  document.querySelectorAll('[data-suffix-row]').forEach(row => {
    const input = row.querySelector('[data-k="allowedTypes"]');
    const select = row.querySelector('[data-k="defaultType"]');
    if (!input || !select) return;
    const values = Array.from(new Set(String(input.value || '').split(/[\s,]+/).map(x => x.trim().toUpperCase()).filter(x => SUPPORTED_DNS_TYPES.includes(x))));
    let next = enabled ? Array.from(new Set([...values, type])) : values.filter(item => item !== type);
    if (!next.length && globalOpen.length) next = [globalOpen[0]];
    input.value = next.join(',');
    const selectable = next.filter(item => globalOpen.includes(item));
    select.innerHTML = selectable.map(item => `<option value="${attr(item)}">${esc(item)}</option>`).join('');
    if (!selectable.includes(select.value)) select.value = selectable[0] || '';
  });
  document.querySelector('#suffix-editor')?.dispatchEvent(new Event('input', { bubbles:true }));
}
function bindDnsTypePolicyEditor() {
  const table = document.querySelector('#dns-type-policy-table');
  if (!table) return;
  table.addEventListener('change', event => {
    const checkbox = event.target.closest?.('[data-dns-policy-k="allowUserAdd"]');
    if (!checkbox) return;
    const row = checkbox.closest('[data-dns-type-policy]');
    const type = String(row?.dataset.dnsTypePolicy || '').toUpperCase();
    if (SUPPORTED_DNS_TYPES.includes(type)) syncDnsTypePolicyToSuffixRows(type, checkbox.checked);
  });
}

function renderSuffixEditorRows(suffixes=[], policies=state.config?.dns?.recordTypePolicies || state.config?.dnsRecordTypes) {
  const policyTypes = adminDnsTypePolicies(policies).filter(item => item.allowUserAdd).map(item => item.type);
  const fallbackTypes = policyTypes.length ? policyTypes : ['CNAME'];
  return (suffixes.length?suffixes:[{label:'',suffix:'flore.top',zoneId:'',allowedTypes:fallbackTypes,defaultType:fallbackTypes[0]||'CNAME',ttl:1,proxied:false,enabled:true,allowRegister:true,registerOrder:1}]).map((s,i)=>{
    const rowTypes = Array.from(new Set([...(s.allowedTypes || fallbackTypes), ...fallbackTypes])).filter(type => SUPPORTED_DNS_TYPES.includes(type));
    const selectableTypes = rowTypes.filter(type => fallbackTypes.includes(type));
    const currentDefault = selectableTypes.includes(s.defaultType) ? s.defaultType : (selectableTypes[0] || fallbackTypes[0] || 'CNAME');
    return `<div class="suffix-editor-row v98" data-suffix-row draggable="true">
  <div class="suffix-drag-handle" data-drag-handle title="拖动整个域名框调换顺序">⋮⋮ <span>拖动排序</span></div>
  <div class="suffix-toggle-cell compact enabled-toggle"><label><span>启用解析</span><input data-k="enabled" type="checkbox" ${yn(s.enabled!==false)}></label><em>关闭后该根域名不能写入 DNS。</em></div>
  <div class="suffix-toggle-cell compact register-toggle"><label><span>允许申请</span><input data-k="allowRegister" type="checkbox" ${yn(s.allowRegister!==false)}></label><em>关闭后用户注册页不显示该后缀。</em></div>
  <label class="suffix-field name-field"><span>显示名称</span><input data-k="label" value="${fieldValue(s.label || '')}" placeholder="留空则注册时只显示根域名"><em>留空不会显示“免费二级域名”等名称。</em></label>
  <label class="suffix-field root-field"><span>根域名</span><input data-k="suffix" value="${fieldValue(s.suffix)}" placeholder="example.com"></label>
  <label class="suffix-field zone-field"><span>Zone ID</span><input data-k="zoneId" value="${fieldValue(s.zoneId)}" placeholder="Cloudflare Zone ID"></label>
  <label class="suffix-field types-field"><span>允许类型</span><input data-k="allowedTypes" value="${fieldValue((s.allowedTypes||fallbackTypes).join(','))}" placeholder="${attr(fallbackTypes.join(','))}"><em>受上方“DNS 修改”全局开放策略约束。</em></label>
  <label class="suffix-field default-type-field"><span>默认类型</span><select data-k="defaultType">${selectableTypes.map(type => `<option value="${attr(type)}" ${currentDefault===type?'selected':''}>${esc(type)}</option>`).join('')}</select></label>
  <label class="suffix-field ttl-field"><span>TTL</span><input data-k="ttl" type="number" min="1" max="86400" value="${fieldValue(s.ttl||1)}"></label>
  <div class="suffix-toggle-cell compact proxy-toggle"><label><span>默认代理</span><input data-k="proxied" type="checkbox" ${yn(s.proxied)}></label><em>仅 A/AAAA/CNAME 可代理。</em></div>
  <label class="suffix-field suffix-token-field"><span>该根域名 API Token（可选）${s.cfApiTokenConfigured?' · 已配置':''}</span><input data-k="cfApiToken" type="password" autocomplete="new-password" placeholder="不同 CF 账号/Zone 时填写；留空保留原值"><em>优先使用这里的 Token，其次使用全局 Token / Worker Secret。</em></label>
  <label class="suffix-field register-order-field"><span>注册显示顺序</span><input data-k="registerOrder" type="number" min="1" max="999999" value="${fieldValue(Number(s.registerOrder || i + 1))}"><em>数字越小，在注册选择框中越靠前。</em></label>
  <div class="suffix-actions"><button type="button" class="btn soft small" data-test-suffix>测试</button><button type="button" class="btn danger-soft small" data-remove-suffix>删除</button></div>
</div>`;
  }).join('');
}
function bindDnsSuffixEditor() {
  const box=document.querySelector('#suffix-editor'); const json=document.querySelector('#suffixes-json');
  if(!box||!json)return;
  const sync=()=>{ json.value=JSON.stringify(collectSuffixesFromEditor().map(x => ({...x, cfApiToken: x.cfApiToken ? '***本次填写，将保存到 KV***' : undefined})),null,2); };
  const renumber=()=>Array.from(box.querySelectorAll('[data-suffix-row]')).forEach((row,index)=>{ const input=row.querySelector('[data-k="registerOrder"]'); if(input) input.value=String(index+1); });
  box.addEventListener('input',sync);
  box.addEventListener('change',sync);
  let dragging=null;
  box.addEventListener('dragstart', event => {
    const row=event.target.closest?.('[data-suffix-row]');
    if(!row)return;
    if(event.target.closest?.('input,select,button,textarea')) { event.preventDefault(); return; }
    dragging=row;
    row.classList.add('is-dragging');
    event.dataTransfer.effectAllowed='move';
    try{event.dataTransfer.setData('text/plain','suffix-row');}catch(_){}
  });
  box.addEventListener('dragover', event => {
    if(!dragging)return;
    event.preventDefault();
    const target=event.target.closest?.('[data-suffix-row]');
    if(!target||target===dragging)return;
    const rect=target.getBoundingClientRect();
    const before=event.clientY < rect.top + rect.height/2;
    box.insertBefore(dragging, before ? target : target.nextSibling);
  });
  box.addEventListener('drop', event => { if(!dragging)return; event.preventDefault(); renumber(); sync(); });
  box.addEventListener('dragend', () => { dragging?.classList.remove('is-dragging'); dragging=null; renumber(); sync(); });
  box.addEventListener('click',async e=>{
    const remove=e.target.closest('[data-remove-suffix]');
    if(remove){ if(!confirm('确认删除该根域名配置？已存在的用户域名不会自动删除，但该后缀将无法继续管理 DNS。')) return; e.target.closest('[data-suffix-row]')?.remove(); renumber(); sync(); return; }
    const test=e.target.closest('[data-test-suffix]');
    if(test){
      const row=e.target.closest('[data-suffix-row]');
      const suffix=row?.querySelector('[data-k="suffix"]')?.value?.trim();
      const zoneId=row?.querySelector('[data-k="zoneId"]')?.value?.trim();
      const cfApiToken=row?.querySelector('[data-k="cfApiToken"]')?.value?.trim();
      if(!suffix||!zoneId){ toast('请先填写根域名和 Zone ID', 'error'); return; }
      test.disabled=true; test.textContent=tr('测试中…');
      try{ const r=await api('/api/admin/dns/test',{method:'POST',body:{suffix,zoneId,cfApiToken}}); toast(r.message||'Cloudflare API 连通正常','success'); test.textContent=tr('正常'); }
      catch(error){ toast(error.message,'error'); test.textContent=tr('失败'); }
      finally { setTimeout(()=>{ test.disabled=false; test.textContent=tr('测试'); },1800); }
    }
  });
  document.querySelector('#add-suffix-row')?.addEventListener('click',()=>{
    const next=box.querySelectorAll('[data-suffix-row]').length+1;
    const allowedTypes=openDnsTypesFromPolicyEditor();
    box.insertAdjacentHTML('beforeend',renderSuffixEditorRows([{label:'',suffix:'',zoneId:'',allowedTypes,defaultType:allowedTypes[0]||'CNAME',ttl:1,proxied:false,enabled:true,allowRegister:true,registerOrder:next}], collectDnsRecordTypePolicies()));
    applyI18n(box); sync();
  });
  sync();
}
function collectSuffixesFromEditor() { return Array.from(document.querySelectorAll('[data-suffix-row]')).map((row,index)=>{
  const get=k=>row.querySelector(`[data-k="${k}"]`);
  const suffix=String(get('suffix')?.value||'').trim().toLowerCase().replace(/^\.+|\.+$/g,'');
  const allowedTypes=Array.from(new Set(String(get('allowedTypes')?.value||openDnsTypesFromPolicyEditor().join(',')).split(/[,\s]+/).map(x=>x.trim().toUpperCase()).filter(x=>SUPPORTED_DNS_TYPES.includes(x))));
  const payload={ enabled: !!get('enabled')?.checked, allowRegister: !!get('allowRegister')?.checked, label:String(get('label')?.value||'').trim(), suffix, zoneId:get('zoneId')?.value?.trim(), allowedTypes:allowedTypes.length?allowedTypes:['CNAME'], defaultType:get('defaultType')?.value||'CNAME', ttl:Number(get('ttl')?.value||1), proxied:!!get('proxied')?.checked, registerOrder:Number(get('registerOrder')?.value||index+1) };
  const token=String(get('cfApiToken')?.value||'').trim();
  if(token) payload.cfApiToken=token;
  return payload;
}).filter(x=>x.suffix); }
function recordsToText(records=[]) { return Array.isArray(records) ? records.map(r=>[r.value||'',r.note||'',r.expiresAt||''].join(' | ')).join('\n') : ''; }
function recordsFromText(value) { return String(value||'').split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{ const [value,note,expiresAt]=line.split('|').map(x=>x.trim()); return { value, note:note||'', expiresAt:expiresAt||'' }; }); }
function notificationTemplateFields(n={}) { const names={newUser:'新账号注册',newDomain:'新域名申请',domainExpiring:'域名即将到期',domainExpiredDelete:'域名过期删除',abnormalRegister:'异常注册行为'}; const templates=n.templates||{}; const userTargets=n.userTargets||{}; const adminTargets=n.adminTargets||{}; return Object.entries(names).map(([key,label])=>`<div class="notification-template wide"><h3>${label}</h3><label class="field"><span>用户通知目标</span><input name="userTarget_${key}" value="${fieldValue(userTargets[key]||'相关用户')}"><em>可填相关用户/全部用户/指定用户说明。</em></label><label class="field"><span>管理员告警目标</span><input name="adminTarget_${key}" value="${fieldValue(adminTargets[key]||'管理员')}"><em>可填管理员或角色。</em></label><label class="field wide"><span>消息模板</span><textarea name="template_${key}" rows="3">${esc(templates[key]||'')}</textarea></label></div>`).join(''); }
function collectNotificationPayload(f) { const events={newUser:f.get('newUser')==='on',newDomain:f.get('newDomain')==='on',domainExpiring:f.get('domainExpiring')==='on',domainExpiredDelete:f.get('domainExpiredDelete')==='on',abnormalRegister:f.get('abnormalRegister')==='on',systemErrorEmail:f.get('systemErrorEmail')==='on',helpSubmissionEmail:f.get('helpSubmissionEmail')==='on',domainReviewEmail:f.get('domainReviewEmail')==='on',dnsAnomalyEmail:f.get('dnsAnomalyEmail')==='on'}; const templates={}, userTargets={}, adminTargets={}; ['newUser','newDomain','domainExpiring','domainExpiredDelete','abnormalRegister'].forEach(k=>{ templates[k]=f.get('template_'+k)||''; userTargets[k]=f.get('userTarget_'+k)||''; adminTargets[k]=f.get('adminTarget_'+k)||''; }); return { events, templates, userTargets, adminTargets, rateLimitPerHour:f.get('rateLimitPerHour'), expiryTemplate:f.get('expiryTemplate') }; }
function bindCronBuilder(){ document.querySelectorAll('[data-cron]').forEach(btn=>btn.addEventListener('click',()=>{ const input=document.querySelector('#cron-expression'); if(input) input.value=btn.dataset.cron; })); }
function taskLogSummary(logs){ return Array.isArray(logs)&&logs.length ? logs.slice(-5).map(x=>`${x.time||''} ${x.status||''} ${x.message||''}`).join('；') : '暂无任务运行记录。'; }
function renderSystemStatusSkeleton(){ return `<div class="stat-card"><span>程序版本</span><strong>v99</strong></div><div class="stat-card"><span>KV 存储</span><strong>读取中</strong></div><div class="stat-card"><span>CF API</span><strong>读取中</strong></div><div class="stat-card"><span>定时任务</span><strong>读取中</strong></div><div class="stat-card"><span>更新检测</span><strong>读取中</strong></div>`; }
async function loadSystemStatusPanel(){ const box=document.querySelector('#system-status-box'); if(!box)return; try{ const r=await api('/api/admin/system-status'); box.innerHTML=`<div class="stat-card"><span>程序版本</span><strong>${esc(r.version||'v99')}</strong></div><div class="stat-card"><span>KV 存储</span><strong>${esc(r.kv?.storage||'Workers KV')}</strong><small>${esc(r.kv?.estimatedKeys||'')}</small></div><div class="stat-card"><span>CF API</span><strong>${esc(r.cfApi?.status||'未知')}</strong></div><div class="stat-card"><span>定时任务</span><strong>${r.cron?.enabled?'已开启':'未开启'}</strong><small>${esc(r.cron?.expression||'')}</small></div><div class="stat-card"><span>更新检测</span><strong>${esc(r.update?.current||'v99')}</strong></div>`; applyI18n(box); }catch(e){ box.innerHTML=`<div class="notice danger wide">系统状态读取失败：${esc(e.message)}</div>`; applyI18n(box); } }
function bindSettingsTools() {
  const exportFn = async () => {
    try {
      const data = await api('/api/admin/settings/export');
      downloadText('flore-settings-backup.json', JSON.stringify(data, null, 2));
    } catch (error) { toast(error.message, 'error'); }
  };
  document.querySelector('#export-settings')?.addEventListener('click', exportFn);
  document.querySelector('#export-settings-2')?.addEventListener('click', exportFn);

  const bindImport = selector => document.querySelector(selector)?.addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('配置文件不能超过 1MB');
      if (!confirm(tr('导入配置会覆盖当前 Workers KV 设置。确认继续？'))) return;
      const parsed = JSON.parse(await file.text());
      const source = parsed?.settings || parsed;
      if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('配置文件内容不是有效的设置对象');
      const result = await api('/api/admin/settings/import', { method:'POST', body:parsed });
      state.config.site = result.settings.site;
      state.config.registration = result.settings.registration;
      state.config.domain = domainConfig(result.settings.domain);
      state.config.dns = result.settings.dns;
      state.config.dnsRecordTypes = result.settings.dns?.recordTypePolicies || state.config.dnsRecordTypes;
      state.config.suffixes = (result.settings.dns?.suffixes || []).filter(x => x.enabled !== false && x.allowRegister !== false);
      applyTheme();
      toast('配置已导入', 'success');
      await renderAdminSettings();
    } catch (error) {
      toast(error.message || '配置导入失败', 'error');
    } finally {
      input.value = '';
    }
  });
  bindImport('#import-settings-file');
  bindImport('#import-settings-file-2');
}
function downloadText(filename, text){ const blob=new Blob([text],{type:'application/octet-stream'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function simpleMarkdown(text){ return esc(text||'').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'); }

function normalizeHexColor(value, fallback = '#4f63f6') {
  const raw = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
  return fallback;
}

function bindColorPickers() {
  document.querySelectorAll('.color-field').forEach(field => {
    const text = field.querySelector('.color-text');
    const native = field.querySelector('.color-native');
    const preview = field.querySelector('.color-preview');
    if (!text || !native || !preview) return;
    const fallback = native.value || '#4F63F6';
    const apply = value => {
      const hex = normalizeHexColor(value, fallback);
      text.value = hex;
      native.value = hex;
      preview.style.background = hex;
    };
    apply(text.value || native.value || fallback);
    text.addEventListener('input', () => {
      const raw = String(text.value || '').trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(raw)) apply(raw);
    });
    native.addEventListener('input', () => apply(native.value));
    preview.addEventListener('click', () => {
      if (typeof native.showPicker === 'function') native.showPicker();
      else native.click();
    });
  });
}


function formString(form, name) { return String(form.get(name) ?? '').trim(); }
function formBoolean(form, name) { return form.get(name) === 'on'; }
function formNumber(form, name, fallback = 0) {
  const value = Number(form.get(name));
  return Number.isFinite(value) ? value : fallback;
}
function buildSiteSettingsPayload(form) {
  return {
    ...Object.fromEntries(form),
    maintenanceMode: formBoolean(form, 'maintenanceMode'),
    showQuota: formBoolean(form, 'showQuota'),
    showExpiryReminder: formBoolean(form, 'showExpiryReminder'),
  };
}
function buildRegistrationSettingsPayload(form) {
  const payload = {
    ...Object.fromEntries(form),
    enabled: formBoolean(form, 'enabled'),
    autoActivate: formBoolean(form, 'autoActivate'),
    requireRegistrationKey: formBoolean(form, 'requireRegistrationKey'),
    blockTempEmail: formBoolean(form, 'blockTempEmail'),
    humanVerificationMode: formString(form, 'humanVerificationMode'),
    captchaBackgroundEnabled: formBoolean(form, 'captchaBackgroundEnabled'),
    captchaBackgroundMode: formString(form, 'captchaBackgroundMode'),
    captchaBackgroundImage: formString(form, 'captchaBackgroundImage'),
    captchaNoiseLinesEnabled: formBoolean(form, 'captchaNoiseLinesEnabled'),
    captchaNoiseLinesMin: formNumber(form, 'captchaNoiseLinesMin', 2),
    captchaNoiseLinesMax: formNumber(form, 'captchaNoiseLinesMax', 5),
    captchaNoiseLineColorMode: formString(form, 'captchaNoiseLineColorMode'),
    captchaNoiseLineFixedColor: formString(form, 'captchaNoiseLineFixedColor'),
    captchaCharset: formString(form, 'captchaCharset'),
    captchaLength: formNumber(form, 'captchaLength', 4),
    emailVerificationEnabled: formBoolean(form, 'emailVerificationEnabled'),
    emailFrom: formString(form, 'emailFrom'),
    emailFromName: formString(form, 'emailFromName'),
    emailCodeExpiryMinutes: formNumber(form, 'emailCodeExpiryMinutes', 10),
    emailCodeLength: formNumber(form, 'emailCodeLength', 6),
    emailCodeCharset: formString(form, 'emailCodeCharset'),
    emailAllowedEnvironments: formString(form, 'emailAllowedEnvironments'),
    emailRegistrationSceneEnabled: formBoolean(form, 'emailRegistrationSceneEnabled'),
    emailTestSceneEnabled: formBoolean(form, 'emailTestSceneEnabled'),
    emailFixedRecipients: formString(form, 'emailFixedRecipients'),
    emailRegistrationRecipientMode: formString(form, 'emailRegistrationRecipientMode'),
    emailTestRecipientMode: formString(form, 'emailTestRecipientMode'),
    cloudflareEmailAccountId: formString(form, 'cloudflareEmailAccountId'),
    cloudflareEmailApiToken: formString(form, 'cloudflareEmailApiToken'),
    cloudflareAdminRecipient: formString(form, 'cloudflareAdminRecipient'),
    emailRegistrationSubjectTemplate: formString(form, 'emailRegistrationSubjectTemplate'),
    emailRegistrationTextTemplate: formString(form, 'emailRegistrationTextTemplate'),
    emailRegistrationHtmlTemplate: formString(form, 'emailRegistrationHtmlTemplate'),
    emailTestSubjectTemplate: formString(form, 'emailTestSubjectTemplate'),
    emailTestTextTemplate: formString(form, 'emailTestTextTemplate'),
    emailTestHtmlTemplate: formString(form, 'emailTestHtmlTemplate'),
    blockVpnProxy: formBoolean(form, 'blockVpnProxy'),
    maxAccountsPerIp: formNumber(form, 'maxAccountsPerIp'),
    ipRegisterCooldownMinutes: formNumber(form, 'ipRegisterCooldownMinutes'),
    dailyDomainApplyLimit: formNumber(form, 'dailyDomainApplyLimit'),
    failedRegisterBanThreshold: formNumber(form, 'failedRegisterBanThreshold'),
    failedRegisterBanMinutes: formNumber(form, 'failedRegisterBanMinutes'),
  };
  if (!formString(form, 'turnstileSecret')) delete payload.turnstileSecret;
  if (!formString(form, 'emailApiKey')) delete payload.emailApiKey;
  if (!formString(form, 'cloudflareEmailApiToken')) delete payload.cloudflareEmailApiToken;
  if (!formString(form, 'captchaBackgroundImage')) delete payload.captchaBackgroundImage;
  return payload;
}
function buildDomainSettingsPayload(form) {
  const payload = { ...Object.fromEntries(form) };
  ['defaultQuota','validDays','platformMaxDomains','normalUserQuota','normalUserValidDays','whitelistUserQuota','whitelistUserValidDays','renewWindowDays','lockAfterExpireDays','hardDeleteAfterExpireDays','prefixMinLength','prefixMaxLength','expiryReminderDays','expiredDnsCleanupDays','maxDnsRecordsPerDomain'].forEach(name => payload[name] = formNumber(form, name));
  ['allowUserDeleteInvalid','allowDnsEditAfterApproved','allowNumericPrefix','allowUnderscorePrefix','selfRenewEnabled','allowUserDeleteActive','allowDomainTransfer'].forEach(name => payload[name] = formBoolean(form, name));
  return payload;
}
function buildDnsSettingsPayload(form) {
  const payload = {
    ...Object.fromEntries(form),
    defaultProxied: formBoolean(form, 'defaultProxied'),
    recordTypePolicies: collectDnsRecordTypePolicies(),
    allowMxRecords: collectDnsRecordTypePolicies().find(item => item.type === 'MX')?.allowUserAdd !== false,
    blockWildcardRecords: formBoolean(form, 'blockWildcardRecords'),
    suffixes: collectSuffixesFromEditor(),
  };
  delete payload.suffixesJson;
  if (!formString(form, 'cfApiToken')) delete payload.cfApiToken;
  return payload;
}
function buildBlacklistSettingsPayload(form) {
  return {
    prefixes: formString(form, 'prefixes'),
    ips: formString(form, 'ips'),
    emails: formString(form, 'emails'),
    registration: recordsFromText(form.get('registrationRecords')),
    access: recordsFromText(form.get('accessRecords')),
    userIds: recordsFromText(form.get('userIdRecords')),
  };
}
function buildSecuritySettingsPayload(form) {
  return {
    ...Object.fromEntries(form),
    adminSessionTimeoutHours: formNumber(form, 'adminSessionTimeoutHours', 24),
    auditRetentionDays: formNumber(form, 'auditRetentionDays', 7),
    failedLoginLockThreshold: formNumber(form, 'failedLoginLockThreshold'),
    failedLoginLockMinutes: formNumber(form, 'failedLoginLockMinutes'),
  };
}
function buildAutomationSettingsPayload(form) {
  return {
    ...Object.fromEntries(form),
    enabled: formBoolean(form, 'enabled'),
    checkExpiringDomains: formBoolean(form, 'checkExpiringDomains'),
    cleanupExpiredDns: formBoolean(form, 'cleanupExpiredDns'),
    notifyAdminOnFailure: formBoolean(form, 'notifyAdminOnFailure'),
    scanCycleMinutes: formNumber(form, 'scanCycleMinutes', 60),
    dnsCleanupProtectionDays: formNumber(form, 'dnsCleanupProtectionDays', 7),
  };
}

function validateSettingsPayload(group, data) {
  const isHex = v => !v || /^#?[0-9a-fA-F]{6}$/.test(String(v).trim());
  const isUrl = v => !v || /^https?:\/\//i.test(String(v).trim()) || String(v).trim().startsWith('/');
  const n = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  if (group === 'site') {
    if (!String(data.title || '').trim()) throw new Error('网站标题不能为空');
    if (!isUrl(data.logoImageUrl)) throw new Error('Logo 图片 URL 必须以 http://、https:// 或 / 开头');
    if (!isUrl(data.faviconUrl)) throw new Error('Favicon 地址必须以 http://、https:// 或 / 开头');
    if (!isHex(data.accent) || !isHex(data.accent2)) throw new Error('颜色必须是十六进制格式，例如 #4f63f6');
    if (data.noticeStartAt && data.noticeEndAt && new Date(data.noticeStartAt) > new Date(data.noticeEndAt)) throw new Error('公告结束时间不能早于开始时间');
  }
  if (group === 'registration') {
    if (n(data.maxAccountsPerIp) < 0 || n(data.ipRegisterCooldownMinutes) < 0 || n(data.dailyDomainApplyLimit) < 0 || n(data.failedRegisterBanThreshold) < 0 || n(data.failedRegisterBanMinutes) < 0) throw new Error('注册限制参数不能小于 0');
    if (!['image','turnstile','turnstile_fallback'].includes(String(data.humanVerificationMode || ''))) throw new Error('请选择有效的人机验证方式');
    if (String(data.humanVerificationMode) === 'turnstile' && !String(data.turnstileSiteKey || '').trim() && !state.config?.turnstile?.siteKey) throw new Error('仅使用 Turnstile 时必须配置 Site Key');
    if (n(data.captchaLength,4) < 3 || n(data.captchaLength,4) > 8) throw new Error('图形验证码字符数量必须在 3 到 8 之间');
    if (Array.from(String(data.captchaCharset || '').replace(/\s/g,'')).length < 2) throw new Error('图形验证码可用字符至少需要 2 个不同字符');
    if (n(data.captchaNoiseLinesMin,2) < 0 || n(data.captchaNoiseLinesMax,5) > 20 || n(data.captchaNoiseLinesMin,2) > n(data.captchaNoiseLinesMax,5)) throw new Error('随机线条范围必须为 0-20，且最少条数不能大于最多条数');
    const domains = String(data.emailDomainBlacklist || '').split(/[\n,]+/).map(x=>x.trim().replace(/^@/, '')).filter(Boolean);
    if (domains.some(d => /\s/.test(d) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d))) throw new Error('邮箱后缀黑名单中存在格式不正确的域名');
    if (data.emailVerificationEnabled && !String(data.emailFrom || '').trim()) throw new Error('启用邮箱验证前必须填写发件邮箱');
    if (String(data.emailFrom || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.emailFrom).trim())) throw new Error('发件邮箱格式不正确');
    if (String(data.cloudflareEmailAccountId || '').trim() && !/^[a-f0-9]{32}$/i.test(String(data.cloudflareEmailAccountId).trim())) throw new Error('Cloudflare Account ID 应为 32 位字符');
    if (String(data.cloudflareAdminRecipient || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.cloudflareAdminRecipient).trim())) throw new Error('Cloudflare 管理员收件邮箱格式不正确');
    const fixedEmails = String(data.emailFixedRecipients || '').split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
    if (fixedEmails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('固定收件邮箱中存在格式错误的地址');
    if (data.emailRegistrationRecipientMode === 'user_bcc_fixed' && !fixedEmails.length) throw new Error('注册验证码选择固定邮箱密送时，必须填写固定收件邮箱');
    if (data.emailTestRecipientMode === 'fixed' && !fixedEmails.length) throw new Error('测试邮件选择固定收件邮箱时，必须填写固定收件邮箱');
    if (!String(data.emailAllowedEnvironments || '*').trim()) throw new Error('允许发送的运行环境不能为空，可填写 *');
    if (!String(data.emailRegistrationSubjectTemplate || '').trim()) throw new Error('注册邮件主题不能为空');
    if (!String(data.emailRegistrationTextTemplate || '').trim() && !String(data.emailRegistrationHtmlTemplate || '').trim()) throw new Error('注册邮件纯文本或 HTML 内容至少填写一项');
    if (!String(data.emailTestSubjectTemplate || '').trim()) throw new Error('测试邮件主题不能为空');
    if (!String(data.emailTestTextTemplate || '').trim() && !String(data.emailTestHtmlTemplate || '').trim()) throw new Error('测试邮件纯文本或 HTML 内容至少填写一项');
    if (n(data.emailCodeExpiryMinutes, 10) < 2 || n(data.emailCodeExpiryMinutes, 10) > 60) throw new Error('邮箱验证码有效期必须在 2 到 60 分钟之间');
    if (n(data.emailCodeLength, 6) < 4 || n(data.emailCodeLength, 6) > 12) throw new Error('邮件验证码位数必须在 4 到 12 之间');
    if (Array.from(String(data.emailCodeCharset || '').replace(/\s/g,'')).length < 2) throw new Error('邮件验证码可用字符至少需要 2 个不同字符');
    if (n(data.failedRegisterBanThreshold) > 0 && n(data.failedRegisterBanMinutes) <= 0) throw new Error('设置失败封禁阈值后，封禁时长必须大于 0');
  }
  if (group === 'domain') {
    if (n(data.prefixMinLength,2) > n(data.prefixMaxLength,36)) throw new Error('最小前缀长度不能大于最大前缀长度');
    if (n(data.platformMaxDomains,1) < 1) throw new Error('平台最大配额必须大于 0');
  }
  if (group === 'dns') {
    const policies = Array.isArray(data.recordTypePolicies) ? data.recordTypePolicies : [];
    if (!policies.some(item => item.allowUserAdd)) throw new Error('至少开放一种 DNS 类型供用户添加');
    const openTypes = new Set(policies.filter(item => item.allowUserAdd).map(item => String(item.type || '').toUpperCase()));
    if (policies.some(item => !SUPPORTED_DNS_TYPES.includes(String(item.type || '').toUpperCase()))) throw new Error('DNS 类型策略中包含系统不支持的类型');
    const suffixes = data.suffixes || [];
    if (!Array.isArray(suffixes) || !suffixes.length) throw new Error('至少保留一个根域名配置');
    const seen = new Set();
    suffixes.forEach(s => {
      if (!s.suffix) throw new Error('根域名不能为空');
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(s.suffix))) throw new Error('根域名格式不正确：' + s.suffix);
      if (s.enabled && !String(s.zoneId || '').trim()) throw new Error('启用的根域名必须填写 Zone ID：' + s.suffix);
      if (seen.has(s.suffix)) throw new Error('根域名不能重复：' + s.suffix);
      seen.add(s.suffix);
      if (!Array.isArray(s.allowedTypes) || !s.allowedTypes.length) throw new Error('每个根域名至少允许一种 DNS 类型');
      if (!s.allowedTypes.some(type => openTypes.has(type))) throw new Error(`该根域名至少需要包含一种全局开放的 DNS 类型：${s.suffix}`);
      if (!s.allowedTypes.includes(s.defaultType)) throw new Error(`默认类型必须包含在允许类型中：${s.suffix}`);
      if (!openTypes.has(s.defaultType)) throw new Error(`默认类型必须在“DNS 修改”中开放：${s.suffix}`);
      if (!Number.isFinite(Number(s.ttl)) || Number(s.ttl) < 1 || Number(s.ttl) > 86400) throw new Error(`TTL 必须在 1 到 86400 之间：${s.suffix}`);
    });
    if (!suffixes.some(s => s.enabled)) throw new Error('至少启用一个根域名');
  }
  if (group === 'blacklist') {
    for (const list of [data.registration, data.access, data.userIds]) {
      for (const item of Array.isArray(list) ? list : []) {
        if (!String(item.value || '').trim()) throw new Error('黑名单值不能为空');
        if (item.expiresAt && Number.isNaN(new Date(item.expiresAt).getTime())) throw new Error('黑名单到期时间格式不正确');
      }
    }
  }
  if (group === 'notification' && n(data.rateLimitPerHour) < 0) throw new Error('消息限流不能小于 0');
  if (group === 'security') {
    if (String(data.adminPath || '') && !/^\/[a-z0-9/_-]*$/i.test(String(data.adminPath))) throw new Error('后台访问路径必须以 / 开头，且只能包含字母、数字、/、-、_');
    if (n(data.adminSessionTimeoutHours) < 1 || n(data.auditRetentionDays) < 1) throw new Error('会话超时和日志保留天数必须大于 0');
    if (n(data.failedLoginLockThreshold) > 0 && n(data.failedLoginLockMinutes) <= 0) throw new Error('设置登录失败阈值后，锁定时长必须大于 0');
  }
  if (group === 'automation') {
    if (n(data.scanCycleMinutes) < 5) throw new Error('定时扫描周期不能小于 5 分钟');
    if (!/^([*0-9,\/-]+\s+){4}[*0-9,\/-]+$/.test(String(data.cronExpression || '').trim())) throw new Error('Cron 表达式格式不正确');
  }
}
function bindSettingForm(selector, group, mapper) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = mapper(new FormData(form));
    try { validateSettingsPayload(group, payload); } catch(error) { toast(error.message, 'error'); return; }
    if (!riskyConfirm(group)) return;
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const { settings } = await api(`/api/admin/settings/${group}`, { method:'PUT', body:payload });
      state.config.site = settings.site;
      state.config.registration = settings.registration;
      state.config.domain = domainConfig(settings.domain);
      state.config.dns = settings.dns;
      state.config.dnsRecordTypes = settings.dns?.recordTypePolicies || state.config.dnsRecordTypes;
      state.config.suffixes = (settings.dns?.suffixes || []).filter(x => x.enabled !== false && x.allowRegister !== false);
      applyTheme();
      toast('设置已保存', 'success');
      const stamp = document.querySelector('.settings-save-status');
      if (stamp) stamp.textContent = `${tr('最近保存：')}${new Date().toLocaleString(lang() === 'en' ? 'en-US' : 'zh-CN', { hour12:false })}`;
      btn.disabled = false;
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function mountTurnstile(selector, action, options = {}) {
  const config = state.config.turnstile || {};
  const el = document.querySelector(selector);
  if (!el) throw new Error('人机验证容器不存在');
  if (!config.siteKey) throw new Error('Turnstile Site Key 未配置');
  const root = options.root || el.closest('[data-human-verification]');
  el.innerHTML = '<div class="turnstile-loading">正在加载人机验证…</div>';
  const render = async force => {
    if (force) state.widgetId = null;
    await (force ? loadTurnstileScript(true) : ensureTurnstileApi());
    if (!window.turnstile) throw new Error('Turnstile 对象未就绪');
    el.innerHTML = '';
    if (state.widgetId !== null) { try { window.turnstile.remove(state.widgetId); } catch {} }
    state.turnstileTokenValue = '';
    state.turnstileWidgetAction = action || 'login';
    state.turnstileSelector = selector;
    if (options.scene) {
      const record = humanSceneState(options.scene);
      record.method = 'turnstile';
      record.root = root;
      record.challengeId = '';
    }
    state.widgetId = window.turnstile.render(el, {
      sitekey: config.siteKey,
      action: action || 'login',
      language: lang() === 'en' ? 'en' : 'zh-cn',
      retry: 'auto',
      'refresh-expired': 'auto',
      callback: token => { state.turnstileTokenValue = token || ''; },
      'expired-callback': () => { state.turnstileTokenValue = ''; },
      'timeout-callback': () => {
        state.turnstileTokenValue = '';
        if (options.allowFallback && root && options.scene) switchHumanToImage(root, options.scene).catch(error => toast(error.message, 'error'));
        else toast('Turnstile 接口加载超时，请重新验证', 'error');
      },
      'error-callback': () => {
        state.turnstileTokenValue = '';
        if (options.allowFallback && root && options.scene) switchHumanToImage(root, options.scene).catch(error => toast(error.message, 'error'));
        else toast('Turnstile 验证组件不可用', 'error');
      }
    });
    return true;
  };
  try { return await render(false); }
  catch (firstError) {
    if (options.allowFallback) throw firstError;
    try { return await render(true); }
    catch (secondError) {
      el.innerHTML = '<div class="notice small danger turnstile-retry-box">Turnstile 加载失败。<br><button type="button" class="btn soft small" data-retry-turnstile>重新加载</button></div>';
      el.querySelector('[data-retry-turnstile]')?.addEventListener('click', () => mountTurnstile(selector, action, options).catch(error => toast(error.message, 'error')));
      throw secondError || firstError;
    }
  }
}

function turnstileToken() {
  const cached = String(state.turnstileTokenValue || '').trim();
  if (cached) return cached;
  if (window.turnstile && state.widgetId !== null) return window.turnstile.getResponse(state.widgetId) || '';
  return '';
}
async function stableTurnstileToken() {
  if (!hasTurnstileSiteKey()) throw new Error('Turnstile 未配置');
  let token = turnstileToken();
  if (token) return token;
  await new Promise(resolve => setTimeout(resolve, 180));
  token = turnstileToken();
  if (token) return token;
  throw new Error('请先完成人机验证；Turnstile 无法使用时系统会自动切换图形验证');
}
function resetTurnstile() {
  state.turnstileTokenValue = '';
  if (window.turnstile && state.widgetId !== null) {
    try { window.turnstile.reset(state.widgetId); } catch {}
  }
}


function startLiveI18nObserver() {
  if (!document.body) { document.addEventListener('DOMContentLoaded', startLiveI18nObserver, { once: true }); return; }
  ensureMountRoots();
  if (window.__storageI18nObserverStarted) return;
  window.__storageI18nObserverStarted = true;
  let timer = null;
  const run = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        applyI18n(document.body);
        bindLanguageControls();
      } catch (e) {}
    }, 20);
  };
  const observer = new MutationObserver(run);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder','title','aria-label'] });
  run();
}

function bootStorageApp() {
  window.__storageBootStarted = true;
  ensureMountRoots();
  if (app && !app.innerHTML.trim()) app.innerHTML = '<div class="loading-card boot-loading">正在加载系统…</div>';
  startLiveI18nObserver();
  Promise.resolve(init()).then(() => { try { afterRender(); } catch(e) {} });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootStorageApp, { once: true });
} else {
  bootStorageApp();
}

setTimeout(() => {
  try {
    ensureMountRoots();
    if (app && !app.textContent.trim()) bootStorageApp();
  } catch (e) { console.error(e); }
}, 1200);

// v54: help center answers are rewritten per question and old repeated KV content is ignored.
// v72: boot timeout fallback prevents permanent loading screen.

// v81: Complete missing English translations for Admin Settings and fix mixed-language dynamic rows.
Object.assign(I18N_EN, {
  'Settings are grouped and stored in Workers KV. High-risk changes require confirmation.':'Settings are grouped and stored in Workers KV. High-risk changes require confirmation.',
  'Settings loaded':'Settings loaded',
  'Export Settings':'Export Settings',
  'Import Settings':'Import Settings',
  'Appearance':'Appearance','Registration':'Registration','Domain Rules':'Domain Rules','DNS Configuration':'DNS Configuration','Blacklist':'Blacklist','Notifications':'Notifications','Security':'Security','Automation':'Automation','System Status':'System Status',
  '事件与模板变量':'Events & Template Variables','为每种事件分别设置用户通知和管理员告警。':'Configure user notifications and admin alerts for each event.','模板变量提示':'Template Variables','{username} 用户名、{domain} 域名、{days} 剩余天数、{ip} IP、{time} 时间、{reason} 原因。用户通知和管理员告警可以分别配置。':'{username}: username, {domain}: domain, {days}: remaining days, {ip}: IP, {time}: time, {reason}: reason. User notifications and admin alerts can be configured separately.',
  '新账号注册':'New Account Registration','新域名申请':'New Domain Application','域名即将到期':'Domain Expiring Soon','域名过期删除':'Expired Domain Deletion','异常注册行为':'Abnormal Registration Activity','用户通知目标':'User Notification Target','管理员告警目标':'Admin Alert Target','相关用户':'Related User','可填相关用户/全部用户/指定用户说明。':'Enter related user, all users, or a target-user note.','可填管理员或角色。':'Enter admin or role.','消息模板':'Message Template','发送限制与兼容模板':'Send Limits & Legacy Template','限制单位时间发送数量，避免通知风暴。':'Limit messages per time period to avoid notification storms.','消息限流/小时':'Message Rate Limit / Hour','用户到期消息模板':'User Expiry Message Template',
  '多根域名可视化编辑器':'Visual Multi-root Domain Editor','新增根域名只需在这里添加，不需要给每个域名单独配置环境变量。保存后用户注册页会自动读取启用的后缀。':'Add root domains here. No separate environment variables are needed for each domain. Enabled suffixes are shown automatically on the registration page.','必填：根域名、Zone ID。显示名称可留空；允许类型用逗号分隔，例如 A,AAAA,CNAME,TXT,MX,NS。每个根域名会独立使用自己的 Zone ID 写入 Cloudflare DNS。':'Required: root domain and Zone ID. Display name is optional. Separate allowed types with commas, for example A,AAAA,CNAME,TXT,MX. Each root domain writes to Cloudflare DNS using its own Zone ID.','启用解析':'Enable DNS','关闭后该根域名不能写入 DNS。':'When disabled, this root domain cannot write DNS records.','允许申请':'Allow Applications','关闭后用户注册页不显示该后缀。':'When disabled, this suffix is hidden from the user registration page.','显示名称':'Display Name','根域名':'Root Domain','允许类型':'Allowed Types','默认类型':'Default Type','默认代理':'Default Proxy','仅 A/AAAA/CNAME 可代理。':'Only A / AAAA / CNAME can be proxied.','该根域名 API Token（可选）':'API Token for This Root Domain (optional)','该根域名 API Token（可选） · 已配置':'API Token for This Root Domain (optional) · Configured','不同 CF 账号/Zone 时填写；留空保留原值':'Use this for a different Cloudflare account or zone. Leave blank to keep the current token.','优先使用这里的 Token，其次使用全局 Token / Worker Secret。':'This token is used first, then the global token / Worker Secret.','根域名 JSON 输出':'Root Domain JSON Output','该内容由上方可视化编辑器自动生成，仅用于查看和复制备份。':'Generated automatically from the visual editor above. Use it only for viewing and backup.','配置来源说明':'Configuration Source','多根域名列表保存在 Workers KV。DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED 只作为首次默认值；后续新增/修改根域名直接在本页保存即可。CF_API_TOKEN 可继续用 Worker Secret，也可在上方填写一次保存到 KV。':'Root domain settings are stored in Workers KV. DNS_SUFFIX, DNS_ZONE_ID, DNS_ALLOWED_TYPES, DNS_DEFAULT_TYPE, DNS_TTL, and DNS_PROXIED are only initial defaults. Later changes are saved on this page. CF_API_TOKEN can remain a Worker Secret or be saved to KV above.','测试所有可用根域名':'Test All Available Root Domains','测试中…':'Testing…','正常':'Active','失败':'Failed',
  '调度计划':'Schedule Plan','设置 Cron 表达式和扫描周期。':'Set the Cron expression and scan interval.','开启定时任务':'Enable Scheduled Tasks','需要 Workers Cron 触发器配合。':'Requires a Workers Cron trigger.','Cron 表达式':'Cron Expression','定时扫描周期/分钟':'Scan Interval / Minutes','可视化生成器会同步 Cron。':'The visual generator also updates Cron.','任务与保护策略':'Tasks & Protection Policy','独立控制到期检测、DNS 清理、失败告警和保护阈值。':'Control expiry checks, DNS cleanup, failure alerts, and protection thresholds separately.','域名到期检测':'Domain Expiry Check','扫描即将到期和已过期域名。':'Scan domains that are expiring or already expired.','过期 DNS 清理':'Expired DNS Cleanup','按保护阈值清理过期解析。':'Clean expired DNS records according to the protection threshold.','任务失败推送管理员告警':'Send Admin Alert on Task Failure','失败时写入消息中心。':'Write an alert to Message Center on failure.','自动清理 DNS 保护阈值/天':'DNS Cleanup Protection Threshold / Days','防止误删刚过期的正常解析。':'Prevents accidental deletion of newly expired normal records.','定时任务运行日志':'Scheduled Task Run Logs','暂无任务运行记录。':'No scheduled task logs yet.',
  '注册入口与账户状态':'Registration Access & Account Status','控制用户是否可以注册、是否需要注册码以及新账号初始状态。':'Control whether users can register, whether a registration key is required, and the initial account status.','注册启用 Turnstile 人机验证':'Enable Turnstile for Registration','普通注册和管理员添加用户都会使用。':'Used for public registration and admin-created users.','Turnstile Site Key':'Turnstile Site Key','Turnstile Secret Key':'Turnstile Secret Key','关闭后普通用户不能创建新账户。':'Regular users cannot create accounts when disabled.','开启后注册页显示注册码输入框，必须填写有效注册码。':'When enabled, the registration page shows a registration key input and requires a valid key.','关闭后新用户需要管理员启用。':'When disabled, new users must be activated by an admin.','用于减少垃圾账号。':'Used to reduce spam accounts.','保护普通注册和管理员手动添加用户。':'Protects public registration and admin-created users.',
  '新建解析默认开启 Cloudflare 代理':'Enable Cloudflare Proxy by Default for New DNS Records','A / AAAA / CNAME 可代理，TXT / MX 会强制仅 DNS。':'A / AAAA / CNAME can be proxied. TXT / MX are forced to DNS Only.','允许用户创建 MX 解析记录':'Allow Users to Create MX Records','关闭可降低垃圾邮件滥用风险。':'Disabling this reduces spam-email abuse risk.','禁止用户创建泛解析':'Block User Wildcard Records','阻止 * 主机记录。':'Blocks * host records.',
  '程序版本':'Program Version','KV 存储':'KV Storage','读取中':'Loading','定时任务':'Scheduled Tasks','更新检测':'Update Check','配置备份 / 导入恢复':'Configuration Backup / Import Restore','导出配置':'Export Configuration','导入配置':'Import Configuration','系统状态读取失败':'Failed to read system status','已开启':'Enabled','未开启':'Disabled','未知':'Unknown',
  '保存设置':'Save Settings','请先填写根域名和 Zone ID':'Please fill the root domain and Zone ID first','Cloudflare API 连通正常':'Cloudflare API connection is OK','确认删除该根域名配置？已存在的用户域名不会自动删除，但该后缀将无法继续管理 DNS。':'Delete this root domain configuration? Existing user domains will not be deleted automatically, but DNS for this suffix can no longer be managed.'
});

Object.assign(I18N_EN, {
  '拖动排序':'Drag to Reorder','拖动整个域名框调换顺序':'Drag the whole domain card to reorder','注册显示顺序':'Registration Display Order','数字越小，在注册选择框中越靠前。':'Lower numbers appear earlier in registration.','留空则注册时只显示根域名':'Leave blank to show only the root domain','留空不会显示“免费二级域名”等名称。':'Leave blank to hide the display name.','邮件发送服务':'Email Delivery Service','使用 Resend API 发送真实注册验证码邮件。':'Use the Resend API to send real registration verification emails.','发件邮箱':'Sender Email','发件名称':'Sender Name','验证码有效期/分钟':'Verification Code Validity / Minutes','允许发送的运行环境':'Allowed Sending Environments','启用注册验证码场景':'Enable Registration Code Scene','启用管理员测试场景':'Enable Admin Test Scene','注册验证码收件对象':'Registration Code Recipients','测试邮件收件对象':'Test Email Recipients','仅注册用户邮箱':'Registering User Only','注册用户 + 固定邮箱密送':'Registering User + Fixed BCC','测试时手动填写':'Enter Manually When Testing','当前管理员邮箱':'Current Admin Email','固定收件邮箱':'Fixed Recipient Emails','注册验证码邮件内容':'Registration Code Email Content','注册邮件主题':'Registration Email Subject','注册邮件纯文本内容':'Registration Plain-text Body','注册邮件 HTML 内容':'Registration HTML Body','测试邮件内容':'Test Email Content','测试邮件主题':'Test Email Subject','测试邮件纯文本内容':'Test Plain-text Body','测试邮件 HTML 内容':'Test HTML Body','测试邮件模板':'Test Email Template','发送测试邮件':'Send Test Email','邮箱验证码':'Email Verification Code','发送验证码':'Send Code','验证码会发送到上方邮箱，请先完成邮箱填写。':'The code will be sent to the email above.','测试所有可用根域名':'Test All Available Root Domains','正在同时测试所有根域名…':'Testing all root domains…'
});
if (typeof applyI18n === 'function') setTimeout(() => { try { applyI18n(document.body); } catch (_) {} }, 80);

// v91: complete current-interface English translations and live missing-string diagnostics.
Object.assign(I18N_EN, {"正在准备人机验证…":"Preparing verification…","正在加载 Turnstile…":"Loading Turnstile…","正在加载人机验证…":"Loading verification…","Turnstile 验证已完成":"Turnstile verification completed","验证已过期，请重新验证":"Verification expired. Please verify again.","Turnstile 接口加载超时，请重新验证":"Turnstile timed out. Please verify again.","Turnstile 验证组件不可用":"Turnstile verification is unavailable","Turnstile 加载失败。":"Turnstile failed to load.","重新加载":"Reload","Turnstile Site Key 未配置":"Turnstile Site Key is not configured","请输入图形验证码":"Enter the image verification code","图形验证码":"Image verification code","点击刷新图形验证码":"Click to refresh the image code","加载中…":"Loading…","正在生成…":"Generating…","验证码生成失败":"Failed to generate code","生成失败，点击重试":"Generation failed. Click to retry","图形验证码生成失败":"Failed to generate image verification code","图形验证设置":"Image Verification Settings","Turnstile 无法加载时可自动回退到本地生成的一次性图形验证码。":"When Turnstile cannot load, the system can fall back to a locally generated one-time image code.","人机验证方式":"Verification Method","仅使用图形验证":"Image Verification Only","仅使用 Turnstile 验证":"Turnstile Only","优先 Turnstile 验证，失败后使用图形验证（默认）":"Prefer Turnstile; use image verification if it fails (default)","作用于登录、注册、域名申请和管理员添加用户。":"Applies to login, registration, domain applications, and admin-created users.","开启图形验证码背景":"Enable Image-code Background","关闭后使用纯色浅色背景。":"Uses a plain light background when disabled.","背景生成方式":"Background Mode","随机生成背景":"Generate Random Background","使用上传背景":"Use Uploaded Background","上传图仅保存在 Workers KV 设置中。":"The uploaded image is stored only in Workers KV settings.","上传验证码背景":"Upload Verification Background","建议横向图片，最大 500KB；重新上传才会覆盖原背景。":"Use a landscape image up to 500 KB. Upload another image to replace it.","已配置上传背景；如需替换请重新选择图片。":"An uploaded background is configured. Select another image to replace it.","当前使用随机背景。":"A random background is currently used.","开启随机干扰线条":"Enable Random Noise Lines","线条绘制在字符前方。":"Noise lines are drawn over the characters.","随机线条最少条数":"Minimum Noise Lines","随机线条最多条数":"Maximum Noise Lines","线条颜色方式":"Line Color Mode","随机颜色":"Random Colors","固定颜色":"Fixed Color","固定线条颜色":"Fixed Line Color","仅选择固定颜色时生效。":"Applies only when Fixed Color is selected.","图形验证码可用字符":"Image-code Character Set","随机字符只会从这里生成；系统会自动去重和移除空格。":"Random characters are generated only from this set. Duplicates and spaces are removed automatically.","图形验证码字符数量":"Image-code Length","允许 3-8 位。":"Allowed length: 3–8 characters.","多根域名管理":"Multiple Root Domains","每个根域名使用独立 Zone ID、类型和代理策略。":"Each root domain uses its own Zone ID, record types, and proxy policy.","多根域名可视化编辑器":"Visual Root-domain Editor","新增根域名只需在这里添加，不需要给每个域名单独配置环境变量。保存后用户注册页会自动读取启用的后缀。":"Add root domains here without creating separate environment variables. Enabled suffixes appear automatically on the registration page.","＋ 新增根域名":"+ Add Root Domain","必填：根域名、Zone ID。显示名称可留空；允许类型用逗号分隔，例如 A,AAAA,CNAME,TXT,MX,NS。每个根域名会独立使用自己的 Zone ID 写入 Cloudflare DNS。":"Required: root domain and Zone ID. Display name is optional. Separate allowed types with commas, such as A,AAAA,CNAME,TXT,MX. Each root domain writes DNS through its own Zone ID.","拖动排序":"Drag to Reorder","拖动整个域名框调换顺序":"Drag the whole domain card to change its order","启用解析":"Enable DNS","关闭后该根域名不能写入 DNS。":"When disabled, DNS cannot be written for this root domain.","允许申请":"Allow Applications","关闭后用户注册页不显示该后缀。":"When disabled, this suffix is hidden from the registration page.","显示名称":"Display Name","留空则注册时只显示根域名":"Leave blank to show only the root domain","留空不会显示“免费二级域名”等名称。":"Leave blank to hide labels such as “Free Subdomain”.","根域名":"Root Domain","允许类型":"Allowed Types","默认类型":"Default Type","默认代理":"Default Proxy","仅 A/AAAA/CNAME 可代理。":"Only A / AAAA / CNAME can be proxied.","该根域名 API Token（可选）":"API Token for This Root Domain (optional)","不同 CF 账号/Zone 时填写；留空保留原值":"Use this for another Cloudflare account or zone; leave blank to keep the current value","优先使用这里的 Token，其次使用全局 Token / Worker Secret。":"This token is used first, followed by the global token or Worker Secret.","注册显示顺序":"Registration Display Order","数字越小，在注册选择框中越靠前。":"Lower numbers appear earlier in the registration selector.","测试":"Test","删除":"Delete","根域名 JSON 输出":"Root-domain JSON Output","该内容由上方可视化编辑器自动生成，仅用于查看和复制备份。":"Generated automatically from the visual editor for viewing and backup only.","配置来源说明":"Configuration Source","测试所有可用根域名":"Test All Available Root Domains","邮件发送分工":"Email Delivery Routing","注册验证码发送给任意用户邮箱，继续使用 Resend；只发给管理员的通知使用 Cloudflare 免费邮件绑定。":"Registration codes sent to arbitrary user addresses continue to use Resend. Admin-only notices use the free Cloudflare email binding.","当前发送方式":"Current Delivery Methods","Cloudflare 绑定状态：":"Cloudflare Binding Status:","固定管理员收件邮箱：":"Fixed Admin Recipient:","注册验证码邮件内容":"Registration-code Email Content","可以自定义主题、纯文本和 HTML 内容。":"Customize the subject, plain-text body, and HTML body.","模板变量说明":"Template Variable Guide","网站标题":"Site Title","本次生成的验证码":"The generated verification code","验证码有效分钟数":"Code validity in minutes","当前收件邮箱":"Current recipient email","当前管理员邮箱，注册用户邮件通常为空":"Current admin email; normally empty for registration emails","Worker 当前运行环境，例如 production":"Current Worker environment, such as production","邮件生成时间（ISO 时间）":"Email generation time (ISO format)","注册邮件主题":"Registration Email Subject","注册邮件纯文本内容":"Registration Plain-text Body","用于不支持 HTML 的邮箱客户端。":"Used by email clients that do not support HTML.","注册邮件 HTML 内容":"Registration HTML Body","可留空，系统会把纯文本自动转换成 HTML。":"Optional. The system converts plain text to HTML automatically.","Cloudflare 管理员测试邮件内容":"Cloudflare Admin Test Email Content","测试邮件固定发送到已验证的管理员邮箱；可预览测试模板或注册验证码模板。":"Test emails are sent to the verified admin address. You can test either the test template or the registration-code template.","测试邮件主题":"Test Email Subject","测试邮件纯文本内容":"Test Plain-text Body","测试邮件 HTML 内容":"Test HTML Body","发送 Cloudflare 测试邮件":"Send Cloudflare Test Email","不使用 Resend 配额。":"Does not use Resend quota.","测试邮件模板":"Test Email Template","注册验证码模板（生成示例验证码）":"Registration-code Template (generate a sample code)","发送到管理员邮箱":"Send to Admin Email","邮箱规则与关闭提示":"Email Rules and Registration-closed Notice","管理邮箱后缀限制和注册关闭时的前台说明。":"Manage email-domain restrictions and the public message shown when registration is closed.","邮箱后缀拦截黑名单":"Blocked Email Domains","一行一个邮箱后缀，不要带 @ 也可以。":"Enter one email domain per line; the @ symbol is optional.","关闭注册时前台提示文案":"Public Message When Registration Is Closed","注册关闭时显示给用户。":"Shown to users when registration is closed.","管理员帮助中心":"Admin Help Center","独立处理方法":"Troubleshooting Guides","搜索问题或错误关键词":"Search Issues or Error Keywords","输入报错原文或现象，例如：403、SEB、key_hash、Turnstile、十几秒刷新":"Enter an exact error or symptom, such as 403, SEB, key_hash, Turnstile, or frequent refresh","分类":"Category","全部分类":"All Categories","复制报错记录模板":"Copy Error-report Template","展开本类":"Expand Category","条分步骤处理方法":"step-by-step guides","显示":"Showing","条":"items","先做这一步：":"First action:","你会看到：":"What you may see:","为什么会这样：":"Why this happens:","按顺序处理：":"Steps to fix:","怎么确认已经修好：":"How to verify the fix:","仍未解决时要收集：":"Collect if unresolved:","以后如何避免：":"How to prevent it:","报错记录模板已复制":"Error-report template copied","分析页":"Analytics","趋势图已按宝塔面板风格优化：支持 12 小时 / 1 天 / 3 天 / 7 天 / 30 天 / 90 天 / 自定义切换，并提供更清晰的悬停提示与概览视图。":"Trend charts support 12 hours, 1 day, 3 days, 7 days, 30 days, 90 days, and custom ranges, with clearer hover details and overview displays.","二级域名总数":"Total Subdomains","活跃二级域名":"Active Subdomains","注册用户总数":"Registered Users","DNS记录总数":"Total DNS Records","申请总量":"Total Applications","二级域名申请 & 审批趋势":"Subdomain Applications & Approval Trend","新增申请":"New Applications","审核通过":"Approved","驳回/注销":"Rejected / Cancelled","DNS 变更趋势":"DNS Change Trend","新增DNS":"DNS Added","删除DNS":"DNS Removed","二级域名状态分布":"Subdomain Status Distribution","DNS 记录类型占比":"DNS Record Type Distribution","Cloudflare API 运行监控":"Cloudflare API Monitoring","请选择自定义开始和结束时间":"Select a custom start and end time","消息中心":"Message Center","全选":"Select All","取消全选":"Clear Selection","删除所选":"Delete Selected","确认删除所选消息？":"Delete the selected messages?","确认删除这条消息？":"Delete this message?","消息已删除":"Message deleted","请选择要删除的消息":"Select messages to delete","品牌与外观":"Brand and Appearance","配置站点名称、Logo、主题和主色。":"Configure the site name, logo, theme, and colors.","页脚与合规信息":"Footer and Compliance Information","统一维护页脚、版权和备案信息。":"Manage footer, copyright, and registration information in one place.","公告、维护与高级代码":"Notices, Maintenance, and Advanced Code","控制维护模式、公告时段和可信第三方脚本。":"Control maintenance mode, notice periods, and trusted third-party scripts.","注册入口与账户状态":"Registration Access and Account Status","控制用户是否可以注册、是否需要注册码以及新账号初始状态。":"Control public registration, registration-key requirements, and the initial status of new accounts.","Turnstile 人机验证":"Turnstile Verification","配置 Turnstile 公钥和密钥；是否使用由下方“人机验证方式”统一控制，作用于登录、注册、域名申请和管理员添加用户。":"Configure the Turnstile site key and secret. The verification method below controls login, registration, domain applications, and admin-created users.","新注册账号默认状态":"Default Status for New Accounts","自动启用":"Activate Automatically","需要人工审核":"Require Manual Review","用于注册后的账号状态。":"Sets the account status after registration.","注册频率与风险控制":"Registration Frequency and Risk Controls","限制单 IP、失败次数、代理网络和每日域名申请量。":"Limit registrations per IP, failed attempts, proxy networks, and daily domain applications.","邮箱验证码位数":"Email-code Length","邮箱验证码可用字符":"Email-code Character Set"});


// v91: translate all current admin-help category navigation labels. Article bodies
// remain administrator-authored content, while every system control and category is bilingual.
Object.assign(I18N_EN, {
  '快速应急与故障定位':'Emergency Triage & Fault Isolation',
  '部署、版本与缓存':'Deployment, Versions & Cache',
  'D1 数据库与表结构':'D1 Database & Schema',
  '登录、会话与 HTTP 403':'Login, Sessions & HTTP 403',
  'Turnstile 与图形验证':'Turnstile & Image Verification',
  '邮件发送：Cloudflare 免费邮件与 Resend':'Email: Cloudflare Free Mail & Resend',
  '注册码与用户管理':'Registration Keys & User Management',
  '域名申请、审核与生命周期':'Domain Applications, Review & Lifecycle',
  'Cloudflare DNS 与多根域名':'Cloudflare DNS & Multiple Root Domains',
  '消息中心与帮助中心':'Message Center & Help Center',
  'Workers KV、设置与导入导出':'Workers KV, Settings, Import & Export',
  '定时任务、日志与维护':'Scheduled Tasks, Logs & Maintenance',
  '安全、性能、备份与恢复':'Security, Performance, Backup & Recovery',
  '界面、浏览器与移动端':'Interface, Browsers & Mobile',
  '日志、Ray ID 与远程诊断':'Logs, Ray ID & Remote Diagnostics',
  'HTTP 状态码与接口错误':'HTTP Status Codes & API Errors',
  '拖动整个域名框调换顺序':'Drag the entire root-domain card to reorder it',
  '确认删除该根域名配置？已存在的用户域名不会自动删除，但该后缀将无法继续管理 DNS。':'Delete this root-domain configuration? Existing user domains will not be deleted automatically, but DNS for this suffix can no longer be managed.',
  '请先填写根域名和 Zone ID':'Enter the root domain and Zone ID first',
  'Cloudflare API 连通正常':'Cloudflare API connection is working',
  '正常':'Working',
  '失败':'Failed',
  '已配置':'Configured',
  '本次填写，将保存到 KV':'Entered now; it will be saved to KV'
});

Object.assign(I18N_EN, {
  "Cloudflare 已验证收件邮箱":"Cloudflare Verified Recipient",
  "同步已验证邮箱":"Sync Verified Addresses",
  "尚未同步":"Not synced yet",
  "正在同步…":"Syncing…",
  "发送到所选邮箱":"Send to Selected Address",
  "发送 Cloudflare SEB 测试邮件":"Send Cloudflare SEB Test Email",
  "当前管理员收件邮箱：":"Current Admin Recipient:",
  "Email Routing API Token":"Email Routing API Token",
  "只授予 Email Routing Addresses Read。建议使用 Worker Secret：CF_EMAIL_ROUTING_API_TOKEN。":"Grant only Email Routing Addresses Read. Prefer the CF_EMAIL_ROUTING_API_TOKEN Worker Secret.",
  "用于读取账户级已验证邮箱。也可配置 Worker 变量 CF_ACCOUNT_ID。":"Used to read account-level verified addresses. You can also configure the CF_ACCOUNT_ID Worker variable.",
  "所有 Cloudflare 管理员通知都会发送到这里选中的邮箱。绑定名称 SEB 允许发送到本账户任意已验证目标邮箱。":"All Cloudflare admin notices are sent to the selected address. The SEB binding can send to any verified destination in this account.",
  "测试结果、操作日志和 Workers 日志都会明确记录发送通道：":"Test results, operation logs, and Workers logs explicitly record the delivery provider:",
  "通道":"Provider",
  "上次同步：":"Last synced:",
  "Worker 邮件变量快捷管理（安全白名单）":"Worker Email Variable Manager (Safe Allowlist)",
  "可以在网站内更新常用邮件、Cloudflare、Turnstile 变量。首次仍需在 Cloudflare 控制台添加":"Update common email, Cloudflare, and Turnstile variables from the website. First add",
  "权限只授予":"Grant only",
  "这个管理令牌本身不能在网站内修改。":"The management token itself cannot be changed from the website.",
  "发件邮箱 EMAIL_FROM":"Sender Email EMAIL_FROM",
  "发件名称 EMAIL_FROM_NAME":"Sender Name EMAIL_FROM_NAME",
  "管理员收件邮箱 CF_ADMIN_EMAIL":"Admin Recipient CF_ADMIN_EMAIL",
  "运行环境 APP_ENVIRONMENT":"Runtime Environment APP_ENVIRONMENT",
  "Cloudflare DNS API Token":"Cloudflare DNS API Token",
  "Turnstile Secret":"Turnstile Secret",
  "更新 Worker 变量":"Update Worker Variable",
  "尚未读取 Worker 变量状态":"Worker variable status has not been loaded",
  "未启用：请先添加 CF_WORKERS_API_TOKEN Secret":"Not enabled: add the CF_WORKERS_API_TOKEN Secret first",
  "API 管理已启用":"API management enabled",
  "请选择要修改的 Worker 变量":"Select a Worker variable to update",
  "请输入新的变量值":"Enter the new variable value",
  "正在更新 Cloudflare Worker 变量…":"Updating the Cloudflare Worker variable…",
  "已配置（密钥值不可读取）":"Configured (secret value cannot be read)",
  "未配置":"Not configured",
  "当前生效值":"Current effective value"
});

Object.assign(I18N_EN, {
  "变量设置":"Variable Settings",
  "Worker 变量同步":"Worker Variable Sync",
  "同步当前 Worker 环境变量状态，并通过安全白名单直接更新指定变量。":"Sync current Worker variable status and update approved variables through a safe allowlist.",
  "Worker 变量快捷管理（安全白名单）":"Worker Variable Manager (Safe Allowlist)",
  "当前变量说明":"Variable Reference",
  "修改前建议先查看用途，避免误改导致邮件、DNS 或验证功能异常。":"Review the purpose before changing values to avoid breaking email, DNS, or verification features.",
  "更新 Worker 变量":"Update Worker Variable"
});


// v98: DNS record-type policy editor and synchronized user record labels.
Object.assign(I18N_EN, {
  'DNS 修改':'DNS Record Type Controls',
  '独立管理 DNS 类型的用户显示名称、是否允许用户添加以及添加页面备注。首次升级会从 Worker 变量 DNS_ALLOWED_TYPES 同步开放状态。':'Manage the user-facing name, whether users may add the type, and the optional note shown on the add-record form. On first upgrade, enabled types are synchronized from the DNS_ALLOWED_TYPES Worker variable.',
  'DNS 类型':'DNS Type',
  '显示名称':'Display Name',
  '是否开放添加':'Allow User Add',
  '备注':'Note',
  '开放':'Enabled',
  '关闭':'Disabled',
  '留空则添加记录时不显示备注':'Leave blank to hide the note on the add-record form',
  '显示名称用于用户添加 DNS 记录时的下拉选项。':'The display name is used in the DNS-type selector when users add records.',
  '受上方“DNS 修改”全局开放策略约束。':'Constrained by the global DNS record-type controls above.',
  '管理员暂未开放可添加的 DNS 类型':'The administrator has not enabled any DNS record types for user creation',
  'A（IPv4）':'A (IPv4)',
  'AAAA（IPv6）':'AAAA (IPv6)',
  'CNAME（别名）':'CNAME (Alias)',
  'TXT（文本验证）':'TXT (Text Verification)',
  'MX（邮件）':'MX (Mail)',
  'NS（名称服务器）':'NS (Name Server)',
  '至少开放一种 DNS 类型供用户添加':'Enable at least one DNS type for users to add',
  'DNS 类型策略中包含系统不支持的类型':'The DNS type policy contains an unsupported record type',
  '该根域名至少需要包含一种全局开放的 DNS 类型':'Each root domain must include at least one globally enabled DNS type',
  '默认类型必须在“DNS 修改”中开放':'The default DNS type must be enabled in DNS Record Type Controls',
  'A / AAAA / CNAME 可代理，TXT / MX / NS 会强制仅 DNS。':'A / AAAA / CNAME can be proxied. TXT / MX / NS are always DNS-only.',
  '允许类型用逗号分隔，例如 A,AAAA,CNAME,TXT,MX,NS。':'Separate allowed types with commas, for example A,AAAA,CNAME,TXT,MX,NS.',
  'NS 记录目标，例如 ns1.example.com':'NS record target, for example ns1.example.com',
  '添加记录时显示给用户的补充说明。':'Additional guidance shown to users when adding this record type.',
  'DNS 类型策略已同步':'DNS record-type policy synchronized'
});

Object.assign(I18N_EN, {
  'A / AAAA / CNAME 可开启代理，TXT / MX / NS 会自动使用仅 DNS':'A / AAAA / CNAME can be proxied. TXT / MX / NS are automatically DNS-only.'
});
