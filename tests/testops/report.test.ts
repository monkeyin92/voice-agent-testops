import { describe, expect, it } from "vitest";
import { renderHtmlReport } from "@/testops/report";
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
});
