#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHttpAgent } from "./adapters/httpAgent";
import { createLocalReceptionistAgent } from "./adapters/localReceptionist";
import { createOpenClawAgent } from "./adapters/openClawAgent";
import { parseCliArgs } from "./cliArgs";
import { renderHtmlReport, renderJsonReport } from "./report";
import { runVoiceTestSuite } from "./runner";
import { loadVoiceTestSuite } from "./suiteLoader";

async function main(argv: string[]): Promise<number> {
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
  await writeReport(args.htmlPath, renderHtmlReport(result));

  const status = result.passed ? "passed" : "failed";
  console.log(
    `${suite.name}: ${status} (${result.summary.failures} failures, ${result.summary.assertions} assertions)`,
  );
  console.log(`JSON report: ${args.jsonPath}`);
  console.log(`HTML report: ${args.htmlPath}`);

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

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
