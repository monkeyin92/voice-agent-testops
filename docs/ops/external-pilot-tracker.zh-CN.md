# Voice Agent TestOps 外部试跑记录表

日期：2026-05-07

## 使用方式

这份表用于记录每一次外部 voice agent 试点，不用于伪造进展。每一行必须对应一个真实对象、一次明确接入尝试和一组可追溯产物。

执行顺序：

1. 先按 [试点数据脱敏和授权模板](pilot-data-sanitization-authorization.zh-CN.md) 确认数据边界。
2. 再按 [外部试点 Runbook](external-pilot-runbook.zh-CN.md) 完成本地 demo、`doctor`、正式 run 和 `pilot-report`。
3. 最后把接入结果、失败类型、产物和下一步动作记录到本表。

只记录事实，不写“感觉不错”。如果没有跑通，也要记录卡住的位置和下一步动作。

跑通一个真实 endpoint 后，用 [第一个真实试点复盘模板](first-real-pilot-recap.zh-CN.md) 记录完整复盘。

## 试跑记录表

复制下面表格到当前试点周报或客户项目文档中，每次试点新增一行。

| 试点 ID | 日期 | 对象 | 负责人 | 行业 starter | 接入方式 | 数据授权 | endpoint 状态 | suite | 跑通耗时 | doctor | run | 首次失败类型 | 首次失败 code | 对方是否认可结论 | 是否生成 regression | 产物链接 | 是否愿意继续试点 | 付费兴趣 | 下一步动作 | 状态 |
|---|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|
| P-001 | 2026-05-07 | 示例团队 | owner | real_estate | HTTP | 已确认 | stable | voice-testops/suite.json | 28 | pass | fail | business_risk | semantic_judge_failed | 是 | 是 | 私有链接 | 是 | 场景库 / 监控 | 生成 regression 并约下次复跑 | continue |

空白模板：

| 试点 ID | 日期 | 对象 | 负责人 | 行业 starter | 接入方式 | 数据授权 | endpoint 状态 | suite | 跑通耗时 | doctor | run | 首次失败类型 | 首次失败 code | 对方是否认可结论 | 是否生成 regression | 产物链接 | 是否愿意继续试点 | 付费兴趣 | 下一步动作 | 状态 |
|---|---|---|---|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |



## 外联触达队列（未试跑）

这些记录只表示已发出明确试跑邀请；未拿到 endpoint 或脱敏 transcript 前，不计入 `ran_once`。

