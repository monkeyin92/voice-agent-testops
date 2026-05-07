import type { VoiceTestFailure, VoiceTestRunResult } from "./runner";

export type CommercialPilotOptions = {
  customerName?: string;
  period?: string;
};

type FailedTurnRecord = {
  scenario: VoiceTestRunResult["scenarios"][number];
  turn: VoiceTestRunResult["scenarios"][number]["turns"][number];
};

const severityOrder: VoiceTestFailure["severity"][] = ["critical", "major", "minor"];

export function renderCommercialPilotReport(
  result: VoiceTestRunResult,
  options: CommercialPilotOptions = {},
): string {
  const failedTurns = collectFailedTurns(result);
  const severityCounts = countFailuresBySeverity(result);
  const audioEvidenceTurns = countTurnsWithAudioEvidence(result);
  const voiceMetricTurns = countTurnsWithVoiceMetricEvidence(result);
  const lines = [
    "# Commercial Pilot Report",
    "",
    `Customer: ${options.customerName ?? "Unspecified"}`,
    `Pilot period: ${options.period ?? "Unspecified"}`,
    `Suite: ${result.suiteName}`,
    `Run: ${result.startedAt} - ${result.finishedAt}`,
    "",
    "## Executive summary",
    "",
    `Launch recommendation: ${launchRecommendation(result)}`,
    `Coverage: ${result.summary.scenarios} scenarios, ${result.summary.turns} turns, ${result.summary.assertions} assertions.`,
    `Failures: ${result.summary.failures}. Critical: ${severityCounts.critical}. Major: ${severityCounts.major}. Minor: ${severityCounts.minor}.`,
    `Audio replay evidence: ${audioEvidenceTurns} ${pluralize("turn", audioEvidenceTurns)}.`,
    `Voice metric evidence: ${voiceMetricTurns} ${pluralize("turn", voiceMetricTurns)}.`,
    "",
    "## Highest-risk failed turns",
    "",
  ];

  if (failedTurns.length === 0) {
    lines.push("- No failed turns in this run; expand coverage with real production calls and newly observed edge cases.", "");
  } else {
    for (const { scenario, turn } of failedTurns.slice(0, 5)) {
      lines.push(`- ${scenario.title} / turn ${turn.index + 1}`);
      lines.push(`  - Customer: ${turn.user}`);
      if (scenario.businessRisk) {
        lines.push(`  - Business risk: ${scenario.businessRisk}`);
      }
      for (const failure of turn.failures) {
        lines.push(`  - ${failure.severity}: \`${failure.code}\` - ${failure.message}`);
      }
      if (turn.audio?.url) {
        lines.push(`  - Audio replay: ${turn.audio.url}`);
      }
    }
    lines.push("");
  }

  lines.push(
    "## Next pilot steps",
    "",
    "- Fix critical failures before increasing call volume.",
    "- Convert confirmed failures into permanent regression scenarios.",
    "- Review sampled production calls weekly and add new risk cases to the suite.",
    "- Keep minor copy drift visible, but gate releases on critical risk first.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function renderPilotReviewTemplate(
  result: VoiceTestRunResult,
  options: CommercialPilotOptions = {},
): string {
  const failedTurns = collectFailedTurns(result);
  const lines = [
    "# Pilot Review Template",
    "",
    `Customer: ${options.customerName ?? "Unspecified"}`,
    `Pilot period: ${options.period ?? "Unspecified"}`,
    `Suite: ${result.suiteName}`,
    "",
    "## Meeting snapshot",
    "",
    `Decision to make: ${reviewDecision(result)}`,
    `Run result: ${result.passed ? "passed" : "failed"} with ${result.summary.failures} failures across ${result.summary.turns} turns.`,
    "",
    "## Agenda",
    "",
    "1. Review launch recommendation and severity breakdown.",
    "2. Listen to audio replay evidence for high-risk turns.",
    "3. Assign owners for each blocking failure.",
    "4. Decide which real calls become regression tests.",
    "",
    "## Action items",
    "",
  ];

  if (failedTurns.length === 0) {
    lines.push("- [ ] Pick 5-10 real production calls to expand the next suite.");
    lines.push("- [ ] Confirm whether current pass criteria are strict enough for the pilot audience.");
  } else {
    for (const failure of uniqueFailures(failedTurns)) {
      lines.push(`- [ ] Assign owner for \`${failure.code}\` (${failure.severity})`);
    }
  }

  lines.push("", "## Regression assets to add", "");
  if (failedTurns.length === 0) {
    lines.push("- No failed turns from this run. Add sampled real-call edge cases next.");
  } else {
    for (const { scenario, turn } of failedTurns.slice(0, 5)) {
      lines.push(`- ${scenario.title} / turn ${turn.index + 1}: ${turn.user}`);
    }
  }

  lines.push(
    "",
    "## Open questions",
    "",
    "- Which failures should block launch versus remain visible as pilot observations?",
    "- Which business facts or tool states need stronger assertions?",
    "- Which production calls should be sampled before the next review?",
    "",
  );

  return `${lines.join("\n")}\n`;
}

function collectFailedTurns(result: VoiceTestRunResult): FailedTurnRecord[] {
  return result.scenarios.flatMap((scenario) =>
    scenario.turns
      .filter((turn) => turn.failures.length > 0)
      .map((turn) => ({
        scenario,
        turn,
      })),
  );
}

function countFailuresBySeverity(result: VoiceTestRunResult): Record<VoiceTestFailure["severity"], number> {
  return result.scenarios.reduce(
    (counts, scenario) => {
      for (const turn of scenario.turns) {
        for (const failure of turn.failures) {
          counts[failure.severity] += 1;
        }
      }
      return counts;
    },
    { critical: 0, major: 0, minor: 0 },
  );
}

function countTurnsWithAudioEvidence(result: VoiceTestRunResult): number {
  return result.scenarios.reduce(
    (count, scenario) =>
      count + scenario.turns.filter((turn) => typeof turn.audio?.url === "string" && turn.audio.url.trim().length > 0).length,
    0,
  );
}

function countTurnsWithVoiceMetricEvidence(result: VoiceTestRunResult): number {
  return result.scenarios.reduce(
    (count, scenario) =>
      count +
      scenario.turns.filter((turn) =>
        turn.voiceMetrics ? Object.values(turn.voiceMetrics).some((value) => typeof value === "number") : false,
      ).length,
    0,
  );
}

function uniqueFailures(failedTurns: FailedTurnRecord[]): VoiceTestFailure[] {
  const seen = new Set<string>();
  const failures: VoiceTestFailure[] = [];

  for (const severity of severityOrder) {
    for (const { turn } of failedTurns) {
      for (const failure of turn.failures) {
        const key = `${failure.code}:${failure.severity}`;
        if (failure.severity === severity && !seen.has(key)) {
          seen.add(key);
          failures.push(failure);
        }
      }
    }
  }

  return failures;
}

function launchRecommendation(result: VoiceTestRunResult): string {
  const severityCounts = countFailuresBySeverity(result);
  if (severityCounts.critical > 0) {
    return "Pause launch and fix critical risks";
  }
  if (severityCounts.major > 0) {
    return "Run a limited pilot after major issues are assigned";
  }
  return "Ready for a controlled pilot";
}

function reviewDecision(result: VoiceTestRunResult): string {
  return countFailuresBySeverity(result).critical > 0
    ? "Pause launch until critical risks are fixed"
    : "Approve controlled pilot scope and next coverage expansion";
}

function pluralize(unit: string, count: number): string {
  return count === 1 ? unit : `${unit}s`;
}
