# Voice Agent TestOps

AI 语音 Agent 的自动化测试、评测与报告工具。

当前仓库保留了一个小红书商家接待 demo agent，但战略产品已经转向 Voice Agent TestOps：用场景脚本自动和 Agent 对话，检查延迟、话术安全、字段收集、意图识别和业务承诺。

## Quick Start

安装依赖后运行本地 demo：

```bash
npm install
npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json
```

输出：

```text
小红书接待 Demo Agent 回归测试: passed (0 failures, 8 assertions)
JSON report: .voice-testops/report.json
HTML report: .voice-testops/report.html
```

## Test A Real Agent

### OpenClaw-compatible endpoint

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY"
```

OpenClaw endpoint 需要接受 `POST` JSON，并返回：

```json
{
  "spoken": "给用户播报的简短回复",
  "summary": {
    "source": "website",
    "intent": "pricing",
    "level": "medium",
    "need": "客户咨询价格",
    "questions": ["单人写真多少钱"],
    "nextAction": "请人工确认档期",
    "transcript": []
  }
}
```

### Generic HTTP endpoint

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "https://your-agent.example.com/test-turn"
```

## Generate A Failing Report

推广和调试时，失败报告比全绿报告更有说服力。这个 suite 会故意失败，因为它要求摘要里必须出现 `phone` 字段，而本地 demo agent 只会在话术里索要电话，不会自动解析手机号字段。

```bash
npm run voice-test -- \
  --suite examples/voice-testops/failing-demo-suite.json \
  --json .voice-testops/failing-demo.json \
  --html .voice-testops/failing-demo.html || true
```

打开 `.voice-testops/failing-demo.html` 可以看到失败原因，例如 `lead_field_missing`。

## CI

仓库包含 GitHub Actions 示例：`.github/workflows/voice-testops.yml`。

CI 会执行：

- `npm ci`
- `npm test`
- 本地通过型 suite
- `npm run build`
- `npm audit --audit-level=high`
- 生成一个预期失败的 demo 报告并上传 `.voice-testops/*.json` 和 `.voice-testops/*.html`

## Suite Format

```json
{
  "name": "回归测试",
  "scenarios": [
    {
      "id": "pricing",
      "title": "客户询价时不能乱报价",
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
        "bookingRules": { "requiresManualConfirm": true, "requiredFields": ["name", "phone"] }
      },
      "turns": [
        {
          "user": "单人写真多少钱",
          "expect": [
            { "type": "must_contain_any", "phrases": ["599", "1299"] },
            { "type": "must_not_match", "pattern": "最低价|保证|百分百" },
            { "type": "lead_intent", "intent": "pricing" },
            { "type": "max_latency_ms", "value": 2000 }
          ]
        }
      ]
    }
  ]
}
```

## Assertions

- `must_contain_any`: 回复必须包含至少一个短语。
- `must_not_match`: 回复不能命中指定正则。
- `max_latency_ms`: 当前 turn 响应时间不能超过阈值。
- `lead_field_present`: 线索摘要必须包含指定字段。
- `lead_intent`: 线索摘要意图必须匹配。

## Useful Commands

```bash
npm test
npm run build
npm audit --audit-level=high
```

## Docs

- 市场论证：`docs/strategy/voice-agent-testops-market.md`
- 产品设计：`docs/superpowers/specs/2026-05-03-voice-agent-testops-design.md`
- 下一阶段计划：`docs/roadmap/2026-05-03-voice-agent-testops-next-steps.md`
