# Pipecat

Pipecat pipelines are excellent for realtime voice orchestration. Voice Agent TestOps works best when you expose the business decision part of the pipeline as a `test-turn bridge`, then run scripted regressions against that bridge.

## Run it

Start your Pipecat bot service with a test bridge:

```bash
export PIPECAT_TEST_AGENT_URL="https://your-pipecat-service.example.com/test-turn"
```

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "$PIPECAT_TEST_AGENT_URL"
```

## Request contract

Voice Agent TestOps posts one customer turn:

```json
{
  "scenarioId": "lead-capture",
  "turnIndex": 2,
  "customerText": "My phone number is 13800000000.",
  "merchant": {},
  "messages": []
}
```

Feed that request into the same prompt, memory, tool, and guardrail code used by your Pipecat pipeline. Keep audio transport out of the fast CI loop unless the test is specifically about realtime behavior.

## Return contract

Return:

```json
{
  "spoken": "Thanks. I have your phone number and will ask the studio to follow up.",
  "summary": {
    "intent": "booking",
    "level": "high",
    "phone": "13800000000",
    "nextAction": "Studio follows up with available slots"
  }
}
```

The `spoken` field catches unsafe or missing customer-facing language. The `summary` field catches structured failures such as missing phone numbers, wrong intent, or lost handoff state.

## Bridge sketch

```js
app.post("/test-turn", async (req, res) => {
  const turn = req.body;
  const result = await runPipecatDecisionStep({
    input: turn.customerText,
    history: turn.messages,
    merchant: turn.merchant,
  });

  res.json({
    spoken: result.outputText,
    summary: result.summary,
  });
});
```

Use the bridge as a release gate for prompt, model, tool, and workflow changes. Keep end-to-end Pipecat sessions for the smaller set of tests that need actual media timing.
