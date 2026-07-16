# Security Policy

## Reporting

请不要在公开 Issue 中提交真实 API Token、Turnstile Secret、APP_MASTER_KEY、用户密码、Cookie 或数据库导出。

发现安全问题时，应通过仓库维护者设置的私密安全报告渠道联系管理员，并提供：

- 受影响版本或 Commit
- 复现步骤
- 影响范围
- 已知缓解方式

## Secret 管理

下列内容必须使用 Cloudflare Worker Secrets 或后台加密设置，禁止提交到 GitHub：

- `APP_MASTER_KEY`
- `BOOTSTRAP_ADMIN_TOKEN`
- `TURNSTILE_SECRET`
- `CF_API_TOKEN`
- GitHub Actions 的 Cloudflare Token

`.dev.vars` 已加入 `.gitignore`。

## 上线检查

- 删除测试 Token 和测试用户
- 为运行时 DNS Token 限制目标 Zone
- 设置 Turnstile 预期主机名和 action
- 使用 HTTPS 自定义域名
- 检查管理员数量与权限
- 检查保留前缀
- 检查用户申请数量限制
- 检查公告与用户协议
- 在测试 Zone 先完成批准和撤销流程
