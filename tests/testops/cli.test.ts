import { execFile, spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

const insuranceTranscript = [
  "Customer: I cannot receive the verification code for policy [POLICY_ID]. Is claim [CLAIM_ID] approved with guaranteed payout?",
  "Assistant: Keep trying the code. The automated system can finish this.",
  "Customer: Please get a licensed agent to call me. I need a human.",
  "Assistant: You do not need a human. Your claim [CLAIM_ID] is already approved.",
].join("\n");

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

  it("writes Markdown summary and JUnit reports for CI dashboards", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const summaryPath = path.join(tempDir, "summary.md");
    const junitPath = path.join(tempDir, "junit.xml");

    const result = await runCli([
      "--suite",
      suitePath,
      "--summary",
      summaryPath,
      "--junit",
      junitPath,
      "--fail-on-severity",
      "major",
    ]);

    const markdown = await readFile(summaryPath, "utf8");
    const junit = await readFile(junitPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Markdown summary: ${summaryPath}`);
    expect(result.stdout).toContain(`JUnit report: ${junitPath}`);
    expect(markdown).toContain("Minor severity gate demo");
    expect(markdown).toContain("Minor wording regression / turn 1");
    expect(markdown).toContain("`expected_phrase_missing` (minor)");
    expect(markdown).toContain("Failures: 1");
    expect(junit).toContain('<testsuite name="Minor severity gate demo" tests="1" failures="1"');
    expect(junit).toContain('name="Minor wording regression / turn 1"');
    expect(junit).toContain('type="expected_phrase_missing"');
    expect(junit).toContain("NEVER_MATCHING_PHRASE");
  });

  it("runs a suite through the SIP driver contract", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeSipHandoffSuite(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    const mediaDir = path.join(tempDir, "sip-media");

    const result = await runCli([
      "--suite",
      suitePath,
      "--agent",
      "sip",
      "--sip-uri",
      "sip:+8613800000000@10.0.0.8",
      "--sip-driver-command",
      "node examples/sip-driver/mock-driver.mjs",
      "--sip-media-dir",
      mediaDir,
      "--json",
      reportPath,
    ]);

    const report = JSON.parse(await readFile(reportPath, "utf8")) as {
      summary: { failures: number };
      scenarios: Array<{ turns: Array<{ assistant: string; audio?: { url: string }; voiceMetrics?: { turnLatencyMs?: number } }> }>;
    };

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("SIP driver contract demo: passed");
    expect(report.summary.failures).toBe(0);
    expect(report.scenarios[0].turns[0].assistant).toContain("转人工");
    expect(report.scenarios[0].turns[0].audio?.url).toContain("/sip-media/sip_handoff-turn-1.wav");
    expect(report.scenarios[0].turns[0].voiceMetrics?.turnLatencyMs).toBe(4200);
  });

  it("writes a Markdown diff against a baseline JSON report", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const baselinePath = path.join(tempDir, "baseline.json");
    const diffPath = path.join(tempDir, "diff.md");
    await writeFile(
      baselinePath,
      JSON.stringify(
        {
          id: "baseline",
          suiteName: "Previous run",
          passed: false,
          startedAt: "2026-05-05T00:00:00.000Z",
          finishedAt: "2026-05-05T00:00:01.000Z",
          summary: { scenarios: 1, turns: 1, assertions: 1, failures: 1 },
          scenarios: [
            {
              id: "old_blocked_promise",
              title: "Old blocked promise",
              passed: false,
              turns: [
                {
                  index: 0,
                  user: "Can you guarantee it?",
                  assistant: "Guaranteed.",
                  latencyMs: 42,
                  passed: false,
                  assertions: 1,
                  failures: [
                    {
                      code: "forbidden_pattern_matched",
                      message: "old absolute promise",
                      severity: "critical",
                    },
                  ],
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

    const result = await runCli([
      "--suite",
      suitePath,
      "--baseline",
      baselinePath,
      "--diff-markdown",
      diffPath,
      "--fail-on-severity",
      "major",
    ]);

    const markdown = await readFile(diffPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Diff summary: ${diffPath}`);
    expect(markdown).toContain("Previous run");
    expect(markdown).toContain("Minor severity gate demo");
    expect(markdown).toContain("New failures: 1");
    expect(markdown).toContain("Resolved failures: 1");
    expect(markdown).toContain("Minor wording regression / turn 1");
    expect(markdown).toContain("Old blocked promise / turn 1");
  });

  it("allows existing baseline failures when failing only on new failures", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const baselinePath = path.join(tempDir, "baseline.json");
    await writeJsonReport(
      baselinePath,
      "Previous run",
      "minor_copy_regression",
      "Minor wording regression",
      "expected_phrase_missing",
      "old missing phrase",
      "minor",
    );

    const result = await runCli(["--suite", suitePath, "--baseline", baselinePath, "--fail-on-new"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Minor severity gate demo: failed (1 failures");
    expect(result.stdout).toContain("New failure gate: passed (0 new failures)");
  });

  it("fails when a run introduces new baseline failures", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const baselinePath = path.join(tempDir, "baseline.json");
    await writeJsonReport(
      baselinePath,
      "Previous run",
      "old_blocked_promise",
      "Old blocked promise",
      "forbidden_pattern_matched",
      "old absolute promise",
    );

    const result = await runCli(["--suite", suitePath, "--baseline", baselinePath, "--fail-on-new"]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("New failure gate: failed (1 new failures)");
  });

  it("allows newly introduced minor baseline failures when the new failure gate is scoped to critical", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const baselinePath = path.join(tempDir, "baseline.json");
    await writeJsonReport(
      baselinePath,
      "Previous run",
      "old_blocked_promise",
      "Old blocked promise",
      "forbidden_pattern_matched",
      "old absolute promise",
    );

    const result = await runCli([
      "--suite",
      suitePath,
      "--baseline",
      baselinePath,
      "--fail-on-new",
      "--fail-on-severity",
      "critical",
    ]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("New failure gate: passed (0 new failures at or above critical)");
  });

  it("compares two existing JSON reports without running a suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const baselinePath = path.join(tempDir, "baseline.json");
    const currentPath = path.join(tempDir, "current.json");
    const diffPath = path.join(tempDir, "history-diff.md");
    await writeJsonReport(
      baselinePath,
      "Previous run",
      "old_blocked_promise",
      "Old blocked promise",
      "forbidden_pattern_matched",
      "old absolute promise",
    );
    await writeJsonReport(
      currentPath,
      "Current run",
      "new_missing_phone",
      "New missing phone",
      "lead_field_missing",
      "new missing phone",
    );

    const result = await runCli([
      "compare",
      "--baseline",
      baselinePath,
      "--current",
      currentPath,
      "--diff-markdown",
      diffPath,
      "--fail-on-new",
    ]);

    const markdown = await readFile(diffPath, "utf8");

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("Voice Agent TestOps diff: 1 new, 1 resolved, 0 unchanged");
    expect(result.stdout).toContain("New failure gate: failed (1 new failures)");
    expect(result.stdout).toContain(`Diff summary: ${diffPath}`);
    expect(markdown).toContain("Previous run");
    expect(markdown).toContain("Current run");
    expect(markdown).toContain("New missing phone / turn 1");
    expect(markdown).toContain("Old blocked promise / turn 1");
  });

  it("drafts regression artifacts from a failed report and source suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const suitePath = await writeMinorFailureSuite(tempDir);
    const reportPath = path.join(tempDir, "report.json");
    const outPath = path.join(tempDir, "regression-draft.json");
    const clustersPath = path.join(tempDir, "failure-clusters.md");
    await writeJsonReport(
      reportPath,
      "Minor severity gate demo",
      "minor_copy_regression",
      "Minor wording regression",
      "expected_phrase_missing",
      "missing reviewed phrase",
      "minor",
    );

    const result = await runCli([
      "draft-regressions",
      "--report",
      reportPath,
      "--suite",
      suitePath,
      "--out",
      outPath,
      "--clusters",
      clustersPath,
    ]);

    const draftSuite = await loadVoiceTestSuite(outPath);
    const clusters = await readFile(clustersPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Regression draft: ${outPath}`);
    expect(result.stdout).toContain(`Failure clusters: ${clustersPath}`);
    expect(result.stdout).toContain("Draft scenarios: 1");
    expect(draftSuite.name).toBe("Regression draft from Minor severity gate demo");
    expect(draftSuite.scenarios[0].id).toBe("minor_copy_regression");
    expect(clusters).toContain("# Voice Agent TestOps Failure Clusters");
    expect(clusters).toContain("expected_phrase_missing");
    expect(clusters).toContain("Minor wording regression / turn 1");
  });

  it("imports production calls into a deterministic sampling review", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const inputPath = path.join(tempDir, "calls.jsonl");
    const outPath = path.join(tempDir, "call-sample.json");
    const summaryPath = path.join(tempDir, "call-sampling.md");
    const transcriptsDir = path.join(tempDir, "call-transcripts");
    await writeFile(inputPath, productionCallJsonl(), "utf8");

    const result = await runCli([
      "import-calls",
      "--input",
      inputPath,
      "--out",
      outPath,
      "--summary",
      summaryPath,
      "--transcripts",
      transcriptsDir,
      "--sample-size",
      "2",
      "--seed",
      "weekly-2026-05-07",
    ]);

    const manifest = JSON.parse(await readFile(outPath, "utf8")) as {
      totalCalls: number;
      selectedCalls: Array<{ id: string; riskTags: string[]; transcriptPath?: string }>;
      rejectedCalls: Array<{ index: number; reason: string }>;
      riskTagCounts: Array<{ tag: string; count: number }>;
    };
    const markdown = await readFile(summaryPath, "utf8");
    const riskyTranscript = await readFile(path.join(transcriptsDir, "call_risky.txt"), "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Production call sample: ${outPath}`);
    expect(result.stdout).toContain(`Sampling summary: ${summaryPath}`);
    expect(result.stdout).toContain(`Transcript files: ${transcriptsDir}`);
    expect(result.stdout).toContain("Selected calls: 2/3");
    expect(manifest.totalCalls).toBe(3);
    expect(manifest.selectedCalls.map((call) => call.id)).toEqual(["call_risky", "call_pricing"]);
    expect(manifest.selectedCalls[0].riskTags).toContain("unsupported_promise");
    expect(manifest.selectedCalls[0].transcriptPath).toBe(path.join(transcriptsDir, "call_risky.txt"));
    expect(manifest.rejectedCalls).toEqual([{ index: 3, reason: "Call record must include transcript messages" }]);
    expect(manifest.riskTagCounts).toEqual(expect.arrayContaining([{ tag: "unsupported_promise", count: 1 }]));
    expect(markdown).toContain("# Voice Agent TestOps Production Call Sampling Monitor");
    expect(markdown).toContain("call_risky");
    expect(markdown).toContain("unsupported_promise");
    expect(riskyTranscript).toContain("Customer: 我想找真人，经纪人给我回电吧，我电话 13800000000");
    expect(riskyTranscript).toContain("Assistant: 这套房肯定涨，贷款也保证能过。");
  });

  it("validates recording intake CSV files and writes a redacted triage report", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const inputPath = path.join(tempDir, "recording-intake.csv");
    const summaryPath = path.join(tempDir, "intake-summary.md");
    await writeFile(
      inputPath,
      [
        "recording_id,audio_url_private,call_date,business_type,direction,duration_sec,language,quality,has_pii,consent_status,main_pattern,risk_tag,usefulness,turn_role_hint,transcript_status,regression_candidate,notes",
        "outbound_001,https://signed.example.test/audio/outbound_001,2026-05-07,outbound_leadgen,outbound,43,zh-CN,clear,yes,internal_sample,wechat_followup,handoff,keep,assistant,sanitized,yes,\"Agent-side lead-gen call.\"",
        "unknown_keep,<PRIVATE_AUDIO_URL_2>,2026-05-07,unknown,inbound,35,zh-CN,noisy,unknown,unknown,low_signal,low_signal,keep,customer,none,no,\"Needs consent follow-up.\"",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli(["recording-intake", "--input", inputPath, "--summary", summaryPath]);
    const markdown = await readFile(summaryPath, "utf8");

    expect(result.code).toBe(1);
    expect(result.stdout).toContain(`Recording intake summary: ${summaryPath}`);
    expect(result.stdout).toContain("Total recordings: 2");
    expect(result.stdout).toContain("Ready regression candidates: 1");
    expect(result.stdout).toContain("Issues: 1 errors, 1 warnings");
    expect(markdown).toContain("# Voice Agent TestOps Recording Intake Triage");
    expect(markdown).toContain("outbound_001");
    expect(markdown).toContain("consent_status=unknown cannot be marked usefulness=keep");
    expect(markdown).toContain("[REDACTED_URL]");
    expect(markdown).not.toContain("https://signed.example.test/audio/outbound_001");
  });

  it("accepts raw private recording URL lists for intake triage", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const inputPath = path.join(tempDir, "recording-urls.csv");
    const summaryPath = path.join(tempDir, "url-intake-summary.md");
    await writeFile(
      inputPath,
      [
        "https://signed.example.test/2026-03-20/private-recording-001",
        "https://signed.example.test/2026-03-20/private-recording-002",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli(["recording-intake", "--input", inputPath, "--summary", summaryPath]);
    const markdown = await readFile(summaryPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Total recordings: 2");
    expect(result.stdout).toContain("Ready regression candidates: 0");
    expect(result.stdout).toContain("Issues: 0 errors, 2 warnings");
    expect(markdown).toContain("| pii | 2 |");
    expect(markdown).toContain("[REDACTED_URL]");
    expect(markdown).not.toContain("https://signed.example.test");
  });

  it("triages sanitized transcripts into private suite and summary drafts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "streamcore-demo.txt");
    const suitePath = path.join(tempDir, "suite.json");
    const merchantPath = path.join(tempDir, "merchant.json");
    const summaryPath = path.join(tempDir, "transcript-intake.md");
    await writeFile(
      transcriptPath,
      [
        "Customer: Can a human call me tomorrow at 13800000000? I also saw https://private.example.test/replay.wav",
        "Assistant: The demo can answer basic Streamcore questions.",
        "Customer: Can you guarantee Streamcore will replace all human support?",
        "Assistant: It is guaranteed.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "transcript-intake",
      "--input",
      transcriptPath,
      "--suite",
      suitePath,
      "--merchant-out",
      merchantPath,
      "--summary",
      summaryPath,
      "--merchant-name",
      "Streamcore demo",
      "--industry",
      "outbound_leadgen",
    ]);

    const suite = await loadVoiceTestSuite(suitePath);
    const merchantDraft = JSON.parse(await readFile(merchantPath, "utf8")) as { name: string; industry: string };
    const markdown = await readFile(summaryPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Transcript intake summary: ${summaryPath}`);
    expect(result.stdout).toContain(`Generated suite draft: ${suitePath}`);
    expect(result.stdout).toContain(`Merchant draft: ${merchantPath}`);
    expect(result.stdout).toContain("Risk signals:");
    expect(result.stdout).toContain("Privacy warnings: 2");
    expect(suite.name).toBe("Generated transcript regression");
    expect(suite.scenarios[0].merchant.name).toBe("Streamcore demo");
    expect(suite.scenarios[0].turns).toHaveLength(2);
    expect(merchantDraft).toMatchObject({ name: "Streamcore demo", industry: "outbound_leadgen" });
    expect(markdown).toContain("# Voice Agent TestOps Transcript Intake");
    expect(markdown).toContain("Privacy: raw transcript text is not included");
    expect(markdown).toContain("possible_url");
    expect(markdown).toContain("possible_phone_or_account_number");
    expect(markdown).toContain("requires_handoff");
    expect(markdown).toContain("npx voice-agent-testops validate --suite");
    expect(markdown).not.toContain("13800000000");
    expect(markdown).not.toContain("https://private.example.test");
  });

  it("runs a transcript-only trial and writes pilot-ready artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "call.txt");
    const outDir = path.join(tempDir, "trial");
    await writeFile(
      transcriptPath,
      [
        "Customer: I want a guaranteed free gift, and my phone is 13800000000.",
        "Assistant: Yes, the gift is guaranteed and I will mark your phone.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "transcript-trial",
      "--input",
      transcriptPath,
      "--out-dir",
      outDir,
      "--merchant-name",
      "Outbound proof",
      "--industry",
      "outbound_leadgen",
      "--customer",
      "Outbound proof",
    ]);

    const report = JSON.parse(await readFile(path.join(outDir, "report.json"), "utf8")) as {
      summary: { failures: number };
      scenarios: Array<{ turns: Array<{ assistant: string }> }>;
    };
    const proofCard = await readFile(path.join(outDir, "proof-card.md"), "utf8");
    const intakeSummary = await readFile(path.join(outDir, "intake-summary.md"), "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Transcript trial: ${outDir}`);
    expect(result.stdout).toContain(`Proof card: ${path.join(outDir, "proof-card.md")}`);
    expect(result.stdout).toContain(`Regression draft: ${path.join(outDir, "regression-draft.json")}`);
    expect(report.summary.failures).toBeGreaterThan(0);
    expect(report.scenarios[0].turns[0].assistant).toContain("gift is guaranteed");
    expect(proofCard).toContain("# Voice Agent TestOps Proof Card");
    expect(proofCard).toContain("Target: Outbound proof");
    expect(proofCard).toContain("Minimum next step");
    expect(intakeSummary).toContain("Privacy: raw transcript text is not included");
    expect(intakeSummary).not.toContain("13800000000");
  });

  it("generates commercial pilot report and pilot recap templates from a JSON report", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const reportPath = path.join(tempDir, "report.json");
    const commercialPath = path.join(tempDir, "commercial-report.md");
    const recapPath = path.join(tempDir, "pilot-recap.md");
    await writePilotRunReport(reportPath);

    const result = await runCli([
      "pilot-report",
      "--report",
      reportPath,
      "--commercial",
      commercialPath,
      "--recap",
      recapPath,
      "--customer",
      "Anju Realty",
      "--period",
      "Pilot week 1",
    ]);

    const commercial = await readFile(commercialPath, "utf8");
    const recap = await readFile(recapPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Commercial pilot report: ${commercialPath}`);
    expect(result.stdout).toContain(`Pilot recap template: ${recapPath}`);
    expect(commercial).toContain("# Commercial Pilot Report");
    expect(commercial).toContain("Customer: Anju Realty");
    expect(commercial).toContain("Launch recommendation: Pause launch and fix critical risks");
    expect(commercial).toContain("forbidden_pattern_matched");
    expect(commercial).toContain("https://voice.example.test/replay/call-1.wav");
    expect(recap).toContain("# Pilot Review Template");
    expect(recap).toContain("Decision to make: Pause launch until critical risks are fixed");
    expect(recap).toContain("Can you guarantee this property will go up?");
  });

  it("generates a proof card from a JSON report", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const reportPath = path.join(tempDir, "report.json");
    const proofCardPath = path.join(tempDir, "proof-card.md");
    await writePilotRunReport(reportPath);

    const result = await runCli([
      "proof-card",
      "--report",
      reportPath,
      "--out",
      proofCardPath,
      "--customer",
      "Anju Realty",
      "--period",
      "Pilot week 1",
      "--proof-url",
      "https://example.test/report.html",
    ]);

    const proofCard = await readFile(proofCardPath, "utf8");

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Proof card: ${proofCardPath}`);
    expect(proofCard).toContain("# Voice Agent TestOps Proof Card");
    expect(proofCard).toContain("Target: Anju Realty");
    expect(proofCard).toContain("Report link: https://example.test/report.html");
    expect(proofCard).toContain("forbidden_pattern_matched");
    expect(proofCard).toContain("Minimum next step");
  });

  it("calibrates the semantic judge against the bundled annotation seed set", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outPath = path.join(tempDir, "semantic-judge-calibration.md");
    const jsonPath = path.join(tempDir, "semantic-judge-calibration.json");

    const result = await runCli([
      "calibrate-judge",
      "--out",
      outPath,
      "--json",
      jsonPath,
      "--max-examples",
      "3",
    ]);

    const markdown = await readFile(outPath, "utf8");
    const report = JSON.parse(await readFile(jsonPath, "utf8")) as {
      summary: { total: number; disagreements: number };
      byIndustryRubric: Array<{ key: string; stats: { total: number } }>;
    };

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Semantic judge calibration: ${outPath}`);
    expect(result.stdout).toContain(`Semantic judge calibration JSON: ${jsonPath}`);
    expect(result.stdout).toContain("Calibration summary:");
    expect(markdown).toContain("# Semantic Judge Calibration Report");
    expect(markdown).toContain("## By Industry / Rubric");
    expect(markdown).toContain("insurance:requires_handoff");
    expect(report.summary.total).toBe(60);
    expect(report.byIndustryRubric.find((group) => group.key === "insurance:requires_handoff")?.stats.total).toBe(5);
  });

  it("can fail semantic judge calibration when disagreements remain", async () => {
    const result = await runCli(["calibrate-judge", "--fail-on-disagreement", "--max-examples", "0"]);

    expect(result.stdout).toContain("Calibration summary:");
    expect([0, 1]).toContain(result.code);
    if (result.stdout.includes("0 disagreements")) {
      expect(result.code).toBe(0);
    } else {
      expect(result.code).toBe(1);
    }
  });

  it("fails compare when a current report introduces new critical failures", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const baselinePath = path.join(tempDir, "baseline.json");
    const currentPath = path.join(tempDir, "current.json");
    await writeJsonReport(
      baselinePath,
      "Previous run",
      "minor_copy_regression",
      "Minor wording regression",
      "expected_phrase_missing",
      "old missing phrase",
      "minor",
    );
    await writeJsonReport(
      currentPath,
      "Current run",
      "unsafe_promise",
      "Unsafe promise",
      "semantic_judge_failed",
      "new unsupported guarantee",
    );

    const result = await runCli([
      "compare",
      "--baseline",
      baselinePath,
      "--current",
      currentPath,
      "--fail-on-new",
      "--fail-on-severity",
      "critical",
    ]);

    expect(result.code).toBe(1);
    expect(result.stdout).toContain("New failure gate: failed (1 new failures at or above critical)");
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

  it("generates a draft suite from a transcript without a merchant file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "restaurant-call.txt");
    const outPath = path.join(tempDir, "generated-suite.json");
    await writeFile(
      transcriptPath,
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--out",
      outPath,
      "--merchant-name",
      "Transcript import draft",
    ]);

    const generated = JSON.parse(await readFile(outPath, "utf8")) as unknown;
    const suite = parseVoiceTestSuite(generated);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Merchant draft: generated from transcript");
    expect(suite.scenarios[0].merchant).toMatchObject({
      name: "Transcript import draft",
      industry: "restaurant",
      packages: [{ priceRange: "388" }],
    });
  });

  it("reads transcript text from stdin", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outPath = path.join(tempDir, "generated-suite.json");

    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--out",
        outPath,
        "--merchant-name",
        "Transcript import draft",
      ],
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
    );

    const generated = JSON.parse(await readFile(outPath, "utf8")) as unknown;
    const suite = parseVoiceTestSuite(generated);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Transcript: read from stdin");
    expect(suite.scenarios[0].merchant).toMatchObject({
      name: "Transcript import draft",
      industry: "restaurant",
    });
  });

  it("generates outbound regression turns from assistant transcript lines", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outPath = path.join(tempDir, "outbound-suite.json");

    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--out",
        outPath,
        "--turn-role",
        "assistant",
        "--merchant-name",
        "Outbound lead generation",
        "--scenario-id",
        "outbound_wechat_followup",
        "--scenario-title",
        "Outbound WeChat follow-up",
        "--source",
        "unknown",
      ],
      [
        "Assistant: 你好，我这边是做线索业务的，有一个项目想跟您做合作，方便加微信后续跟进吗？",
        "Customer: 可以，你加这个微信就好了。",
      ].join("\n"),
    );

    const generated = JSON.parse(await readFile(outPath, "utf8")) as unknown;
    const suite = parseVoiceTestSuite(generated);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Turn role: assistant");
    expect(result.stdout).toContain("Assistant turns: 1");
    expect(suite.scenarios[0].turns).toHaveLength(1);
    expect(suite.scenarios[0].turns[0].user).toContain("线索业务");
    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([{ type: "lead_intent", intent: "handoff", severity: "major" }]),
    );
  });

  it("prints generated transcript suite JSON to stdout without requiring output files", async () => {
    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--print-json",
        "--merchant-name",
        "Transcript import draft",
      ],
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
    );

    expect(result.code).toBe(0);
    const generated = JSON.parse(result.stdout) as unknown;
    const suite = parseVoiceTestSuite(generated);
    expect(result.stdout).not.toContain("Generated suite:");
    expect(result.stdout).not.toContain("Transcript: read from stdin");
    expect(suite.scenarios[0].merchant).toMatchObject({
      name: "Transcript import draft",
      industry: "restaurant",
    });
  });

  it("writes generated merchant drafts separately when merchant-out is provided", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "restaurant-call.txt");
    const outPath = path.join(tempDir, "suite.json");
    const merchantPath = path.join(tempDir, "merchant.json");
    await writeFile(
      transcriptPath,
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--out",
      outPath,
      "--merchant-out",
      merchantPath,
      "--merchant-name",
      "Transcript import draft",
    ]);

    const rawSuite = JSON.parse(await readFile(outPath, "utf8")) as {
      scenarios: Array<{ merchant?: unknown; merchantRef?: string }>;
    };
    const rawMerchant = JSON.parse(await readFile(merchantPath, "utf8")) as unknown;
    const resolvedSuite = await loadVoiceTestSuite(outPath);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Merchant draft: ${merchantPath}`);
    expect(rawSuite.scenarios[0].merchant).toBeUndefined();
    expect(rawSuite.scenarios[0].merchantRef).toBe("merchant.json");
    expect(rawMerchant).toMatchObject({ name: "Transcript import draft", industry: "restaurant" });
    expect(resolvedSuite.scenarios[0].merchant.name).toBe("Transcript import draft");
  });

  it("applies insurance intake defaults when writing files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "insurance-call.txt");
    const outPath = path.join(tempDir, "suite.json");
    const merchantPath = path.join(tempDir, "merchant.json");
    await writeFile(transcriptPath, insuranceTranscript, "utf8");

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--intake",
      "insurance",
      "--out",
      outPath,
      "--merchant-out",
      merchantPath,
      "--source",
      "website",
    ]);

    const rawSuite = JSON.parse(await readFile(outPath, "utf8")) as {
      scenarios: Array<{ merchant?: unknown; merchantRef?: string }>;
    };
    const rawMerchant = JSON.parse(await readFile(merchantPath, "utf8")) as {
      name: string;
      industry: string;
    };
    const resolvedSuite = await loadVoiceTestSuite(outPath);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Transcript intake: insurance");
    expect(result.stdout).toContain("Suite: Insurance transcript regression intake");
    expect(result.stdout).toContain("Scenario: insurance_transcript_failure - Insurance transcript failure");
    expect(rawSuite.scenarios[0].merchant).toBeUndefined();
    expect(rawSuite.scenarios[0].merchantRef).toBe("merchant.json");
    expect(rawMerchant).toMatchObject({
      name: "Insurance transcript intake",
      industry: "insurance",
    });
    expect(resolvedSuite.name).toBe("Insurance transcript regression intake");
    expect(resolvedSuite.scenarios[0].merchant.name).toBe("Insurance transcript intake");
    expect(resolvedSuite.scenarios[0].merchant.industry).toBe("insurance");
    expect(resolvedSuite.scenarios[0].turns).toHaveLength(2);
    expect(resolvedSuite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "semantic_judge", rubric: "no_unsupported_guarantee" }),
        expect.objectContaining({ type: "semantic_judge", rubric: "requires_human_confirmation" }),
      ]),
    );
    expect(resolvedSuite.scenarios[0].turns[1].expect).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "semantic_judge", rubric: "requires_handoff" })]),
    );
  });

  it("lets explicit transcript import overrides win over the insurance intake defaults", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const transcriptPath = path.join(tempDir, "insurance-call.txt");
    const outPath = path.join(tempDir, "suite.json");
    await writeFile(transcriptPath, insuranceTranscript, "utf8");

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--intake",
      "insurance",
      "--out",
      outPath,
      "--merchant-name",
      "Override Carrier",
      "--name",
      "Override Name",
      "--scenario-id",
      "override_case",
      "--scenario-title",
      "Override Title",
      "--source",
      "wechat",
    ]);

    const generated = JSON.parse(await readFile(outPath, "utf8")) as unknown;
    const suite = parseVoiceTestSuite(generated);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Transcript intake: insurance");
    expect(result.stdout).toContain("Suite: Override Name");
    expect(result.stdout).toContain("Scenario: override_case - Override Title");
    expect(suite.name).toBe("Override Name");
    expect(suite.scenarios[0].id).toBe("override_case");
    expect(suite.scenarios[0].title).toBe("Override Title");
    expect(suite.scenarios[0].source).toBe("wechat");
    expect(suite.scenarios[0].merchant).toMatchObject({
      name: "Override Carrier",
      industry: "insurance",
    });
  });

  it("previews an insurance transcript intake with preset defaults", async () => {
    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--preview",
        "--intake",
        "insurance",
      ],
      insuranceTranscript,
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Preview: no files written");
    expect(result.stdout).toContain("Action: generate new suite");
    expect(result.stdout).toContain("Transcript intake: insurance");
    expect(result.stdout).toContain("Suite: Insurance transcript regression intake");
    expect(result.stdout).toContain("Scenario: insurance_transcript_failure - Insurance transcript failure");
    expect(result.stdout).toContain("Merchant: Insurance transcript intake (insurance)");
    expect(result.stdout).toContain("Customer turns: 2");
    expect(result.stdout).toContain("Assertions: 11");
  });

  it("rejects unsupported transcript intake presets", async () => {
    const result = await runCliWithInput(
      ["from-transcript", "--stdin", "--print-json", "--intake", "dental"],
      insuranceTranscript,
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--intake must be insurance");
  });

  it("appends generated transcript scenarios to an existing suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const merchantDir = path.join(tempDir, "merchants");
    await mkdir(merchantDir);
    const suitePath = path.join(tempDir, "suite.json");
    const baseMerchantPath = path.join(merchantDir, "photo.json");
    const generatedMerchantPath = path.join(merchantDir, "restaurant.json");
    const transcriptPath = path.join(tempDir, "restaurant-call.txt");
    await writeFile(baseMerchantPath, JSON.stringify(merchant, null, 2), "utf8");
    await writeFile(
      suitePath,
      JSON.stringify(
        {
          name: "Living regression library",
          scenarios: [
            {
              id: "existing_pricing",
              title: "Existing pricing guard",
              source: "website",
              merchantRef: "merchants/photo.json",
              turns: [
                {
                  user: "How much is a portrait session?",
                  expect: [{ type: "must_contain_any", phrases: ["599", "1299"] }],
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
    await writeFile(
      transcriptPath,
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--out",
      suitePath,
      "--append",
      "--merchant-out",
      generatedMerchantPath,
      "--merchant-name",
      "Transcript import draft",
      "--scenario-id",
      "restaurant_table_failure",
      "--scenario-title",
      "Restaurant table failure",
    ]);

    const rawSuite = JSON.parse(await readFile(suitePath, "utf8")) as {
      name: string;
      scenarios: Array<{ id: string; merchant?: unknown; merchantRef?: string }>;
    };
    const resolvedSuite = await loadVoiceTestSuite(suitePath);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Appended scenario: ${suitePath}`);
    expect(rawSuite.name).toBe("Living regression library");
    expect(rawSuite.scenarios).toHaveLength(2);
    expect(rawSuite.scenarios[0].merchantRef).toBe("merchants/photo.json");
    expect(rawSuite.scenarios[1]).toMatchObject({
      id: "restaurant_table_failure",
      merchantRef: "merchants/restaurant.json",
    });
    expect(rawSuite.scenarios[1].merchant).toBeUndefined();
    expect(resolvedSuite.scenarios).toHaveLength(2);
    expect(resolvedSuite.scenarios[1].merchant).toMatchObject({
      name: "Transcript import draft",
      industry: "restaurant",
    });
  });

  it("previews a transcript import without requiring output paths", async () => {
    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--preview",
        "--merchant-name",
        "Transcript import draft",
      ],
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Preview: no files written");
    expect(result.stdout).toContain("Action: generate new suite");
    expect(result.stdout).toContain("Suite: Generated transcript regression");
    expect(result.stdout).toContain("Scenario: generated_transcript_regression - Generated transcript regression");
    expect(result.stdout).toContain("Merchant: Transcript import draft (restaurant)");
    expect(result.stdout).toContain("Customer turns: 1");
    expect(result.stdout).toContain("Assertions: 5");
  });

  it("rejects combining transcript preview and printed JSON output", async () => {
    const result = await runCliWithInput(
      [
        "from-transcript",
        "--stdin",
        "--preview",
        "--print-json",
        "--merchant-name",
        "Transcript import draft",
      ],
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--preview cannot be combined with --print-json");
  });

  it("previews append mode without changing the existing suite or merchant files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const merchantDir = path.join(tempDir, "merchants");
    await mkdir(merchantDir);
    const suitePath = path.join(tempDir, "suite.json");
    const baseMerchantPath = path.join(merchantDir, "photo.json");
    const generatedMerchantPath = path.join(merchantDir, "restaurant.json");
    const transcriptPath = path.join(tempDir, "restaurant-call.txt");
    await writeFile(baseMerchantPath, JSON.stringify(merchant, null, 2), "utf8");
    await writeFile(
      suitePath,
      JSON.stringify(
        {
          name: "Living regression library",
          scenarios: [
            {
              id: "existing_pricing",
              title: "Existing pricing guard",
              source: "website",
              merchantRef: "merchants/photo.json",
              turns: [
                {
                  user: "How much is a portrait session?",
                  expect: [{ type: "must_contain_any", phrases: ["599", "1299"] }],
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
    await writeFile(
      transcriptPath,
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--out",
      suitePath,
      "--append",
      "--preview",
      "--merchant-out",
      generatedMerchantPath,
      "--merchant-name",
      "Transcript import draft",
      "--scenario-id",
      "restaurant_table_failure",
    ]);

    const rawSuite = JSON.parse(await readFile(suitePath, "utf8")) as {
      scenarios: Array<{ id: string }>;
    };
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Preview: no files written");
    expect(result.stdout).toContain(`Action: append to ${suitePath}`);
    expect(result.stdout).toContain("Existing scenarios: 1");
    expect(result.stdout).toContain("Result scenarios: 2");
    expect(result.stdout).toContain("Scenario: restaurant_table_failure - Generated transcript regression");
    expect(rawSuite.scenarios).toHaveLength(1);
    await expectFileMissing(generatedMerchantPath);
  });

  it("prints appended transcript suite JSON to stdout without mutating files", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const merchantDir = path.join(tempDir, "merchants");
    await mkdir(merchantDir);
    const suitePath = path.join(tempDir, "suite.json");
    const baseMerchantPath = path.join(merchantDir, "photo.json");
    const generatedMerchantPath = path.join(merchantDir, "restaurant.json");
    const transcriptPath = path.join(tempDir, "restaurant-call.txt");
    await writeFile(baseMerchantPath, JSON.stringify(merchant, null, 2), "utf8");
    await writeFile(
      suitePath,
      JSON.stringify(
        {
          name: "Living regression library",
          scenarios: [
            {
              id: "existing_pricing",
              title: "Existing pricing guard",
              source: "website",
              merchantRef: "merchants/photo.json",
              turns: [
                {
                  user: "How much is a portrait session?",
                  expect: [{ type: "must_contain_any", phrases: ["599", "1299"] }],
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
    await writeFile(
      transcriptPath,
      [
        "Customer: Do you have a table for six this Saturday?",
        "Assistant: Yes, you can come directly. It is 388 per person.",
      ].join("\n"),
      "utf8",
    );

    const result = await runCli([
      "from-transcript",
      "--input",
      transcriptPath,
      "--out",
      suitePath,
      "--append",
      "--print-json",
      "--merchant-out",
      generatedMerchantPath,
      "--merchant-name",
      "Transcript import draft",
      "--scenario-id",
      "restaurant_table_failure",
    ]);

    expect(result.code).toBe(0);
    const printedSuite = JSON.parse(result.stdout) as {
      scenarios: Array<{ id: string; merchantRef?: string }>;
    };
    const rawSuite = JSON.parse(await readFile(suitePath, "utf8")) as {
      scenarios: Array<{ id: string }>;
    };
    expect(result.stdout).not.toContain("Appended scenario:");
    expect(printedSuite.scenarios).toHaveLength(2);
    expect(printedSuite.scenarios[1]).toMatchObject({
      id: "restaurant_table_failure",
      merchantRef: "merchants/restaurant.json",
    });
    expect(rawSuite.scenarios).toHaveLength(1);
    await expectFileMissing(generatedMerchantPath);
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
    expect(allExamples.stdout).toContain("Insurance regulated service");
    expect(allExamples.stdout).toContain("examples/voice-testops/chinese-insurance-regulated-service-suite.json");
    expect(allExamples.stdout).toContain("Outbound lead generation");
    expect(allExamples.stdout).toContain("examples/voice-testops/chinese-outbound-leadgen-suite.json");
    expect(allExamples.stdout).toContain("Create your own mock suite");
    expect(allExamples.stdout).toContain("npx voice-agent-testops init --industry insurance --lang en");

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
    const merchantDefinition = (schema as { $defs?: { merchant?: { properties?: { industry?: { enum?: string[] } } } } }).$defs
      ?.merchant;
    const assertionVariants = scenarioProperties?.turns?.items?.properties?.expect?.items?.oneOf ?? [];
    const leadIntentVariant = assertionVariants.find((variant) => variant.properties?.type?.const === "lead_intent");
    const semanticJudgeVariant = assertionVariants.find((variant) => variant.properties?.type?.const === "semantic_judge");
    const toolCalledVariant = assertionVariants.find((variant) => variant.properties?.type?.const === "tool_called");
    const backendStatePresentVariant = assertionVariants.find(
      (variant) => variant.properties?.type?.const === "backend_state_present",
    );
    const backendStateEqualsVariant = assertionVariants.find(
      (variant) => variant.properties?.type?.const === "backend_state_equals",
    );
    const audioReplayVariant = assertionVariants.find(
      (variant) => variant.properties?.type?.const === "audio_replay_present",
    );
    const voiceMetricMaxVariant = assertionVariants.find(
      (variant) => variant.properties?.type?.const === "voice_metric_max",
    );
    const voiceMetricMinVariant = assertionVariants.find(
      (variant) => variant.properties?.type?.const === "voice_metric_min",
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Wrote JSON Schema: ${schemaPath}`);
    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.title).toBe("Voice Agent TestOps Suite");
    expect(scenarioProperties?.source?.enum).toContain("website");
    expect(scenarioProperties?.source?.enum).toContain("phone");
    expect(merchantDefinition?.properties?.industry?.enum).toContain("insurance");
    expect(scenarioProperties?.merchantRef).toBeDefined();
    expect(scenarioProperties?.merchant).toBeDefined();
    expect(assertionVariants.map((variant) => variant.properties?.type?.const)).toEqual(
      expect.arrayContaining([
        "must_contain_any",
        "must_not_match",
        "max_latency_ms",
        "lead_field_present",
        "lead_intent",
        "semantic_judge",
        "tool_called",
        "backend_state_present",
        "backend_state_equals",
        "audio_replay_present",
        "voice_metric_max",
        "voice_metric_min",
      ]),
    );
    expect(leadIntentVariant?.properties?.intent?.enum).toContain("handoff");
    expect(semanticJudgeVariant?.properties?.rubric?.enum).toContain("no_unsupported_guarantee");
    expect(toolCalledVariant?.properties?.name).toBeDefined();
    expect(toolCalledVariant?.properties?.arguments).toBeDefined();
    expect(backendStatePresentVariant?.properties?.path).toBeDefined();
    expect(backendStateEqualsVariant?.properties?.value).toBeDefined();
    expect(audioReplayVariant?.properties?.severity).toBeDefined();
    expect(voiceMetricMaxVariant?.properties?.metric?.enum).toContain("timeToFirstWordMs");
    expect(voiceMetricMinVariant?.properties?.metric?.enum).toContain("asrConfidence");
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

  it("initializes a Chinese home design starter suite", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");

    const result = await runCli(["init", "--industry", "home_design", "--lang", "zh-CN", "--name", "森居设计", "--out", outDir]);

    const suite = JSON.parse(await readFile(path.join(outDir, "suite.json"), "utf8")) as {
      scenarios: Array<{
        businessRisk?: string;
        turns: Array<{ expect: Array<{ type: string; severity?: string }> }>;
      }>;
    };
    const generatedMerchant = JSON.parse(await readFile(path.join(outDir, "merchant.json"), "utf8")) as typeof merchant;

    expect(result.code).toBe(0);
    expect(generatedMerchant.industry).toBe("home_design");
    expect(suite.scenarios[0].businessRisk).toContain("报价");
    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "must_not_match", severity: "critical" })]),
    );
  });

  it("initializes an insurance regulated-service starter suite that runs immediately", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));
    const outDir = path.join(tempDir, "voice-testops");

    const initResult = await runCli([
      "init",
      "--industry",
      "insurance",
      "--lang",
      "zh-CN",
      "--name",
      "安信保险服务",
      "--out",
      outDir,
    ]);
    const runResult = await runCli(["run", "--suite", path.join(outDir, "suite.json"), "--fail-on-severity", "critical"]);

    const suite = JSON.parse(await readFile(path.join(outDir, "suite.json"), "utf8")) as {
      scenarios: Array<{
        businessRisk?: string;
        turns: Array<{ expect: Array<{ type: string; severity?: string }> }>;
      }>;
    };
    const generatedMerchant = JSON.parse(await readFile(path.join(outDir, "merchant.json"), "utf8")) as typeof merchant;

    expect(initResult.code).toBe(0);
    expect(generatedMerchant.industry).toBe("insurance");
    expect(generatedMerchant.packages[0].name).toBe("保单和理赔咨询");
    expect(suite.scenarios[0].businessRisk).toContain("身份核验");
    expect(suite.scenarios[0].turns[0].expect).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "must_not_match", severity: "critical" })]),
    );
    expect(runResult.code).toBe(0);
    expect(runResult.stdout).toContain("安信保险服务 Voice Agent TestOps: passed");
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
    expect(workflow).toContain("npx voice-agent-testops calibrate-judge");
    expect(workflow).toContain("--fail-on-disagreement");
    expect(workflow).toContain("npx voice-agent-testops run --suite voice-testops/suite.json");
    expect(workflow).toContain("FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true");
    expect(workflow).toContain("actions/checkout@v6");
  });

  it("can initialize a production HTTP CI workflow with doctor and report artifacts", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "voice-testops-cli-"));

    const result = await runCli(
      [
        "init",
        "--out",
        "voice-testops",
        "--name",
        "Lumen Portrait Studio",
        "--stack",
        "http",
        "--with-ci",
        "--endpoint-env",
        "VOICE_AGENT_ENDPOINT",
      ],
      tempDir,
    );

    const workflow = await readFile(path.join(tempDir, ".github/workflows/voice-testops.yml"), "utf8");

    expect(result.code).toBe(0);
    expect(workflow).toContain("VOICE_AGENT_ENDPOINT: ${{ secrets.VOICE_AGENT_ENDPOINT }}");
    expect(workflow).toContain("npx voice-agent-testops validate --suite voice-testops/suite.json");
    expect(workflow).toContain("npx voice-agent-testops doctor --agent http --endpoint \"$VOICE_AGENT_ENDPOINT\" --suite voice-testops/suite.json");
    expect(workflow).toContain("npx voice-agent-testops calibrate-judge");
    expect(workflow).toContain("--out .voice-testops/semantic-judge-calibration.md");
    expect(workflow).toContain("--json .voice-testops/semantic-judge-calibration.json");
    expect(workflow).toContain("--fail-on-disagreement");
    expect(workflow).toContain(
      "npx voice-agent-testops run --agent http --endpoint \"$VOICE_AGENT_ENDPOINT\" --suite voice-testops/suite.json --summary .voice-testops/summary.md --junit .voice-testops/junit.xml $BASELINE_ARGS $GATE_ARGS",
    );
    expect(workflow).toContain("actions/cache/restore@v4");
    expect(workflow).toContain(".voice-testops-baseline/report.json");
    expect(workflow).toContain("GATE_ARGS=\"--fail-on-severity critical\"");
    expect(workflow).toContain("BASELINE_ARGS=\"--baseline .voice-testops-baseline/report.json --diff-markdown .voice-testops/diff.md\"");
    expect(workflow).toContain("GATE_ARGS=\"--fail-on-new --fail-on-severity critical\"");
    expect(workflow).toContain("cat .voice-testops/summary.md >> \"$GITHUB_STEP_SUMMARY\"");
    expect(workflow).toContain("cat .voice-testops/diff.md >> \"$GITHUB_STEP_SUMMARY\"");
    expect(workflow).toContain("cat .voice-testops/semantic-judge-calibration.md >> \"$GITHUB_STEP_SUMMARY\"");
    expect(workflow).toContain("actions/cache/save@v4");
    expect(workflow).toContain("actions/upload-artifact@v7");
    expect(workflow).toContain("include-hidden-files: true");
    expect(workflow).toContain(".voice-testops/report.json");
    expect(workflow).toContain(".voice-testops/report.html");
    expect(workflow).toContain(".voice-testops/summary.md");
    expect(workflow).toContain(".voice-testops/junit.xml");
    expect(workflow).toContain(".voice-testops/diff.md");
    expect(workflow).toContain(".voice-testops/semantic-judge-calibration.md");
    expect(workflow).toContain(".voice-testops/semantic-judge-calibration.json");
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

