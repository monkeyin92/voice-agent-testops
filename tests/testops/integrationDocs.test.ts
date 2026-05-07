import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const integrationDocs = [
  {
    path: "docs/integrations/http.md",
    title: "Generic HTTP Agent",
    phrases: [
      "POST /test-turn",
      "npm run example:http-agent",
      "--agent http",
      "spoken",
      "summary",
      "tools",
      "state",
      "audio",
      "voiceMetrics",
      "tool_called",
      "backend_state_equals",
      "audio_replay_present",
      "voice_metric_max",
      "voice_metric_min",
    ],
  },
  {
    path: "docs/integrations/openclaw.md",
    title: "OpenClaw",
    phrases: ["/v1/responses", "--agent openclaw", "--openclaw-mode responses", "OPENCLAW_AGENT_URL"],
  },
  {
    path: "docs/integrations/vapi.md",
    title: "Vapi",
    phrases: [
      "test-turn bridge",
      "--agent http",
      "npm run example:voice-platform-bridge",
      "http://127.0.0.1:4319/test-turn",
      "Server URLs",
      "vapi listen --forward-to",
      "/vapi/webhook",
      "assistant.server.url",
      "spoken",
    ],
  },
  {
    path: "docs/integrations/retell.md",
    title: "Retell",
    phrases: [
      "custom LLM",
      "test-turn bridge",
      "--agent http",
      "npm run example:voice-platform-bridge",
      "http://127.0.0.1:4319/test-turn",
      "Call Event Webhook",
      "LLM WebSocket",
      "/retell/webhook",
      "call_analyzed",
    ],
  },
  {
    path: "docs/integrations/livekit.md",
    title: "LiveKit Agents",
    phrases: ["test-turn bridge", "--agent http", "LIVEKIT_URL", "summary"],
  },
  {
    path: "docs/integrations/pipecat.md",
    title: "Pipecat",
    phrases: ["pipeline", "test-turn bridge", "--agent http", "PIPECAT_TEST_AGENT_URL"],
  },
];

