# Transcript Industry Assertions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `from-transcript` generate industry-aware assertion drafts for the three commercial starter industries and document why public starter data does not erase the product moat.

**Architecture:** Keep transcript generation deterministic and local. Extend `src/testops/transcriptSuite.ts` with small industry guardrail helpers that add `semantic_judge`, industry-specific forbidden promise patterns, and field collection assertions based on customer text and merchant industry. Add docs that split open-source seed assets from private commercial feedback loops.

**Tech Stack:** TypeScript, Zod-backed voice test schema, Vitest, Markdown docs.

---

### Task 1: Industry-Aware Transcript Assertions

**Files:**
- Modify: `tests/testops/transcriptSuite.test.ts`
- Modify: `src/testops/transcriptSuite.ts`

- [ ] **Step 1: Write failing tests**

Add tests that build suites from transcripts for:

- `real_estate`: customer asks about guaranteed appreciation, budget, location, and viewing time.
- `dental_clinic`: customer asks for a specific doctor, same-day slot, and painless treatment guarantee.
- `home_design`: customer asks for fixed budget, move-in deadline, location, and measurement appointment.

Each test expects relevant `semantic_judge` rubrics, domain-specific `must_not_match` patterns, and extracted lead fields such as `budget`, `location`, or `preferredTime`.

- [ ] **Step 2: Run focused test to verify RED**

Run: `npm test -- tests/testops/transcriptSuite.test.ts`

Expected: FAIL because generated transcript suites do not yet include commercial-industry `semantic_judge` drafts.

- [ ] **Step 3: Implement industry guardrails**

Add helpers in `src/testops/transcriptSuite.ts`:

- `buildIndustrySemanticAssertions(text, industry)`
- `industryForbiddenPromisePattern(industry)`
- `mentionsLocation(text)`
- small per-industry signal patterns and criteria strings

Use existing `VoiceTestAssertion` structures only; do not add schema fields.

- [ ] **Step 4: Run focused test to verify GREEN**

Run: `npm test -- tests/testops/transcriptSuite.test.ts`

Expected: PASS.

### Task 2: Open-Source Boundary Documentation

**Files:**
- Create: `docs/growth/open-source-moat-boundary.zh-CN.md`
- Modify: `docs/growth/semantic-judge-annotation-sources.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [ ] **Step 1: Write the boundary doc**

Document:

- What should be open: generic starter suites, seed annotation format, public docs, deterministic CLI examples.
- What should stay private/commercial: customer transcripts, customer-specific regression suites, adjudicated labels, false-positive/false-negative analyses, adapter configs, production monitoring history, benchmark scores.
- Why open seed data can increase trust and distribution without giving away the compounding data loop.

- [ ] **Step 2: Link it from the source survey**

Add a short paragraph in the annotation source survey pointing to the boundary doc.

- [ ] **Step 3: Mark roadmap item done**

Check off `让 from-transcript 对三行业生成更贴合的断言草稿。`

### Task 3: Verification and Integration

**Files:**
- All modified files.

- [ ] **Step 1: Run verification**

Run:

```bash
npm test -- tests/testops/transcriptSuite.test.ts tests/testops/integrationDocs.test.ts
npm test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 2: Commit, push, PR, merge, delete branch**

Run:

```bash
git add ...
git commit -m "feat: tailor transcript assertion drafts"
git push -u origin codex/transcript-industry-assertions
gh pr create --title "feat: tailor transcript assertion drafts" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```

Expected: PR is merged into `main`, the remote branch is deleted, and local workspace is clean on `main`.
