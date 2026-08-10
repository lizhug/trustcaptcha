# TrustCaptcha 认证与权限说明

> 阶段：4 / 12

## 文件变化

- Dashboard 接入 Auth.js v5、Credentials Provider 和 Prisma Adapter。
- 新增 Ant Design 登录页、Auth.js Route Handler、登出 Server Action 和 403 页面。
- 新增 Admin/Developer 权限矩阵与服务端 `requirePagePermission` 守卫。
- User 增加 `sessionVersion`，支持服务端让现有会话失效。
- 新增 Argon2id 管理员种子脚本和登录/RBAC 单元测试。

## 设计原因

Auth.js Credentials Provider 使用加密 JWT Session；这是该 Provider 的受支持路径。数据库仍保留 Auth.js Adapter 模型，后续启用 OAuth、Email 或 Passkey 时不需要重新设计用户表。

JWT 不是“签发后完全不查数据库”：每次服务端读取 Session 时都会重新检查 User 状态、`sessionVersion`、Customer 状态和 CustomerMember 状态。管理员暂停账号或增加 `sessionVersion` 后，旧会话立即失去租户上下文。后续流量增长时可把这次检查短时缓存到 Redis。

权限检查只在服务端完成。客户端菜单隐藏仅改善体验，不能作为授权边界。所有后续管理 Route Handlers 必须先构造 AuthContext，customerId 只来自 Session。

## 角色

- Admin：所有 Dashboard、站点、日志、密钥和成员权限。
- Developer：Dashboard、站点读写、日志查看/导出、站点/API Key 管理；不能删除站点或管理租户成员。

## 初始化账号

设置 `DATABASE_URL`、`SEED_ADMIN_EMAIL`、`SEED_ADMIN_PASSWORD` 后运行：

```powershell
pnpm --filter @trustcaptcha/database db:seed
```

种子密码至少 12 位。明文只从环境变量读取，数据库仅保存 Argon2id 摘要。

## 测试方法

```powershell
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

数据库集成测试将在 Docker/PostgreSQL 可用后验证：登录成功/失败、暂停账号、暂停成员、角色权限和 `sessionVersion` 撤销。
