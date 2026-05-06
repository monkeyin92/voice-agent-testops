import { describe, expect, it } from "vitest";
import { diffVoiceTestReports, renderMarkdownDiff } from "@/testops/diffReport";
import type { VoiceTestRunResult } from "@/testops/runner";

describe("diffVoiceTestReports", () => {
  it("classifies new, resolved, and unchanged failures by scenario, turn, and assertion code", () => {
    const baseline = makeResult("Baseline launch check", [
      failure("pricing", "Customer asks price", 0, "expected_phrase_missing", "old missing price"),
      failure("handoff", "Customer wants human", 0, "lead_intent_mismatch", "old handoff mismatch"),
    ]);
    const current = makeResult("Current launch check", [
      failure("pricing", "Customer asks price", 0, "expected_phrase_missing", "still missing price"),
      failure("availability", "Customer asks availability", 0, "forbidden_pattern_matched", "new unconfirmed slot"),
    ]);

    const diff = diffVoiceTestReports(baseline, current);

    expect(diff.summary).toEqual({ newFailures: 1, resolvedFailures: 1, unchangedFailures: 1 });
    expect(diff.newFailures[0]).toMatchObject({
      scenarioId: "availability",
      scenarioTitle: "Customer asks availability",
      code: "forbidden_pattern_matched",
    });
    expect(diff.resolvedFailures[0]).toMatchObject({
      scenarioId: "handoff",
      code: "lead_intent_mismatch",
    });
    expect(diff.unchangedFailures[0]).toMatchObject({
      scenarioId: "pricing",
      code: "expected_phrase_missing",
      message: "still missing price",
    });
  });
});

describe("renderMarkdownDiff", () => {
  it("renders a compact baseline comparison for CI summaries", () => {
    const diff = diffVoiceTestReports(
      makeResult("Baseline <Run>", [failure("old", "Old scenario", 0, "lead_field_missing", "missing phone")]),
      makeResult("Current <Run>", [failure("new", "New scenario", 1, "must_not_match", "promised <slot>")]),
    );

    const markdown = renderMarkdownDiff(diff);

    expect(markdown).toContain("# Voice Agent TestOps Diff");
    expect(markdown).toContain("**Baseline:** Baseline <Run>");
    expect(markdown).toContain("**Current:** Current <Run>");
    expect(markdown).toContain("New failures: 1");
    expect(markdown).toContain("Resolved failures: 1");
    expect(markdown).toContain("Unchanged failures: 0");
    expect(markdown).toContain("## New Failures");
    expect(markdown).toContain("New scenario / turn 2");
    expect(markdown).toContain("`must_not_match` (critical): promised <slot>");
    expect(markdown).toContain("## Resolved Failures");
    expect(markdown).toContain("Old scenario / turn 1");
  });
});

function makeResult(suiteName: string, failures: FailureFixture[]): VoiceTestRunResult {
  const scenarios = failures.map((item) => ({
    id: item.scenarioId,
    title: item.scenarioTitle,
    passed: false,
    turns: [
      {
        index: item.turnIndex,
        user: "customer",
        assistant: "agent",
        latencyMs: 100,
        passed: false,
        assertions: 1,
        failures: [{ code: item.code, message: item.message, severity: item.severity }],
      },
    ],
  }));

  return {
    id: `run_${suiteName}`,
    suiteName,
    passed: failures.length === 0,
    startedAt: "2026-05-06T00:00:00.000Z",
    finishedAt: "2026-05-06T00:00:01.000Z",
    summary: {
      scenarios: scenarios.length,
      turns: scenarios.length,
      assertions: scenarios.length,
      failures: failures.length,
    },
    scenarios,
  };
}

type FailureFixture = {
  scenarioId: string;
  scenarioTitle: string;
  turnIndex: number;
  code: string;
  message: string;
  severity: "minor" | "major" | "critical";
};

function failure(
  scenarioId: string,
  scenarioTitle: string,
  turnIndex: number,
  code: string,
  message: string,
  severity: "minor" | "major" | "critical" = "critical",
): FailureFixture {
  return { scenarioId, scenarioTitle, turnIndex, code, message, severity };
}
