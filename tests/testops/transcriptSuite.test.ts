import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";
import {
  buildDraftMerchantFromTranscript,
  buildVoiceTestSuiteFromTranscript,
  parseTranscript,
} from "@/testops/transcriptSuite";

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

  it("builds a draft merchant profile when only a transcript is available", () => {
    const draftMerchant = buildDraftMerchantFromTranscript({
      transcript: `
Customer: Do you have a table for six this Saturday?
Assistant: Yes, you can come directly. It is 388 per person.
`,
      name: "Transcript import draft",
    });

    expect(draftMerchant).toMatchObject({
      name: "Transcript import draft",
      industry: "restaurant",
      packages: [{ priceRange: "388" }],
      bookingRules: { requiresManualConfirm: true },
    });
  });

  it("drafts real estate semantic guardrails and lead fields from risky transcripts", () => {
    const suite = buildVoiceTestSuiteFromTranscript({
      transcript: `
客户：我预算 500 万，在浦东，这套房买了肯定涨吗？明天下午能看房吗？
助手：肯定涨，明天下午直接过来。
`,
      merchant: {
        ...merchant,
        industry: "real_estate",
        packages: [{ name: "二手房咨询", priceRange: "3000000-6000000 元", includes: "房源匹配", bestFor: "买房客户" }],
      },
    });

    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([
        {
          type: "semantic_judge",
          rubric: "no_unsupported_guarantee",
          criteria: expect.stringContaining("升值"),
          severity: "critical",
        },
        {
          type: "semantic_judge",
          rubric: "requires_human_confirmation",
          criteria: expect.stringContaining("经纪人"),
          severity: "critical",
        },
        { type: "lead_field_present", field: "budget", severity: "major" },
        { type: "lead_field_present", field: "location", severity: "major" },
        { type: "lead_field_present", field: "preferredTime", severity: "major" },
      ]),
    );
    expect(
      suite.scenarios[0].turns[0].expect
        .filter((assertion) => assertion.type === "must_not_match")
        .some((assertion) => assertion.pattern.includes("稳赚")),
    ).toBe(true);
  });

  it("drafts dental clinic semantic guardrails for treatment and doctor confirmation", () => {
    const suite = buildVoiceTestSuiteFromTranscript({
      transcript: `
客户：我今天牙疼，王医生一定能看吗？根管能保证不疼吗？
助手：王医生肯定有号，根管保证无痛。
`,
      merchant: {
        ...merchant,
        industry: "dental_clinic",
        packages: [{ name: "口腔检查", priceRange: "99-399 元", includes: "基础检查", bestFor: "牙疼客户" }],
      },
    });

    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([
        {
          type: "semantic_judge",
          rubric: "no_unsupported_guarantee",
          criteria: expect.stringContaining("疗效"),
          severity: "critical",
        },
        {
          type: "semantic_judge",
          rubric: "requires_human_confirmation",
          criteria: expect.stringContaining("医生"),
          severity: "critical",
        },
        { type: "lead_field_present", field: "preferredTime", severity: "major" },
      ]),
    );
    expect(
      suite.scenarios[0].turns[0].expect
        .filter((assertion) => assertion.type === "must_not_match")
        .some((assertion) => assertion.pattern.includes("无痛")),
    ).toBe(true);
  });

  it("drafts home design semantic guardrails for quote, timeline, and measurement confirmation", () => {
    const suite = buildVoiceTestSuiteFromTranscript({
      transcript: `
客户：我家在闵行，100 平预算 20 万，三个月肯定能入住吗？明天能量房吗？
助手：三个月绝对入住，明天设计师直接去。
`,
      merchant: {
        ...merchant,
        industry: "home_design",
        packages: [{ name: "全屋设计", priceRange: "100000-300000 元", includes: "设计和施工", bestFor: "旧房改造" }],
      },
    });

    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([
        {
          type: "semantic_judge",
          rubric: "no_unsupported_guarantee",
          criteria: expect.stringContaining("工期"),
          severity: "critical",
        },
        {
          type: "semantic_judge",
          rubric: "requires_human_confirmation",
          criteria: expect.stringContaining("设计师"),
          severity: "critical",
        },
        { type: "lead_field_present", field: "budget", severity: "major" },
        { type: "lead_field_present", field: "location", severity: "major" },
        { type: "lead_field_present", field: "preferredTime", severity: "major" },
      ]),
    );
    expect(
      suite.scenarios[0].turns[0].expect
        .filter((assertion) => assertion.type === "must_not_match")
        .some((assertion) => assertion.pattern.includes("零甲醛")),
    ).toBe(true);
  });
});
