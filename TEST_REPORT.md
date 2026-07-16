# 测试报告｜动态 DNS 目标版

已验证：

- TypeScript `tsc --noEmit` 通过。
- 前端 JavaScript 语法检查通过。
- Wrangler dry-run 构建通过。
- 单后缀环境变量可正确输出 `allowedTypes` 和 `defaultType`。
- 中文前缀可转换为 Punycode。
- CNAME 每条申请可保存不同目标。
- 带 `https://` 或路径的 CNAME 目标会被拒绝。
- 申请记录在 D1 中保存 `record_type` 和 `record_content`。
- 原有 D1 表结构无需新增迁移。

未对用户真实 Zone 执行 DNS 创建，以避免修改线上记录。
