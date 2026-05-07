# Vapi

Use Vapi with Voice Agent TestOps through a small `test-turn bridge`: a deterministic HTTP endpoint that exercises the same prompt, tool, handoff, CRM, and lead-summary logic your Vapi assistant uses, without placing a real phone call on every pull request.

Vapi's official docs call webhook-style integration points [Server URLs](https://docs.vapi.ai/server-url/). Server URLs can receive status updates, transcript updates, function calls, assistant requests, end-of-call reports, and hang notifications. Vapi can set these URLs at account, phone number, assistant, or function level; the assistant-level API field is `assistant.server.url`. For local webhook forwarding, Vapi also documents `vapi listen --forward-to`.

## Run it

Terminal 1: start the local bridge.

```bash
npm run example:voice-platform-bridge
```

Terminal 2: verify the TestOps HTTP contract.

```bash
npx voice-agent-testops doctor \
  --agent http \
  --endpoint http://127.0.0.1:4319/test-turn \
  --suite examples/voice-testops/chinese-real-estate-agent-suite.json
```

Then run the starter suite:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/chinese-real-estate-agent-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4319/test-turn \
  --fail-on-severity critical
```

Expected local pass/fail loop:

1. Replace `createBridgeTurnResponse()` in `examples/voice-platform-bridge/server.mjs` with the same internal function your Vapi assistant uses to build replies.
2. Run `doctor` until `spoken: ok` and `summary: ok`.
3. Run the suite with `--fail-on-severity critical`.
4. Put the bridge URL into CI as `VOICE_AGENT_ENDPOINT`.

## Vapi Webhook Smoke Test

The deterministic bridge is for CI. A real Vapi call is still useful as a slower smoke test for Server URLs, transcripts, and call lifecycle events.

Local smoke test:

```bash
curl -s http://127.0.0.1:4319/vapi/webhook \
  -H 'content-type: application/json' \
  -d '{"message":{"type":"end-of-call-report","call":{"id":"vapi_call_123"}}}'
```

Expose it:

```bash
ngrok http 4242
vapi listen --forward-to localhost:4319/vapi/webhook
```

Set the tunnel URL in Vapi as your Server URL. For assistant-level configuration, set `assistant.server.url`; for function tools, use the tool server URL. Keep credentials in Vapi Custom Credentials or your own gateway, not in the public suite.

## Request contract

Voice Agent TestOps calls your deterministic bridge with `POST /test-turn`:

```json
{
  "suiteName": "房产经纪 Voice Agent 高风险场景",
  "scenarioId": "real_estate_viewing_collects_phone",
  "turnIndex": 0,
  "customerText": "我预算 300 万，想看浦东两房，电话 13800000000，周末可以吗",
  "source": "website",
  "merchant": {},
  "messages": []
}
```

Map that input into your Vapi-backed code path: prompt assembly, tool call selection, function-call policy, lead extraction, CRM writes, and handoff decisions. The bridge should not need to start a real Vapi phone call.

## Return contract

Return the assistant text and any lead summary you can recover:

```json
{
  "spoken": "房源状态和看房时间需要经纪人、业主确认。我先记录预算、区域和期望时间，请留下电话方便经纪人联系。",
  "summary": {
    "intent": "availability",
    "level": "high",
    "phone": "13800000000",
    "budget": "300 万",
    "location": "浦东",
    "nextAction": "Ask a real estate agent to confirm facts before committing"
  }
}
```

`spoken` drives content and semantic assertions. `summary` drives lead assertions such as `lead_intent`, `lead_field_present`, and handoff checks.

## CI Command

```bash
npx voice-agent-testops run \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json \
  --summary .voice-testops/summary.md \
  --junit .voice-testops/junit.xml \
  --fail-on-severity critical
```

When a baseline report exists, add:

```bash
--baseline .voice-testops-baseline/report.json \
--diff-markdown .voice-testops/diff.md \
--fail-on-new \
--fail-on-severity critical
```

This blocks newly introduced critical regressions while leaving lower-severity drift visible in the diff.
