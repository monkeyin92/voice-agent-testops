import type { VoiceTestRunResult } from "./runner";

export type VoiceTestFailureRecord = {
  key: string;
  scenarioId: string;
  scenarioTitle: string;
  turnIndex: number;
  code: string;
  severity: "minor" | "major" | "critical";
  message: string;
};

export type VoiceTestRunDiff = {
  baselineSuiteName: string;
  currentSuiteName: string;
  summary: {
    newFailures: number;
    newCriticalFailures: number;
    resolvedFailures: number;
    unchangedFailures: number;
  };
  newFailures: VoiceTestFailureRecord[];
  resolvedFailures: VoiceTestFailureRecord[];
  unchangedFailures: VoiceTestFailureRecord[];
};

export function diffVoiceTestReports(
  baseline: VoiceTestRunResult,
  current: VoiceTestRunResult,
): VoiceTestRunDiff {
  const baselineFailures = collectFailureRecords(baseline);
  const currentFailures = collectFailureRecords(current);
  const baselineByKey = new Map(baselineFailures.map((failure) => [failure.key, failure]));
  const currentByKey = new Map(currentFailures.map((failure) => [failure.key, failure]));
  const newFailures = currentFailures.filter((failure) => !baselineByKey.has(failure.key));
  const resolvedFailures = baselineFailures.filter((failure) => !currentByKey.has(failure.key));
  const unchangedFailures = currentFailures.filter((failure) => baselineByKey.has(failure.key));

  return {
    baselineSuiteName: baseline.suiteName,
    currentSuiteName: current.suiteName,
    summary: {
      newFailures: newFailures.length,
      newCriticalFailures: newFailures.filter((failure) => failure.severity === "critical").length,
      resolvedFailures: resolvedFailures.length,
      unchangedFailures: unchangedFailures.length,
    },
    newFailures,
    resolvedFailures,
    unchangedFailures,
  };
}

export function renderMarkdownDiff(diff: VoiceTestRunDiff): string {
  const lines = [
    "# Voice Agent TestOps Diff",
    "",
    `**Baseline:** ${diff.baselineSuiteName}`,
    `**Current:** ${diff.currentSuiteName}`,
    "",
    `New failures: ${diff.summary.newFailures} · New critical failures: ${diff.summary.newCriticalFailures} · Resolved failures: ${diff.summary.resolvedFailures} · Unchanged failures: ${diff.summary.unchangedFailures}`,
    "",
  ];

  appendFailureSection(lines, "New Failures", diff.newFailures);
  appendFailureSection(lines, "Resolved Failures", diff.resolvedFailures);
  appendFailureSection(lines, "Unchanged Failures", diff.unchangedFailures);

  return `${lines.join("\n")}\n`;
}

function collectFailureRecords(result: VoiceTestRunResult): VoiceTestFailureRecord[] {
  return result.scenarios.flatMap((scenario) =>
    scenario.turns.flatMap((turn) => {
      const codeOccurrences = new Map<string, number>();

      return turn.failures.map((failure) => {
        const occurrence = codeOccurrences.get(failure.code) ?? 0;
        codeOccurrences.set(failure.code, occurrence + 1);

        return {
          key: [scenario.id, turn.index, failure.code, occurrence].join("::"),
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          turnIndex: turn.index,
          code: failure.code,
          severity: failure.severity,
          message: failure.message,
        };
      });
    }),
  );
}

function appendFailureSection(lines: string[], title: string, failures: VoiceTestFailureRecord[]): void {
  lines.push(`## ${title}`, "");
  if (failures.length === 0) {
    lines.push("None.", "");
    return;
  }

  for (const failure of failures) {
    lines.push(`- ${failure.scenarioTitle} / turn ${failure.turnIndex + 1}`);
    lines.push(`  - \`${failure.code}\` (${failure.severity}): ${failure.message}`);
  }
  lines.push("");
}
