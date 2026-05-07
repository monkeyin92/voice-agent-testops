# Voice Agent TestOps 外部试点跟进记录

日期：2026-05-07

## 昨日 issue 回复状态

检查时间：2026-05-07 17:15 CST。

| 目标 | Issue | 状态 | 评论数 | 结论 |
|---|---|---|---:|---|
| Vapi ecosystem | [VapiAI/example-voice-test-script#2](https://github.com/VapiAI/example-voice-test-script/issues/2) | open | 0 | 暂无回复 |
| Retell ecosystem | [RetellAI/retell-custom-llm-node-demo#12](https://github.com/RetellAI/retell-custom-llm-node-demo/issues/12) | open | 0 | 暂无回复 |
| LiveKit Agents JS | [livekit/agents-js#1400](https://github.com/livekit/agents-js/issues/1400) | open | 0 | 暂无回复 |
| Pipecat bot developers | [pipecat-ai/pipecat-client-web#207](https://github.com/pipecat-ai/pipecat-client-web/issues/207) | open | 0 | 暂无回复 |
| Streamcore server | [streamcoreai/streamcore-server#4](https://github.com/streamcoreai/streamcore-server/issues/4) | open | 0 | 暂无回复 |

说明：用户提到“昨天发了三个 issue”，实际 GitHub 查询到 2026-05-06 由 `monkeyin92` 创建的外联 issue 共 5 个，全部暂无回复。

## 今日新增目标

目标：[kev-hu/vapi-voice-agent](https://github.com/kev-hu/vapi-voice-agent)

Issue：[kev-hu/vapi-voice-agent#1](https://github.com/kev-hu/vapi-voice-agent/issues/1)

选择理由：

- Vapi insurance contact-center prototype，和本项目的 voice agent 上线风险测试高度匹配。
- 仓库包含 sample call transcripts、prompt、mock tools 和 rollout plan。
- 风险点明确：identity verification、coverage/eligibility 边界、claim status、address update、warm transfer、false containment。
- 试点路径低摩擦：可请求 Vapi test endpoint、3 条脱敏 transcript，或先用公开 `demo/sample-call.md` 做 dry run。

## 当前下一步

1. 等待 `kev-hu/vapi-voice-agent#1` 回复。
2. 如果对方同意 endpoint：按外部试点 Runbook 走 HTTP/Vapi 接入。
3. 如果对方只同意 transcript：走 transcript/import-calls 路径。
4. 如果对方同意 public sample dry run：先用公开样本做报告并回传，避免索要任何私有数据。
