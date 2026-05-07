# External Pilot Tracker Design

Date: 2026-05-07

## Goal

Upgrade the external validation checklist into an executable pilot tracking table so every external Voice Agent TestOps trial records the same operational evidence and follow-up decision.

## Context

The current validation checklist identifies who to contact and what success means, but its trial record table is too coarse for repeated pilots. P3-1 added a runbook and P3-2 added data authorization. P3-3 should close the operational loop by recording whether a real team could connect, how long it took, what failed first, which artifacts were generated, whether a regression draft was created, and whether the team wants to continue.

## Approach

Create `docs/ops/external-pilot-tracker.zh-CN.md` as the canonical tracking table. Keep the existing growth validation checklist as the outreach and success-metric document, then link it to the tracker for actual pilot runs.

The tracker should include:

- a copy-paste trial table;
- field dictionary;
- connection method values;
- first-failure type enum;
- status enum;
- weekly review prompts;
- Go / No-Go decision rules;
- links back to the runbook and data authorization template.

## Non-Goals

- No database.
- No CLI command.
- No dashboard.
- No customer CRM integration.
- No fabricated pilot results.

## Test Strategy

Extend `tests/testops/integrationDocs.test.ts` so the tracker must exist, must be linked from the README files, runbook, readiness review, and validation checklist, and must retain the core operational fields and enums.
