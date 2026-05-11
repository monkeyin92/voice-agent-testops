import { describe, expect, it, vi } from "vitest";
import { createSipAgent, runSipDriverCommand, type SipDriverInput } from "@/testops/adapters/sipAgent";
import type { VoiceTestScenario } from "@/testops/schema";

const scenario: VoiceTestScenario = {
  id: "handoff",
  title: "客户要求转人工",
  source: "phone",
  merchant: {
    name: "示例门店",
    slug: "demo-store",
    industry: "restaurant",
    address: "上海市示例路 1 号",
    serviceArea: "上海",
    businessHours: "10:00-22:00",
    contactPhone: "13800000000",
    packages: [{ name: "预约", priceRange: "人工确认", includes: "电话确认", bestFor: "来电预约" }],
    faqs: [],
    bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
  },
  turns: [{ user: "帮我转人工", expect: [] }],
};

const agentInput = {
  suiteName: "SIP 回归测试",
  scenario,
  merchant: { ...scenario.merchant, id: "merchant_1", createdAt: new Date(), updatedAt: new Date() },
  messages: [{ role: "customer" as const, text: "帮我转人工", at: "2026-05-11T10:00:00.000Z" }],
  turnIndex: 0,
  customerText: "帮我转人工",
};

describe("createSipAgent", () => {
  it("sends a SIP driver payload and returns voice-native evidence", async () => {
    const runner = vi.fn().mockResolvedValue({
      spoken: "可以，我会请人工客服跟进。",
      summary: {
        source: "phone",
        intent: "handoff",
        level: "high",
        need: "客户要求转人工",
        questions: ["帮我转人工"],
        nextAction: "人工客服跟进",
        transcript: [],
      },
      audio: {
        url: "file:///tmp/voice-agent-testops/handoff-turn-1.wav",
        durationMs: 3600,
      },
      voiceMetrics: {
        timeToFirstWordMs: 680,
        turnLatencyMs: 3600,
        asrConfidence: 0.94,
      },
    });
    const agent = createSipAgent({
      driverCommand: "node ./sip-driver.mjs",
      sipUri: "sip:+8613800000000@10.0.0.8",
      sipProxy: "sip:10.0.0.8:5060",
      sipFrom: "sip:testops@10.0.0.9",
      callTimeoutMs: 90_000,
      mediaDir: ".voice-testops/sip-media",
      runner,
    });

    const output = await agent(agentInput);

    expect(output.spoken).toContain("人工客服");
    expect(output.summary?.intent).toBe("handoff");
    expect(output.audio?.url).toBe("file:///tmp/voice-agent-testops/handoff-turn-1.wav");
    expect(output.voiceMetrics?.timeToFirstWordMs).toBe(680);
    expect(runner).toHaveBeenCalledWith(
      "node ./sip-driver.mjs",
      expect.objectContaining({
        provider: "voice-agent-testops",
        transport: "sip",
        sip: {
          uri: "sip:+8613800000000@10.0.0.8",
          proxy: "sip:10.0.0.8:5060",
          from: "sip:testops@10.0.0.9",
          mediaDir: ".voice-testops/sip-media",
          callTimeoutMs: 90_000,
        },
        suiteName: "SIP 回归测试",
        scenarioId: "handoff",
        scenarioTitle: "客户要求转人工",
        turnIndex: 0,
        customerText: "帮我转人工",
        outputContract: expect.objectContaining({
          spoken: "ASR transcript of the voice agent reply",
          audio: "optional replay metadata: { url, label, mimeType, durationMs }",
        }),
      }),
      expect.objectContaining({
        timeoutMs: 90_000,
        env: expect.objectContaining({
          VOICE_TESTOPS_SIP_URI: "sip:+8613800000000@10.0.0.8",
          VOICE_TESTOPS_SIP_PROXY: "sip:10.0.0.8:5060",
          VOICE_TESTOPS_SIP_FROM: "sip:testops@10.0.0.9",
          VOICE_TESTOPS_SIP_MEDIA_DIR: ".voice-testops/sip-media",
          VOICE_TESTOPS_SIP_CALL_TIMEOUT_MS: "90000",
        }),
      }),
    );
  });

  it("fails fast when the driver does not return spoken text", async () => {
    const agent = createSipAgent({
      driverCommand: "node ./sip-driver.mjs",
      sipUri: "sip:+8613800000000@10.0.0.8",
      runner: vi.fn().mockResolvedValue({ summary: { intent: "handoff" } }),
    });

    await expect(agent(agentInput)).rejects.toThrow("SIP driver response must include non-empty spoken");
  });

  it("can run the bundled mock driver through stdin/stdout JSON", async () => {
    const payload: SipDriverInput = {
      provider: "voice-agent-testops",
      transport: "sip",
      sip: {
        uri: "sip:+8613800000000@10.0.0.8",
        mediaDir: ".voice-testops/sip-media",
        callTimeoutMs: 10_000,
      },
      suiteName: "SIP smoke",
      scenarioId: "pricing",
      scenarioTitle: "客户询价",
      turnIndex: 0,
      customerText: "多少钱",
      source: "phone",
      merchant: agentInput.merchant,
      messages: agentInput.messages,
      outputContract: {
        spoken: "ASR transcript of the voice agent reply",
        summary: "optional LeadSummary-compatible JSON",
        tools: "optional array of tool calls",
        state: "optional backend state snapshot",
        audio: "optional replay metadata: { url, label, mimeType, durationMs }",
        voiceMetrics:
          "optional numeric metrics: { timeToFirstWordMs, turnLatencyMs, asrLatencyMs, ttsLatencyMs, silenceMs, interruptionCount, asrConfidence }",
      },
    };

    const output = await runSipDriverCommand("node examples/sip-driver/mock-driver.mjs", payload, {
      timeoutMs: 10_000,
      env: {},
    });

    expect(output).toMatchObject({
      spoken: expect.stringContaining("价格"),
      summary: { intent: "pricing" },
      audio: { url: expect.stringContaining("/.voice-testops/sip-media/pricing-turn-1.wav") },
      voiceMetrics: { asrConfidence: 0.93 },
    });
  });
});
