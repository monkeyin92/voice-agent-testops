import type { Industry } from "../domain/merchant";
import type { VoiceTestAssertion, VoiceTestSeverity, VoiceTestSuite } from "./schema";
import { parseTranscript } from "./transcriptSuite";

export type TranscriptIntakePreset = "insurance";

export type TranscriptIntakeDefaults = {
  industry: Industry;
  merchantName: string;
  suiteName: string;
  scenarioId: string;
  scenarioTitle: string;
};

const transcriptIntakeDefaults: Record<TranscriptIntakePreset, TranscriptIntakeDefaults> = {
  insurance: {
    industry: "insurance",
    merchantName: "Insurance transcript intake",
    suiteName: "Insurance transcript regression intake",
    scenarioId: "insurance_transcript_failure",
    scenarioTitle: "Insurance transcript failure",
  },
};

export type TranscriptIntakeArtifactPaths = {
  suitePath?: string;
  merchantPath?: string;
  summaryPath?: string;
};

export type TranscriptIntakeRiskSignal = {
  tag: string;
  severity: VoiceTestSeverity;
  count: number;
  note: string;
};

export type TranscriptIntakePrivacyWarning = {
  tag: string;
  count: number;
  note: string;
};

export type TranscriptIntakeTriageReport = {
  generatedAt: string;
  sourcePath?: string;
  suiteName: string;
  scenarioId: string;
  scenarioTitle: string;
  merchantName: string;
  industry: Industry;
  selectedTurnRole: "customer" | "assistant";
  totalMessages: number;
  customerTurns: number;
  assistantTurns: number;
  generatedTurns: number;
  assertionCount: number;
  assertionTypeCounts: Array<{ type: VoiceTestAssertion["type"]; count: number }>;
  severityCounts: Array<{ severity: VoiceTestSeverity; count: number }>;
  riskSignals: TranscriptIntakeRiskSignal[];
  privacyWarnings: TranscriptIntakePrivacyWarning[];
  artifacts: TranscriptIntakeArtifactPaths;
  nextSteps: string[];
};

export type AnalyzeTranscriptIntakeOptions = {
  transcript: string;
  suite: VoiceTestSuite;
  sourcePath?: string;
  selectedTurnRole: "customer" | "assistant";
  artifacts?: TranscriptIntakeArtifactPaths;
};

export function parseTranscriptIntakePreset(value: string): TranscriptIntakePreset {
  if (value === "insurance") {
    return value;
  }

  throw new Error("--intake must be insurance");
}

export function getTranscriptIntakeDefaults(preset: TranscriptIntakePreset): TranscriptIntakeDefaults {
  return transcriptIntakeDefaults[preset];
}

export function analyzeTranscriptIntake(options: AnalyzeTranscriptIntakeOptions): TranscriptIntakeTriageReport {
  const messages = parseTranscript(options.transcript);
  const scenario = options.suite.scenarios[0];
  const assertions = scenario.turns.flatMap((turn) => turn.expect);
  const suitePath = options.artifacts?.suitePath ?? ".voice-testops/transcript-intake/suite.json";

  return {
    generatedAt: new Date().toISOString(),
    sourcePath: options.sourcePath,
    suiteName: options.suite.name,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    merchantName: scenario.merchant.name,
    industry: scenario.merchant.industry,
    selectedTurnRole: options.selectedTurnRole,
    totalMessages: messages.length,
    customerTurns: messages.filter((message) => message.role === "customer").length,
    assistantTurns: messages.filter((message) => message.role === "assistant").length,
    generatedTurns: scenario.turns.length,
    assertionCount: assertions.length,
    assertionTypeCounts: countAssertionsByType(assertions),
    severityCounts: countAssertionsBySeverity(assertions),
    riskSignals: buildRiskSignals(assertions),
    privacyWarnings: detectTranscriptPrivacyWarnings(options.transcript),
    artifacts: options.artifacts ?? {},
    nextSteps: buildTranscriptIntakeNextSteps(suitePath),
  };
}

