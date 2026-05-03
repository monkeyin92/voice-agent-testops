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
});
