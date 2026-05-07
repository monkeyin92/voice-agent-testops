# Commercial Pilot Templates Design

Date: 2026-05-07

## Goal

Turn a Voice Agent TestOps JSON report into two pilot-ready Markdown deliverables:

- a commercial pilot report for buyers, founders, and project owners;
- a pilot review template for the next customer/team meeting.

This closes the current P2 roadmap item without building a web dashboard.

## Scope

Add a `pilot-report` CLI command:

```bash
npx voice-agent-testops pilot-report \
  --report .voice-testops/report.json \
  --commercial .voice-testops/commercial-report.md \
  --recap .voice-testops/pilot-recap.md \
  --customer "Anju Realty" \
  --period "Pilot week 1"
```

Inputs:

- `--report`: required path to an existing Voice Agent TestOps JSON report.
- `--commercial`: optional output path for the commercial report Markdown.
- `--recap`: optional output path for the pilot review Markdown.
- `--customer`: optional customer/account name.
- `--period`: optional review period label.

At least one of `--commercial` or `--recap` is required.

## Commercial Report Content

The commercial report should include:

- executive summary;
- launch recommendation;
- scenario, turn, assertion, and failure counts;
- severity breakdown;
- top failed turns with business risk and repair advice;
- voice evidence counts when audio replay or voice metrics exist;
- next steps for the pilot.

The tone should be buyer-facing: explain risk in business language, avoid raw test jargon as the primary story, but keep assertion codes visible for engineers.

## Pilot Review Content

The pilot review template should include:

- meeting snapshot;
- agenda;
- decisions to make;
- action items grouped around critical/major findings;
- regression assets to add next;
- open questions for customer success and engineering.

It should be useful even when the run passed, because passed runs still need coverage expansion and real-call sampling.

## Non-Goals

- No account system.
- No dashboard.
- No PDF rendering changes.
- No LLM-generated narrative.
- No customer data upload.

## Testing

Coverage should include:

- pure renderer tests for failed and passed reports;
- CLI test that writes both Markdown files from a JSON report;
- docs tests that mention `pilot-report`, `commercial-report.md`, and `pilot-recap.md`.
