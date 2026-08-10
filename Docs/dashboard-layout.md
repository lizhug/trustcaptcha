# TrustCaptcha Dashboard Layout 说明

> 阶段：5 / 12

## 文件变化

- 使用 ProLayout 构建固定 Header、响应式 Sider、Menu、账号 Dropdown 和租户标识。
- 建立 Overview、Sites、Verification Logs、API Keys 四个受保护路由。
- 首页使用 Statistic、ProCard 和 Ant Design Charts 展示请求量、成功率、失败量、平均风险分、14 日趋势和风险分布。
- 指标直接按 AuthContext 的 customerId 查询 PostgreSQL，不接受浏览器传入租户 ID。

## 设计原因

路由组 `(dashboard)` 让登录页保持独立，同时对所有后台页面统一执行服务端权限检查和壳层渲染。ProLayout 只负责交互与导航，真实授权仍由每个页面和 Route Handler 的服务端 guard 完成。

图表组件使用客户端懒加载，避免图形引擎参与服务端渲染；统计数据仍在 Server Component 中查询后以纯 JSON 下发。首页默认统计 30 天，趋势显示最近 14 天并补齐无请求日期。

## 测试方法

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

连接 PostgreSQL 后，以 Admin 和 Developer 登录，检查菜单导航、租户名称、账号菜单、四个统计指标和三张图表。跨租户测试必须证明 URL 或请求参数不能切换 customerId。
