import { describe, expect, it } from "vitest";
import { renderHtmlReport } from "@/testops/report";
import type { VoiceTestRunResult } from "@/testops/runner";

describe("renderHtmlReport", () => {
  it("renders escaped scenario details and summary counts", () => {
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
    expect(html).toContain("1 failed");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
