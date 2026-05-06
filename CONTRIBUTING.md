# Contributing to Voice Agent TestOps

Thanks for considering a contribution. Voice Agent TestOps is deliberately small: a useful contribution should make it easier to catch risky voice-agent behavior before it reaches a real customer.

## Good First Contributions

- Add a realistic risky conversation suite for a business vertical.
- Improve an existing assertion or report message.
- Add an adapter example for a voice stack such as Vapi, Retell, LiveKit, Pipecat, Twilio, or OpenClaw.
- Turn a real failed transcript into a regression suite.
- Clarify docs where a new user would otherwise hesitate.

## Local Setup

```bash
npm install
npm test
npm run build
```

Run a demo suite:

```bash
npx voice-agent-testops run --suite examples/voice-testops/xhs-receptionist-suite.json
```

Generate a suite from a transcript:

```bash
npx voice-agent-testops from-transcript \
  --transcript examples/voice-testops/transcripts/failed-photo-booking.txt \
  --merchant examples/voice-testops/merchants/guangying-photo.json \
  --out generated-suite.json
```

## Adding A Scenario

A strong scenario is specific, risky, and easy to explain:

- Name the business context.
- Write the customer turns as naturally as possible.
- Assert the behavior that protects the business.
- Include at least one failure that would matter in production.

Prefer examples that catch concrete risk: unsafe pricing, false availability, missed contact details, wrong handoff intent, policy drift, or latency over budget.

## Adding An Adapter

Adapters should keep the core runner independent from any hosted voice platform. A good adapter:

- Accepts scripted conversation turns.
- Returns assistant text, optional structured lead data, and latency.
- Keeps platform credentials out of committed files.
- Includes a small documented example suite.

If a real phone call is expensive or flaky, add a test bridge that exercises the same prompt, tools, and lead-summary logic through HTTP.

## Pull Request Checklist

- The change is scoped to one concern.
- `npm test` passes.
- `npm run build` passes if runtime or app code changed.
- Docs or examples are updated when behavior changes.
- New public examples do not include secrets, private customer data, or internal workflow notes.

