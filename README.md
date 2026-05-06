# Voice Agent TestOps

[![Voice Agent TestOps](https://img.shields.io/badge/Voice%20Agent-TestOps-285f9f)](https://github.com/monkeyin92/voice-agent-testops)
[![npm version](https://img.shields.io/npm/v/voice-agent-testops?color=cb3837)](https://www.npmjs.com/package/voice-agent-testops)
[![CI](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml/badge.svg)](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933)](https://nodejs.org/)

[English](README.md) · [中文](README.zh-CN.md)

**Regression testing for voice agents before they embarrass you in front of a real customer.**

Voice Agent TestOps runs scripted customer conversations against your agent, then checks the things demos usually hide: unsafe pricing, over-promising, missed phone numbers, wrong handoff intent, and latency that quietly kills the experience.

It is not another voice-agent framework. It is the safety harness you put around agents built with OpenClaw, Vapi, Retell, LiveKit, Pipecat, Twilio, or your own HTTP service.

[Quick Start](#quick-start) · [Connect An Agent](#connect-an-agent) · [Turn A Real Failure Into A Regression Test](#turn-a-real-failure-into-a-regression-test) · [Suite Format](#suite-format)

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

Create a starter suite. No API key required.

```bash
npx voice-agent-testops init
npx voice-agent-testops run --suite voice-testops/suite.json
```

Expected output:

```text
Example Photo Studio Voice Agent TestOps: passed (0 failures, 4 assertions)
JSON report: .voice-testops/report.json
HTML report: .voice-testops/report.html
```

Connecting a real HTTP agent?

```bash
npx voice-agent-testops init --stack http --name "Lumen Portrait Studio" --with-ci
```

Generate a more polished merchant-facing report:

```bash
npx voice-agent-testops run --suite examples/voice-testops/photo-studio-multiturn-suite.json
npm run report:export
```

Artifacts:

- `.voice-testops/report.json` for CI and automation
- `.voice-testops/report.html` for debugging and walkthroughs
- `.voice-testops/report.pdf` for customers or internal review
- `.voice-testops/report.png` for quick sharing

## Connect An Agent

Start with HTTP if you want the shortest path. Use the OpenClaw adapter when you already have an OpenClaw-compatible `/v1/responses` endpoint. For hosted voice stacks, add a small test bridge so CI can test the same prompt, tool, and lead-summary logic without placing a real phone call.

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

## Integration Guides

- [Generic HTTP Agent](docs/integrations/http.md)
- [OpenClaw](docs/integrations/openclaw.md)
- [Vapi](docs/integrations/vapi.md)
- [Retell](docs/integrations/retell.md)
- [LiveKit Agents](docs/integrations/livekit.md)
- [Pipecat](docs/integrations/pipecat.md)

## Sales Demo

If you already have a local OpenClaw Gateway running with a model provider configured:

```bash
npm run sales:demo
```

This runs the photo-studio multi-turn suite and exports a customer-ready report. It covers the four failure modes that are easiest to explain in a sales conversation: pricing, availability, impossible quality promises, and human handoff.

## Turn A Real Failure Into A Regression Test

Paste a real failed conversation into a transcript file, then generate a starter suite:

```bash
npx voice-agent-testops from-transcript \
  --transcript examples/voice-testops/transcripts/failed-photo-booking.txt \
  --merchant examples/voice-testops/merchants/guangying-photo.json \
  --out examples/voice-testops/generated-transcript-suite.json \
  --name "Generated transcript regression" \
  --source website
```

The generator is deterministic. It does not call an LLM; it extracts customer turns and adds reviewable assertions for unsafe promises, pricing facts, lead fields, handoff intent, and latency. Treat the generated file as a first draft, then tighten it before using it as a release gate.

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

Use `--fail-on-severity` when you want CI to block only the failures that matter for release. This keeps minor copy drift visible in the report without treating it like a production-stopping safety issue.

```bash
npx voice-agent-testops run \
  --suite examples/voice-testops/chinese-risk-suite.json \
  --fail-on-severity critical
```

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

- [Contributing](CONTRIBUTING.md)
- [Market thesis](docs/strategy/voice-agent-testops-market.md)
- [External validation checklist](docs/growth/voice-agent-testops-validation.md)
- [Generic HTTP Agent](docs/integrations/http.md)
- [OpenClaw](docs/integrations/openclaw.md)
- [Vapi](docs/integrations/vapi.md)
- [Retell](docs/integrations/retell.md)
- [LiveKit Agents](docs/integrations/livekit.md)
- [Pipecat](docs/integrations/pipecat.md)
- [OpenClaw local runbook](docs/ops/openclaw-docker.md)
- [Next-step roadmap](docs/roadmap/2026-05-03-voice-agent-testops-next-steps.md)
