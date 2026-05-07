#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LeadSource } from "../domain/lead";
import { leadSourceSchema } from "../domain/lead";
import { industrySchema, merchantConfigSchema, type Industry } from "../domain/merchant";
import { createHttpAgent } from "./adapters/httpAgent";
import { createLocalReceptionistAgent } from "./adapters/localReceptionist";
import { createOpenClawAgent } from "./adapters/openClawAgent";
import { parseCliArgs } from "./cliArgs";
import { diffVoiceTestReports, renderMarkdownDiff } from "./diffReport";
import { buildDoctorProbeFromSuite, diagnoseHttpAgentEndpoint, type DoctorCheck } from "./doctor";
import { exampleCatalog, parseExampleLanguage, type ExampleCatalogEntry, type ExampleLanguage } from "./exampleCatalog";
import { initializeVoiceTestOpsProject } from "./initProject";
import { buildVoiceTestSuiteJsonSchema } from "./jsonSchema";
import { resolveReadablePath } from "./packagePaths";
import { renderHtmlReport, renderJsonReport, renderJunitReport, renderMarkdownSummary } from "./report";
import { runVoiceTestSuite, type VoiceTestRunResult } from "./runner";
import type { VoiceTestSeverity, VoiceTestSuite } from "./schema";
import { loadVoiceTestSuite } from "./suiteLoader";
import { buildDraftMerchantFromTranscript, buildVoiceTestSuiteFromTranscript } from "./transcriptSuite";

const severityRank: Record<VoiceTestSeverity, number> = {
  minor: 1,
  major: 2,
  critical: 3,
};

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "run") {
    return runSuite(argv.slice(1));
  }

  if (argv[0] === "from-transcript") {
    return generateSuiteFromTranscript(argv.slice(1));
  }

  if (argv[0] === "init") {
    return initProject(argv.slice(1));
  }

  if (argv[0] === "list") {
    return listExamples(argv.slice(1));
  }

  if (argv[0] === "doctor") {
    return doctor(argv.slice(1));
  }

  if (argv[0] === "compare") {
    return compareReports(argv.slice(1));
  }

  if (argv[0] === "schema") {
    return exportSchema(argv.slice(1));
  }

  if (argv[0] === "validate") {
    return validateSuite(argv.slice(1));
  }

  if (argv[0] && !argv[0].startsWith("--")) {
    throw new Error(`Unknown command: ${argv[0]}`);
  }

  return runSuite(argv);
}

async function initProject(argv: string[]): Promise<number> {
  const result = await initializeVoiceTestOpsProject(argv);

  for (const filePath of result.files) {
    console.log(`Created ${filePath}`);
  }
  console.log("Next:");
  for (const command of result.nextCommands) {
    console.log(command);
  }

  return 0;
}

async function exportSchema(argv: string[]): Promise<number> {
  const args = parseSchemaArgs(argv);
  const content = `${JSON.stringify(buildVoiceTestSuiteJsonSchema(), null, 2)}\n`;

  if (args.outPath) {
    await writeReport(args.outPath, content);
    console.log(`Wrote JSON Schema: ${args.outPath}`);
    return 0;
  }

  process.stdout.write(content);
  return 0;
}

function parseSchemaArgs(argv: string[]): { outPath?: string } {
  const values = parseKeyValueArgs(argv);

  for (const option of values.keys()) {
    if (option !== "out") {
      throw new Error(`Unknown schema option: --${option}`);
    }
  }

  return { outPath: values.get("out") };
}

