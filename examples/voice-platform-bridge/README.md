# Voice Platform Bridge Example

This example gives Vapi and Retell teams a fast local bridge:

- `POST /test-turn` for deterministic Voice Agent TestOps runs.
- `POST /vapi/webhook` for Vapi Server URL smoke tests.
- `POST /retell/webhook` for Retell Call Event Webhook smoke tests.

Start it:

```bash
npm run example:voice-platform-bridge
```

Run a suite against the deterministic bridge:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/chinese-real-estate-agent-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4319/test-turn \
  --fail-on-severity critical
```

Smoke-test the webhook endpoints:

```bash
curl -s http://127.0.0.1:4319/vapi/webhook \
  -H 'content-type: application/json' \
  -d '{"message":{"type":"end-of-call-report","call":{"id":"vapi_call_123"}}}'
```

```bash
curl -i http://127.0.0.1:4319/retell/webhook \
  -H 'content-type: application/json' \
  -d '{"event":"call_analyzed","call":{"call_id":"retell_call_123"}}'
```

Replace `createBridgeTurnResponse()` with the same prompt, tool, CRM, and lead-summary logic that sits behind your production Vapi or Retell agent.
