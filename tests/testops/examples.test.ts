import { describe, expect, it } from "vitest";
import { createLocalReceptionistAgent } from "@/testops/adapters/localReceptionist";
import { runVoiceTestSuite } from "@/testops/runner";
import { loadVoiceTestSuite } from "@/testops/suiteLoader";

const exampleSuites = [
  "examples/voice-testops/xhs-receptionist-suite.json",
  "examples/voice-testops/chinese-risk-suite.json",
  "examples/voice-testops/openclaw-suite.json",
  "examples/voice-testops/english-photo-studio-suite.json",
  "examples/voice-testops/chinese-dental-clinic-suite.json",
  "examples/voice-testops/english-dental-clinic-suite.json",
  "examples/voice-testops/chinese-restaurant-booking-suite.json",
  "examples/voice-testops/english-restaurant-booking-suite.json",
  "examples/voice-testops/chinese-real-estate-agent-suite.json",
  "examples/voice-testops/english-real-estate-agent-suite.json",
  "examples/voice-testops/generated-transcript-suite.json",
  "examples/voice-testops/photo-studio-multiturn-suite.json",
  "examples/voice-testops/failing-demo-suite.json",
];

const bilingualExamplePairs = [
  [
    "examples/voice-testops/chinese-dental-clinic-suite.json",
    "examples/voice-testops/english-dental-clinic-suite.json",
  ],
  [
    "examples/voice-testops/chinese-restaurant-booking-suite.json",
    "examples/voice-testops/english-restaurant-booking-suite.json",
  ],
  [
    "examples/voice-testops/chinese-real-estate-agent-suite.json",
    "examples/voice-testops/english-real-estate-agent-suite.json",
  ],
];

describe("voice-testops example suites", () => {
  it("keeps every public example suite valid", async () => {
    for (const suitePath of exampleSuites) {
      await expect(loadVoiceTestSuite(suitePath), suitePath).resolves.toBeDefined();
    }
  });

  it("keeps each business example available in Chinese and English", async () => {
    for (const [chinesePath, englishPath] of bilingualExamplePairs) {
      const chineseSuite = await loadVoiceTestSuite(chinesePath);
      const englishSuite = await loadVoiceTestSuite(englishPath);

      expect(chineseSuite.scenarios, chinesePath).toHaveLength(englishSuite.scenarios.length);
      expect(chineseSuite.scenarios[0].merchant.industry).toBe(englishSuite.scenarios[0].merchant.industry);
    }
  });

  it("keeps the failing demo suite intentionally red with an actionable field failure", async () => {
    const result = await runVoiceTestSuite(
      await loadVoiceTestSuite("examples/voice-testops/failing-demo-suite.json"),
      createLocalReceptionistAgent(),
    );

    expect(result.passed).toBe(false);
    expect(result.summary.failures).toBeGreaterThan(0);
    expect(
      result.scenarios.flatMap((scenario) => scenario.turns.flatMap((turn) => turn.failures.map((failure) => failure.code))),
    ).toContain("lead_field_missing");
  });
});
