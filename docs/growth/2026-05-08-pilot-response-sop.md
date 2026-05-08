# Voice Agent Pilot Response SOP

Date: 2026-05-08

Goal: turn any positive reply into a first Voice Agent TestOps run within 10 minutes, without pulling private customer data into the public repo.

## 0. First reply checklist

Before asking for files or endpoints, reply with the safest matching path:

- **Endpoint available**: ask for a dev/test endpoint only, not production secrets in public comments.
- **Transcript available**: ask for 1-3 sanitized transcripts with placeholders.
- **Blocked / curious**: send the public demo report and the smallest local command.

Never ask for raw phone numbers, customer names, private recording URLs, bearer tokens, cookies, CRM exports, or production call ids in GitHub issues.

## 1. If they can provide an endpoint

Reply:

```text
Great — please do not paste secrets into this issue. The minimum test contract is:

POST /test-turn
request: { "customerText": string, "messages": [], "merchant": {}, "source": "unknown" }
response: { "spoken": string, "summary"?: object }

If the endpoint needs auth, share only the auth mechanism here; send any token privately or use a temporary test token.
```

Run locally:

```bash
npx voice-agent-testops doctor \
  --agent http \
  --endpoint <test-endpoint> \
  --suite examples/voice-testops/quick-lead-qualifier-suite.json

npx voice-agent-testops run \
  --suite examples/voice-testops/quick-lead-qualifier-suite.json \
  --agent http \
  --endpoint <test-endpoint> \
  --json .voice-testops/<pilot-id>/report.json \
  --html .voice-testops/<pilot-id>/report.html \
  --summary .voice-testops/<pilot-id>/summary.md \
  --junit .voice-testops/<pilot-id>/junit.xml

npx voice-agent-testops pilot-report \
  --report .voice-testops/<pilot-id>/report.json \
  --commercial .voice-testops/<pilot-id>/commercial-report.md \
  --recap .voice-testops/<pilot-id>/pilot-recap.md \
  --customer "<project-or-team>" \
  --period "first external pilot"
```

Use the closest quick suite first:

- Real-estate outbound: `examples/voice-testops/quick-real-estate-outbound-suite.json`
- Receptionist booking: `examples/voice-testops/quick-receptionist-booking-suite.json`
- Lead qualifier / generic outbound: `examples/voice-testops/quick-lead-qualifier-suite.json`

## 2. If they can provide transcripts

Reply:

```text
Great — please sanitize before sharing. One transcript is enough for a first pass.

Replace real values with stable placeholders like [CUSTOMER_NAME], [PHONE], [EMAIL], [ADDRESS], [CALL_ID]. Please do not include raw recording URLs, production call ids, or full customer names.

The most useful sample is a real failure or borderline case: opt-out ignored, unsupported promise, missed lead field, or wrong handoff.
```

Generate suite:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --turn-role assistant \
  --out .voice-testops/<pilot-id>/suite.json \
  --merchant-out .voice-testops/<pilot-id>/merchant.json \
  --merchant-name "<project-or-team>" \
  --scenario-id "<pilot-id>_transcript"

npx voice-agent-testops validate \
  --suite .voice-testops/<pilot-id>/suite.json
```

If the transcript is insurance/regulated service, add `--intake insurance` and use `docs/ops/insurance-transcript-intake.md`.

## 3. If they are blocked or only curious

Reply:

```text
No problem. The fastest local preview is the public demo report:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/2026-05-08-public-outbound-leadgen-demo-report.md

If you want to try without sharing data, run:

npx voice-agent-testops run --suite examples/voice-testops/quick-lead-qualifier-suite.json

If that feels relevant, we can adapt the suite to your agent later.
```

Track the blocker as one of:

- `endpoint_contract`
- `auth_or_network`
- `data_authorization`
- `setup_blocked`
- `no_clear_value`

## 4. After the first run

Within the same day:

1. Send only aggregate findings publicly unless they explicitly approve details.
2. If there are failures, generate regression draft and failure clusters.
3. Update `docs/ops/external-pilot-tracker.zh-CN.md`.
4. Add a private note with artifact paths under `.voice-testops/<pilot-id>/`.
5. Ask one direct next-step question: fix/re-run, add transcript, or close.
