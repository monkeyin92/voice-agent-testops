# First Real Pilot Recap Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested first real pilot recap template for documenting one complete external endpoint trial.

**Architecture:** This is a documentation-only change guarded by integration documentation tests. The new recap template links into the runbook, tracker, readiness review, and README docs so operators have a final step after a real pilot run.

**Tech Stack:** Markdown, Vitest documentation tests.

---

### Task 1: Documentation Test

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`

- [x] **Step 1: Write the failing documentation test**

Add a test for `docs/ops/first-real-pilot-recap.zh-CN.md`. Assert that README.md, README.zh-CN.md, the external pilot readiness review, the external pilot runbook, and the external pilot tracker link to it. Assert that the template includes required sections and commands for validate, doctor, run, import-calls, draft-regressions, and pilot-report.

- [x] **Step 2: Run docs test and verify red**

Run:

```bash
npm test -- tests/testops/integrationDocs.test.ts
```

Expected: fail because `docs/ops/first-real-pilot-recap.zh-CN.md` does not exist.

### Task 2: Recap Template And Links

**Files:**
- Create: `docs/ops/first-real-pilot-recap.zh-CN.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/ops/external-pilot-readiness-review.zh-CN.md`
- Modify: `docs/ops/external-pilot-runbook.zh-CN.md`
- Modify: `docs/ops/external-pilot-tracker.zh-CN.md`

- [x] **Step 1: Create the recap template**

Create a Chinese template with these sections:

- 使用方式;
- 试点事实;
- 执行命令记录;
- 证据清单;
- 失败复盘;
- 客户反馈;
- 后续动作;
- Go / No-Go.

The template must explicitly cover starter suite, bridge 接入, baseline, 真实失败导入, regression draft, commercial report, and pilot recap.

- [x] **Step 2: Link the recap template**

Add links from both READMEs, the external pilot readiness review P3-4 section, the external pilot runbook next step section, and the external pilot tracker.

- [x] **Step 3: Run docs test and verify green**

Run:

```bash
npm test -- tests/testops/integrationDocs.test.ts
```

Expected: all tests in `integrationDocs.test.ts` pass.

### Task 3: Final Verification And PR

**Files:**
- All changed files.

- [x] **Step 1: Run full tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [x] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: production build passes.

- [x] **Step 3: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 4: Complete PR flow**

Commit, push branch `codex/first-real-pilot-recap`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
