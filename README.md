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

v8 注册修复
登录页增加明显的创建新账户按钮。
用户注册默认开放，历史 KV 设置不会导致注册页关闭。
注册 Turnstile 在没有 token 时不会阻断注册，用于排查域名/脚本加载问题。

v9 注册/登录修复
注册后不再自动登录，避免旧 sessions 表结构导致“用户已创建但提示失败”。
自动补齐 sessions 表的 ip、user_agent、expires_at、created_at 字段。
登录时如遇旧坏密码哈希，不再返回服务器内部错误，而是明确提示用户名或密码错误。

v10 更新
管理员审核域名时，用户未配置 DNS 也可以批准通过。
未配置 DNS 的域名批准后状态为“正常”，但 DNS 显示为“未配置”。
用户后续进入域名管理添加 DNS 解析时，系统会自动创建 Cloudflare DNS 记录。
撤销/删除只有在实际存在 Cloudflare DNS 记录时才调用 Cloudflare API。
