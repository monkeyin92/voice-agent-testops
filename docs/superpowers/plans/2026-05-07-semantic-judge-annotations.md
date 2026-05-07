# Semantic Judge Annotation Seeds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated 45-sample annotation seed set for the three commercial starter industries, with public-data-source guidance that explains what can be borrowed and what must stay original.

**Architecture:** Keep the seed set as versioned JSON under `examples/voice-testops/annotations/`, validate it with a focused Zod parser in `src/testops/annotationSet.ts`, and cover it with Vitest so it cannot silently drift below the roadmap target. Public datasets are used for taxonomy and structure inspiration only; no dataset rows are copied into the product examples.

**Tech Stack:** TypeScript, Zod, Vitest, JSON examples, Markdown docs.

---

### Task 1: Annotation Set Contract

**Files:**
- Create: `tests/testops/annotationSet.test.ts`
- Create: `src/testops/annotationSet.ts`
- Create: `examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json`

- [ ] **Step 1: Write the failing validation test**

```ts
import seedSet from "../../examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json";
import { describe, expect, it } from "vitest";
import { parseSemanticJudgeAnnotationSet } from "@/testops/annotationSet";

describe("semantic judge annotation seed set", () => {
  it("keeps 45 balanced labeled samples across the commercial starter industries", () => {
    const parsed = parseSemanticJudgeAnnotationSet(seedSet);
    expect(parsed.samples).toHaveLength(45);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/testops/annotationSet.test.ts`

Expected: FAIL because `@/testops/annotationSet` and the seed JSON do not exist yet.

- [ ] **Step 3: Implement the schema/parser**

Create `src/testops/annotationSet.ts` with Zod schemas for:

```ts
industry: "real_estate" | "dental_clinic" | "home_design"
rubric: semanticJudgeRubricSchema
expected: "pass" | "fail"
severity: voiceTestSeveritySchema.default("critical")
```

Each sample must include `id`, `industry`, `rubric`, `criteria`, `expected`, `user`, `spoken`, `reason`, and optional `evidence`.

- [ ] **Step 4: Add the seed JSON**

Create `examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json` with exactly 45 original Chinese samples:

- 15 `real_estate`
- 15 `dental_clinic`
- 15 `home_design`
- 5 samples per rubric in each industry
- At least one `pass` and one `fail` per industry/rubric pair

- [ ] **Step 5: Expand the test coverage**

Update `tests/testops/annotationSet.test.ts` to assert:

- no duplicate IDs
- 15 samples per industry
- all three rubrics per industry
- every industry/rubric pair has both `pass` and `fail`
- all source metadata URLs are present

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/testops/annotationSet.test.ts`

Expected: PASS.

### Task 2: Source Survey and Roadmap Docs

**Files:**
- Create: `docs/growth/semantic-judge-annotation-sources.zh-CN.md`
- Modify: `docs/guides/mock-data.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [ ] **Step 1: Document public-source usage rules**

Create a source survey that covers:

- ProsocialDialog: safety labels and reason fields for rubric design.
- Bitext Customer Support: support intent/category distribution for wording diversity.
- MultiWOZ: task-oriented dialogue and slot structure.
- BANKING77: fine-grained banking intent taxonomy, referenced but not used for the current starter industries.

- [ ] **Step 2: Add a guide link**

Update the Chinese mock-data guide to point developers to the seed set and source survey before they write new `semantic_judge` examples.

- [ ] **Step 3: Mark the roadmap item done**

Change `建立 30-50 条人工标注样本，覆盖三行业。` from unchecked to checked.

- [ ] **Step 4: Run focused docs/data tests**

Run: `npm test -- tests/testops/annotationSet.test.ts tests/testops/integrationDocs.test.ts`

Expected: PASS.

### Task 3: Final Verification and Integration

**Files:**
- All files touched in Tasks 1-2.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Commit, push, PR, merge, delete branch**

Run non-interactive git/GitHub CLI commands from `codex/semantic-judge-annotations`:

```bash
git status --short
git add ...
git commit -m "feat: add semantic judge annotation seeds"
git push -u origin codex/semantic-judge-annotations
gh pr create --title "feat: add semantic judge annotation seeds" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
```

Expected: branch merged into `main`, remote branch deleted, local branch can be deleted after switching.
