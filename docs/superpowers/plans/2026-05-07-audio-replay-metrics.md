# Audio Replay And Voice Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional audio replay evidence and platform-reported voice metrics to test results, assertions, adapter contracts, and reports.

**Architecture:** Extend the existing agent output/result contract with optional `audio` and `voiceMetrics`. Keep assertions deterministic in `runner.ts`; keep presentation in `report.ts`; keep schema export and docs in sync with the authored suite contract.

**Tech Stack:** TypeScript, Zod, Vitest, Next.js build, existing Voice Agent TestOps CLI/report pipeline.

---

### Task 1: Schema Assertions

**Files:**
- Modify: `src/testops/schema.ts`
- Test: `tests/testops/schema.test.ts`

- [x] **Step 1: Write the failing schema test**

Add a test case that parses `audio_replay_present`, `voice_metric_max`, and `voice_metric_min` assertions.

- [x] **Step 2: Run the focused schema test**

Run: `npm test -- tests/testops/schema.test.ts`

Expected: fail because the new assertion types are not in the discriminated union.

- [x] **Step 3: Add voice metric schema support**

Add a `voiceMetricNameSchema` enum and three assertion variants:

```ts
z.object({
  type: z.literal("audio_replay_present"),
  severity: assertionSeverity,
});
z.object({
  type: z.literal("voice_metric_max"),
  metric: voiceMetricNameSchema,
  value: z.number().nonnegative(),
  severity: assertionSeverity,
});
z.object({
  type: z.literal("voice_metric_min"),
  metric: voiceMetricNameSchema,
  value: z.number().nonnegative(),
  severity: assertionSeverity,
});
```

- [x] **Step 4: Verify the focused schema test passes**

Run: `npm test -- tests/testops/schema.test.ts`

Expected: pass.

### Task 2: Runner Evaluation

**Files:**
- Modify: `src/testops/agents.ts`
- Modify: `src/testops/runner.ts`
- Test: `tests/testops/runner.test.ts`

- [x] **Step 1: Write failing runner tests**

Add one passing case with `audio.url` and matching metrics, plus one failing case that produces `audio_replay_missing`, `voice_metric_exceeded`, and `voice_metric_below_minimum`.

- [x] **Step 2: Run focused runner tests**

Run: `npm test -- tests/testops/runner.test.ts`

Expected: fail because `audio`, `voiceMetrics`, and the new assertion evaluators do not exist yet.

- [x] **Step 3: Add output/result types**

Add:

```ts
export type VoiceAgentAudioReplay = {
  url: string;
  label?: string;
  mimeType?: string;
  durationMs?: number;
};

export type VoiceAgentVoiceMetrics = Partial<Record<VoiceMetricName, number>>;
```

Add optional `audio` and `voiceMetrics` to `VoiceAgentTurnOutput` and `VoiceTestTurnResult`.

- [x] **Step 4: Add deterministic evaluators**

Evaluate `audio_replay_present`, `voice_metric_max`, and `voice_metric_min` from the agent output. Missing metric values use `voice_metric_missing`; threshold failures use distinct max/min codes.

- [x] **Step 5: Verify runner tests pass**

Run: `npm test -- tests/testops/runner.test.ts`

Expected: pass.

### Task 3: Reports And Adapter Contract

**Files:**
- Modify: `src/testops/report.ts`
- Modify: `src/testops/adapters/openClawAgent.ts`
- Test: `tests/testops/report.test.ts`
- Test: `tests/testops/openClawAgent.test.ts`

- [x] **Step 1: Write failing report and adapter tests**

Report tests should expect an `<audio controls>` player and visible metric labels/values. OpenClaw parser tests should expect `audio` and `voiceMetrics` to be preserved from JSON output.

- [x] **Step 2: Run focused tests**

Run: `npm test -- tests/testops/report.test.ts tests/testops/openClawAgent.test.ts`

Expected: fail because report rendering and parser preservation are missing.

- [x] **Step 3: Render voice evidence**

Add `renderVoiceEvidence()` in `report.ts` and call it inside each turn card after the assistant bubble. Keep HTML escaped.

- [x] **Step 4: Preserve output fields in OpenClaw parser**

Update the custom payload `outputContract` and Responses JSON parser to mention and preserve `audio` and `voiceMetrics` records.

- [x] **Step 5: Verify focused tests pass**

Run: `npm test -- tests/testops/report.test.ts tests/testops/openClawAgent.test.ts`

Expected: pass.

### Task 4: JSON Schema And Docs

**Files:**
- Modify: `src/testops/jsonSchema.ts`
- Modify: `tests/testops/cli.test.ts`
- Modify: `tests/testops/integrationDocs.test.ts`
- Modify: `docs/integrations/http.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/guides/mock-data.md`
- Modify: `docs/guides/mock-data.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [x] **Step 1: Write failing schema/docs tests**

CLI schema export should include `audio_replay_present`, `voice_metric_max`, and `voice_metric_min`. Integration docs should mention `audio`, `voiceMetrics`, and the new assertion types.

- [x] **Step 2: Run focused docs/schema tests**

Run: `npm test -- tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts`

Expected: fail until schema and docs are updated.

- [x] **Step 3: Update JSON Schema and documentation**

Add JSON Schema assertion variants and update public docs to show bridge return fields and example assertions.

- [x] **Step 4: Verify focused docs/schema tests pass**

Run: `npm test -- tests/testops/cli.test.ts tests/testops/integrationDocs.test.ts`

Expected: pass.

### Task 5: Final Verification And Integration

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

Commit, push branch `codex/audio-replay-metrics`, create a PR, merge it, delete the branch, fetch/prune, and run a post-merge focused test on `main`.
