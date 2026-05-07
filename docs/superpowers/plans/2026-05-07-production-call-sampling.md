# Production Call Sampling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import production call exports, create deterministic risk-prioritized samples, and write review artifacts that can feed the existing transcript regression workflow.

**Architecture:** Add a focused `productionCallImport` module for parsing, normalization, risk inference, sampling, Markdown rendering, and transcript rendering. Add an `import-calls` CLI command that writes a JSON manifest, optional Markdown summary, and optional transcript files. Keep platform-specific live APIs out of this slice.

**Tech Stack:** TypeScript, Vitest, existing CLI/report file helpers, Markdown docs, JSON/JSONL parsing.

---

### Task 1: Production Call Import Module

**Files:**
- Create: `tests/testops/productionCallImport.test.ts`
- Create: `src/testops/productionCallImport.ts`

- [x] **Step 1: Write failing module tests**

Add tests that:

- parse JSONL records with common provider field names
- infer risk tags from customer and assistant transcript text
- select a deterministic risk-prioritized sample
- render a Markdown sampling review
- render labeled transcript text for `from-transcript`

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/productionCallImport.test.ts`

Expected: FAIL because `@/testops/productionCallImport` does not exist.

- [x] **Step 3: Implement module**

Create:

- `parseProductionCallImport(content)`
- `buildProductionCallSample(records, options)`
- `renderProductionCallSamplingMarkdown(sample)`
- `renderProductionCallTranscript(record)`

The parser must support JSON array and JSONL inputs, tolerate rejected records when at least one valid call exists, and throw when no valid calls can be imported.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/productionCallImport.test.ts`

Expected: PASS.

### Task 2: CLI Command

**Files:**
- Modify: `tests/testops/cli.test.ts`
- Modify: `src/testops/cli.ts`
- Modify: `package.json`

- [x] **Step 1: Write failing CLI test**

Add a test for:

```bash
npx voice-agent-testops import-calls \
  --input calls.jsonl \
  --out call-sample.json \
  --summary call-sampling.md \
  --transcripts call-transcripts \
  --sample-size 2 \
  --seed weekly-2026-05-07
```

Expected outputs:

- exit 0
- JSON manifest contains total, selected, rejected, and risk tag counts
- Markdown contains selected call IDs and risk tags
- transcript files are written with `Customer:` and `Assistant:` labels
- stdout prints output paths and selected call count

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: FAIL because command is unknown.

- [x] **Step 3: Implement command**

Add `import-calls` to `main()`, parse required `--input` and `--out`, optional `--summary`, `--transcripts`, `--sample-size`, `--seed`, and `--risk-only`, then write artifacts.

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/cli.test.ts`

Expected: PASS.

### Task 3: Example Data, Docs, and Roadmap

**Files:**
- Create: `examples/voice-testops/production-calls/sample-calls.jsonl`
- Modify: `tests/testops/integrationDocs.test.ts`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/guides/mock-data.md`
- Modify: `docs/guides/mock-data.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Add doc assertions**

Expect docs to contain `import-calls`, `call-sample.json`, `call-sampling.md`, `call-transcripts`, and the sample calls fixture path.

- [x] **Step 2: Run RED**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: FAIL until docs are updated.

- [x] **Step 3: Update docs and roadmap**

Add a production call sampling workflow and check off `生产通话导入和抽样监控。`

- [x] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: PASS.

### Task 4: Verification and Integration

**Files:**
- All modified files.

- [x] **Step 1: Run focused verification**

Run:

```bash
npm test -- tests/testops/productionCallImport.test.ts tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts
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
git commit -m "feat: sample production calls"
git push -u origin codex/production-call-sampling
gh pr create --title "feat: sample production calls" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```
