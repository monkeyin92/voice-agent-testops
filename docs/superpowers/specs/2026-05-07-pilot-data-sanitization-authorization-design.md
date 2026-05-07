# Pilot Data Sanitization And Authorization Template Design

Date: 2026-05-07

## Goal

Create a pilot-prep template that prevents customer data from entering a Voice Agent TestOps pilot without clear sanitization, authorization, retention, and public-repository boundaries.

## Context

The external pilot runbook now gives developers a 30-minute path from local demo to HTTP bridge report. The next blocker is data handling: external teams may want to provide real transcripts, call logs, audio replay links, CRM state, or customer facts. The project needs a practical template that tells them what is safe to share, what must be removed, and what authorization must be confirmed before running the test.

## Source Principles

The template should be practical, not legal advice. It should still align with common privacy principles from official sources:

- purpose limitation and data minimization;
- separate handling for sensitive personal information;
- explicit authorization for processing, sharing, retention, deletion, and public use;
- de-identification for test data, with a warning that pseudonymized data may still be personal data;
- no customer raw data in the public repository by default.

## Scope

Add `docs/ops/pilot-data-sanitization-authorization.zh-CN.md` and link it from:

- `README.md`;
- `README.zh-CN.md`;
- `docs/ops/external-pilot-readiness-review.zh-CN.md`;
- `docs/ops/external-pilot-runbook.zh-CN.md`.

The template should cover:

- usage disclaimer;
- data classification;
- fields that are acceptable for a pilot;
- fields that must not be provided;
- sanitization replacement rules;
- before/after transcript example;
- authorization confirmation template;
- report artifact retention and deletion;
- public repository boundary.

## Non-Goals

- No runtime privacy scanner.
- No new CLI command.
- No legal contract generation.
- No jurisdiction-specific compliance guarantee.
- No customer data collection or upload workflow.

## Test Strategy

Extend `tests/testops/integrationDocs.test.ts` so the template must exist, must be linked from the main docs, and must keep the required privacy, authorization, retention, source, and open-source-boundary sections.
