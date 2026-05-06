# Voice Agent TestOps

[![Voice Agent TestOps](https://img.shields.io/badge/Voice%20Agent-TestOps-285f9f)](https://github.com/monkeyin92/voice-agent-testops)
[![CI](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml/badge.svg)](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933)](https://nodejs.org/)

**Regression testing for voice agents before they embarrass you in front of a real customer.**

Voice Agent TestOps runs scripted customer conversations against your agent, then checks the things demos usually hide: unsafe pricing, over-promising, missed phone numbers, wrong handoff intent, and latency that quietly kills the experience.

It is not another voice-agent framework. It is the safety harness you put around agents built with OpenClaw, Vapi, Retell, LiveKit, Pipecat, Twilio, or your own HTTP service.

[中文介绍](#中文) · [Quick Start](#quick-start) · [Connect An Agent](#connect-an-agent) · [Suite Format](#suite-format)

![Voice Agent TestOps report preview](docs/assets/report-preview.png)

## Why This Exists

Voice agents fail in strangely expensive ways.

They quote a price that was never approved. They promise a slot that is already booked. They sound helpful but forget to collect the phone number. They say they will transfer to a human, then classify the lead as `other`. A normal unit test will not catch that. A happy-path demo will not reveal it either.

Voice Agent TestOps gives you a small, repeatable gate:

- **Write the risky customer scenario once.**
- **Run it against every agent build.**
- **Get a report a human can read and a JSON artifact CI can enforce.**

If you are building voice agents for real businesses, this repo is meant to be the boring little alarm bell that rings before production does.

## What It Catches

| Risk | Example failure | Assertion |
|---|---|---|
| Unsafe pricing | "The cheapest package is guaranteed." | `must_not_match` |
| Missing facts | Agent never says the configured `599-1299` package range | `must_contain_any` |
| Lead leakage | Customer gives a phone number, summary has no `phone` | `lead_field_present` |
| Wrong intent | Handoff request classified as `pricing` | `lead_intent` |
| Slow turns | One response takes 12 seconds | `max_latency_ms` |

## Quick Start

Run the local demo agent. No API key required.

```bash
npm install
npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json
```

Expected output:

```text
小红书接待 Demo Agent 回归测试: passed (0 failures, 8 assertions)
JSON report: .voice-testops/report.json
HTML report: .voice-testops/report.html
```

Generate a more polished merchant-facing report:

```bash
npm run voice-test -- --suite examples/voice-testops/photo-studio-multiturn-suite.json
npm run report:export
```

Artifacts:

- `.voice-testops/report.json` for CI and automation
- `.voice-testops/report.html` for debugging and walkthroughs
- `.voice-testops/report.pdf` for customers or internal review
- `.voice-testops/report.png` for quick sharing

## Connect An Agent

### Generic HTTP Agent

Want a running example first?

Terminal 1:

```bash
npm run example:http-agent
```

Terminal 2:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn
```

The example lives at [examples/http-agent-server/server.mjs](examples/http-agent-server/server.mjs). Replace its `createTestAgentResponse()` function with your real agent call when you are ready.

Your endpoint receives one test turn:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "https://your-agent.example.com/test-turn"
```

Request shape:

```json
{
  "suiteName": "回归测试",
  "scenarioId": "pricing",
  "turnIndex": 0,
  "customerText": "单人写真多少钱",
  "source": "website",
  "merchant": {},
  "messages": []
}
```

Response shape:

```json
{
  "spoken": "单人写真一般是 599-1299 元，档期需要人工确认。",
  "summary": {
    "source": "website",
    "intent": "pricing",
    "level": "medium",
    "need": "客户咨询单人写真价格",
    "questions": ["单人写真多少钱"],
    "nextAction": "人工确认档期后跟进",
    "transcript": []
  }
}
```

`spoken` is required. `summary` is optional, but lead and intent assertions become much more useful when you return it.

### OpenClaw-compatible Endpoint

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY" \
  --openclaw-mode responses
```

For a local OpenClaw Gateway setup, see [docs/ops/openclaw-docker.md](docs/ops/openclaw-docker.md).

## Sales Demo

If you already have a local OpenClaw Gateway running with a model provider configured:

```bash
npm run sales:demo
```

This runs the photo-studio multi-turn suite and exports a customer-ready report. It covers the four failure modes that are easiest to explain in a sales conversation: pricing, availability, impossible quality promises, and human handoff.

## Suite Format

Suites are just JSON. They describe a merchant, a customer conversation, and the assertions each turn must satisfy.

```json
{
  "name": "Photo studio launch check",
  "scenarios": [
    {
      "id": "pricing",
      "title": "Customer asks for price",
      "source": "website",
      "merchant": {
        "name": "光影写真馆",
        "slug": "guangying-photo",
        "industry": "photography",
        "address": "上海市徐汇区示例路 88 号",
        "serviceArea": "上海市区",
        "businessHours": "10:00-21:00",
        "contactPhone": "13800000000",
        "packages": [
          {
            "name": "单人写真",
            "priceRange": "599-1299 元",
            "includes": "服装 2 套，精修 9 张",
            "bestFor": "个人写真"
          }
        ],
        "faqs": [],
        "bookingRules": {
          "requiresManualConfirm": true,
          "requiredFields": ["name", "phone"]
        }
      },
      "turns": [
        {
          "user": "单人写真多少钱，能保证拍得好看吗",
          "expect": [
            { "type": "must_contain_any", "phrases": ["599", "1299"] },
            { "type": "must_not_match", "pattern": "最低价|百分百|保证拍得好看" },
            { "type": "lead_intent", "intent": "pricing" },
            { "type": "max_latency_ms", "value": 25000 }
          ]
        }
      ]
    }
  ]
}
```

You can also keep merchant profiles in separate files and reference them with `merchantRef`, as shown in [examples/voice-testops/photo-studio-multiturn-suite.json](examples/voice-testops/photo-studio-multiturn-suite.json).

## Assertions

| Assertion | Purpose |
|---|---|
| `must_contain_any` | Require at least one expected phrase in the spoken answer |
| `must_not_match` | Block forbidden regex patterns such as absolute promises |
| `max_latency_ms` | Fail turns that exceed a latency threshold |
| `lead_field_present` | Require structured lead fields such as `phone` |
| `lead_intent` | Require the summary intent to match the scenario |

## CI

The repository includes a GitHub Actions workflow at [.github/workflows/voice-testops.yml](.github/workflows/voice-testops.yml). It runs unit tests, demo suites, production build, high-severity audit, and uploads generated reports as artifacts.

Useful commands:

```bash
npm test
npm run build
npm audit --audit-level=high
```

## Roadmap

Voice Agent TestOps is intentionally small today. The next useful steps are based on real agent feedback:

- More adapters for realtime voice stacks
- A larger public library of risky business scenarios
- CI gates that can fail a deployment when agent behavior regresses
- Report diffs across model, prompt, and workflow changes
- Recording/transcript import to turn real failures into regression suites

If your team has ever watched a voice agent sound confident at exactly the wrong moment, star the repo and try it against one real endpoint.

## Docs

- [Market thesis](docs/strategy/voice-agent-testops-market.md)
- [External validation checklist](docs/growth/voice-agent-testops-validation.md)
- [OpenClaw local runbook](docs/ops/openclaw-docker.md)
- [Next-step roadmap](docs/roadmap/2026-05-03-voice-agent-testops-next-steps.md)

---

## 中文

**Voice Agent TestOps 是给语音 Agent 上线前用的回归测试工具。**

它会按照场景脚本自动和你的 Agent 对话，然后检查那些最容易在真实客户面前出事故的地方：乱报价、乱承诺、漏收手机号、转人工意图识别错误、响应太慢。

它不是语音 Agent 框架，也不替代 OpenClaw、Vapi、Retell、LiveKit、Pipecat 或 Twilio。它更像一条上线前的安全绳：你的 Agent 可以自由变强，但每次变更都要先跑过高风险场景。

## 为什么值得做

语音 Agent 的问题往往不是“不会回答”，而是“回答得太自信”。

客户问价格，它编了一个不存在的最低价。客户问档期，它直接说可以来。客户给了电话，它话术里说会记录，结构化摘要却没有 `phone`。这些问题如果等到真实商家或真实客户发现，成本就已经发生了。

Voice Agent TestOps 的目标很朴素：

- 把高风险客户问题写成测试场景。
- 每次改 prompt、模型、workflow 或工具调用后自动跑一遍。
- 输出开发者能看懂的 JSON，也输出老板和客户能看懂的 HTML/PDF 报告。

## 30 秒试跑

本地 demo 不需要任何 API key：

```bash
npm install
npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json
```

生成面向商家演示的报告：

```bash
npm run voice-test -- --suite examples/voice-testops/photo-studio-multiturn-suite.json
npm run report:export
```

你会得到：

- `.voice-testops/report.json`：给 CI 和自动化流程用
- `.voice-testops/report.html`：给开发调试和现场讲解用
- `.voice-testops/report.pdf`：给客户、老板、试点复盘用
- `.voice-testops/report.png`：给微信群、飞书、社群快速预览

## 接入真实 Agent

通用 HTTP 接入：

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "https://your-agent.example.com/test-turn"
```

OpenClaw-compatible 接入：

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY" \
  --openclaw-mode responses
```

本地 OpenClaw Gateway 的启动方式见 [docs/ops/openclaw-docker.md](docs/ops/openclaw-docker.md)。

## 它适合谁

- 正在做 voice agent 的开发者
- 给商家交付 AI 客服、电话机器人、实时语音助手的团队
- 想把 prompt / workflow 变更纳入 CI 的工程团队
- 想向客户解释“为什么这个 Agent 可以上线”的集成商

如果你正在做真实语音 Agent，欢迎拿一个测试 endpoint 跑一下。最有价值的反馈不是“看起来不错”，而是“我的 Agent 在这个场景里失败了，原因是这里”。这正是这个项目想捕捉的东西。