async function doctor(argv: string[]): Promise<number> {
  const args = parseDoctorArgs(argv);
  const suite = args.suitePath ? await loadVoiceTestSuite(args.suitePath) : undefined;
  const result = await diagnoseHttpAgentEndpoint(
    args.endpoint,
    suite ? buildDoctorProbeFromSuite(suite) : undefined,
  );

  console.log("Voice Agent TestOps doctor");
  if (suite) {
    console.log("Suite valid: ok");
    console.log(`Probe scenario: ${result.probe.scenarioId}`);
  }
  for (const check of result.checks) {
    console.log(formatDoctorCheck(check));
    if (check.advice) {
      console.log(`  fix: ${check.advice}`);
    }
    if (check.detail) {
      console.log(`  detail: ${check.detail}`);
    }
  }

  if (result.passed) {
    console.log("Doctor passed");
    return 0;
  }

  console.error("Doctor failed");
  return 1;
}

type DoctorArgs = {
  agent: "http";
  endpoint: string;
  suitePath?: string;
};

function parseDoctorArgs(argv: string[]): DoctorArgs {
  const values = parseKeyValueArgs(argv);

  for (const option of values.keys()) {
    if (option !== "agent" && option !== "endpoint" && option !== "suite") {
      throw new Error(`Unknown doctor option: --${option}`);
    }
  }

  const agent = values.get("agent") ?? "http";
  if (agent !== "http") {
    throw new Error("--agent must be http");
  }

  const endpoint = values.get("endpoint");
  if (!endpoint) {
    throw new Error("--endpoint is required");
  }

  return { agent, endpoint, suitePath: values.get("suite") };
}

function formatDoctorCheck(check: DoctorCheck): string {
  return `${check.label}: ${check.status}`;
}

function listExamples(argv: string[]): number {
  const args = parseListArgs(argv);
  const entries = exampleCatalog.filter(
    (entry) => (!args.language || entry.language === args.language) && (!args.industry || entry.industry === args.industry),
  );

  console.log("Example suites");
  console.log("Use these as references, or generate your own mock data with init.\n");

  if (entries.length === 0) {
    console.log("No examples matched the selected filters.");
    return 0;
  }

  for (const [industryLabel, groupEntries] of groupExamplesByIndustry(entries)) {
    console.log(`${industryLabel}`);
    for (const entry of groupEntries) {
      console.log(`  - [${entry.language}] ${entry.title}`);
      console.log(`    ${entry.path}`);
      console.log(`    risks: ${entry.risks}`);
    }
  }

  console.log("\nCreate your own mock suite:");
  console.log("npx voice-agent-testops init --industry restaurant --lang en --name \"Maple Bistro\"");
  console.log("npx voice-agent-testops validate --suite voice-testops/suite.json");
  console.log("npx voice-agent-testops run --suite voice-testops/suite.json");

  return 0;
}

type ListExamplesArgs = {
  language?: ExampleLanguage;
  industry?: ExampleCatalogEntry["industry"];
};

function parseListArgs(argv: string[]): ListExamplesArgs {
  const values = parseKeyValueArgs(argv);
  const args: ListExamplesArgs = {};

  for (const option of values.keys()) {
    if (option !== "lang" && option !== "industry") {
      throw new Error(`Unknown list option: --${option}`);
    }
  }

  const language = values.get("lang");
  if (language) {
    args.language = parseExampleLanguage(language);
  }

  const industry = values.get("industry");
  if (industry) {
    const supportedIndustries = [...new Set(exampleCatalog.map((entry) => entry.industry))];
    if (!supportedIndustries.includes(industry as ExampleCatalogEntry["industry"])) {
      throw new Error(`--industry must be one of: ${supportedIndustries.join(", ")}`);
    }
    args.industry = industry as ExampleCatalogEntry["industry"];
  }

  return args;
}

function groupExamplesByIndustry(entries: ExampleCatalogEntry[]): Array<[string, ExampleCatalogEntry[]]> {
  const groups = new Map<string, ExampleCatalogEntry[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.industryLabel) ?? [];
    existing.push(entry);
    groups.set(entry.industryLabel, existing);
  }

  return [...groups.entries()];
}

