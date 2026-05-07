import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type BridgeModule = {
  createBridgeTurnResponse: (input: {
    customerText: string;
    source: "website";
    merchant: { industry: string; packages: Array<{ name: string; priceRange: string; includes: string }> };
    messages: Array<{ role: "customer" | "assistant"; text: string; at: string }>;
  }) => {
    spoken: string;
    summary: {
      intent: string;
      phone?: string;
      budget?: string;
      preferredTime?: string;
      location?: string;
    };
  };
  createVapiWebhookAck: (body: unknown) => {
    platform: "vapi";
    received: boolean;
    eventType: string;
    callId?: string;
  };
  createRetellWebhookAck: (body: unknown) => {
    platform: "retell";
    received: boolean;
    eventType: string;
    callId?: string;
  };
};

describe("Vapi/Retell quickstart bridge example", () => {
  it("is exposed as a package script for copy-paste quickstarts", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

    expect(packageJson.scripts["example:voice-platform-bridge"]).toBe(
      "node examples/voice-platform-bridge/server.mjs",
    );
  });

  it("returns a Voice TestOps-compatible turn response with lead fields", async () => {
    const bridge = (await import(
      pathToFileURL("examples/voice-platform-bridge/server.mjs").href
    )) as BridgeModule;

    const response = bridge.createBridgeTurnResponse({
      customerText: "我预算 500 万，想明天下午看浦东两房，电话 13800001111，能保证升值吗？",
      source: "website",
      merchant: {
        industry: "real_estate",
        packages: [{ name: "二手房咨询", priceRange: "3000000-6000000 元", includes: "房源匹配" }],
      },
      messages: [{ role: "customer", text: "我想买浦东两房", at: "2026-05-07T00:00:00.000Z" }],
    });

    expect(response.spoken).toContain("不能承诺");
    expect(response.spoken).toContain("经纪人");
    expect(response.summary.intent).toBe("availability");
    expect(response.summary.phone).toBe("13800001111");
    expect(response.summary.budget).toContain("500");
    expect(response.summary.preferredTime).toContain("明天下午");
    expect(response.summary.location).toContain("浦东");
  });

  it("acknowledges Vapi and Retell webhook smoke-test payloads", async () => {
    const bridge = (await import(
      pathToFileURL("examples/voice-platform-bridge/server.mjs").href
    )) as BridgeModule;

    expect(
      bridge.createVapiWebhookAck({
        message: { type: "end-of-call-report", call: { id: "vapi_call_123" } },
      }),
    ).toMatchObject({
      platform: "vapi",
      received: true,
      eventType: "end-of-call-report",
      callId: "vapi_call_123",
    });
    expect(bridge.createRetellWebhookAck({ event: "call_analyzed", call: { call_id: "retell_call_123" } })).toMatchObject({
      platform: "retell",
      received: true,
      eventType: "call_analyzed",
      callId: "retell_call_123",
    });
  });
});
