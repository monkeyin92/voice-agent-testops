import { describe, expect, it } from "vitest";
import {
  buildFailureClusters,
  buildRegressionSuiteDraft,
  renderFailureClusterMarkdown,
} from "@/testops/regressionDraft";
import { parseVoiceTestSuite, type VoiceTestSuite } from "@/testops/schema";
import type { VoiceTestRunResult } from "@/testops/runner";

const merchant = {
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套，精修 9 张", bestFor: "个人写真" }],
  faqs: [],
  bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
};

describe("failure regression drafts", () => {
  it("clusters failures by severity, code, and normalized message", () => {
    const clusters = buildFailureClusters(
      report([
        failure("pricing", "Pricing", 0, "expected_phrase_missing", "缺少价格 599", "major"),
        failure("booking", "Booking", 0, "expected_phrase_missing", "缺少价格 1299", "major"),
        failure("handoff", "Handoff", 0, "lead_intent_mismatch", "应为 handoff，实际 other", "critical"),
      ]),
    );

    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toMatchObject({ code: "lead_intent_mismatch", severity: "critical", count: 1 });
    expect(clusters[1]).toMatchObject({ code: "expected_phrase_missing", severity: "major", count: 2 });
  });

  it("renders cluster markdown for review", () => {
    const run = report([failure("handoff", "Handoff", 1, "lead_intent_mismatch", "应为 handoff，实际 other")]);
    const markdown = renderFailureClusterMarkdown(run, buildFailureClusters(run));

    expect(markdown).toContain("# Voice Agent TestOps Failure Clusters");
    expect(markdown).toContain("Suite: Failed launch check");
    expect(markdown).toContain("lead_intent_mismatch");
    expect(markdown).toContain("Handoff / turn 2");
  });

  it("builds a valid regression suite draft from failed report scenarios", () => {
    const sourceSuite = parseVoiceTestSuite({
      name: "Original launch suite",
      scenarios: [
        {
          id: "pricing",
          title: "Pricing",
          source: "website",
          merchant,
          turns: [
            { user: "多少钱", expect: [{ type: "must_contain_any", phrases: ["599"] }] },
            { user: "电话 13800000000", expect: [{ type: "lead_field_present", field: "phone" }] },
          ],
        },
        {
          id: "handoff",
          title: "Handoff",
          source: "website",
          merchant,
          turns: [{ user: "找人工", expect: [{ type: "lead_intent", intent: "handoff" }] }],
        },
      ],
    });

    const draft = buildRegressionSuiteDraft(
      sourceSuite,
      report([failure("pricing", "Pricing", 1, "lead_field_missing", "缺少手机号")]),
    );

    expect(draft.name).toBe("Regression draft from Failed launch check");
    expect(draft.scenarios).toHaveLength(1);
    expect(draft.scenarios[0]).toMatchObject({
      id: "pricing",
      title: "Pricing",
      description: expect.stringContaining("lead_field_missing"),
    });
    expect(draft.scenarios[0].turns).toHaveLength(2);
    expect(() => parseVoiceTestSuite(draft)).not.toThrow();
  });
});

function report(failures: FailureFixture[]): VoiceTestRunResult {
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
    id: "run_failed_launch_check",
    suiteName: "Failed launch check",
    passed: false,
    startedAt: "2026-05-07T00:00:00.000Z",
    finishedAt: "2026-05-07T00:00:01.000Z",
    summary: { scenarios: scenarios.length, turns: scenarios.length, assertions: scenarios.length, failures: failures.length },
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
