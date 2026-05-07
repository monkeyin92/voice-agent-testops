# Commercial Pilot Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CLI command and renderer module that generate commercial pilot report and pilot review Markdown templates from an existing JSON report.

**Architecture:** Create a focused `commercialReport.ts` renderer module that depends only on `VoiceTestRunResult`. Wire it into `cli.ts` through a new `pilot-report` command. Keep docs and roadmap synchronized with tests.

**Tech Stack:** TypeScript, Vitest, existing Node CLI, existing Voice Agent TestOps JSON report shape.

---

### Task 1: Renderer Module

**Files:**
- Create: `src/testops/commercialReport.ts`
- Test: `tests/testops/commercialReport.test.ts`

- [x] **Step 1: Write failing renderer tests**

Add tests that call `renderCommercialPilotReport()` and `renderPilotReviewTemplate()` with a failed report. Expected output includes executive summary, launch recommendation, severity breakdown, top failed turn, audio replay evidence, and action items.

- [x] **Step 2: Run focused renderer tests**

Run: `npm test -- tests/testops/commercialReport.test.ts`

Expected: fail because `commercialReport.ts` does not exist yet.

- [x] **Step 3: Implement minimal renderers**

Create two exported functions:

```ts
export function renderCommercialPilotReport(result: VoiceTestRunResult, options?: CommercialPilotOptions): string
export function renderPilotReviewTemplate(result: VoiceTestRunResult, options?: CommercialPilotOptions): string
```

Use deterministic Markdown assembled from report summary, failure severities, failed turns, business risk, audio links, and voice metric presence.

- [x] **Step 4: Verify renderer tests pass**

Run: `npm test -- tests/testops/commercialReport.test.ts`

Expected: pass.

### Task 2: CLI Command

**Files:**
- Modify: `src/testops/cli.ts`
- Modify: `tests/testops/cli.test.ts`

- [x] **Step 1: Write failing CLI test**

Add a test for:

```bash
pilot-report --report report.json --commercial commercial-report.md --recap pilot-recap.md --customer "Acme" --period "Week 1"
```

Expected files contain the customer name, period, and report-derived failure content.

- [x] **Step 2: Run focused CLI test**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: fail because the command is unknown.

- [x] **Step 3: Wire command and argument parsing**

Add `pilot-report` dispatch in `main()`, parse required `--report`, optional `--commercial`, optional `--recap`, optional `--customer`, optional `--period`, and require at least one output path.

- [x] **Step 4: Verify focused CLI tests pass**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: pass.

### Task 3: Public Docs

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `tests/testops/integrationDocs.test.ts`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Write failing docs tests**

Update docs tests to require `pilot-report`, `commercial-report.md`, and `pilot-recap.md` in both READMEs.

- [x] **Step 2: Run docs test**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: fail until docs are updated.

- [x] **Step 3: Update docs and roadmap**

Add a short commercial pilot deliverables section to both READMEs and mark the roadmap item complete.

- [x] **Step 4: Verify docs test passes**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: pass.

### Task 4: Final Verification And PR

**Files:**
- All files changed above.

- [x] **Step 1: Run full tests**

Run: `npm test`

Expected: all test files pass.

- [x] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Next.js build pass.

- [x] **Step 3: Run whitespace check**

Run: `git diff --check`

Expected: no output.

- [x] **Step 4: Complete PR flow**

Commit, push branch `codex/commercial-pilot-templates`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
