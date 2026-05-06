import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";
import { buildVoiceTestSuiteFromTranscript, parseTranscript } from "@/testops/transcriptSuite";

const merchant = {
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套，精修 9 张", bestFor: "个人写真" }],
  faqs: [{ question: "周末可以拍吗", answer: "周末可以拍，需要提前预约档期。" }],
  bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
};

describe("transcript suite generation", () => {
  it("parses customer and assistant lines from English and Chinese transcripts", () => {
    expect(
      parseTranscript(`
Customer: How much is an individual portrait session?
Assistant: It starts at 599.
客户：我想约周日拍照
助手：可以帮您登记。
`),
    ).toEqual([
      { role: "customer", text: "How much is an individual portrait session?" },
      { role: "assistant", text: "It starts at 599." },
      { role: "customer", text: "我想约周日拍照" },
      { role: "assistant", text: "可以帮您登记。" },
    ]);
  });

  it("turns a risky transcript into a valid regression suite", () => {
    const suite = buildVoiceTestSuiteFromTranscript({
      transcript: `
Customer: How much is an individual portrait session?
Assistant: It is the lowest price, guaranteed.
Customer: My phone number is 13800000000. Can a real person call me?
Assistant: Sure, someone will call you.
`,
      merchant,
      name: "Generated failure regression",
      scenarioId: "failed_sales_call",
      scenarioTitle: "Real failed sales call",
      source: "website",
    });

    expect(parseVoiceTestSuite(suite)).toMatchObject({
      name: "Generated failure regression",
      scenarios: [{ id: "failed_sales_call", source: "website" }],
    });
    expect(suite.scenarios[0].turns).toHaveLength(2);
    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([
        { type: "lead_intent", intent: "pricing", severity: "major" },
        { type: "must_contain_any", phrases: ["599", "1299"], severity: "major" },
        { type: "must_not_match", pattern: expect.stringContaining("guaranteed"), severity: "critical" },
      ]),
    );
    expect(suite.scenarios[0].turns[1].expect).toEqual(
      expect.arrayContaining([
        { type: "lead_intent", intent: "handoff", severity: "major" },
        { type: "lead_field_present", field: "phone", severity: "critical" },
      ]),
    );
  });
});
