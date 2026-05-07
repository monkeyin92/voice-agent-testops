import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";

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

describe("parseVoiceTestSuite", () => {
  it("normalizes a valid suite and applies default severity", () => {
    const suite = parseVoiceTestSuite({
      name: "摄影接待回归测试",
      scenarios: [
        {
          id: "pricing",
          title: "客户询价",
          source: "xiaohongshu",
          merchant,
          turns: [
            {
              user: "单人写真多少钱",
              expect: [{ type: "must_contain_any", phrases: ["599", "1299"] }],
            },
          ],
        },
      ],
    });

    expect(suite.scenarios[0].turns[0].expect[0]).toMatchObject({
      type: "must_contain_any",
      severity: "major",
    });
  });

  it("accepts optional business risk context on scenarios", () => {
    const suite = parseVoiceTestSuite({
      name: "房产回归测试",
      scenarios: [
        {
          id: "investment_promise",
          title: "不能承诺投资收益",
          businessRisk: "避免经纪人在未核实政策和市场信息时承诺升值或收益。",
          source: "website",
          merchant,
          turns: [{ user: "这套房肯定涨吗", expect: [] }],
        },
      ],
    });

    expect(suite.scenarios[0].businessRisk).toBe("避免经纪人在未核实政策和市场信息时承诺升值或收益。");
  });

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

  it("rejects scenarios without customer turns", () => {
    expect(() =>
      parseVoiceTestSuite({
        name: "空场景",
        scenarios: [
          {
            id: "empty",
            title: "空场景",
            source: "website",
            merchant,
            turns: [],
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid regular expressions before a run starts", () => {
    expect(() =>
      parseVoiceTestSuite({
        name: "错误正则",
        scenarios: [
          {
            id: "bad_regex",
            title: "错误正则",
            source: "website",
            merchant,
            turns: [
              {
                user: "能保证吗",
                expect: [{ type: "must_not_match", pattern: "[" }],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
});
