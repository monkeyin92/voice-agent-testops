# Tool And Backend Assertions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic assertions that verify tool calls and backend state returned by an agent test bridge.

**Architecture:** Extend the suite schema with `tool_called`, `backend_state_present`, and `backend_state_equals`. Extend `VoiceAgentTurnOutput` and runner evaluation to inspect optional `tools` and `state`, retaining those fields in JSON turn results for audit. Update JSON Schema and docs so bridge authors know how to return structured evidence.

**Tech Stack:** TypeScript, Zod, Vitest, existing CLI/schema/report pipeline, Markdown docs.

---

### Task 1: Schema Support

**Files:**
- Modify: `tests/testops/schema.test.ts`
- Modify: `src/testops/schema.ts`

- [x] **Step 1: Write failing schema tests**

Add tests that parse:

- `tool_called` with `name`, `minCount`, and nested `arguments`
- `backend_state_present` with a dot path
- `backend_state_equals` with a dot path and JSON primitive/object value

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/schema.test.ts`

Expected: FAIL because the assertion union does not include the new assertion types.

- [x] **Step 3: Implement schema**

Add recursive JSON value support and the three assertion variants to `voiceTestAssertionSchema`.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/schema.test.ts`

Expected: PASS.

### Task 2: Runner Evaluation

**Files:**
- Modify: `tests/testops/runner.test.ts`
- Modify: `src/testops/agents.ts`
- Modify: `src/testops/runner.ts`
- Modify: `src/testops/adapters/openClawAgent.ts`

- [x] **Step 1: Write failing runner tests**

Add tests that:

- pass when the output includes a matching tool call and backend state
- fail with `tool_arguments_mismatch`, `backend_state_missing`, and `backend_state_mismatch`
- retain `tools` and `state` in turn results when provided

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/runner.test.ts`

Expected: FAIL because the runner ignores `tools` and `state`.

- [x] **Step 3: Implement evaluation**

Extend `VoiceAgentTurnOutput`, add `tools` and `state` to `VoiceTestTurnResult`, and evaluate the three new assertions with deterministic deep equality/subset helpers.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/runner.test.ts`

Expected: PASS.

### Task 3: JSON Schema, Docs, and Roadmap

**Files:**
- Modify: `tests/testops/cli.test.ts`
- Modify: `tests/testops/integrationDocs.test.ts`
- Modify: `src/testops/jsonSchema.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/integrations/http.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Write failing documentation/schema tests**

Expect JSON Schema export and docs to contain `tool_called`, `backend_state_present`, `backend_state_equals`, `tools`, and `state`.

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts`

Expected: FAIL until JSON Schema and docs are updated.

- [x] **Step 3: Update JSON Schema and docs**

Add the new assertion variants to JSON Schema export, document the HTTP return contract, and check off the roadmap item.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts`

Expected: PASS.

### Task 4: Verification and Integration

**Files:**
- All modified files.

- [x] **Step 1: Run focused verification**

Run:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/runner.test.ts tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts
```

- [x] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
git diff --check
```

- [x] **Step 3: Commit, push, PR, merge, delete branch**

Run:

```bash
git add ...
git commit -m "feat: assert tool calls and backend state"
git push -u origin codex/tool-backend-assertions
gh pr create --title "feat: assert tool calls and backend state" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```
