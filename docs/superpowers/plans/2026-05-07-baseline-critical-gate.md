# Baseline Critical Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make baseline diff support release blocking only on newly introduced `critical` failures while still reporting lower-severity new failures.

**Architecture:** Preserve `--fail-on-new` as the general new-failure gate. When it is combined with `--fail-on-severity <level>`, gate only new failures at or above that severity. Extend report diff summaries with new critical counts and update generated CI workflows to use `--fail-on-new --fail-on-severity critical` once a baseline exists.

**Tech Stack:** TypeScript, Vitest, existing CLI and Markdown diff renderer.

---

### Task 1: Diff Severity Summary

**Files:**
- Modify: `tests/testops/diffReport.test.ts`
- Modify: `src/testops/diffReport.ts`

- [ ] **Step 1: Write failing test**

Add a test that compares a baseline with current failures containing one new `critical` and one new `minor`, then expects:

- `diff.summary.newFailures` is `2`
- `diff.summary.newCriticalFailures` is `1`
- markdown contains `New critical failures: 1`

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/testops/diffReport.test.ts`

Expected: FAIL because `newCriticalFailures` is not implemented.

- [ ] **Step 3: Implement summary count**

Update `VoiceTestRunDiff.summary` and `diffVoiceTestReports` to include `newCriticalFailures`. Update `renderMarkdownDiff` summary line.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/diffReport.test.ts`

Expected: PASS.

### Task 2: CLI New Failure Severity Gate

**Files:**
- Modify: `tests/testops/cli.test.ts`
- Modify: `src/testops/cli.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:

- `run --baseline --fail-on-new --fail-on-severity critical` passes when only new minor failures appear.
- `compare --baseline --current --fail-on-new --fail-on-severity critical` fails when a new critical failure appears.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: FAIL because `run` gates all new failures and `compare` does not parse `--fail-on-severity`.

- [ ] **Step 3: Implement gate helper**

Add a helper that counts `diff.newFailures` at or above a severity threshold. Use it for both `run` and `compare` when `--fail-on-new` is present.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: PASS.

### Task 3: Workflow and Docs

**Files:**
- Modify: `src/testops/initProject.ts`
- Modify: `tests/testops/cli.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [ ] **Step 1: Update generated workflow test and implementation**

Change baseline workflow gate from `--fail-on-new` to `--fail-on-new --fail-on-severity critical`.

- [ ] **Step 2: Update docs**

Clarify that baseline CI blocks newly introduced critical failures, while lower-severity new failures remain visible in the diff report.

- [ ] **Step 3: Mark roadmap item done**

Check off `完善 baseline diff，用新增 critical 风险作为发布阻断条件。`

### Task 4: Verification and Integration

**Files:**
- All modified files.

- [ ] **Step 1: Run verification**

Run:

```bash
npm test -- tests/testops/diffReport.test.ts tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts
npm test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Commit, push, PR, merge, delete branch**

Run:

```bash
git add ...
git commit -m "feat: gate baseline diffs on new critical failures"
git push -u origin codex/baseline-critical-gate
gh pr create --title "feat: gate baseline diffs on new critical failures" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```