async function validateSuite(argv: string[]): Promise<number> {
  const args = parseValidateArgs(argv);
  const suite = await loadVoiceTestSuite(args.suitePath);
  const turns = suite.scenarios.reduce((count, scenario) => count + scenario.turns.length, 0);
  const assertions = suite.scenarios.reduce(
    (count, scenario) => count + scenario.turns.reduce((turnCount, turn) => turnCount + turn.expect.length, 0),
    0,
  );

  console.log(`Suite valid: ${suite.name}`);
  console.log(`Scenarios: ${suite.scenarios.length}`);
  console.log(`Turns: ${turns}`);
  console.log(`Assertions: ${assertions}`);

  return 0;
}

function parseValidateArgs(argv: string[]): { suitePath: string } {
  const values = parseKeyValueArgs(argv);
  const suitePath = values.get("suite");

  if (!suitePath) {
    throw new Error("--suite is required");
  }

  return { suitePath };
}

async function runSuite(argv: string[]): Promise<number> {
  const args = parseCliArgs(argv);
  const suite = await loadVoiceTestSuite(args.suitePath);
  const agent = createAgentFromArgs(args);

  const result = await runVoiceTestSuite(suite, agent, {
    onProgress: (event) => {
      if (event.type === "turn:start") {
        console.log(
          `[${event.scenarioIndex + 1}/${suite.scenarios.length}] ${event.scenarioTitle} - turn ${
            event.turnIndex + 1
          }/${event.turnTotal}: running`,
        );
        return;
      }

      console.log(
        `[${event.scenarioIndex + 1}/${suite.scenarios.length}] ${event.scenarioTitle} - turn ${
          event.turnIndex + 1
        }/${event.turnTotal}: ${event.passed ? "passed" : "failed"} (${event.latencyMs}ms, ${
          event.failures
        } failures)`,
      );
    },
  });

  await writeReport(args.jsonPath, renderJsonReport(result));
  await writeReport(args.htmlPath, renderHtmlReport(result, { locale: args.reportLocale }));
  if (args.summaryPath) {
    await writeReport(args.summaryPath, renderMarkdownSummary(result));
  }
  if (args.junitPath) {
    await writeReport(args.junitPath, renderJunitReport(result));
  }
  let newFailureCount: number | undefined;
  if (args.baselinePath && args.diffMarkdownPath) {
    const baseline = await readVoiceTestReport(args.baselinePath, "Baseline");
    const diff = diffVoiceTestReports(baseline, result);
    newFailureCount = diff.summary.newFailures;
    await writeReport(args.diffMarkdownPath, renderMarkdownDiff(diff));
  }

  const status = result.passed ? "passed" : "failed";
  console.log(
    `${suite.name}: ${status} (${result.summary.failures} failures, ${result.summary.assertions} assertions)`,
  );
  console.log(`JSON report: ${args.jsonPath}`);
  console.log(`HTML report: ${args.htmlPath}`);
  if (args.summaryPath) {
    console.log(`Markdown summary: ${args.summaryPath}`);
  }
  if (args.junitPath) {
    console.log(`JUnit report: ${args.junitPath}`);
  }
  if (args.baselinePath && args.diffMarkdownPath) {
    console.log(`Baseline report: ${args.baselinePath}`);
    console.log(`Diff summary: ${args.diffMarkdownPath}`);
  }

  if (args.failOnNew) {
    const newFailures = newFailureCount ?? 0;
    console.log(`New failure gate: ${newFailures === 0 ? "passed" : "failed"} (${newFailures} new failures)`);
    return newFailures === 0 ? 0 : 1;
  }

  if (args.failOnSeverity) {
    const gatedFailures = countFailuresAtOrAboveSeverity(result, args.failOnSeverity);
    console.log(
      `Severity gate: ${gatedFailures === 0 ? "passed" : "failed"} (${gatedFailures} failures at or above ${
        args.failOnSeverity
      })`,
    );
    return gatedFailures === 0 ? 0 : 1;
  }

  return result.passed ? 0 : 1;
}

