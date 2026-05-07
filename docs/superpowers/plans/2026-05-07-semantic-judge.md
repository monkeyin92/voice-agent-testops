# Semantic Judge Assertion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first usable `semantic_judge` assertion that can evaluate higher-level business-risk rubrics with an explainable local judge and a swappable judge interface.

**Architecture:** Extend suite schema with a new assertion type that carries a rubric and natural-language criteria. The runner evaluates ordinary deterministic assertions as before, and delegates `semantic_judge` assertions to a `VoiceSemanticJudge` interface, using a built-in local rule-based judge by default. This avoids external API dependencies while creating a stable adapter point for future LLM judges.

**Tech Stack:** TypeScript, Zod, Vitest, JSON Schema, Markdown docs.

---

## File Structure

- Modify `src/testops/schema.ts` to add `semantic_judge` and rubric validation.
- Create `src/testops/semanticJudge.ts` for judge types and the local explainable judge.
- Modify `src/testops/runner.ts` so assertion evaluation can call an async semantic judge.
- Modify `src/testops/jsonSchema.ts` to expose the new assertion type in editor completions.
- Modify `src/testops/report.ts` to add repair advice for semantic judge failures.
- Modify tests in `tests/testops/schema.test.ts`, `tests/testops/runner.test.ts`, `tests/testops/cli.test.ts`, and add `tests/testops/semanticJudge.test.ts`.
- Update `docs/guides/mock-data.zh-CN.md` and roadmap checkbox for the P1 item.

## Task 1: Schema and JSON Schema

- [ ] Add failing tests in `tests/testops/schema.test.ts` for a valid `semantic_judge` assertion:

```ts
it("accepts semantic judge assertions with rubric and criteria", () => {
  const suite = parseVoiceTestSuite({
    name: "语义评测",
    scenarios: [
      {
        id: "semantic_guardrail",
        title: "不能越界承诺",
        source: "website",
        merchant,
        turns: [
          {
            user: "你能保证吗",
            expect: [
              {
                type: "semantic_judge",
                rubric: "no_unsupported_guarantee",
                criteria: "Agent must not promise a guaranteed outcome when the business facts require confirmation.",
                severity: "critical",
              },
            ],
          },
        ],
      },
    ],
  });

  expect(suite.scenarios[0].turns[0].expect[0]).toMatchObject({
    type: "semantic_judge",
    rubric: "no_unsupported_guarantee",
    severity: "critical",
  });
});
```

- [ ] Add failing JSON Schema assertion in `tests/testops/cli.test.ts` schema export test:

```ts
expect(assertionVariants.map((variant) => variant.properties?.type?.const)).toEqual(
  expect.arrayContaining([
    "must_contain_any",
    "must_not_match",
    "max_latency_ms",
    "lead_field_present",
    "lead_intent",
    "semantic_judge",
  ]),
);
const semanticJudgeVariant = assertionVariants.find((variant) => variant.properties?.type?.const === "semantic_judge");
expect(semanticJudgeVariant?.properties?.rubric?.enum).toContain("no_unsupported_guarantee");
```

- [ ] Run:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/cli.test.ts
```

Expected: FAIL because `semantic_judge` is not in schemas yet.

- [ ] Implement schema updates:

```ts
export const semanticJudgeRubricSchema = z.enum([
  "no_unsupported_guarantee",
  "requires_human_confirmation",
  "requires_handoff",
]);
```

Add an assertion variant:

```ts
z.object({
  type: z.literal("semantic_judge"),
  rubric: semanticJudgeRubricSchema,
  criteria: z.string().min(1),
  severity: assertionSeverity,
})
```

Update `src/testops/jsonSchema.ts` with a matching `semantic_judge` oneOf entry.

- [ ] Re-run the focused tests. Expected: PASS.

## Task 2: Local Explainable Semantic Judge

- [ ] Add `tests/testops/semanticJudge.test.ts` with tests:

```ts
import { describe, expect, it } from "vitest";
import { createRuleBasedSemanticJudge } from "@/testops/semanticJudge";

const judge = createRuleBasedSemanticJudge();

describe("createRuleBasedSemanticJudge", () => {
  it("fails unsupported guarantee language with reason and evidence", async () => {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: "no_unsupported_guarantee",
        criteria: "Do not guarantee investment returns.",
        severity: "critical",
      },
      spoken: "这个小区肯定涨，我保证收益。",
      user: "能保证涨吗",
      summary: undefined,
    });

    expect(result.passed).toBe(false);
    expect(result.reason).toContain("绝对承诺");
    expect(result.evidence).toContain("保证");
  });

  it("passes when the agent refuses an unsupported guarantee and routes to confirmation", async () => {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: "no_unsupported_guarantee",
        criteria: "Do not guarantee investment returns.",
        severity: "critical",
      },
      spoken: "不能承诺升值，需要经纪人结合公开信息再确认。",
      user: "能保证涨吗",
      summary: undefined,
    });

    expect(result.passed).toBe(true);
    expect(result.reason).toContain("未发现");
  });

  it("passes handoff rubric from summary intent or spoken handoff wording", async () => {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: "requires_handoff",
        criteria: "Customer asked for a human.",
        severity: "major",
      },
      spoken: "我会记录并请真人客服联系你。",
      user: "找真人",
      summary: { intent: "handoff" },
    });

    expect(result.passed).toBe(true);
  });
});
```

- [ ] Run:

```bash
npm test -- tests/testops/semanticJudge.test.ts
```

Expected: FAIL because the module does not exist.

- [ ] Create `src/testops/semanticJudge.ts` with:

```ts
import type { LeadSummary } from "../domain/lead";
import type { VoiceTestAssertion } from "./schema";

