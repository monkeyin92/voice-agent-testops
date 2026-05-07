# Pilot Readiness Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested external pilot readiness review document that guides the next development and customer validation steps.

**Architecture:** Keep this as documentation with a small test guard in `tests/testops/integrationDocs.test.ts`. The review links from README, README.zh-CN, and the commercial moat roadmap.

**Tech Stack:** Markdown, Vitest documentation tests.

---

### Task 1: Documentation Test

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`

- [x] **Step 1: Write the failing documentation test**

Add a test that reads `README.md`, `README.zh-CN.md`, `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`, and `docs/ops/external-pilot-readiness-review.zh-CN.md`. Assert that the READMEs and roadmap link to the review, and that the review includes required sections.

- [x] **Step 2: Run the docs test**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: fail because the review document and links do not exist yet.

### Task 2: Readiness Review Document

**Files:**
- Create: `docs/ops/external-pilot-readiness-review.zh-CN.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Create the review document**

Write the readiness verdict, P0/P1/P2 capability map, 30-minute pilot path, Go/No-Go criteria, gaps, next priority queue, and evidence commands.

- [x] **Step 2: Link the review**

Add links in both READMEs and in the commercial moat roadmap near the P2 checklist.

- [x] **Step 3: Run the docs test again**

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

Commit, push branch `codex/pilot-readiness-review`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
