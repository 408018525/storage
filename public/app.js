const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const modalRoot = document.querySelector('#modal-root');

const state = {
  config: null,
  me: null,
  applications: [],
  quota: { used: 0, total: 3, remaining: 3 },
  widgetId: null,
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
  return state.config?.suffixes || state.config?.dns?.suffixes || [];
}


const I18N_EN = {
  '初始化管理员':'Bootstrap Admin','首次部署需要创建管理员账户。':'Create the first admin account for this deployment.','初始化令牌':'Setup Token','管理员用户名':'Admin Username','邮箱':'Email','管理员密码':'Admin Password','至少 10 位，并包含字母和数字。':'At least 10 characters, including letters and numbers.','创建管理员':'Create Admin',
  '登录':'Login','进入域名注册与管理中心。':'Access the domain registration and management center.','用户名或邮箱':'Username or Email','密码':'Password','30 天内保持登录':'Keep me signed in for 30 days','没有账户？':'No account?','注册':'Register','创建账户':'Create Account','注册后默认拥有 3 个域名额度。':'New users get 3 domain slots by default.','用户名':'Username','已有账户？':'Already have an account?','登录成功':'Login successful','注册成功，请使用刚才的账号密码登录':'Registration successful. Please log in.','注册成功，请等待管理员启用账户':'Registration successful. Please wait for admin activation.',
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
  '管理员备注，可留空；填写后用户域名界面会显示':'Admin note, optional. If filled, it will be shown to the user.',
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
  '未填写邮箱':'No email provided',
  '编辑用户':'Edit User',
  '管理员可直接添加用户，并设置初始密码、角色、状态和额度。':'Admins can create users directly and set password, role, status, and quota.',
  '管理员手动创建用户账号':'Admin creates a user account manually.',
  '例如：user001':'Example: user001',
  '至少 10 位，包含字母和数字':'At least 10 characters, including letters and numbers',
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
  'A / AAAA / CNAME 可开启代理，TXT / MX 会自动使用仅 DNS':'A / AAAA / CNAME can be proxied. TXT / MX are DNS Only automatically.',
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

function lang() { return localStorage.getItem('ui_lang') || 'zh'; }
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
  root.querySelectorAll?.('[title], [aria-label]').forEach(el => {
    if (el.title) el.title = translateTextValue(el.title);
    const aria = el.getAttribute('aria-label');
    if (aria) el.setAttribute('aria-label', translateTextValue(aria));
  });
  root.querySelectorAll?.('option').forEach(el => {
    el.textContent = translateTextValue(el.textContent);
  });
}
function bindLanguageControls() {
  document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
    btn.onclick = () => setLang(lang() === 'en' ? 'zh' : 'en');
  });
}
function afterRender() {
  bindLanguageControls();
  applyI18n();
}
async function renderRoute() {
  await route();
  afterRender();
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
function toast(message, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = translateTextValue(message);
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
function closeModal() {
  modalRoot.innerHTML = '';
  state.widgetId = null;
}
function openModal(title, subtitle, content, size = '') {
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
  const opts = { method: options.method || 'GET', headers: { ...(options.headers || {}) }, credentials: 'same-origin' };
  if (options.body !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(path, opts);
  let data;
  try { data = await res.json(); } catch { data = { ok:false, message:`HTTP ${res.status}` }; }
  if (!res.ok || data.ok === false) {
    const error = new Error(data.message || '请求失败');
    error.code = data.code;
    error.details = data.details;
    throw error;
  }
  return data;
}

function applyTheme() {
  const site = state.config?.site || {};
  document.documentElement.style.setProperty('--accent', site.accent || '#4f63f6');
  document.documentElement.style.setProperty('--accent-2', site.accent2 || '#7c4dff');
  document.title = lang() === 'en' ? 'Domain Registration Center' : (site.title || '免费二级域名注册中心');
}

async function init() {
  try {
    const [{ config }, me] = await Promise.all([
      api('/api/public/config'),
      api('/api/auth/me').catch(() => ({ user:null })),
    ]);
    state.config = config;
    state.me = me.user;
    applyTheme();
    await renderRoute();
  } catch (error) {
    app.innerHTML = `<div class="center-screen"><h2>应用加载失败</h2><p>${esc(error.message)}</p><button class="btn primary" id="retry">重试</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', () => location.reload());
  }
}

function go(hash) { location.hash = hash; }
window.addEventListener('hashchange', renderRoute);

async function route() {
  const hash = location.hash || (state.me ? '#/apply' : '#/login');

  if (state.config?.needsBootstrap && hash !== '#/setup') return go('#/setup');
  if (!state.me && !['#/login', '#/register', '#/setup'].includes(hash)) return go('#/login');
  if (state.me && ['#/login', '#/register', '#/setup'].includes(hash)) return go('#/apply');
  if (hash.startsWith('#/admin') && state.me?.role !== 'admin') return go('#/apply');

  state.widgetId = null;

  if (hash.startsWith('#/domain/')) return renderDomainDetail(hash.replace('#/domain/', ''));
  if (hash === '#/setup') return renderSetup();
  if (hash === '#/login') return renderLogin();
  if (hash === '#/register') return renderRegister();
  if (hash === '#/apply') return renderApply();
  if (hash === '#/domains' || hash === '#/applications') return renderDomains();
  if (hash === '#/account') return renderAccount();
  if (hash === '#/admin') return renderAdminOverview();
  if (hash === '#/admin/applications') return renderAdminApplications();
  if (hash === '#/admin/users') return renderAdminUsers();
  if (hash === '#/admin/settings') return renderAdminSettings();

  return state.me ? renderApply() : renderLogin();
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
      <label class="field"><span>管理员用户名</span><input name="username" required minlength="3" maxlength="32"></label>
      <label class="field"><span>邮箱</span><input name="email" type="email"></label>
      <label class="field wide"><span>管理员密码</span><input name="password" type="password" required minlength="10"><em>至少 10 位，并包含字母和数字。</em></label>
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

async function renderLogin() {
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('登录', '进入域名注册与管理中心。', `
    <form id="login-form" class="form-grid">
      <label class="field wide"><span>用户名或邮箱</span><input name="identity" required autocomplete="username"></label>
      <label class="field wide"><span>密码</span><input name="password" type="password" required autocomplete="current-password"></label>
      <label class="check wide"><input name="remember" type="checkbox"> 30 天内保持登录</label>
      ${turn.enabledLogin ? '<div class="wide"><div id="turnstile-box"></div></div>' : ''}
      <button class="btn primary wide" type="submit">登录</button>
    </form>
    <p class="auth-link">没有账户？ <a href="#/register">注册</a></p>`);
  if (turn.enabledLogin) await mountTurnstile('#turnstile-box', turn.actionLogin);
  document.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const f = new FormData(e.currentTarget);
    try {
      const result = await api('/api/auth/login', { method:'POST', body:{
        identity:f.get('identity'), password:f.get('password'), remember:f.get('remember') === 'on', turnstileToken:turnstileToken(),
      }});
      state.me = result.user;
      toast('登录成功', 'success');
      go(result.user.role === 'admin' ? '#/admin' : '#/apply');
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      btn.disabled = false;
    }
  });
}

async function renderRegister() {
  // 注册入口默认开放，避免历史设置导致新用户无法注册。
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('创建账户', '注册后默认拥有 3 个域名额度。', `
    <form id="register-form" class="form-grid">
      <label class="field"><span>用户名</span><input name="username" required minlength="3" maxlength="32"></label>
      <label class="field"><span>邮箱</span><input name="email" type="email"></label>
      <label class="field wide"><span>密码</span><input name="password" type="password" required minlength="10"><em>至少 10 位，并包含字母和数字。</em></label>
      ${turn.enabledRegister ? '<div class="wide"><div id="turnstile-box"></div></div>' : ''}
      <button class="btn primary wide" type="submit">注册</button>
    </form>
    <p class="auth-link">已有账户？ <a href="#/login">登录</a></p>`);
  if (turn.enabledRegister) await mountTurnstile('#turnstile-box', turn.actionRegister);
  document.querySelector('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.turnstileToken = turnstileToken();
    try {
      const result = await api('/api/auth/register', { method:'POST', body });
      if (result.pendingActivation) {
        toast('注册成功，请等待管理员启用账户', 'success');
      } else {
        toast('注册成功，请使用刚才的账号密码登录', 'success');
      }
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      btn.disabled = false;
    }
  });
}

function nav(hash, icon, text) {
  return `<a class="nav ${location.hash === hash ? 'active' : ''}" href="${hash}"><span>${icon}</span>${esc(text)}</a>`;
}
function shell(title, content) {
  const site = state.config.site || {};
  const isAdmin = state.me?.role === 'admin';
  app.innerHTML = `<div class="app-shell">
    <div class="sidebar-mask" id="sidebar-mask"></div>
    <aside class="sidebar">
      <div class="brand"><div>${esc(site.logoText || '域')}</div><strong>${esc(site.title || '域名注册中心')}</strong></div>
      <nav>
        ${nav('#/apply','＋','域名注册')}
        ${nav('#/domains','🌐','域名管理')}
        ${nav('#/account','⚙','账户设置')}
        ${isAdmin ? `<hr>${nav('#/admin','▦','管理概览')}${nav('#/admin/applications','✓','域名审核')}${nav('#/admin/users','♟','用户管理')}${nav('#/admin/settings','⚙','管理员设置')}` : ''}
      </nav>
      <div class="side-user"><strong>${esc(state.me.username)}</strong><small>${isAdmin ? '管理员' : '普通用户'}</small><button id="logout" class="btn ghost">退出登录</button></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="btn ghost menu-btn" id="menu">☰</button>
        <h1>${esc(title)}</h1>
        <div class="topbar-actions">${langButton()}${statusBadge(state.me.status || 'active')}</div>
      </header>
      <section class="content">${content}</section>
    </main>
  </div>`;
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
  const total = Number(q.total || fallbackTotal) >= 9999 ? fallbackTotal : Number(q.total || fallbackTotal);
  const used = Number(q.used || 0);
  state.quota = { ...q, used, total, remaining: Math.max(0, total - used), label: `${used} / ${total}` };
  return result;
}

async function renderApply() {
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
  const options = suffixes.map(s => `<option value="${attr(s.suffix)}">${esc(s.label)} / ${esc(s.suffix)}</option>`).join('');
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
      ${state.config.turnstile.enabledApply ? '<div id="turnstile-box" class="turnstile-holder"></div>' : ''}
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
  document.querySelector('#dns-help').addEventListener('click', () => toast('管理员审核通过后，进入“域名管理”点击“管理域名”，再添加 DNS 解析。', 'success'));
  if (state.config.turnstile.enabledApply) mountTurnstile('#turnstile-box', state.config.turnstile.actionApply);
  document.querySelector('#domain-register-form').addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true;
    try {
      await api('/api/applications', { method:'POST', body:{ prefix:prefix.value, suffix:suffix.value, turnstileToken:turnstileToken() } });
      closeModal();
      toast('域名已提交，请等待管理员审核通过后再配置 DNS 解析', 'success');
      await renderApply();
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      submit.disabled = false;
    }
  });
}

async function renderDomains() {
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
  const dns = approved ? (a.dnsConfigured ? `${a.recordType} → ${a.recordContent}` : '未配置') : '审核通过后可配置';
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
    ${a.reviewNote ? `<p class="note-line"><b>管理员留言：</b>${esc(a.reviewNote)}</p>` : ''}
    ${options.readonly ? '' : `<div class="card-actions">
      <button class="btn soft" data-manage="${attr(a.id)}">管理域名</button>
      ${a.canRenew ? `<button class="btn success" data-renew="${attr(a.id)}">续期</button>` : ''}
      ${a.canRequestDelete ? `<button class="btn danger-soft" data-request-delete="${attr(a.id)}">申请删除域名</button>` : ''}
      ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
      ${a.canDelete ? `<button class="btn danger-soft" data-delete="${attr(a.id)}">删除无效域名</button>` : ''}
    </div>`}
  </article>`;
}

function bindDomainCardActions() {
  document.querySelectorAll('[data-manage]').forEach(btn => btn.addEventListener('click', () => go(`#/domain/${btn.dataset.manage}`)));
  document.querySelectorAll('[data-renew]').forEach(btn => btn.addEventListener('click', () => renewDomain(btn.dataset.renew)));
  document.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => showDeleteDomainModal(btn.dataset.delete)));
  document.querySelectorAll('[data-request-delete]').forEach(btn => btn.addEventListener('click', () => showRequestDeleteDomainModal(btn.dataset.requestDelete)));
}

async function renderDomainDetail(id) {
  shell('域名管理', `<div class="loading-card">正在读取域名详情…</div>`);
  try {
    const [{ application: a }, dnsResult] = await Promise.all([
      api(`/api/applications/${encodeURIComponent(id)}`),
      api(`/api/applications/${encodeURIComponent(id)}/dns-records`).catch(() => ({ records: [] })),
    ]);
    const records = dnsResult.records || [];
    const dnsRows = records.map(r => dnsRecordRow(r, approved)).join('');
    const approved = a.status === 'approved';
    const expiryLine = approved && a.expiresAt ? fmtDate(a.expiresAt, true) : '—';
    const remainingLine = approved ? esc(a.remainingText || '') : '—';
    const addDnsButton = approved ? '<button class="btn primary" id="add-dns">＋ 添加解析</button>' : '<button class="btn secondary" disabled>审核通过后可配置 DNS</button>';
    const openDnsButton = approved ? '<button class="btn primary" data-open-dns>＋ 添加解析</button>' : '<button class="btn secondary" disabled>审核通过后可添加解析</button>';
    const emptyDnsText = approved ? '暂无 DNS 解析，请点击“添加解析”。' : '域名审核通过后才能添加解析。';

    shell('域名管理', `
      <section class="detail-hero">
        <a class="back-link" href="#/domains">← 返回域名列表</a>
        <div class="detail-main">
          <div class="globe big">🌐</div>
          <div><h1>${esc(a.fqdnUnicode)}</h1><code>${esc(a.fqdnAscii)}</code></div>
          ${statusBadge(a.status, a.statusText)}
          <div class="detail-actions">
            ${addDnsButton}
            ${a.canRenew ? `<button class="btn success" id="renew-domain">▣ 续期</button>` : ''}
            ${a.canRequestDelete ? `<button class="btn danger-soft" id="request-delete-domain">申请删除</button>` : ''}
            ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
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
                ${a.deleteRequested ? `<button class="btn secondary" disabled>删除待审核</button>` : ''}
                ${a.canDelete ? `<button class="btn danger-soft" data-delete-one>删除无效域名</button>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="tab-page" data-page="dns">
          <div class="section-head"><div><h2>DNS 解析</h2><p>${approved ? `用户可自由添加解析记录，支持三级/多级子域名。主机填 @ 表示当前域名，填 www 表示 www.${esc(a.fqdnUnicode)}，填 api.v1 表示 api.v1.${esc(a.fqdnUnicode)}。` : '当前域名还未通过审核，暂时不能设置 DNS 解析。'}</p></div>${openDnsButton}</div>
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
    if (approved) document.querySelectorAll('#add-dns,[data-open-dns]').forEach(btn => btn.addEventListener('click', () => showDnsModal(a)));
    if (approved) {
      document.querySelectorAll('[data-edit-dns]').forEach(btn => btn.addEventListener('click', () => {
        const record = records.find(x => x.id === btn.dataset.editDns);
        if (record) showDnsModal(a, record);
      }));
      document.querySelectorAll('[data-delete-dns]').forEach(btn => btn.addEventListener('click', () => deleteDnsRecord(a.id, btn.dataset.deleteDns)));
    }
    document.querySelectorAll('#renew-domain,[data-renew-one]').forEach(btn => btn.addEventListener('click', () => renewDomain(a.id)));
    document.querySelector('[data-delete-one]')?.addEventListener('click', () => showDeleteDomainModal(a.id));
    document.querySelector('#request-delete-domain')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
    document.querySelector('[data-request-delete-one]')?.addEventListener('click', () => showRequestDeleteDomainModal(a.id));
  } catch (error) {
    toast(error.message, 'error');
    go('#/domains');
  }
}

function dnsRecordRow(r, approved = true) {
  const actions = approved ? `<button class="btn soft small" data-edit-dns="${attr(r.id)}">编辑</button><button class="btn danger-soft small" data-delete-dns="${attr(r.id)}">删除</button>` : '<span class="muted">审核通过后可操作</span>';
  return `<tr>
    <td><code>${esc(r.host || '@')}</code><br><small>${esc(r.name || '')}</small></td>
    <td><b>${esc(r.type)}</b></td>
    <td class="mono">${esc(r.content)}</td>
    <td>${r.type === 'MX' ? esc(r.priority ?? 10) : '—'}</td>
    <td>${Number(r.ttl || 1) === 1 ? '自动' : esc(r.ttl)}</td>
    <td>${statusBadge(r.status || 'pending', r.statusText || r.status || '待写入')}${r.errorMessage ? `<br><small class="danger-text">${esc(r.errorMessage)}</small>` : ''}</td>
    <td class="actions-cell">${actions}</td>
  </tr>`;
}

function showDnsModal(a, record = null) {
  const suffix = (suffixList()).find(s => s.suffix === a.suffixUnicode) || (suffixList())[0] || {};
  const baseTypes = suffix.allowedTypes?.length ? suffix.allowedTypes : ['A', 'AAAA', 'CNAME', 'TXT', 'MX'];
  const types = Array.from(new Set([...baseTypes, 'A', 'AAAA', 'CNAME', 'TXT', 'MX']));
  const title = record ? '编辑解析' : '添加解析';
  const selectedProxy = record?.proxied ? 'true' : 'false';
  openModal(title, `为 ${a.fqdnUnicode} 设置子域解析`, `
    <form id="dns-form" class="modal-form dns-editor-form">
      <label class="field wide">
        <span>子域名前缀</span>
        <input name="host" value="${attr(record?.host || '@')}" placeholder="@ / www / api / api.v1" required>
        <em>@ = ${esc(a.fqdnUnicode)}；www = www.${esc(a.fqdnUnicode)}；api.v1 = api.v1.${esc(a.fqdnUnicode)}</em>
      </label>
      <label class="field wide"><span>记录类型</span><select name="type" id="dns-type">${types.map(t => `<option value="${attr(t)}" ${record?.type === t ? 'selected' : ''}>${esc(t)}${t === 'A' ? ' 记录（IPv4）' : t === 'AAAA' ? ' 记录（IPv6）' : t === 'CNAME' ? ' 记录（别名）' : t === 'TXT' ? ' 记录（文本验证）' : t === 'MX' ? ' 记录（邮箱）' : ''}</option>`).join('')}</select></label>
      <label class="field wide"><span>目标地址 / 记录值</span><input name="content" value="${attr(record?.content || '')}" placeholder="CNAME填域名；A填IPv4；AAAA填IPv6；TXT填文本；MX填邮件服务器" required></label>
      <label class="field wide" id="priority-field"><span>MX 优先级</span><input name="priority" type="number" min="0" max="65535" value="${attr(record?.priority ?? 10)}"></label>
      <label class="field"><span>TTL</span><input name="ttl" type="number" min="1" max="86400" value="${attr(record?.ttl || 1)}"><em>1 表示自动</em></label>
      <label class="field" id="proxy-field"><span>代理状态</span><select name="proxied" id="dns-proxied"><option value="false" ${selectedProxy === 'false' ? 'selected' : ''}>仅 DNS</option><option value="true" ${selectedProxy === 'true' ? 'selected' : ''}>开启代理</option></select><em>A / AAAA / CNAME 可开启代理，TXT / MX 会自动使用仅 DNS</em></label>
      <div class="preview-box"><span>完整解析名</span><strong id="dns-name-preview">${esc(record?.name || a.fqdnUnicode)}</strong></div>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn primary" type="submit">提交解析</button></div>
    </form>
  `, 'wide');
  const typeSelect = document.querySelector('#dns-type');
  const priorityField = document.querySelector('#priority-field');
  const proxyField = document.querySelector('#proxy-field');
  const proxySelect = document.querySelector('#dns-proxied');
  const hostInput = document.querySelector('[name="host"]');
  const preview = document.querySelector('#dns-name-preview');
  const refresh = () => {
    const type = typeSelect.value;
    const host = hostInput.value.trim().replace(/^\.+|\.+$/g, '') || '@';
    priorityField.style.display = type === 'MX' ? '' : 'none';
    proxyField.style.display = ['A','AAAA','CNAME'].includes(type) ? '' : 'none';
    if (!['A','AAAA','CNAME'].includes(type)) proxySelect.value = 'false';
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

function showDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id);
  openModal('删除无效域名', '此操作只删除已拒绝或已撤销的无效域名记录，不影响正常域名。', `
    <div class="delete-box">
      <p>确认删除：</p>
      <strong>${esc(a?.fqdnUnicode || id)}</strong>
      <p class="danger-text">删除后该记录将从用户列表中隐藏。</p>
    </div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-delete">确认删除</button></div>
  `);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#confirm-delete').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}`, { method:'DELETE' });
      closeModal();
      toast('无效域名已删除', 'success');
      await renderDomains();
    } catch (error) { toast(error.message, 'error'); btn.disabled = false; }
  });
}


