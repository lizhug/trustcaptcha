# TrustCaptcha Monorepo 初始化说明

> 阶段：3 / 12

## 文件变化

- 初始化 pnpm workspace 与 Turborepo 任务图。
- 建立 dashboard、api、demo 三个 Next.js 15 应用。
- 建立 captcha-core、token、risk-engine、sdk、shared、database 六个 workspace package。
- 配置 TypeScript strict、ESLint、Prettier、Vitest、Prisma 7 generator 与环境变量模板。
- 三个应用均支持通过 `TRUSTCAPTCHA_STANDALONE=true` 启用 Next.js standalone 输出；Windows 本地默认关闭，避免无开发者模式时创建依赖符号链接失败，Docker/Linux 构建会强制开启。

## 设计原因

- 固定 Next.js 15、React 19.1、Ant Design 5 和 Prisma 7 的补丁版本，避免跨主版本的不确定性。
- 内部 package 使用 `workspace:*`，第三方公共依赖使用 pnpm catalog，升级位置唯一。
- 共享包直接导出 TypeScript 源码，由 Next.js `transpilePackages` 处理；v1 不为每个内部包增加无必要的发布构建。
- Prisma Client 使用显式输出目录并被 Git 忽略，CI/构建始终从 schema 重新生成。
- 每个 workspace 都有独立 lint/typecheck/test/build 命令，由 Turbo 统一编排。

## 测试方法

```powershell
pnpm install --frozen-lockfile
pnpm db:validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

阶段门要求以上命令全部通过，并确认三个 Next.js 应用均完成生产构建。standalone 输出在 Docker 阶段的 Linux builder 中验证，因为未开启开发者模式的 Windows 不允许 Next.js 创建所需的依赖符号链接。
