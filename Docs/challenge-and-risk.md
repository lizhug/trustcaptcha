# TrustCaptcha Challenge Service 与 RiskEngine

> 阶段：7 / 12

## 文件变化

- `packages/captcha-core` 实现 Challenge 创建、绑定验证、过期检查和终态编排。
- `packages/risk-engine` 实现 IP 频率、User-Agent、Cookie/Storage、Session 绑定、验证耗时和聚合交互行为规则。
- `packages/sdk` 在 Widget 生命周期内聚合 Pointer/键盘输入特征，并将临时 `TC` 字样替换为正式的 TrustCaptcha 图形标。
- API 新增 widget config、challenge create 和 challenge complete Route Handlers。
- Redis adapter 使用 TTL key、Lua 原子终结和多维固定窗限流。

## Redis 状态

`challenge:{id}` 保存 CREATED/PASSED/REJECTED 状态并设置 300 秒 TTL。完成操作由 Lua 在一次 Redis 命令中检查：状态、过期时间、nonce hash、IP hash 和 User-Agent hash，然后写入 score/reasons/终态。并发 complete 最多一个返回成功。

`ratelimit:*` 使用 INCR + PEXPIRE Lua，覆盖 IP、Site、IP+Site、Challenge 等维度。Redis 不可用时 challenge 路径返回 503，不降级为单实例内存状态。

## 风险评分

初始分 100，规则扣分后裁剪至 0–100。安全绑定不一致不仅扣分，还强制拒绝。Site 的 `riskThreshold` 决定通过阈值，默认 60。

行为采集不会上传原始鼠标坐标或完整轨迹。SDK 仅上报经过量化和上限约束的事件数、总距离、持续时间、方向变化、路径效率、点击时长、输入方式、可信事件标记以及焦点/可见性变化，总载荷约 200 字节。数据只参与当前 Challenge 的即时评分，不写入独立行为画像。

键盘与触摸输入不要求鼠标移动。鼠标静止、过度直线、非可信脚本事件、异常点击时长、频繁失焦和完全缺失的交互信号会分别扣分。行为信号只能提高自动化成本，不能单独证明真人身份，因此仍与 Origin、IP/UA/Nonce 绑定、限流、TTL、一次性状态和 Token 防重放组合使用。

## 自适应验证

SDK 支持 `managed`、`checkbox` 和 `invisible` 三种模式。`managed` 由服务端结合请求频率与客户端环境选择无感验证或复选框；显式 `checkbox` 保持可见交互；显式 `invisible` 自动完成后台验证。服务端会把最终模式写入 Challenge，前端不能通过修改完成请求绕过对应的评分规则。

每次验证携带长度不超过 32 字符的 `action`。Action 被写入 Challenge 和签名 Token，站点后端调用 `/api/v1/verify` 时必须提交同一个 Action；不一致返回 `TOKEN_ACTION_MISMATCH`，防止低价值页面的 Token 被挪用到登录、注册或支付流程。未传 Action 的旧接入默认使用 `generic`。

高频或明显自动化的请求会收到 SHA-256 Proof-of-Work。Challenge 保存随机 Salt 与难度，SDK 分批计算 Nonce 并主动让出事件循环，完成接口在服务端重新计算并验证前导零位。无效或缺失的必需证明以 `POW_INVALID` 硬拒绝。

VerificationLog 持久化 Action，Dashboard 展示最近 30 天按 Action 聚合的请求量、成功量和平均风险分；日志页与 CSV 导出同样包含 Action。

完成接口只在 Challenge 原子终结为 PASSED 后签发短时、一次性、绑定 Site 与 Action 的 HMAC Token；服务端 Verify 消费成功后 Token 立即不可重放。

## 测试方法

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Redis 集成测试需额外并发提交同一 challenge，断言只有一个 Lua 终结成功，并验证 TTL、绑定错误、过期、限流及 Redis 故障时的 fail-closed 行为。

SDK 单元测试还应断言：请求体只含聚合字段、不含坐标数组；鼠标、触摸和键盘路径均可生成有界信号；销毁 Widget 后事件监听器被释放；小尺寸正式 Logo 存在于 Shadow DOM。
