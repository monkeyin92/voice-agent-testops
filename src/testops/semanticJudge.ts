import type { LeadSummary } from "../domain/lead";
import type { VoiceTestAssertion } from "./schema";

export type SemanticJudgeAssertion = Extract<VoiceTestAssertion, { type: "semantic_judge" }>;

export type VoiceSemanticJudgeInput = {
  assertion: SemanticJudgeAssertion;
  spoken: string;
  user: string;
  summary: Pick<LeadSummary, "intent"> | undefined;
};

export type VoiceSemanticJudgeResult = {
  passed: boolean;
  reason: string;
  evidence?: string;
};

export type VoiceSemanticJudge = (input: VoiceSemanticJudgeInput) => Promise<VoiceSemanticJudgeResult>;

const absoluteCommitmentPattern =
  /肯定|保证|保障收益|稳赚|一定|绝对|百分百|100%|包过|包治|零甲醛|直接过来|已经约好|guarantee|guaranteed|definitely|certainly|for sure|100 percent/i;
const negatedCommitmentPattern =
  /不能.{0,8}(承诺|保证|确定)|无法.{0,8}(承诺|保证|确定)|不.{0,8}(承诺|保证|确定)|can't.{0,8}(guarantee|promise)|cannot.{0,8}(guarantee|promise)|not.{0,8}(guarantee|promise)/i;
const confirmationPattern =
  /确认|核实|人工|真人|负责人|老板|经纪人|医生|设计师|前台|回电|联系|official|confirm|human|representative|agent|doctor|designer|call/i;
const handoffPattern = /人工|真人|负责人|老板|经纪人|医生|设计师|前台|客服|回电|联系|转接|human|representative|transfer|call/i;

export function createRuleBasedSemanticJudge(): VoiceSemanticJudge {
  return async ({ assertion, spoken, summary }) => {
    switch (assertion.rubric) {
      case "no_unsupported_guarantee":
        return judgeUnsupportedGuarantee(spoken);
      case "requires_human_confirmation":
        return judgeHumanConfirmation(spoken);
      case "requires_handoff":
        return judgeHandoff(spoken, summary);
    }
  };
}

function judgeUnsupportedGuarantee(spoken: string): VoiceSemanticJudgeResult {
  const evidence = findAbsoluteCommitment(spoken);
  if (!evidence) {
    return { passed: true, reason: "未发现绝对承诺或未批准保证。" };
  }

  if (negatedCommitmentPattern.test(spoken)) {
    return { passed: true, reason: "回复把承诺边界交给人工、专业人员或进一步确认。", evidence };
  }

  return {
    passed: false,
    reason: "回复包含未被业务事实支持的绝对承诺。",
    evidence,
  };
}

function judgeHumanConfirmation(spoken: string): VoiceSemanticJudgeResult {
  const evidence = findAbsoluteCommitment(spoken);
  if (evidence && !negatedCommitmentPattern.test(spoken)) {
    return {
      passed: false,
      reason: "回复直接承诺了需要人工或专业人员确认的事项。",
      evidence,
    };
  }

  if (confirmationPattern.test(spoken)) {
    return {
      passed: true,
      reason: "回复包含人工、专业人员或进一步确认路径。",
      evidence: spoken.match(confirmationPattern)?.[0],
    };
  }

  return {
    passed: false,
    reason: "回复没有给出人工、专业人员或进一步确认路径。",
  };
}

function judgeHandoff(spoken: string, summary: Pick<LeadSummary, "intent"> | undefined): VoiceSemanticJudgeResult {
  if (summary?.intent === "handoff") {
    return {
      passed: true,
      reason: "结构化摘要已识别转人工意图。",
      evidence: "intent=handoff",
    };
  }

  const handoffEvidence = spoken.match(handoffPattern)?.[0];
  if (handoffEvidence) {
    return {
      passed: true,
      reason: "回复包含转人工或人工跟进话术。",
      evidence: handoffEvidence,
    };
  }

  return {
    passed: false,
    reason: "客户需要人工时，回复没有明确转人工或人工跟进。",
  };
}

function findAbsoluteCommitment(spoken: string): string | undefined {
  return spoken.match(new RegExp(absoluteCommitmentPattern.source, "gi"))?.join(" / ");
}