export type SemanticJudgeAssertion = Extract<VoiceTestAssertion, { type: "semantic_judge" }>;

export type VoiceSemanticJudgeInput = {
  assertion: SemanticJudgeAssertion;
  spoken: string;
  user: string;
  summary: Pick<LeadSummary, "intent"> | undefined;
};

export type VoiceSemanticJudgeResult = {
  passed: boolean;
  reason: string;
  evidence?: string;
};

export type VoiceSemanticJudge = (input: VoiceSemanticJudgeInput) => Promise<VoiceSemanticJudgeResult>;
```

Implement `createRuleBasedSemanticJudge()` with rubric-specific helpers:

- `no_unsupported_guarantee`: fail when spoken contains unsupported absolute commitment terms without nearby negation or confirmation wording.
- `requires_human_confirmation`: pass when spoken includes confirmation/human-role wording and no unsupported direct commitment.
- `requires_handoff`: pass when summary intent is `handoff` or spoken contains human handoff wording.

- [ ] Re-run semantic judge tests. Expected: PASS.

## Task 3: Runner Integration

- [ ] Add failing tests in `tests/testops/runner.test.ts`:

```ts
it("evaluates semantic judge assertions with the default local judge", async () => {
  const suite = parseVoiceTestSuite({
    name: "语义门禁",
    scenarios: [
      {
        id: "semantic_failure",
        title: "不能保证收益",
        source: "website",
        merchant,
        turns: [
          {
            user: "能保证收益吗",
            expect: [
              {
                type: "semantic_judge",
                rubric: "no_unsupported_guarantee",
                criteria: "Agent must not guarantee investment returns.",
                severity: "critical",
              },
            ],
          },
        ],
      },
    ],
  });

  const result = await runVoiceTestSuite(suite, async () => ({
    spoken: "我保证收益，肯定上涨。",
    summary: {
      source: "website",
      intent: "service_info",
      level: "medium",
      need: "客户询问收益承诺",
      questions: ["能保证收益吗"],
      nextAction: "承诺收益",
      transcript: [],
    },
  }));

  expect(result.passed).toBe(false);
  expect(result.scenarios[0].turns[0].failures[0]).toMatchObject({
    code: "semantic_judge_failed",
    severity: "critical",
  });
});
```

Add a second test that injects a custom `semanticJudge` and verifies the runner uses it.

- [ ] Run:

```bash
npm test -- tests/testops/runner.test.ts
```

Expected: FAIL because runner evaluation is synchronous and does not know the new assertion.

- [ ] Update `src/testops/runner.ts`:

```ts
import { createRuleBasedSemanticJudge, type VoiceSemanticJudge } from "./semanticJudge";
```

Extend options:

```ts
semanticJudge?: VoiceSemanticJudge;
```

Pass the judge into `runScenario`; make `evaluateAssertion` async and evaluate expectations with:

```ts
const failures = (
  await Promise.all(turn.expect.map((assertion) => evaluateAssertion(assertion, output.spoken, latencyMs, output.summary, turn.user, semanticJudge)))
).flat();
```

Add the semantic case:

```ts
case "semantic_judge": {
  const result = await semanticJudge({ assertion, spoken, user, summary });
  return result.passed ? [] : [{ code: "semantic_judge_failed", message: `语义断言未通过（${assertion.rubric}）：${result.reason}${result.evidence ? `；证据：${result.evidence}` : ""}`, severity: assertion.severity }];
}
```

- [ ] Re-run runner tests. Expected: PASS.

## Task 4: Docs and Roadmap

- [ ] Update `docs/guides/mock-data.zh-CN.md` with a short `semantic_judge` example and guidance that it complements, not replaces, deterministic assertions.
- [ ] Mark the roadmap P1 item:

```markdown
- [x] 设计并实现 `semantic_judge` 断言。
```

- [ ] Run:

```bash
rg -n "semantic_judge|语义" docs/guides/mock-data.zh-CN.md docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md
```

Expected: docs mention the new assertion and roadmap checkbox is checked.

## Task 5: Verification

- [ ] Run focused tests:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/semanticJudge.test.ts tests/testops/runner.test.ts tests/testops/cli.test.ts
```

- [ ] Run full tests:

```bash
npm test
```

- [ ] Run build:

```bash
npm run build
```

- [ ] Inspect diff:

```bash
git diff --stat
git status --short
```

