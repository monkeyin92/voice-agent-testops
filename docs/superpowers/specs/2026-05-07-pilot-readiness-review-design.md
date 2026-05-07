# Pilot Readiness Review Design

Date: 2026-05-07

## Goal

Create a stable review document that answers whether the current P0/P1/P2 work is enough to support the first external pilot, what gaps remain, and what the next development priority should be before moving into larger commercial product work.

## Scope

The review should live at `docs/ops/external-pilot-readiness-review.zh-CN.md` and be linked from both READMEs and the commercial moat roadmap.

The document should cover:

- current readiness verdict;
- capability map from P0/P1/P2 to an external pilot workflow;
- a 30-minute external pilot path;
- Go/No-Go criteria for starting a real pilot;
- blocking and non-blocking gaps;
- next priority queue before Phase E;
- evidence commands and generated artifacts.

## Non-Goals

- No new CLI command.
- No hosted dashboard.
- No account or billing plan.
- No new industry starter.

## Design Decision

Use documentation plus doc tests. This review is a planning and operating artifact, not runtime behavior. The useful outcome is a clear go/no-go standard that future work can be judged against.

## Testing

Add a documentation test that checks:

- `docs/ops/external-pilot-readiness-review.zh-CN.md` exists;
- both READMEs link to it;
- the document mentions external pilot path, Go/No-Go, blocking gaps, non-blocking gaps, next priority queue, and generated artifacts.
