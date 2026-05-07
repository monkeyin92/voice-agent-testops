# Generic HTTP Agent

The HTTP adapter is the fastest way to put Voice Agent TestOps around any agent stack. If your agent can answer one text turn over HTTP, it can be regression-tested in CI.

Use this path for custom agents, local prototypes, Vapi/Retell/LiveKit/Pipecat bridges, or production services that already have a text-in/text-out layer behind the voice UI.

## Run it

Start the included demo service:

```bash
npm run example:http-agent
```

Run a suite against it from another terminal:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn
```

Point the same command at your own service when the bridge is ready:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint "https://your-agent.example.com/test-turn"
```

## Request contract

Voice Agent TestOps sends a single customer turn to `POST /test-turn`:

```json
{
  "suiteName": "Photo studio launch check",
  "scenarioId": "pricing",
  "turnIndex": 0,
  "customerText": "How much is an individual portrait session?",
  "source": "website",
  "merchant": {
    "name": "Lumen Portrait Studio"
  },
  "messages": []
}
```

`messages` contains previous turns in the same scenario. Use it when your agent needs conversation history.

## Return contract

Return the words your agent would speak, plus optional structured evidence for assertions:

```json
{
  "spoken": "Individual portrait sessions usually range from 599 to 1299. A teammate should confirm the final slot.",
  "summary": {
    "source": "website",
    "intent": "pricing",
    "level": "medium",
    "need": "Customer asked about individual portrait pricing",
    "questions": ["How much is an individual portrait session?"],
    "nextAction": "Follow up with available slots",
    "transcript": []
  },
  "tools": [
    {
      "name": "create_lead",
      "arguments": {
        "intent": "pricing"
      }
    }
  ],
  "state": {
    "lead": {
      "intent": "pricing",
      "status": "captured"
    }
  },
  "audio": {
    "url": "https://your-agent.example.com/replays/call-123-turn-1.wav",
    "label": "call-123 turn 1",
    "mimeType": "audio/wav",
    "durationMs": 4200
  },
  "voiceMetrics": {
    "timeToFirstWordMs": 640,
    "asrLatencyMs": 180,
    "ttsLatencyMs": 320,
    "silenceMs": 850,
    "interruptionCount": 0,
    "asrConfidence": 0.93
  }
}
```

`spoken` is required. `summary` is optional, but it unlocks lead-field and intent assertions such as `lead_field_present` and `lead_intent`.
`tools` is optional; return it when you want assertions such as `tool_called` to verify function/tool usage. `state` is optional; return a small test-safe backend snapshot when you want `backend_state_present` or `backend_state_equals` to verify CRM, booking, handoff, or lead state.
`audio` is optional; return a replay URL when you want `audio_replay_present` and report playback. `voiceMetrics` is optional; return numeric telemetry when you want `voice_metric_max` or `voice_metric_min` to gate time-to-first-word, silence, interruption count, ASR/TTS latency, or ASR confidence.

## Bridge shape

The demo server lives at [examples/http-agent-server/server.mjs](../../examples/http-agent-server/server.mjs). Replace `createTestAgentResponse()` with the same call your voice stack already makes behind the scenes.

```js
async function createTestAgentResponse(turn) {
  const agentResult = await callYourAgent({
    input: turn.customerText,
    merchant: turn.merchant,
    history: turn.messages,
  });

  return {
    spoken: agentResult.text,
    summary: agentResult.leadSummary,
    tools: agentResult.toolCalls,
    state: {
      lead: agentResult.leadRecord,
      booking: agentResult.bookingDraft,
    },
    audio: agentResult.audioReplay,
    voiceMetrics: {
      timeToFirstWordMs: agentResult.timings.timeToFirstWordMs,
      asrLatencyMs: agentResult.timings.asrLatencyMs,
      ttsLatencyMs: agentResult.timings.ttsLatencyMs,
      silenceMs: agentResult.timings.silenceMs,
      interruptionCount: agentResult.timings.interruptionCount,
      asrConfidence: agentResult.asrConfidence,
    },
  };
}
```

Keep this bridge deterministic in CI: use a test merchant, test credentials, and a model configuration you are willing to gate releases on.
