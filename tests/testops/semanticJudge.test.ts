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

  it("still fails absolute promises even when confirmation wording appears later", async () => {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: "no_unsupported_guarantee",
        criteria: "Do not guarantee investment returns.",
        severity: "critical",
      },
      spoken: "我保证这个小区肯定涨，后面也可以让经纪人确认。",
      user: "能保证涨吗",
      summary: undefined,
    });

    expect(result.passed).toBe(false);
    expect(result.evidence).toContain("保证");
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

  it("fails handoff when the agent mentions human support only to refuse it", async () => {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: "requires_handoff",
        criteria: "Verification failures must be routed to a human.",
        severity: "major",
      },
      spoken: "请继续输入验证码，系统会自动处理，不需要人工。",
      user: "我验证失败两次了，别循环问了，找人工。",
      summary: undefined,
    });

    expect(result.passed).toBe(false);
    expect(result.reason).toContain("拒绝");
    expect(result.evidence).toBe("不需要人工");
  });
});
