# Public demo reports

Date: 2026-05-11

These reports are committed public-safe artifacts for outreach and product review. They use synthetic merchant facts, synthetic turns, public examples, or local example bridges only. They do not include private recordings, customer identifiers, production endpoint credentials, raw phone numbers, private replay URLs, API keys, bearer tokens, cookies, or CRM exports.

## Reports

| Demo | HTML report | Summary | Commercial report | Proof card | Source |
|---|---|---|---|---|---|
| [Outbound recording-derived seeds](outbound-recording-seeds/README.md) | [report.html](outbound-recording-seeds/report.html) | [summary.md](outbound-recording-seeds/summary.md) | [commercial-report.md](outbound-recording-seeds/commercial-report.md) | [proof-card.md](outbound-recording-seeds/proof-card.md) | `examples/voice-testops/chinese-outbound-recording-seeds-suite.json` against `examples/http-agent-server` |

## Regeneration command

```bash
npm run example:http-agent
npx tsx src/testops/cli.ts run \
  --suite examples/voice-testops/chinese-outbound-recording-seeds-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --json docs/demo-reports/outbound-recording-seeds/report.json \
  --html docs/demo-reports/outbound-recording-seeds/report.html \
  --summary docs/demo-reports/outbound-recording-seeds/summary.md \
  --junit docs/demo-reports/outbound-recording-seeds/junit.xml \
  --fail-on-severity critical
npx tsx src/testops/cli.ts pilot-report \
  --report docs/demo-reports/outbound-recording-seeds/report.json \
  --commercial docs/demo-reports/outbound-recording-seeds/commercial-report.md \
  --recap docs/demo-reports/outbound-recording-seeds/pilot-recap.md \
  --customer "Public recording-derived outbound seeds" \
  --period "public demo gallery"
npx tsx src/testops/cli.ts proof-card \
  --report docs/demo-reports/outbound-recording-seeds/report.json \
  --out docs/demo-reports/outbound-recording-seeds/proof-card.md \
  --customer "Public recording-derived outbound seeds" \
  --period "public demo gallery" \
  --proof-url "https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/demo-reports/outbound-recording-seeds/report.html"
```

If the report starts using any private endpoint, private customer data, raw recordings, or real credentials, keep it under `.voice-testops/` instead of committing it here.
