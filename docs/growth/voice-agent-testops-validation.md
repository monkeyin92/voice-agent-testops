# Voice Agent TestOps 外部验证清单

日期：2026-05-03  
目标：7 天内验证“开发者愿意把自己的语音 Agent 接进来跑测试”。

## 验证对象

优先找以下 10 类人，不找普通商家：

1. 正在做 OpenClaw Agent 的开发者。
2. 正在做 Dify/Coze/自研 Agent 并接语音入口的开发者。
3. 做 AI 客服项目交付的集成商。
4. 做电话机器人或呼叫中心 AI 改造的团队。
5. 使用 Vapi、Retell、Twilio、Telnyx 等语音平台的开发者。
6. 做私域客服自动化的 SaaS 团队。
7. 做企业内部 AI 平台的工程师。
8. 做 RAG 客服知识库的团队。
9. 做实时语音 demo 的独立开发者。
10. 做 AI agent 评测、观测、prompt ops 的团队。

## 触达渠道

- GitHub：给 voice-agent / openclaw / realtime-agent 相关项目提 issue 或 discussion。
- V2EX：发“语音 Agent 上线前怎么做回归测试”的技术帖。
- 掘金：发实现拆解文章。
- 即刻/微信群/飞书群：找 AI agent、AI 产品、独立开发者圈子。
- B 站/小红书：发 2 分钟 demo，标题聚焦“AI 客服乱报价怎么自动测”。

## 试用邀请话术

```text
我在做一个 Voice Agent TestOps 小工具，目标是让语音 Agent 上线前可以自动跑回归测试：

- 检查是否乱报价/乱承诺
- 检查是否漏收手机号、预算、时间
- 检查是否正确识别转人工
- 输出 JSON/HTML 报告，可接 CI

现在支持本地 demo、HTTP endpoint 和 OpenClaw-compatible endpoint。

你如果正在做 voice agent，我想请你用自己的 agent 跑一次。试用只需要一个 POST endpoint，10 分钟内能接上。
仓库命令：
npm run voice-test -- --suite examples/voice-testops/openclaw-suite.json --agent openclaw --endpoint <your-url>

如果想先看失败报告长什么样：
npm run voice-test -- --suite examples/voice-testops/failing-demo-suite.json --json .voice-testops/failing-demo.json --html .voice-testops/failing-demo.html || true
```

## 试用记录表

详细执行表已升级到：[外部试跑记录表](../ops/external-pilot-tracker.zh-CN.md)。这里保留简版视图，用于快速看 7 天验证目标是否推进。

| 日期 | 对象 | Agent 类型 | 接入方式 | 是否跑通 | 跑通耗时 | 首次失败类型 | 是否生成 regression | 是否愿意继续试点 | 备注 |
|---|---|---|---|---|---:|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |

## 访谈问题

1. 你现在怎么测试语音 Agent 上线质量？
2. 最怕上线后出什么事故？
3. 如果测试失败，你最想看到什么定位信息？
4. 你希望接 CLI、API、GitHub Action，还是 Web dashboard？
5. 你愿意为哪类能力付费：场景库、监控、私有化、adapter、报告、CI gate？

## 成功指标

7 天验证目标：

- 联系 20 个潜在用户。
- 获得 10 个有效回复。
- 至少 3 个外部 Agent 跑通一次 suite。
- 至少 1 个用户愿意进入持续试点或讨论付费。

继续投入标准：

- 如果 3 个外部 Agent 都能在 30 分钟内接入，继续做 OpenClaw/WebSocket adapter 和 GitHub Action。
- 如果用户只认可报告但不愿意接入，优先做“从录音/转写生成 suite”。
- 如果用户主要要线上监控，下一阶段做抽样监控和失败回归生成。
- 如果 7 天内没有外部试用，暂停 dashboard 开发，回到用户访谈和定位调整。

## 演示材料清单

- 通过型报告：运行 `examples/voice-testops/chinese-risk-suite.json`。
- 失败型报告：运行 `examples/voice-testops/failing-demo-suite.json`。
- CI 示例：`.github/workflows/voice-testops.yml`。
- 对外一句话：给语音 Agent 加一套上线前回归测试，自动抓乱承诺、漏留资、意图识别错误和延迟超标。
