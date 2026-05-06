import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type ExampleModule = {
  createTestAgentResponse: (input: {
    customerText: string;
    source: "website";
    merchant: {
      packages: Array<{
        name: string;
        priceRange: string;
        includes: string;
      }>;
    };
    messages: Array<{ role: "customer" | "assistant"; text: string; at: string }>;
  }) => {
    spoken: string;
    summary: {
      source: string;
      intent: string;
      phone?: string;
      transcript: Array<{ role: "customer" | "assistant"; text: string; at: string }>;
    };
  };
};

describe("HTTP agent example", () => {
  it("documents the report preview and HTTP example in the public README", () => {
    const readme = readFileSync("README.md", "utf8");

    expect(readme).toContain("docs/assets/report-preview.png");
    expect(readme).toContain("examples/http-agent-server/server.mjs");
    expect(readme).toContain("npm run example:http-agent");
    expect(readme).toContain("--agent http");
  });

  it("returns a Voice TestOps-compatible spoken response and summary", async () => {
    const example = (await import(pathToFileURL("examples/http-agent-server/server.mjs").href)) as ExampleModule;

    const response = example.createTestAgentResponse({
      customerText: "单人写真多少钱，我电话 13800001111",
      source: "website",
      merchant: {
        packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套，精修 9 张" }],
      },
      messages: [{ role: "customer", text: "单人写真多少钱，我电话 13800001111", at: "2026-05-06T00:00:00.000Z" }],
    });

    expect(response.spoken).toContain("599-1299 元");
    expect(response.summary.intent).toBe("pricing");
    expect(response.summary.phone).toBe("13800001111");
    expect(response.summary.transcript.at(-1)?.role).toBe("assistant");
  });
});
