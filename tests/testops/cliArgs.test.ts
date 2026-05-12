import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCliArgs } from "@/testops/cliArgs";

const sipEnvKeys = [
  "VOICE_TESTOPS_SIP_DRIVER_COMMAND",
  "VOICE_TESTOPS_SIP_URI",
  "VOICE_TESTOPS_SIP_PROXY",
  "VOICE_TESTOPS_SIP_FROM",
  "VOICE_TESTOPS_SIP_MEDIA_DIR",
  "VOICE_TESTOPS_SIP_CALL_TIMEOUT_MS",
  "VOICE_TESTOPS_SIP_DRIVER_RETRIES",
] as const;
const originalSipEnv = Object.fromEntries(sipEnvKeys.map((key) => [key, process.env[key]]));

describe("parseCliArgs", () => {
  beforeEach(() => {
    for (const key of sipEnvKeys) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of sipEnvKeys) {
      const original = originalSipEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it("parses local receptionist defaults", () => {
    expect(parseCliArgs(["--suite", "examples/suite.json"])).toEqual({
      suitePath: "examples/suite.json",
      agent: "local-receptionist",
      endpoint: undefined,
      apiKey: undefined,
      openClawMode: "custom",
      transcriptPath: undefined,
      sipDriverCommand: undefined,
      sipUri: undefined,
      sipProxy: undefined,
      sipFrom: undefined,
      sipCallTimeoutMs: undefined,
      sipDriverRetries: undefined,
      sipMediaDir: undefined,
      reportLocale: "zh-CN",
      failOnSeverity: undefined,
      jsonPath: ".voice-testops/report.json",
      htmlPath: ".voice-testops/report.html",
      summaryPath: undefined,
      junitPath: undefined,
      baselinePath: undefined,
      diffMarkdownPath: undefined,
      failOnNew: false,
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

  it("requires a driver command and SIP URI for SIP agents", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--agent", "sip"])).toThrow(
      "--sip-driver-command is required for --agent sip",
    );
    expect(() =>
      parseCliArgs(["--suite", "suite.json", "--agent", "sip", "--sip-driver-command", "node sip-driver.mjs"]),
    ).toThrow("--sip-uri is required for --agent sip");
  });

  it("parses transcript replay agent settings", () => {
    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "transcript",
        "--transcript",
        ".voice-testops/transcripts/call.txt",
      ]),
    ).toMatchObject({
      agent: "transcript",
      transcriptPath: ".voice-testops/transcripts/call.txt",
    });
  });

  it("requires a transcript file for transcript replay agents", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--agent", "transcript"])).toThrow(
      "--transcript or --input is required for --agent transcript",
    );
  });

  it("parses SIP agent settings", () => {
    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "sip",
        "--sip-driver-command",
        "node examples/sip-driver/mock-driver.mjs",
        "--sip-uri",
        "sip:+8613800000000@10.0.0.8",
        "--sip-proxy",
        "sip:10.0.0.8:5060",
        "--sip-from",
        "sip:testops@10.0.0.9",
        "--sip-call-timeout-ms",
        "90000",
        "--sip-driver-retries",
        "2",
        "--sip-media-dir",
        ".voice-testops/sip-media",
      ]),
    ).toMatchObject({
      agent: "sip",
      sipDriverCommand: "node examples/sip-driver/mock-driver.mjs",
      sipUri: "sip:+8613800000000@10.0.0.8",
      sipProxy: "sip:10.0.0.8:5060",
      sipFrom: "sip:testops@10.0.0.9",
      sipCallTimeoutMs: 90_000,
      sipDriverRetries: 2,
      sipMediaDir: ".voice-testops/sip-media",
    });
  });

  it("parses SIP driver retries from the environment", () => {
    process.env.VOICE_TESTOPS_SIP_DRIVER_COMMAND = "node examples/sip-driver/mock-driver.mjs";
    process.env.VOICE_TESTOPS_SIP_URI = "sip:+8613800000000@10.0.0.8";
    process.env.VOICE_TESTOPS_SIP_DRIVER_RETRIES = "3";

    expect(parseCliArgs(["--suite", "suite.json", "--agent", "sip"])).toMatchObject({
      sipDriverRetries: 3,
    });
  });

  it("rejects invalid SIP call timeouts and driver retries", () => {
    expect(() =>
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "sip",
        "--sip-driver-command",
        "node sip-driver.mjs",
        "--sip-uri",
        "sip:+8613800000000@10.0.0.8",
        "--sip-call-timeout-ms",
        "0",
      ]),
    ).toThrow("--sip-call-timeout-ms must be a positive integer");
    expect(() =>
      parseCliArgs([
        "--suite",
        "suite.json",
        "--agent",
        "sip",
        "--sip-driver-command",
        "node sip-driver.mjs",
        "--sip-uri",
        "sip:+8613800000000@10.0.0.8",
        "--sip-driver-retries",
        "-1",
      ]),
    ).toThrow("--sip-driver-retries must be a non-negative integer");
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

  it("supports CI-friendly summary and JUnit report paths", () => {
    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--summary",
        ".voice-testops/summary.md",
        "--junit",
        ".voice-testops/junit.xml",
      ]),
    ).toMatchObject({
      summaryPath: ".voice-testops/summary.md",
      junitPath: ".voice-testops/junit.xml",
    });
  });

  it("supports baseline diff report paths", () => {
    expect(parseCliArgs(["--suite", "suite.json", "--baseline", ".voice-testops-baseline/report.json"])).toMatchObject({
      baselinePath: ".voice-testops-baseline/report.json",
      diffMarkdownPath: ".voice-testops/diff.md",
    });

    expect(
      parseCliArgs([
        "--suite",
        "suite.json",
        "--baseline",
        "old-report.json",
        "--diff-markdown",
        "diffs/voice-testops.md",
      ]),
    ).toMatchObject({
      baselinePath: "old-report.json",
      diffMarkdownPath: "diffs/voice-testops.md",
    });
  });

  it("supports failing only on new baseline failures", () => {
    expect(
      parseCliArgs(["--suite", "suite.json", "--baseline", ".voice-testops-baseline/report.json", "--fail-on-new"]),
    ).toMatchObject({
      failOnNew: true,
      baselinePath: ".voice-testops-baseline/report.json",
    });
  });

  it("requires a baseline when failing on new failures", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--fail-on-new"])).toThrow(
      "--fail-on-new requires --baseline",
    );
  });

  it("rejects unsupported severity gates", () => {
    expect(() => parseCliArgs(["--suite", "suite.json", "--fail-on-severity", "high"])).toThrow(
      "--fail-on-severity must be critical, major, or minor",
    );
  });
});
