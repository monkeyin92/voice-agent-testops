# First Real Pilot Recap Template Design

Date: 2026-05-07

## Goal

Create a reusable recap template for the first real external Voice Agent TestOps pilot, focused on evidence from one real endpoint rather than additional product features.

## Context

P3-1 added the external pilot runbook, P3-2 added data authorization, and P3-3 added the pilot tracker. P3-4 should define how to write the first real pilot recap after a real endpoint has run through the full workflow: starter suite, bridge connection, baseline or first-run gate, real failure import, regression draft, commercial report, and pilot recap.

## Approach

Add `docs/ops/first-real-pilot-recap.zh-CN.md` as an empty operational template. It should not fabricate a pilot result. It should tell the operator which facts to record, which commands to preserve, which artifacts to link, how to classify failures, and how to make Go / No-Go decisions.

Link it from:

- `README.md`;
- `README.zh-CN.md`;
- `docs/ops/external-pilot-readiness-review.zh-CN.md`;
- `docs/ops/external-pilot-runbook.zh-CN.md`;
- `docs/ops/external-pilot-tracker.zh-CN.md`.

## Non-Goals

- No fake pilot data.
- No new CLI command.
- No new report generator.
- No customer-specific artifact committed to the public repository.
- No attempt to run a real customer endpoint from this change.

## Test Strategy

Extend `tests/testops/integrationDocs.test.ts` so the recap template must exist, must be linked from all pilot entry points, and must retain the required command, evidence, failure review, customer feedback, next-action, and Go / No-Go sections.