export function renderTranscriptIntakeMarkdown(report: TranscriptIntakeTriageReport): string {
  const lines = [
    "# Voice Agent TestOps Transcript Intake",
    "",
    `Generated: ${report.generatedAt}`,
    report.sourcePath ? "Source: file input" : "Source: stdin",
    "",
    "Privacy: raw transcript text is not included in this summary. Keep the transcript and generated suite in a private workspace unless the data owner explicitly approves public sharing.",
    "",
    "## Triage",
    "",
    "| Metric | Value |",
    "|---|---:|",
    `| Total messages | ${report.totalMessages} |`,
    `| Customer turns | ${report.customerTurns} |`,
    `| Assistant turns | ${report.assistantTurns} |`,
    `| Generated ${report.selectedTurnRole} turns | ${report.generatedTurns} |`,
    `| Draft assertions | ${report.assertionCount} |`,
    "",
    "## Generated Draft",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Suite | ${markdownCode(report.suiteName)} |`,
    `| Scenario | ${markdownCode(`${report.scenarioId} - ${report.scenarioTitle}`)} |`,
    `| Merchant | ${markdownCode(`${report.merchantName} (${report.industry})`)} |`,
    `| Turn role | ${markdownCode(report.selectedTurnRole)} |`,
    "",
    "## Assertion Mix",
    "",
    "| Assertion type | Count |",
    "|---|---:|",
    ...formatCountRows(report.assertionTypeCounts, "No assertions generated."),
    "",
    "## Severity Mix",
    "",
    "| Severity | Count |",
    "|---|---:|",
    ...formatCountRows(report.severityCounts, "No assertions generated."),
    "",
    "## Risk Signals",
    "",
    "| Signal | Severity | Count | Note |",
    "|---|---|---:|---|",
    ...formatRiskSignalRows(report.riskSignals),
    "",
    "## Privacy Warnings",
    "",
    "| Warning | Count | Note |",
    "|---|---:|---|",
    ...formatPrivacyWarningRows(report.privacyWarnings),
    "",
    "## Generated Artifacts",
    "",
    ...formatArtifactRows(report.artifacts),
    "",
    "## Next Steps",
    "",
    ...report.nextSteps.map((step) => `- ${step}`),
    "",
  ];

  return `${lines.join("\n")}`;
}

function countAssertionsByType(assertions: VoiceTestAssertion[]): Array<{ type: VoiceTestAssertion["type"]; count: number }> {
  const counts = new Map<VoiceTestAssertion["type"], number>();
  for (const assertion of assertions) {
    counts.set(assertion.type, (counts.get(assertion.type) ?? 0) + 1);
  }

  return [...counts.entries()].map(([type, count]) => ({ type, count }));
}

function countAssertionsBySeverity(assertions: VoiceTestAssertion[]): Array<{ severity: VoiceTestSeverity; count: number }> {
  const counts = new Map<VoiceTestSeverity, number>([
    ["critical", 0],
    ["major", 0],
    ["minor", 0],
  ]);
  for (const assertion of assertions) {
    counts.set(assertion.severity, (counts.get(assertion.severity) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 0)
    .map(([severity, count]) => ({ severity, count }));
}

function buildRiskSignals(assertions: VoiceTestAssertion[]): TranscriptIntakeRiskSignal[] {
  const signals = new Map<string, TranscriptIntakeRiskSignal>();
  for (const assertion of assertions) {
    const signal = riskSignalForAssertion(assertion);
    if (!signal) {
      continue;
    }

    const existing = signals.get(signal.tag);
    if (existing) {
      existing.count += 1;
      existing.severity = higherSeverity(existing.severity, signal.severity);
    } else {
      signals.set(signal.tag, { ...signal, count: 1 });
    }
  }

  return [...signals.values()];
}

function riskSignalForAssertion(assertion: VoiceTestAssertion): Omit<TranscriptIntakeRiskSignal, "count"> | undefined {
  if (assertion.type === "semantic_judge") {
    const notes: Record<typeof assertion.rubric, string> = {
      no_unsupported_guarantee: "Transcript suggests an unsupported promise or guarantee should be guarded.",
      requires_human_confirmation: "Transcript touches facts that need human or system confirmation.",
      requires_handoff: "Transcript contains a human handoff, escalation, opt-out, or refusal pattern.",
    };
    return { tag: assertion.rubric, severity: assertion.severity, note: notes[assertion.rubric] };
  }

  if (assertion.type === "lead_field_present") {
    return {
      tag: `lead_field_${assertion.field}`,
      severity: assertion.severity,
      note: `Generated suite expects structured lead field ${assertion.field}.`,
    };
  }

  if (assertion.type === "must_not_match") {
    return {
      tag: "forbidden_phrase_guard",
      severity: assertion.severity,
      note: "Generated suite includes a forbidden wording or promise guard.",
    };
  }

  if (assertion.type === "must_contain_any") {
    return {
      tag: "required_phrase_or_fact",
      severity: assertion.severity,
      note: "Generated suite expects approved wording, facts, or collection prompts.",
    };
  }

  if (assertion.type === "max_latency_ms") {
    return {
      tag: "latency_guard",
      severity: assertion.severity,
      note: "Generated suite includes a basic response latency guard.",
    };
  }

  return undefined;
}

function detectTranscriptPrivacyWarnings(transcript: string): TranscriptIntakePrivacyWarning[] {
  const warnings: TranscriptIntakePrivacyWarning[] = [];
  addWarning(
    warnings,
    "possible_url",
    countMatches(transcript, /\b(?:https?:\/\/|s3:\/\/|gs:\/\/)\S+/gi),
    "Replace private URLs, replay links, and recording links with placeholders before sharing.",
  );
  addWarning(
    warnings,
    "possible_email",
    countMatches(transcript, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi),
    "Replace email addresses with placeholders such as [EMAIL].",
  );
  addWarning(
    warnings,
    "possible_phone_or_account_number",
    countMatches(transcript, /(?:\+?\d[\s().-]?){7,}/g),
    "Replace phone numbers and account-like numeric identifiers with stable placeholders.",
  );
  addWarning(
    warnings,
    "possible_secret",
    countMatches(transcript, /\b(?:bearer\s+[a-z0-9._-]+|api[_-]?key|secret|token|sk-[a-z0-9_-]+)/gi),
    "Remove API keys, bearer tokens, secrets, and production credentials.",
  );

  return warnings;
}

function addWarning(
  warnings: TranscriptIntakePrivacyWarning[],
  tag: string,
  count: number,
  note: string,
): void {
  if (count > 0) {
    warnings.push({ tag, count, note });
  }
}

function countMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

function buildTranscriptIntakeNextSteps(suitePath: string): string[] {
  return [
    `Validate the draft: ${markdownCode(`npx voice-agent-testops validate --suite ${suitePath}`)}`,
    `If an endpoint is available, run doctor first: ${markdownCode(`npx voice-agent-testops doctor --agent http --endpoint "$VOICE_AGENT_ENDPOINT" --suite ${suitePath}`)}`,
    `Run the pilot suite and write a private summary: ${markdownCode(`npx voice-agent-testops run --agent http --endpoint "$VOICE_AGENT_ENDPOINT" --suite ${suitePath} --summary .voice-testops/transcript-intake/run-summary.md`)}`,
    "Review generated assertions before using the suite as a CI gate.",
    "Share aggregate findings only; do not quote raw transcript text publicly unless explicitly authorized.",
  ];
}

function higherSeverity(a: VoiceTestSeverity, b: VoiceTestSeverity): VoiceTestSeverity {
  const rank: Record<VoiceTestSeverity, number> = { critical: 3, major: 2, minor: 1 };
  return rank[a] >= rank[b] ? a : b;
}

function formatCountRows<T extends { count: number }>(
  rows: T[],
  empty: string,
): string[] {
  if (rows.length === 0) {
    return [`| ${empty} | 0 |`];
  }

  return rows.map((row) => {
    const label = "type" in row ? String(row.type) : "severity" in row ? String(row.severity) : "item";
    return `| ${markdownCode(label)} | ${row.count} |`;
  });
}

function formatRiskSignalRows(signals: TranscriptIntakeRiskSignal[]): string[] {
  if (signals.length === 0) {
    return ["| none | - | 0 | No obvious risk signal was inferred. |"];
  }

  return signals.map((signal) => `| ${markdownCode(signal.tag)} | ${signal.severity} | ${signal.count} | ${signal.note} |`);
}

function formatPrivacyWarningRows(warnings: TranscriptIntakePrivacyWarning[]): string[] {
  if (warnings.length === 0) {
    return ["| none | 0 | No obvious raw URL, email, phone/account number, or secret pattern detected. |"];
  }

  return warnings.map((warning) => `| ${markdownCode(warning.tag)} | ${warning.count} | ${warning.note} |`);
}

function formatArtifactRows(artifacts: TranscriptIntakeArtifactPaths): string[] {
  const rows: string[] = [];

  if (artifacts.suitePath) {
    rows.push(`- Suite draft: ${markdownCode(artifacts.suitePath)}`);
  }
  if (artifacts.merchantPath) {
    rows.push(`- Merchant draft: ${markdownCode(artifacts.merchantPath)}`);
  }
  if (artifacts.summaryPath) {
    rows.push(`- Intake summary: ${markdownCode(artifacts.summaryPath)}`);
  }

  return rows.length > 0 ? rows : ["- No files were requested."];
}

function markdownCode(value: string): string {
  return `\`${value.replace(/`/g, "\\`")}\``;
}
