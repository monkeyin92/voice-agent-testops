import { describe, expect, it, vi } from "vitest";
import { createOpenClawAgent } from "@/testops/adapters/openClawAgent";
import type { VoiceTestScenario } from "@/testops/schema";

const scenario: VoiceTestScenario = {
  id: "pricing",
  title: "客户询价",
  source: "website",
  merchant: {
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
  },
  turns: [{ user: "单人写真多少钱", expect: [] }],
};

describe("createOpenClawAgent", () => {
  it("posts an OpenClaw-compatible payload with auth and returns the spoken response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        spoken: "单人写真一般是 599-1299 元。",
        summary: {
          source: "website",
          intent: "pricing",
          level: "medium",
          need: "客户询价",
          questions: ["单人写真多少钱"],
          nextAction: "继续跟进",
          transcript: [{ role: "assistant", text: "单人写真一般是 599-1299 元。", at: "2026-05-03T10:00:00.000Z" }],
        },
      }),
    });
    const agent = createOpenClawAgent({
      endpoint: "https://openclaw.example.test/agents/voice",
      apiKey: "test-key",
      fetchImpl,
    });

    const output = await agent({
      suiteName: "回归测试",
      scenario,
      merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
      messages: [{ role: "customer", text: "单人写真多少钱", at: "2026-05-03T10:00:00.000Z" }],
      turnIndex: 0,
      customerText: "单人写真多少钱",
    });

    expect(output.spoken).toContain("599-1299");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://openclaw.example.test/agents/voice",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer test-key",
          "content-type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({
      provider: "voice-agent-testops",
      suiteName: "回归测试",
      scenarioId: "pricing",
      input: {
        customerText: "单人写真多少钱",
        turnIndex: 0,
      },
    });
  });

  it("can call an official OpenResponses endpoint and map output_text to spoken", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "resp_1",
        output_text: "单人写真一般是 599-1299 元。",
      }),
    });
    const agent = createOpenClawAgent({
      endpoint: "http://localhost:18889/v1/responses",
      apiKey: "test-key",
      mode: "responses",
      fetchImpl,
    });

    const output = await agent({
      suiteName: "回归测试",
      scenario,
      merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
      messages: [{ role: "customer", text: "单人写真多少钱", at: "2026-05-03T10:00:00.000Z" }],
      turnIndex: 0,
      customerText: "单人写真多少钱",
    });

    expect(output.spoken).toBe("单人写真一般是 599-1299 元。");
    const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: "openclaw",
      input: expect.stringContaining("单人写真多少钱"),
      metadata: {
        suiteName: "回归测试",
        scenarioId: "pricing",
        turnIndex: "0",
      },
    });
  });

  it("fails fast when OpenClaw returns a response without spoken text", async () => {
    const agent = createOpenClawAgent({
      endpoint: "https://openclaw.example.test/agents/voice",
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    });

    await expect(
      agent({
        suiteName: "回归测试",
        scenario,
        merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
        messages: [{ role: "customer", text: "单人写真多少钱", at: "2026-05-03T10:00:00.000Z" }],
        turnIndex: 0,
        customerText: "单人写真多少钱",
      }),
    ).rejects.toThrow("OpenClaw response must include non-empty spoken");
  });

  it("includes OpenClaw error bodies when requests fail", async () => {
    const agent = createOpenClawAgent({
      endpoint: "http://localhost:18889/v1/responses",
      mode: "responses",
      fetchImpl: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => '{"error":{"message":"No API key found for provider \\"openai\\""}}',
      }),
    });

    await expect(
      agent({
        suiteName: "回归测试",
        scenario,
        merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
        messages: [{ role: "customer", text: "单人写真多少钱", at: "2026-05-03T10:00:00.000Z" }],
        turnIndex: 0,
        customerText: "单人写真多少钱",
      }),
    ).rejects.toThrow('OpenClaw agent failed with 500: {"error":{"message":"No API key found');
  });
});
