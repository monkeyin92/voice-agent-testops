import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createLocalReceptionistAgent } from "@/testops/adapters/localReceptionist";
import { runVoiceTestSuite } from "@/testops/runner";
import { parseVoiceTestSuite } from "@/testops/schema";

const exampleSuites = [
  "examples/voice-testops/xhs-receptionist-suite.json",
  "examples/voice-testops/chinese-risk-suite.json",
  "examples/voice-testops/openclaw-suite.json",
  "examples/voice-testops/failing-demo-suite.json",
];

function readSuite(path: string) {
  return parseVoiceTestSuite(JSON.parse(readFileSync(path, "utf8")));
}

describe("voice-testops example suites", () => {
  it("keeps every public example suite valid", () => {
    for (const suitePath of exampleSuites) {
      expect(() => readSuite(suitePath), suitePath).not.toThrow();
    }
  });

  it("keeps the failing demo suite intentionally red with an actionable field failure", async () => {
    const result = await runVoiceTestSuite(readSuite("examples/voice-testops/failing-demo-suite.json"), createLocalReceptionistAgent());

    expect(result.passed).toBe(false);
    expect(result.summary.failures).toBeGreaterThan(0);
    expect(
      result.scenarios.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.failures.map((failure) => failure.code))),
    ).toContain("lead_field_missing");
  });
});