| 日期 | 对象 | 入口 | 行业 starter | 接入方式 | 数据授权 | 当前状态 | 下一步动作 |
|---|---|---|---|---|---|---|---|
| 2026-05-08 | Awaisali36 outbound real-estate Vapi agent | https://github.com/Awaisali36/Outbound-Real-State-Voice-AI-Agent-/issues/6 | real_estate / outbound_leadgen | Vapi / Transcript import | 未确认 | contacted | 2026-05-10 follow-up：endpoint 或 1 条脱敏 transcript |
| 2026-05-08 | santmun Sofia voice agent | https://github.com/santmun/sofia-voice-agent/issues/2 | real_estate | Retell / Twilio / Transcript import | 未确认 | contacted | 2026-05-10 follow-up：endpoint 或 1 条脱敏 transcript |
| 2026-05-08 | askjohngeorge Pipecat lead qualifier | https://github.com/askjohngeorge/pipecat-lead-qualifier/issues/1 | outbound_leadgen | Pipecat / HTTP | 未确认 | contacted | 2026-05-10 follow-up：lead qualifier endpoint 或 transcript |
| 2026-05-08 | kylecampbell LiveKit outbound caller | https://github.com/kylecampbell/livekit-outbound-caller-agent/issues/4 | outbound_leadgen | LiveKit / Twilio / HTTP | 未确认 | contacted | 2026-05-10 follow-up：dev endpoint 或 sanitized call |
| 2026-05-08 | tetratensor LiveKit outbound caller | https://github.com/tetratensor/LiveKit-Outbound-Caller-Voice-Agent/issues/1 | outbound_leadgen | LiveKit SIP / HTTP | 未确认 | contacted | 2026-05-10 follow-up：dev endpoint 或 transcript |
| 2026-05-08 | kirklandsig AIReceptionist | https://github.com/kirklandsig/AIReceptionist/issues/12 | restaurant / custom receptionist | HTTP / Transcript import | 未确认 | contacted | 2026-05-10 follow-up：booking endpoint 或 sanitized call |
| 2026-05-08 | blackdwarftech siphon | https://github.com/blackdwarftech/siphon/issues/19 | outbound_leadgen | Framework adapter / HTTP | 未确认 | contacted | 2026-05-10 follow-up：adapter interest or demo endpoint |
| 2026-05-08 | intellwe AI calling agent | https://github.com/intellwe/ai-calling-agent/issues/2 | outbound_leadgen | Twilio / HTTP | 未确认 | contacted | 2026-05-10 follow-up：test endpoint or transcript |
| 2026-05-09 | videosdk WhatsApp AI calling agent | https://github.com/videosdk-community/videosdk-whatsapp-ai-calling-agent/issues/2 | outbound_leadgen / custom channel | WhatsApp / Twilio / VideoSDK / Transcript import | 未确认 | contacted | 2026-05-11 follow-up：0.1.19 comment 已补；等 endpoint 或 sanitized transcript |
| 2026-05-09 | VoiceBlender | https://github.com/VoiceBlender/voiceblender/issues/28 | outbound_leadgen / platform adapter | REST / Webhook / WebSocket adapter | 未确认 | contacted | 2026-05-11 follow-up：0.1.19 comment 已补；问 adapter interest 或 demo endpoint |
| 2026-05-09 | theaifutureguy LiveKit voice agent | https://github.com/theaifutureguy/livekit-voice-agent/issues/6 | outbound_leadgen / receptionist | LiveKit / Telephony / HTTP | 未确认 | contacted | 2026-05-11 follow-up：0.1.19 comment 已补；等 dev endpoint 或 one sanitized call |

## 字段字典

| 字段 | 填写规则 |
|---|---|
| 试点 ID | 用 `P-001`、`P-002` 递增，便于和报告产物、访谈纪要、issue 对齐 |
| 日期 | 首次跑正式 suite 的日期 |
| 对象 | 团队、项目或开发者名称；公开文档中可写匿名代号 |
| 负责人 | 内部跟进人 |
| 行业 starter | `real_estate`、`dental_clinic`、`home_design`、`insurance`、`restaurant` 或自定义 |
| 接入方式 | HTTP、OpenClaw、Vapi、Retell、LiveKit、Pipecat、Transcript import、Manual demo |
| 数据授权 | `未确认`、`已确认`、`仅合成数据`、`暂停` |
| endpoint 状态 | `stable`、`flaky`、`unavailable`、`manual-only` |
| suite | 本次运行的 suite 路径 |
| 跑通耗时 | 从开始接入到生成第一份 report 的分钟数；未跑通填已花费分钟数 |
| doctor | `pass`、`fail`、`skipped` |
| run | `pass`、`fail`、`blocked` |
| 首次失败类型 | 使用下面的失败类型枚举 |
| 首次失败 code | 报告中的第一个关键 failure code，例如 `semantic_judge_failed` |
| 对方是否认可结论 | `是`、`否`、`待复核` |
| 是否生成 regression | `是`、`否`、`不适用` |
| 产物链接 | 私有 report、summary、pilot recap、failure clusters 或回放位置 |
| 是否愿意继续试点 | `是`、`否`、`需要条件` |
| 付费兴趣 | 场景库、监控、adapter、报告、CI gate、私有化、人工复核 |
| 下一步动作 | 一句话写清楚谁在什么时候做什么 |
| 状态 | 使用下面的状态枚举 |

## 失败类型枚举

