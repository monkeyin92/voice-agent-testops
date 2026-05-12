# Public proof gallery

Date: 2026-05-11

Purpose: turn cold outreach from "would you try this tool?" into "here is a public-safe proof; if you share one endpoint or one sanitized transcript, I can make it project-specific."

This page only links public-safe evidence. It does not include private recordings, customer identifiers, raw phone numbers, private call replay URLs, API keys, or production endpoint credentials.

## Proof cards

| Proof | Source | What it demonstrates | Result | Boundary |
|---|---|---|---|---|
| [Public demo report gallery](../demo-reports/README.md) | Committed public-safe HTML/Markdown artifacts | A maintainer can inspect report output without installing the CLI | Passed demo reports available as HTML, summaries, commercial reports, and proof cards | Uses synthetic/public-safe examples only |
| [Siphon dental transcript replay](../demo-reports/siphon-dental-transcript/README.md) | Synthetic Siphon-style dental receptionist transcript | A saved transcript can be replayed against a reviewed suite before a live endpoint exists | Passed: 1 scenario, 3 turns, 10 assertions, 0 failures | Not a Siphon live endpoint benchmark; no patient data, recordings, or credentials |
| [Public outbound leadgen demo report](2026-05-08-public-outbound-leadgen-demo-report.md) | Synthetic merchant facts and synthetic customer turns | A model-backed HTTP outbound agent can pass opt-out, pricing, availability, WeChat preference, and lead-capture checks | Passed: 5 scenarios, 25 assertions, 0 failures | Not a live dialer, CRM, or production conversion benchmark |
| [Outbound leadgen HTTP bridge demo](2026-05-09-outbound-leadgen-http-bridge-demo.md) | Example HTTP agent endpoint | The `POST /test-turn` contract is enough to run an outbound suite through `doctor` and `run` | Passed: 1 scenario, 10 assertions, 0 failures | Uses the local example bridge, not a third-party platform |
| [Public recording-derived outbound seeds](2026-05-09-public-recording-derived-outbound-seeds.md) | Private 50-recording review distilled into public synthetic seed turns | Private call review can become reusable public regressions without exposing recordings or customer data | Passed: 1 scenario, 5 turns, 11 assertions, 0 failures | Does not publish raw audio, filenames, phone numbers, or transcript excerpts |
| [Kevin Hu public sample dry run](2026-05-07-kev-hu-public-sample-dry-run.md) | Public sample transcript from an MIT-licensed repository | A public transcript can become a suite, report, regression draft, and pilot recap without private endpoint access | Failed: 11 failures, 46 assertions; 0 critical failures | Not endorsed by the repo owner and not a live endpoint benchmark |

## 2026-05-11 rerun proof

To keep the gallery current, the recording-derived outbound seed suite was rerun against the local HTTP example bridge on 2026-05-11:

```bash
npm run example:http-agent
npx tsx src/testops/cli.ts doctor \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --suite examples/voice-testops/chinese-outbound-recording-seeds-suite.json
npx tsx src/testops/cli.ts run \
  --suite examples/voice-testops/chinese-outbound-recording-seeds-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn \
  --json .voice-testops/2026-05-11-public-proof/report.json \
  --html .voice-testops/2026-05-11-public-proof/report.html \
  --summary .voice-testops/2026-05-11-public-proof/summary.md \
  --junit .voice-testops/2026-05-11-public-proof/junit.xml \
  --fail-on-severity critical
npx tsx src/testops/cli.ts pilot-report \
  --report .voice-testops/2026-05-11-public-proof/report.json \
  --commercial .voice-testops/2026-05-11-public-proof/commercial-report.md \
  --recap .voice-testops/2026-05-11-public-proof/pilot-recap.md \
  --customer "Public recording-derived outbound seeds" \
  --period "2026-05-11 no-reply proof rerun"
```

Observed output:

```text
Doctor passed
Chinese outbound recording-derived seed guardrails: passed (0 failures, 11 assertions)
Severity gate: passed (0 failures at or above critical)
```

Generated local artifacts stayed under `.voice-testops/2026-05-11-public-proof/` and are intentionally not committed.

## How to use this in outreach

Use one proof link per message, not all of them. Match the proof to the other project's domain:

| Target type | Best proof | Ask |
|---|---|---|
| Outbound leadgen, real estate, health campaign, Vapi outbound | [Public recording-derived outbound seeds](2026-05-09-public-recording-derived-outbound-seeds.md) | One dev endpoint or one sanitized outbound transcript |
| Generic HTTP / platform / bridge projects | [Outbound leadgen HTTP bridge demo](2026-05-09-outbound-leadgen-http-bridge-demo.md) | A scriptable `POST /test-turn` or WebSocket equivalent |
| Restaurant, dental, or receptionist projects | [Siphon dental transcript replay](../demo-reports/siphon-dental-transcript/README.md) | A booking, missed-call, or handoff transcript |
| Regulated support / insurance / identity verification | [Kevin Hu public sample dry run](2026-05-07-kev-hu-public-sample-dry-run.md) | One sanitized boundary transcript or permission to use public samples only |

If a maintainer can share a transcript but not an endpoint, run `transcript-trial` and send back `proof-card.md` first. Do not lead with the full commercial report unless they ask for more detail.

## Copy block

```text
I put together a public-safe proof gallery so this is less abstract:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/public-proof-gallery.md

There is also a committed demo HTML report here:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/demo-reports/outbound-recording-seeds/report.html

For transcript-first receptionist examples, this Siphon-style demo is closer:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/demo-reports/siphon-dental-transcript/report.html

The shortest useful trial is still just one dev/test endpoint that returns `{ "spoken": string, "summary"?: object }`, or one sanitized transcript with names, phone numbers, private URLs, and IDs replaced by placeholders.
```

## Operating rule

Do not keep bumping cold GitHub issues. If an issue has no reply after one short follow-up, move it to dormant and use this gallery in a different channel: Discussions, Discord, email, LinkedIn, or a direct maintainer contact that clearly accepts product feedback.
