# Production Call Sampling Design

## Context

The roadmap's next P2 item is "production call import and sampling monitor". The product already has `from-transcript` for a single failed call and `draft-regressions` for failed test reports. This slice connects real call exports to that workflow: import production calls, prioritize risky calls, and write review artifacts that can later become transcript regressions.

## Chosen Approach

Use a local CLI command, `import-calls`, that reads JSON, JSONL, or common webhook/export shapes from hosted voice platforms. It normalizes each call into a small internal record with an ID, optional provider metadata, transcript messages, and risk tags. The sampler then selects a deterministic risk-prioritized subset using `--sample-size` and `--seed`.

This is intentionally not a dashboard, scheduler, or live platform connector. Those belong in the commercial product later. The open-source feature should make pilot data useful within minutes while preserving the product moat: customer-specific transcripts, sampling history, adjudication, and trend dashboards remain private operational assets.

## Data Flow

1. `import-calls --input calls.jsonl` reads JSON array or JSONL records.
2. The parser normalizes:
   - IDs from `id`, `callId`, `call_id`, `conversationId`, or nested `call.id`.
   - Transcript arrays from `transcript`, `messages`, or `conversation`.
   - Transcript strings with existing `Customer:` / `Assistant:` labels.
   - Roles from common labels like `user`, `caller`, `agent`, `assistant`, and `bot`.
3. Risk inference adds tags such as `unsupported_promise`, `handoff_request`, `lead_info_shared`, `pricing_question`, `availability_question`, `booking_intent`, `long_call`, or `low_signal`.
4. The sampler sorts by risk score, deterministic hash of `seed + callId`, and call ID.
5. The CLI writes:
   - A JSON sampling manifest for automation.
   - An optional Markdown review summary.
   - Optional labeled transcript files that can be fed into `from-transcript`.

## CLI Shape

```bash
npx voice-agent-testops import-calls \
  --input exports/production-calls.jsonl \
  --out .voice-testops/call-sample.json \
  --summary .voice-testops/call-sampling.md \
  --transcripts .voice-testops/call-transcripts \
  --sample-size 20 \
  --seed weekly-2026-05-07
```

`--risk-only` filters out calls that only have `low_signal`. Without it, the command still prioritizes risky calls but can fill the sample with lower-risk calls when needed.

## Outputs

The JSON manifest includes total imported calls, rejected records, sample configuration, risk tag counts, and selected call metadata. It intentionally avoids requiring a hosted database.

The Markdown summary is a human review artifact. It lists the selected calls, their tags, transcript turn counts, and transcript file paths when generated.

The transcript files are labeled text files. They keep the next step simple:

```bash
npx voice-agent-testops from-transcript \
  --input .voice-testops/call-transcripts/call_123.txt \
  --out voice-testops/generated-suite.json \
  --merchant-name "Pilot Merchant"
```

## Error Handling

Malformed records are not fatal if at least one call can be imported. They are counted in the manifest and listed with reasons. The command fails when the input is not JSON/JSONL, no records can be imported, `--sample-size` is not positive, or required output paths are missing.

## Testing

Tests should cover JSONL parsing, provider-like shapes, risk inference, deterministic sampling, Markdown rendering, transcript rendering, CLI output files, and documentation references. The implementation must stay deterministic so weekly samples can be reproduced during customer reviews.
