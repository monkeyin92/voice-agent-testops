import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseVoiceTestSuite, type VoiceTestSuite } from "./schema";

type JsonObject = Record<string, unknown>;

export async function loadVoiceTestSuite(suitePath: string): Promise<VoiceTestSuite> {
  const rawSuite = JSON.parse(await readFile(suitePath, "utf8")) as unknown;
  const resolvedSuite = await resolveMerchantRefs(rawSuite, path.dirname(suitePath));

  return parseVoiceTestSuite(resolvedSuite);
}

async function resolveMerchantRefs(rawSuite: unknown, baseDir: string): Promise<unknown> {
  if (!isJsonObject(rawSuite) || !Array.isArray(rawSuite.scenarios)) {
    return rawSuite;
  }

  const scenarios = await Promise.all(
    rawSuite.scenarios.map(async (scenario) => {
      if (!isJsonObject(scenario) || typeof scenario.merchantRef !== "string") {
        return scenario;
      }

      if ("merchant" in scenario) {
        throw new Error(`Scenario ${String(scenario.id ?? "unknown")} cannot define both merchant and merchantRef`);
      }

      const merchantPath = path.resolve(baseDir, scenario.merchantRef);
      const merchant = JSON.parse(await readFile(merchantPath, "utf8")) as unknown;
      const { merchantRef: _merchantRef, ...rest } = scenario;

      return { ...rest, merchant };
    }),
  );

  return { ...rawSuite, scenarios };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