function showRequestDeleteDomainModal(id) {
  const a = state.applications.find(x => x.id === id) || {};
  openModal('申请删除域名', '正常域名需要管理员审核后才会删除。管理员通过后，系统会自动删除 Cloudflare DNS 记录并从列表隐藏。', `
    <div class="delete-box">
      <p>确认提交删除申请：</p>
      <strong>${esc(a.fqdnUnicode || id)}</strong>
      <p class="danger-text">提交后域名会显示“待删除审核”，审核期间仍占用额度。</p>
    </div>
    <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" id="confirm-request-delete">确认申请删除</button></div>
  `);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#confirm-request-delete').addEventListener('click', async e => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      await api(`/api/applications/${encodeURIComponent(id)}/delete-request`, { method:'POST', body:{} });
      closeModal();
      toast('删除申请已提交，等待管理员审核', 'success');
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

async function renderAccount() {
  shell('账户设置', `
    <div class="grid two">
      <section class="card"><h2>账户信息</h2><div class="info-list"><span>用户名</span><strong>${esc(state.me.username)}</strong><span>角色</span><strong>${state.me.role === 'admin' ? '管理员' : '普通用户'}</strong><span>域名额度</span><strong>${esc(state.me.domainQuota || state.quota.total || 3)}</strong></div></section>
      <section class="card"><h2>修改密码</h2><form id="password-form" class="form-grid"><label class="field wide"><span>当前密码</span><input name="currentPassword" type="password" required></label><label class="field wide"><span>新密码</span><input name="newPassword" type="password" required minlength="10"></label><button class="btn primary wide" type="submit">修改密码</button></form></section>
      <section class="card danger-zone account-delete-card"><h2>注销账号</h2><p>注销后账号将无法登录。为避免域名遗留，账户下仍有正常域名时需要先申请删除域名并等待管理员批准。</p><button class="btn danger" id="delete-account" type="button">注销账号</button></section>
    </div>`);
  document.querySelector('#password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/auth/change-password', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      toast('密码已修改，请重新登录', 'success');
      state.me = null;
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
  document.querySelector('#delete-account')?.addEventListener('click', showDeleteAccountModal);
}

function showDeleteAccountModal() {
  openModal('注销账号', '此操作不可直接恢复，请谨慎确认。', `
    <form id="delete-account-form" class="modal-form">
      <div class="delete-box"><p>当前账号：</p><strong>${esc(state.me.username)}</strong><p class="danger-text">注销后将退出登录，账号状态变为已删除。</p></div>
      <label class="field wide"><span>当前密码</span><input name="currentPassword" type="password" required></label>
      <label class="field wide"><span>输入用户名确认</span><input name="confirmUsername" placeholder="${attr(state.me.username)}" required></label>
      <div class="modal-actions"><button type="button" class="btn secondary" data-cancel>取消</button><button class="btn danger" type="submit">确认注销</button></div>
    </form>
  `, 'wide');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  document.querySelector('#delete-account-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api('/api/account/delete', { method:'POST', body:Object.fromEntries(new FormData(e.currentTarget)) });
      closeModal();
      toast('账号已注销', 'success');
      state.me = null;
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
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
      <section class="card"><h2>快速入口</h2><div class="quick-actions"><a class="btn primary" href="#/admin/applications">审核域名</a><a class="btn secondary" href="#/admin/users">用户管理</a><a class="btn secondary" href="#/admin/settings">管理员设置</a></div></section>`);
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
      <td>${a.dnsConfigured ? `<b>${esc(a.recordType)}</b> → <code>${esc(a.recordContent)}</code>` : '<span class="muted">未配置 DNS</span>'}</td>
      <td>${statusBadge(a.status, a.statusText)}</td>
      <td>${a.status === 'approved' && a.expiresAt ? fmtDate(a.expiresAt) : '—'}<br><small>${a.status === 'approved' ? esc(a.remainingText || '') : ''}</small></td>
      <td class="actions-cell">
        ${a.status === 'pending' ? `<button class="btn success small" data-review="approve" data-id="${a.id}">批准</button><button class="btn danger-soft small" data-review="reject" data-id="${a.id}">拒绝</button>` : ''}
        ${a.deleteRequested ? `<button class="btn danger small" data-review="approve-delete" data-id="${a.id}">批准删除</button><button class="btn soft small" data-review="reject-delete" data-id="${a.id}">拒绝删除</button>` : ''}
        ${a.status === 'approved' && !a.deleteRequested ? `<button class="btn danger-soft small" data-review="revoke" data-id="${a.id}">撤销</button><button class="btn danger-soft small" data-review="disable" data-id="${a.id}">禁用</button>` : ''}
        ${['rejected','revoked','disabled'].includes(a.status) ? `<button class="btn danger-soft small" data-review="delete" data-id="${a.id}">删除</button>` : ''}
      </td>
    </tr>`).join('');
    shell('域名审核', `<section class="card"><div class="section-head"><div><h2>域名审核</h2><p>先审核域名；审核通过后，用户才能进入域名管理添加 DNS 解析。</p></div></div><div class="table-wrap"><table><thead><tr><th>域名</th><th>用户</th><th>DNS</th><th>状态</th><th>到期</th><th>操作</th></tr></thead><tbody>${rows || '<tr><td colspan="6">暂无申请</td></tr>'}</tbody></table></div></section>`);
    document.querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', async () => {
      const action = btn.dataset.review;
      const label = { approve:'批准', reject:'拒绝', revoke:'撤销', disable:'禁用', delete:'删除', 'approve-delete':'批准删除', 'reject-delete':'拒绝删除' }[action];
      const confirmMessage = action === 'disable'
        ? '确认禁用该域名？禁用后将删除该域名所有 DNS 解析，用户不能继续管理该域名。'
        : `确认${label}该域名？`;
      if (!confirm(translateTextValue(confirmMessage))) return;
      const note = (action === 'delete' || action === 'approve-delete') ? '' : (prompt(translateTextValue('管理员备注，可留空；填写后用户域名界面会显示'), '') ?? '');
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
      <td><strong>${esc(u.username)}</strong><br><small>${esc(u.email || '未填写邮箱')}</small></td>
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
  const useTurnstile = !!turn.siteKey;
  openModal(tr('添加用户'), tr('管理员手动创建用户账号'), `
    <form id="create-user-form" class="modal-form">
      <div class="form-grid">
        <label class="field"><span>${tr('账号')}</span><input name="username" required minlength="3" maxlength="32" placeholder="${tr('例如：user001')}"></label>
        <label class="field"><span>${tr('邮箱')}</span><input name="email" type="email" placeholder="user@example.com"></label>
        <label class="field wide"><span>${tr('初始密码')}</span><input name="password" type="password" required minlength="10" placeholder="${tr('至少 10 位，包含字母和数字')}"><em>${tr('创建后用户可自行修改密码。')}</em></label>
        <label class="field"><span>${tr('角色')}</span><select name="role"><option value="user">${tr('用户')}</option><option value="admin">${tr('管理员')}</option></select></label>
        <label class="field"><span>${tr('状态')}</span><select name="status"><option value="active">${tr('启用')}</option><option value="disabled">${tr('禁用')}</option></select></label>
        <label class="field wide"><span>${tr('域名额度')}</span><input name="domainQuota" type="number" min="0" max="9999" value="${attr(defaultQuota)}"></label>
        ${useTurnstile ? '<div class="wide"><div id="admin-create-user-turnstile"></div></div>' : `<div class="notice wide">${tr('Turnstile 未配置，无法显示人机验证。')}</div>`}
      </div>
      <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>${tr('取消')}</button><button class="btn primary" type="submit">${tr('创建用户')}</button></div>
    </form>`, 'wide');
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
  if (useTurnstile) await mountTurnstile('#admin-create-user-turnstile', turn.actionRegister || 'register');
  document.querySelector('#create-user-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.turnstileToken = turnstileToken();
    try {
      await api('/api/admin/users', { method:'POST', body });
      closeModal();
      toast(tr('用户已创建'), 'success');
      renderAdminUsers();
    } catch (error) {
      toast(error.message, 'error');
      resetTurnstile();
      btn.disabled = false;
    }
  });
}

function showUserModal(u) {
  openModal('编辑用户', u.username, `
    <form id="user-form" class="modal-form">
      <label class="field wide"><span>角色</span><select name="role"><option value="user" ${u.role==='user'?'selected':''}>用户</option><option value="admin" ${u.role==='admin'?'selected':''}>管理员</option></select></label>
      <label class="field wide"><span>状态</span><select name="status"><option value="active" ${u.status==='active'?'selected':''}>启用</option><option value="disabled" ${u.status==='disabled'?'selected':''}>禁用</option></select></label>
      <label class="field wide"><span>域名额度</span><input name="domainQuota" type="number" min="0" max="9999" value="${attr(u.domainQuota || 3)}"></label>
      <div class="modal-actions"><button class="btn secondary" type="button" data-cancel>取消</button><button class="btn primary" type="submit">保存</button></div>
    </form>`);
  document.querySelector('[data-cancel]').addEventListener('click', closeModal);
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

async function renderAdminSettings() {
  shell('管理员设置', `<div class="loading-card">正在读取设置…</div>`);
  try {
    const { settings } = await api('/api/admin/settings');
    shell('管理员设置', `<section class="card admin-settings">
      <div class="tabs">
        <button class="tab active" data-tab="site">界面设置</button>
        <button class="tab" data-tab="registration">注册设置</button>
        <button class="tab" data-tab="domain">域名规则</button>
        <button class="tab" data-tab="dns">DNS配置</button>
      </div>

      <div class="tab-page active" data-page="site">
        <form id="site-form" class="form-grid">
          <label class="field"><span>网站标题</span><input name="title" value="${attr(settings.site.title)}"></label>
          <label class="field"><span>副标题</span><input name="subtitle" value="${attr(settings.site.subtitle)}"></label>
          <label class="field"><span>Logo文字</span><input name="logoText" maxlength="6" value="${attr(settings.site.logoText)}"></label>
          <label class="field"><span>页脚文字</span><input name="footer" value="${attr(settings.site.footer)}"></label>
          <label class="field"><span>主色</span><input name="accent" type="color" value="${attr(settings.site.accent)}"></label>
          <label class="field"><span>辅助色</span><input name="accent2" type="color" value="${attr(settings.site.accent2)}"></label>
          <button class="btn primary wide" type="submit">保存界面设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="registration">
        <form id="registration-form" class="form-grid">
          <label class="check wide"><input name="enabled" type="checkbox" ${settings.registration.enabled ? 'checked' : ''}> 开放用户注册</label>
          <label class="check wide"><input name="autoActivate" type="checkbox" ${settings.registration.autoActivate ? 'checked' : ''}> 注册后自动启用账户</label>
          <button class="btn primary wide" type="submit">保存注册设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="domain">
        <form id="domain-form" class="form-grid">
          <label class="field"><span>默认域名额度</span><input name="defaultQuota" type="number" min="1" max="9999" value="${attr(domainConfig(settings.domain).defaultQuota)}"></label>
          <label class="field"><span>默认有效天数</span><input name="validDays" type="number" min="1" max="3650" value="${attr(domainConfig(settings.domain).validDays)}"></label>
          <label class="field"><span>允许续期窗口/天</span><input name="renewWindowDays" type="number" min="1" max="3650" value="${attr(domainConfig(settings.domain).renewWindowDays)}"></label>
          <label class="check wide"><input name="allowUserDeleteInvalid" type="checkbox" ${domainConfig(settings.domain).allowUserDeleteInvalid ? 'checked' : ''}> 用户可删除无效域名</label>
          <label class="check wide"><input name="allowDnsEditAfterApproved" type="checkbox" ${domainConfig(settings.domain).allowDnsEditAfterApproved ? 'checked' : ''}> 生效后允许用户修改 DNS</label>
          <button class="btn primary wide" type="submit">保存域名规则</button>
        </form>
      </div>

      <div class="tab-page" data-page="dns">
        <div class="notice">DNS、Zone ID、API Token 当前建议通过 Cloudflare Workers 环境变量和机密管理，不在网页中暴露。</div>
        <div class="table-wrap"><table><thead><tr><th>根域名</th><th>Zone ID</th><th>允许类型</th><th>默认类型</th><th>TTL</th><th>代理</th></tr></thead><tbody>${settings.dns.suffixes.map(s => `<tr><td>${esc(s.suffix)}</td><td><code>${esc(s.zoneId || '未配置')}</code></td><td>${esc((s.allowedTypes || []).join(', '))}</td><td>${esc(s.defaultType)}</td><td>${esc(s.ttl)}</td><td>${s.proxied ? '是' : '否'}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted">对应变量：DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED、CF_API_TOKEN。</p>
      </div>
    </section>`);
    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-page="${btn.dataset.tab}"]`)?.classList.add('active');
    }));
    bindSettingForm('#site-form', 'site', f => Object.fromEntries(f));
    bindSettingForm('#registration-form', 'registration', f => ({ enabled:f.get('enabled')==='on', autoActivate:f.get('autoActivate')==='on' }));
    bindSettingForm('#domain-form', 'domain', f => ({
      defaultQuota:f.get('defaultQuota'),
      validDays:f.get('validDays'),
      renewWindowDays:f.get('renewWindowDays'),
      allowUserDeleteInvalid:f.get('allowUserDeleteInvalid')==='on',
      allowDnsEditAfterApproved:f.get('allowDnsEditAfterApproved')==='on',
    }));
  } catch (error) { toast(error.message, 'error'); }
}
function bindSettingForm(selector, group, mapper) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const { settings } = await api(`/api/admin/settings/${group}`, { method:'PUT', body:mapper(new FormData(form)) });
      state.config.site = settings.site;
      state.config.registration = settings.registration;
      state.config.domain = domainConfig(settings.domain);
      applyTheme();
      toast('设置已保存', 'success');
      btn.disabled = false;
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
}

async function mountTurnstile(selector, action) {
  const config = state.config.turnstile || {};
  if (!window.turnstile || !config.siteKey) return;
  const el = document.querySelector(selector);
  if (!el) return;
  state.widgetId = window.turnstile.render(el, { sitekey: config.siteKey, action, language: lang() === 'en' ? 'en' : 'zh-cn' });
}
function turnstileToken() {
  if (window.turnstile && state.widgetId !== null) return window.turnstile.getResponse(state.widgetId);
  return '';
}
function resetTurnstile() {
  if (window.turnstile && state.widgetId !== null) window.turnstile.reset(state.widgetId);
}


function startLiveI18nObserver() {
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

startLiveI18nObserver();
init().then?.(() => { try { afterRender(); } catch(e) {} });
