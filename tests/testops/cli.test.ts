import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const merchant = {
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套，精修 9 张", bestFor: "个人写真" }],
  faqs: [{ question: "周末可以拍吗", answer: "周末可以拍，需要提前预约档期。" }],
  bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
};

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

describe("voice-test CLI", () => {
  it("keeps the default exit code strict when any assertion fails", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);

    const result = await runCli(["--suite", suitePath]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("failed (1 failures");
  });

  it("allows CI to pass when failures are below the configured severity gate", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);

    const result = await runCli(["--suite", suitePath, "--fail-on-severity", "major"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("failed (1 failures");
    expect(result.stdout).toContain("Severity gate: passed");
  });
});

async function writeMinorFailureSuite(tempDir: string): Promise<string> {
  const suitePath = path.join(tempDir, "minor-failure-suite.json");
  await writeFile(
    suitePath,
    JSON.stringify(
      {
        name: "Minor severity gate demo",
        scenarios: [
          {
            id: "minor_copy_regression",
            title: "Minor wording regression",
            source: "website",
            merchant,
            turns: [
              {
                user: "How much is a portrait session?",
                expect: [{ type: "must_contain_any", phrases: ["NEVER_MATCHING_PHRASE"], severity: "minor" }],
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );

  return suitePath;
}

async function runCli(args: string[]): Promise<CliResult> {
  const cliPath = path.resolve("src/testops/cli.ts");
  const tsxPath = path.resolve("node_modules/.bin/tsx");

  try {
    const { stdout, stderr } = await execFileAsync(tsxPath, [cliPath, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, OPENCLAW_API_KEY: "" },
    });

    return { code: 0, stdout, stderr };
  } catch (error) {
    const result = error as Error & { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof result.code === "number" ? result.code : 1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }
}