async function compareReports(argv: string[]): Promise<number> {
  const args = parseCompareArgs(argv);
  const baseline = await readVoiceTestReport(args.baselinePath, "Baseline");
  const current = await readVoiceTestReport(args.currentPath, "Current");
  const diff = diffVoiceTestReports(baseline, current);

  console.log(
    `Voice Agent TestOps diff: ${diff.summary.newFailures} new, ${diff.summary.resolvedFailures} resolved, ${diff.summary.unchangedFailures} unchanged`,
  );

  if (args.diffMarkdownPath) {
    await writeReport(args.diffMarkdownPath, renderMarkdownDiff(diff));
    console.log(`Diff summary: ${args.diffMarkdownPath}`);
  }

  if (args.failOnNew) {
    console.log(
      `New failure gate: ${diff.summary.newFailures === 0 ? "passed" : "failed"} (${diff.summary.newFailures} new failures)`,
    );
    return diff.summary.newFailures === 0 ? 0 : 1;
  }

  return 0;
}

type CompareArgs = {
  baselinePath: string;
  currentPath: string;
  diffMarkdownPath?: string;
  failOnNew: boolean;
};

function parseCompareArgs(argv: string[]): CompareArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const name = arg.slice(2);
    if (name === "fail-on-new") {
      flags.add(name);
      continue;
    }

    if (name !== "baseline" && name !== "current" && name !== "diff-markdown") {
      throw new Error(`Unknown compare option: --${name}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(name, value);
    index += 1;
  }

  const baselinePath = values.get("baseline");
  if (!baselinePath) {
    throw new Error("--baseline is required");
  }

  const currentPath = values.get("current");
  if (!currentPath) {
    throw new Error("--current is required");
  }

  return {
    baselinePath,
    currentPath,
    diffMarkdownPath: values.get("diff-markdown"),
    failOnNew: flags.has("fail-on-new"),
  };
}

function createAgentFromArgs(args: ReturnType<typeof parseCliArgs>) {
  if (args.agent === "http") {
    return createHttpAgent({ endpoint: args.endpoint ?? "" });
  }

  if (args.agent === "openclaw") {
    return createOpenClawAgent({ endpoint: args.endpoint ?? "", apiKey: args.apiKey, mode: args.openClawMode });
  }

  return createLocalReceptionistAgent();
}

async function writeReport(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

async function readVoiceTestReport(filePath: string, label: string): Promise<VoiceTestRunResult> {
  const content = await readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as Partial<VoiceTestRunResult>;

  if (!parsed.suiteName || !parsed.summary || !Array.isArray(parsed.scenarios)) {
    throw new Error(`${label} report is not a Voice Agent TestOps JSON report: ${filePath}`);
  }

  return parsed as VoiceTestRunResult;
}

async function generateSuiteFromTranscript(argv: string[]): Promise<number> {
  const args = parseFromTranscriptArgs(argv);
  const transcript = args.readFromStdin
    ? await readFromStdin()
    : await readFile(await resolveReadablePath(args.transcriptPath ?? ""), "utf8");
  const merchant = args.merchantPath
    ? merchantConfigSchema.parse(JSON.parse(await readFile(await resolveReadablePath(args.merchantPath), "utf8")))
    : buildDraftMerchantFromTranscript({
        transcript,
        name: args.merchantName,
        industry: args.industry,
      });
  const suite = buildVoiceTestSuiteFromTranscript({
    transcript,
    merchant,
    name: args.name,
    scenarioId: args.scenarioId,
    scenarioTitle: args.scenarioTitle,
    source: args.source,
  });
  const suiteOutput = args.merchantOutPath
    ? buildSuiteWithMerchantRef(suite, relativeMerchantRef(args.outPath, args.merchantOutPath))
    : suite;

  if (args.merchantOutPath) {
    await writeReport(args.merchantOutPath, `${JSON.stringify(merchant, null, 2)}\n`);
  }
  await writeReport(args.outPath, `${JSON.stringify(suiteOutput, null, 2)}\n`);
  console.log(`Generated suite: ${args.outPath}`);
  if (args.readFromStdin) {
    console.log("Transcript: read from stdin");
  }
  if (args.merchantOutPath) {
    console.log(`${args.merchantPath ? "Merchant profile" : "Merchant draft"}: ${args.merchantOutPath}`);
  }
  if (!args.merchantPath && !args.merchantOutPath) {
    console.log("Merchant draft: generated from transcript");
  }
  console.log(`Customer turns: ${suite.scenarios[0].turns.length}`);
  return 0;
}

type FromTranscriptArgs = {
  transcriptPath?: string;
  readFromStdin: boolean;
  merchantPath?: string;
  merchantOutPath?: string;
  outPath: string;
  merchantName?: string;
  industry?: Industry;
  name?: string;
  scenarioId?: string;
  scenarioTitle?: string;
  source: LeadSource;
};

function parseFromTranscriptArgs(argv: string[]): FromTranscriptArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const knownValues = new Set([
    "transcript",
    "input",
    "merchant",
    "merchant-out",
    "out",
    "merchant-name",
    "industry",
    "name",
    "scenario-id",
    "scenario-title",
    "source",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const name = arg.slice(2);
    if (name === "stdin") {
      flags.add(name);
      continue;
    }
    if (!knownValues.has(name)) {
      throw new Error(`Unknown from-transcript option: --${name}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(name, value);
    index += 1;
  }

  const readFromStdin = flags.has("stdin");
  const transcriptPath = values.get("transcript") ?? values.get("input");
  const merchantPath = values.get("merchant");
  const merchantOutPath = values.get("merchant-out");
  const outPath = values.get("out");

  if (readFromStdin && transcriptPath) {
    throw new Error("--stdin cannot be combined with --transcript or --input");
  }
  if (!readFromStdin && !transcriptPath) {
    throw new Error("--transcript, --input, or --stdin is required");
  }

  if (!outPath) {
    throw new Error("--out is required");
  }

  const source = leadSourceSchema.parse(values.get("source") ?? "website");

  return {
    transcriptPath,
    readFromStdin,
    merchantPath,
    merchantOutPath,
    outPath,
    merchantName: values.get("merchant-name"),
    industry: values.has("industry") ? industrySchema.parse(values.get("industry")) : undefined,
    name: values.get("name"),
    scenarioId: values.get("scenario-id"),
    scenarioTitle: values.get("scenario-title"),
    source,
  };
}

function buildSuiteWithMerchantRef(suite: VoiceTestSuite, merchantRef: string): unknown {
  return {
    ...suite,
    scenarios: suite.scenarios.map(({ merchant: _merchant, ...scenario }) => ({
      ...scenario,
      merchantRef,
    })),
  };
}

function relativeMerchantRef(suitePath: string, merchantPath: string): string {
  return path.relative(path.dirname(suitePath), merchantPath).split(path.sep).join(path.posix.sep);
}

async function readFromStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let content = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      content += chunk;
    });
    process.stdin.on("error", reject);
    process.stdin.on("end", () => resolve(content));
  });
}

function parseKeyValueArgs(argv: string[]): Map<string, string> {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    values.set(arg.slice(2), value);
    index += 1;
  }

  return values;
}

function countFailuresAtOrAboveSeverity(result: VoiceTestRunResult, threshold: VoiceTestSeverity): number {
  const thresholdRank = severityRank[threshold];

  return result.scenarios.reduce(
    (scenarioCount, scenario) =>
      scenarioCount +
      scenario.turns.reduce(
        (turnCount, turn) =>
          turnCount + turn.failures.filter((failure) => severityRank[failure.severity] >= thresholdRank).length,
        0,
      ),
    0,
  );
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
