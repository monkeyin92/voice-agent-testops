# External Pilot Runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested external pilot runbook that gives developers a copy-paste path from local demo to first HTTP-agent pilot report.

**Architecture:** This is a documentation-only slice guarded by integration documentation tests. The runbook links from READMEs and from the readiness review so future pilot work has a stable entry point.

**Tech Stack:** Markdown, Vitest documentation tests.

---

### Task 1: Documentation Test

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`

- [x] **Step 1: Write failing documentation test**

Add a test for `docs/ops/external-pilot-runbook.zh-CN.md`. Assert that README.md, README.zh-CN.md, and the readiness review link to it. Assert that the runbook includes required sections and command phrases.

- [x] **Step 2: Run docs test**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: fail because the runbook and links do not exist.

### Task 2: Runbook Document

**Files:**
- Create: `docs/ops/external-pilot-runbook.zh-CN.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/ops/external-pilot-readiness-review.zh-CN.md`

- [x] **Step 1: Create runbook**

Include target audience, prerequisites, 10-minute demo, 30-minute HTTP bridge, endpoint contract, artifact commands, troubleshooting, and feedback checklist.

- [x] **Step 2: Link runbook**

Add links from both READMEs and the readiness review.

- [x] **Step 3: Verify docs test passes**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: pass.

### Task 3: Final Verification And PR

**Files:**
- All changed files.

- [x] **Step 1: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run build**

Run: `npm run build`

Expected: production build passes.

- [x] **Step 3: Run whitespace check**

Run: `git diff --check`

Expected: no output.

- [x] **Step 4: Complete PR flow**

Commit, push branch `codex/external-pilot-runbook`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
