# Audio Replay And Voice Metrics Design

Date: 2026-05-07

## Goal

Add the first voice-native testing layer without building telephony infrastructure. A test bridge can return an audio replay reference and per-turn voice metrics, then Voice Agent TestOps can assert and report them alongside text, summary, tool calls, and backend state.

## Scope

This feature covers evidence that already exists in a customer voice platform:

- `audio`: optional replay metadata for the customer-agent turn.
- `voiceMetrics`: optional numeric measurements such as time to first word, ASR latency, TTS latency, silence, interruption count, and ASR confidence.
- New assertions for checking that replay evidence exists and that numeric voice metrics are within expected limits.
- HTML and JSON reports that preserve the replay link and show voice metric evidence per turn.

This feature does not make outbound calls, record audio, upload audio files, or simulate SIP/WebRTC sessions. Integrations remain responsible for collecting audio and measurements from Vapi, Retell, LiveKit, Pipecat, Twilio, or an internal voice stack.

## Agent Output Contract

The optional turn output fields are:

```ts
{
  spoken: string;
  summary?: LeadSummary;
  tools?: VoiceAgentToolCall[];
  state?: Record<string, unknown>;
  audio?: {
    url: string;
    label?: string;
    mimeType?: string;
    durationMs?: number;
  };
  voiceMetrics?: {
    timeToFirstWordMs?: number;
    turnLatencyMs?: number;
    asrLatencyMs?: number;
    ttsLatencyMs?: number;
    silenceMs?: number;
    interruptionCount?: number;
    asrConfidence?: number;
  };
}
```

`url` can be an HTTPS URL, a signed URL, or a local/relative path that the report viewer can access. The tool stores the string and renders it safely; it does not fetch, validate, or copy the audio.

## Assertion Contract

Add three assertion types:

- `audio_replay_present`: fails when `audio.url` is missing or blank.
- `voice_metric_max`: fails when a named metric is missing or greater than `value`.
- `voice_metric_min`: fails when a named metric is missing or lower than `value`.

Supported metric names are:

- `timeToFirstWordMs`
- `turnLatencyMs`
- `asrLatencyMs`
- `ttsLatencyMs`
- `silenceMs`
- `interruptionCount`
- `asrConfidence`

These metrics intentionally stay generic and platform-neutral. A Vapi bridge can map Vapi timings into this shape; a LiveKit/Pipecat bridge can map pipeline telemetry into the same names.

## Reporting

JSON reports preserve `audio` and `voiceMetrics` on each turn. HTML reports render:

- An audio player when `audio.url` is present.
- A compact metrics row when `voiceMetrics` contains numeric values.

Markdown summaries mention replay/metrics for failed turns so CI users can quickly jump to the evidence.

## Failure Codes

- `audio_replay_missing`
- `voice_metric_missing`
- `voice_metric_exceeded`
- `voice_metric_below_minimum`

These codes are separate from the existing `latency_exceeded` code because measured turn latency from the test runner and platform-reported voice telemetry are different evidence sources.

## Testing

Coverage should include:

- Suite schema accepts the three new assertion types.
- Runner passes and fails voice metric assertions deterministically.
- Runner carries `audio` and `voiceMetrics` into result JSON.
- HTML report renders an escaped audio player and metric values.
- OpenClaw Responses JSON parser preserves `audio` and `voiceMetrics`.
- JSON Schema export includes the new assertion variants.
- HTTP integration docs describe the new return fields.
