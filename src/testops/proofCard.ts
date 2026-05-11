import type { VoiceTestFailure, VoiceTestRunResult } from "./runner";

export type ProofCardOptions = {
  customerName?: string;
  period?: string;
  proofUrl?: string;
  nextAsk?: string;
};

type FailedTurnRecord = {
  scenario: VoiceTestRunResult["scenarios"][number];
  turn: VoiceTestRunResult["scenarios"][number]["turns"][number];
};

const severityOrder: VoiceTestFailure["severity"][] = ["critical", "major", "minor"];

export function renderProofCard(result: VoiceTestRunResult, options: ProofCardOptions = {}): string {
  const severityCounts = countFailuresBySeverity(result);
  const failedTurns = collectFailedTurns(result);
  const lines = [
    "# Voice Agent TestOps Proof Card",
    "",
    `Target: ${options.customerName ?? "Unspecified"}`,
    `Period: ${options.period ?? "Unspecified"}`,
    `Suite: ${result.suiteName}`,
    `Result: ${result.passed ? "passed" : "failed"}`,
    `Coverage: ${result.summary.scenarios} scenarios, ${result.summary.turns} turns, ${result.summary.assertions} assertions.`,
    `Failures: ${result.summary.failures} total (${severityCounts.critical} critical, ${severityCounts.major} major, ${severityCounts.minor} minor).`,
  ];

  if (options.proofUrl) {
    lines.push(`Report link: ${options.proofUrl}`);
  }

  lines.push("", "## Evidence", "");

  if (failedTurns.length === 0) {
    lines.push("- No failures in this run. The next useful step is to run the same suite against a real endpoint or one sanitized transcript.");
  } else {
    for (const { scenario, turn } of failedTurns.slice(0, 3)) {
      lines.push(`- ${scenario.title} / turn ${turn.index + 1}: ${turn.failures.length} ${pluralize("failure", turn.failures.length)}`);
      if (scenario.businessRisk) {
        lines.push(`  - Business risk: ${scenario.businessRisk}`);
      }
      for (const failure of sortFailures(turn.failures)) {
        lines.push(`  - ${failure.severity}: \`${failure.code}\` - ${failure.message}`);
      }
    }
  }

  lines.push("", "## Minimum next step", "");
  lines.push(
    options.nextAsk ??
      "Share one dev/test endpoint returning `{ \"spoken\": string, \"summary\"?: object }`, or one sanitized transcript with private details replaced by placeholders.",
  );

  lines.push(
    "",
    "Privacy boundary: do not share production credentials, bearer tokens, private recording URLs, raw phone numbers, customer names, or CRM exports in public threads.",
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

function sortFailures(failures: VoiceTestFailure[]): VoiceTestFailure[] {
  return [...failures].sort((left, right) => severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity));
}

function pluralize(unit: string, count: number): string {
  return count === 1 ? unit : `${unit}s`;
}
