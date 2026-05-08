import type {
  SemanticJudgeAnnotationIndustry,
  SemanticJudgeAnnotationLabel,
  SemanticJudgeAnnotationSample,
  SemanticJudgeAnnotationSet,
} from "./annotationSet";
import { createRuleBasedSemanticJudge, type VoiceSemanticJudge } from "./semanticJudge";
import type { SemanticJudgeRubric } from "./schema";

export type SemanticJudgeCalibrationStats = {
  total: number;
  agreements: number;
  disagreements: number;
  agreementRate: number;
  expectedPass: number;
  expectedFail: number;
  judgePass: number;
  judgeFail: number;
  expectedPassJudgeFail: number;
  expectedFailJudgePass: number;
};

export type SemanticJudgeCalibrationSampleResult = {
  id: string;
  industry: SemanticJudgeAnnotationIndustry;
  rubric: SemanticJudgeRubric;
  expected: SemanticJudgeAnnotationLabel;
  actual: SemanticJudgeAnnotationLabel;
  matched: boolean;
  severity: SemanticJudgeAnnotationSample["severity"];
  user: string;
  spoken: string;
  humanReason: string;
  humanEvidence?: string;
  judgeReason: string;
  judgeEvidence?: string;
};

export type SemanticJudgeCalibrationGroup = {
  key: string;
  industry?: SemanticJudgeAnnotationIndustry;
  rubric?: SemanticJudgeRubric;
  stats: SemanticJudgeCalibrationStats;
};

export type SemanticJudgeCalibrationReport = {
  annotationSet: {
    name: string;
    version: string;
    language: SemanticJudgeAnnotationSet["language"];
  };
  judge: string;
  generatedAt: string;
  summary: SemanticJudgeCalibrationStats;
  byIndustry: SemanticJudgeCalibrationGroup[];
  byRubric: SemanticJudgeCalibrationGroup[];
  byIndustryRubric: SemanticJudgeCalibrationGroup[];
  samples: SemanticJudgeCalibrationSampleResult[];
  disagreements: SemanticJudgeCalibrationSampleResult[];
};

export type SemanticJudgeCalibrationOptions = {
  judge?: VoiceSemanticJudge;
  judgeName?: string;
  generatedAt?: string;
};

export async function calibrateSemanticJudge(
  annotationSet: SemanticJudgeAnnotationSet,
  options: SemanticJudgeCalibrationOptions = {},
): Promise<SemanticJudgeCalibrationReport> {
  const judge = options.judge ?? createRuleBasedSemanticJudge();
  const samples: SemanticJudgeCalibrationSampleResult[] = [];

  for (const sample of annotationSet.samples) {
    const result = await judge({
      assertion: {
        type: "semantic_judge",
        rubric: sample.rubric,
        criteria: sample.criteria,
        severity: sample.severity,
      },
      spoken: sample.spoken,
      user: sample.user,
      summary: undefined,
    });
    const actual: SemanticJudgeAnnotationLabel = result.passed ? "pass" : "fail";

    samples.push({
      id: sample.id,
      industry: sample.industry,
      rubric: sample.rubric,
      expected: sample.expected,
      actual,
      matched: actual === sample.expected,
      severity: sample.severity,
      user: sample.user,
      spoken: sample.spoken,
      humanReason: sample.reason,
      humanEvidence: sample.evidence,
      judgeReason: result.reason,
      judgeEvidence: result.evidence,
    });
  }

  const disagreements = samples.filter((sample) => !sample.matched);

  return {
    annotationSet: {
      name: annotationSet.name,
      version: annotationSet.version,
      language: annotationSet.language,
    },
    judge: options.judgeName ?? "rule-based-local",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    summary: summarizeCalibrationSamples(samples),
    byIndustry: buildCalibrationGroups(
      samples,
      (sample) => sample.industry,
      (key) => ({ industry: key as SemanticJudgeAnnotationIndustry }),
    ),
    byRubric: buildCalibrationGroups(
      samples,
      (sample) => sample.rubric,
      (key) => ({ rubric: key as SemanticJudgeRubric }),
    ),
    byIndustryRubric: buildCalibrationGroups(
      samples,
      (sample) => `${sample.industry}:${sample.rubric}`,
      (key) => {
        const [industry, rubric] = key.split(":") as [SemanticJudgeAnnotationIndustry, SemanticJudgeRubric];
        return { industry, rubric };
      },
    ),
    samples,
    disagreements,
  };
}

