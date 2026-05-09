import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type ExampleModule = {
  createTestAgentResponse: (input: {
    customerText: string;
    source: "website";
    merchant: {
      industry?: string;
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
    const chineseReadme = readFileSync("README.zh-CN.md", "utf8");

    expect(readme).toContain("docs/assets/report-preview.png");
    expect(readme).toContain("README.zh-CN.md");
    expect(readme).not.toContain("## 中文");
    expect(chineseReadme).toContain("docs/assets/report-preview-zh-CN.png");
    expect(chineseReadme).toContain("README.md");
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

  it("handles outbound leadgen opt-out and confirmation boundaries", async () => {
    const example = (await import(pathToFileURL("examples/http-agent-server/server.mjs").href)) as ExampleModule;
    const merchant = {
      industry: "outbound_leadgen",
      packages: [{ name: "课程咨询线索", priceRange: "0 元试听课", includes: "课程介绍" }],
    };

    const refusalResponse = example.createTestAgentResponse({
      customerText: "我现在没时间，不要再打了。",
      source: "website",
      merchant,
      messages: [],
    });

    const giftResponse = example.createTestAgentResponse({
      customerText: "你说的免费赠品是不是一定包到家？",
      source: "website",
      merchant,
      messages: [],
    });
    const privateChannelResponse = example.createTestAgentResponse({
      customerText: "我没有微信，也不想加任何私聊。",
      source: "website",
      merchant,
      messages: [],
    });
    const childDataResponse = example.createTestAgentResponse({
      customerText: "孩子几年级和年龄必须告诉你吗？",
      source: "website",
      merchant,
      messages: [],
    });

    expect(refusalResponse.spoken).toContain("停止推销");
    expect(refusalResponse.spoken).toContain("人工客服确认");
    expect(giftResponse.spoken).toContain("不能承诺");
    expect(giftResponse.spoken).toContain("人工客服确认");
    expect(giftResponse.spoken).not.toMatch(/一定送达|保证领取|包到家/);
    expect(giftResponse.summary.intent).toBe("handoff");
    expect(privateChannelResponse.spoken).toContain("不会要求私聊");
    expect(privateChannelResponse.spoken).not.toMatch(/必须.*微信|没有微信.*(领不了|不能领取)|我加您微信/);
    expect(childDataResponse.spoken).toContain("不是必须提供");
    expect(childDataResponse.spoken).toContain("人工客服确认");
    expect(childDataResponse.summary.intent).toBe("handoff");
  });
});
