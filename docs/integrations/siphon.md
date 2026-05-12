# Siphon

Use this path when a Siphon agent has call transcripts but no dedicated TestOps HTTP endpoint yet. Siphon can persist conversation transcripts with `SAVE_TRANSCRIPTION=true`; Voice Agent TestOps can replay a sanitized transcript against a reviewed suite.

## Run it

Keep raw Siphon call data private. Copy only a sanitized transcript into an ignored workspace path, with private names, phone numbers, recording URLs, and call IDs replaced by placeholders:

```text
Customer: Hi, I need to book a dental cleaning for tomorrow afternoon.
Assistant: I can help request a cleaning appointment. May I have the best phone number to reach you?
```

Run a reviewed suite against that transcript:

```bash
npx voice-agent-testops run \
  --suite voice-testops/siphon-dental-suite.json \
  --agent transcript \
  --transcript .voice-testops/siphon/sanitized-call.txt \
  --json .voice-testops/siphon/report.json \
  --html .voice-testops/siphon/report.html \
  --summary .voice-testops/siphon/summary.md
```

This first step requires no SIP trunk, LiveKit credentials, private recordings, or production data. The suite can check practical Siphon agent risks such as unsupported medical guarantees, missing identity verification before appointment lookup, wrong handoff behavior, and missing callback fields.

## Return contract

The transcript agent reads labeled text lines and replays the next assistant line for each customer turn:

```text
Customer: caller turn
Assistant: agent reply
Customer: next caller turn
Assistant: next agent reply
```

The run output uses the same report contract as HTTP, SIP, and local agents: JSON report, HTML report, optional Markdown summary, optional JUnit, failed assertions, and generated lead summaries inferred from the transcript text.

## First Draft From One Transcript

If there is no reviewed suite yet, start with `transcript-trial`:

```bash
npx voice-agent-testops transcript-trial \
  --input .voice-testops/siphon/sanitized-call.txt \
  --out-dir .voice-testops/siphon/trial \
  --merchant-name "Siphon dental receptionist" \
  --industry dental_clinic \
  --customer "Siphon dental receptionist"
```

`transcript-trial` writes a draft suite, merchant profile, intake summary, JSON/HTML reports, a commercial recap, a proof card, and failure clusters when assertions fail. Treat the generated suite as a draft and tighten it before using it as a release gate.

## Live Endpoint Later

When a Siphon team wants deterministic CI rather than transcript replay, add a small test route around the agent behavior layer and use the generic HTTP adapter:

```bash
npx voice-agent-testops run \
  --suite voice-testops/siphon-dental-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn
```

Expected endpoint shape:

```json
{ "spoken": "assistant reply", "summary": { "intent": "booking" } }
```

Keep credentials, SIP numbers, raw call transcripts, and private replay URLs out of public issues and committed artifacts.
