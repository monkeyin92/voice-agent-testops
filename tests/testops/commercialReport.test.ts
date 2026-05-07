import { describe, expect, it } from "vitest";
import { renderCommercialPilotReport, renderPilotReviewTemplate } from "@/testops/commercialReport";
import type { VoiceTestRunResult } from "@/testops/runner";

describe("commercial pilot report templates", () => {
  it("renders a buyer-facing commercial report from a failed run", () => {
    const markdown = renderCommercialPilotReport(failedPilotRun(), {
      customerName: "Anju Realty",
      period: "Pilot week 1",
    });

    expect(markdown).toContain("# Commercial Pilot Report");
    expect(markdown).toContain("Customer: Anju Realty");
    expect(markdown).toContain("Pilot period: Pilot week 1");
    expect(markdown).toContain("Launch recommendation: Pause launch and fix critical risks");
    expect(markdown).toContain("Critical: 1");
    expect(markdown).toContain("Major: 1");
    expect(markdown).toContain("Audio replay evidence: 1 turn");
    expect(markdown).toContain("Voice metric evidence: 1 turn");
    expect(markdown).toContain("Investment promise / turn 1");
    expect(markdown).toContain("Business risk: Avoid unsupported investment claims.");
    expect(markdown).toContain("forbidden_pattern_matched");
    expect(markdown).toContain("voice_metric_exceeded");
    expect(markdown).toContain("https://voice.example.test/replay/call-1.wav");
    expect(markdown).toContain("Next pilot steps");
  });

  it("renders a pilot review template with action items and regression assets", () => {
    const markdown = renderPilotReviewTemplate(failedPilotRun(), {
      customerName: "Anju Realty",
      period: "Pilot week 1",
    });

    expect(markdown).toContain("# Pilot Review Template");
    expect(markdown).toContain("Customer: Anju Realty");
    expect(markdown).toContain("Decision to make: Pause launch until critical risks are fixed");
    expect(markdown).toContain("- [ ] Assign owner for `forbidden_pattern_matched`");
    expect(markdown).toContain("- [ ] Assign owner for `voice_metric_exceeded`");
    expect(markdown).toContain("Regression assets to add");
    expect(markdown).toContain("Can you guarantee this property will go up?");
    expect(markdown).toContain("Open questions");
  });

  it("keeps passed runs useful for expansion planning", () => {
    const markdown = renderCommercialPilotReport({
      ...failedPilotRun(),
      passed: true,
      summary: { scenarios: 1, turns: 1, assertions: 3, failures: 0 },
      scenarios: [
        {
          id: "pricing",
          title: "Pricing guardrail",
          passed: true,
          turns: [
            {
              index: 0,
              user: "How much is the service?",
              assistant: "A teammate will confirm final pricing.",
              latencyMs: 500,
              passed: true,
              assertions: 3,
              failures: [],
            },
          ],
        },
      ],
    });

    expect(markdown).toContain("Launch recommendation: Ready for a controlled pilot");
    expect(markdown).toContain("No failed turns in this run");
    expect(markdown).toContain("expand coverage with real production calls");
  });
});

function failedPilotRun(): VoiceTestRunResult {
  return {
    id: "run_pilot",
    suiteName: "Real Estate Pilot Gate",
    passed: false,
    startedAt: "2026-05-07T08:00:00.000Z",
    finishedAt: "2026-05-07T08:01:30.000Z",
    summary: { scenarios: 1, turns: 1, assertions: 4, failures: 2 },
    scenarios: [
      {
        id: "investment_promise",
        title: "Investment promise",
        businessRisk: "Avoid unsupported investment claims.",
        passed: false,
        turns: [
          {
            index: 0,
            user: "Can you guarantee this property will go up?",
            assistant: "It is guaranteed to rise.",
            latencyMs: 1450,
            passed: false,
            assertions: 4,
            audio: {
              url: "https://voice.example.test/replay/call-1.wav",
              durationMs: 6200,
            },
            voiceMetrics: {
              timeToFirstWordMs: 1300,
              asrConfidence: 0.92,
            },
            failures: [
              {
                code: "forbidden_pattern_matched",
                message: "Agent promised investment appreciation.",
                severity: "critical",
              },
              {
                code: "voice_metric_exceeded",
                message: "Time to first word exceeded the pilot threshold.",
                severity: "major",
              },
            ],
          },
        ],
      },
    ],
  };
}
