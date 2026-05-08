import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createLocalReceptionistAgent } from "@/testops/adapters/localReceptionist";
import { exampleCatalog } from "@/testops/exampleCatalog";
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
  "examples/voice-testops/chinese-home-design-suite.json",
  "examples/voice-testops/chinese-insurance-regulated-service-suite.json",
  "examples/voice-testops/english-insurance-regulated-service-suite.json",
  "examples/voice-testops/chinese-outbound-leadgen-suite.json",
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
  [
    "examples/voice-testops/chinese-insurance-regulated-service-suite.json",
    "examples/voice-testops/english-insurance-regulated-service-suite.json",
  ],
];

const commercialStarterSuites = [
  {
    path: "examples/voice-testops/chinese-real-estate-agent-suite.json",
    industry: "real_estate",
  },
  {
    path: "examples/voice-testops/chinese-dental-clinic-suite.json",
    industry: "dental_clinic",
  },
  {
    path: "examples/voice-testops/chinese-home-design-suite.json",
    industry: "home_design",
  },
  {
    path: "examples/voice-testops/chinese-insurance-regulated-service-suite.json",
    industry: "insurance",
  },
];

describe("voice-testops example suites", () => {
  it("keeps every public example suite valid", async () => {
    for (const suitePath of exampleSuites) {
      await expect(loadVoiceTestSuite(suitePath), suitePath).resolves.toBeDefined();
    }
  });

  it("keeps each bilingual business example paired by industry", async () => {
    for (const [chinesePath, englishPath] of bilingualExamplePairs) {
      const chineseSuite = await loadVoiceTestSuite(chinesePath);
      const englishSuite = await loadVoiceTestSuite(englishPath);

      expect(chineseSuite.scenarios.length, chinesePath).toBeGreaterThan(0);
      expect(englishSuite.scenarios.length, englishPath).toBeGreaterThan(0);
      expect(chineseSuite.scenarios[0].merchant.industry).toBe(englishSuite.scenarios[0].merchant.industry);
    }
  });

  it("keeps the example catalog aligned with public example files", () => {
    expect(exampleCatalog.map((entry) => entry.path)).toEqual(expect.arrayContaining(exampleSuites));
    expect(exampleCatalog).toContainEqual(
      expect.objectContaining({
        industry: "restaurant",
        language: "en",
        path: "examples/voice-testops/english-restaurant-booking-suite.json",
      }),
    );
    expect(exampleCatalog).toContainEqual(
      expect.objectContaining({
        industry: "restaurant",
        language: "zh-CN",
        path: "examples/voice-testops/chinese-restaurant-booking-suite.json",
      }),
    );
  });

  it("lists the Chinese home design suite as a commercial starter", () => {
    expect(exampleCatalog).toContainEqual(
      expect.objectContaining({
        industry: "home_design",
        language: "zh-CN",
        path: "examples/voice-testops/chinese-home-design-suite.json",
      }),
    );
  });

  it("lists insurance regulated service as a commercial starter", () => {
    expect(exampleCatalog).toContainEqual(
      expect.objectContaining({
        industry: "insurance",
        language: "zh-CN",
        path: "examples/voice-testops/chinese-insurance-regulated-service-suite.json",
      }),
    );
  });

  it("lists outbound lead generation as a reviewed recording-derived starter", () => {
    expect(exampleCatalog).toContainEqual(
      expect.objectContaining({
        industry: "outbound_leadgen",
        language: "zh-CN",
        path: "examples/voice-testops/chinese-outbound-leadgen-suite.json",
      }),
    );
  });

  it("keeps outbound recording-derived examples sanitized", async () => {
    for (const path of [
      "examples/voice-testops/chinese-outbound-leadgen-suite.json",
      "examples/voice-testops/transcripts/outbound-leadgen-reviewed.txt",
    ]) {
      const content = await readFile(path, "utf8");

      expect(content, path).not.toMatch(/https?:\/\//i);
      expect(content, path).not.toMatch(/(?<!\d)1[3-9]\d{9}(?!\d)/);
    }
  });

  it("keeps each Chinese commercial starter deep enough for a first pilot", async () => {
    for (const starter of commercialStarterSuites) {
      const suite = await loadVoiceTestSuite(starter.path);

      expect(suite.scenarios, starter.path).toHaveLength(10);
      expect(suite.scenarios.every((scenario) => scenario.businessRisk?.trim()), starter.path).toBe(true);
      expect(new Set(suite.scenarios.map((scenario) => scenario.id)).size, starter.path).toBe(10);
      expect(suite.scenarios.every((scenario) => scenario.merchant.industry === starter.industry), starter.path).toBe(true);
      expect(
        suite.scenarios.some((scenario) =>
          scenario.turns.some((turn) =>
            turn.expect.some((assertion) => assertion.type === "must_not_match" && assertion.severity === "critical"),
          ),
        ),
        starter.path,
      ).toBe(true);
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
