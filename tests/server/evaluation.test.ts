import { describe, expect, it } from "vitest";
import { evaluateLeadSummary } from "@/server/services/evaluation";

describe("evaluateLeadSummary", () => {
  it("flags missing phone for high intent lead", () => {
    const result = evaluateLeadSummary({
      source: "xiaohongshu",
      intent: "booking",
      level: "high",
      need: "想预约周末写真",
      questions: ["周末有没有档期"],
      nextAction: "老板确认档期",
      transcript: [{ role: "customer", text: "想预约周末写真", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("high_intent_missing_phone");
  });
});
