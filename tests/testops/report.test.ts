import { describe, expect, it } from "vitest";
import { renderHtmlReport, renderJunitReport, renderMarkdownSummary } from "@/testops/report";
import type { VoiceTestRunResult } from "@/testops/runner";

describe("renderHtmlReport", () => {
  it("renders a merchant-facing health report with escaped details and repair advice", () => {
    const result: VoiceTestRunResult = {
      id: "run_1",
      suiteName: "回归 <script>alert(1)</script>",
      passed: false,
      startedAt: "2026-05-03T10:00:00.000Z",
      finishedAt: "2026-05-03T10:01:00.000Z",
      summary: { scenarios: 1, turns: 1, assertions: 1, failures: 1 },
      scenarios: [
        {
          id: "unsafe",
          title: "安全场景 <b>",
          passed: false,
          turns: [
            {
              index: 0,
              user: "能保证吗",
              assistant: "保证",
              latencyMs: 120,
              passed: false,
              assertions: 1,
              failures: [
                {
                  code: "forbidden_pattern_matched",
                  message: "回复命中了禁止模式：保证",
                  severity: "major",
                },
              ],
            },
          ],
        },
      ],
    };

    const html = renderHtmlReport(result);

    expect(html).toContain("回归 &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("智能语音体检单");
    expect(html).toContain("上线建议：暂缓上线，先修复高风险对话");
    expect(html).toContain("风险项");
    expect(html).toContain("回复命中了禁止模式：保证");
    expect(html).toContain("建议修复话术");
    expect(html).toContain("客户");
    expect(html).toContain("智能语音");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("renders passed reports as pilot-ready with visible pass evidence", () => {
    const result: VoiceTestRunResult = {
      id: "run_2",
      suiteName: "写真馆智能语音多轮体检套件",
      passed: true,
      startedAt: "2026-05-03T10:00:00.000Z",
      finishedAt: "2026-05-03T10:01:00.000Z",
      summary: { scenarios: 1, turns: 1, assertions: 4, failures: 0 },
      scenarios: [
        {
          id: "pricing_then_availability",
          title: "先询价再问档期",
          passed: true,
          turns: [
            {
              index: 0,
              user: "单人写真多少钱",
              assistant: "单人写真价格是 599-1299 元，包含服装 2 套、精修 9 张。",
              latencyMs: 12953,
              passed: true,
              assertions: 4,
              failures: [],
            },
          ],
        },
      ],
    };

    const html = renderHtmlReport(result);

    expect(html).toContain("上线建议：可以进入小范围试点");
    expect(html).toContain("通过项");
    expect(html).toContain("1 个场景");
    expect(html).toContain("4 条断言");
    expect(html).toContain("对话抽样");
    expect(html).toContain("599-1299 元");
  });

  it("renders English report chrome for international README screenshots", () => {
    const result: VoiceTestRunResult = {
      id: "run_en",
      suiteName: "Photo Studio Voice Agent Launch Check",
      passed: true,
      startedAt: "2026-05-03T10:00:00.000Z",
      finishedAt: "2026-05-03T10:01:00.000Z",
      summary: { scenarios: 1, turns: 1, assertions: 4, failures: 0 },
      scenarios: [
        {
          id: "pricing",
          title: "Customer asks about price",
          passed: true,
          turns: [
            {
              index: 0,
              user: "How much is the portrait package?",
              assistant: "The single portrait package is usually $99-$199 and includes two outfits.",
              latencyMs: 840,
              passed: true,
              assertions: 4,
              failures: [],
            },
          ],
        },
      ],
    };

    const html = renderHtmlReport(result, { locale: "en" });

    expect(html).toContain("Voice Agent Health Report");
    expect(html).toContain("Launch advice: ready for a small pilot");
    expect(html).toContain("Passed checks");
    expect(html).toContain("Conversation sample");
    expect(html).toContain("Customer");
    expect(html).toContain("Voice agent");
    expect(html).not.toContain("智能语音体检单");
  });

  it("renders business risk context in markdown and HTML reports", () => {
    const result = failedResult();
    result.scenarios[0].businessRisk = "避免在客户面前输出未经确认的绝对承诺。";

    const markdown = renderMarkdownSummary(result);
    const html = renderHtmlReport(result);

    expect(markdown).toContain("避免在客户面前输出未经确认的绝对承诺。");
    expect(html).toContain("业务风险");
    expect(html).toContain("避免在客户面前输出未经确认的绝对承诺。");
  });

  it("renders repair advice for semantic judge failures", () => {
    const result = failedResult();
    result.scenarios[0].turns[0].failures[0] = {
      code: "semantic_judge_failed",
      message: "语义断言未通过（no_unsupported_guarantee）：回复包含未被业务事实支持的绝对承诺。",
      severity: "critical",
    };

    const html = renderHtmlReport(result);

    expect(html).toContain("语义断言未通过");
    expect(html).toContain("按评测理由复盘回复，收紧提示词、业务事实或转人工条件。");
  });

  it("renders audio replay controls and voice metrics when turn evidence is present", () => {
    const result: VoiceTestRunResult = {
      id: "run_voice",
      suiteName: "Voice-native launch check",
      passed: true,
      startedAt: "2026-05-03T10:00:00.000Z",
      finishedAt: "2026-05-03T10:01:00.000Z",
      summary: { scenarios: 1, turns: 1, assertions: 3, failures: 0 },
      scenarios: [
        {
          id: "voice_metrics",
          title: "Voice evidence",
          passed: true,
          turns: [
            {
              index: 0,
              user: "Can you hear me?",
              assistant: "Yes, I can hear you.",
              latencyMs: 720,
              passed: true,
              assertions: 3,
              failures: [],
              audio: {
                url: "https://voice.example.test/replays/call-1-turn-1.wav?token=<secret>",
                label: "call 1 turn 1",
                durationMs: 4100,
              },
              voiceMetrics: {
                timeToFirstWordMs: 620,
                asrConfidence: 0.94,
                interruptionCount: 0,
              },
            },
          ],
        },
      ],
    };

    const html = renderHtmlReport(result, { locale: "en" });
    const markdown = renderMarkdownSummary({
      ...result,
      passed: false,
      summary: { ...result.summary, failures: 1 },
      scenarios: [
        {
          ...result.scenarios[0],
          passed: false,
          turns: [
            {
              ...result.scenarios[0].turns[0],
              passed: false,
              failures: [{ code: "voice_metric_exceeded", message: "time to first word too slow", severity: "major" }],
            },
          ],
        },
      ],
    });

    expect(html).toContain("Audio replay");
    expect(html).toContain("<audio controls");
    expect(html).toContain("https://voice.example.test/replays/call-1-turn-1.wav?token=&lt;secret&gt;");
    expect(html).toContain("Time to first word");
    expect(html).toContain("620ms");
    expect(html).toContain("ASR confidence");
    expect(html).toContain("94%");
    expect(markdown).toContain("Audio replay: https://voice.example.test/replays/call-1-turn-1.wav?token=<secret>");
    expect(markdown).toContain("Voice metrics: timeToFirstWordMs=620ms, asrConfidence=94%, interruptionCount=0");
  });
});

describe("CI report renderers", () => {
  it("renders a compact Markdown summary for GitHub Actions", () => {
    const result = failedResult();

    const markdown = renderMarkdownSummary(result);

    expect(markdown).toContain("# Voice Agent TestOps");
    expect(markdown).toContain("**Suite:** Launch <Check>");
    expect(markdown).toContain("**Status:** failed");
    expect(markdown).toContain("Scenarios: 1");
    expect(markdown).toContain("Assertions: 1");
    expect(markdown).toContain("Failures: 1");
    expect(markdown).toContain("## Failed Checks");
    expect(markdown).toContain("Unsafe price <copy> / turn 1");
    expect(markdown).toContain("`forbidden_pattern_matched` (critical)");
    expect(markdown).toContain("quoted a forbidden <guarantee>");
  });

  it("renders escaped JUnit XML for test dashboards", () => {
    const result = failedResult();

    const xml = renderJunitReport(result);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<testsuites name="Voice Agent TestOps" tests="1" failures="1">');
    expect(xml).toContain('<testsuite name="Launch &lt;Check&gt;" tests="1" failures="1"');
    expect(xml).toContain('classname="unsafe_price"');
    expect(xml).toContain('name="Unsafe price &lt;copy&gt; / turn 1"');
    expect(xml).toContain('type="forbidden_pattern_matched"');
    expect(xml).toContain('message="quoted a forbidden &lt;guarantee&gt;"');
    expect(xml).not.toContain("Launch <Check>");
  });
});

function failedResult(): VoiceTestRunResult {
  return {
    id: "run_ci",
    suiteName: "Launch <Check>",
    passed: false,
    startedAt: "2026-05-03T10:00:00.000Z",
    finishedAt: "2026-05-03T10:01:00.000Z",
    summary: { scenarios: 1, turns: 1, assertions: 1, failures: 1 },
    scenarios: [
      {
        id: "unsafe_price",
        title: "Unsafe price <copy>",
        passed: false,
        turns: [
          {
            index: 0,
            user: "Can you guarantee the cheapest price?",
            assistant: "Guaranteed.",
            latencyMs: 1234,
            passed: false,
            assertions: 1,
            failures: [
              {
                code: "forbidden_pattern_matched",
                message: "quoted a forbidden <guarantee>",
                severity: "critical",
              },
            ],
          },
        ],
      },
    ],
  };
}
