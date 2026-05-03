#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHttpAgent } from "./adapters/httpAgent";
import { createLocalReceptionistAgent } from "./adapters/localReceptionist";
import { createOpenClawAgent } from "./adapters/openClawAgent";
import { parseCliArgs } from "./cliArgs";
import { renderHtmlReport, renderJsonReport } from "./report";
import { runVoiceTestSuite } from "./runner";
import { parseVoiceTestSuite } from "./schema";

async function main(argv: string[]): Promise<number> {
  const args = parseCliArgs(argv);
  const suite = parseVoiceTestSuite(JSON.parse(await readFile(args.suitePath, "utf8")));
  const agent = createAgentFromArgs(args);

  const result = await runVoiceTestSuite(suite, agent);

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
    return createOpenClawAgent({ endpoint: args.endpoint ?? "", apiKey: args.apiKey });
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
