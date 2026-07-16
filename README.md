# Cloudflare 中文二级域名申请系统｜动态目标版

无服务器架构：Cloudflare Workers + D1 + KV + Turnstile + DNS API；GitHub 只保存源码，不使用 R2。

## 本版本特点

- 用户输入中文/英文前缀并选择后缀。
- 每条申请独立选择 `CNAME`、`A` 或 `AAAA`。
- 每条申请填写不同的 DNS 目标。
- Worker 服务端验证 Turnstile。
- 管理员审核后调用 Cloudflare DNS API 创建记录。
- D1 保存用户、申请、目标、审核和审计数据。
- KV 保存会话、限流和缓存。
- 密钥和真实域名配置放在 Cloudflare Worker Variables/Secrets 中。

## 必要环境变量

机密：

```text
BOOTSTRAP_ADMIN_TOKEN
TURNSTILE_SECRET
CF_API_TOKEN
```

普通变量：

```text
CONFIG_MODE=env
TURNSTILE_SITE_KEY=你的站点密钥
TURNSTILE_EXPECTED_HOSTNAME=storage.example.com
TURNSTILE_ENABLE_APPLY=true
TURNSTILE_ENABLE_LOGIN=false
TURNSTILE_ENABLE_REGISTER=false
TURNSTILE_ACTION_APPLY=domain_apply
TURNSTILE_ACTION_LOGIN=login
TURNSTILE_ACTION_REGISTER=register

DNS_SUFFIX_LABEL=免费二级域名
DNS_SUFFIX=example.com
DNS_ZONE_ID=你的 Zone ID
DNS_ALLOWED_TYPES=CNAME,A,AAAA
DNS_DEFAULT_TYPE=CNAME
DNS_TTL=1
DNS_PROXIED=false
DNS_RESERVED_PREFIXES=www,api,admin,apply,storage,mail,smtp,imap,pop,ftp,cdn,static,status,support
```

动态目标版不要设置 `DNS_TARGET`。旧变量 `DNS_RECORD_TYPE` 也应删除，改用 `DNS_ALLOWED_TYPES` 和 `DNS_DEFAULT_TYPE`。

## 构建

```bash
npm ci
npm run check
npm run dry-run
```

详细升级操作见 `动态目标升级说明.md`。
