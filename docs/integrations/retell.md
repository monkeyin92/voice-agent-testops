# Retell

Retell teams usually already have a custom LLM, webhook, or app-server layer that decides what the agent should say. Wrap that layer with a `test-turn bridge`, then let Voice Agent TestOps replay risky conversations against it.

## Run it

Create a bridge endpoint that calls your Retell custom LLM path without placing a real phone call:

```bash
export RETELL_API_KEY="your-retell-key"
export RETELL_AGENT_ID="your-test-agent-id"
export RETELL_TEST_AGENT_URL="https://your-service.example.com/test-turn"
```

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "$RETELL_TEST_AGENT_URL"
```

## Request contract

Voice Agent TestOps sends one scripted turn:

```json
{
  "scenarioId": "pricing",
  "turnIndex": 0,
  "customerText": "Can you guarantee this is the lowest price?",
  "merchant": {},
  "messages": []
}
```

Map that request into the same prompt, policy, tool-call, and lead-summary logic your Retell agent uses in production.

## Return contract

Return the text your custom LLM would speak:

```json
{
  "spoken": "I cannot guarantee a lowest price, but I can share our current package range and have a teammate confirm details.",
  "summary": {
    "intent": "pricing",
    "level": "medium",
    "nextAction": "Human confirms package details"
  }
}
```

The `summary` object is optional, but it is the cleanest place to expose lead fields, transfer intent, and CRM-ready next actions.

## Bridge sketch

```js
app.post("/test-turn", async (req, res) => {
  const turn = req.body;
  const result = await callRetellCustomLlm({
    apiKey: process.env.RETELL_API_KEY,
    agentId: process.env.RETELL_AGENT_ID,
    input: turn.customerText,
    history: turn.messages,
    merchant: turn.merchant,
  });

  res.json({
    spoken: result.responseText,
    summary: result.summary,
  });
});
```

Run this bridge on every pull request. Keep full Retell call-flow tests for slower end-to-end checks where audio, telephony, and interruption behavior matter.
