# TrustCaptcha Token Service 与 Verify API

> 阶段：8 / 12

## 文件变化

- `packages/token` 实现 `tc1.payload.signature` HMAC-SHA256 token、严格解析、过期检查和 key ring 轮换。
- Challenge 通过后签发包含 challengeId、siteId、iat、exp、jti、kid 和 score 的短时 token。
- Redis Lua 将 PASSED 原子推进到 TOKEN_ISSUED，并在 Verify 时原子推进到 CONSUMED，同时写入 replay marker。
- 新增认证的 `POST /api/v1/verify`，body 仅包含 token，凭证放在 Bearer Authorization。

## Verify 调用

```http
POST /api/v1/verify
Authorization: Bearer tc_sk_<key-id>_<secret>
Content-Type: application/json

{"token":"tc1...."}
```

Verify 先对 IP 和 credential id 限流，再用 Argon2id 校验 Site Secret/API Key，随后校验 token 签名、时间和 Site/Customer 绑定，最后执行 Redis 原子消费。并发或后续重放只会有一次成功。

## Key 轮换

`TOKEN_SIGNING_KEYS` 可同时包含多把验证 key，`ACTIVE_TOKEN_SIGNING_KEY_ID` 指定新签发 key。旧 key 至少保留一个最大 token TTL 后再移除，实现无中断轮换。

## 测试方法

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Redis 集成测试需并发调用 Verify，断言同一 token 仅一个 `success: true`；另需覆盖签名篡改、过期、未知 kid、site/customer 不匹配、错误 Secret、key 轮换和 Redis 不可用。