export function renderSemanticJudgeCalibrationMarkdown(
  report: SemanticJudgeCalibrationReport,
  options: { maxExamples?: number } = {},
): string {
  const maxExamples = options.maxExamples ?? report.disagreements.length;
  const lines = [
    "# Semantic Judge Calibration Report",
    "",
    `Annotation set: ${report.annotationSet.name}`,
    `Version: ${report.annotationSet.version}`,
    `Language: ${report.annotationSet.language}`,
    `Judge: ${report.judge}`,
    `Generated at: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    renderStatsList(report.summary),
    "",
    "## By Industry",
    "",
    renderGroupTable(report.byIndustry, (group) => group.industry ?? group.key),
    "",
    "## By Rubric",
    "",
    renderGroupTable(report.byRubric, (group) => group.rubric ?? group.key),
    "",
    "## By Industry / Rubric",
    "",
    renderGroupTable(report.byIndustryRubric, (group) => `${group.industry}:${group.rubric}`),
    "",
    "## Disagreement Samples",
    "",
  ];

  if (report.disagreements.length === 0) {
    lines.push("No disagreements found.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push(`Showing ${Math.min(maxExamples, report.disagreements.length)} of ${report.disagreements.length} disagreements.`, "");
  for (const sample of report.disagreements.slice(0, maxExamples)) {
    lines.push(`### ${sample.id}`);
    lines.push("");
    lines.push(`Industry / rubric: ${sample.industry} / ${sample.rubric}`);
    lines.push(`Expected: ${sample.expected}`);
    lines.push(`Judge: ${sample.actual}`);
    lines.push(`Severity: ${sample.severity}`);
    lines.push(`User: ${sample.user}`);
    lines.push(`Spoken: ${sample.spoken}`);
    lines.push(`Human reason: ${sample.humanReason}`);
    if (sample.humanEvidence) {
      lines.push(`Human evidence: ${sample.humanEvidence}`);
    }
    lines.push(`Judge reason: ${sample.judgeReason}`);
    if (sample.judgeEvidence) {
      lines.push(`Judge evidence: ${sample.judgeEvidence}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function summarizeCalibrationSamples(samples: SemanticJudgeCalibrationSampleResult[]): SemanticJudgeCalibrationStats {
  const total = samples.length;
  const agreements = samples.filter((sample) => sample.matched).length;
  const expectedPass = samples.filter((sample) => sample.expected === "pass").length;
  const judgePass = samples.filter((sample) => sample.actual === "pass").length;

  return {
    total,
    agreements,
    disagreements: total - agreements,
    agreementRate: total === 0 ? 0 : agreements / total,
    expectedPass,
    expectedFail: total - expectedPass,
    judgePass,
    judgeFail: total - judgePass,
    expectedPassJudgeFail: samples.filter((sample) => sample.expected === "pass" && sample.actual === "fail").length,
    expectedFailJudgePass: samples.filter((sample) => sample.expected === "fail" && sample.actual === "pass").length,
  };
}

function buildCalibrationGroups(
  samples: SemanticJudgeCalibrationSampleResult[],
  keyForSample: (sample: SemanticJudgeCalibrationSampleResult) => string,
  metadataForKey: (key: string) => Pick<SemanticJudgeCalibrationGroup, "industry" | "rubric">,
): SemanticJudgeCalibrationGroup[] {
  const groups = new Map<string, SemanticJudgeCalibrationSampleResult[]>();

  for (const sample of samples) {
    const key = keyForSample(sample);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, groupSamples]) => ({
      key,
      ...metadataForKey(key),
      stats: summarizeCalibrationSamples(groupSamples),
    }));
}

function renderStatsList(stats: SemanticJudgeCalibrationStats): string {
  return [
    `- Samples: ${stats.total}`,
    `- Agreements: ${stats.agreements}`,
    `- Disagreements: ${stats.disagreements}`,
    `- Agreement rate: ${formatPercent(stats.agreementRate)}`,
    `- Judge pass rate: ${formatPercent(rate(stats.judgePass, stats.total))}`,
    `- Expected pass/fail: ${stats.expectedPass}/${stats.expectedFail}`,
    `- Judge pass/fail: ${stats.judgePass}/${stats.judgeFail}`,
    `- Expected pass -> judge fail: ${stats.expectedPassJudgeFail}`,
    `- Expected fail -> judge pass: ${stats.expectedFailJudgePass}`,
  ].join("\n");
}

function renderGroupTable(
  groups: SemanticJudgeCalibrationGroup[],
  labelForGroup: (group: SemanticJudgeCalibrationGroup) => string,
): string {
  const lines = [
    "| Group | Samples | Agreement | Judge pass rate | Expected pass/fail | Judge pass/fail | Disagreements | Expected pass -> judge fail | Expected fail -> judge pass |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  ];

  for (const group of groups) {
    const stats = group.stats;
    lines.push(
      `| ${[
        tableCell(labelForGroup(group)),
        stats.total,
        formatPercent(stats.agreementRate),
        formatPercent(rate(stats.judgePass, stats.total)),
        `${stats.expectedPass}/${stats.expectedFail}`,
        `${stats.judgePass}/${stats.judgeFail}`,
        stats.disagreements,
        stats.expectedPassJudgeFail,
        stats.expectedFailJudgePass,
      ].join(" | ")} |`,
    );
  }

  return lines.join("\n");
}

function rate(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function tableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
