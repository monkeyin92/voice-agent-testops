# Voice Agent TestOps 第一批外部验证名单

日期：2026-05-06

目标：今天先发出 5 个高相关试用邀请，验证开发者是否愿意把自己的 voice agent 接到 TestOps 跑一次。

项目地址：https://github.com/monkeyin92/voice-agent-testops

## 发送原则

- 先找正在做 voice agent 框架、SDK、平台示例、电话/实时语音服务端的人。
- 不在 issue 里硬广；优先发 discussion、社区频道、项目作者公开联系方式，或者在相关 issue 下先问是否适合分享测试工具。
- 邀请重点只讲一个动作：给一个 HTTP/OpenClaw-compatible endpoint，10-30 分钟跑一次 suite。
- 成功不是回复“感兴趣”，而是至少拿到一次真实 agent 的运行结果或明确的接入阻塞点。

## 第一批目标

| 优先级 | 目标 | 入口 | 为什么匹配 | 今天动作 |
|---:|---|---|---|---|
| 1 | Vapi developer ecosystem | [Vapi GitHub](https://github.com/VapiAI)，尤其是 voice test / SDK / examples | Vapi 是 voice AI for developers，仓库里已有 voice-agent test script 示例和多语言 SDK | 找官方 examples 或 community discussion，发英文短邀请 |
| 2 | Retell AI custom LLM / workflow ecosystem | [RetellAI GitHub](https://github.com/RetellAI) | Retell 面向 AI voice agent，custom LLM demo 和 n8n workflow 用户非常需要上线前回归测试 | 找 custom LLM demo / n8n 相关入口，询问是否有人愿意试跑测试报告 |
| 3 | LiveKit Agents JS / starter users | [livekit/agents-js](https://github.com/livekit/agents-js) | LiveKit Agents 明确用于 realtime multimodal / voice agents，适合接测试 endpoint 或 CI gate | 找 discussion/community，强调“不是替代框架，只测业务话术风险” |
| 4 | Pipecat web / bot server users | [pipecat-ai/pipecat-client-web](https://github.com/pipecat-ai/pipecat-client-web) | Pipecat 用户通常已有服务端 bot endpoint，刚好能验证 HTTP adapter 接入体验 | 去 Pipecat community 或 examples 寻找 bot server 开发者 |
| 5 | Streamcore realtime voice agent server | [streamcoreai/streamcore-server](https://github.com/streamcoreai/streamcore-server) | 开源实时 voice agent server，包含 WebRTC、STT/LLM/TTS、SIP 等上线风险点 | 发给项目维护者：是否愿意用中文/英文业务场景跑一次回归 |
| 6 | OpenClaw MVA builders | [OpenClaw quickstart gist](https://gist.github.com/macebake/a83fad1a6ec8fcf96a2eb88790197e92) | 当前仓库已经支持 OpenClaw responses endpoint，接入路径最短 | 找 OpenClaw 用户社区/作者，发 OpenClaw 专用命令 |
| 7 | Independent AI phone / call-agent repos | [ai-voice-agent GitHub topic](https://github.com/topics/ai-voice-agent) | 很多 Twilio/Vapi/LiveKit/FastAPI 项目有实际电话或客服场景 | 选最近更新且有业务场景的 3 个 repo，发轻量 issue/discussion |

## 英文邀请模板

```text
Hi! I’m building a small open-source Voice Agent TestOps tool for pre-launch regression testing.

It automatically chats with a voice agent through an HTTP/OpenClaw-compatible endpoint and checks for:
- unsafe pricing / over-promising
- missed lead fields like phone or preferred time
- wrong handoff intent
- latency over threshold
- JSON + HTML/PDF reports for CI or sales review

I’m looking for 3 real voice agents to test this week. If you already have a dev endpoint, the trial should take about 10-30 minutes.

Example command:
npm run voice-test -- --suite examples/voice-testops/openclaw-suite.json --agent http --endpoint <your-test-endpoint>

Would you be open to running one suite against your agent? I’m happy to adapt the suite to your domain and share the report back.
```

## OpenClaw 专用模板

```text
我这边已经把 Voice Agent TestOps 接到了 OpenClaw-compatible `/v1/responses`：

npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint <your-openclaw-responses-url> \
  --api-key <token> \
  --openclaw-mode responses

它会自动和 Agent 对话，并检查乱报价、绝对承诺、转人工、留资字段和延迟，最后生成 JSON/HTML 报告。

如果你有一个 OpenClaw agent，我想请你帮忙跑一次。目标不是评测模型好坏，而是验证“上线前回归测试”这件事对真实 agent 开发有没有用。
```

## 记录表

| 日期 | 目标 | 入口 | 是否已发送 | 是否回复 | 是否跑通 | 阻塞点 | 下一步 |
|---|---|---|---|---|---|---|---|
| 2026-05-06 | Vapi ecosystem | [VapiAI/example-voice-test-script#2](https://github.com/VapiAI/example-voice-test-script/issues/2) | 是 | 否 | 否 | 暂无回复 | 等待回复 |
| 2026-05-06 | Retell ecosystem | [RetellAI/retell-custom-llm-node-demo#12](https://github.com/RetellAI/retell-custom-llm-node-demo/issues/12) | 是 | 否 | 否 | 暂无回复 | 等待回复 |
| 2026-05-06 | LiveKit Agents JS | [livekit/agents-js#1400](https://github.com/livekit/agents-js/issues/1400) | 是 | 否 | 否 | 暂无回复 | 等待回复 |
| 2026-05-06 | Pipecat bot developers | [pipecat-ai/pipecat-client-web#207](https://github.com/pipecat-ai/pipecat-client-web/issues/207) | 是 | 否 | 否 | 暂无回复 | 等待回复 |
| 2026-05-06 | Streamcore server | [streamcoreai/streamcore-server#4](https://github.com/streamcoreai/streamcore-server/issues/4) | 是 | 否 | 否 | 暂无回复 | 等待回复 |

截至 2026-05-07 17:15 CST，以上 5 个 issue 均为 open、0 comments，`updatedAt` 仍停留在创建时间附近。

## 第二批补充目标

| 日期 | 目标 | 入口 | 为什么匹配 | 动作 | 下一步 |
|---|---|---|---|---|---|
| 2026-05-07 | Kevin Hu insurance Vapi prototype | [kev-hu/vapi-voice-agent#1](https://github.com/kev-hu/vapi-voice-agent/issues/1) | Vapi 保险客服原型，有 sample call transcripts、身份验证、coverage/eligibility 边界、claim status、address update 和 warm transfer 风险 | 已发出轻量试点邀请，提供 endpoint、3 条脱敏 transcript 或 public sample-call dry run 三种选项 | 等待回复；如果同意 dry run，优先用公开 sample-call 做 transcript 路径试跑 |

## 今天的验收

- 至少发出 5 条高相关邀请。
- 至少拿到 1 个明确回复或技术问题。
- 如果有人愿意试跑，优先帮他把 suite 改成对应行业，不继续开发 dashboard。
