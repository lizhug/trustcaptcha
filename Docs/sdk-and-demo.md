# TrustCaptcha JavaScript SDK 与 Demo

> 阶段：9 / 12

## 文件变化

- `packages/sdk` 输出无 React 依赖的 IIFE `trustcaptcha.js`，全局 API 为 `TrustCaptcha.render`。
- Widget 使用 Shadow DOM 隔离样式，支持异步加载、ARIA、重复 render 去重、请求取消、重复提交锁、reset 和 destroy。
- 构建时把 SDK 复制到 API 与 Demo 的 public 目录。
- Demo 从 API 域加载 script，收到 callback token 后发送到 Demo 服务端 Route Handler，再由服务端携带 Secret 调用 Verify。

## 浏览器接入

```html
<div id="captcha"></div>
<script async defer src="https://api.example.com/trustcaptcha.js"></script>
<script>
  TrustCaptcha.render({
    element: "#captcha",
    siteKey: "tc_pk_xxx",
    callback(token) {
      // Submit token with the protected form to your own server.
    },
  });
</script>
```

Secret Key 永远不进入浏览器。客户服务端把用户提交的 token 发送给 `/api/v1/verify`，并在 Authorization header 中使用 Secret/API Key。

## 测试方法

```powershell
pnpm --filter @trustcaptcha/sdk build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

SDK 单测验证异步加载、callback 只触发一次、重复 render 复用 handle 和 reset/destroy 生命周期。全链路测试在 PostgreSQL/Redis 启动后通过 Demo 页面执行。
