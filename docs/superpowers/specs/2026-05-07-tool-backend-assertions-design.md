# Tool And Backend Assertions Design

## Context

The roadmap's next P2 item is `tool-call / backend-state` assertions. The current runner checks spoken text, latency, lead summary fields, lead intent, and semantic rubric results. That catches visible conversation failures, but it cannot yet verify whether an agent called the right tool or wrote the right backend state after saying the right words.

## Chosen Approach

Extend the existing test-turn contract with optional structured output:

```json
{
  "spoken": "I will ask a teammate to call you back.",
  "summary": { "intent": "handoff", "transcript": [] },
  "tools": [
    { "name": "create_lead", "arguments": { "phone": "13800000000", "intent": "handoff" } }
  ],
  "state": {
    "lead": { "phone": "13800000000", "status": "handoff_requested" }
  }
}
```

Then add three deterministic assertion types:

- `tool_called`: verifies that at least one returned tool call has the expected `name`, optional `minCount`, and optional deep argument subset.
- `backend_state_present`: verifies that a dot path exists in `state`.
- `backend_state_equals`: verifies that a dot path in `state` equals an expected JSON value.

This keeps the feature local, testable, and compatible with existing HTTP, Vapi/Retell bridge, and custom agent stacks. Hosted trace ingestion and live backend adapters can come later.

## Data Flow

1. Suite authors add the new assertion types to any turn's `expect` array.
2. The agent bridge returns optional `tools` and `state` fields with each turn response.
3. The runner evaluates assertions against the full turn output.
4. JSON reports retain `tools` and `state` on turn results for auditability; HTML/Markdown can continue focusing on failures.
5. JSON Schema export documents the new assertion shapes for editor completion.

## Failure Codes

- `tool_call_missing`: no matching tool call by name or count.
- `tool_arguments_mismatch`: the tool was called but no call matched the expected argument subset.
- `backend_state_missing`: the requested state path was absent.
- `backend_state_mismatch`: the state path existed but the value differed.

## Scope Boundaries

This slice does not execute tools, connect to a real CRM, poll databases, or create platform-specific trace collectors. It only validates structured evidence returned by the test bridge. That is enough for CI gates and keeps customer-specific backend details private.

## Testing

Tests should cover schema parsing, runner success and failure behavior, JSON Schema export, and documentation. TDD matters here because a passing spoken answer with missing backend state is exactly the kind of failure this feature must catch.
