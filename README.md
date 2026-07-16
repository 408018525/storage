Cloudflare 免费二级域名注册中心
适用于 Cloudflare Workers + D1 + KV + Turnstile + Cloudflare DNS API。
本版功能
注册新域名单独弹窗显示
用户默认 3 个域名额度
域名默认有效期 1 年
到期前 60 天可续期
申请页不显示 DNS 记录类型和目标地址
DNS 解析移动到“域名管理”详情页
无效域名删除界面
管理域名详情页：概览 / DNS 解析 / 续期和域名详情
管理员设置：界面、注册、域名规则、DNS 信息
管理员审核后写入 Cloudflare DNS
绑定名称
D1：`DB`
KV：`APP_KV`
Assets：`ASSETS`
必填 Worker 变量/机密
机密：
`BOOTSTRAP_ADMIN_TOKEN`
`CF_API_TOKEN`
`TURNSTILE_SECRET`
普通变量：
`DNS_SUFFIX`
`DNS_SUFFIX_LABEL`
`DNS_ZONE_ID`
`DNS_ALLOWED_TYPES`
`DNS_DEFAULT_TYPE`
`DNS_TTL`
`DNS_PROXIED`
`DNS_RESERVED_PREFIXES`
`TURNSTILE_SITE_KEY`
`TURNSTILE_EXPECTED_HOSTNAME`
`TURNSTILE_ENABLE_APPLY`
`TURNSTILE_ENABLE_LOGIN`
`TURNSTILE_ENABLE_REGISTER`
`TURNSTILE_ACTION_APPLY`
`TURNSTILE_ACTION_LOGIN`
`TURNSTILE_ACTION_REGISTER`

v7 更新
正常域名增加“申请删除域名”按钮。
用户提交后显示“待删除审核”，管理员在“域名审核”中批准或拒绝。
管理员批准删除后，系统自动删除 Cloudflare DNS 记录，并从用户域名列表隐藏。
已拒绝/已撤销域名仍支持用户直接删除无效记录。
