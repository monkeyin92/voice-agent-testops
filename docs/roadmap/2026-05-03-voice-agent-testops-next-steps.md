# Voice Agent TestOps 下一阶段计划表

日期：2026-05-03  
目标：把当前本地 TestOps MVP 推进到“外部开发者可以接真实 Agent 试用”的状态。

## 计划表

| 顺序 | 事项 | 产物 | 验收标准 | 状态 |
|---:|---|---|---|---|
| 1 | 固化下一阶段计划 | 本文件 | 能说明做什么、不做什么、如何验收 | 已完成 |
| 2 | 接真实 Agent 的最短路径 | OpenClaw adapter + CLI 参数 | `--agent openclaw` 可读取 endpoint/API key 并调用兼容接口 | 已完成 |
| 3 | 公开 demo 包 | README、`.env.example`、示例 suite、报告说明 | 新开发者按 README 能跑本地 demo，知道如何接 OpenClaw/HTTP | 已完成 |
| 4 | 中文场景库起点 | `examples/voice-testops/chinese-risk-suite.json` | 覆盖乱报价、承诺、档期、转人工、留资等高风险场景 | 已完成 |
| 5 | 外部验证清单 | `docs/growth/voice-agent-testops-validation.md` | 明确 10 个试用对象、联系话术、成功指标；不伪造执行结果 | 已完成 |
| 6 | 完整验证 | 测试、CLI demo、构建、审计 | `npm test`、三个 demo suite、`npm run build`、`npm audit --audit-level=high` 通过 | 已完成 |

## 本阶段不做

- 不做 Web dashboard。
- 不做支付、账号、团队权限。
- 不做 FreeSWITCH/SIP 电话接入。
- 不做真实音频注入。
- 不做面向普通商家的交付功能。

## 成功标准

仓库内成功标准：

- 开发者能用本地 demo suite 看到 TestOps 如何工作。
- 开发者能用 OpenClaw/HTTP endpoint 接自己的 Agent。
- 报告能明确指出每轮对话的失败原因。
- 中文风险场景库能作为传播和试用入口。

市场验证成功标准：

- 7 天内找到 10 个正在做 voice agent 的开发者或集成商试用。
- 至少 3 个外部 Agent 跑通测试。
- 至少 1 个用户愿意继续试点或讨论付费。
