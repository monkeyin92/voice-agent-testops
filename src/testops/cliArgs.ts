import type { ReportLocale } from "./report";
import type { VoiceTestSeverity } from "./schema";

export type VoiceTestCliArgs = {
  suitePath: string;
  agent: "local-receptionist" | "http" | "openclaw" | "sip" | "transcript";
  endpoint?: string;
  apiKey?: string;
  openClawMode: "custom" | "responses";
  transcriptPath?: string;
  sipDriverCommand?: string;
  sipUri?: string;
  sipProxy?: string;
  sipFrom?: string;
  sipCallTimeoutMs?: number;
  sipDriverRetries?: number;
  sipMediaDir?: string;
  reportLocale: ReportLocale;
  failOnSeverity?: VoiceTestSeverity;
  jsonPath: string;
  htmlPath: string;
  summaryPath?: string;
  junitPath?: string;
  baselinePath?: string;
  diffMarkdownPath?: string;
  failOnNew: boolean;
};

export function parseCliArgs(argv: string[]): VoiceTestCliArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const flagArgs = new Set(["fail-on-new"]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const name = arg.slice(2);
    if (flagArgs.has(name)) {
      flags.add(name);
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(name, value);
    index += 1;
  }

  const suitePath = values.get("suite");
  if (!suitePath) {
    throw new Error("--suite is required");
  }

  const agent = values.get("agent") ?? "local-receptionist";
  if (agent !== "local-receptionist" && agent !== "http" && agent !== "openclaw" && agent !== "sip" && agent !== "transcript") {
    throw new Error("--agent must be local-receptionist, http, openclaw, sip, or transcript");
  }

  const endpoint = values.get("endpoint");
  if ((agent === "http" || agent === "openclaw") && !endpoint) {
    throw new Error(`--endpoint is required for --agent ${agent}`);
  }
  const transcriptPath = values.get("transcript") ?? values.get("input");
  if (agent === "transcript" && !transcriptPath) {
    throw new Error("--transcript or --input is required for --agent transcript");
  }
  const sipDriverCommand = values.get("sip-driver-command") ?? process.env.VOICE_TESTOPS_SIP_DRIVER_COMMAND;
  const sipUri = values.get("sip-uri") ?? process.env.VOICE_TESTOPS_SIP_URI;
  if (agent === "sip" && !sipDriverCommand) {
    throw new Error("--sip-driver-command is required for --agent sip");
  }
  if (agent === "sip" && !sipUri) {
    throw new Error("--sip-uri is required for --agent sip");
  }
  const sipCallTimeoutMs = parseOptionalPositiveInteger(
    values.get("sip-call-timeout-ms") ?? process.env.VOICE_TESTOPS_SIP_CALL_TIMEOUT_MS,
    "--sip-call-timeout-ms",
  );
  const sipDriverRetries = parseOptionalNonNegativeInteger(
    values.get("sip-driver-retries") ?? process.env.VOICE_TESTOPS_SIP_DRIVER_RETRIES,
    "--sip-driver-retries",
  );
  const openClawMode = values.get("openclaw-mode") ?? "custom";
  if (openClawMode !== "custom" && openClawMode !== "responses") {
    throw new Error("--openclaw-mode must be custom or responses");
  }
  const reportLocale = values.get("report-locale") ?? "zh-CN";
  if (reportLocale !== "zh-CN" && reportLocale !== "en") {
    throw new Error("--report-locale must be zh-CN or en");
  }
  const failOnSeverity = values.get("fail-on-severity");
  if (
    failOnSeverity !== undefined &&
    failOnSeverity !== "critical" &&
    failOnSeverity !== "major" &&
    failOnSeverity !== "minor"
  ) {
    throw new Error("--fail-on-severity must be critical, major, or minor");
  }
  if (values.has("diff-markdown") && !values.has("baseline")) {
    throw new Error("--diff-markdown requires --baseline");
  }
  if (flags.has("fail-on-new") && !values.has("baseline")) {
    throw new Error("--fail-on-new requires --baseline");
  }

  return {
    suitePath,
    agent,
    endpoint,
    apiKey: values.get("api-key") ?? process.env.OPENCLAW_API_KEY,
    openClawMode,
    transcriptPath,
    sipDriverCommand,
    sipUri,
    sipProxy: values.get("sip-proxy") ?? process.env.VOICE_TESTOPS_SIP_PROXY,
    sipFrom: values.get("sip-from") ?? process.env.VOICE_TESTOPS_SIP_FROM,
    sipCallTimeoutMs,
    sipDriverRetries,
    sipMediaDir: values.get("sip-media-dir") ?? process.env.VOICE_TESTOPS_SIP_MEDIA_DIR,
    reportLocale,
    failOnSeverity,
    jsonPath: values.get("json") ?? ".voice-testops/report.json",
    htmlPath: values.get("html") ?? ".voice-testops/report.html",
    summaryPath: values.get("summary"),
    junitPath: values.get("junit"),
    baselinePath: values.get("baseline"),
    diffMarkdownPath: values.get("diff-markdown") ?? (values.has("baseline") ? ".voice-testops/diff.md" : undefined),
    failOnNew: flags.has("fail-on-new"),
  };
}

function parseOptionalNonNegativeInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }

  return parsed;
}

function parseOptionalPositiveInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
}
