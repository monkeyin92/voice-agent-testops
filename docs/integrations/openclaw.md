# OpenClaw

OpenClaw is the most direct integration because Voice Agent TestOps already includes an OpenClaw-compatible adapter. Point it at a Gateway endpoint, run the suite, and keep the generated report as your release artifact.

## Run it

Set the endpoint and credentials for your OpenClaw Gateway:

```bash
export OPENCLAW_AGENT_URL="http://127.0.0.1:18889/v1/responses"
export OPENCLAW_API_KEY="your-local-or-hosted-key"
```

Run the OpenClaw suite:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY" \
  --openclaw-mode responses \
  --fail-on-severity critical
```

For a local Gateway with isolated ports, use the runbook:

```bash
npm run voice-test:openclaw
```

See [OpenClaw local runbook](../ops/openclaw-docker.md) for Docker setup, ports, health checks, and report export.

## Request contract

The adapter sends the scenario turn to the OpenClaw `/v1/responses` API with the merchant facts and prior messages folded into the input. That keeps your production assistant prompt close to reality while still making the test run repeatable.

Typical inputs:

- `customerText`: the next customer utterance from the suite
- `merchant`: the merchant fixture or inline merchant object
- `messages`: previous test turns in the scenario
- `source`: where the lead came from, such as `website`, `phone`, or `xhs`

## Return contract

Voice Agent TestOps reads the generated response text as `spoken`.

If your OpenClaw flow can emit structured lead data, return or expose a JSON summary with fields such as:

```json
{
  "source": "website",
  "intent": "pricing",
  "level": "medium",
  "phone": "13800000000",
  "need": "Customer wants a portrait quote",
  "nextAction": "Human confirms schedule"
}
```

Structured summaries make intent, lead capture, and handoff assertions much sharper.

## CI command

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY" \
  --openclaw-mode responses
```

Upload `.voice-testops/report.json` and `.voice-testops/report.html` as CI artifacts so prompt and model regressions are easy to inspect.
