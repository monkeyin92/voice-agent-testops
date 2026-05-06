#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LeadSource } from "../domain/lead";
import { leadSourceSchema } from "../domain/lead";
import { merchantConfigSchema } from "../domain/merchant";
import { createHttpAgent } from "./adapters/httpAgent";
import { createLocalReceptionistAgent } from "./adapters/localReceptionist";
import { createOpenClawAgent } from "./adapters/openClawAgent";
import { parseCliArgs } from "./cliArgs";
import { diagnoseHttpAgentEndpoint, type DoctorCheck } from "./doctor";
import { exampleCatalog, parseExampleLanguage, type ExampleCatalogEntry, type ExampleLanguage } from "./exampleCatalog";
import { initializeVoiceTestOpsProject } from "./initProject";
import { buildVoiceTestSuiteJsonSchema } from "./jsonSchema";
import { resolveReadablePath } from "./packagePaths";
import { renderHtmlReport, renderJsonReport } from "./report";
import { runVoiceTestSuite, type VoiceTestRunResult } from "./runner";
import type { VoiceTestSeverity } from "./schema";
import { loadVoiceTestSuite } from "./suiteLoader";
import { buildVoiceTestSuiteFromTranscript } from "./transcriptSuite";

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
  const result = await diagnoseHttpAgentEndpoint(args.endpoint);

  console.log("Voice Agent TestOps doctor");
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
};

function parseDoctorArgs(argv: string[]): DoctorArgs {
  const values = parseKeyValueArgs(argv);

  for (const option of values.keys()) {
    if (option !== "agent" && option !== "endpoint") {
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

  return { agent, endpoint };
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

  const status = result.passed ? "passed" : "failed";
  console.log(
    `${suite.name}: ${status} (${result.summary.failures} failures, ${result.summary.assertions} assertions)`,
  );
  console.log(`JSON report: ${args.jsonPath}`);
  console.log(`HTML report: ${args.htmlPath}`);

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

async function generateSuiteFromTranscript(argv: string[]): Promise<number> {
  const args = parseFromTranscriptArgs(argv);
  const transcript = await readFile(await resolveReadablePath(args.transcriptPath), "utf8");
  const merchant = merchantConfigSchema.parse(JSON.parse(await readFile(await resolveReadablePath(args.merchantPath), "utf8")));
  const suite = buildVoiceTestSuiteFromTranscript({
    transcript,
    merchant,
    name: args.name,
    scenarioId: args.scenarioId,
    scenarioTitle: args.scenarioTitle,
    source: args.source,
  });

  await writeReport(args.outPath, `${JSON.stringify(suite, null, 2)}\n`);
  console.log(`Generated suite: ${args.outPath}`);
  console.log(`Customer turns: ${suite.scenarios[0].turns.length}`);
  return 0;
}

type FromTranscriptArgs = {
  transcriptPath: string;
  merchantPath: string;
  outPath: string;
  name?: string;
  scenarioId?: string;
  scenarioTitle?: string;
  source: LeadSource;
};

function parseFromTranscriptArgs(argv: string[]): FromTranscriptArgs {
  const values = parseKeyValueArgs(argv);
  const transcriptPath = values.get("transcript");
  const merchantPath = values.get("merchant");
  const outPath = values.get("out");

  if (!transcriptPath) {
    throw new Error("--transcript is required");
  }

  if (!merchantPath) {
    throw new Error("--merchant is required");
  }

  if (!outPath) {
    throw new Error("--out is required");
  }

  const source = leadSourceSchema.parse(values.get("source") ?? "website");

  return {
    transcriptPath,
    merchantPath,
    outPath,
    name: values.get("name"),
    scenarioId: values.get("scenario-id"),
    scenarioTitle: values.get("scenario-title"),
    source,
  };
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
