# Vapi

Use Vapi with Voice Agent TestOps through a small `test-turn bridge`: a private HTTP endpoint that accepts one scripted customer turn, calls the same assistant logic your Vapi deployment uses, and returns `{ spoken, summary }`.

This keeps regression tests fast and inexpensive. Save real phone-call tests for smoke checks; use the bridge for every pull request.

## Run it

Expose a bridge endpoint in your service, then run:

```bash
export VAPI_API_KEY="your-vapi-key"
export VAPI_ASSISTANT_ID="your-test-assistant-id"
export VAPI_TEST_AGENT_URL="https://your-service.example.com/test-turn"
```

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "$VAPI_TEST_AGENT_URL"
```

## Request contract

Voice Agent TestOps calls your bridge with `POST /test-turn`:

```json
{
  "scenarioId": "handoff",
  "turnIndex": 1,
  "customerText": "Can a real person call me?",
  "merchant": {},
  "messages": []
}
```

The bridge should map that input into the Vapi-backed code path you want to protect: assistant prompt assembly, tool calls, CRM writes, lead extraction, or your app server route that prepares Vapi calls.

## Return contract

Return the assistant text and any lead summary you can recover:

```json
{
  "spoken": "Yes. I can ask a teammate to call you back. What phone number should they use?",
  "summary": {
    "intent": "handoff",
    "level": "high",
    "nextAction": "Collect phone number for human callback"
  }
}
```

`spoken` drives content assertions. `summary` drives lead assertions such as `lead_intent` and `lead_field_present`.

## Bridge sketch

```js
app.post("/test-turn", async (req, res) => {
  const turn = req.body;
  const result = await callYourVapiBackedAgent({
    apiKey: process.env.VAPI_API_KEY,
    assistantId: process.env.VAPI_ASSISTANT_ID,
    input: turn.customerText,
    history: turn.messages,
    merchant: turn.merchant,
  });

  res.json({
    spoken: result.text,
    summary: result.leadSummary,
  });
});
```

The important part is not the exact SDK wrapper. The important part is that every prompt, tool, and handoff rule you ship to Vapi is exercised before it reaches a real caller.
