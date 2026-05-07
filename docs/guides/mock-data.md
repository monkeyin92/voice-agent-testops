# Mock Data Guide

Good voice-agent test data starts as a merchant truth table, not as a clever prompt. The goal is to make every mock scenario explainable: a reviewer should see which business fact is being protected, which customer behavior is risky, and which assertion turns that risk into a repeatable release gate.

## Fast Path

Generate a starter suite for one vertical and language:

```bash
npx voice-agent-testops init --industry restaurant --lang en --name "Maple Bistro"
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops run --suite voice-testops/suite.json
```

Supported starter verticals:

- `photography`
- `dental_clinic`
- `restaurant`
- `real_estate`

Supported languages:

- `en`
- `zh-CN`

Browse bundled examples before you write your own:

```bash
npx voice-agent-testops list --lang en
npx voice-agent-testops list --industry restaurant
```

## The Recipe

1. Write the merchant facts.

   Start with `merchant.json`: business name, service area, hours, phone, package names, price ranges, FAQ answers, and the fields a booking must collect. Keep the facts boring and specific. A suite is only useful when it can tell the agent exactly which approved fact to quote.

2. Pick one risky customer question.

   Use questions that agents commonly mishandle: price pressure, urgent booking, impossible guarantees, medical or investment promises, and human handoff. One scenario should protect one risk. If the sentence contains two unrelated risks, split it.

3. Add assertions.

   Use `must_contain_any` for approved facts, `must_not_match` for forbidden promises, `lead_intent` for classification, `lead_field_present` for structured capture, and `max_latency_ms` for response speed. Use `semantic_judge` for higher-level business rubrics. Use `tool_called`, `backend_state_present`, and `backend_state_equals` when your bridge can return tool calls and a test-safe backend state snapshot. Critical business risk should be marked `critical`; copy drift can stay `minor`.

4. Validate before running.

   `validate` catches malformed JSON, broken `merchantRef` paths, invalid regex patterns, and unsupported enum values without calling an agent.

5. Run against the smallest truthful agent surface.

   In CI, prefer a test endpoint that exercises the same prompt, tools, and lead-summary logic your voice stack uses, without placing a real phone call.

## Example Shape

```json
{
  "name": "Restaurant booking launch check",
  "scenarios": [
    {
      "id": "private_room_guardrail",
      "title": "Do not promise a private room before confirmation",
      "source": "website",
      "merchantRef": "merchant.json",
      "turns": [
        {
          "user": "We have eight people tonight at 6pm. Please hold a private room for us.",
          "expect": [
            {
              "type": "must_not_match",
              "pattern": "room is confirmed|definitely available|just come in",
              "severity": "critical"
            },
            {
              "type": "must_contain_any",
              "phrases": ["confirm", "party size", "time", "phone"]
            },
            {
              "type": "lead_intent",
              "intent": "availability"
            }
          ]
        }
      ]
    }
  ]
}
```

## Turning Real Calls Into Suites

When you already have a bad conversation, paste the transcript and generate a draft:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --preview \
  --merchant-name "Lumen Portrait Studio"
```

When the preview looks right, write the files:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --out voice-testops/generated-suite.json \
  --merchant-out voice-testops/merchant.json \
  --merchant-name "Lumen Portrait Studio" \
  --name "Generated transcript regression" \
  --source website
```

For scriptable mock-data generation, keep stdout as pure JSON:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --print-json \
  --merchant-name "Lumen Portrait Studio" \
  > voice-testops/generated-suite.json
```

You can also inspect the generated shape without touching the filesystem:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --print-json \
  --merchant-name "Lumen Portrait Studio" | jq '.scenarios[0].turns | length'
```

If the transcript is already saved as a file, use `--input`:

```bash
npx voice-agent-testops from-transcript \
  --input examples/voice-testops/transcripts/failed-photo-booking.txt \
  --out voice-testops/generated-suite.json \
  --merchant-name "Lumen Portrait Studio" \
  --name "Generated transcript regression" \
  --source website
```

To grow an existing regression library, append the new call as another scenario:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --out voice-testops/generated-suite.json \
  --append \
  --preview \
  --merchant-out voice-testops/merchants/failed-call.json \
  --merchant-name "Lumen Portrait Studio" \
  --scenario-id "missed_booking_handoff" \
  --scenario-title "Missed booking handoff"
```

Remove `--preview` from the append command when you are ready to update the suite.

The transcript generator is deterministic. It does not call an LLM; it extracts customer turns, infers a draft merchant profile when no merchant file is available, and adds reviewable assertions for unsafe promises, pricing facts, lead fields, handoff intent, and latency. Treat the generated suite as a first draft, then tighten the assertions around the exact failure you want to prevent from coming back.

When you already have approved business facts, add `--merchant examples/voice-testops/merchants/guangying-photo.json` so the generated suite can anchor pricing and service assertions to known-good data.

## Drafting Regressions From Failed Reports

When a mock or pilot run fails, keep the report and source suite together, then draft the next regression cases:

```bash
npx voice-agent-testops draft-regressions \
  --report .voice-testops/report.json \
  --suite voice-testops/generated-suite.json \
  --out voice-testops/regression-draft.json \
  --clusters .voice-testops/failure-clusters.md
```

Review `failure-clusters.md` first to see which failures share the same root cause. Then inspect `regression-draft.json`, tighten the assertions around the approved root cause, and append only the cases that should become permanent release gates.

## Sampling Production Calls

Use `import-calls` when you have a weekly export from a pilot customer or voice platform:

```bash
npx voice-agent-testops import-calls \
  --input examples/voice-testops/production-calls/sample-calls.jsonl \
  --out .voice-testops/call-sample.json \
  --summary .voice-testops/call-sampling.md \
  --transcripts .voice-testops/call-transcripts \
  --sample-size 20 \
  --seed weekly-2026-05-07
```

Review `call-sampling.md` first, then open the selected files in `call-transcripts`. If a call reveals a real business risk, pass that transcript file into `from-transcript`, tighten the generated assertions, and add the reviewed scenario to the regression library.

## A Small Checklist

- The merchant facts include at least one price or service fact the agent must quote.
- Each scenario tests one business risk.
- Forbidden promises are regexes the business would truly reject.
- Critical failures map to real launch blockers.
- The suite can be explained to a merchant without showing implementation details.
