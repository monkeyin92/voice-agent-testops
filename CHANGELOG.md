# Changelog

## 0.1.24 - 2026-05-11

### Features
- Add `--sip-driver-retries` and `VOICE_TESTOPS_SIP_DRIVER_RETRIES` for limited SIP driver redials after transient call setup failures.
- Expose per-attempt environment metadata to SIP drivers with `VOICE_TESTOPS_SIP_DRIVER_ATTEMPT` and `VOICE_TESTOPS_SIP_DRIVER_MAX_ATTEMPTS`.

### Documentation
- Document SIP retry usage in the README and SIP integration guide.

## 0.1.23 - 2026-05-11

### Fixes
- Normalize common Simplified/Traditional Chinese ASR drift for `must_contain_any` phrase checks.
- Apply the same normalization to `must_not_match` forbidden-pattern checks so robot-only SIP tests can catch variants such as `轉人工`.

### Documentation
- Document Chinese assertion normalization in the README and SIP integration guide.

## 0.1.22 - 2026-05-11

### Features
- Add a bundled Baresip SIP driver for real local voice-call smoke tests.
- Support macOS `say` TTS, `ffmpeg` audio conversion/metrics, Baresip call recording, and optional `whisper-cli` ASR in the reference SIP driver.

### Documentation
- Document private SIP credential handling, local Baresip prerequisites, and real-driver usage without committing secrets.

## 0.1.21 - 2026-05-11

### Features
- Add `--agent sip` with a SIP driver command contract for real voice-call regression tests.
- Add bundled mock SIP driver for contract smoke tests without placing a real call.
- Add `phone` as a first-class lead source for SIP and telephony suites.

### Documentation
- Add SIP integration guide covering driver input, return contract, audio replay, and voice metrics.
- Document SIP setup in English and Chinese READMEs.

## 0.1.20 - 2026-05-11

### Features
- Add `transcript-trial` for endpoint-free sanitized transcript trials that generate reports, pilot artifacts, proof cards, and regression drafts.
- Add `proof-card` for short GitHub, email, or Discord follow-up summaries from JSON reports.
- Add transcript replay support for evaluating assistant turns from sanitized transcript-only trials.

### Documentation
- Add committed public-safe demo report artifacts for outbound recording-derived seeds.
- Add a public proof gallery and no-reply growth plan for proof-led outreach.
- Update outreach tracking with warm-line follow-up timing and cold-line stop rules.

## 0.1.19 - 2026-05-09

### Features
- Add public-safe recording-derived outbound lead-generation seed suite.
- Add deterministic outbound lead-generation handling to the public HTTP agent example.
- Add quick pilot suites for receptionist booking, lead qualification, and real-estate outbound workflows.

### Documentation
- Add public recording-derived outbound seed report.
- Add npm dogfood, outbound HTTP bridge, public outbound demo, and pilot response workflow notes.

## 0.1.18 - 2026-05-08

### Features
- Add semantic judge assertions, annotation seeds, and calibration reports for regulated voice-agent guardrails.
- Add commercial starter suites for real estate, dental, home design, insurance, and outbound lead-generation workflows.
- Add HTTP, Vapi, and Retell bridge support with tool-call, backend-state, audio replay, and voice-metric assertions.
- Add production call sampling, transcript intake, regression drafting, commercial pilot reports, and recording intake triage.
- Add raw recording URL intake support and sanitized outbound lead-generation regression examples.

### Documentation
- Add external pilot, data authorization, recording intake, and first real pilot runbooks.
- Add public sample dry-run notes and expanded mock-data guidance for transcript-derived regressions.
