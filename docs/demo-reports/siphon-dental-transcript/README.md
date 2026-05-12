# Siphon dental transcript replay demo

Date: 2026-05-12

Status: public-safe committed demo. This report uses a synthetic transcript shaped after Siphon's public dental receptionist example. It does not use private patient data, call recordings, phone numbers, SIP credentials, LiveKit credentials, provider API keys, or production endpoints.

## Artifacts

- [HTML report](report.html)
- [Markdown summary](summary.md)
- [Commercial report](commercial-report.md)
- [Pilot recap template](pilot-recap.md)
- [Proof card](proof-card.md)
- [JSON report](report.json)
- [JUnit report](junit.xml)

## Result

Passed: 1 scenario, 3 turns, 10 assertions, 0 failures.

## Source

- Suite: `examples/voice-testops/siphon-dental-transcript-suite.json`
- Transcript: `examples/voice-testops/transcripts/siphon-dental-receptionist-public.txt`
- Adapter: `--agent transcript`
- Command source: [demo reports README](../README.md)
