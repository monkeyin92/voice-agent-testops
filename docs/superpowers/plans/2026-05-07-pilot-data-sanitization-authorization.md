# Pilot Data Sanitization And Authorization Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested pilot data sanitization and authorization template for external Voice Agent TestOps pilots.

**Architecture:** This is a documentation-only change guarded by integration documentation tests. The new ops template is linked from the external pilot entry points so teams must handle data boundaries before using real transcripts, call logs, audio, or customer facts.

**Tech Stack:** Markdown, Vitest documentation tests.

---

### Task 1: Documentation Test

**Files:**
- Modify: `tests/testops/integrationDocs.test.ts`

- [x] **Step 1: Write the failing documentation test**

Add a test for `docs/ops/pilot-data-sanitization-authorization.zh-CN.md`. Assert that README.md, README.zh-CN.md, the external pilot readiness review, and the external pilot runbook link to it. Assert that the template includes required phrases for sanitization, authorization, retention, public-repository boundary, and official privacy references.

- [x] **Step 2: Run docs test and verify red**

Run:

```bash
npm test -- tests/testops/integrationDocs.test.ts
```

Expected: fail because `docs/ops/pilot-data-sanitization-authorization.zh-CN.md` does not exist.

### Task 2: Template Document And Links

**Files:**
- Create: `docs/ops/pilot-data-sanitization-authorization.zh-CN.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/ops/external-pilot-readiness-review.zh-CN.md`
- Modify: `docs/ops/external-pilot-runbook.zh-CN.md`

- [x] **Step 1: Create the template**

Create a Chinese template with these sections:

- 使用前声明;
- 参考原则;
- 数据分级;
- 可提供字段;
- 禁止提供字段;
- 脱敏替换规则;
- 脱敏前后示例;
- 授权确认模板;
- 产物保存和删除;
- 公开仓库边界;
- 试点前检查清单.

- [x] **Step 2: Link the template**

Add links from both READMEs, the external pilot readiness review P3-2 section, and the external pilot runbook prerequisites.

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

Commit, push branch `codex/pilot-data-authorization-template`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
