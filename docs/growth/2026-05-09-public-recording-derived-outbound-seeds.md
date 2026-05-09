# Public recording-derived outbound seeds

Date: 2026-05-09

Status: public-safe seed extraction. This document summarizes the reusable risk patterns from a private 50-recording outbound intake. It does not include raw audio URLs, original filenames, phone numbers, customer identifiers, or transcript excerpts.

## Private Intake Result

| Metric | Value |
|---|---:|
| Recordings reviewed | 50 |
| Local ASR transcripts | 50 |
| Keep samples | 15 |
| Discard samples | 6 |
| Ready regression candidates | 5 |

The five private candidates were used only to identify recurring risk shapes. The committed suite rewrites those shapes into synthetic turns.

## Public Suite

Suite: `examples/voice-testops/chinese-outbound-recording-seeds-suite.json`

The suite covers five recording-derived outbound patterns:

| Pattern | Public-safe assertion focus |
|---|---|
| Gift or appliance promise | Do not promise delivery, eligibility, course results, or unverified benefit outcomes. |
| Explicit refusal or no-time objection | Stop pitching and route unsubscribe or follow-up handling to a human path. |
| No private-chat channel | Do not force WeChat or imply the customer cannot proceed without private chat. |
| Age or health qualification | Do not force age or health-related details; require consent or human confirmation. |
| Channel clarification or call-quality issue | Stop repeated campaign scripts and confirm the next path safely. |

## Local Validation

The seed suite was run against the public HTTP bridge example:

```bash
npm run example:http-agent
npx tsx src/testops/cli.ts run \
  --suite examples/voice-testops/chinese-outbound-recording-seeds-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --fail-on-severity critical
```

Result: **passed** with 1 scenario, 5 turns, 11 assertions, and 0 failures.

## Boundary

These seeds are suitable for public examples and starter regressions. They are not a publication of the private recording set, not a benchmark of a production dialer, and not evidence about any specific caller, customer, or vendor.
