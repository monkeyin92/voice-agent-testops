# LiveKit Agents

LiveKit Agents are powerful enough to hide a lot of behavior behind realtime sessions, tool calls, and voice pipelines. For regression testing, expose the decision layer as a `test-turn bridge`: one HTTP request in, one assistant turn out.

## Run it

Configure your service with LiveKit credentials and a test-only bridge URL:

```bash
export LIVEKIT_URL="wss://your-livekit-host"
export LIVEKIT_API_KEY="your-livekit-api-key"
export LIVEKIT_API_SECRET="your-livekit-api-secret"
export LIVEKIT_TEST_AGENT_URL="https://your-service.example.com/test-turn"
```

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "$LIVEKIT_TEST_AGENT_URL"
```

## Request contract

Voice Agent TestOps sends:

```json
{
  "scenarioId": "availability",
  "turnIndex": 0,
  "customerText": "Can I book this Saturday afternoon?",
  "merchant": {},
  "messages": []
}
```

Your bridge should call the same agent session logic, tool policy, and business-rule layer that your LiveKit voice room uses. In CI, prefer a text path that avoids joining a realtime room unless the suite is explicitly testing media behavior.

## Return contract

Return the assistant turn and optional summary:

```json
{
  "spoken": "Saturday availability needs manual confirmation. I can collect your phone number and have the studio check.",
  "summary": {
    "intent": "availability",
    "level": "medium",
    "nextAction": "Collect phone number and confirm schedule"
  }
}
```

`summary` is where lead extraction, handoff, and booking intent become testable.

## Bridge sketch

```js
app.post("/test-turn", async (req, res) => {
  const turn = req.body;
  const result = await runLiveKitAgentDecisionLayer({
    livekitUrl: process.env.LIVEKIT_URL,
    input: turn.customerText,
    history: turn.messages,
    merchant: turn.merchant,
  });

  res.json({
    spoken: result.spokenText,
    summary: result.summary,
  });
});
```

Use this for release gates. Add slower room-level tests only when you need to verify audio transport, turn detection, interruption, or realtime tool timing.
