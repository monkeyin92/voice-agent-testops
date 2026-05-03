import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OpenClaw Docker isolation docs", () => {
  it("documents non-conflicting Docker ports and the official Responses endpoint", () => {
    const docs = readFileSync("docs/ops/openclaw-docker.md", "utf8");

    expect(docs).toContain("18889");
    expect(docs).toContain("18890");
    expect(docs).toContain("/v1/responses");
    expect(docs).toContain("--openclaw-mode responses");
    expect(docs).toContain("Hermes");
  });

  it("provides a Docker helper script that clones outside tracked source and checks ports", () => {
    const script = readFileSync("scripts/openclaw-docker.sh", "utf8");

    expect(script).toContain("https://github.com/openclaw/openclaw.git");
    expect(script).toContain(".vendor/openclaw");
    expect(script).toContain("OPENCLAW_DOCKER_GATEWAY_PORT");
    expect(script).toContain("lsof");
    expect(script).toContain("docker compose");
    expect(script).toContain("gateway.http.endpoints.responses.enabled = true");
    expect(script).toContain("compose ps --status running --services");
    expect(script).toContain("--force-recreate");
    expect(script).toContain("--fail-with-body");
    expect(script).toContain("OPENAI_API_KEY");
    expect(script).toContain('"model":"openclaw"');
  });
});
