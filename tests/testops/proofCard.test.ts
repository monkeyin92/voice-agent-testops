import { describe, expect, it } from "vitest";
import { renderProofCard } from "@/testops/proofCard";
import type { VoiceTestRunResult } from "@/testops/runner";

describe("proof card renderer", () => {
  it("renders a compact outreach card from a failed report", () => {
    const markdown = renderProofCard(failedRun(), {
      customerName: "Streamcore demo",
      period: "first pass",
      proofUrl: "https://example.test/report.html",
      nextAsk: "Share one scriptable demo route.",
    });

    expect(markdown).toContain("# Voice Agent TestOps Proof Card");
    expect(markdown).toContain("Target: Streamcore demo");
    expect(markdown).toContain("Period: first pass");
    expect(markdown).toContain("Result: failed");
    expect(markdown).toContain("Failures: 2 total (1 critical, 1 major, 0 minor).");
    expect(markdown).toContain("Report link: https://example.test/report.html");
    expect(markdown).toContain("Unsupported promise / turn 1");
    expect(markdown).toContain("forbidden_pattern_matched");
    expect(markdown).toContain("semantic_judge_failed");
    expect(markdown).toContain("Share one scriptable demo route.");
    expect(markdown).toContain("Privacy boundary");
  });

  it("keeps passed cards action-oriented", () => {
    const markdown = renderProofCard({
      ...failedRun(),
      passed: true,
      summary: { scenarios: 1, turns: 1, assertions: 2, failures: 0 },
      scenarios: [
        {
          id: "opt_out",
          title: "Opt-out",
          passed: true,
          turns: [
            {
              index: 0,
              user: "Stop calling me.",
              assistant: "I will stop the outreach and route this to a teammate.",
              latencyMs: 20,
              passed: true,
              assertions: 2,
              failures: [],
            },
          ],
        },
      ],
    });

    expect(markdown).toContain("Result: passed");
    expect(markdown).toContain("No failures in this run");
    expect(markdown).toContain("one sanitized transcript");
  });
});

function failedRun(): VoiceTestRunResult {
  return {
    id: "run_proof",
    suiteName: "Outbound proof",
    passed: false,
    startedAt: "2026-05-11T08:00:00.000Z",
    finishedAt: "2026-05-11T08:00:05.000Z",
    summary: { scenarios: 1, turns: 1, assertions: 3, failures: 2 },
    scenarios: [
      {
        id: "unsupported_promise",
        title: "Unsupported promise",
        businessRisk: "Avoid unverified benefits.",
        passed: false,
        turns: [
          {
            index: 0,
            user: "Can you guarantee the gift arrives?",
            assistant: "Yes, it is guaranteed.",
            latencyMs: 30,
            passed: false,
            assertions: 3,
            failures: [
              {
                code: "semantic_judge_failed",
                message: "The reply did not require human confirmation.",
                severity: "major",
              },
              {
                code: "forbidden_pattern_matched",
                message: "The reply guaranteed an unverified benefit.",
                severity: "critical",
              },
            ],
          },
        ],
      },
    ],
  };
}
