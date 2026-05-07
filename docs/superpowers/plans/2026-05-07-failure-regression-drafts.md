# Failure Regression Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate failure clusters and a regression suite draft from a failed report plus its source suite, so pilot failures can become reviewable release gates.

**Architecture:** Add a deterministic module that reads `VoiceTestRunResult` and a resolved `VoiceTestSuite`, groups failed turns by severity/code/message fingerprint, and builds a valid draft suite containing only scenarios needed to reproduce failed turns. Expose it through a `draft-regressions` CLI command that writes JSON and Markdown artifacts.

**Tech Stack:** TypeScript, Vitest, existing suite loader/report types, Markdown docs.

---

### Task 1: Failure Clustering and Suite Draft Module

**Files:**
- Create: `tests/testops/regressionDraft.test.ts`
- Create: `src/testops/regressionDraft.ts`

- [x] **Step 1: Write failing tests**

Add tests that:

- build two failure clusters from a fake report
- render a Markdown cluster summary with failure counts and scenario names
- build a valid regression draft suite from a source suite, keeping only failed scenarios and turns up to the failed turn

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/regressionDraft.test.ts`

Expected: FAIL because `@/testops/regressionDraft` does not exist.

- [x] **Step 3: Implement module**

Create:

- `buildFailureClusters(report)`
- `renderFailureClusterMarkdown(report, clusters)`
- `buildRegressionSuiteDraft(sourceSuite, report)`

The draft suite must call `parseVoiceTestSuite` before returning.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/regressionDraft.test.ts`

Expected: PASS.

### Task 2: CLI Command

**Files:**
- Modify: `tests/testops/cli.test.ts`
- Modify: `src/testops/cli.ts`

- [x] **Step 1: Write failing CLI test**

Add a test for:

```bash
npx voice-agent-testops draft-regressions \
  --report .voice-testops/report.json \
  --suite voice-testops/suite.json \
  --out voice-testops/regression-draft.json \
  --clusters .voice-testops/failure-clusters.md
```

Expected outputs:

- exit 0
- output suite is valid
- Markdown contains cluster headings and failed scenario names
- stdout prints both output paths

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: FAIL because command is unknown.

- [x] **Step 3: Implement command**

Add `draft-regressions` to `main()`, parse required `--report`, `--suite`, `--out`, optional `--clusters`, load files, write artifacts, and print counts.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: PASS.

### Task 3: Docs and Roadmap

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/guides/mock-data.md`
- Modify: `docs/guides/mock-data.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Add doc assertions**

Expect docs to contain `draft-regressions`, `failure-clusters.md`, and `regression-draft.json`.

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: FAIL until docs are updated.

- [x] **Step 3: Update docs and roadmap**

Add a short “failed report to regression draft” workflow and check off P2 item.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: PASS.

### Task 4: Verification and Integration

**Files:**
- All modified files.

- [x] **Step 1: Run focused verification**

Run:

```bash
npm test -- tests/testops/regressionDraft.test.ts tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts
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
git commit -m "feat: draft regressions from failed reports"
git push -u origin codex/failure-regression-drafts
gh pr create --title "feat: draft regressions from failed reports" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```
