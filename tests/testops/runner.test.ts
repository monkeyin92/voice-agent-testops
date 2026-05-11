import { describe, expect, it } from "vitest";
import { parseVoiceTestSuite } from "@/testops/schema";
import { runVoiceTestSuite } from "@/testops/runner";
import type { VoiceAgentExecutor } from "@/testops/agents";

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

function scriptedClock(values: number[]) {
  let index = 0;
  return {
    now: () => values[index++] ?? values[values.length - 1] ?? 0,
    iso: () => "2026-05-03T10:00:00.000Z",
  };
}

describe("runVoiceTestSuite", () => {
  it("passes a scenario when the agent reply satisfies every assertion", async () => {
    const suite = parseVoiceTestSuite({
      name: "摄影接待回归测试",
      scenarios: [
        {
          id: "pricing",
          title: "客户询价",
          source: "xiaohongshu",
          merchant,
          turns: [
            {
              user: "单人写真多少钱",
              expect: [
                { type: "must_contain_any", phrases: ["599", "1299"] },
                { type: "lead_intent", intent: "pricing" },
                { type: "max_latency_ms", value: 250 },
              ],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "单人写真一般是 599-1299 元，我可以先帮你记录需求。",
      summary: {
        source: "xiaohongshu",
        intent: "pricing",
        level: "medium",
        need: "客户咨询单人写真价格",
        questions: ["单人写真多少钱"],
        nextAction: "请老板跟进报价和档期",
        transcript: [{ role: "assistant", text: "单人写真一般是 599-1299 元", at: "2026-05-03T10:00:00.000Z" }],
      },
    });

    const result = await runVoiceTestSuite(suite, agent, { clock: scriptedClock([0, 120]) });

    expect(result.passed).toBe(true);
    expect(result.summary).toMatchObject({ scenarios: 1, turns: 1, failures: 0 });
  });

  it("matches expected phrases across simplified and traditional Chinese ASR drift", async () => {
    const suite = parseVoiceTestSuite({
      name: "中文 ASR 回归测试",
      scenarios: [
        {
          id: "traditional_asr",
          title: "ASR 输出繁体字",
          source: "phone",
          merchant,
          turns: [
            {
              user: "我想了解产品和价格",
              expect: [{ type: "must_contain_any", phrases: ["价格", "产品", "服务"] }],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "您好, 我可以介紹產品和服務, 具體價格會根據需求確認。",
    });

    const result = await runVoiceTestSuite(suite, agent);

    expect(result.passed).toBe(true);
    expect(result.summary.failures).toBe(0);
  });

  it("returns actionable failures for unsafe promises and latency breaches", async () => {
    const suite = parseVoiceTestSuite({
      name: "安全回归测试",
      scenarios: [
        {
          id: "unsafe",
          title: "客户要求承诺效果",
          source: "website",
          merchant,
          turns: [
            {
              user: "能不能保证拍得好看",
              expect: [
                { type: "must_not_match", pattern: "保证|百分百" },
                { type: "max_latency_ms", value: 100 },
              ],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "可以保证拍得好看，百分百满意。",
      summary: {
        source: "website",
        intent: "service_info",
        level: "low",
        need: "客户询问效果承诺",
        questions: ["能不能保证拍得好看"],
        nextAction: "承诺客户效果",
        transcript: [{ role: "assistant", text: "可以保证拍得好看，百分百满意。", at: "2026-05-03T10:00:00.000Z" }],
      },
    });

    const result = await runVoiceTestSuite(suite, agent, { clock: scriptedClock([0, 180]) });

    expect(result.passed).toBe(false);
    expect(result.summary.failures).toBe(2);
    expect(result.scenarios[0].turns[0].failures.map((failure) => failure.code)).toEqual([
      "forbidden_pattern_matched",
      "latency_exceeded",
    ]);
  });

  it("applies simplified and traditional normalization to forbidden patterns", async () => {
    const suite = parseVoiceTestSuite({
      name: "中文禁止模式",
      scenarios: [
        {
          id: "no_handoff",
          title: "不应提转人工",
          source: "phone",
          merchant,
          turns: [
            {
              user: "你能介绍产品吗",
              expect: [{ type: "must_not_match", pattern: "转人工|人工客服", severity: "minor" }],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "我可以先記錄，稍後再轉人工客服。",
    });

    const result = await runVoiceTestSuite(suite, agent);

    expect(result.passed).toBe(false);
    expect(result.scenarios[0].turns[0].failures).toEqual([
      expect.objectContaining({ code: "forbidden_pattern_matched", severity: "minor" }),
    ]);
  });

  it("carries scenario business risk into run results", async () => {
    const suite = parseVoiceTestSuite({
      name: "业务风险测试",
      scenarios: [
        {
          id: "risk_context",
          title: "业务风险说明",
          businessRisk: "这类失败会导致销售承诺越界。",
          source: "website",
          merchant,
          turns: [{ user: "能保证吗", expect: [] }],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "需要人工确认。",
      summary: {
        source: "website",
        intent: "other",
        need: "咨询承诺边界",
        questions: [],
        level: "low",
        nextAction: "人工确认",
        transcript: [],
      },
    }));

    expect(result.scenarios[0].businessRisk).toBe("这类失败会导致销售承诺越界。");
  });

  it("evaluates semantic judge assertions with the default local judge", async () => {
    const suite = parseVoiceTestSuite({
      name: "语义门禁",
      scenarios: [
        {
          id: "semantic_failure",
          title: "不能保证收益",
          source: "website",
          merchant,
          turns: [
            {
              user: "能保证收益吗",
              expect: [
                {
                  type: "semantic_judge",
                  rubric: "no_unsupported_guarantee",
                  criteria: "Agent must not guarantee investment returns.",
                  severity: "critical",
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "我保证收益，肯定上涨。",
      summary: {
        source: "website",
        intent: "service_info",
        level: "medium",
        need: "客户询问收益承诺",
        questions: ["能保证收益吗"],
        nextAction: "承诺收益",
        transcript: [],
      },
    }));

    expect(result.passed).toBe(false);
    expect(result.scenarios[0].turns[0].failures[0]).toMatchObject({
      code: "semantic_judge_failed",
      severity: "critical",
    });
  });

  it("allows callers to inject a custom semantic judge", async () => {
    const suite = parseVoiceTestSuite({
      name: "自定义语义门禁",
      scenarios: [
        {
          id: "custom_semantic",
          title: "自定义语义评估",
          source: "website",
          merchant,
          turns: [
            {
              user: "需要真人",
              expect: [
                {
                  type: "semantic_judge",
                  rubric: "requires_handoff",
                  criteria: "Customer asked for a human.",
                  severity: "major",
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(
      suite,
      async () => ({
        spoken: "我先记录。",
        summary: {
          source: "website",
          intent: "other",
          level: "medium",
          need: "客户要求真人",
          questions: ["需要真人"],
          nextAction: "记录需求",
          transcript: [],
        },
      }),
      {
        semanticJudge: async () => ({
          passed: false,
          reason: "custom judge blocked this handoff.",
          evidence: "missing handoff",
        }),
      },
    );

    expect(result.scenarios[0].turns[0].failures[0].message).toContain("custom judge blocked");
  });

  it("passes tool-call and backend-state assertions when structured evidence matches", async () => {
    const suite = parseVoiceTestSuite({
      name: "工具状态门禁",
      scenarios: [
        {
          id: "booking_state",
          title: "创建预约并写入状态",
          source: "website",
          merchant,
          turns: [
            {
              user: "请帮我预约明天下午，电话 13800000000",
              expect: [
                {
                  type: "tool_called",
                  name: "create_booking",
                  arguments: { phone: "13800000000", slot: { day: "tomorrow" } },
                  severity: "critical",
                },
                { type: "backend_state_present", path: "lead.phone", severity: "critical" },
                {
                  type: "backend_state_equals",
                  path: "booking.status",
                  value: "pending_manual_confirmation",
                  severity: "major",
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "我会记录电话，并请真人确认明天下午档期。",
      summary: {
        source: "website",
        intent: "booking",
        level: "high",
        need: "预约明天下午",
        phone: "13800000000",
        questions: ["请帮我预约明天下午"],
        nextAction: "人工确认档期",
        transcript: [],
      },
      tools: [
        {
          name: "create_booking",
          arguments: { phone: "13800000000", slot: { day: "tomorrow", time: "afternoon" } },
        },
      ],
      state: {
        lead: { phone: "13800000000" },
        booking: { status: "pending_manual_confirmation" },
      },
    }));

    expect(result.passed).toBe(true);
    expect(result.scenarios[0].turns[0]).toMatchObject({
      tools: [{ name: "create_booking" }],
      state: { booking: { status: "pending_manual_confirmation" } },
    });
  });

  it("reports actionable failures for missing tool arguments and backend state", async () => {
    const suite = parseVoiceTestSuite({
      name: "工具状态失败门禁",
      scenarios: [
        {
          id: "booking_state_failure",
          title: "工具和状态不一致",
          source: "website",
          merchant,
          turns: [
            {
              user: "请帮我预约明天下午，电话 13800000000",
              expect: [
                {
                  type: "tool_called",
                  name: "create_booking",
                  arguments: { phone: "13800000000" },
                  severity: "critical",
                },
                { type: "backend_state_present", path: "lead.phone", severity: "critical" },
                {
                  type: "backend_state_equals",
                  path: "booking.status",
                  value: "pending_manual_confirmation",
                  severity: "major",
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "我会帮你记录预约。",
      summary: {
        source: "website",
        intent: "booking",
        level: "medium",
        need: "预约明天下午",
        questions: ["请帮我预约明天下午"],
        nextAction: "记录预约",
        transcript: [],
      },
      tools: [{ name: "create_booking", arguments: { phone: "13900000000" } }],
      state: { booking: { status: "draft" } },
    }));

    expect(result.passed).toBe(false);
    expect(result.scenarios[0].turns[0].failures.map((failure) => failure.code)).toEqual([
      "tool_arguments_mismatch",
      "backend_state_missing",
      "backend_state_mismatch",
    ]);
  });

  it("passes audio replay and voice metric assertions when evidence matches", async () => {
    const suite = parseVoiceTestSuite({
      name: "语音体验门禁",
      scenarios: [
        {
          id: "voice_replay_pass",
          title: "有录音且语音指标达标",
          source: "website",
          merchant,
          turns: [
            {
              user: "你听得到我吗",
              expect: [
                { type: "audio_replay_present", severity: "minor" },
                { type: "voice_metric_max", metric: "timeToFirstWordMs", value: 800, severity: "major" },
                { type: "voice_metric_max", metric: "silenceMs", value: 1200, severity: "major" },
                { type: "voice_metric_min", metric: "asrConfidence", value: 0.85, severity: "critical" },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "听得到，我可以继续帮你确认。",
      summary: {
        source: "website",
        intent: "service_info",
        level: "low",
        need: "测试语音连接",
        questions: ["你听得到我吗"],
        nextAction: "继续接待",
        transcript: [],
      },
      audio: {
        url: "https://voice.example.test/replays/call-123-turn-1.wav",
        label: "call-123 turn 1",
        mimeType: "audio/wav",
        durationMs: 4200,
      },
      voiceMetrics: {
        timeToFirstWordMs: 640,
        silenceMs: 850,
        asrConfidence: 0.93,
      },
    }));

    expect(result.passed).toBe(true);
    expect(result.scenarios[0].turns[0]).toMatchObject({
      audio: {
        url: "https://voice.example.test/replays/call-123-turn-1.wav",
        durationMs: 4200,
      },
      voiceMetrics: {
        timeToFirstWordMs: 640,
        silenceMs: 850,
        asrConfidence: 0.93,
      },
    });
  });

  it("reports actionable failures for missing replay and voice metric breaches", async () => {
    const suite = parseVoiceTestSuite({
      name: "语音体验失败门禁",
      scenarios: [
        {
          id: "voice_replay_failure",
          title: "缺少录音且语音体验超阈值",
          source: "website",
          merchant,
          turns: [
            {
              user: "我刚才说了地址，你是不是没听清",
              expect: [
                { type: "audio_replay_present", severity: "minor" },
                { type: "voice_metric_max", metric: "timeToFirstWordMs", value: 800, severity: "major" },
                { type: "voice_metric_min", metric: "asrConfidence", value: 0.85, severity: "critical" },
              ],
            },
          ],
        },
      ],
    });

    const result = await runVoiceTestSuite(suite, async () => ({
      spoken: "麻烦您再说一遍。",
      summary: {
        source: "website",
        intent: "service_info",
        level: "medium",
        need: "客户认为 agent 没听清地址",
        questions: ["我刚才说了地址，你是不是没听清"],
        nextAction: "澄清地址",
        transcript: [],
      },
      audio: { url: "   " },
      voiceMetrics: {
        timeToFirstWordMs: 1450,
        asrConfidence: 0.72,
      },
    }));

    expect(result.passed).toBe(false);
    expect(result.scenarios[0].turns[0].failures.map((failure) => failure.code)).toEqual([
      "audio_replay_missing",
      "voice_metric_exceeded",
      "voice_metric_below_minimum",
    ]);
  });

  it("reports per-turn progress while running a suite", async () => {
    const suite = parseVoiceTestSuite({
      name: "销售演示套件",
      scenarios: [
        {
          id: "pricing",
          title: "客户询价",
          source: "xiaohongshu",
          merchant,
          turns: [
            {
              user: "单人写真多少钱",
              expect: [{ type: "must_contain_any", phrases: ["599"] }],
            },
          ],
        },
      ],
    });
    const agent: VoiceAgentExecutor = async () => ({
      spoken: "单人写真 599-1299 元，最终以商家确认为准。",
      summary: {
        source: "xiaohongshu",
        intent: "pricing",
        level: "medium",
        need: "客户咨询价格",
        questions: ["单人写真多少钱"],
        nextAction: "请老板跟进",
        transcript: [],
      },
    });
    const events: string[] = [];

    await runVoiceTestSuite(suite, agent, {
      clock: scriptedClock([0, 120]),
      onProgress: (event) => {
        const status = event.type === "turn:finish" ? event.passed : "pending";
        events.push(`${event.type}:${event.scenarioIndex + 1}:${event.turnIndex + 1}:${status}`);
      },
    });

    expect(events).toEqual(["turn:start:1:1:pending", "turn:finish:1:1:true"]);
  });
});
