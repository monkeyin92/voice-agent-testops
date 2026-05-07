import type { VoiceTestRunResult } from "./runner";
import { parseVoiceTestSuite, type VoiceTestScenario, type VoiceTestSeverity, type VoiceTestSuite } from "./schema";

export type FailureClusterItem = {
  scenarioId: string;
  scenarioTitle: string;
  turnIndex: number;
  code: string;
  severity: VoiceTestSeverity;
  message: string;
};

export type FailureCluster = {
  id: string;
  code: string;
  severity: VoiceTestSeverity;
  messageFingerprint: string;
  count: number;
  items: FailureClusterItem[];
};

const severityRank: Record<VoiceTestSeverity, number> = {
  minor: 1,
  major: 2,
  critical: 3,
};

export function buildFailureClusters(report: VoiceTestRunResult): FailureCluster[] {
  const clusterMap = new Map<string, FailureCluster>();

  for (const scenario of report.scenarios) {
    for (const turn of scenario.turns) {
      for (const failure of turn.failures) {
        const messageFingerprint = fingerprintFailureMessage(failure.message);
        const key = [failure.severity, failure.code, messageFingerprint].join("::");
        const item: FailureClusterItem = {
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          turnIndex: turn.index,
          code: failure.code,
          severity: failure.severity,
          message: failure.message,
        };
        const existing = clusterMap.get(key);

        if (existing) {
          existing.items.push(item);
          existing.count += 1;
          continue;
        }

        clusterMap.set(key, {
          id: key,
          code: failure.code,
          severity: failure.severity,
          messageFingerprint,
          count: 1,
          items: [item],
        });
      }
    }
  }

  return [...clusterMap.values()].sort(compareClusters);
}

export function renderFailureClusterMarkdown(report: VoiceTestRunResult, clusters: FailureCluster[]): string {
  const lines = [
    "# Voice Agent TestOps Failure Clusters",
    "",
    `Suite: ${report.suiteName}`,
    `Run: ${report.id}`,
    `Failures: ${report.summary.failures}`,
    `Clusters: ${clusters.length}`,
    "",
  ];

  if (clusters.length === 0) {
    lines.push("No failures found.", "");
    return `${lines.join("\n")}\n`;
  }

  clusters.forEach((cluster, index) => {
    lines.push(`## ${index + 1}. ${cluster.code} (${cluster.severity})`);
    lines.push("");
    lines.push(`Count: ${cluster.count}`);
    lines.push(`Message fingerprint: ${cluster.messageFingerprint}`);
    lines.push("");

    for (const item of cluster.items) {
      lines.push(`- ${item.scenarioTitle} / turn ${item.turnIndex + 1}`);
      lines.push(`  - ${item.message}`);
    }
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

export function buildRegressionSuiteDraft(sourceSuite: VoiceTestSuite, report: VoiceTestRunResult): VoiceTestSuite {
  const failedTurnIndexes = collectFailedTurnIndexes(report);
  const scenarios = sourceSuite.scenarios
    .filter((scenario) => failedTurnIndexes.has(scenario.id))
    .map((scenario) => buildDraftScenario(scenario, failedTurnIndexes.get(scenario.id) ?? new Set<number>(), report));

  if (scenarios.length === 0) {
    throw new Error("Report has no failed scenarios to draft into a regression suite");
  }

  return parseVoiceTestSuite({
    name: `Regression draft from ${report.suiteName}`,
    description:
      "Generated from a failed Voice Agent TestOps report. Review merchant facts, assertions, and business risk before using as a release gate.",
    scenarios,
  });
}

function buildDraftScenario(
  scenario: VoiceTestScenario,
  failedTurnIndexes: Set<number>,
  report: VoiceTestRunResult,
): VoiceTestScenario {
  const maxFailedTurnIndex = Math.max(...failedTurnIndexes);
  const failureSummary = scenarioFailures(report, scenario.id)
    .map((failure) => `${failure.code} (${failure.severity})`)
    .join(", ");

  return {
    ...scenario,
    description: [scenario.description, `Drafted from failed report: ${failureSummary}.`].filter(Boolean).join(" "),
    turns: scenario.turns.slice(0, maxFailedTurnIndex + 1),
  };
}

function collectFailedTurnIndexes(report: VoiceTestRunResult): Map<string, Set<number>> {
  const indexes = new Map<string, Set<number>>();

  for (const scenario of report.scenarios) {
    for (const turn of scenario.turns) {
      if (turn.failures.length === 0) {
        continue;
      }

      const scenarioIndexes = indexes.get(scenario.id) ?? new Set<number>();
      scenarioIndexes.add(turn.index);
      indexes.set(scenario.id, scenarioIndexes);
    }
  }

  return indexes;
}

function scenarioFailures(report: VoiceTestRunResult, scenarioId: string): FailureClusterItem[] {
  return report.scenarios
    .filter((scenario) => scenario.id === scenarioId)
    .flatMap((scenario) =>
      scenario.turns.flatMap((turn) =>
        turn.failures.map((failure) => ({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          turnIndex: turn.index,
          code: failure.code,
          severity: failure.severity,
          message: failure.message,
        })),
      ),
    );
}

function fingerprintFailureMessage(message: string): string {
  return message
    .toLowerCase()
    .replace(/\d+(?:\.\d+)?/g, "<number>")
    .replace(/["'“”‘’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compareClusters(left: FailureCluster, right: FailureCluster): number {
  return (
    severityRank[right.severity] - severityRank[left.severity] ||
    right.count - left.count ||
    left.code.localeCompare(right.code) ||
    left.messageFingerprint.localeCompare(right.messageFingerprint)
  );
}
