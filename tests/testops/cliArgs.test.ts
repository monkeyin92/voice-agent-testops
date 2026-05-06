import { describe, expect, it } from "vitest";
import { parseCliArgs } from "@/testops/cliArgs";

describe("parseCliArgs", () => {
  it("parses local receptionist defaults", () => {
    expect(parseCliArgs(["--suite", "examples/suite.json"])).toEqual({
      suitePath: "examples/suite.json",
      agent: "local-receptionist",
      endpoint: undefined,
      apiKey: undefined,
      openClawMode: "custom",
      reportLocale: "zh-CN",
      failOnSeverity: undefined,
      jsonPath: ".voice-testops/report.json",
      htmlPath: ".voice-testops/report.html",
    });
  });

  it("requires an endpoint for HTTP agents", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--agent", "http"])).toThrow("--endpoint is required");
  });

  it("parses OpenClaw agent settings from flags", () => {
    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "openclaw",
        "--endpoint",
        "https://openclaw.example.test/agents/voice",
        "--api-key",
        "test-key",
      ]),
    ).toMatchObject({
      suitePath: "suite.json",
      agent: "openclaw",
      endpoint: "https://openclaw.example.test/agents/voice",
      apiKey: "test-key",
    });
  });

  it("supports OpenClaw Responses mode for Docker Gateway endpoints", () => {
    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "openclaw",
        "--endpoint",
        "http://localhost:18889/v1/responses",
        "--openclaw-mode",
        "responses",
      ]),
    ).toMatchObject({
      agent: "openclaw",
      endpoint: "http://localhost:18889/v1/responses",
      openClawMode: "responses",
    });
  });

  it("supports English report rendering", () => {
    expect(parseCliArgs(["--suite", "suite.json", "--report-locale", "en"])).toMatchObject({
      reportLocale: "en",
    });
  });

  it("rejects unsupported report locales", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--report-locale", "fr"])).toThrow(
      "--report-locale must be zh-CN or en",
    );
  });

  it("supports severity-gated process exits", () => {
    expect(parseCliArgs(["--suite", "suite.json", "--fail-on-severity", "major"])).toMatchObject({
      failOnSeverity: "major",
    });
  });

  it("rejects unsupported severity gates", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--fail-on-severity", "high"])).toThrow(
      "--fail-on-severity must be critical, major, or minor",
    );
  });
});
