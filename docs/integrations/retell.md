# Retell

Retell teams usually have either a prompt/flow agent, an app-server layer, a Call Event Webhook, or a custom LLM server. The shortest TestOps path is to wrap the decision layer with a deterministic `test-turn bridge`, then keep full Retell calls for slower smoke tests.

Retell's official docs separate two useful surfaces:

- [Call Event Webhook](https://docs.retellai.com/features/register-webhook): HTTP POST events such as `call_started`, `call_ended`, and `call_analyzed`.
- [LLM WebSocket](https://docs.retellai.com/api-references/llm-websocket): custom LLM integration where Retell connects to your WebSocket and sends live transcript events such as `update_only`, `response_required`, and `reminder_required`.

Voice Agent TestOps does not need to drive audio for every CI run. It should call the same LLM/app-server logic through `POST /test-turn`, then use `/retell/webhook` only to verify platform event delivery.

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

1. Replace `createBridgeTurnResponse()` in `examples/voice-platform-bridge/server.mjs` with the same logic your Retell agent uses to select the next response.
2. Run `doctor` until `spoken: ok` and `summary: ok`.
3. Run the suite with `--fail-on-severity critical`.
4. Put the bridge URL into CI as `VOICE_AGENT_ENDPOINT`.

## Retell Webhook Smoke Test

Local smoke test for the Call Event Webhook shape:

```bash
curl -i http://127.0.0.1:4319/retell/webhook \
  -H 'content-type: application/json' \
  -d '{"event":"call_analyzed","call":{"call_id":"retell_call_123","transcript":"..."}}'
```

Expose it with a tunnel:

```bash
ngrok http 4319
```

Register the public URL as either:

- account-level webhook for calls under the account
- agent-level webhook for a specific agent

Use `https://YOUR_TUNNEL/retell/webhook` as the endpoint. Retell's setup guide shows local POST testing, ngrok exposure, and webhook registration through the dashboard.

## Request contract

Voice Agent TestOps sends one scripted turn to your deterministic bridge:

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

For a Retell custom LLM, adapt this into the same state machine that handles `response_required` events on the LLM WebSocket. For prompt/flow agents, adapt it into your app-server policy, tool, CRM, or lead-summary layer.

## Return contract

Return the text your Retell agent would speak and any structured lead summary:

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

The `summary` object is optional, but it is the cleanest place to expose lead fields, transfer intent, CRM-ready next actions, and regression-testable business state.

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
