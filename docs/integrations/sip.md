# SIP Voice Agents

Use the SIP adapter when the only real entry point is a phone/SIP trunk, not a deterministic HTTP `POST /test-turn` endpoint.

SIP support is intentionally implemented as a driver contract. Voice Agent TestOps owns the suite, assertions, reports, and CI behavior. Your SIP driver owns the carrier/platform details: dialing, media playback, recording, ASR, and optional TTS. This keeps the core package independent from SIPp, Asterisk, baresip, LiveKit SIP, Twilio Elastic SIP Trunking, or an internal dialer.

## Run it

The bundled mock driver does not place a real call. It proves the stdin/stdout contract and lets you verify reports before wiring a real trunk:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/chinese-real-estate-agent-suite.json \
  --agent sip \
  --sip-uri sip:+8613800000000@10.0.0.8 \
  --sip-driver-command "node examples/sip-driver/mock-driver.mjs" \
  --sip-media-dir .voice-testops/sip-media \
  --summary .voice-testops/summary.md \
  --junit .voice-testops/junit.xml
```

For a local macOS smoke test with a real SIP account, use the bundled Baresip driver. It uses `say` for TTS, `ffmpeg` for audio conversion/metrics, `baresip` for SIP registration and calling, and optional `whisper-cli` for local ASR:

```bash
brew install baresip whisper-cpp

export VOICE_TESTOPS_SIP_USERNAME="1001"
export VOICE_TESTOPS_SIP_PASSWORD="replace-with-private-password"
export VOICE_TESTOPS_SIP_SERVER="sip.example.com:5060"
export VOICE_TESTOPS_WHISPER_MODEL=".voice-testops/sip-private/models/ggml-base.bin"
export VOICE_TESTOPS_BARESIP_CALL_SECONDS="35"

npx voice-agent-testops run \
  --suite voice-testops/suite.json \
  --agent sip \
  --sip-uri "sip:2000@sip.example.com:5060" \
  --sip-driver-command "node examples/sip-driver/baresip-driver.mjs" \
  --sip-media-dir .voice-testops/sip-private/media \
  --sip-call-timeout-ms 90000 \
  --sip-driver-retries 2
```

For a real bot, replace the driver command with a script that calls your SIP target:

```bash
npx voice-agent-testops run \
  --suite voice-testops/suite.json \
  --agent sip \
  --sip-uri "$VOICE_TESTOPS_SIP_URI" \
  --sip-proxy "$VOICE_TESTOPS_SIP_PROXY" \
  --sip-from "$VOICE_TESTOPS_SIP_FROM" \
  --sip-driver-command "./scripts/sip-call-driver.sh" \
  --sip-call-timeout-ms 120000 \
  --sip-driver-retries 2 \
  --sip-media-dir .voice-testops/sip-media
```

You can also use environment variables:

```bash
export VOICE_TESTOPS_SIP_DRIVER_COMMAND="./scripts/sip-call-driver.sh"
export VOICE_TESTOPS_SIP_URI="sip:+8613800000000@10.0.0.8"
export VOICE_TESTOPS_SIP_PROXY="sip:10.0.0.8:5060"
export VOICE_TESTOPS_SIP_FROM="sip:testops@10.0.0.9"
export VOICE_TESTOPS_SIP_MEDIA_DIR=".voice-testops/sip-media"
export VOICE_TESTOPS_SIP_CALL_TIMEOUT_MS="120000"
export VOICE_TESTOPS_SIP_DRIVER_RETRIES="2"
export VOICE_TESTOPS_BARESIP_CALL_SECONDS="35"
```

Keep these variables in an ignored local file such as `.voice-testops/sip-private/real-sip.env`; do not commit SIP usernames, passwords, call recordings, or private transcripts.

`--sip-driver-retries` is the number of extra driver invocations after a failed attempt. Keep it low for real SIP tests so transient trunk or registration misses get one or two redials without hiding a consistently broken bot.

## Driver Input

The driver receives one JSON object on stdin for each test turn:

```json
{
  "provider": "voice-agent-testops",
  "transport": "sip",
  "sip": {
    "uri": "sip:+8613800000000@10.0.0.8",
    "proxy": "sip:10.0.0.8:5060",
    "from": "sip:testops@10.0.0.9",
    "mediaDir": ".voice-testops/sip-media",
    "callTimeoutMs": 120000
  },
  "suiteName": "SIP regression",
  "scenarioId": "handoff",
  "scenarioTitle": "Customer asks for a human",
  "turnIndex": 0,
  "customerText": "Please transfer me to a human agent.",
  "source": "phone",
  "merchant": {},
  "messages": []
}
```

The driver should turn `customerText` into caller audio, send it into the SIP call, record the agent reply, transcribe it, and write JSON to stdout.

## Return contract

`spoken` is required. The rest is optional but recommended for voice-native reports:

```json
{
  "spoken": "I can transfer you to a human agent and note the reason for follow-up.",
  "summary": {
    "source": "phone",
    "intent": "handoff",
    "level": "high",
    "need": "Customer asked for a human agent",
    "questions": ["Please transfer me to a human agent."],
    "nextAction": "Human agent follow-up",
    "transcript": []
  },
  "audio": {
    "url": "file:///absolute/path/.voice-testops/sip-media/handoff-turn-1.wav",
    "label": "SIP replay",
    "mimeType": "audio/wav",
    "durationMs": 4200
  },
  "voiceMetrics": {
    "timeToFirstWordMs": 720,
    "turnLatencyMs": 4200,
    "asrLatencyMs": 380,
    "ttsLatencyMs": 540,
    "silenceMs": 900,
    "interruptionCount": 0,
    "asrConfidence": 0.93
  }
}
```

Voice Agent TestOps reuses the existing assertions after the driver returns:

- `must_contain_any`, `must_not_match`, and semantic assertions read `spoken`.
- Chinese phrase and forbidden-pattern checks normalize common Simplified/Traditional ASR drift, so `价格` can match `價格` and `转人工` can catch `轉人工`.
- `lead_*` assertions read `summary`.
- `audio_replay_present` reads `audio.url`.
- `voice_metric_max` and `voice_metric_min` read `voiceMetrics`.

## Practical Driver Shape

A production driver usually does this:

1. Start or reuse one SIP call for the scenario.
2. Synthesize `customerText` to a WAV/PCM prompt, or play a pre-generated fixture.
3. Detect when the bot starts and stops speaking.
4. Save the bot reply audio under `--sip-media-dir`.
5. Run ASR on the saved reply and return the transcript as `spoken`.
6. Return timing metrics and the replay URL so reviewers can listen to failures.

For deterministic CI, keep the driver narrow: no raw private recordings in committed artifacts, no phone numbers in public reports, and no credentials in suite JSON.

The bundled `examples/sip-driver/baresip-driver.mjs` is a reference implementation for this shape. It is useful for local proof-of-connectivity and first pilot calls, but production teams should usually swap in their own SIP gateway, TTS, ASR, and recording storage.