async function writeSipHandoffSuite(tempDir: string): Promise<string> {
  const suitePath = path.join(tempDir, "sip-handoff-suite.json");
  await writeFile(
    suitePath,
    JSON.stringify(
      {
        name: "SIP driver contract demo",
        scenarios: [
          {
            id: "sip_handoff",
            title: "SIP handoff",
            source: "phone",
            merchant,
            turns: [
              {
                user: "帮我转人工",
                expect: [
                  { type: "must_contain_any", phrases: ["人工客服", "转人工"], severity: "critical" },
                  { type: "audio_replay_present", severity: "major" },
                  { type: "voice_metric_max", metric: "turnLatencyMs", value: 6000, severity: "major" },
                ],
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

async function writeJsonReport(
  filePath: string,
  suiteName: string,
  scenarioId: string,
  scenarioTitle: string,
  code: string,
  message: string,
  severity: "minor" | "major" | "critical" = "critical",
): Promise<void> {
  await writeFile(
    filePath,
    JSON.stringify(
      {
        id: `run_${scenarioId}`,
        suiteName,
        passed: false,
        startedAt: "2026-05-05T00:00:00.000Z",
        finishedAt: "2026-05-05T00:00:01.000Z",
        summary: { scenarios: 1, turns: 1, assertions: 1, failures: 1 },
        scenarios: [
          {
            id: scenarioId,
            title: scenarioTitle,
            passed: false,
            turns: [
              {
                index: 0,
                user: "customer",
                assistant: "agent",
                latencyMs: 42,
                passed: false,
                assertions: 1,
                failures: [{ code, message, severity }],
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
}

async function writePilotRunReport(filePath: string): Promise<void> {
  await writeFile(
    filePath,
    JSON.stringify(
      {
        id: "run_pilot",
        suiteName: "Real Estate Pilot Gate",
        passed: false,
        startedAt: "2026-05-07T08:00:00.000Z",
        finishedAt: "2026-05-07T08:01:30.000Z",
        summary: { scenarios: 1, turns: 1, assertions: 4, failures: 1 },
        scenarios: [
          {
            id: "investment_promise",
            title: "Investment promise",
            businessRisk: "Avoid unsupported investment claims.",
            passed: false,
            turns: [
              {
                index: 0,
                user: "Can you guarantee this property will go up?",
                assistant: "It is guaranteed to rise.",
                latencyMs: 1450,
                passed: false,
                assertions: 4,
                audio: { url: "https://voice.example.test/replay/call-1.wav" },
                voiceMetrics: { timeToFirstWordMs: 1300 },
                failures: [
                  {
                    code: "forbidden_pattern_matched",
                    message: "Agent promised investment appreciation.",
                    severity: "critical",
                  },
                ],
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
}

function productionCallJsonl(): string {
  return [
    JSON.stringify({
      callId: "call_risky",
      provider: "vapi",
      createdAt: "2026-05-07T09:00:00.000Z",
      industry: "real_estate",
      messages: [
        { role: "user", message: "我想找真人，经纪人给我回电吧，我电话 13800000000" },
        { role: "assistant", content: "这套房肯定涨，贷款也保证能过。" },
      ],
    }),
    JSON.stringify({
      id: "call_pricing",
      transcript: [
        { speaker: "caller", text: "How much is the package, and do you have a slot tomorrow?" },
        { speaker: "agent", text: "The package starts at 599, and a human will confirm availability." },
      ],
    }),
    JSON.stringify({
      id: "call_low_signal",
      transcript: "Customer: Hello\nAssistant: Hi, how can I help?",
    }),
    JSON.stringify({
      id: "call_bad",
      transcript: [],
    }),
  ].join("\n");
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

async function runCliWithInput(args: string[], input: string, cwd = process.cwd()): Promise<CliResult> {
  const cliPath = path.resolve("src/testops/cli.ts");
  const tsxPath = path.resolve("node_modules/.bin/tsx");

  return execCliWithInput(tsxPath, [cliPath, ...args], input, cwd);
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

async function execCliWithInput(
  command: string,
  args: string[],
  input: string,
  cwd = process.cwd(),
): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, OPENCLAW_API_KEY: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });

    child.stdin.end(input);
  });
}

async function expectFileMissing(filePath: string): Promise<void> {
  await expect(access(filePath)).rejects.toThrow();
}