| 类型 | 含义 | 典型处理 |
|---|---|---|
| `setup_blocked` | Node、npx、依赖、命令使用卡住 | 修文档或补最小 demo |
| `endpoint_contract` | endpoint 没按 `{ spoken, summary }` 返回 | 按 runbook 修 bridge |
| `auth_or_network` | 鉴权、内网、超时、证书、跨域问题 | 用测试 endpoint 或代理 |
| `business_risk` | agent 真实业务回答有风险 | 形成 failure reason 和 regression |
| `lead_capture_gap` | 留资、意图、预算、时间等字段缺失 | 调整 summary/tool/state 返回 |
| `tool_or_state_gap` | 话术正确但工具调用或 backend state 缺失 | 补 tools/state 证据 |
| `audio_or_latency` | audio replay、TTS/ASR、首字延迟、通话节奏问题 | 补 audio/voiceMetrics 或排查链路 |
| `data_authorization` | 数据未脱敏或授权边界不清楚 | 回到数据模板，暂停真实数据试点 |
| `judge_disagreement` | semantic judge 与人工判断不一致 | 人工复核并修 rubric / seed |
| `no_clear_value` | 对方不认可报告价值 | 访谈真实上线风险，调整定位 |

## 状态枚举

| 状态 | 使用条件 |
|---|---|
| `contacted` | 已触达，未约试跑 |
| `scheduled` | 已约定试跑时间或准备 endpoint |
| `blocked` | 卡在环境、数据授权、endpoint 或人力 |
| `ran_once` | 至少跑出一份 report |
| `regression_created` | 至少一个真实失败进入 regression draft |
| `continue` | 对方愿意继续试点或进入下一轮复跑 |
| `paid_interest` | 对方明确讨论预算、采购、私有化或付费能力 |
| `closed_lost` | 对方明确不继续，且有原因记录 |

## 每周复盘

每周固定复盘这 8 个数字：

| 指标 | 计算方式 | 目标 |
|---|---|---|
| 新增触达数 | 本周 `contacted` 新增数量 | 20 |
| 已约试跑数 | 本周 `scheduled` 新增数量 | 5 |
| 实际跑通数 | 本周 `ran_once` 新增数量 | 3 |
| 30 分钟内跑通率 | `跑通耗时 <= 30` 的试点 / 实际跑通数 | 70%+ |
| 业务风险发现数 | `首次失败类型 = business_risk` 或 `lead_capture_gap` 的数量 | 1+ |
| regression 生成数 | `是否生成 regression = 是` 的数量 | 1+ |
| 继续试点数 | `状态 = continue` 或 `paid_interest` 的数量 | 1+ |
| 主要阻塞 | 本周最多的失败类型 | 必须有对应改进动作 |

复盘时只看表内事实。如果连续两周没有 `ran_once`，暂停非必要功能开发，优先调整触达对象、接入文档或试点支持方式。

## Go / No-Go 判定

### Go：继续投入外部试点

满足任意两条即可继续：

- 3 个外部 agent 能在 30 分钟内跑出第一份 report。
- 至少 1 个真实失败被对方认可，并生成 regression draft。
- 至少 1 个对象进入 `continue` 或 `paid_interest`。
- 某个接入方式连续两次跑通，说明 adapter / runbook 可复制。

### No-Go：暂停功能开发，回到试点获取

出现以下情况时，不继续堆功能：

- 两周内没有任何 `ran_once`。
- 主要失败一直是 `setup_blocked` 或 `endpoint_contract`，说明入口仍不够清楚。
- 多数对象不愿提供 endpoint，也不愿提供脱敏 transcript。
- 报告无法让对方认可任何具体风险或改进动作。

## 最小留存产物

每个 `ran_once` 试点至少保留私有链接或路径：

- `.voice-testops/report.json`
- `.voice-testops/report.html`
- `.voice-testops/summary.md`
- `.voice-testops/commercial-report.md`
- `.voice-testops/pilot-recap.md`

如果产生 regression，还要记录：

- `voice-testops/regression-draft.json`
- `.voice-testops/failure-clusters.md`

这些产物默认不进入公开仓库。公开展示前回到 [试点数据脱敏和授权模板](pilot-data-sanitization-authorization.zh-CN.md) 确认授权边界。
