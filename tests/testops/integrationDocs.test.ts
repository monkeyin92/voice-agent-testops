import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const integrationDocs = [
  {
    path: "docs/integrations/http.md",
    title: "Generic HTTP Agent",
    phrases: ["POST /test-turn", "npm run example:http-agent", "--agent http", "spoken", "summary"],
  },
  {
    path: "docs/integrations/openclaw.md",
    title: "OpenClaw",
    phrases: ["/v1/responses", "--agent openclaw", "--openclaw-mode responses", "OPENCLAW_AGENT_URL"],
  },
  {
    path: "docs/integrations/vapi.md",
    title: "Vapi",
    phrases: ["test-turn bridge", "--agent http", "VAPI_API_KEY", "spoken"],
  },
  {
    path: "docs/integrations/retell.md",
    title: "Retell",
    phrases: ["custom LLM", "test-turn bridge", "--agent http", "RETELL_API_KEY"],
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

    expect(packageJson.scripts["suite:from-transcript"]).toContain("from-transcript");
    expect(existsSync("examples/voice-testops/transcripts/failed-photo-booking.txt")).toBe(true);
    expect(readme).toContain("Turn A Real Failure Into A Regression Test");
    expect(readme).toContain("npx voice-agent-testops from-transcript");
    expect(chineseReadme).toContain("把真实失败对话变成回归测试");
    expect(chineseReadme).toContain("npx voice-agent-testops from-transcript");
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
    expect(chineseReadme).toContain("--endpoint-env VOICE_AGENT_ENDPOINT");
    expect(chineseReadme).toContain("GitHub Secret");
    expect(chineseReadme).toContain("VOICE_AGENT_ENDPOINT");
    expect(chineseReadme).toContain("doctor --agent http");
    expect(chineseReadme).toContain("actions/upload-artifact");
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
