import type { LeadSummary } from "@/domain/lead";

export type EvaluationResult = {
  passed: boolean;
  failures: string[];
};

export function evaluateLeadSummary(summary: LeadSummary): EvaluationResult {
  const failures: string[] = [];

  if (summary.level === "high" && !summary.phone) {
    failures.push("high_intent_missing_phone");
  }

  if (/一定|保证|最低价|百分百/.test(summary.nextAction)) {
    failures.push("unsafe_commitment");
  }

  if (summary.need.trim().length < 4) {
    failures.push("need_too_short");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
