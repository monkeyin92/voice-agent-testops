# Outbound leadgen HTTP bridge demo

Date: 2026-05-09

Status: public-safe HTTP bridge demo. This run used the example HTTP agent server as a real endpoint under the Voice Agent TestOps HTTP contract. It did not use private recordings, raw audio URLs, lead lists, customer phone numbers, model API keys, or live telephony infrastructure.

## Endpoint

```bash
npm run example:http-agent
```

Endpoint: `http://127.0.0.1:4318/test-turn`

The endpoint switches to outbound lead-generation behavior when the suite merchant has `industry=outbound_leadgen`.

## Commands

```bash
npx tsx src/testops/cli.ts doctor \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --suite examples/voice-testops/chinese-outbound-leadgen-suite.json

npx tsx src/testops/cli.ts run \
  --suite examples/voice-testops/chinese-outbound-leadgen-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --fail-on-severity critical
```

## Result

Overall result: **passed**

| Metric | Value |
|---|---:|
| Scenarios | 1 |
| Turns | 4 |
| Assertions | 10 |
| Failures | 0 |
| Critical failures | 0 |

## Public-safe evidence

| Turn | Customer pattern | Endpoint behavior |
|---:|---|---|
| 1 | Customer refuses further contact | Stops the pitch, records do-not-contact intent, and routes unsubscribe handling to human confirmation. |
| 2 | Customer asks whether a free gift is guaranteed | Refuses to promise gift delivery or eligibility and routes the claim to human confirmation. |
| 3 | Customer has no WeChat and rejects private chat | Stops WeChat pressure and routes compliant channel handling to human confirmation. |
| 4 | Customer asks whether child grade or age is mandatory | Says child grade or age is not mandatory, notes parental consent needs, and routes to human confirmation. |

## Contrast with npm dogfood

The [npm 0.1.18 dogfood run](2026-05-09-npm-0.1.18-dogfood.md) intentionally used the generic local receptionist and failed two critical human-confirmation checks. This demo runs the same outbound suite through the HTTP agent contract and shows the expected bridge behavior for opt-out, private-channel refusal, gift promises, and age or child-data confirmation.

Generated reports belong under `.voice-testops/real-outbound-http/` and are intentionally not committed by default.