describe("integration documentation", () => {
  it("links every integration guide from the default English README", () => {
    const readme = readFileSync("README.md", "utf8");

    for (const doc of integrationDocs) {
      expect(readme).toContain(`[${doc.title}](${doc.path})`);
    }
  });

  it("keeps a Chinese README entry to the integration guides", () => {
    const readme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("集成文档");
    expect(readme).toContain("[HTTP](docs/integrations/http.md)");
    expect(readme).toContain("[OpenClaw](docs/integrations/openclaw.md)");
    expect(readme).toContain("--fail-on-severity critical");
  });

  it("documents the transcript-to-regression workflow", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");
    const mockDataGuide = readFileSync("docs/guides/mock-data.md", "utf8");
    const chineseMockDataGuide = readFileSync("docs/guides/mock-data.zh-CN.md", "utf8");

    expect(packageJson.scripts["suite:from-transcript"]).toContain("from-transcript");
    expect(packageJson.scripts["calls:import"]).toContain("import-calls");
    expect(existsSync("examples/voice-testops/transcripts/failed-photo-booking.txt")).toBe(true);
    expect(existsSync("examples/voice-testops/production-calls/sample-calls.jsonl")).toBe(true);
    expect(readme).toContain("Turn A Real Failure Into A Regression Test");
    expect(readme).toContain("npx voice-agent-testops from-transcript");
    expect(readme).toContain("npx voice-agent-testops draft-regressions");
    expect(readme).toContain("npx voice-agent-testops import-calls");
    expect(readme).toContain("npx voice-agent-testops pilot-report");
    expect(readme).toContain("failure-clusters.md");
    expect(readme).toContain("regression-draft.json");
    expect(readme).toContain("call-sample.json");
    expect(readme).toContain("call-sampling.md");
    expect(readme).toContain("commercial-report.md");
    expect(readme).toContain("pilot-recap.md");
    expect(readme).toContain("call-transcripts");
    expect(readme).toContain("examples/voice-testops/production-calls/sample-calls.jsonl");
    expect(readme).toContain("pbpaste | npx voice-agent-testops from-transcript");
    expect(readme).toContain("--preview");
    expect(readme).toContain("--stdin");
    expect(readme).toContain("--input examples/voice-testops/transcripts/failed-photo-booking.txt");
    expect(readme).toContain("--append");
    expect(readme).toContain("--merchant-out voice-testops/merchant.json");
    expect(readme).toContain("--merchant-name \"Lumen Portrait Studio\"");
    expect(readme).toContain("--print-json");
    expect(readme).toContain("jq '.scenarios[0].turns | length'");
    expect(chineseReadme).toContain("把真实失败对话变成回归测试");
    expect(chineseReadme).toContain("npx voice-agent-testops from-transcript");
    expect(chineseReadme).toContain("npx voice-agent-testops draft-regressions");
    expect(chineseReadme).toContain("npx voice-agent-testops import-calls");
    expect(chineseReadme).toContain("npx voice-agent-testops pilot-report");
    expect(chineseReadme).toContain("failure-clusters.md");
    expect(chineseReadme).toContain("regression-draft.json");
    expect(chineseReadme).toContain("call-sample.json");
    expect(chineseReadme).toContain("call-sampling.md");
    expect(chineseReadme).toContain("commercial-report.md");
    expect(chineseReadme).toContain("pilot-recap.md");
    expect(chineseReadme).toContain("call-transcripts");
    expect(chineseReadme).toContain("examples/voice-testops/production-calls/sample-calls.jsonl");
    expect(chineseReadme).toContain("pbpaste | npx voice-agent-testops from-transcript");
    expect(chineseReadme).toContain("--preview");
    expect(chineseReadme).toContain("--stdin");
    expect(chineseReadme).toContain("--input examples/voice-testops/transcripts/failed-photo-booking.txt");
    expect(chineseReadme).toContain("--append");
    expect(chineseReadme).toContain("--merchant-out voice-testops/merchant.json");
    expect(chineseReadme).toContain("--merchant-name \"光影写真馆\"");
    expect(chineseReadme).toContain("--print-json");
    expect(chineseReadme).toContain("jq '.scenarios[0].turns | length'");
    expect(mockDataGuide).toContain("--print-json");
    expect(mockDataGuide).toContain("voice-testops/generated-suite.json");
    expect(mockDataGuide).toContain("draft-regressions");
    expect(mockDataGuide).toContain("import-calls");
    expect(chineseMockDataGuide).toContain("--print-json");
    expect(chineseMockDataGuide).toContain("voice-testops/generated-suite.json");
    expect(chineseMockDataGuide).toContain("draft-regressions");
    expect(chineseMockDataGuide).toContain("import-calls");
  });

  it("documents the init quickstart in both READMEs", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("npx voice-agent-testops init");
    expect(readme).toContain("npx voice-agent-testops init --industry restaurant --lang en");
    expect(readme).toContain("npx voice-agent-testops validate --suite voice-testops/suite.json");
    expect(readme).toContain("npx voice-agent-testops run --suite voice-testops/suite.json");
    expect(chineseReadme).toContain("npx voice-agent-testops init");
    expect(chineseReadme).toContain("npx voice-agent-testops init --industry restaurant --lang zh-CN");
    expect(chineseReadme).toContain("npx voice-agent-testops validate --suite voice-testops/suite.json");
    expect(chineseReadme).toContain("npx voice-agent-testops run --suite voice-testops/suite.json");
  });

  it("documents the bilingual business example library", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    for (const suitePath of [
      "examples/voice-testops/chinese-dental-clinic-suite.json",
      "examples/voice-testops/english-dental-clinic-suite.json",
      "examples/voice-testops/chinese-restaurant-booking-suite.json",
      "examples/voice-testops/english-restaurant-booking-suite.json",
      "examples/voice-testops/chinese-real-estate-agent-suite.json",
      "examples/voice-testops/english-real-estate-agent-suite.json",
    ]) {
      expect(readme).toContain(suitePath);
      expect(chineseReadme).toContain(suitePath);
    }
  });

  it("documents how to generate mock example data in both languages", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(existsSync("docs/guides/mock-data.md")).toBe(true);
    expect(existsSync("docs/guides/mock-data.zh-CN.md")).toBe(true);
    expect(readme).toContain("Create Mock Data");
    expect(readme).toContain("[Mock data guide](docs/guides/mock-data.md)");
    expect(readme).toContain("npx voice-agent-testops list --lang en");
    expect(chineseReadme).toContain("生成 Mock 数据");
    expect(chineseReadme).toContain("[Mock 数据指南](docs/guides/mock-data.zh-CN.md)");
    expect(chineseReadme).toContain("npx voice-agent-testops list --lang zh-CN");
  });

  it("documents the doctor command in both READMEs", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("npx voice-agent-testops doctor --agent http --endpoint");
    expect(readme).toContain("--suite voice-testops/suite.json");
    expect(readme).toContain("Endpoint reachable: ok");
    expect(readme).toContain("spoken: ok");
    expect(chineseReadme).toContain("npx voice-agent-testops doctor --agent http --endpoint");
    expect(chineseReadme).toContain("--suite voice-testops/suite.json");
    expect(chineseReadme).toContain("Endpoint reachable: ok");
    expect(chineseReadme).toContain("spoken: ok");
  });

  it("documents JSON Schema export and VS Code autocomplete in both READMEs", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("npx voice-agent-testops schema --out voice-testops/voice-test-suite.schema.json");
    expect(readme).toContain('"json.schemas"');
    expect(readme).toContain("voice-test-suite.schema.json");
    expect(chineseReadme).toContain("npx voice-agent-testops schema --out voice-testops/voice-test-suite.schema.json");
    expect(chineseReadme).toContain('"json.schemas"');
    expect(chineseReadme).toContain("voice-test-suite.schema.json");
  });

  it("documents the generated CI workflow with endpoint secrets", () => {
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("--endpoint-env VOICE_AGENT_ENDPOINT");
    expect(readme).toContain("GitHub Secret");
    expect(readme).toContain("VOICE_AGENT_ENDPOINT");
    expect(readme).toContain("doctor --agent http");
    expect(readme).toContain("actions/upload-artifact");
    expect(readme).toContain("--summary .voice-testops/summary.md");
    expect(readme).toContain("--junit .voice-testops/junit.xml");
    expect(readme).toContain("--baseline .voice-testops-baseline/report.json");
    expect(readme).toContain("--diff-markdown .voice-testops/diff.md");
    expect(readme).toContain("--fail-on-new");
    expect(readme).toContain("npx voice-agent-testops compare");
    expect(readme).toContain("--current .voice-testops/report.json");
    expect(readme).toContain("GITHUB_STEP_SUMMARY");
    expect(chineseReadme).toContain("--endpoint-env VOICE_AGENT_ENDPOINT");
    expect(chineseReadme).toContain("GitHub Secret");
    expect(chineseReadme).toContain("VOICE_AGENT_ENDPOINT");
    expect(chineseReadme).toContain("doctor --agent http");
    expect(chineseReadme).toContain("actions/upload-artifact");
    expect(chineseReadme).toContain("--summary .voice-testops/summary.md");
    expect(chineseReadme).toContain("--junit .voice-testops/junit.xml");
    expect(chineseReadme).toContain("--baseline .voice-testops-baseline/report.json");
    expect(chineseReadme).toContain("--diff-markdown .voice-testops/diff.md");
    expect(chineseReadme).toContain("--fail-on-new");
    expect(chineseReadme).toContain("npx voice-agent-testops compare");
    expect(chineseReadme).toContain("--current .voice-testops/report.json");
    expect(chineseReadme).toContain("GITHUB_STEP_SUMMARY");
  });

  it("documents the external pilot readiness review", () => {
    const reviewPath = "docs/ops/external-pilot-readiness-review.zh-CN.md";
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");
    const roadmap = readFileSync("docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md", "utf8");

    expect(existsSync(reviewPath)).toBe(true);
    expect(readme).toContain(`[External pilot readiness review](${reviewPath})`);
    expect(chineseReadme).toContain(`[外部试点就绪复盘](${reviewPath})`);
    expect(roadmap).toContain(`[外部试点就绪复盘](../ops/external-pilot-readiness-review.zh-CN.md)`);

    const review = readFileSync(reviewPath, "utf8");
    for (const phrase of [
      "当前结论",
      "P0/P1/P2 能力映射",
      "30 分钟外部试点路径",
      "Go / No-Go",
      "阻塞缺口",
      "非阻塞缺口",
      "下一步优先级",
      "验收命令和产物",
    ]) {
      expect(review).toContain(phrase);
    }
  });

  it("documents the external pilot runbook", () => {
    const runbookPath = "docs/ops/external-pilot-runbook.zh-CN.md";
    const readme = readFileSync("README.md", "utf8");
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");
    const readinessReview = readFileSync("docs/ops/external-pilot-readiness-review.zh-CN.md", "utf8");

    expect(existsSync(runbookPath)).toBe(true);
    expect(readme).toContain(`[External pilot runbook](${runbookPath})`);
    expect(chineseReadme).toContain(`[外部试点 Runbook](${runbookPath})`);
    expect(readinessReview).toContain(`[外部试点 Runbook](external-pilot-runbook.zh-CN.md)`);

    const runbook = readFileSync(runbookPath, "utf8");
    for (const phrase of [
      "适用对象",
      "前置条件",
      "10 分钟本地 demo",
      "30 分钟 HTTP bridge 试点",
      "Endpoint contract",
      "生成试点产物",
      "常见失败和处理",
      "反馈收集清单",
      "npx voice-agent-testops doctor",
      "npx voice-agent-testops pilot-report",
    ]) {
      expect(runbook).toContain(phrase);
    }
  });

  it("documents the setup contract and copy-paste commands for every supported stack", () => {
    for (const doc of integrationDocs) {
      expect(existsSync(doc.path), `${doc.path} should exist`).toBe(true);

      const content = readFileSync(doc.path, "utf8");
      expect(content).toContain(`# ${doc.title}`);
      expect(content).toContain("## Run it");
      expect(content).toContain("## Return contract");

      for (const phrase of doc.phrases) {
        expect(content).toContain(phrase);
      }
    }
  });
});
