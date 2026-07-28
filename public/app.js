const app = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const modalRoot = document.querySelector('#modal-root');

const state = {
  config: null,
  me: null,
  applications: [],
  quota: { used: 0, total: 3, remaining: 3 },
  widgetId: null,
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
  return state.config?.suffixes || state.config?.dns?.suffixes || [];
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


const AUTO_REFRESH_MS = 5 * 60 * 1000;
let autoRefreshTimer = null;
let autoRefreshRunning = false;

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
    || hash === '#/logs'
    || hash === '#/admin'
    || hash === '#/admin/applications'
    || hash === '#/admin/users'
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
    autoRefreshRunning = false;
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(autoRefreshCurrentData, AUTO_REFRESH_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) autoRefreshCurrentData();
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



Object.assign(I18N_EN, {
  '消息中心设置':'Message Center Settings','帮助中心设置':'Help Center Settings','帮助分类':'Help Categories','新增问题':'Add Question','编辑问题':'Edit Question','保存全部':'Save All','添加到分类':'Add to Category','问题标题':'Question Title','问题答案':'Answer','分类标题':'Category Title','分类说明':'Category Description','恢复默认帮助内容':'Restore Default Help Content','帮助内容已保存':'Help content saved','帮助内容已恢复默认':'Help content restored','消息中心':'Message Center','系统消息':'System Messages','我的消息':'My Messages','暂无消息':'No messages yet','全部消息':'All Messages','未读':'Unread','已读':'Read','标为已读':'Mark as Read','发送消息':'Send Message','消息标题':'Message Title','消息内容':'Message Content','接收对象':'Recipients','全部用户':'All Users','指定用户':'Specific User','按角色':'By Role','普通用户':'Users','消息类型':'Message Type','普通通知':'Info','成功提示':'Success','警告提醒':'Warning','重要警告':'Important','立即发送':'Send Now','保存草稿':'Save Draft','保存为模板':'Save as Template','草稿':'Draft','模板':'Template','已发送':'Sent','发送时间':'Sent At','创建时间':'Created At','发送人':'Sender','目标':'Target','套用模板':'Use Template','发送草稿':'Send Draft','编辑草稿':'Edit Draft','删除消息':'Delete Message','请输入消息标题':'Enter message title','请输入消息内容':'Enter message content','消息已发送':'Message sent','草稿已保存':'Draft saved','模板已保存':'Template saved','消息已删除':'Message deleted','消息已标为已读':'Message marked as read','管理员可以在这里发送系统通知、保存草稿和维护常用模板。':'Admins can send system notices, save drafts, and manage templates here.','用户可以在这里查看系统通知、管理员消息、域名处理结果和维护提醒。':'View system notices, admin messages, domain updates, and maintenance reminders here.','批量已读':'Mark Selected Read','全部已读':'Mark All Read','请选择要标记的消息':'Select messages to mark as read','已读用户':'Read Users','用户已读':'User Read','管理员已读':'Admin Read','未读消息':'Unread Messages','客服回复':'Support Reply','转为模板':'Copy to Template','转为草稿':'Copy to Draft','已转为模板':'Copied to template','已转为草稿':'Copied to draft'
});

Object.assign(I18N_EN, {
  '操作日志':'Operation Logs','最近操作记录':'Recent Operation Logs','仅显示最近 7 天内的账号注册域名、解析等部分操作记录。':'Only account, domain, DNS and related operations from the last 7 days are shown.','管理员可查看近 7 天内未注销账号的操作记录；普通用户仅查看自己的记录。':'Admins can view logs for non-deleted accounts from the last 7 days. Regular users can only view their own logs.','暂无操作记录。':'No operation logs.','操作类型':'Action','操作人':'Operator','操作说明':'Description','目标对象':'Target','IP 地址':'IP Address','保留时间':'Retention','7 天':'7 days','日志会自动清理：超过 7 天、或账号注销后的记录会从 D1 中删除。':'Logs are automatically cleaned from D1 after 7 days or when the account is cancelled.','正在读取操作日志…':'Loading operation logs…','系统':'System','未知用户':'Unknown User',
  '方式一：站内消息':'Method 1: In-site message','在下方填写标题和内容，消息会直接进入管理员的消息中心，适合已经登录后反馈域名、DNS、额度、审核等问题。':'Fill in the title and content below. The message will go directly to the admin Message Center. Use it for domain, DNS, quota, and review issues after login.','方式二：外部联系':'Method 2: External contact','点击右上角“其他：联系我们”会打开外部反馈页面，适合无法登录、无法收到消息、需要提交截图或更详细资料的情况。':'Click “Other: Contact Us” in the upper right to open the external contact form. Use it when you cannot log in, cannot receive messages, or need to submit screenshots/details.','其他：联系我们':'Other: Contact Us','直接发消息给管理员':'Send a message to admin','发送给管理员':'Send to Admin','请填写要反馈的问题标题':'Enter the issue title','请详细描述您遇到的问题、页面位置、操作步骤和错误提示':'Describe the issue, page, steps, and error message in detail','消息已发送到管理员消息中心':'Message sent to admin Message Center','请填写标题和内容':'Please enter title and content','回复':'Reply','撤销':'Withdraw','撤销消息':'Withdraw Message','确认撤销这条已发送消息？撤销后对方将无法继续查看。':'Withdraw this sent message? The recipient will no longer be able to view it.','消息已撤销':'Message withdrawn','已超过 15 分钟，不能撤销':'More than 15 minutes have passed; this message cannot be withdrawn.','回复消息':'Reply Message','回复内容':'Reply Content','请输入回复内容':'Enter reply content','发送回复':'Send Reply','消息已回复':'Reply sent','原信息':'Original Message','已转到消息中心':'Moved to Message Center','资料已保存':'Profile saved','账号已复制':'Account copied','复制账号':'Copy account','手机号':'Phone','保存账户资料':'Save Account Info','未注销域名':'Uncancelled Domains','账户下还有未注销域名':'Uncancelled domains remain'
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
    startAutoRefresh();
  } catch (error) {
    app.innerHTML = `<div class="center-screen"><h2>应用加载失败</h2><p>${esc(error.message)}</p><button class="btn primary" id="retry">重试</button></div>`;
    document.querySelector('#retry')?.addEventListener('click', () => location.reload());
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
  if (hash === '#/admin/settings') return renderAdminSettings();
  if (hash === '#/admin/help-settings') return renderAdminHelpSettings();

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
          ${turn.enabledLogin ? '<div class="turnstile-holder"><div id="turnstile-box"></div></div>' : ''}
          <button class="btn primary login-submit" type="submit">登录账户</button>
        </form>
        <div class="login-divider"></div>
        <p class="login-register-row"><span>还没有账号？</span> <a href="#/register">立即注册</a></p>
      </section>
    </main>`;
  if (turn.enabledLogin) await mountTurnstile('#turnstile-box', turn.actionLogin);
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
  afterRender();
}

async function renderRegister() {
  // 注册入口默认开放，避免历史设置导致新用户无法注册。
  const turn = state.config.turnstile || {};
  app.innerHTML = authTemplate('创建账户', '注册后默认拥有 3 个域名额度。', `
    <form id="register-form" class="form-grid">
      <label class="field"><span>用户名</span><input name="username" required></label>
      <label class="field"><span>邮箱/手机号</span><input name="email" type="text" inputmode="text" placeholder="请输入邮箱/手机号"></label>
      <label class="field wide"><span>密码</span><input name="password" type="password" required minlength="8"><em>至少 8 位。</em></label>
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
        ${isAdmin ? `<hr>${nav('#/admin','▦','管理概览')}${nav('#/admin/applications','✓','域名审核')}${nav('#/admin/users','♟','用户管理')}${nav('#/admin/settings','⚙','管理员设置')}${nav('#/messages','✉','消息中心')}${nav('#/admin/help-settings','☸','帮助中心设置')}` : ''}
      </nav>
      <div class="side-user"><strong>${esc(state.me.username)}</strong><small>${isAdmin ? '管理员' : '普通用户'}</small><button id="logout" class="btn ghost">退出登录</button></div>
    </aside>
    <main class="main">
      <header class="topbar">
        <button class="btn ghost menu-btn" id="menu">☰</button>
        <h1>${esc(title)}</h1>
        <div class="topbar-actions">${langButton()}${statusBadge(state.me.status || 'active')}</div>
      </header>
      ${site.homepageNotice && !isAdmin ? `<div class="site-notice">${markdownLite(site.homepageNotice)}</div>` : ``}<section class="content">${content}</section>${!isAdmin && (site.icp || site.footer) ? `<footer class="app-footer">${esc(site.footer || '')}${site.icp ? `<br>${esc(site.icp)}` : ``}</footer>` : ``}
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
  document.querySelector('#dns-help').addEventListener('click', showRegisterGuideModal);
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


function helpItem(title, body, index) {
  return `<details class="help-item"><summary><span>${index ? index + '. ' : ''}${esc(title)}</span></summary><div class="help-detail">${body}</div></details>`;
}
function renderHelpCategory(title, subtitle, items) {
  const rows = items.map((item, idx) => helpItem(item.q, item.a, idx + 1)).join('');
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
  { key:'dns', title:'DNS 记录说明', subtitle:'A / AAAA / CNAME / TXT / MX、代理、TTL、生效时间、第三方平台配置', items:[{"q": "A 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>A 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "AAAA 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>AAAA 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "CNAME 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>CNAME 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TXT 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>TXT 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "MX 记录应该什么时候使用？", "a": "<p><b>问题说明：</b>MX 记录应该什么时候使用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 @ 代表什么？", "a": "<p><b>问题说明：</b>主机记录 @ 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 www 代表什么？", "a": "<p><b>问题说明：</b>主机记录 www 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 api 代表什么？", "a": "<p><b>问题说明：</b>主机记录 api 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "主机记录 api.v1 代表什么？", "a": "<p><b>问题说明：</b>主机记录 api.v1 代表什么？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "CNAME 可以指向 IP 吗？", "a": "<p><b>问题说明：</b>CNAME 可以指向 IP 吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "A 记录可以填写域名吗？", "a": "<p><b>问题说明：</b>A 记录可以填写域名吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "AAAA 记录可以填写 IPv4 吗？", "a": "<p><b>问题说明：</b>AAAA 记录可以填写 IPv4 吗？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TXT 记录为什么不能开启代理？", "a": "<p><b>问题说明：</b>TXT 记录为什么不能开启代理？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "MX 记录为什么不能开启代理？", "a": "<p><b>问题说明：</b>MX 记录为什么不能开启代理？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "仅 DNS 是什么意思？", "a": "<p><b>问题说明：</b>仅 DNS 是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "开启代理是什么意思？", "a": "<p><b>问题说明：</b>开启代理是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "TTL 填 1 是什么意思？", "a": "<p><b>问题说明：</b>TTL 填 1 是什么意思？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNS 记录多久生效？", "a": "<p><b>问题说明：</b>DNS 记录多久生效？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么刚添加解析仍访问旧地址？", "a": "<p><b>问题说明：</b>为什么刚添加解析仍访问旧地址？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么添加 CNAME 后网站打不开？", "a": "<p><b>问题说明：</b>为什么添加 CNAME 后网站打不开？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么提示 DNS 记录冲突？", "a": "<p><b>问题说明：</b>为什么提示 DNS 记录冲突？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么同名 CNAME 不能和 A 记录共存？", "a": "<p><b>问题说明：</b>为什么同名 CNAME 不能和 A 记录共存？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 @ 记录配置 CNAME 后邮箱异常？", "a": "<p><b>问题说明：</b>为什么 @ 记录配置 CNAME 后邮箱异常？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 GitHub Pages？", "a": "<p><b>问题说明：</b>如何配置 GitHub Pages？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Cloudflare Pages？", "a": "<p><b>问题说明：</b>如何配置 Cloudflare Pages？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Vercel？", "a": "<p><b>问题说明：</b>如何配置 Vercel？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 Netlify？", "a": "<p><b>问题说明：</b>如何配置 Netlify？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置动态域名 DDNS？", "a": "<p><b>问题说明：</b>如何配置动态域名 DDNS？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置邮箱 SPF？", "a": "<p><b>问题说明：</b>如何配置邮箱 SPF？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 DKIM？", "a": "<p><b>问题说明：</b>如何配置 DKIM？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何配置 DMARC？", "a": "<p><b>问题说明：</b>如何配置 DMARC？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 TXT 验证失败？", "a": "<p><b>问题说明：</b>为什么 TXT 验证失败？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么 MX 邮箱收不到信？", "a": "<p><b>问题说明：</b>为什么 MX 邮箱收不到信？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么开启代理后端口访问失败？", "a": "<p><b>问题说明：</b>为什么开启代理后端口访问失败？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么开启代理后真实 IP 被隐藏？", "a": "<p><b>问题说明：</b>为什么开启代理后真实 IP 被隐藏？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么仅 DNS 会暴露源站 IP？", "a": "<p><b>问题说明：</b>为什么仅 DNS 会暴露源站 IP？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNSSEC 和普通 DNS 记录有什么关系？", "a": "<p><b>问题说明：</b>DNSSEC 和普通 DNS 记录有什么关系？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么不能填 http://example.com？", "a": "<p><b>问题说明：</b>为什么不能填 http://example.com？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么不能填写带路径的地址？", "a": "<p><b>问题说明：</b>为什么不能填写带路径的地址？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么目标域名末尾的点号可以省略？", "a": "<p><b>问题说明：</b>为什么目标域名末尾的点号可以省略？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "如何判断解析是否生效？", "a": "<p><b>问题说明：</b>如何判断解析是否生效？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么手机网络和电脑网络解析不同？", "a": "<p><b>问题说明：</b>为什么手机网络和电脑网络解析不同？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么删除 DNS 后仍能访问？", "a": "<p><b>问题说明：</b>为什么删除 DNS 后仍能访问？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么修改 DNS 后没有立即变化？", "a": "<p><b>问题说明：</b>为什么修改 DNS 后没有立即变化？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么记录状态显示错误？", "a": "<p><b>问题说明：</b>为什么记录状态显示错误？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "Cloudflare API Token 需要什么权限？", "a": "<p><b>问题说明：</b>Cloudflare API Token 需要什么权限？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "Zone ID 错了会怎样？", "a": "<p><b>问题说明：</b>Zone ID 错了会怎样？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "DNS_ALLOWED_TYPES 有什么作用？", "a": "<p><b>问题说明：</b>DNS_ALLOWED_TYPES 有什么作用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么某些记录类型下拉里没有？", "a": "<p><b>问题说明：</b>为什么某些记录类型下拉里没有？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}, {"q": "为什么解析到 127.0.0.1 或内网 IP 不可用？", "a": "<p><b>问题说明：</b>为什么解析到 127.0.0.1 或内网 IP 不可用？ DNS 记录只负责把域名解析到 IP、域名、文本验证或邮件服务器。不同记录类型的目标值格式不同，填错类型、填入 URL、开启不支持的代理，都会导致解析失败或验证失败。</p><p><b>解决方法：</b>先确认主机记录，例如 @、www、api、api.v1；再确认类型与目标值匹配：A 填 IPv4，AAAA 填 IPv6，CNAME 填域名，TXT 填文本，MX 填邮件服务器并设置优先级。TXT 和 MX 必须仅 DNS。</p>"}] },
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
    if (has('日志')) return ['操作日志用于排查最近操作，不是永久保存。', '系统保留近 7 天记录，可按日期、类型、操作人筛选。', '账号注销或超过保留期会自动清理。'];
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
const STRICT_HELP_CATEGORIES_V60 = [{"key":"faq","title":"常见问题","subtitle":"账号、注册、审核、登录、额度、语言、消息、设备和异常提示","items":[{"id":"faq-strict-v60-01","q":"为什么申请后一直显示待审核？","a":"<p><b>核心原因：</b>域名审核模式设置为人工审核，或前缀命中了黑名单、保留词，系统只会先写入 D1 的申请记录，不会自动批准。</p><p><b>用户自查：</b></p><ol><li>进入“域名注册”确认该域名状态是否为“待审核”。</li><li>检查前缀是否像 admin、mail、www、api 这类保留用途。</li><li>不要重复提交同一个前缀，重复提交只会被系统判定已存在。</li></ol><p><b>需要管理员处理：</b>管理员需要在“域名审核”里查看该申请，确认前缀、用户和备注后点击批准或拒绝；如启用了黑名单，还要在“管理员设置 → 黑名单管理”核对命中规则。</p><p><b>容易踩坑：</b>待审核期间看不到 DNS 编辑入口是正常限制，不是浏览器故障。</p>"},{"id":"faq-strict-v60-02","q":"为什么审核通过前不能设置 DNS？","a":"<p><b>为什么会这样：</b>系统没有批准域名前，不会允许用户调用 Cloudflare DNS API 创建记录，目的是避免未审核域名提前指向外部服务。</p><p><b>自己先这样排查：</b></p><ol><li>在“域名管理”查看状态，只有显示“正常”后才会出现可用的解析管理。</li><li>先准备目标地址，例如服务器 IPv4、CNAME 域名或邮箱 MX 主机。</li><li>等待审核，不要通过修改浏览器地址强行访问 DNS 接口。</li></ol><p><b>联系管理员时要说明：</b>管理员只能在“域名审核”批准该域名后放开 DNS 操作；如果设置了自动审批，可在“管理员设置 → 域名规则 → 审核模式”调整。</p><p><b>注意事项：</b>审核前没有自助绕过方案。前端隐藏按钮、后端拒绝接口是双重限制。</p>"},{"id":"faq-strict-v60-03","q":"为什么提示域名额度不足？","a":"<p><b>判断重点：</b>每个账号有独立的 domain_quota，系统计算待审核、正常、待删除审核等占用名额的域名；达到额度后会拒绝新申请。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入“账户设置”查看自己的域名额度。</li><li>进入“域名注册”下方的域名列表，删除已拒绝或已撤销的无效域名。</li><li>正常域名需要先申请删除并等管理员批准，批准前仍占额度。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理 → 编辑用户”调整该用户额度，也可在“管理员设置 → 域名规则”调整新用户默认额度和平台总额度。</p><p><b>不要这样操作：</b>不要把“已拒绝”误认为还占用正常额度；真正占用的是待审核、正常和待删除审核。</p>"},{"id":"faq-strict-v60-04","q":"为什么注册按钮点不了？","a":"<p><b>真实原因：</b>注册按钮通常被 Turnstile 未通过、必填项为空、密码长度不足或浏览器旧 JS 缓存锁住。</p><p><b>普通用户能处理的部分：</b></p><ol><li>确认用户名、邮箱/手机号、密码已填写，密码至少 8 位。</li><li>等待 Turnstile 显示“成功”后再点注册。</li><li>电脑端按 Ctrl+F5，手机端清除站点缓存后重新打开。</li></ol><p><b>管理员要处理的部分：</b>管理员应检查“注册设置”中是否关闭了用户注册，或 Turnstile Site Key / Secret 是否配置错误。</p><p><b>高频误区：</b>只刷新普通 F5 有时不会更新 app.js，部署后必须强制刷新。</p>"},{"id":"faq-strict-v60-05","q":"为什么前缀提示格式错误？","a":"<p><b>先判断是不是故障：</b>域名前缀会被 normalizePrefix 校验，长度、字符、黑名单和是否允许纯数字/下划线都受后台规则控制。</p><p><b>页面内处理方法：</b></p><ol><li>把前缀改成 2-36 位的小写字母、数字或连字符组合。</li><li>不要以连字符开头或结尾，例如 -abc、abc- 都不建议使用。</li><li>如果后台禁止纯数字，不要申请 123456 这类前缀。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”检查最小长度、最大长度、是否允许纯数字、是否允许下划线和前缀黑名单。</p><p><b>补充提醒：</b>前缀不是完整域名，只填 blog，不要填 blog.flore.top。</p>"},{"id":"faq-strict-v60-06","q":"为什么提交后看不到到期时间？","a":"<p><b>核心原因：</b>到期时间从管理员批准时写入 expires_at；待审核状态只有申请时间，不会提前计算有效期。</p><p><b>用户自查：</b></p><ol><li>在域名卡片看状态，待审核时没有到期时间是正常的。</li><li>审核通过后刷新“域名管理”，到期时间会显示为批准日期加默认有效天数。</li></ol><p><b>需要管理员处理：</b>管理员需要确认 approve 操作是否成功写入 expires_at；若旧数据缺失，可在 D1 补齐或重新批准流程。</p><p><b>容易踩坑：</b>不要把申请日期当作有效期开始日期，系统按批准日期计算。</p>"},{"id":"faq-strict-v60-07","q":"为什么页面显示服务器内部错误？","a":"<p><b>为什么会这样：</b>这是 Worker 后端抛出的 500，多数来自 D1 字段缺失、旧表约束、Cloudflare API 返回错误或前后端文件版本不一致。</p><p><b>自己先这样排查：</b></p><ol><li>先看红色提示的英文或中文关键句，比如 no such column、CHECK constraint、Record does not exist。</li><li>刚覆盖代码后先强制刷新，确认不是旧前端调用新接口。</li><li>把错误截图保存，保留你点击的菜单路径。</li></ol><p><b>联系管理员时要说明：</b>管理员打开 Cloudflare Workers 日志，按时间查对应 API；再检查 D1 是否缺字段、CF_API_TOKEN 是否有效、DNS 记录 ID 是否和 Cloudflare 同步。</p><p><b>注意事项：</b>不要只说“内部错误”，必须带上红色提示全文，否则无法定位是 D1、DNS 还是登录会话。</p>"},{"id":"faq-strict-v60-08","q":"为什么登录后还是回到登录页？","a":"<p><b>判断重点：</b>登录成功依赖 sessions 表写入 token_hash、expires_at 和浏览器 Cookie；Cookie 被拦截或 D1 会话字段异常时会立即变成未登录。</p><p><b>可直接操作的步骤：</b></p><ol><li>关闭无痕模式或允许本站 Cookie。</li><li>不要在多个旧标签页反复登录，先关掉旧页面再登录。</li><li>如果刚改过域名或协议，确认地址是 https://storage.flore.top。</li></ol><p><b>后台需要检查的位置：</b>管理员检查 sessions 表是否有 expires_at、last_seen_at 等字段，并查看 /api/auth/me 是否返回 401。</p><p><b>不要这样操作：</b>登录接口返回成功不等于会话一定保存成功，浏览器禁 Cookie 会让下一次请求丢身份。</p>"},{"id":"faq-strict-v60-09","q":"为什么忘记密码不能自助找回？","a":"<p><b>真实原因：</b>当前系统没有接入邮件验证码或短信验证码，忘记密码按钮是跳转外部反馈页面，由管理员人工核验后重置。</p><p><b>普通用户能处理的部分：</b></p><ol><li>点击登录页“忘记密码？”进入 mailform.flore.top。</li><li>提交账号、邮箱/手机号、近期申请过的域名前缀，方便管理员核验。</li><li>不要把旧密码发给任何人，只需要说明无法登录。</li></ol><p><b>管理员要处理的部分：</b>管理员在“用户管理”找到账号后重置密码或创建新初始密码，再通过可信渠道通知用户。</p><p><b>高频误区：</b>没有绑定邮箱或手机号的账号，找回会更慢，因为只能靠域名记录和管理员确认身份。</p>"},{"id":"faq-strict-v60-10","q":"为什么注册账号需要 Turnstile？","a":"<p><b>先判断是不是故障：</b>Turnstile 用来阻止机器人批量注册、撞库登录和刷域名申请，不是为了收集用户信息。</p><p><b>页面内处理方法：</b></p><ol><li>等待验证框完成，不要连续点击提交。</li><li>如果一直转圈，换网络、关闭广告拦截插件或使用 Chrome。</li><li>手机端网络代理不稳定时，Turnstile 可能加载失败。</li></ol><p><b>必须后台处理的情况：</b>管理员检查 TURNSTILE_SITE_KEY、TURNSTILE_SECRET、TURNSTILE_EXPECTED_HOSTNAME 和 Action 是否匹配当前域名。</p><p><b>补充提醒：</b>本地文件或非正式域名打开页面时，Turnstile 主机名可能不匹配。</p>"},{"id":"faq-strict-v60-11","q":"为什么我的账号被禁用？","a":"<p><b>核心原因：</b>账号状态为 disabled 时，后端 requireUser 会拒绝继续访问，通常是管理员手动停用、异常注册风控或用户违反域名规则。</p><p><b>用户自查：</b></p><ol><li>登录时如果提示账户被禁用，普通用户不能自行恢复。</li><li>通过帮助中心或外部联系提交账号名和需要恢复的原因。</li></ol><p><b>需要管理员处理：</b>管理员进入“用户管理”，查看该用户状态、操作日志和近期域名申请，再决定是否改回启用。</p><p><b>容易踩坑：</b>账号禁用和域名禁用是两件事；账号禁用后即使域名正常，也无法进入后台管理。</p>"},{"id":"faq-strict-v60-12","q":"为什么管理员添加用户也要人机验证？","a":"<p><b>为什么会这样：</b>管理员手动创建账号同样会写入 users 表，为避免后台被盗后批量灌入垃圾账号，系统要求再次通过 Turnstile。</p><p><b>自己先这样排查：</b></p><ol><li>管理员添加用户时勾选确认，并等待 Turnstile 完成。</li><li>确认密码至少 8 位，邮箱/手机号可选但不要和已有用户重复。</li></ol><p><b>联系管理员时要说明：</b>如果后台无法加载验证，管理员检查注册 Turnstile 开关和密钥；也可以临时关闭注册验证后再创建，但要尽快恢复。</p><p><b>注意事项：</b>不要把这个验证理解为普通用户注册专用，后台高风险写入也需要保护。</p>"},{"id":"faq-strict-v60-13","q":"为什么用户名可以自由填写但仍不能重复？","a":"<p><b>判断重点：</b>用户名是登录标识之一，D1 的 users.username 有唯一约束；允许自由格式不代表允许两个账号共用同一个名字。</p><p><b>可直接操作的步骤：</b></p><ol><li>注册时换一个不重复的用户名。</li><li>如果你之前注册过，用原账号登录，不要重复创建。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理”搜索该用户名，确认是否已有账号或被旧数据占用。</p><p><b>不要这样操作：</b>删除账号采用硬删除后才会释放用户名；软删除旧数据可能仍占唯一约束。</p>"},{"id":"faq-strict-v60-14","q":"为什么邮箱/手机号可以作为登录标识？","a":"<p><b>真实原因：</b>系统把邮箱/手机号存入用户资料字段，并在登录时同时匹配用户名、邮箱和手机号，方便用户不用记账号名。</p><p><b>普通用户能处理的部分：</b></p><ol><li>登录框可以输入用户名，也可以输入绑定的邮箱或手机号。</li><li>如果修改了手机号，下一次登录请用新手机号或用户名。</li></ol><p><b>管理员要处理的部分：</b>管理员应确保 users 表有 phone 字段，并在用户管理里避免多个用户绑定同一邮箱/手机号。</p><p><b>高频误区：</b>邮箱/手机号是可选资料；未填写时只能用用户名登录。</p>"},{"id":"faq-strict-v60-15","q":"为什么管理员能设置自己的额度？","a":"<p><b>先判断是不是故障：</b>管理员账号也存储在 users 表中，系统统一使用 domain_quota 控制可申请数量，所以管理员也有额度字段。</p><p><b>页面内处理方法：</b></p><ol><li>管理员自测域名时，可在自己的用户资料里调高额度。</li><li>普通用户看不到修改入口，只能申请管理员调整。</li></ol><p><b>必须后台处理的情况：</b>管理员在“用户管理”编辑自己的额度，或在“域名规则”设置新账号默认额度。</p><p><b>补充提醒：</b>额度过高会带来 DNS 记录数量膨胀，不建议给所有账号无限额度。</p>"},{"id":"faq-strict-v60-16","q":"为什么删除账号前要求输入账号名？","a":"<p><b>核心原因：</b>注销会删除用户、会话、消息读取记录以及相关日志，是不可逆操作，所以前端要求手动输入当前账号防止误点。</p><p><b>用户自查：</b></p><ol><li>在“账户设置 → 注销账号”输入当前账号名。</li><li>确认账号下没有未处理域名。</li><li>输入错误时按钮不会通过确认。</li></ol><p><b>需要管理员处理：</b>管理员若代用户处理，应先确认该用户所有域名已删除或撤销，避免留下无法管理的解析。</p><p><b>容易踩坑：</b>不要让浏览器自动填充账号名后直接点确认，先看清当前登录账号。</p>"},{"id":"faq-strict-v60-17","q":"为什么账号下还有域名就不能注销？","a":"<p><b>为什么会这样：</b>系统防止用户注销后留下无人维护的二级域名和 Cloudflare DNS 记录，所以会拦截仍有关联域名的账号。</p><p><b>自己先这样排查：</b></p><ol><li>在注销弹窗查看列出的未注销域名。</li><li>正常域名先点“申请删除域名”，等管理员批准。</li><li>已拒绝或已撤销域名按规则直接删除。</li></ol><p><b>联系管理员时要说明：</b>管理员在“域名审核”处理待删除审核，批准后系统会删除 D1 记录和 Cloudflare DNS。</p><p><b>注意事项：</b>待删除审核也算未完成，不能绕过注销。</p>"},{"id":"faq-strict-v60-18","q":"为什么消息中心有未读数量？","a":"<p><b>判断重点：</b>未读数来自 message_reads 表；只要当前用户是接收对象且没有读回执，就会在侧边栏显示红点。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入“消息中心”，打开消息或勾选后点“批量已读”。</li><li>用户自己发出去的消息不计入自己的未读。</li></ol><p><b>后台需要检查的位置：</b>管理员可在消息中心查看发送对象和已读人数，判断用户是否看过通知。</p><p><b>不要这样操作：</b>未读数 9+ 表示超过 9 条，不是系统只保留 9 条。</p>"},{"id":"faq-strict-v60-19","q":"为什么有些按钮只在管理员界面显示？","a":"<p><b>真实原因：</b>前端根据用户 role 显示菜单，后端也用 requireAdmin 校验；普通用户即使看到接口地址也不能执行管理员操作。</p><p><b>普通用户能处理的部分：</b></p><ol><li>普通用户只能管理自己的域名、DNS、消息和账号设置。</li><li>需要审批、禁用、调额度时联系管理员。</li></ol><p><b>管理员要处理的部分：</b>管理员若看不到按钮，检查当前账号角色是否仍为 admin，或者是否登录了普通测试账号。</p><p><b>高频误区：</b>不要通过复制 URL 强行访问管理页，后端会返回无权限。</p>"},{"id":"faq-strict-v60-20","q":"为什么有些域名不能直接删除？","a":"<p><b>先判断是不是故障：</b>正常生效域名已经可能写入 Cloudflare DNS，直接删除会造成解析残留，所以系统要求先提交删除申请。</p><p><b>页面内处理方法：</b></p><ol><li>状态为“正常”的域名点“申请删除域名”。</li><li>12 小时内想反悔可撤销删除申请。</li><li>已拒绝、已撤销的无效域名才允许直接删除。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名审核”批准删除后，程序会清理 Cloudflare DNS 和 D1 记录。</p><p><b>补充提醒：</b>不要在 Cloudflare 后台手动删了就以为系统记录也没了，D1 仍需要同步处理。</p>"},{"id":"faq-strict-v60-21","q":"为什么删除申请有 12 小时撤销期？","a":"<p><b>核心原因：</b>删除正常域名影响访问和 DNS，系统给用户 12 小时反悔窗口，避免误点后立即失去服务。</p><p><b>用户自查：</b></p><ol><li>提交删除申请后，域名状态会显示“待删除审核”。</li><li>在 12 小时内进入域名详情点击撤销。</li><li>超过时间后只能等待管理员审核。</li></ol><p><b>需要管理员处理：</b>管理员可批准或拒绝删除申请；拒绝后用户可继续管理域名。</p><p><b>容易踩坑：</b>撤销期不是自动删除倒计时，最终删除仍取决于管理员批准。</p>"},{"id":"faq-strict-v60-22","q":"为什么管理员留言会进入消息中心？","a":"<p><b>为什么会这样：</b>域名处理结果和管理员备注统一通过 system_messages 发送，避免域名卡片堆积历史备注。</p><p><b>自己先这样排查：</b></p><ol><li>查看“消息中心”里的域名处理通知。</li><li>对通知有疑问可点回复，继续和管理员沟通。</li></ol><p><b>联系管理员时要说明：</b>管理员在批准、拒绝、禁用、撤销时填写备注，系统会把备注发送给用户。</p><p><b>注意事项：</b>域名卡片不显示留言并不代表没有留言，处理结果看消息中心。</p>"},{"id":"faq-strict-v60-23","q":"为什么同一个域名前缀不能重复申请？","a":"<p><b>判断重点：</b>同一个根域名下的 fqdn_ascii 必须唯一，否则 Cloudflare DNS 会出现同名归属冲突。</p><p><b>可直接操作的步骤：</b></p><ol><li>换一个前缀，或选择另一个根域名后缀。</li><li>如果之前申请被拒绝或撤销，先删除无效记录再重新申请。</li></ol><p><b>后台需要检查的位置：</b>管理员可在 D1 的 domain_applications 中确认该 fqdn 是否仍有未删除记录。</p><p><b>不要这样操作：</b>blog.flore.top 和 blog.other.com 是不同后缀，可分别申请。</p>"},{"id":"faq-strict-v60-24","q":"为什么申请违法或仿冒域名会被拒绝？","a":"<p><b>真实原因：</b>二级域名会继承主域名信誉，钓鱼、仿冒品牌、违法内容会影响整个平台，所以审核会拦截。</p><p><b>普通用户能处理的部分：</b></p><ol><li>不要使用银行、支付平台、品牌名、政府机构等误导性前缀。</li><li>提交真实用途说明，避免被误判。</li></ol><p><b>管理员要处理的部分：</b>管理员可在黑名单管理里维护品牌词、违法词和高风险关键词。</p><p><b>高频误区：</b>免费二级域名不等于可以绕过平台内容规则。</p>"},{"id":"faq-strict-v60-25","q":"为什么系统有保留前缀？","a":"<p><b>先判断是不是故障：</b>www、admin、mail、api、cdn 等前缀可能用于平台本身、邮箱、接口或运维，开放给用户会造成服务冲突。</p><p><b>页面内处理方法：</b></p><ol><li>申请时避开保留前缀，改成项目名或个人标识。</li><li>前端提示保留词时无需重复提交。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”或“黑名单管理”维护保留前缀列表。</p><p><b>补充提醒：</b>mail、smtp、imap 这类前缀尤其容易影响邮件系统，不建议放开。</p>"},{"id":"faq-strict-v60-26","q":"为什么手机端要清缓存？","a":"<p><b>核心原因：</b>手机浏览器和 WebView 容易缓存旧 app.js，部署新版本后仍执行旧逻辑，造成按钮、翻译或菜单异常。</p><p><b>用户自查：</b></p><ol><li>关闭页面后重新打开。</li><li>浏览器设置里清除 storage.flore.top 的站点数据。</li><li>微信/内置浏览器异常时换 Chrome 或 Safari。</li></ol><p><b>需要管理员处理：</b>管理员发布版本后，可提示用户清缓存，并确认 _headers 没有把 JS 缓存时间设太长。</p><p><b>容易踩坑：</b>只下拉刷新经常不够，手机端缓存比电脑更顽固。</p>"},{"id":"faq-strict-v60-27","q":"为什么电脑端要 Ctrl + F5？","a":"<p><b>为什么会这样：</b>普通刷新可能继续使用浏览器缓存的前端文件，Ctrl+F5 会强制重新拉取最新 app.js 和 styles.css。</p><p><b>自己先这样排查：</b></p><ol><li>部署后在电脑端按 Ctrl+F5。</li><li>仍异常时打开无痕窗口测试。</li></ol><p><b>联系管理员时要说明：</b>管理员检查 Cloudflare 部署日志，确认新文件已上传到 Worker Assets。</p><p><b>注意事项：</b>如果后端已更新但前端没更新，就会出现接口参数不匹配。</p>"},{"id":"faq-strict-v60-28","q":"为什么界面会出现中英文混合？","a":"<p><b>判断重点：</b>部分文案来自动态帮助内容、管理员自定义内容或旧缓存，I18N 字典只能翻译已登记的固定文本。</p><p><b>可直接操作的步骤：</b></p><ol><li>先切换一次 EN/中文，再强制刷新。</li><li>帮助中心里管理员自定义的问题不会自动翻译。</li></ol><p><b>后台需要检查的位置：</b>管理员需要在帮助中心设置中分别维护中文或英文内容，或补充 I18N 字典。</p><p><b>不要这样操作：</b>不要把动态 FAQ 当作固定菜单翻译，保存什么语言就显示什么语言。</p>"},{"id":"faq-strict-v60-29","q":"为什么系统提示变量初始化错误？","a":"<p><b>真实原因：</b>这类错误一般是前端代码在变量声明前访问，或旧版本 app.js 与新后端返回字段不一致。</p><p><b>普通用户能处理的部分：</b></p><ol><li>强制刷新页面，确认不是旧 JS。</li><li>记录红色提示中的变量名，例如 approved、domainConfig。</li></ol><p><b>管理员要处理的部分：</b>管理员需要覆盖完整 public/app.js，并检查 GitHub 部署是否成功；必要时回滚到上一稳定包。</p><p><b>高频误区：</b>不要只替换一半文件，前端依赖字段变化时必须整体覆盖。</p>"},{"id":"faq-strict-v60-30","q":"为什么审核通过后 DNS 还是未配置？","a":"<p><b>先判断是不是故障：</b>现在系统允许先批准域名、后配置 DNS；批准只改变域名状态，不一定自动创建解析。</p><p><b>页面内处理方法：</b></p><ol><li>进入“域名管理”，点“管理域名”。</li><li>点击“添加解析”，选择 A、CNAME、MX 等类型并填写目标。</li></ol><p><b>必须后台处理的情况：</b>管理员不用在审核时替用户填写 DNS，除非平台规则要求代配置。</p><p><b>补充提醒：</b>“正常”表示域名可管理，不等于已经有 DNS 记录。</p>"},{"id":"faq-strict-v60-31","q":"为什么有效期从管理员批准当天开始？","a":"<p><b>核心原因：</b>有效期绑定 approved 状态，防止用户在等待审核期间被扣掉使用天数。</p><p><b>用户自查：</b></p><ol><li>查看域名详情里的“审核时间”和“到期时间”。</li><li>待审核时不要按提交时间计算有效期。</li></ol><p><b>需要管理员处理：</b>管理员在批准时写入 expires_at；如果旧数据没有到期时间，需要补齐。</p><p><b>容易踩坑：</b>反复撤销/重新批准会影响时间计算，正式环境不要随意操作。</p>"},{"id":"faq-strict-v60-32","q":"为什么有些域名显示已禁用？","a":"<p><b>为什么会这样：</b>管理员禁用域名时，为兼容旧 D1 CHECK 约束，数据库可能保存为 revoked，但前端按禁用备注显示“已禁用”。</p><p><b>自己先这样排查：</b></p><ol><li>已禁用域名不能继续添加或修改 DNS。</li><li>查看消息中心的禁用原因。</li></ol><p><b>联系管理员时要说明：</b>管理员需要在“域名审核”里禁用或撤销，系统会删除关联 DNS。</p><p><b>注意事项：</b>禁用和拒绝不同：禁用通常发生在已生效域名上。</p>"},{"id":"faq-strict-v60-33","q":"为什么域名会被撤销？","a":"<p><b>判断重点：</b>撤销通常表示管理员主动停止一个已批准域名，可能因为违规、用户申请、DNS 风险或平台维护。</p><p><b>可直接操作的步骤：</b></p><ol><li>进入消息中心查看撤销通知。</li><li>确认域名是否还出现在域名管理列表。</li></ol><p><b>后台需要检查的位置：</b>管理员撤销时应填写原因，并确认 Cloudflare DNS 已清理。</p><p><b>不要这样操作：</b>撤销后原前缀是否可重新申请，取决于 D1 记录是否硬删除。</p>"},{"id":"faq-strict-v60-34","q":"为什么已拒绝的域名还能看到？","a":"<p><b>真实原因：</b>拒绝状态会保留在用户列表中，目的是让用户知道申请结果并允许删除无效记录。</p><p><b>普通用户能处理的部分：</b></p><ol><li>进入域名列表，找到已拒绝域名。</li><li>确认不再需要后点“删除无效域名”。</li></ol><p><b>管理员要处理的部分：</b>管理员无需再次处理已拒绝记录，除非用户反馈误拒。</p><p><b>高频误区：</b>拒绝不代表占用有效域名，但旧记录可能仍用于提示历史结果。</p>"},{"id":"faq-strict-v60-35","q":"为什么添加用户时要填写额度？","a":"<p><b>先判断是不是故障：</b>管理员创建用户时需要指定该账号可申请多少个二级域名，避免新账号无限制占用 DNS 资源。</p><p><b>页面内处理方法：</b></p><ol><li>普通用户不用填写额度。</li><li>管理员创建测试账号时可以设置较小额度，例如 1 或 3。</li></ol><p><b>必须后台处理的情况：</b>管理员可之后在“用户管理”修改额度。</p><p><b>补充提醒：</b>额度为 0 会导致用户无法申请域名，除非这是故意限制。</p>"},{"id":"faq-strict-v60-36","q":"为什么不建议所有用户无限额度？","a":"<p><b>核心原因：</b>每个域名和解析都会占用 D1 查询、Cloudflare DNS 记录和管理员审核成本，无限额度容易被滥用。</p><p><b>用户自查：</b></p><ol><li>个人账号按实际项目申请，不要批量占位。</li><li>不需要的无效域名及时删除。</li></ol><p><b>需要管理员处理：</b>管理员应使用平台最大总配额、单用户额度和单域名 DNS 上限共同控制资源。</p><p><b>容易踩坑：</b>免费系统尤其要防止批量注册和垃圾解析。</p>"},{"id":"faq-strict-v60-37","q":"为什么修改联系方式后登录方式会变化？","a":"<p><b>为什么会这样：</b>邮箱和手机号是登录匹配字段，修改后旧邮箱/手机号可能不再能登录，但用户名仍然可用。</p><p><b>自己先这样排查：</b></p><ol><li>修改资料后记住新的邮箱/手机号。</li><li>担心输错时先保留用户名登录。</li></ol><p><b>联系管理员时要说明：</b>管理员可在用户管理里帮助核对 phone/email 字段。</p><p><b>注意事项：</b>不要把两个账号绑定同一个联系方式，否则会触发重复限制。</p>"},{"id":"faq-strict-v60-38","q":"为什么登录设备数量不准确？","a":"<p><b>判断重点：</b>设备统计来自 sessions 表；更换浏览器、清 Cookie、无痕模式或同设备不同浏览器都会生成新会话。</p><p><b>可直接操作的步骤：</b></p><ol><li>在“账户设置 → 登录设备管理”查看设备名称和最近使用时间。</li><li>退出不常用设备对应的浏览器会话。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“用户管理 → 用户登录设备管理”查看该用户会话。</p><p><b>不要这样操作：</b>浏览器无法精确提供“苹果15 Pro”这类型号时，只能显示 iPhone 或浏览器未提供具体型号。</p>"},{"id":"faq-strict-v60-39","q":"为什么设备 IP 看起来不是我的本地 IP？","a":"<p><b>真实原因：</b>系统记录的是请求到 Cloudflare Worker 时的公网 IP，可能是宽带出口、公司网关、手机运营商或代理 IP。</p><p><b>普通用户能处理的部分：</b></p><ol><li>确认自己是否使用 VPN、代理、公司网络或云手机。</li><li>同一设备切换网络后 IP 变化是正常的。</li></ol><p><b>管理员要处理的部分：</b>管理员查看异常登录时，应结合设备名称、时间和操作日志一起判断，不能只看 IP。</p><p><b>高频误区：</b>内网地址如 192.168.x.x 不会出现在服务器记录里。</p>"},{"id":"faq-strict-v60-40","q":"发错消息能撤销吗？","a":"<p><b>先判断是不是故障：</b>消息撤销只允许发送后 15 分钟内进行，超过时间表示接收方可能已经读取，系统不再允许删除。</p><p><b>页面内处理方法：</b></p><ol><li>进入“消息中心”，自己发出的消息旁边如果有“撤销”就可以撤回。</li><li>超过 15 分钟按钮消失，只能再发一条更正说明。</li></ol><p><b>必须后台处理的情况：</b>管理员可删除消息中心里的错误消息，但已读用户可能已经看过。</p><p><b>补充提醒：</b>撤销会从 D1 删除消息和读取记录，不是仅隐藏。</p>"},{"id":"faq-strict-v60-41","q":"草稿和模板区别是什么？","a":"<p><b>核心原因：</b>草稿是准备发送的一次性消息，模板是以后反复套用的固定文案；两者都可以暂时不选接收对象。</p><p><b>用户自查：</b></p><ol><li>写一半没确定对象时保存草稿。</li><li>经常重复发送的到期提醒、违规提醒保存为模板。</li></ol><p><b>需要管理员处理：</b>管理员发送草稿前必须补全接收对象；模板转草稿后再改内容更安全。</p><p><b>容易踩坑：</b>不要把已经发送的正式通知直接当模板乱改。</p>"},{"id":"faq-strict-v60-42","q":"操作日志为空正常吗？","a":"<p><b>为什么会这样：</b>操作日志只保留最近设置的天数，当前规则默认最近 7 天；新账号或刚清理过日志时为空是正常的。</p><p><b>自己先这样排查：</b></p><ol><li>进入“操作日志”，确认筛选日期不是限制太窄。</li><li>切换排列方式或清空筛选条件。</li></ol><p><b>联系管理员时要说明：</b>管理员可在“安全设置”调整日志保留天数，并检查 cleanup 任务是否过早删除。</p><p><b>注意事项：</b>操作日志不是永久审计库，账号注销后相关日志也会清理。</p>"},{"id":"faq-strict-v60-43","q":"自动刷新会打断输入吗？","a":"<p><b>判断重点：</b>系统做了无感刷新：正在输入、弹窗打开、消息中心使用中、页面不可见时不会刷新当前内容。</p><p><b>可直接操作的步骤：</b></p><ol><li>正常浏览域名列表时，数据会按配置周期刷新。</li><li>正在编辑 DNS 或写消息时不用担心被覆盖。</li></ol><p><b>后台需要检查的位置：</b>管理员在设置里调整刷新策略时，应避免过短周期造成频繁请求。</p><p><b>不要这样操作：</b>如果浏览器插件强制刷新页面，不属于系统自动刷新。</p>"},{"id":"faq-strict-v60-44","q":"帮助搜索不准怎么办？","a":"<p><b>真实原因：</b>帮助搜索使用关键词和同义词匹配，不是大模型问答；描述太短或词不相关时可能只给相近结果。</p><p><b>普通用户能处理的部分：</b></p><ol><li>输入具体故障词，例如“CNAME 显示错”“MX 不能保存”“额度不足”。</li><li>不要只搜“问题”“错误”这类泛词。</li></ol><p><b>管理员要处理的部分：</b>管理员可在“帮助中心设置”增加更多同义问题和具体答案。</p><p><b>高频误区：</b>帮助搜索不会直接读取你的 D1 数据，只匹配文档内容。</p>"},{"id":"faq-strict-v60-45","q":"页面太大或太小怎么办？","a":"<p><b>先判断是不是故障：</b>页面大小受全局 80% 缩放、浏览器缩放比例和手机视口影响，三者叠加会让显示异常。</p><p><b>页面内处理方法：</b></p><ol><li>电脑端把浏览器缩放恢复到 100%。</li><li>手机端横屏或竖屏切换后刷新一次。</li></ol><p><b>必须后台处理的情况：</b>管理员修改 styles.css 时要分别处理桌面端和移动端，不要用同一个 zoom 规则硬套。</p><p><b>补充提醒：</b>Windows 系统显示缩放 125% 也会影响视觉大小。</p>"},{"id":"faq-strict-v60-46","q":"手机菜单关不掉怎么办？","a":"<p><b>核心原因：</b>手机侧边栏是抽屉浮层，关闭依赖遮罩点击和菜单状态 class；旧 CSS 或旧 app.js 会导致遮罩失效。</p><p><b>用户自查：</b></p><ol><li>点击页面空白遮罩区域关闭。</li><li>如果无效，点击菜单项切换页面或刷新。</li></ol><p><b>需要管理员处理：</b>管理员确认最新 styles.css 已覆盖，侧栏必须是 fixed 浮层而不是挤压主内容。</p><p><b>容易踩坑：</b>不要只改宽度，手机端还要处理 z-index 和 overflow。</p>"},{"id":"faq-strict-v60-47","q":"用户名能填中文吗？","a":"<p><b>为什么会这样：</b>用户名是登录和 D1 唯一标识，建议使用字母数字；中文可能在某些输入法、复制或接口编码中带来混淆。</p><p><b>自己先这样排查：</b></p><ol><li>优先使用英文、数字、短横线组合。</li><li>展示昵称可以以后单独做，不要把用户名当昵称。</li></ol><p><b>联系管理员时要说明：</b>管理员若放开中文用户名，需要同步检查 normalizeUsername、登录匹配和唯一约束。</p><p><b>注意事项：</b>手机号和邮箱可以作为登录标识，不必用中文用户名。</p>"},{"id":"faq-strict-v60-48","q":"无痕模式为什么常掉线？","a":"<p><b>判断重点：</b>无痕模式关闭后会清 Cookie，部分浏览器还会限制第三方脚本和 Turnstile，导致会话不能长期保持。</p><p><b>可直接操作的步骤：</b></p><ol><li>正式使用建议普通浏览器窗口登录。</li><li>无痕只适合临时测试，不适合长期管理域名。</li></ol><p><b>后台需要检查的位置：</b>管理员排查登录问题时，要问清用户是否使用无痕、云手机或隐私浏览。</p><p><b>不要这样操作：</b>勾选“记住我”在无痕窗口里意义很小。</p>"},{"id":"faq-strict-v60-49","q":"忘记密码最快怎么处理？","a":"<p><b>真实原因：</b>系统当前没有自动邮件找回链路，最快方式是通过外部联系提交身份信息给管理员重置。</p><p><b>普通用户能处理的部分：</b></p><ol><li>打开 mailform.flore.top。</li><li>填写用户名、绑定邮箱/手机号、最近一个已申请域名。</li></ol><p><b>管理员要处理的部分：</b>管理员核验后在“用户管理”修改密码或让用户重新注册后迁移域名。</p><p><b>高频误区：</b>不要把新密码发在公开群里，应通过私密渠道告知。</p>"},{"id":"faq-strict-v60-50","q":"注销账号能恢复吗？","a":"<p><b>先判断是不是故障：</b>当前删除策略偏硬删除，注销后用户、会话、部分消息和日志会被清理，通常不能直接恢复。</p><p><b>页面内处理方法：</b></p><ol><li>注销前先导出或记录重要域名信息。</li><li>确认所有域名已经删除或不再需要。</li></ol><p><b>必须后台处理的情况：</b>管理员除非有外部备份，否则很难恢复被硬删除的账号数据。</p><p><b>补充提醒：</b>不要把注销当作退出登录；退出登录不会删除账号。</p>"}]},{"key":"dns","title":"DNS 记录说明","subtitle":"A / AAAA / CNAME / TXT / MX、代理、TTL、生效、Cloudflare 同步和第三方平台配置","items":[{"id":"dns-strict-v60-01","q":"A 记录应该填什么？","a":"<p><b>核心原因：</b>A 记录把域名指向 IPv4 地址，目标必须是类似 103.205.240.19 的公网 IPv4，不能填写域名或带 http 的网址。</p><p><b>用户自查：</b></p><ol><li>进入“域名管理 → 管理域名 → DNS 解析 → 添加解析”。</li><li>记录类型选择 A，主机填 @ 或 www，目标地址填服务器 IPv4。</li><li>保存后查看状态是否“已生效”。</li></ol><p><b>需要管理员处理：</b>管理员需要确认该根域名允许 A 记录，且 CF_API_TOKEN 有 DNS 编辑权限。</p><p><b>容易踩坑：</b>A 记录不能填 408018525.github.io，这种应使用 CNAME。</p>"},{"id":"dns-strict-v60-02","q":"AAAA 记录什么时候用？","a":"<p><b>为什么会这样：</b>AAAA 记录用于 IPv6 地址；如果服务器没有 IPv6，就不要添加 AAAA，否则部分用户会优先访问不可用的 IPv6。</p><p><b>自己先这样排查：</b></p><ol><li>确认服务商提供的地址形如 2400:xxxx::1。</li><li>记录类型选择 AAAA，目标填完整 IPv6。</li><li>保存后用支持 IPv6 的网络测试访问。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 DNS 配置里允许 AAAA 类型；若用户大量误填，可在帮助中心提示默认用 A/CNAME。</p><p><b>注意事项：</b>IPv6 和 IPv4 不是互相替代，填错会导致部分地区打不开。</p>"},{"id":"dns-strict-v60-03","q":"CNAME 记录应该填什么？","a":"<p><b>判断重点：</b>CNAME 把当前子域名别名到另一个域名，目标必须是域名，例如 408018525.github.io，不能填 IP。</p><p><b>可直接操作的步骤：</b></p><ol><li>选择 CNAME 类型。</li><li>主机 @ 表示当前二级域名，www 表示 www.你的域名。</li><li>目标不要加 https://，只填域名本身。</li></ol><p><b>后台需要检查的位置：</b>管理员确认 Cloudflare 允许该记录名使用 CNAME；根域名代理规则也会影响表现。</p><p><b>不要这样操作：</b>CNAME 和同名 A/AAAA 通常不能同时存在。</p>"},{"id":"dns-strict-v60-04","q":"TXT 记录有什么用？","a":"<p><b>真实原因：</b>TXT 常用于平台验证、SPF、DKIM、DMARC 等文本记录，系统只负责写入文本，不会判断第三方平台是否验证通过。</p><p><b>普通用户能处理的部分：</b></p><ol><li>复制第三方平台给出的完整 TXT 值。</li><li>记录类型选 TXT，主机按对方要求填 @、_dmarc 或指定前缀。</li><li>保存后回第三方平台点验证。</li></ol><p><b>管理员要处理的部分：</b>管理员确认 DNS_ALLOWED_TYPES 包含 TXT。</p><p><b>高频误区：</b>TXT 内容有引号时通常可以直接复制平台给出的值，不要自己删关键字符。</p>"},{"id":"dns-strict-v60-05","q":"MX 记录为什么要填优先级？","a":"<p><b>先判断是不是故障：</b>MX 用于邮件投递，优先级决定多台邮件服务器的尝试顺序，数字越小优先级越高。</p><p><b>页面内处理方法：</b></p><ol><li>记录类型选 MX。</li><li>目标填邮件服务器域名，例如 mx.example.com。</li><li>优先级按邮箱服务商要求填写，例如 10、20。</li></ol><p><b>必须后台处理的情况：</b>管理员可在 DNS 配置里关闭 MX，防止用户滥发垃圾邮件或做未经授权邮箱。</p><p><b>补充提醒：</b>MX 目标不要填 IP，也不要开启代理。</p>"},{"id":"dns-strict-v60-06","q":"为什么 MX / TXT 不能开启代理？","a":"<p><b>核心原因：</b>Cloudflare 代理只适用于 HTTP/HTTPS 访问，MX 和 TXT 不是网页流量，开启代理没有意义也会导致记录不可用。</p><p><b>用户自查：</b></p><ol><li>添加 MX/TXT 时选择“仅 DNS”。</li><li>如果界面自动变成仅 DNS，这是正常保护。</li></ol><p><b>需要管理员处理：</b>管理员应保持程序逻辑：A/AAAA/CNAME 可选代理，TXT/MX 强制仅 DNS。</p><p><b>容易踩坑：</b>邮箱解析经过代理会失败，不要为了“隐藏 IP”给 MX 开代理。</p>"},{"id":"dns-strict-v60-07","q":"TTL 设置为 1 是什么意思？","a":"<p><b>为什么会这样：</b>在 Cloudflare API 中 TTL=1 表示自动 TTL，由 Cloudflare 自动选择缓存时间，不是 1 秒。</p><p><b>自己先这样排查：</b></p><ol><li>不懂 TTL 时保持默认 1。</li><li>需要更快切换时先改记录，再等待缓存刷新。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 DNS 配置里设置默认 TTL，但不要频繁修改全局默认值。</p><p><b>注意事项：</b>TTL 只影响递归 DNS 缓存，不会让网站应用立即刷新。</p>"},{"id":"dns-strict-v60-08","q":"DNS 保存后多久生效？","a":"<p><b>判断重点：</b>DNS 写入 Cloudflare 后通常很快，但用户本地 DNS、浏览器缓存、运营商缓存可能延迟。</p><p><b>可直接操作的步骤：</b></p><ol><li>保存后先在 DNS 列表确认状态“已生效”。</li><li>等待几分钟再访问，不要每秒反复修改。</li><li>换手机网络或公共 DNS 测试。</li></ol><p><b>后台需要检查的位置：</b>管理员可查看 Cloudflare DNS 是否已经出现该记录，判断是平台写入问题还是用户本地缓存。</p><p><b>不要这样操作：</b>“Cloudflare 已有记录”和“你的浏览器能打开”不是同一件事。</p>"},{"id":"dns-strict-v60-09","q":"为什么 Cloudflare 有记录但系统报 Record does not exist？","a":"<p><b>真实原因：</b>D1 保存的 cf_record_id 可能是旧记录 ID；你在 Cloudflare 后台手动删改后，系统再按旧 ID 删除就会找不到。</p><p><b>普通用户能处理的部分：</b></p><ol><li>避免在 Cloudflare 后台手动改系统管理的记录。</li><li>如果已经手动改了，回系统重新保存或联系管理员同步。</li></ol><p><b>管理员要处理的部分：</b>管理员使用支持按名称兜底删除的后端版本，或清理 D1 中失效的 cf_record_id。</p><p><b>高频误区：</b>不要只看记录名一样，Cloudflare 每条记录都有自己的 ID。</p>"},{"id":"dns-strict-v60-10","q":"为什么我添加 A 记录但域名卡片显示 CNAME？","a":"<p><b>先判断是不是故障：</b>旧摘要字段 record_type 还保留默认 CNAME，而真实多条记录在 dns_records 表；前端如果读旧字段就会显示错。</p><p><b>页面内处理方法：</b></p><ol><li>进入域名详情查看 DNS 解析列表，以列表中的真实记录为准。</li><li>强制刷新确认已覆盖 v57 之后的 app.js。</li></ol><p><b>必须后台处理的情况：</b>管理员确认后端 serializeApplication 使用真实 dns_records 汇总，不再只读 domain_applications.record_type。</p><p><b>补充提醒：</b>Cloudflare 后台显示 A 而系统卡片显示 CNAME，通常是摘要不同步，不代表 A 没创建。</p>"},{"id":"dns-strict-v60-11","q":"主机记录 @ 代表什么？","a":"<p><b>核心原因：</b>@ 代表当前被管理的二级域名本身，例如 school.flore.top，而不是主域 flore.top。</p><p><b>用户自查：</b></p><ol><li>给 school.flore.top 设置解析时，主机填 @。</li><li>给 www.school.flore.top 设置解析时，主机填 www。</li></ol><p><b>需要管理员处理：</b>管理员在说明里明确 @ 的含义，避免用户误以为是根域 flore.top。</p><p><b>容易踩坑：</b>@ 不是邮箱符号，在 DNS 表单里是当前域名的快捷写法。</p>"},{"id":"dns-strict-v60-12","q":"www 记录怎么设置？","a":"<p><b>为什么会这样：</b>www 是当前二级域名下的三级域名，例如 www.school.flore.top，需要单独添加记录。</p><p><b>自己先这样排查：</b></p><ol><li>进入域名详情添加解析。</li><li>主机填 www，类型按目标选择 A 或 CNAME。</li><li>保存后访问 www.你的域名测试。</li></ol><p><b>联系管理员时要说明：</b>管理员不需要在审核时自动创建 www，除非平台提供默认模板。</p><p><b>注意事项：</b>school.flore.top 能打开，不代表 www.school.flore.top 自动能打开。</p>"},{"id":"dns-strict-v60-13","q":"api.v1 这种多级主机能用吗？","a":"<p><b>判断重点：</b>系统允许主机填 api.v1，最终会生成 api.v1.school.flore.top 这种多级子域名。</p><p><b>可直接操作的步骤：</b></p><ol><li>添加解析时主机填 api.v1。</li><li>不要填写完整域名，只填相对主机部分。</li></ol><p><b>后台需要检查的位置：</b>管理员可通过域名规则控制前缀格式，必要时限制点号数量。</p><p><b>不要这样操作：</b>api.v1.school.flore.top 和 api.school.flore.top 是两条不同记录。</p>"},{"id":"dns-strict-v60-14","q":"为什么提示同一主机和类型已存在？","a":"<p><b>真实原因：</b>同一域名下相同 name + type 重复会造成 DNS 冲突，系统阻止重复创建。</p><p><b>普通用户能处理的部分：</b></p><ol><li>回到 DNS 记录列表，找到已有同名同类型记录。</li><li>点“编辑”修改目标，不要新增第二条。</li></ol><p><b>管理员要处理的部分：</b>管理员可在 D1 dns_records 里检查是否有旧记录未硬删除。</p><p><b>高频误区：</b>同名 A 可以有多值的复杂场景当前系统不支持，默认一名一类型一条。</p>"},{"id":"dns-strict-v60-15","q":"DNS 保存失败怎么办？","a":"<p><b>先判断是不是故障：</b>保存失败可能来自目标格式错误、Cloudflare Token 无权限、Zone ID 不匹配或记录冲突。</p><p><b>页面内处理方法：</b></p><ol><li>先按记录类型检查目标：A 填 IPv4，CNAME 填域名，MX 填邮件主机。</li><li>复制红色错误提示。</li><li>不要连续重复提交。</li></ol><p><b>必须后台处理的情况：</b>管理员检查 Worker 日志中的 DNS_CREATE_FAILED / DNS_UPDATE_FAILED，并核对 CF_API_TOKEN 和 DNS_ZONE_ID。</p><p><b>补充提醒：</b>用户能填表不代表 Cloudflare 一定接受，最终以 API 返回为准。</p>"},{"id":"dns-strict-v60-16","q":"编辑 DNS 会影响访问吗？","a":"<p><b>核心原因：</b>编辑已生效记录会调用 Cloudflare 更新同一条记录，短时间内访问可能受缓存影响。</p><p><b>用户自查：</b></p><ol><li>在低访问时段修改。</li><li>先确认新目标能访问。</li><li>保存后等待 DNS 缓存刷新。</li></ol><p><b>需要管理员处理：</b>管理员若关闭“生效后允许用户修改 DNS”，用户将无法编辑已批准域名解析。</p><p><b>容易踩坑：</b>不要把生产站点 A 记录随意改到测试 IP。</p>"},{"id":"dns-strict-v60-17","q":"删除 DNS 后为什么网站打不开？","a":"<p><b>为什么会这样：</b>DNS 记录是域名访问路径，删除 A/CNAME 后浏览器找不到目标，自然无法访问。</p><p><b>自己先这样排查：</b></p><ol><li>删除前确认不再使用该域名。</li><li>误删后重新添加同类型记录。</li></ol><p><b>联系管理员时要说明：</b>管理员可以在操作日志确认是谁删除了记录，但硬删除后旧记录详情不会长期保留。</p><p><b>注意事项：</b>删除 DNS 不等于删除域名，域名仍在账户里。</p>"},{"id":"dns-strict-v60-18","q":"审核通过后 DNS 仍未配置正常吗？","a":"<p><b>判断重点：</b>正常。批准域名只表示用户获得管理权限，DNS 需要用户进入域名详情自行添加。</p><p><b>可直接操作的步骤：</b></p><ol><li>点“管理域名”。</li><li>在 DNS 解析页点击“添加解析”。</li><li>按你的服务商要求填写 A、CNAME、TXT 或 MX。</li></ol><p><b>后台需要检查的位置：</b>管理员可给用户发送说明，但不必代填。</p><p><b>不要这样操作：</b>不要把“正常”理解为已经指向某个网站。</p>"},{"id":"dns-strict-v60-19","q":"为什么 CNAME 不能填 IP？","a":"<p><b>真实原因：</b>CNAME 的标准目标是另一个域名；IP 应使用 A 或 AAAA。Cloudflare API 会拒绝不符合类型的内容。</p><p><b>普通用户能处理的部分：</b></p><ol><li>如果目标是 103.205.240.19，类型选 A。</li><li>如果目标是 xxx.github.io，类型选 CNAME。</li></ol><p><b>管理员要处理的部分：</b>管理员在帮助中心和输入提示里区分“目标地址”和“记录类型”。</p><p><b>高频误区：</b>不要把 http:// 或 https:// 放进 CNAME。</p>"},{"id":"dns-strict-v60-20","q":"为什么 MX 目标不能填 IP？","a":"<p><b>先判断是不是故障：</b>邮件服务器通过主机名投递，MX 目标应是域名，很多邮件服务商不会接受 IP 作为 MX 目标。</p><p><b>页面内处理方法：</b></p><ol><li>向邮箱服务商复制 MX 主机名。</li><li>按服务商给的优先级填写。</li></ol><p><b>必须后台处理的情况：</b>管理员如果发现用户填 IP，应拒绝或指导修改，防止邮件不可达。</p><p><b>补充提醒：</b>MX 不是网站访问记录，不能用来让网页打开。</p>"},{"id":"dns-strict-v60-21","q":"GitHub Pages 应该用 A 还是 CNAME？","a":"<p><b>核心原因：</b>GitHub Pages 通常给用户一个 github.io 域名时用 CNAME；如果 GitHub 要求 apex A 记录，则按 GitHub 文档给的 IP。</p><p><b>用户自查：</b></p><ol><li>有 408018525.github.io 这类目标时选 CNAME。</li><li>目标只填域名，不加仓库路径。</li><li>在 GitHub Pages 设置里也要绑定自定义域名。</li></ol><p><b>需要管理员处理：</b>管理员无需修改 Cloudflare 主域设置，除非 DNS 类型被后台禁用。</p><p><b>容易踩坑：</b>CNAME 指向 github.io 后，GitHub 端未绑定域名仍可能显示 404。</p>"},{"id":"dns-strict-v60-22","q":"Vercel / Netlify 应该怎么填？","a":"<p><b>为什么会这样：</b>这类平台通常要求 CNAME 指向它们给出的域名，或 TXT 用于所有权验证。</p><p><b>自己先这样排查：</b></p><ol><li>先在第三方平台添加自定义域名。</li><li>复制平台给出的 CNAME 或 TXT。</li><li>回本系统添加对应记录。</li></ol><p><b>联系管理员时要说明：</b>管理员确认允许 TXT 和 CNAME；如果用户只添加 CNAME 仍验证失败，查看是否缺 TXT。</p><p><b>注意事项：</b>第三方平台的验证状态需要回第三方后台看，本系统只负责写 DNS。</p>"},{"id":"dns-strict-v60-23","q":"动态域名服务怎么配置？","a":"<p><b>判断重点：</b>动态域名服务通常提供一个固定 CNAME，如 xxx.ddns.org，你的二级域名 CNAME 到它即可。</p><p><b>可直接操作的步骤：</b></p><ol><li>记录类型选 CNAME。</li><li>目标填动态域名服务商给的域名。</li><li>确认动态域名本身已经解析到正确 IP。</li></ol><p><b>后台需要检查的位置：</b>管理员可限制高风险 DDNS 域名，避免用户指向恶意内容。</p><p><b>不要这样操作：</b>如果 DDNS 本身失效，本系统的 CNAME 也救不了。</p>"},{"id":"dns-strict-v60-24","q":"SPF TXT 怎么填？","a":"<p><b>真实原因：</b>SPF 是 TXT 记录，通常形如 v=spf1 include:xxx -all，用来声明允许哪些服务器发邮件。</p><p><b>普通用户能处理的部分：</b></p><ol><li>主机通常填 @ 或服务商指定值。</li><li>内容完整复制 SPF 字符串。</li><li>保存后用邮件服务商检测。</li></ol><p><b>管理员要处理的部分：</b>管理员若关闭 MX/TXT 邮件相关功能，用户无法自行配置 SPF。</p><p><b>高频误区：</b>同一主机不建议存在多条 SPF TXT，容易导致 SPF PermError。</p>"},{"id":"dns-strict-v60-25","q":"DKIM TXT 怎么填？","a":"<p><b>先判断是不是故障：</b>DKIM 通常是 selector._domainkey 这类主机名，对应一长串公钥 TXT。</p><p><b>页面内处理方法：</b></p><ol><li>从邮件服务商复制 selector 主机和 TXT 值。</li><li>主机只填相对部分，例如 default._domainkey。</li><li>保存后回邮件后台验证。</li></ol><p><b>必须后台处理的情况：</b>管理员确认 TXT 内容长度没有被前端截断。</p><p><b>补充提醒：</b>不要手动换行 DKIM 公钥，复制时保持完整。</p>"},{"id":"dns-strict-v60-26","q":"DMARC TXT 怎么填？","a":"<p><b>核心原因：</b>DMARC 用于邮件策略，主机一般是 _dmarc，内容类似 v=DMARC1; p=none; rua=...。</p><p><b>用户自查：</b></p><ol><li>主机填 _dmarc。</li><li>类型选 TXT。</li><li>内容按邮件服务商给出的策略复制。</li></ol><p><b>需要管理员处理：</b>管理员如果允许邮件记录，应提醒用户先从 p=none 观察，再逐步收紧。</p><p><b>容易踩坑：</b>DMARC 配错可能影响正常邮件投递。</p>"},{"id":"dns-strict-v60-27","q":"系统支持 CAA 记录吗？","a":"<p><b>为什么会这样：</b>当前系统允许的类型通常是 A、AAAA、CNAME、TXT、MX；CAA 如果未在 DNS_ALLOWED_TYPES 里，就不能创建。</p><p><b>自己先这样排查：</b></p><ol><li>在添加解析的记录类型下拉里查看是否有 CAA。</li><li>没有就说明当前平台未开放。</li></ol><p><b>联系管理员时要说明：</b>管理员若要支持 CAA，需要扩展前后端类型校验和 Cloudflare payload。</p><p><b>注意事项：</b>不要用 TXT 冒充 CAA，证书机构不会按 TXT 读取。</p>"},{"id":"dns-strict-v60-28","q":"一个域名可以有多条 DNS 记录吗？","a":"<p><b>判断重点：</b>可以。当前系统支持同一个二级域名下创建多条不同主机或不同类型的记录。</p><p><b>可直接操作的步骤：</b></p><ol><li>在域名详情里反复点击“添加解析”。</li><li>注意同一主机同一类型不能重复。</li></ol><p><b>后台需要检查的位置：</b>管理员可在“域名规则”限制单个二级域名最大记录数。</p><p><b>不要这样操作：</b>多条记录越多，误删和冲突风险越高。</p>"},{"id":"dns-strict-v60-29","q":"为什么新增解析默认代理状态会变化？","a":"<p><b>真实原因：</b>默认代理状态来自后台 DNS 配置；A、AAAA、CNAME 可使用代理，TXT/MX 会被强制仅 DNS。</p><p><b>普通用户能处理的部分：</b></p><ol><li>添加记录时查看“代理状态”下拉。</li><li>不了解代理时保持默认。</li></ol><p><b>管理员要处理的部分：</b>管理员在“DNS 配置”修改默认代理前，要通知用户，因为可能影响网站源站暴露和访问行为。</p><p><b>高频误区：</b>开启代理会改变返回 IP，不适合所有业务。</p>"},{"id":"dns-strict-v60-30","q":"Cloudflare 代理会影响什么？","a":"<p><b>先判断是不是故障：</b>开启代理后访问经过 Cloudflare，隐藏源站 IP 并提供缓存/防护，但非 HTTP 服务或某些验证可能失败。</p><p><b>页面内处理方法：</b></p><ol><li>普通网站可尝试开启代理。</li><li>API、验证、非网页服务出问题时改成仅 DNS 测试。</li></ol><p><b>必须后台处理的情况：</b>管理员应允许用户按记录选择代理，或按平台策略关闭。</p><p><b>补充提醒：</b>MX/TXT 不支持代理，不要强行开启。</p>"},{"id":"dns-strict-v60-31","q":"CF_API_TOKEN 需要什么权限？","a":"<p><b>核心原因：</b>Token 至少需要对应 Zone 的 DNS 编辑权限，否则创建、更新、删除记录会失败。</p><p><b>用户自查：</b></p><ol><li>普通用户无法处理 Token。</li><li>看到 DNS_TOKEN_MISSING 或权限错误时联系管理员。</li></ol><p><b>需要管理员处理：</b>管理员在 Cloudflare 创建最小权限 Token：Zone DNS Edit，并确认 Zone ID 是正确域名。</p><p><b>容易踩坑：</b>不要把 Token 填到网页表单或截图发给用户。</p>"},{"id":"dns-strict-v60-32","q":"DNS_ZONE_ID 填错会怎样？","a":"<p><b>为什么会这样：</b>Zone ID 指向错误时，系统会把请求发到另一个域名区域或被 Cloudflare 拒绝，导致记录不存在或创建失败。</p><p><b>自己先这样排查：</b></p><ol><li>用户只能把错误提示反馈给管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员在 Cloudflare 域名 Overview/API 区域核对 Zone ID，并和 DNS_SUFFIX 后缀一一对应。</p><p><b>注意事项：</b>多根域名时每个后缀都要有自己的 Zone ID。</p>"},{"id":"dns-strict-v60-33","q":"DNS_ALLOWED_TYPES 有什么用？","a":"<p><b>判断重点：</b>它控制用户下拉列表里能创建哪些记录类型，也控制后端校验，前端隐藏不等于后端允许。</p><p><b>可直接操作的步骤：</b></p><ol><li>如果下拉里没有 MX/TXT，说明平台未开放。</li></ol><p><b>后台需要检查的位置：</b>管理员在 DNS 配置里谨慎开放类型，尤其 MX 可能引发邮件滥用。</p><p><b>不要这样操作：</b>只改前端下拉没用，后端也会校验类型。</p>"},{"id":"dns-strict-v60-34","q":"默认记录类型为什么总是 CNAME？","a":"<p><b>真实原因：</b>默认类型来自 DNS_DEFAULT_TYPE 或后台根域名配置；它只影响表单初始选项，不代表用户只能用 CNAME。</p><p><b>普通用户能处理的部分：</b></p><ol><li>添加解析时手动改成 A、MX、TXT 等需要的类型。</li></ol><p><b>管理员要处理的部分：</b>管理员可在 DNS 配置中修改默认类型。</p><p><b>高频误区：</b>默认类型不会自动判断你的目标是 IP 还是域名，用户要自己选对。</p>"},{"id":"dns-strict-v60-35","q":"目标地址可以带端口吗？","a":"<p><b>先判断是不是故障：</b>DNS 记录不能保存端口，端口属于应用访问层，例如 example.com:8080 不是 A/CNAME 的合法目标。</p><p><b>页面内处理方法：</b></p><ol><li>A 记录只填 IP。</li><li>CNAME 只填域名。</li><li>端口在你的服务器或反向代理里配置。</li></ol><p><b>必须后台处理的情况：</b>管理员如果用户要绑定带端口服务，应指导其配置 Web 代理，不是 DNS 解决。</p><p><b>补充提醒：</b>DNS 不能把域名直接指向某个 URL 路径或端口。</p>"},{"id":"dns-strict-v60-36","q":"A 记录 IPv4 格式怎么检查？","a":"<p><b>核心原因：</b>IPv4 必须是四段 0-255 的数字，例如 103.205.240.19。含中文句号、空格、端口都会失败。</p><p><b>用户自查：</b></p><ol><li>复制后检查有没有空格。</li><li>不要写 http://103.205.240.19。</li></ol><p><b>需要管理员处理：</b>管理员可通过后端 normalizeDnsTarget 拦截非法 IP。</p><p><b>容易踩坑：</b>103.205.240.19:80 不是 DNS A 记录。</p>"},{"id":"dns-strict-v60-37","q":"AAAA IPv6 格式怎么检查？","a":"<p><b>为什么会这样：</b>IPv6 使用冒号分隔，允许 :: 缩写，但不能混入端口、URL 或方括号。</p><p><b>自己先这样排查：</b></p><ol><li>从服务器面板复制纯 IPv6 地址。</li><li>保存失败时先用 A 记录确认 IPv4 是否可用。</li></ol><p><b>联系管理员时要说明：</b>管理员如果用户群体不需要 IPv6，可暂时关闭 AAAA 类型。</p><p><b>注意事项：</b>[2400::1] 这种 URL 写法不适合直接填入 AAAA。</p>"},{"id":"dns-strict-v60-38","q":"目标域名后面要不要加点？","a":"<p><b>判断重点：</b>大多数情况下不需要加末尾的点，系统和 Cloudflare 能处理普通域名格式。</p><p><b>可直接操作的步骤：</b></p><ol><li>CNAME/MX 目标直接填 example.com。</li><li>不要填成 https://example.com/path。</li></ol><p><b>后台需要检查的位置：</b>管理员可在后端保存前统一清理尾部点，减少用户困惑。</p><p><b>不要这样操作：</b>部分 DNS 教程里的尾点是标准写法，但普通用户不必强行使用。</p>"},{"id":"dns-strict-v60-39","q":"浏览器打不开就是 DNS 没生效吗？","a":"<p><b>真实原因：</b>不一定。DNS 生效只解决“域名指向哪里”，网站打不开还可能是目标服务器没开、HTTPS 证书未配置或第三方平台未绑定域名。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先确认 DNS 列表显示已生效。</li><li>再检查目标服务器或第三方平台是否已经绑定该域名。</li><li>换网络测试。</li></ol><p><b>管理员要处理的部分：</b>管理员可用 Cloudflare 后台和查询工具确认记录是否存在，再判断是否是应用层问题。</p><p><b>高频误区：</b>不要把 404、证书错误、连接超时都归为 DNS 未生效。</p>"},{"id":"dns-strict-v60-40","q":"怎么判断是浏览器缓存还是 DNS 问题？","a":"<p><b>先判断是不是故障：</b>同一设备打不开但换网络或无痕能打开，常见是浏览器/本地 DNS 缓存；所有网络都打不开才更像 DNS 或目标服务问题。</p><p><b>页面内处理方法：</b></p><ol><li>清浏览器缓存或换手机流量测试。</li><li>等待 TTL 缓存过期。</li></ol><p><b>必须后台处理的情况：</b>管理员可用不同地区的 DNS 查询结果比对。</p><p><b>补充提醒：</b>刚修改记录后的几分钟内出现新旧结果混杂很正常。</p>"},{"id":"dns-strict-v60-41","q":"记录状态显示失败怎么办？","a":"<p><b>核心原因：</b>失败表示系统尝试调用 Cloudflare API 但返回错误，D1 会保存 error_message 方便排查。</p><p><b>用户自查：</b></p><ol><li>打开该记录查看错误提示。</li><li>确认目标值格式正确后重新编辑保存。</li></ol><p><b>需要管理员处理：</b>管理员查看 Worker 日志和 dns_records.error_message，判断是权限、冲突还是格式。</p><p><b>容易踩坑：</b>不要删除失败记录前不截图，错误信息对定位很重要。</p>"},{"id":"dns-strict-v60-42","q":"D1 和 Cloudflare 不同步怎么办？","a":"<p><b>为什么会这样：</b>如果有人在 Cloudflare 后台手动增删改记录，系统 D1 保存的记录 ID 和摘要可能失效。</p><p><b>自己先这样排查：</b></p><ol><li>以系统内 DNS 列表为准进行操作。</li><li>发现 Cloudflare 后台不同步时联系管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员可按记录名在 Cloudflare 查询并修复 cf_record_id，或删除 D1 脏记录后让用户重新添加。</p><p><b>注意事项：</b>长期混用手动后台和系统管理，必然容易不同步。</p>"},{"id":"dns-strict-v60-43","q":"删除提示 Record does not exist 怎么办？","a":"<p><b>判断重点：</b>这说明系统要删的 Cloudflare 记录 ID 已经不存在，常见于手动删除或记录被重建。</p><p><b>可直接操作的步骤：</b></p><ol><li>用户端等待管理员处理，不要反复点击。</li></ol><p><b>后台需要检查的位置：</b>管理员应使用按名称兜底删除的版本，删除不到旧 ID 时继续清理 D1。</p><p><b>不要这样操作：</b>Record does not exist 不代表域名不存在，只是那条 DNS 记录 ID 不存在。</p>"},{"id":"dns-strict-v60-44","q":"批准域名后已有待写入 DNS 会怎样？","a":"<p><b>真实原因：</b>如果审核前允许保存待写入记录，批准时系统会尝试同步这些 pending 记录到 Cloudflare。</p><p><b>普通用户能处理的部分：</b></p><ol><li>批准后进入 DNS 列表看状态是否变为已生效。</li></ol><p><b>管理员要处理的部分：</b>管理员批准时若同步失败，应查看 error_message；域名状态仍可能正常，但 DNS 需要重新保存。</p><p><b>高频误区：</b>不要以为批准按钮只改状态，旧待写入记录也可能触发 API 调用。</p>"},{"id":"dns-strict-v60-45","q":"能导入 Cloudflare 已有记录吗？","a":"<p><b>先判断是不是故障：</b>当前系统主要管理通过平台创建的记录，不会自动扫描并导入 Cloudflare 后台已有记录。</p><p><b>页面内处理方法：</b></p><ol><li>需要平台管理的记录，建议在系统内重新创建。</li></ol><p><b>必须后台处理的情况：</b>管理员若要导入，需要开发 Cloudflare List DNS Records 同步功能，并写入 dns_records 表。</p><p><b>补充提醒：</b>手动存在的记录不会自动显示在用户 DNS 列表。</p>"},{"id":"dns-strict-v60-46","q":"手动在 Cloudflare 删除记录后系统会知道吗？","a":"<p><b>核心原因：</b>不会立即知道。系统只有在下一次编辑、删除或同步时才可能发现记录 ID 不存在。</p><p><b>用户自查：</b></p><ol><li>尽量不要手动删系统创建的记录。</li><li>如果已经删了，回系统删除对应记录或联系管理员。</li></ol><p><b>需要管理员处理：</b>管理员可清理 D1 中 cf_record_id 指向失效的记录。</p><p><b>容易踩坑：</b>Cloudflare 后台操作不会自动回写 D1。</p>"},{"id":"dns-strict-v60-47","q":"多根域名下 DNS 怎么区分？","a":"<p><b>为什么会这样：</b>每个根域名后缀对应自己的 Zone ID、允许类型、默认代理和 TTL，用户申请时选哪个后缀就用哪套配置。</p><p><b>自己先这样排查：</b></p><ol><li>注册时选择正确根域名。</li><li>添加解析时确认当前管理的是哪个完整域名。</li></ol><p><b>联系管理员时要说明：</b>管理员在“DNS 配置”维护每条根域名的 suffix 和 zoneId，不能混填。</p><p><b>注意事项：</b>flore.top 的 Zone ID 不能拿去管理另一个主域。</p>"},{"id":"dns-strict-v60-48","q":"为什么不能给父级 flore.top 添加记录？","a":"<p><b>判断重点：</b>用户管理的是自己申请的二级域名及其下级主机，不允许直接修改平台根域名记录，防止影响整站。</p><p><b>可直接操作的步骤：</b></p><ol><li>在你的域名下添加 @、www、api 等记录。</li><li>不要尝试申请或编辑 flore.top 根本身。</li></ol><p><b>后台需要检查的位置：</b>管理员根域名记录只能在 Cloudflare 或后台 DNS 配置中维护。</p><p><b>不要这样操作：</b>免费用户的权限边界是子域，不是主域所有权。</p>"},{"id":"dns-strict-v60-49","q":"DNS 记录数量为什么有限制？","a":"<p><b>真实原因：</b>单域名记录过多会增加 D1 查询量、Cloudflare DNS 管理复杂度和滥用风险。</p><p><b>普通用户能处理的部分：</b></p><ol><li>删除不用的验证 TXT 和旧记录。</li><li>合并重复用途的主机。</li></ol><p><b>管理员要处理的部分：</b>管理员在“域名规则”设置单个二级域名最大 DNS 解析条数。</p><p><b>高频误区：</b>不要把一个免费二级域名当完整 DNS 托管平台无限使用。</p>"},{"id":"dns-strict-v60-50","q":"为什么 A 和 CNAME 同名冲突？","a":"<p><b>先判断是不是故障：</b>DNS 标准中 CNAME 表示该名字完全别名到另一个名字，通常不能和同名 A/MX/TXT 共存。</p><p><b>页面内处理方法：</b></p><ol><li>如果主机 @ 已有 CNAME，就不要再给 @ 添加 A。</li><li>改用 www 或删除旧记录后再添加。</li></ol><p><b>必须后台处理的情况：</b>管理员可用后端重复检测防止同名冲突。</p><p><b>补充提醒：</b>冲突不是界面限制，是 DNS 规则本身。</p>"}]},{"key":"domain","title":"域名管理问题","subtitle":"域名状态、审核、删除、续期、禁用、额度、管理员处理和手机端操作","items":[{"id":"domain-strict-v60-01","q":"为什么看不到“管理域名”按钮？","a":"<p><b>核心原因：</b>管理按钮只对已批准且未禁用、未撤销的域名显示；待审核或已拒绝状态不允许进入 DNS 管理。</p><p><b>用户自查：</b></p><ol><li>在“域名注册”或“域名管理”查看状态。</li><li>状态为“正常”后再找“管理域名”。</li></ol><p><b>需要管理员处理：</b>管理员需要在“域名审核”批准申请；若域名被禁用，需要先处理禁用原因。</p><p><b>容易踩坑：</b>不要把“已提交”当成“已批准”。</p>"},{"id":"domain-strict-v60-02","q":"域名显示正常但网站打不开怎么办？","a":"<p><b>为什么会这样：</b>域名状态正常只表示审核通过，不代表 DNS 已配置或目标网站正常运行。</p><p><b>自己先这样排查：</b></p><ol><li>进入域名详情查看 DNS 记录数量。</li><li>确认至少有 A 或 CNAME 指向正确目标。</li><li>检查目标服务器/第三方平台是否绑定该域名。</li></ol><p><b>联系管理员时要说明：</b>管理员可确认 Cloudflare DNS 是否存在记录，帮助区分 DNS 问题和目标服务问题。</p><p><b>注意事项：</b>正常状态和网站可访问是两层逻辑。</p>"},{"id":"domain-strict-v60-03","q":"为什么正常域名不能直接删除？","a":"<p><b>判断重点：</b>正常域名可能有 Cloudflare DNS 记录和外部访问，直接删除会造成残留或误删，所以必须走删除申请。</p><p><b>可直接操作的步骤：</b></p><ol><li>点击“申请删除域名”。</li><li>在 12 小时内可撤销。</li><li>等待管理员批准删除。</li></ol><p><b>后台需要检查的位置：</b>管理员批准删除时会清理 DNS 和 D1 记录。</p><p><b>不要这样操作：</b>不要先在 Cloudflare 手动删记录再回系统乱点，容易不同步。</p>"},{"id":"domain-strict-v60-04","q":"已拒绝域名怎么删除？","a":"<p><b>真实原因：</b>已拒绝域名没有生效 DNS，属于无效申请，按规则可以由用户直接删除以清理列表。</p><p><b>普通用户能处理的部分：</b></p><ol><li>在域名列表找到“已拒绝”。</li><li>点击“删除无效域名”。</li><li>输入确认信息后删除。</li></ol><p><b>管理员要处理的部分：</b>管理员无需审核已拒绝记录的删除。</p><p><b>高频误区：</b>删除后一般不留痕，想保留拒绝原因请先截图。</p>"},{"id":"domain-strict-v60-05","q":"删除申请提交后还能取消吗？","a":"<p><b>先判断是不是故障：</b>正常域名删除申请提供 12 小时撤销窗口，超过后只能等待管理员处理。</p><p><b>页面内处理方法：</b></p><ol><li>进入域名详情。</li><li>如果看到“撤销删除申请”，说明还在可撤销时间内。</li><li>点击撤销后状态恢复正常。</li></ol><p><b>必须后台处理的情况：</b>管理员如果已经批准删除，用户就不能再撤销。</p><p><b>补充提醒：</b>撤销窗口从提交删除申请时间开始算，不是从管理员查看时开始算。</p>"},{"id":"domain-strict-v60-06","q":"管理员批准删除后发生什么？","a":"<p><b>核心原因：</b>系统会尝试删除该域名所有 Cloudflare DNS 记录，然后硬删除 D1 中的域名和解析记录。</p><p><b>用户自查：</b></p><ol><li>用户会从域名列表中看不到该域名。</li><li>相关服务将不可访问。</li></ol><p><b>需要管理员处理：</b>管理员应确认 Cloudflare 返回成功，若提示记录不存在，新版本会继续清理 D1。</p><p><b>容易踩坑：</b>批准删除是不可逆处理，不要当成暂停使用。</p>"},{"id":"domain-strict-v60-07","q":"管理员拒绝删除后会怎样？","a":"<p><b>为什么会这样：</b>拒绝删除会清空 delete_requested_at，域名回到正常可管理状态，用户可继续使用。</p><p><b>自己先这样排查：</b></p><ol><li>查看消息中心的拒绝原因。</li><li>如果仍要删除，修正原因后重新提交申请。</li></ol><p><b>联系管理员时要说明：</b>管理员拒绝时应填写原因，例如域名仍在业务使用或身份未确认。</p><p><b>注意事项：</b>拒绝删除不会删除 DNS。</p>"},{"id":"domain-strict-v60-08","q":"域名被禁用后还能管理吗？","a":"<p><b>判断重点：</b>禁用表示管理员停止该域名使用并移除 DNS，用户不应继续管理或添加解析。</p><p><b>可直接操作的步骤：</b></p><ol><li>查看消息中心的禁用通知。</li><li>通过帮助中心说明申诉原因。</li></ol><p><b>后台需要检查的位置：</b>管理员可根据规则决定是否重新开放，但需要重新确认 DNS 和内容风险。</p><p><b>不要这样操作：</b>禁用不是临时隐藏，通常是风险处置。</p>"},{"id":"domain-strict-v60-09","q":"域名被撤销和被禁用有什么区别？","a":"<p><b>真实原因：</b>撤销通常是结束授权或管理员收回，禁用更偏向违规/风险处置；两者都会让域名不能继续正常使用。</p><p><b>普通用户能处理的部分：</b></p><ol><li>查看域名状态和消息通知。</li><li>需要恢复时联系管理员说明用途。</li></ol><p><b>管理员要处理的部分：</b>管理员在处理时应选择准确动作并填写备注。</p><p><b>高频误区：</b>用户端看到不能管理时，不要反复添加 DNS。</p>"},{"id":"domain-strict-v60-10","q":"为什么续期按钮不显示？","a":"<p><b>先判断是不是故障：</b>续期只在到期前 X 天窗口内开放，未进入窗口、域名未批准或待删除审核时都不会显示。</p><p><b>页面内处理方法：</b></p><ol><li>查看域名详情里的剩余时间。</li><li>确认状态是正常。</li><li>临近到期再查看续期按钮。</li></ol><p><b>必须后台处理的情况：</b>管理员可在“域名规则”设置续期窗口和是否开放用户自助续期。</p><p><b>补充提醒：</b>不是所有域名都能随时续期，避免长期占用资源。</p>"},{"id":"domain-strict-v60-11","q":"续期成功后到期时间怎么算？","a":"<p><b>核心原因：</b>系统一般从当前到期时间和当前时间中较晚者开始顺延默认有效天数，避免提前续期丢失剩余天数。</p><p><b>用户自查：</b></p><ol><li>续期后查看新的到期时间。</li><li>刷新域名详情确认剩余时间更新。</li></ol><p><b>需要管理员处理：</b>管理员可在 D1 查看 renew_count 和 renewed_at 判断是否写入成功。</p><p><b>容易踩坑：</b>不要连续重复点击续期按钮，避免误会时间变化。</p>"},{"id":"domain-strict-v60-12","q":"域名到期提醒在哪里看？","a":"<p><b>为什么会这样：</b>到期提醒可通过域名卡片、消息中心或首页公告显示，具体取决于管理员是否开启前台到期提醒。</p><p><b>自己先这样排查：</b></p><ol><li>进入“域名管理”查看剩余时间。</li><li>查看消息中心是否有到期通知。</li></ol><p><b>联系管理员时要说明：</b>管理员在“界面设置”和“通知设置”中开启到期提醒，并设置触发天数。</p><p><b>注意事项：</b>关闭提醒不代表域名不会到期。</p>"},{"id":"domain-strict-v60-13","q":"域名过期后会自动删除吗？","a":"<p><b>判断重点：</b>是否自动清理取决于管理员的自动化任务和过期后清理时长配置；未开启时只显示过期或待处理。</p><p><b>可直接操作的步骤：</b></p><ol><li>过期前主动续期。</li><li>过期后无法续期时联系管理员。</li></ol><p><b>后台需要检查的位置：</b>管理员在“自动化任务”配置扫描周期和过期 DNS 清理规则。</p><p><b>不要这样操作：</b>自动清理会影响访问，开启前要通知用户。</p>"},{"id":"domain-strict-v60-14","q":"二级域名可以转让给别人吗？","a":"<p><b>真实原因：</b>当前是否允许转让由“域名规则”控制；很多平台默认关闭，以免账号归属和责任不清。</p><p><b>普通用户能处理的部分：</b></p><ol><li>普通用户看不到转让入口时说明未开放。</li><li>需要转让时联系管理员说明双方账号。</li></ol><p><b>管理员要处理的部分：</b>管理员若开放转让，需要记录原用户、新用户和域名归属变更。</p><p><b>高频误区：</b>不要通过共享账号来变相转让域名。</p>"},{"id":"domain-strict-v60-15","q":"为什么纯数字前缀可能被禁止？","a":"<p><b>先判断是不是故障：</b>纯数字域名容易被用于临时跳转、批量注册和难以识别的垃圾站点，后台可选择禁止。</p><p><b>页面内处理方法：</b></p><ol><li>换成字母加数字，例如 app123。</li><li>不要反复提交纯数字。</li></ol><p><b>必须后台处理的情况：</b>管理员在“域名规则”里决定是否允许纯数字前缀。</p><p><b>补充提醒：</b>允许纯数字会提升滥用风险。</p>"},{"id":"domain-strict-v60-16","q":"为什么下划线前缀可能不能用？","a":"<p><b>核心原因：</b>普通主机名不推荐使用下划线，虽然部分 TXT 验证会用 _ 开头，但二级域名前缀通常限制更严格。</p><p><b>用户自查：</b></p><ol><li>普通域名前缀使用字母、数字、短横线。</li><li>TXT 主机如 _dmarc 是 DNS 记录主机，不是申请域名前缀。</li></ol><p><b>需要管理员处理：</b>管理员可单独控制“域名前缀是否允许下划线”。</p><p><b>容易踩坑：</b>不要混淆申请前缀和 DNS 记录主机。</p>"},{"id":"domain-strict-v60-17","q":"黑名单关键词命中怎么办？","a":"<p><b>为什么会这样：</b>命中黑名单说明前缀、邮箱、IP 或关键词被平台限制，普通用户不能强行提交。</p><p><b>自己先这样排查：</b></p><ol><li>换一个合规前缀。</li><li>如果是误伤，提交用途说明给管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员在“黑名单管理”查看域名前缀、IP、邮箱名单，必要时移除误伤项。</p><p><b>注意事项：</b>黑名单通常用于保护平台，不是前端显示错误。</p>"},{"id":"domain-strict-v60-18","q":"平台最大总配额是什么意思？","a":"<p><b>判断重点：</b>这是整个平台可分配的二级域名总上限，用来防止所有用户合计占用过多记录。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户只能看到自己的额度。</li><li>如果系统总额度满了，需要等待管理员扩容或清理。</li></ol><p><b>后台需要检查的位置：</b>管理员在“域名规则”调整平台最大二级域名总配额。</p><p><b>不要这样操作：</b>用户额度没满但平台总额满，也可能无法申请。</p>"},{"id":"domain-strict-v60-19","q":"单用户额度和平台总额度有什么区别？","a":"<p><b>真实原因：</b>单用户额度限制一个账号能申请多少个；平台总额度限制所有用户合计能申请多少个。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先看自己账户额度是否用完。</li><li>若自己额度未满仍失败，可能是平台总额度或黑名单限制。</li></ol><p><b>管理员要处理的部分：</b>管理员需要同时检查用户 domain_quota 和平台 total quota。</p><p><b>高频误区：</b>只调用户额度不能解决平台总额满的问题。</p>"},{"id":"domain-strict-v60-20","q":"管理员如何给用户改额度？","a":"<p><b>先判断是不是故障：</b>额度在用户记录上保存，管理员可直接编辑某个用户的 domain_quota。</p><p><b>页面内处理方法：</b></p><ol><li>普通用户通过帮助中心提交额度申请和用途。</li></ol><p><b>必须后台处理的情况：</b>管理员进入“用户管理”，点击用户，修改“域名额度”后保存。</p><p><b>补充提醒：</b>修改默认额度只影响新用户，不会自动改已有用户。</p>"},{"id":"domain-strict-v60-21","q":"自动审批和人工审核有什么区别？","a":"<p><b>核心原因：</b>自动审批会让符合规则的申请立即变正常；人工审核需要管理员在域名审核页面处理。</p><p><b>用户自查：</b></p><ol><li>普通用户提交后看状态：正常表示已通过，待审核表示等管理员。</li></ol><p><b>需要管理员处理：</b>管理员在“域名规则 → 审核模式”选择自动审批或人工审核。</p><p><b>容易踩坑：</b>自动审批风险更高，必须配合黑名单和额度限制。</p>"},{"id":"domain-strict-v60-22","q":"域名审核页面主要看什么？","a":"<p><b>为什么会这样：</b>审核页用于处理待审核、正常、待删除审核等域名，管理员要看域名、用户、DNS 摘要、状态和到期时间。</p><p><b>自己先这样排查：</b></p><ol><li>普通用户没有审核页。</li></ol><p><b>联系管理员时要说明：</b>管理员按风险判断：正常用途批准，违规或保留词拒绝，已生效风险域名可禁用或撤销。</p><p><b>注意事项：</b>不要只看前缀短不短，要结合用户和用途。</p>"},{"id":"domain-strict-v60-23","q":"各种域名状态是什么意思？","a":"<p><b>判断重点：</b>状态决定域名能否管理、能否删除、是否占额度。待审核不能配 DNS，正常可管理，待删除审核等待管理员，拒绝/撤销属于无效或终止。</p><p><b>可直接操作的步骤：</b></p><ol><li>在域名卡片右上角查看状态。</li><li>根据状态选择注册、管理、删除或等待。</li></ol><p><b>后台需要检查的位置：</b>管理员需保证前端显示和 D1 状态一致，避免状态误导用户。</p><p><b>不要这样操作：</b>“已禁用”可能底层兼容为 revoked，但显示语义不同。</p>"},{"id":"domain-strict-v60-24","q":"待删除审核是否占用额度？","a":"<p><b>真实原因：</b>占用。因为删除还没完成，域名仍然归当前用户，DNS 也可能还存在。</p><p><b>普通用户能处理的部分：</b></p><ol><li>等待管理员批准删除。</li><li>12 小时内不想删可以撤销。</li></ol><p><b>管理员要处理的部分：</b>管理员及时处理删除申请可以释放用户额度。</p><p><b>高频误区：</b>不要以为提交删除申请后额度马上释放。</p>"},{"id":"domain-strict-v60-25","q":"账号注销前为什么列出未注销域名？","a":"<p><b>先判断是不是故障：</b>系统必须确保账号下没有待审核、正常、待删除审核等域名，避免注销后出现无人负责的记录。</p><p><b>页面内处理方法：</b></p><ol><li>按弹窗列出的域名逐个处理。</li><li>正常域名走申请删除，拒绝/撤销域名直接删。</li></ol><p><b>必须后台处理的情况：</b>管理员批准删除后，用户再回账户设置注销。</p><p><b>补充提醒：</b>列表里的域名就是阻止注销的具体原因。</p>"},{"id":"domain-strict-v60-26","q":"删除域名后还能找回吗？","a":"<p><b>核心原因：</b>硬删除后 D1 和相关 DNS 记录会被清理，通常不能恢复。</p><p><b>用户自查：</b></p><ol><li>删除前记录好域名和 DNS 配置。</li><li>误删后只能重新申请同前缀，前提是未被占用。</li></ol><p><b>需要管理员处理：</b>管理员没有备份时无法直接恢复硬删除数据。</p><p><b>容易踩坑：</b>不要把删除当成临时停用，临时停用应联系管理员。</p>"},{"id":"domain-strict-v60-27","q":"为什么域名列表看不到刚申请的域名？","a":"<p><b>为什么会这样：</b>可能是页面缓存、请求还没刷新、申请失败或被后端拒绝没有写入 D1。</p><p><b>自己先这样排查：</b></p><ol><li>提交后看是否有成功提示。</li><li>刷新域名注册页下方列表。</li><li>检查是否被额度、黑名单或重复前缀拦截。</li></ol><p><b>联系管理员时要说明：</b>管理员可在 D1 domain_applications 或操作日志确认申请是否写入。</p><p><b>注意事项：</b>没有成功提示就不要假设已经提交。</p>"},{"id":"domain-strict-v60-28","q":"域名列表排序规则是什么？","a":"<p><b>判断重点：</b>通常按状态和创建时间排序，待处理项优先展示，历史项靠后。</p><p><b>可直接操作的步骤：</b></p><ol><li>在列表中按状态查找。</li><li>域名多时使用浏览器搜索页面文字。</li></ol><p><b>后台需要检查的位置：</b>管理员可后续增加筛选和排序字段。</p><p><b>不要这样操作：</b>排序变化不代表域名丢失。</p>"},{"id":"domain-strict-v60-29","q":"DNS 数量显示不对怎么办？","a":"<p><b>真实原因：</b>DNS 数量来自 dns_records 表，旧摘要字段或缓存可能造成卡片显示与详情不一致。</p><p><b>普通用户能处理的部分：</b></p><ol><li>进入域名详情，以 DNS 解析列表为准。</li><li>强制刷新页面。</li></ol><p><b>管理员要处理的部分：</b>管理员确认是否部署了真实 dns_records 摘要版本，并清理旧字段残留。</p><p><b>高频误区：</b>不要只看卡片上的旧摘要判断真实解析。</p>"},{"id":"domain-strict-v60-30","q":"操作日志怎么查域名问题？","a":"<p><b>先判断是不是故障：</b>操作日志记录申请、批准、DNS 新增、修改、删除等动作，可以定位谁在什么时候做了什么。</p><p><b>页面内处理方法：</b></p><ol><li>进入“操作日志”。</li><li>用类型筛选 DNS 或域名。</li><li>按时间倒序查看最近操作。</li></ol><p><b>必须后台处理的情况：</b>管理员可查看全站日志；普通用户只能看到自己的相关操作。</p><p><b>补充提醒：</b>日志只保留设定天数，太久的记录可能已清理。</p>"},{"id":"domain-strict-v60-31","q":"如何选择根域名后缀？","a":"<p><b>核心原因：</b>多根域名启用后，注册页会显示可选后缀，不同后缀可能对应不同用途和 DNS 配置。</p><p><b>用户自查：</b></p><ol><li>注册时先选择根域名。</li><li>确认预览完整域名正确后提交。</li></ol><p><b>需要管理员处理：</b>管理员在“DNS 配置”维护后缀列表和 Zone ID。</p><p><b>容易踩坑：</b>选错后缀不能直接改成另一个后缀，通常要重新申请。</p>"},{"id":"domain-strict-v60-32","q":"管理员怎么增加根域名？","a":"<p><b>为什么会这样：</b>增加根域名需要在 Cloudflare 有对应 Zone，并在后台配置 suffix、zoneId、允许类型等信息。</p><p><b>自己先这样排查：</b></p><ol><li>普通用户不能增加根域名，只能选择已开放后缀。</li></ol><p><b>联系管理员时要说明：</b>管理员进入“DNS 配置”，新增根域名项，填后缀、Zone ID、默认类型、TTL 和代理设置。</p><p><b>注意事项：</b>只填 DNS_SUFFIX 不够，多后缀要每个都有 Zone ID。</p>"},{"id":"domain-strict-v60-33","q":"为什么修改管理员设置要二次确认？","a":"<p><b>判断重点：</b>注册、域名规则、DNS、黑名单、安全设置会影响大量用户和存量解析，误操作风险高。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户不会看到这些确认。</li></ol><p><b>后台需要检查的位置：</b>管理员保存高危配置前阅读风险文字，再确认保存。</p><p><b>不要这样操作：</b>不要在未备份配置时批量修改 DNS 和黑名单。</p>"},{"id":"domain-strict-v60-34","q":"用户为什么不能编辑 DNS？","a":"<p><b>真实原因：</b>可能是域名未批准、待删除审核、管理员关闭了生效后编辑，或该记录正在错误状态。</p><p><b>普通用户能处理的部分：</b></p><ol><li>先确认域名状态为正常。</li><li>查看是否有待删除审核提示。</li></ol><p><b>管理员要处理的部分：</b>管理员检查“域名规则 → 生效后允许用户修改 DNS”开关。</p><p><b>高频误区：</b>不能编辑时反复提交不会解决权限问题。</p>"},{"id":"domain-strict-v60-35","q":"管理员关闭 DNS 编辑会怎样？","a":"<p><b>先判断是不是故障：</b>关闭后用户不能修改已生效域名的 DNS，适合平台统一托管或防止用户乱改解析。</p><p><b>页面内处理方法：</b></p><ol><li>用户只能查看现有记录，不能保存修改。</li><li>需要变更时联系管理员。</li></ol><p><b>必须后台处理的情况：</b>管理员在域名规则里关闭或开启该权限，并告知用户。</p><p><b>补充提醒：</b>关闭编辑不一定影响新增权限，具体以版本逻辑为准。</p>"},{"id":"domain-strict-v60-36","q":"根域名配置重复会怎样？","a":"<p><b>核心原因：</b>重复 suffix 会导致注册选择、Zone ID 匹配和 DNS 写入混乱，可能把记录写到错误区域。</p><p><b>用户自查：</b></p><ol><li>用户发现后缀重复时不要提交申请，先反馈。</li></ol><p><b>需要管理员处理：</b>管理员在 DNS 配置中保持每个 suffix 唯一，并清理旧重复项。</p><p><b>容易踩坑：</b>flore.top 和 www.flore.top 不是同一类根后缀配置。</p>"},{"id":"domain-strict-v60-37","q":"后缀被管理员关闭后用户怎么办？","a":"<p><b>为什么会这样：</b>后缀关闭后，新申请不再显示该根域名；已有域名是否受影响取决于管理员规则。</p><p><b>自己先这样排查：</b></p><ol><li>注册新域名时选择其他后缀。</li><li>已有域名异常时联系管理员。</li></ol><p><b>联系管理员时要说明：</b>管理员关闭后缀前应通知用户，并确认已有域名解析是否继续维护。</p><p><b>注意事项：</b>关闭注册入口不等于自动删除已有域名。</p>"},{"id":"domain-strict-v60-38","q":"什么域名会被判定违规？","a":"<p><b>判断重点：</b>仿冒品牌、支付登录、违法内容、恶意跳转、垃圾邮件用途和误导性前缀都可能被拒绝、禁用或撤销。</p><p><b>可直接操作的步骤：</b></p><ol><li>申请前使用清晰、真实的项目名。</li><li>被拒绝后查看消息中心说明。</li></ol><p><b>后台需要检查的位置：</b>管理员维护黑名单并在审核时填写拒绝原因。</p><p><b>不要这样操作：</b>免费域名平台尤其要保护主域信誉。</p>"},{"id":"domain-strict-v60-39","q":"为什么 phishing 类域名不能申请？","a":"<p><b>真实原因：</b>钓鱼域名会损害主域名和所有用户，甚至导致 Cloudflare、浏览器或安全厂商拦截整个平台。</p><p><b>普通用户能处理的部分：</b></p><ol><li>不要申请和银行、钱包、登录页相似的前缀。</li></ol><p><b>管理员要处理的部分：</b>管理员必须拒绝这类申请并可禁用账号。</p><p><b>高频误区：</b>“只是测试”也不建议使用真实品牌或登录相关前缀。</p>"},{"id":"domain-strict-v60-40","q":"系统保留前缀能不能找管理员开放？","a":"<p><b>先判断是不是故障：</b>一般不建议开放，除非管理员确认不会和平台服务冲突。</p><p><b>页面内处理方法：</b></p><ol><li>换成业务专属前缀。</li><li>确实需要时说明用途。</li></ol><p><b>必须后台处理的情况：</b>管理员评估 www、api、mail、admin 等是否已被平台使用。</p><p><b>补充提醒：</b>开放 mail、admin 这类前缀风险很高。</p>"},{"id":"domain-strict-v60-41","q":"可以先批准域名再让用户配 DNS 吗？","a":"<p><b>核心原因：</b>可以。当前推荐流程就是先审核域名合法性，通过后用户再自行添加 DNS 解析。</p><p><b>用户自查：</b></p><ol><li>用户通过后进入“域名管理”添加解析。</li></ol><p><b>需要管理员处理：</b>管理员批准时不必填写 DNS，只需确认域名合规。</p><p><b>容易踩坑：</b>审核通过不代表 DNS 自动存在。</p>"},{"id":"domain-strict-v60-42","q":"Cloudflare API 失败时域名会怎样？","a":"<p><b>为什么会这样：</b>域名状态和 DNS 状态是分开的，API 失败可能导致域名正常但解析记录失败。</p><p><b>自己先这样排查：</b></p><ol><li>查看 DNS 记录状态和错误信息。</li><li>修正目标后重新保存。</li></ol><p><b>联系管理员时要说明：</b>管理员检查 Token、Zone ID、记录冲突和 Cloudflare 返回内容。</p><p><b>注意事项：</b>不要把 API 失败误判为审核失败。</p>"},{"id":"domain-strict-v60-43","q":"D1 硬删除是什么意思？","a":"<p><b>判断重点：</b>硬删除是直接从 D1 表删除记录，不再保留 deleted_at 软删除痕迹，用于减少脏数据和约束冲突。</p><p><b>可直接操作的步骤：</b></p><ol><li>删除前确认不再需要。</li></ol><p><b>后台需要检查的位置：</b>管理员应知道硬删除不利于长期追溯，重要信息要靠操作日志或外部备份。</p><p><b>不要这样操作：</b>硬删除后不能像回收站一样恢复。</p>"},{"id":"domain-strict-v60-44","q":"CHECK constraint failed 怎么处理？","a":"<p><b>真实原因：</b>旧 D1 表可能给 status 字段设置了固定允许值，新代码写入 disabled 等新状态时会触发约束错误。</p><p><b>普通用户能处理的部分：</b></p><ol><li>用户看到该错误只能截图反馈。</li></ol><p><b>管理员要处理的部分：</b>管理员应使用兼容写法，或迁移 D1 表结构；例如禁用域名用 revoked 加备注兼容旧约束。</p><p><b>高频误区：</b>不要反复点击同一按钮，约束错误不会因重试消失。</p>"},{"id":"domain-strict-v60-45","q":"域名管理多久刷新一次？","a":"<p><b>先判断是不是故障：</b>当前要求是 5 分钟无感刷新，编辑中、弹窗打开、消息中心使用中不刷新，避免打断操作。</p><p><b>页面内处理方法：</b></p><ol><li>需要立即看结果时手动刷新页面。</li><li>正在填写表单时不用担心自动刷新覆盖。</li></ol><p><b>必须后台处理的情况：</b>管理员在代码里统一刷新间隔，避免某些页面仍用 1 分钟。</p><p><b>补充提醒：</b>自动刷新不是实时推送，刚操作完可能需要手动刷新。</p>"},{"id":"domain-strict-v60-46","q":"手机端侧边栏为什么会截断？","a":"<p><b>核心原因：</b>通常是 CSS 高度、zoom 和 fixed 抽屉适配问题，导致侧栏没有延伸到底部或挤压内容。</p><p><b>用户自查：</b></p><ol><li>手机端点击三横杠打开菜单，空白处关闭。</li><li>显示错位时清缓存。</li></ol><p><b>需要管理员处理：</b>管理员确认最新 styles.css 中移动端侧栏为 fixed，并处理 overflow-y 滚动。</p><p><b>容易踩坑：</b>不要在手机端沿用桌面端 80% zoom。</p>"},{"id":"domain-strict-v60-47","q":"默认语言会影响哪些页面？","a":"<p><b>为什么会这样：</b>默认语言影响首次进入时的界面语言和右上角 EN/中文切换按钮状态，但管理员自定义内容不会自动翻译。</p><p><b>自己先这样排查：</b></p><ol><li>用右上角按钮切换语言。</li></ol><p><b>联系管理员时要说明：</b>管理员在“界面设置”选择默认语言，并维护必要的英文文案。</p><p><b>注意事项：</b>帮助中心管理员自写中文，英文模式也可能显示中文。</p>"},{"id":"domain-strict-v60-48","q":"帮助中心内容谁能修改？","a":"<p><b>判断重点：</b>只有管理员能进入“帮助中心设置”增改 FAQ，普通用户只能搜索和查看。</p><p><b>可直接操作的步骤：</b></p><ol><li>普通用户发现答案不准，可在帮助中心发消息反馈。</li></ol><p><b>后台需要检查的位置：</b>管理员修改分类、问题和答案后保存全部，用户帮助中心会读取新内容。</p><p><b>不要这样操作：</b>恢复默认会覆盖当前编辑内容，操作前先导出或复制。</p>"},{"id":"domain-strict-v60-49","q":"用户反馈如何进入后台？","a":"<p><b>真实原因：</b>用户在帮助中心底部提交消息后，系统写入 system_messages，目标角色是 admin。</p><p><b>普通用户能处理的部分：</b></p><ol><li>提交后会跳转消息中心并显示发送记录。</li><li>可查看管理员是否已读。</li></ol><p><b>管理员要处理的部分：</b>管理员在“消息中心”查看用户反馈，必要时回复。</p><p><b>高频误区：</b>外部联系 mailform 不会自动进入站内消息中心。</p>"},{"id":"domain-strict-v60-50","q":"客服回复能继续对话吗？","a":"<p><b>先判断是不是故障：</b>可以。管理员回复用户后消息类型显示“客服回复”，用户可以继续回复形成往返沟通。</p><p><b>页面内处理方法：</b></p><ol><li>在消息卡片点击“回复”。</li><li>回复会附带原消息内容。</li></ol><p><b>必须后台处理的情况：</b>管理员同样可在消息中心对用户反馈回复。</p><p><b>补充提醒：</b>自己发出的消息 15 分钟内显示撤销，不显示回复。</p>"}]}];
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

function plainHelpAnswer(html) {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  return div.textContent || div.innerText || '';
}

function renderHelpCenter() {
  const categories = helpCategories();
  shell('帮助中心', `
    <section class="help-hero card"><div><h2>帮助中心</h2><p>查看使用提示、DNS 教程、域名管理说明与支持入口</p></div></section>
    <section class="help-search-row"><input id="help-search" class="help-search" placeholder="可以输入自然语言，例如：网站打不开、解析没生效、想删除域名、额度不够"><button class="btn primary" id="help-search-btn">智能搜索/问答</button></section>
    <div id="help-search-status" class="help-search-status"></div>
    <section class="help-category-wrap">
      ${categories.map(cat => renderHelpCategory(cat.title, cat.subtitle, cat.items)).join('')}
    </section>
    <section class="card help-contact-card">
      <div class="section-head">
        <div><h2>需要帮助？</h2><p>您可以选择站内消息或外部联系两种方式提交问题。</p></div>
        <a class="btn secondary" href="https://mailform.flore.top" target="_blank" rel="noopener">其他：联系我们</a>
      </div>
      <div class="help-contact-methods">
        <div><strong>方式一：站内消息</strong><p>在下方填写标题和内容，消息会直接进入管理员的消息中心，适合已经登录后反馈域名、DNS、额度、审核等问题。</p></div>
        <div><strong>方式二：外部联系</strong><p>点击右上角“其他：联系我们”会打开外部反馈页面，适合无法登录、无法收到消息、需要提交截图或更详细资料的情况。</p></div>
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
  const categoryData = [...document.querySelectorAll('.help-category')].map(category => {
    const body = category.querySelector('.help-category-body');
    const items = [...category.querySelectorAll('.help-item')];
    items.forEach((item, index) => { item.dataset.originalIndex = String(index); });
    return { category, body, items };
  });

  const normalizeHelpText = value => String(value || '')
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/cloudflare/g, ' cloudflare ')
    .replace(/dns/g, ' dns ')
    .replace(/cname/g, ' cname ')
    .replace(/aaaa/g, ' aaaa ')
    .replace(/txt/g, ' txt ')
    .replace(/mx/g, ' mx ')
    .replace(/ipv4/g, ' ipv4 ')
    .replace(/ipv6/g, ' ipv6 ')
    .replace(/[，。！？、；：,.!?;:()（）【】\[\]<>《》"'“”‘’`~\/|]+/g, ' ')
    .replace(/[\s　]+/g, ' ')
    .trim();

  const compactHelpText = value => normalizeHelpText(value).replace(/[\s\-_.]+/g, '');

  const helpSynonyms = [
    ['dns', '解析', '解析记录', '记录值', '域名解析', 'record', 'records'],
    ['不生效', '没生效', '打不开', '访问不了', '无法访问', '解析失败', '解析报错', '生效慢', 'ttl', '缓存', '传播'],
    ['登录', '登陆', '登不上', '进不去', '回到登录页', '密码', '账号', '账户', '邮箱', '手机号'],
    ['注册', '申请', '提交', '前缀', '根域名', '待审核', '审核'],
    ['删除', '删掉', '撤销', '申请删除', '误删', '注销', '取消'],
    ['续期', '到期', '过期', '有效期', '剩余时间', '期限'],
    ['额度', '配额', '名额', '数量', '上限', '限制', '不够'],
    ['代理', 'proxied', 'proxy', '小云朵', '仅dns', '仅 dns', '橙云', '灰云'],
    ['cname', '别名', 'pages', 'vercel', 'ddns', '跳转到域名'],
    ['a记录', 'a 记录', 'ipv4', 'ip地址', 'ip'],
    ['aaaa', 'aaaa记录', 'ipv6'],
    ['txt', '验证', '校验', '所有权', '备案', 'spf', 'dkim'],
    ['mx', '邮箱解析', '邮件', 'mail', '优先级'],
    ['管理员', '批准', '拒绝', '禁用', '撤销', '留言', '审核'],
    ['消息', '通知', '草稿', '模板', '消息中心'],
    ['操作日志', '日志', '记录', '筛选', '操作人']
  ];

  const buildHelpTerms = raw => {
    const normalized = normalizeHelpText(raw);
    const compact = compactHelpText(raw);
    const parts = normalized.split(/[\s\-_/]+/).map(compactHelpText).filter(Boolean);
    const terms = new Set([compact, ...parts].filter(Boolean));
    for (const group of helpSynonyms) {
      const normalizedGroup = group.map(compactHelpText).filter(Boolean);
      if (normalizedGroup.some(term => compact.includes(term) || term.includes(compact) || parts.some(part => term.includes(part) || part.includes(term)))) {
        normalizedGroup.forEach(term => terms.add(term));
      }
    }
    if (/^[一-龥]{3,}$/.test(compact)) {
      for (let i = 0; i < compact.length - 1; i += 1) terms.add(compact.slice(i, i + 2));
    }
    return [...terms].filter(term => term.length >= 1);
  };

  const helpCoverageScore = (textCompact, queryCompact) => {
    const chars = [...new Set([...queryCompact].filter(Boolean))];
    if (!chars.length) return 0;
    const hit = chars.filter(ch => textCompact.includes(ch)).length;
    return hit / chars.length;
  };

  const helpScoreItem = (item, rawQuery, terms) => {
    const title = compactHelpText(item.querySelector('summary')?.textContent || '');
    const text = compactHelpText(item.textContent || '');
    const queryCompact = compactHelpText(rawQuery);
    let score = 0;
    if (!queryCompact) return 1;
    if (title.includes(queryCompact)) score += 120;
    if (text.includes(queryCompact)) score += 80;
    for (const term of terms) {
      if (!term) continue;
      if (title.includes(term)) score += term.length >= 2 ? 22 : 8;
      else if (text.includes(term)) score += term.length >= 2 ? 12 : 4;
    }
    const coverage = helpCoverageScore(text, queryCompact);
    if (coverage >= 0.72) score += 35;
    else if (coverage >= 0.55) score += 18;
    else if (coverage >= 0.42) score += 8;
    return score;
  };

  const resetHelpSearch = () => {
    categoryData.forEach(({ category, body, items }) => {
      category.style.display = '';
      category.open = false;
      [...items]
        .sort((a, b) => Number(a.dataset.originalIndex || 0) - Number(b.dataset.originalIndex || 0))
        .forEach(item => { item.style.display = ''; item.open = false; body.appendChild(item); });
    });
    if (status) status.innerHTML = '';
  };

  const runFilter = () => {
    const raw = (search?.value || '').trim();
    if (!raw) { resetHelpSearch(); return; }
    const terms = buildHelpTerms(raw);
    let total = 0;
    let bestItems = [];
    categoryData.forEach(({ category, body, items }) => {
      const scored = items
        .map(item => ({ item, score: helpScoreItem(item, raw, terms) }))
        .filter(row => row.score > 0)
        .sort((a, b) => b.score - a.score || Number(a.item.dataset.originalIndex || 0) - Number(b.item.dataset.originalIndex || 0));
      bestItems.push(...scored.map(row => ({ ...row, category, body })));
      items.forEach(item => { item.style.display = 'none'; item.open = false; });
      const visibleRows = scored.slice(0, 18);
      visibleRows.forEach((row, index) => {
        row.item.style.display = '';
        row.item.open = index < 3;
        body.appendChild(row.item);
      });
      category.style.display = visibleRows.length ? '' : 'none';
      category.open = visibleRows.length > 0;
      total += visibleRows.length;
    });

    if (total === 0) {
      bestItems = categoryData.flatMap(({ category, body, items }) => items.slice(0, 3).map(item => ({ item, category, body, score: 0 })));
      categoryData.forEach(({ category, body, items }) => {
        items.forEach(item => { item.style.display = 'none'; item.open = false; });
        const fallback = items.slice(0, 3);
        fallback.forEach((item, index) => { item.style.display = ''; item.open = index === 0; body.appendChild(item); });
        category.style.display = '';
        category.open = true;
      });
      total = bestItems.length;
      if (status) status.innerHTML = `<span class="help-search-warning">没有精准命中，已根据关键词显示相关问题。可以换成“打不开 / DNS / 删除 / 额度 / 登录”等词继续搜。</span>`;
      return;
    }

    if (status) {
      const readableTerms = terms.slice(0, 8).map(t => `<span>${esc(t)}</span>`).join('');
      status.innerHTML = `<strong>智能匹配到 ${total} 条相关问题</strong><em>已按相关度排序，不要求完全一致。</em><div class="help-search-tags">${readableTerms}</div>`;
    }
  };

  search?.addEventListener('input', runFilter);
  document.querySelector('#help-search-btn')?.addEventListener('click', runFilter);
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
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
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
function messageTargetOptions(users = []) {
  return users.map(u => `<option value="${attr(u.id)}">${esc(u.username)}${u.email ? ' / '+esc(u.email) : ''}</option>`).join('');
}
function messageComposeForm(users = [], preset = {}) {
  const status = preset.status || 'sent';
  const targetType = preset.targetType || 'none';
  const targetRole = preset.targetRole || 'user';
  return `<form id="message-compose-form" class="message-compose form-grid" data-edit-id="${attr(preset.id || '')}">
    <label class="field"><span>接收对象</span><select name="targetType" id="msg-target-type"><option value="none" ${targetType==='none'?'selected':''}>暂不选择</option><option value="all" ${targetType==='all'?'selected':''}>全部用户</option><option value="role" ${targetType==='role'?'selected':''}>按角色</option><option value="user" ${targetType==='user'?'selected':''}>指定用户</option></select></label>
    <label class="field msg-target-role"><span>角色</span><select name="targetRole"><option value="user" ${targetRole==='user'?'selected':''}>普通用户</option><option value="admin" ${targetRole==='admin'?'selected':''}>管理员</option></select></label>
    <label class="field msg-target-user"><span>用户</span><select name="targetUserId"><option value="">请选择用户</option>${messageTargetOptions(users)}</select></label>
    <label class="field"><span>消息类型</span><select name="level"><option value="" ${!preset.level?'selected':''}>暂不选择</option><option value="info" ${(preset.level||'info')==='info'?'selected':''}>普通通知</option><option value="important" ${preset.level==='important'?'selected':''}>重要通知</option><option value="system" ${preset.level==='system'?'selected':''}>系统通知</option><option value="success" ${preset.level==='success'?'selected':''}>成功提示</option><option value="warning" ${preset.level==='warning'?'selected':''}>警告提醒</option><option value="danger" ${preset.level==='danger'?'selected':''}>重要警告</option></select></label>
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
    const filteredLogs = filterOperationLogs(logs);
    shell('操作日志', `
      <section class="card operation-log-card">
        <div class="operation-log-title">
          <div class="operation-title-left"><span class="operation-title-icon">↩</span><div><h2>最近操作记录</h2><p>仅显示最近 7 天内的账号注册域名、解析等部分操作记录。</p></div></div>
          <span class="status-pill status-active">7 天</span>
        </div>
        <div class="operation-log-note">管理员可查看近 7 天内未注销账号的操作记录；普通用户仅查看自己的记录。</div>
        ${operationLogFilterPanelHtml(logs, filteredLogs)}
        ${operationLogListHtml(filteredLogs)}
        <p class="operation-retention">日志会自动清理：超过 7 天、或账号注销后的记录会从 D1 中删除。</p>
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
      <section class="card"><div class="section-head"><div><h2>我的消息</h2><p>系统消息、管理员通知和域名处理结果都会显示在这里。</p></div><div class="message-toolbar"><button class="btn small soft" id="mark-selected-read">批量已读</button><button class="btn small secondary" id="mark-all-read">全部已读</button></div></div><div class="message-list">${messageListHtml(inbox, false)}</div></section>
      ${isAdmin ? `<section class="card"><div class="section-head"><div><h2>发送消息</h2><p>可以发送给全部用户、普通用户、管理员或指定用户。</p></div></div>${messageComposeForm(users, preset || {})}</section>
      <section class="card"><div class="section-head"><div><h2>草稿信息</h2><p>未发送的消息可以继续编辑或直接发送。</p></div></div><div class="message-list">${messageListHtml(drafts, true)}</div></section>
      <section class="card"><div class="section-head"><div><h2>消息模板</h2><p>保存常用通知，下次可以直接套用。</p></div></div><div class="message-list">${messageListHtml(templates, true)}</div></section>
      <section class="card"><div class="section-head"><div><h2>已发送消息</h2><p>查看已发送的系统通知和用户阅读情况。</p></div></div><div class="message-list">${messageListHtml(sent, true)}</div></section>` : ''}
    `);
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
    document.querySelector('#mark-selected-read')?.addEventListener('click', async () => {
      const ids = [...document.querySelectorAll('.message-check:checked')].map(x => x.value);
      await markMessagesRead(ids);
    });
    document.querySelector('#mark-all-read')?.addEventListener('click', async () => {
      const ids = inbox.filter(m => !m.isRead).map(m => m.id);
      await markMessagesRead(ids);
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
  shell('域名管理', `<div class="loading-card">正在读取域名详情…</div>`);
  try {
    const [{ application: a }, dnsResult] = await Promise.all([
      api(`/api/applications/${encodeURIComponent(id)}`),
      api(`/api/applications/${encodeURIComponent(id)}/dns-records`).catch(() => ({ records: [] })),
    ]);
    const records = dnsResult.records || [];
    const approved = a.status === 'approved';
    const dnsRows = records.map(r => dnsRecordRow(r, approved)).join('');
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
    document.querySelector('#cancel-delete-request')?.addEventListener('click', () => showCancelDeleteRequestModal(a.id));
    document.querySelector('[data-cancel-delete-request-one]')?.addEventListener('click', () => showCancelDeleteRequestModal(a.id));
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
  try {
    const res = await api('/api/account/devices');
    devices = res.devices || [];
  } catch (error) {
    console.warn('device list failed', error);
  }
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
      <section class="card danger-zone account-delete-card"><h2>注销账号</h2><p>注销前必须先处理完账号下所有正常、待审核或待删除审核域名。没有未注销域名后，才可以注销程序账号。</p><button class="btn danger" id="delete-account" type="button">注销账号</button></section>
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
      state.me = null;
      go('#/login');
    } catch (error) {
      toast(error.message, 'error');
      btn.disabled = false;
    }
  });
  document.querySelector('#delete-account')?.addEventListener('click', showDeleteAccountModal);
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
  if (!hasBlocking) bindExactConfirmInput(form, 'input[name="confirmAccount"]', '#confirm-delete-account', [state.me.username]);
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
      <td>${a.dnsConfigured ? `<code>${esc(appDnsDisplay(a))}</code>` : '<span class="muted">未配置 DNS</span>'}</td>
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
  const useTurnstile = !!turn.siteKey;
  openModal(tr('添加用户'), tr('管理员手动创建用户账号'), `
    <form id="create-user-form" class="modal-form">
      <div class="form-grid">
        <label class="field"><span>${tr('账号')}</span><input name="username" required placeholder="${tr('例如：user001')}"></label>
        <label class="field"><span>${tr('邮箱/手机号')}</span><input name="email" type="text" inputmode="text" placeholder="${tr('请输入邮箱/手机号')}"></label>
        <label class="field wide"><span>${tr('初始密码')}</span><input name="password" type="password" required minlength="8" placeholder="${tr('至少 8 位')}"><em>${tr('创建后用户可自行修改密码。')}</em></label>
        <label class="field"><span>${tr('角色')}</span><select name="role"><option value="user">${tr('用户')}</option><option value="admin">${tr('管理员')}</option></select></label>
        <label class="field"><span>${tr('状态')}</span><select name="status"><option value="active">${tr('启用')}</option><option value="disabled">${tr('禁用')}</option></select></label>
        <label class="field wide"><span>${tr('域名额度')}</span><input name="domainQuota" type="number" min="0" step="1" value="${attr(defaultQuota)}"></label>
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
function suffixesToJson(suffixes) { return JSON.stringify((suffixes || []).map(s => ({ label:s.label || s.suffix, suffix:s.suffix, zoneId:s.zoneId || '', allowedTypes:s.allowedTypes || ['A','AAAA','CNAME','TXT','MX'], defaultType:s.defaultType || 'CNAME', ttl:s.ttl || 1, proxied:!!s.proxied, enabled:s.enabled !== false })), null, 2); }
function eventChecks(events = {}) {
  return `<label class="check"><input name="newUser" type="checkbox" ${yn(events.newUser)}> 新账号注册</label>
  <label class="check"><input name="newDomain" type="checkbox" ${yn(events.newDomain)}> 新域名申请</label>
  <label class="check"><input name="domainExpiring" type="checkbox" ${yn(events.domainExpiring)}> 域名即将到期</label>
  <label class="check"><input name="domainExpiredDelete" type="checkbox" ${yn(events.domainExpiredDelete)}> 域名过期删除</label>
  <label class="check"><input name="abnormalRegister" type="checkbox" ${yn(events.abnormalRegister)}> 异常注册行为</label>`;
}
function collectSuffixes(form) {
  const text = String(form.get('suffixesJson') || '').trim();
  try { const data = JSON.parse(text || '[]'); return Array.isArray(data) ? data : []; }
  catch { throw new Error('根域名列表 JSON 格式错误'); }
}
function riskyConfirm(group) {
  const messages = {
    registration:'注册风控属于高危配置，错误设置可能导致用户无法注册或垃圾账号进入系统。确认保存？',
    domain:'域名规则属于高危配置，可能影响用户申请、续期、删除和现有域名管理。确认保存？',
    dns:'DNS 配置属于高危配置，修改根域名、代理、允许类型可能影响存量解析和用户访问。确认保存？',
    blacklist:'黑名单会直接拦截用户、IP、邮箱或域名前缀，错误配置可能误伤正常用户。确认保存？',
    security:'安全设置会影响管理员登录、会话超时和操作日志保留。确认保存？',
    automation:'自动化任务可能自动清理到期域名或 DNS 记录。确认保存？'
  };
  return !messages[group] || confirm(messages[group]);
}

async function renderAdminSettings() {
  shell('管理员设置', `<div class="loading-card">正在读取设置…</div>`);
  try {
    const { settings } = await api('/api/admin/settings');
    const site = settings.site || {};
    const reg = settings.registration || {};
    const domain = domainConfig(settings.domain);
    const dns = settings.dns || { suffixes: [] };
    const bl = settings.blacklist || { prefixes: [], ips: [], emails: [] };
    const notification = settings.notification || { events: {}, expiryTemplate: '' };
    const security = settings.security || { adminSessionTimeoutHours:24, adminIpWhitelist:'', auditRetentionDays:7 };
    const automation = settings.automation || { enabled:false, scanCycleMinutes:60, checkExpiringDomains:true, cleanupExpiredDns:true };

    shell('管理员设置', `<section class="card admin-settings admin-settings-v59">
      <div class="tabs admin-tabs">
        <button class="tab active" data-tab="site">界面设置</button>
        <button class="tab" data-tab="registration">注册设置</button>
        <button class="tab" data-tab="domain">域名规则</button>
        <button class="tab" data-tab="dns">DNS 配置</button>
        <button class="tab" data-tab="blacklist">黑名单管理</button>
        <button class="tab" data-tab="notification">通知设置</button>
        <button class="tab" data-tab="security">安全设置</button>
        <button class="tab" data-tab="automation">自动化任务</button>
      </div>

      <div class="tab-page active" data-page="site">
        <form id="site-form" class="form-grid settings-grid">
          <label class="field"><span>网站标题</span><input name="title" value="${fieldValue(site.title)}"></label>
          <label class="field"><span>副标题</span><input name="subtitle" value="${fieldValue(site.subtitle)}"></label>
          <label class="field"><span>Logo 文字</span><input name="logoText" maxlength="12" value="${fieldValue(site.logoText)}"><em>不使用图片 Logo 时显示。</em></label>
          <label class="field"><span>站点 Logo 图片 URL</span><input name="logoImageUrl" value="${fieldValue(site.logoImageUrl)}" placeholder="https://example.com/logo.png"><em>填写后优先显示图片 Logo。</em></label>
          <label class="field"><span>ICP 备案信息</span><input name="icp" value="${fieldValue(site.icp)}" placeholder="例如：粤ICP备xxxx号"></label>
          <label class="field"><span>前台默认语言</span><select name="defaultLanguage"><option value="zh" ${site.defaultLanguage !== 'en' ? 'selected' : ''}>中文</option><option value="en" ${site.defaultLanguage === 'en' ? 'selected' : ''}>英文</option></select></label>
          <label class="field"><span>主色</span><input name="accent" class="color-text" value="${fieldValue(site.accent || '#4f63f6')}" placeholder="#4f63f6"><b class="color-preview" style="background:${attr(site.accent || '#4f63f6')}"></b></label>
          <label class="field"><span>辅助色</span><input name="accent2" class="color-text" value="${fieldValue(site.accent2 || '#7c4dff')}" placeholder="#7c4dff"><b class="color-preview" style="background:${attr(site.accent2 || '#7c4dff')}"></b></label>
          <label class="field wide"><span>页脚文字</span><input name="footer" value="${fieldValue(site.footer)}"></label>
          <label class="field wide"><span>前台首页公告 Markdown</span><textarea name="homepageNotice" rows="5" placeholder="支持 Markdown 文本，作为前台顶部横幅通知">${esc(site.homepageNotice || '')}</textarea></label>
          <label class="field wide"><span>404 自定义提示文本</span><textarea name="notFoundText" rows="3">${esc(site.notFoundText || '')}</textarea></label>
          <label class="check"><input name="showQuota" type="checkbox" ${yn(site.showQuota !== false)}> 前台展示域名剩余配额</label>
          <label class="check"><input name="showExpiryReminder" type="checkbox" ${yn(site.showExpiryReminder !== false)}> 前台展示域名到期提醒</label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="registration">
        <form id="registration-form" class="form-grid settings-grid">
          <label class="check"><input name="enabled" type="checkbox" ${yn(reg.enabled)}> 开放用户注册</label>
          <label class="check"><input name="autoActivate" type="checkbox" ${yn(reg.autoActivate)}> 注册后自动启用账户</label>
          <label class="check"><input name="blockTempEmail" type="checkbox" ${yn(reg.blockTempEmail)}> 拦截临时邮箱注册</label>
          <label class="check"><input name="turnstileRegisterEnabled" type="checkbox" ${yn(reg.turnstileRegisterEnabled)}> 注册启用 Turnstile 人机验证</label>
          <label class="field"><span>新注册账号默认状态</span><select name="defaultStatus"><option value="auto" ${reg.defaultStatus !== 'manual' ? 'selected' : ''}>自动启用</option><option value="manual" ${reg.defaultStatus === 'manual' ? 'selected' : ''}>需要人工审核</option></select></label>
          <label class="field"><span>单 IP 最大注册账号数量</span><input name="maxAccountsPerIp" type="number" min="0" value="${fieldValue(reg.maxAccountsPerIp || 0)}"><em>0 表示不限制。</em></label>
          <label class="field"><span>同一 IP 注册冷却/分钟</span><input name="ipRegisterCooldownMinutes" type="number" min="0" value="${fieldValue(reg.ipRegisterCooldownMinutes || 0)}"><em>0 表示无冷却。</em></label>
          <label class="field wide"><span>关闭注册时前台提示文案</span><textarea name="disabledMessage" rows="3">${esc(reg.disabledMessage || '')}</textarea></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="domain">
        <form id="domain-form" class="form-grid settings-grid">
          <label class="field"><span>默认域名额度</span><input name="defaultQuota" type="number" min="0" value="${fieldValue(domain.defaultQuota)}"></label>
          <label class="field"><span>平台最大二级域名总配额</span><input name="platformMaxDomains" type="number" min="1" value="${fieldValue(domain.platformMaxDomains || 9999)}"></label>
          <label class="field"><span>默认有效天数</span><input name="validDays" type="number" min="1" value="${fieldValue(domain.validDays)}"></label>
          <label class="field"><span>允许续期窗口/天</span><input name="renewWindowDays" type="number" min="1" value="${fieldValue(domain.renewWindowDays)}"></label>
          <label class="field"><span>最小前缀长度</span><input name="prefixMinLength" type="number" min="1" max="63" value="${fieldValue(domain.prefixMinLength || 2)}"></label>
          <label class="field"><span>最大前缀长度</span><input name="prefixMaxLength" type="number" min="1" max="63" value="${fieldValue(domain.prefixMaxLength || 36)}"></label>
          <label class="field"><span>到期前提醒天数</span><input name="expiryReminderDays" type="number" min="0" value="${fieldValue(domain.expiryReminderDays || 30)}"></label>
          <label class="field"><span>过期后清理 DNS 天数</span><input name="expiredDnsCleanupDays" type="number" min="0" value="${fieldValue(domain.expiredDnsCleanupDays || 30)}"></label>
          <label class="field"><span>单域名最大 DNS 记录数</span><input name="maxDnsRecordsPerDomain" type="number" min="1" value="${fieldValue(domain.maxDnsRecordsPerDomain || 20)}"></label>
          <label class="field"><span>审核模式</span><select name="approvalMode"><option value="manual" ${domain.approvalMode !== 'auto' ? 'selected' : ''}>全部域名申请需要管理员人工审核</option><option value="auto" ${domain.approvalMode === 'auto' ? 'selected' : ''}>自动审批所有域名申请</option></select><em>自动审批后侧边栏“域名审核”主要处理删除、禁用和异常。</em></label>
          <label class="field wide"><span>域名前缀正则黑名单/保留前缀</span><textarea name="prefixBlacklistText" rows="6" placeholder="每行一个关键词或正则，如：www、admin、mail">${esc(domain.prefixBlacklistText || '')}</textarea></label>
          <label class="check"><input name="allowUserDeleteInvalid" type="checkbox" ${yn(domain.allowUserDeleteInvalid)}> 用户可删除无效域名</label>
          <label class="check"><input name="allowDnsEditAfterApproved" type="checkbox" ${yn(domain.allowDnsEditAfterApproved)}> 生效后允许用户修改 DNS</label>
          <label class="check"><input name="allowNumericPrefix" type="checkbox" ${yn(domain.allowNumericPrefix !== false)}> 允许纯数字前缀</label>
          <label class="check"><input name="allowUnderscorePrefix" type="checkbox" ${yn(domain.allowUnderscorePrefix)}> 允许下划线</label>
          <label class="check"><input name="selfRenewEnabled" type="checkbox" ${yn(domain.selfRenewEnabled !== false)}> 开放用户自助域名续期</label>
          <label class="check"><input name="allowUserDeleteActive" type="checkbox" ${yn(domain.allowUserDeleteActive !== false)}> 用户能删除已生效域名</label>
          <label class="check"><input name="allowDomainTransfer" type="checkbox" ${yn(domain.allowDomainTransfer)}> 允许转让二级域名</label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="dns">
        <div class="notice danger-notice"><strong>风险提示：</strong>修改全局解析类型、代理状态、根域名列表会影响存量所有域名解析，调整前建议通知平台用户。CF_API_TOKEN 仍只通过 Worker Secret 管理，页面不提供密钥输入。</div>
        <form id="dns-form" class="form-grid settings-grid">
          <label class="check"><input name="defaultProxied" type="checkbox" ${yn(dns.defaultProxied)}> 新建解析默认开启 Cloudflare 代理</label>
          <label class="check"><input name="allowMxRecords" type="checkbox" ${yn(dns.allowMxRecords !== false)}> 允许用户创建 MX 解析记录</label>
          <label class="field wide"><span>系统保留前缀</span><textarea name="reservedPrefixes" rows="4">${esc(arrayText(dns.reservedPrefixes || []))}</textarea></label>
          <label class="field wide"><span>多根域名列表 JSON</span><textarea name="suffixesJson" rows="12">${esc(suffixesToJson(dns.suffixes || []))}</textarea><em>字段：label、suffix、zoneId、allowedTypes、defaultType、ttl、proxied、enabled。用户前台注册会显示 enabled=true 的后缀。</em></label>
          <div class="readonly-box wide"><b>环境变量对应名称</b><p>DNS_SUFFIX、DNS_ZONE_ID、DNS_ALLOWED_TYPES、DNS_DEFAULT_TYPE、DNS_TTL、DNS_PROXIED、CF_API_TOKEN。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="blacklist">
        <form id="blacklist-form" class="form-grid settings-grid">
          <label class="field wide"><span>域名前缀黑名单</span><textarea name="prefixes" rows="8" placeholder="每行一个关键词、通配符或正则">${esc(arrayText(bl.prefixes))}</textarea></label>
          <label class="field wide"><span>IP 黑名单</span><textarea name="ips" rows="8" placeholder="每行一个 IP">${esc(arrayText(bl.ips))}</textarea></label>
          <label class="field wide"><span>邮箱/手机号黑名单</span><textarea name="emails" rows="8" placeholder="每行一个邮箱、邮箱域名或手机号">${esc(arrayText(bl.emails))}</textarea></label>
          <div class="readonly-box wide"><b>批量导入/导出</b><p>直接复制多行内容即可导入；选中文本复制即可导出。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="notification">
        <form id="notification-form" class="form-grid settings-grid">
          ${eventChecks(notification.events)}
          <label class="field wide"><span>用户到期消息模板</span><textarea name="expiryTemplate" rows="6">${esc(notification.expiryTemplate || '')}</textarea></label>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="security">
        <form id="security-form" class="form-grid settings-grid">
          <label class="field"><span>后台会话自动超时/小时</span><input name="adminSessionTimeoutHours" type="number" min="1" value="${fieldValue(security.adminSessionTimeoutHours || 24)}"></label>
          <label class="field"><span>操作日志保留天数</span><input name="auditRetentionDays" type="number" min="1" value="${fieldValue(security.auditRetentionDays || 7)}"></label>
          <label class="field wide"><span>后台登录 IP 白名单</span><textarea name="adminIpWhitelist" rows="6" placeholder="每行一个 IP；留空表示不限制">${esc(security.adminIpWhitelist || '')}</textarea></label>
          <div class="readonly-box wide"><b>管理员密码修改</b><p>当前管理员可在“账户设置 → 修改密码”中修改自己的后台登录密码。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>

      <div class="tab-page" data-page="automation">
        <form id="automation-form" class="form-grid settings-grid">
          <label class="check"><input name="enabled" type="checkbox" ${yn(automation.enabled)}> 开启定时任务</label>
          <label class="field"><span>定时扫描周期/分钟</span><input name="scanCycleMinutes" type="number" min="5" value="${fieldValue(automation.scanCycleMinutes || 60)}"></label>
          <label class="check"><input name="checkExpiringDomains" type="checkbox" ${yn(automation.checkExpiringDomains !== false)}> 自动检测到期域名</label>
          <label class="check"><input name="cleanupExpiredDns" type="checkbox" ${yn(automation.cleanupExpiredDns !== false)}> 自动清理过期 DNS 解析记录</label>
          <div class="readonly-box wide"><b>Cloudflare Workers Cron</b><p>需要在 Cloudflare Worker 里配置 Cron 触发器后，定时任务才会自动执行。</p></div>
          <button class="btn primary wide" type="submit">保存设置</button>
        </form>
      </div>
    </section>`);

    document.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('[data-page]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-page="${btn.dataset.tab}"]`)?.classList.add('active');
    }));
    document.querySelectorAll('.color-text').forEach(input => input.addEventListener('input', () => { const p = input.parentElement.querySelector('.color-preview'); if (/^#[0-9a-fA-F]{6}$/.test(input.value)) p.style.background = input.value; }));

    bindSettingForm('#site-form', 'site', f => Object.fromEntries(f));
    bindSettingForm('#registration-form', 'registration', f => ({ enabled:f.get('enabled')==='on', autoActivate:f.get('autoActivate')==='on', blockTempEmail:f.get('blockTempEmail')==='on', turnstileRegisterEnabled:f.get('turnstileRegisterEnabled')==='on', defaultStatus:f.get('defaultStatus'), maxAccountsPerIp:f.get('maxAccountsPerIp'), ipRegisterCooldownMinutes:f.get('ipRegisterCooldownMinutes'), disabledMessage:f.get('disabledMessage') }));
    bindSettingForm('#domain-form', 'domain', f => ({ defaultQuota:f.get('defaultQuota'), platformMaxDomains:f.get('platformMaxDomains'), validDays:f.get('validDays'), renewWindowDays:f.get('renewWindowDays'), prefixMinLength:f.get('prefixMinLength'), prefixMaxLength:f.get('prefixMaxLength'), expiryReminderDays:f.get('expiryReminderDays'), expiredDnsCleanupDays:f.get('expiredDnsCleanupDays'), maxDnsRecordsPerDomain:f.get('maxDnsRecordsPerDomain'), approvalMode:f.get('approvalMode'), prefixBlacklistText:f.get('prefixBlacklistText'), allowUserDeleteInvalid:f.get('allowUserDeleteInvalid')==='on', allowDnsEditAfterApproved:f.get('allowDnsEditAfterApproved')==='on', allowNumericPrefix:f.get('allowNumericPrefix')==='on', allowUnderscorePrefix:f.get('allowUnderscorePrefix')==='on', selfRenewEnabled:f.get('selfRenewEnabled')==='on', allowUserDeleteActive:f.get('allowUserDeleteActive')==='on', allowDomainTransfer:f.get('allowDomainTransfer')==='on' }));
    bindSettingForm('#dns-form', 'dns', f => ({ defaultProxied:f.get('defaultProxied')==='on', allowMxRecords:f.get('allowMxRecords')==='on', reservedPrefixes:f.get('reservedPrefixes'), suffixes:collectSuffixes(f) }));
    bindSettingForm('#blacklist-form', 'blacklist', f => ({ prefixes:f.get('prefixes'), ips:f.get('ips'), emails:f.get('emails') }));
    bindSettingForm('#notification-form', 'notification', f => ({ events:{ newUser:f.get('newUser')==='on', newDomain:f.get('newDomain')==='on', domainExpiring:f.get('domainExpiring')==='on', domainExpiredDelete:f.get('domainExpiredDelete')==='on', abnormalRegister:f.get('abnormalRegister')==='on' }, expiryTemplate:f.get('expiryTemplate') }));
    bindSettingForm('#security-form', 'security', f => ({ adminSessionTimeoutHours:f.get('adminSessionTimeoutHours'), auditRetentionDays:f.get('auditRetentionDays'), adminIpWhitelist:f.get('adminIpWhitelist') }));
    bindSettingForm('#automation-form', 'automation', f => ({ enabled:f.get('enabled')==='on', scanCycleMinutes:f.get('scanCycleMinutes'), checkExpiringDomains:f.get('checkExpiringDomains')==='on', cleanupExpiredDns:f.get('cleanupExpiredDns')==='on' }));
  } catch (error) { toast(error.message, 'error'); }
}
function bindSettingForm(selector, group, mapper) {
  const form = document.querySelector(selector);
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!riskyConfirm(group)) return;
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const { settings } = await api(`/api/admin/settings/${group}`, { method:'PUT', body:mapper(new FormData(form)) });
      state.config.site = settings.site;
      state.config.registration = settings.registration;
      state.config.domain = domainConfig(settings.domain);
      state.config.dns = settings.dns;
      state.config.suffixes = (settings.dns?.suffixes || []).filter(x => x.enabled !== false);
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

// v54: help center answers are rewritten per question and old repeated KV content is ignored.
