# Voice Agent TestOps Proof Card

Target: Public recording-derived outbound seeds
Period: public demo gallery
Suite: Chinese outbound recording-derived seed guardrails
Result: passed
Coverage: 1 scenarios, 5 turns, 11 assertions.
Failures: 0 total (0 critical, 0 major, 0 minor).
Report link: https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/demo-reports/outbound-recording-seeds/report.html

## Evidence

- No failures in this run. The next useful step is to run the same suite against a real endpoint or one sanitized transcript.

## Minimum next step

Share one dev/test endpoint returning `{ "spoken": string, "summary"?: object }`, or one sanitized transcript with private details replaced by placeholders.

Privacy boundary: do not share production credentials, bearer tokens, private recording URLs, raw phone numbers, customer names, or CRM exports in public threads.

