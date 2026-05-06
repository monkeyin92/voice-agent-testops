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
import { initializeVoiceTestOpsProject } from "./initProject";
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
  console.log(result.nextCommand);

  return 0;
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
