# External Pilot Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested external pilot tracking table that turns outreach responses into repeatable trial evidence.

**Architecture:** This is a documentation-only change guarded by integration documentation tests. The tracker becomes the canonical ops table, while the existing growth validation checklist remains the top-of-funnel outreach and success-metric document.

**Tech Stack:** Markdown, Vitest documentation tests.

---

### Task 1: Documentation Test

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`

- [x] **Step 1: Write the failing documentation test**

Add a test for `docs/ops/external-pilot-tracker.zh-CN.md`. Assert that README.md, README.zh-CN.md, the external pilot readiness review, the external pilot runbook, and `docs/growth/voice-agent-testops-validation.md` link to it. Assert that the tracker includes required operational fields and enums.

- [x] **Step 2: Run docs test and verify red**

Run:

```bash
npm test -- tests/testops/integrationDocs.test.ts
```

Expected: fail because `docs/ops/external-pilot-tracker.zh-CN.md` does not exist.

### Task 2: Tracker Document And Links

**Files:**
- Create: `docs/ops/external-pilot-tracker.zh-CN.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/ops/external-pilot-readiness-review.zh-CN.md`
- Modify: `docs/ops/external-pilot-runbook.zh-CN.md`
- Modify: `docs/growth/voice-agent-testops-validation.md`

- [x] **Step 1: Create the tracker**

Create a Chinese tracker with these sections:

- 使用方式;
- 试跑记录表;
- 字段字典;
- 失败类型枚举;
- 状态枚举;
- 每周复盘;
- Go / No-Go 判定;
- links to runbook and data authorization template.

- [x] **Step 2: Link the tracker**

Add links from both READMEs, the external pilot readiness review P3-3 section, the external pilot runbook next step section, and the growth validation checklist.

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

Commit, push branch `codex/external-pilot-tracker`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
