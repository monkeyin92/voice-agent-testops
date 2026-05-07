# External Pilot Runbook Design

Date: 2026-05-07

## Goal

Create a single external pilot runbook that a voice-agent developer can follow without reading the full roadmap. The runbook should turn the current P0/P1/P2/P3 readiness work into an executable 30-minute path.

## Scope

Add `docs/ops/external-pilot-runbook.zh-CN.md` and link it from:

- `README.md`;
- `README.zh-CN.md`;
- `docs/ops/external-pilot-readiness-review.zh-CN.md`.

The runbook should cover:

- who should use it;
- prerequisites;
- 10-minute local demo;
- 30-minute HTTP bridge pilot;
- endpoint request/response contract;
- commands to generate all artifacts;
- troubleshooting;
- feedback collection checklist.

## Non-Goals

- No runtime changes.
- No new CLI command.
- No hosted service.
- No customer-data upload.

## Test Strategy

Extend `tests/testops/integrationDocs.test.ts` so the document must exist, the links stay present, and required phrases remain in the runbook.
