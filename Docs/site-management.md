# TrustCaptcha Site 管理说明

> 阶段：6 / 12

## 文件变化

- `/sites` 使用 ProTable、ModalForm、DrawerForm、Modal 和 Popconfirm 实现查询、创建、编辑、禁用和软删除。
- 新增租户作用域管理 API：`GET/POST /api/management/sites` 与 `PATCH/DELETE /api/management/sites/:id`。
- 新增域名规范化、Site Key/Secret Key 生成、Argon2id Secret 摘要和安全审计。
- 创建成功后明文 Secret 只随 201 响应返回一次；后续界面只显示 prefix/last4。

## 设计原因

Site Key 是可公开的浏览器标识，使用 `tc_pk_` 前缀；Secret Key 是服务端凭证，格式包含公开定位用 key id 和 256-bit 随机 secret。数据库只保存 Argon2id(secret + pepper) 摘要，无法恢复明文。

所有查询和变更同时使用 Session 派生的 customerId 与资源 ID。Developer 可创建和编辑站点，只有 Admin 具有软删除权限。管理写请求额外校验 Origin，降低 Session Cookie 被跨站利用的风险。

域名默认规范化为 HTTPS 精确 Origin；只有 localhost/loopback 允许 HTTP。包含路径、查询、用户凭证或 fragment 的输入会被拒绝。

## 测试方法

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

连接数据库后还需验证：同租户重复域名返回 409；另一个租户无法读取或更新资源；Secret 只出现于创建响应；Developer 删除返回 403；软删除后域名可重新注册。
