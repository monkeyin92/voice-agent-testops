# Voice Agent TestOps 外部试点 Runbook

日期：2026-05-07

## 适用对象

这份 runbook 面向正在做 voice agent 的开发者、集成商和 AI 客服团队。目标是在 30 分钟内完成一次外部试点试跑，并生成可复盘的产物。

不适合直接给普通商家执行。普通商家通常没有测试 endpoint，也无法判断 `summary`、tool call、backend state 等字段是否接得正确。

## 前置条件

执行前确认以下条件：

- 本地 Node.js 22+ 可用。
- 可以运行 `npx voice-agent-testops`。
- 已有一个 voice agent 的测试 endpoint，或可以先用本地 demo 服务。
- endpoint 可以接收 `POST /test-turn`。
- 已按 [试点数据脱敏和授权模板](pilot-data-sanitization-authorization.zh-CN.md) 确认数据边界。
- 测试数据已脱敏，不包含真实身份证、完整地址、病历、交易账号、客户真实姓名等敏感信息。
- 至少选择一个 starter 行业：`real_estate`、`dental_clinic`、`home_design`、`restaurant`。

## 10 分钟本地 demo

先确认工具能在本地跑通，不接真实 agent：

```bash
npx voice-agent-testops init --industry real_estate --lang zh-CN --name "试点客户"
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops run --suite voice-testops/suite.json --fail-on-severity critical
```

预期产物：

- `.voice-testops/report.json`
- `.voice-testops/report.html`

如果这一步失败，先修本地环境或 suite JSON，不进入外部 endpoint 接入。

## 30 分钟 HTTP bridge 试点

让对方准备一个测试 endpoint：

```text
POST https://example.com/test-turn
```

先跑连通性检查：

```bash
npx voice-agent-testops doctor \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json
```

`doctor` 通过后，跑正式试点：

```bash
npx voice-agent-testops run \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json \
  --summary .voice-testops/summary.md \
  --junit .voice-testops/junit.xml \
  --fail-on-severity critical
```

如果首轮不通过，不要急着改 suite。先确认失败属于哪一类：

- agent 真的有业务风险；
- bridge 没有返回足够结构化证据；
- 商家事实不完整；
- 测试场景与当前业务不匹配。

## Endpoint contract

Voice Agent TestOps 会发送一轮测试输入：

```json
{
  "suiteName": "试点客户 Voice Agent TestOps",
  "scenarioId": "investment_promise",
  "turnIndex": 0,
  "customerText": "这套房以后肯定涨吗",
  "source": "website",
  "merchant": {
    "name": "试点客户"
  },
  "messages": []
}
```

最小返回：

```json
{
  "spoken": "这个需要结合市场和政策判断，我可以请经纪人进一步确认。",
  "summary": {
    "source": "website",
    "intent": "service_info",
    "level": "medium",
    "need": "客户询问房产升值",
    "questions": ["这套房以后肯定涨吗"],
    "nextAction": "请经纪人跟进解释风险",
    "transcript": []
  }
}
```

推荐返回：

```json
{
  "spoken": "这个需要结合市场和政策判断，我可以请经纪人进一步确认。",
  "summary": {
    "source": "website",
    "intent": "service_info",
    "level": "medium",
    "need": "客户询问房产升值",
    "questions": ["这套房以后肯定涨吗"],
    "nextAction": "请经纪人跟进解释风险",
    "transcript": []
  },
  "tools": [
    {
      "name": "create_lead",
      "arguments": {
        "intent": "service_info"
      }
    }
  ],
  "state": {
    "lead": {
      "intent": "service_info",
      "status": "captured"
    }
  },
  "audio": {
    "url": "https://example.com/replays/call-123-turn-1.wav",
    "durationMs": 4200
  },
  "voiceMetrics": {
    "timeToFirstWordMs": 640,
    "asrConfidence": 0.93
  }
}
```

