# Voice Agent TestOps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a developer-usable MVP for automated voice agent scenario testing with CLI execution and JSON/HTML reports.

**Architecture:** Keep the first version local and adapter-based. A suite JSON is validated by Zod, executed against a standard agent interface, evaluated by deterministic assertions, and rendered as machine-readable and human-readable reports.

**Tech Stack:** Next.js repo, TypeScript, Zod, Vitest, tsx.

---

## File Structure

- `src/testops/schema.ts`: suite DSL and parser.
- `src/testops/agents.ts`: standard agent execution contract.
- `src/testops/adapters/localReceptionist.ts`: adapter for the existing demo receptionist.
- `src/testops/adapters/httpAgent.ts`: adapter for external HTTP agents.
- `src/testops/runner.ts`: scenario execution and assertions.
- `src/testops/report.ts`: JSON and HTML report rendering.
- `src/testops/cliArgs.ts`: CLI argument parser.
- `src/testops/cli.ts`: CLI entrypoint.
- `examples/voice-testops/xhs-receptionist-suite.json`: runnable sample suite.
- `tests/testops/*.test.ts`: regression tests for schema, runner, report, and CLI args.

## Tasks

### Task 1: Scenario DSL

- [x] Write failing tests for suite parsing and invalid empty scenarios.
- [x] Implement `VoiceTestSuite`, `VoiceTestScenario`, `VoiceTestTurn`, and assertion schemas.
- [x] Verify default assertion severity is `major`.

### Task 2: Runner And Assertions

- [x] Write failing tests for a passing scenario and a failing unsafe/slow scenario.
- [x] Implement `VoiceAgentExecutor`.
- [x] Implement deterministic runner timing through injectable clock.
- [x] Implement assertion failure codes:
  - `expected_phrase_missing`
  - `forbidden_pattern_matched`
  - `latency_exceeded`
  - `lead_field_missing`
  - `lead_intent_mismatch`

### Task 3: Reports

- [x] Write failing test for escaped HTML output and summary counts.
- [x] Implement JSON report rendering.
- [x] Implement HTML report rendering with escaped dynamic text.

### Task 4: CLI

- [x] Write failing tests for CLI defaults and HTTP endpoint validation.
- [x] Implement CLI arg parser.
- [x] Implement `src/testops/cli.ts`.
- [x] Add `npm run voice-test`.
- [x] Add `tsx` dev dependency.

### Task 5: Demo Suite

- [x] Add sample suite using the existing local receptionist demo agent.
- [x] Run the suite and generate JSON/HTML reports.
- [x] Ignore generated `.voice-testops/` reports in git.

### Task 6: Documentation

- [x] Write market analysis and competitive argument.
- [x] Write product design spec.
- [x] Keep the old small-merchant MVP as demo input, not the strategic product.

## Verification

- [x] Run full unit test suite: `npm test`.
- [x] Run product demo: `npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json`.
- [x] Run production build: `npm run build`.
- [x] Run high-severity dependency audit: `npm audit --audit-level=high`.
- [x] Audit changed files with `git diff --stat` and `git status --short`.
