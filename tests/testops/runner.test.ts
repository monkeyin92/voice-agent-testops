import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";
import { runVoiceTestSuite } from "@/testops/runner";
import type { VoiceAgentExecutor } from "@/testops/agents";

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

function scriptedClock(values: number[]) {
  let index = 0;
  return {
    now: () => values[index++] ?? values[values.length - 1] ?? 0,
    iso: () => "2026-05-03T10:00:00.000Z",
  };
}

describe("runVoiceTestSuite", () => {
  it("passes a scenario when the agent reply satisfies every assertion", async () => {
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
              expect: [
                { type: "must_contain_any", phrases: ["599", "1299"] },
                { type: "lead_intent", intent: "pricing" },
                { type: "max_latency_ms", value: 250 },
              ],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "单人写真一般是 599-1299 元，我可以先帮你记录需求。",
      summary: {
        source: "xiaohongshu",
        intent: "pricing",
        level: "medium",
        need: "客户咨询单人写真价格",
        questions: ["单人写真多少钱"],
        nextAction: "请老板跟进报价和档期",
        transcript: [{ role: "assistant", text: "单人写真一般是 599-1299 元", at: "2026-05-03T10:00:00.000Z" }],
      },
    });

    const result = await runVoiceTestSuite(suite, agent, { clock: scriptedClock([0, 120]) });

    expect(result.passed).toBe(true);
    expect(result.summary).toMatchObject({ scenarios: 1, turns: 1, failures: 0 });
  });

  it("returns actionable failures for unsafe promises and latency breaches", async () => {
    const suite = parseVoiceTestSuite({
      name: "安全回归测试",
      scenarios: [
        {
          id: "unsafe",
          title: "客户要求承诺效果",
          source: "website",
          merchant,
          turns: [
            {
              user: "能不能保证拍得好看",
              expect: [
                { type: "must_not_match", pattern: "保证|百分百" },
                { type: "max_latency_ms", value: 100 },
              ],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "可以保证拍得好看，百分百满意。",
      summary: {
        source: "website",
        intent: "service_info",
        level: "low",
        need: "客户询问效果承诺",
        questions: ["能不能保证拍得好看"],
        nextAction: "承诺客户效果",
        transcript: [{ role: "assistant", text: "可以保证拍得好看，百分百满意。", at: "2026-05-03T10:00:00.000Z" }],
      },
    });

    const result = await runVoiceTestSuite(suite, agent, { clock: scriptedClock([0, 180]) });

    expect(result.passed).toBe(false);
    expect(result.summary.failures).toBe(2);
    expect(result.scenarios[0].turns[0].failures.map((failure) => failure.code)).toEqual([
      "forbidden_pattern_matched",
      "latency_exceeded",
    ]);
  });
});
