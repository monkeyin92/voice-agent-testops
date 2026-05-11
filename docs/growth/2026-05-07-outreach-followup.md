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

## Public sample dry run

记录：[Kevin Hu public sample dry run](2026-05-07-kev-hu-public-sample-dry-run.md)

执行结论：

- 已用公开 `demo/sample-call.md` 跑通 transcript-to-suite、validate、run、draft-regressions 和 pilot-report 路径。
- 这是 public sample dry run，不代表仓库作者背书，也不是 live Vapi endpoint 的真实行为评测。
- 原始 transcript 和 `.voice-testops/kev-hu-public-sample/` 生成产物均未提交到公开仓库。
- 这次 dry run 暴露的 insurance 覆盖缺口已经转成产品能力：新增 `insurance` starter、regulated-service transcript guardrails，以及身份核验、claim status、coverage/eligibility、持牌顾问转接的公开 suite。

## 当前下一步

1. 等待 `kev-hu/vapi-voice-agent#1` 回复。
2. 如果对方同意 endpoint：按外部试点 Runbook 走 HTTP/Vapi 接入，并和 public sample dry run 做对照。
3. 如果对方只同意 transcript：走 transcript/import-calls 路径。
4. 如果对方允许公开回传：只贴 aggregate 结果和改进建议，不贴原始 transcript。

## 2026-05-08 follow-up

检查时间：2026-05-08 12:40 CST。

- `kev-hu/vapi-voice-agent#1`：open，0 comments，无 endpoint 或脱敏 transcript 回复。
- 2026-05-06 发出的 5 个生态外联 issue 仍为 open，0 comments。
- 已在 `kev-hu/vapi-voice-agent#1` 追加 follow-up：[issuecomment-4403391487](https://github.com/kev-hu/vapi-voice-agent/issues/1#issuecomment-4403391487)。

追加请求只要三选一：

1. 临时 test endpoint，最小返回 `{ "spoken": string, "summary"?: object }`。
2. 1-3 条脱敏 insurance 失败或边界通话 transcript。
3. 允许继续只用 public sample，并公开回传 aggregate 结果，不贴原始 transcript。

当前不能把 Kevin Hu public sample 伪装成真实失败通话。真实 insurance regression 的下一步仍然等待对方提供 endpoint 或脱敏 transcript；拿到后按外部试点 Runbook 生成 `from-transcript` suite、正式 report、`draft-regressions` 和复盘产物。

为降低对方提供样本的成本，已补充可直接复制填写的 intake 包：[Insurance transcript intake pack](../ops/insurance-transcript-intake.md)。下一次 follow-up 优先贴这个模板，而不是继续泛泛请求“提供 transcript”。

已将 intake 包回贴到 `kev-hu/vapi-voice-agent#1`：[issuecomment-4403442303](https://github.com/kev-hu/vapi-voice-agent/issues/1#issuecomment-4403442303)。对方现在只需按模板粘贴一条脱敏 transcript，或明确标注 synthetic/public sample。

## 2026-05-09 reply check

检查时间：2026-05-09 13:58 CST。

- `streamcoreai/streamcore-server#4`：对方明确同意测试，提示可先测 `streamcore.ai` demo，但 demo 只有基础 Streamcore knowledge；已回复请求可脚本化 HTTP/WebSocket 测试入口或脱敏 transcript：[issuecomment-4411642368](https://github.com/streamcoreai/streamcore-server/issues/4#issuecomment-4411642368)。
- `codewithmuh/ai-voice-agent#2`：对方给出弱正向回复；已回复请求 dev/test endpoint 或一条脱敏 booking / missed-call / handoff transcript：[issuecomment-4411642357](https://github.com/codewithmuh/ai-voice-agent/issues/2#issuecomment-4411642357)。

当前优先级：Streamcore > codewithmuh。拿到 endpoint 走 `doctor` / `run`；拿到 transcript 先跑 `transcript-intake`，只公开 aggregate 结果，不贴原始 transcript。

## 2026-05-11 no-reply operating plan

检查时间：2026-05-11 15:00 CST。

- GitHub 未读通知为空。
- 当前仓库 `monkeyin92/voice-agent-testops` 没有需要处理的新 issue 评论或 PR 评论。
- 近期外部 issue 中，真正的对方回复仍只有 `streamcoreai/streamcore-server#4` 和 `codewithmuh/ai-voice-agent#2`；两条都已由 `monkeyin92` 跟进，之后暂无新回复。
- 其他有评论的条目主要是自己的 0.1.19 或 transcript-intake follow-up；零评论 issue 不再持续顶帖。

执行记录：

- 新增 [public proof gallery](public-proof-gallery.md)，把公开外呼 demo、HTTP bridge demo、recording-derived seeds、Kevin Hu public sample dry run 汇总成后续外联链接。
- 新增 [no-reply growth plan](2026-05-11-no-reply-growth-plan.md)，固定暖线跟进日期、冷线止损规则和可复制回复。
- 2026-05-11 重新跑了 `examples/voice-testops/chinese-outbound-recording-seeds-suite.json` 对本地 HTTP example bridge 的 proof：`doctor` passed，`run` passed，11 assertions，0 failures，0 critical failures。生成产物留在 `.voice-testops/2026-05-11-public-proof/`，不提交。

下一步节奏：

1. 2026-05-12 只跟进 `streamcoreai/streamcore-server#4`，请求 public demo 背后的可脚本化 HTTP/WebSocket route，或一条脱敏 transcript。
2. 2026-05-14 若 `codewithmuh/ai-voice-agent#2` 仍未给 endpoint/transcript，再发一次短 check-in。
3. 2026-05-13 到 2026-05-15 对 2026-05-08 零回复批次最多发一次 close-the-loop；之后标记 dormant。
4. 2026-05-18 起把新增触达转向 Discussions、Discord、email、LinkedIn，不继续依赖 GitHub issue 冷启动。
