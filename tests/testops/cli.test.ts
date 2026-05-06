import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";
import { loadVoiceTestSuite } from "@/testops/suiteLoader";

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

  it("generates a regression suite from a transcript file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "failed-call.txt");
    const merchantPath = path.join(tempDir, "merchant.json");
    const outPath = path.join(tempDir, "generated-suite.json");
    await writeFile(
      transcriptPath,
      [
        "Customer: How much is an individual portrait session?",
        "Assistant: It is guaranteed to be the lowest price.",
        "Customer: My phone number is 13800000000. Can a real person call me?",
      ].join("\n"),
      "utf8",
    );
    await writeFile(merchantPath, JSON.stringify(merchant, null, 2), "utf8");

    const result = await runCli([
      "from-transcript",
      "--transcript",
      transcriptPath,
      "--merchant",
      merchantPath,
      "--out",
      outPath,
      "--name",
      "Generated transcript regression",
      "--source",
      "website",
    ]);

    const generated = JSON.parse(await readFile(outPath, "utf8")) as unknown;
    const suite = parseVoiceTestSuite(generated);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Generated suite: ${outPath}`);
    expect(suite.name).toBe("Generated transcript regression");
    expect(suite.scenarios[0].turns).toHaveLength(2);
    expect(suite.scenarios[0].turns[0].expect.map((assertion) => assertion.type)).toContain("must_not_match");
  });

  it("runs suites through the publishable bin with the run subcommand", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);

    const result = await runBin(["run", "--suite", suitePath, "--fail-on-severity", "major"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Minor severity gate demo: failed (1 failures");
    expect(result.stdout).toContain("Severity gate: passed");
  });

  it("resolves bundled example suites when the bin runs outside the repository root", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));

    const result = await runBin(
      ["run", "--suite", "examples/voice-testops/xhs-receptionist-suite.json", "--fail-on-severity", "critical"],
      tempDir,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("JSON report: .voice-testops/report.json");
  });

  it("initializes a runnable suite and merchant config", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");

    const result = await runCli(["init", "--out", outDir, "--name", "Lumen Portrait Studio", "--stack", "http"]);

    const generatedMerchant = JSON.parse(await readFile(path.join(outDir, "merchant.json"), "utf8")) as typeof merchant;
    const rawSuite = JSON.parse(await readFile(path.join(outDir, "suite.json"), "utf8")) as {
      scenarios: Array<{ merchantRef?: string }>;
    };
    const suite = await loadVoiceTestSuite(path.join(outDir, "suite.json"));

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Created ${path.join(outDir, "merchant.json")}`);
    expect(result.stdout).toContain("npx voice-agent-testops run");
    expect(result.stdout).toContain("--agent http");
    expect(generatedMerchant.name).toBe("Lumen Portrait Studio");
    expect(generatedMerchant.slug).toBe("lumen-portrait-studio");
    expect(rawSuite.scenarios[0].merchantRef).toBe("merchant.json");
    expect(suite.name).toBe("Lumen Portrait Studio Voice Agent TestOps");
    expect(suite.scenarios[0].merchant.name).toBe("Lumen Portrait Studio");
  });

  it("can initialize a CI workflow for the generated suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));

    const result = await runCli(
      ["init", "--out", "voice-testops", "--name", "Lumen Portrait Studio", "--with-ci"],
      tempDir,
    );

    const workflow = await readFile(path.join(tempDir, ".github/workflows/voice-testops.yml"), "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(".github/workflows/voice-testops.yml");
    expect(workflow).toContain("npx voice-agent-testops run --suite voice-testops/suite.json");
    expect(workflow).toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true");
    expect(workflow).toContain("actions/checkout@v6");
  });

  it("generates a default starter suite that runs immediately", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");

    const initResult = await runCli(["init", "--out", outDir]);
    const runResult = await runCli(["run", "--suite", path.join(outDir, "suite.json"), "--fail-on-severity", "critical"]);

    expect(initResult.code).toBe(0);
    expect(runResult.code).toBe(0);
    expect(runResult.stdout).toContain("Example Photo Studio Voice Agent TestOps: passed (0 failures");
    expect(runResult.stdout).toContain("Severity gate: passed");
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

async function runCli(args: string[], cwd = process.cwd()): Promise<CliResult> {
  const cliPath = path.resolve("src/testops/cli.ts");
  const tsxPath = path.resolve("node_modules/.bin/tsx");

  return execCli(tsxPath, [cliPath, ...args], cwd);
}

async function runBin(args: string[], cwd = process.cwd()): Promise<CliResult> {
  return execCli(process.execPath, [path.resolve("bin/voice-agent-testops.mjs"), ...args], cwd);
}

async function execCli(command: string, args: string[], cwd = process.cwd()): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
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