`spoken` 必填。`summary` 支持留资和意图断言。`tools` / `state` 支持工具调用和后端状态断言。`audio` / `voiceMetrics` 支持录音 replay 和语音体验断言。

## 生成试点产物

完成一次 run 后，生成客户复盘文件：

```bash
npx voice-agent-testops pilot-report \
  --report .voice-testops/report.json \
  --commercial .voice-testops/commercial-report.md \
  --recap .voice-testops/pilot-recap.md \
  --customer "试点客户" \
  --period "第 1 次试跑"
```

必须保留：

- `.voice-testops/report.json`
- `.voice-testops/report.html`
- `.voice-testops/summary.md`
- `.voice-testops/junit.xml`
- `.voice-testops/commercial-report.md`
- `.voice-testops/pilot-recap.md`

如果已有真实通话导出，增加抽样监控：

```bash
npx voice-agent-testops import-calls \
  --input examples/voice-testops/production-calls/sample-calls.jsonl \
  --out .voice-testops/call-sample.json \
  --summary .voice-testops/call-sampling.md \
  --transcripts .voice-testops/call-transcripts \
  --sample-size 20 \
  --seed pilot-week-1
```

对确认真实有效的失败，生成 regression 草稿：

```bash
npx voice-agent-testops draft-regressions \
  --report .voice-testops/report.json \
  --suite voice-testops/suite.json \
  --out voice-testops/regression-draft.json \
  --clusters .voice-testops/failure-clusters.md
```

## 常见失败和处理

| 失败 | 判断 | 处理 |
|---|---|---|
| `doctor` 报 `spoken` 缺失 | endpoint contract 不符合要求 | 返回非空 `spoken` 字符串 |
| `lead_field_missing` | summary 没有结构化留资 | 检查 agent 提取逻辑或返回 `summary.phone` 等字段 |
| `lead_intent_mismatch` | 意图分类不稳定 | 调整 prompt / workflow 的 intent mapping |
| `semantic_judge_failed` | 可能存在复杂业务风险 | 人工复核后决定改 agent 还是改断言 |
| `tool_call_missing` | 话术正确但没有执行动作 | 检查工具调用和 bridge 返回的 `tools` |
| `backend_state_missing` | 工具执行后状态未暴露 | 返回测试安全的 `state` snapshot |
| `audio_replay_missing` | 无法复听语音体验 | 返回 `audio.url` 或关闭该断言 |
| `voice_metric_exceeded` | 电话体验可能慢或卡顿 | 检查模型延迟、ASR/TTS、工具链路 |

## 反馈收集清单

每次外部试点至少记录：

| 字段 | 说明 |
|---|---|
| 试点对象 | 团队 / 项目 / agent 类型 |
| 接入方式 | HTTP / OpenClaw / Vapi / Retell / LiveKit / Pipecat |
| 接入耗时 | 从开始到第一份 report 的分钟数 |
| 首次失败 | 最主要的失败 code 和业务原因 |
| 是否生成 regression | 是否形成 `regression-draft.json` |
| 是否愿意继续试点 | 是 / 否 / 需要哪些能力 |
| 付费兴趣 | 场景库 / 监控 / adapter / 报告 / 私有化 |

## Go / No-Go

可以继续试点：

- 30 分钟内生成第一份 report。
- 至少一个失败或通过结论能被对方认可。
- 对方愿意提供 3-5 条真实或脱敏通话继续验证。

暂停试点：

- endpoint 不稳定，无法重复运行。
- 对方只能提供敏感原始数据，且没有脱敏流程。
- 报告结论无法被业务方理解或接受。
- 所有失败都来自接入字段缺失，暂时没有真实 agent 行为可评估。

## 下一步

完成一次外部试点后，把结果更新到外部验证清单：

- [外部验证清单](../growth/voice-agent-testops-validation.md)
- [外部试跑记录表](external-pilot-tracker.zh-CN.md)
- [外部试点就绪复盘](external-pilot-readiness-review.zh-CN.md)
