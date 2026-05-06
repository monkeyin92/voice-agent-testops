import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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

  it("lists bundled examples and supports language and industry filters", async () => {
    const allExamples = await runCli(["list"]);
    const englishRestaurantExamples = await runCli(["list", "--lang", "en", "--industry", "restaurant"]);

    expect(allExamples.code).toBe(0);
    expect(allExamples.stdout).toContain("Example suites");
    expect(allExamples.stdout).toContain("Dental clinic");
    expect(allExamples.stdout).toContain("examples/voice-testops/english-dental-clinic-suite.json");
    expect(allExamples.stdout).toContain("examples/voice-testops/chinese-dental-clinic-suite.json");
    expect(allExamples.stdout).toContain("Create your own mock suite");
    expect(allExamples.stdout).toContain("npx voice-agent-testops init --industry restaurant --lang en");

    expect(englishRestaurantExamples.code).toBe(0);
    expect(englishRestaurantExamples.stdout).toContain("Restaurant booking");
    expect(englishRestaurantExamples.stdout).toContain("examples/voice-testops/english-restaurant-booking-suite.json");
    expect(englishRestaurantExamples.stdout).not.toContain("examples/voice-testops/chinese-restaurant-booking-suite.json");
    expect(englishRestaurantExamples.stdout).not.toContain("examples/voice-testops/english-dental-clinic-suite.json");
  });

  it("rejects unknown example list filters with a clear message", async () => {
    const result = await runCli(["list", "--lang", "fr"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--lang must be en or zh-CN");
  });

  it("diagnoses a healthy HTTP agent endpoint", async () => {
    const requests: unknown[] = [];
    const server = await startDoctorServer(async (request) => {
      requests.push(request);

      return {
        spoken: "Solo portrait is $99-$199. Please leave your phone and preferred time.",
        summary: {
          source: "website",
          intent: "pricing",
          need: "Customer asks about price",
          questions: ["What is the price for a solo portrait package?"],
          level: "medium",
          nextAction: "Follow up after confirming availability",
          transcript: [
            { role: "customer", text: "What is the price for a solo portrait package?", at: "2026-05-03T00:00:00.000Z" },
            { role: "assistant", text: "Solo portrait is $99-$199. Please leave your phone.", at: "2026-05-03T00:00:01.000Z" },
          ],
        },
      };
    });

    try {
      const result = await runCli(["doctor", "--agent", "http", "--endpoint", server.url]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Voice Agent TestOps doctor");
      expect(result.stdout).toContain("Endpoint reachable: ok");
      expect(result.stdout).toContain("spoken: ok");
      expect(result.stdout).toContain("summary: ok");
      expect(result.stdout).toContain("Doctor passed");
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        suiteName: "Voice Agent TestOps doctor",
        scenarioId: "doctor_pricing_probe",
        turnIndex: 0,
        customerText: "What is the price for a solo portrait package?",
        source: "website",
        merchant: { name: "Doctor Demo Photo Studio", industry: "photography" },
        messages: [],
      });
    } finally {
      await server.close();
    }
  });

  it("uses the first scenario from a suite when doctor receives --suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");
    await runCli(["init", "--out", outDir, "--industry", "restaurant", "--lang", "zh-CN"]);

    const requests: unknown[] = [];
    const server = await startDoctorServer(async (request) => {
      requests.push(request);

      return {
        spoken: "双人晚餐套餐是 198-298 元，包间需要确认桌态，请留下电话。",
        summary: {
          source: "website",
          intent: "pricing",
          need: "客户咨询双人晚餐套餐和包间",
          questions: ["双人晚餐套餐多少钱，今晚能保证有包间吗"],
          level: "medium",
          nextAction: "联系客户确认桌态和预约信息",
          transcript: [
            { role: "customer", text: "双人晚餐套餐多少钱，今晚能保证有包间吗", at: "2026-05-03T00:00:00.000Z" },
            { role: "assistant", text: "双人晚餐套餐是 198-298 元，包间需要确认桌态。", at: "2026-05-03T00:00:01.000Z" },
          ],
        },
      };
    });

    try {
      const result = await runCli([
        "doctor",
        "--agent",
        "http",
        "--endpoint",
        server.url,
        "--suite",
        path.join(outDir, "suite.json"),
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Suite valid: ok");
      expect(result.stdout).toContain("Probe scenario: dinner_set_price");
      expect(result.stdout).toContain("Endpoint reachable: ok");
      expect(result.stdout).toContain("Doctor passed");
      expect(requests[0]).toMatchObject({
        suiteName: "云栖小馆 Voice Agent TestOps",
        scenarioId: "dinner_set_price",
        turnIndex: 0,
        customerText: "双人晚餐套餐多少钱，今晚能保证有包间吗",
        source: "website",
        merchant: { name: "云栖小馆", industry: "restaurant" },
        messages: [],
      });
    } finally {
      await server.close();
    }
  });

  it("returns an actionable doctor failure when an HTTP endpoint omits spoken", async () => {
    const server = await startDoctorServer(async () => ({ text: "I used the wrong response field." }));

    try {
      const result = await runCli(["doctor", "--endpoint", server.url]);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain("Endpoint reachable: ok");
      expect(result.stdout).toContain("spoken: failed");
      expect(result.stdout).toContain("Return a JSON object with a non-empty `spoken` string.");
      expect(result.stderr).toContain("Doctor failed");
    } finally {
      await server.close();
    }
  });

  it("exports a JSON Schema for suite authoring and VS Code completion", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const schemaPath = path.join(tempDir, "voice-test-suite.schema.json");

    const result = await runCli(["schema", "--out", schemaPath]);
    const schema = JSON.parse(await readFile(schemaPath, "utf8")) as {
      $schema?: string;
      title?: string;
      properties?: {
        scenarios?: {
          items?: {
            properties?: {
              source?: { enum?: string[] };
              merchantRef?: unknown;
              merchant?: unknown;
              turns?: {
                items?: {
                  properties?: {
                    expect?: {
                      items?: {
                        oneOf?: Array<{ properties?: Record<string, { const?: string; enum?: string[] }> }>;
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };

    const scenarioProperties = schema.properties?.scenarios?.items?.properties;
    const assertionVariants = scenarioProperties?.turns?.items?.properties?.expect?.items?.oneOf ?? [];
    const leadIntentVariant = assertionVariants.find((variant) => variant.properties?.type?.const === "lead_intent");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Wrote JSON Schema: ${schemaPath}`);
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.title).toBe("Voice Agent TestOps Suite");
    expect(scenarioProperties?.source?.enum).toContain("website");
    expect(scenarioProperties?.merchantRef).toBeDefined();
    expect(scenarioProperties?.merchant).toBeDefined();
    expect(assertionVariants.map((variant) => variant.properties?.type?.const)).toEqual(
      expect.arrayContaining(["must_contain_any", "must_not_match", "max_latency_ms", "lead_field_present", "lead_intent"]),
    );
    expect(leadIntentVariant?.properties?.intent?.enum).toContain("handoff");
  });

  it("prints the suite JSON Schema to stdout when no output path is provided", async () => {
    const result = await runCli(["schema"]);
    const schema = JSON.parse(result.stdout) as { title?: string };

    expect(result.code).toBe(0);
    expect(schema.title).toBe("Voice Agent TestOps Suite");
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
    expect(result.stdout).toContain("npx voice-agent-testops validate");
    expect(result.stdout).toContain("npx voice-agent-testops run");
    expect(result.stdout).toContain("--agent http");
    expect(generatedMerchant.name).toBe("Lumen Portrait Studio");
    expect(generatedMerchant.slug).toBe("lumen-portrait-studio");
    expect(rawSuite.scenarios[0].merchantRef).toBe("merchant.json");
    expect(suite.name).toBe("Lumen Portrait Studio Voice Agent TestOps");
    expect(suite.scenarios[0].merchant.name).toBe("Lumen Portrait Studio");
  });

  it("initializes bilingual industry mock data for a custom vertical", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");

    const initResult = await runCli(["init", "--out", outDir, "--industry", "restaurant", "--lang", "zh-CN"]);
    const generatedMerchant = JSON.parse(await readFile(path.join(outDir, "merchant.json"), "utf8")) as typeof merchant;
    const suite = await loadVoiceTestSuite(path.join(outDir, "suite.json"));
    const runResult = await runCli(["run", "--suite", path.join(outDir, "suite.json"), "--fail-on-severity", "critical"]);

    expect(initResult.code).toBe(0);
    expect(generatedMerchant.name).toBe("云栖小馆");
    expect(generatedMerchant.industry).toBe("restaurant");
    expect(generatedMerchant.packages[0].name).toBe("双人晚餐套餐");
    expect(suite.name).toBe("云栖小馆 Voice Agent TestOps");
    expect(suite.scenarios[0].title).toContain("餐厅");
    expect(suite.scenarios[0].turns[0].user).toContain("双人晚餐");
    expect(runResult.code).toBe(0);
    expect(runResult.stdout).toContain("云栖小馆 Voice Agent TestOps: passed");
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
    expect(workflow).toContain("npx voice-agent-testops validate --suite voice-testops/suite.json");
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

  it("validates a suite without running the agent", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");
    await runCli(["init", "--out", outDir]);

    const result = await runCli(["validate", "--suite", path.join(outDir, "suite.json")]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Suite valid: Example Photo Studio Voice Agent TestOps");
    expect(result.stdout).toContain("Scenarios: 1");
    expect(result.stdout).toContain("Turns: 1");
    expect(result.stdout).toContain("Assertions: 4");
    expect(result.stdout).not.toContain("turn 1/1: running");
  });

  it("fails validation when merchantRef cannot be resolved", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = path.join(tempDir, "suite.json");
    await writeFile(
      suitePath,
      JSON.stringify(
        {
          name: "Broken suite",
          scenarios: [
            {
              id: "missing_merchant",
              title: "Missing merchant reference",
              source: "website",
              merchantRef: "missing-merchant.json",
              turns: [{ user: "How much is it?", expect: [] }],
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runCli(["validate", "--suite", suitePath]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("missing-merchant.json");
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

async function startDoctorServer(
  handler: (request: unknown) => Promise<unknown>,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
        const result = await handler(body);
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(result));
      } catch (error) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : "server error" }));
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Doctor test server did not bind to a TCP port");
  }

  return {
    url: `http://127.0.0.1:${address.port}/test-turn`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
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
