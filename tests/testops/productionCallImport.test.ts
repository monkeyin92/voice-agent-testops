import { describe, expect, it } from "vitest";
import {
  buildProductionCallSample,
  parseProductionCallImport,
  renderProductionCallSamplingMarkdown,
  renderProductionCallTranscript,
} from "@/testops/productionCallImport";

describe("production call import and sampling", () => {
  it("parses provider-like JSONL records and infers review risk tags", () => {
    const imported = parseProductionCallImport(sampleJsonl());

    expect(imported.records).toHaveLength(3);
    expect(imported.rejected).toEqual([{ index: 3, reason: "Call record must include transcript messages" }]);
    expect(imported.records[0]).toMatchObject({
      id: "call_risky",
      provider: "vapi",
      industry: "real_estate",
      startedAt: "2026-05-07T09:00:00.000Z",
    });
    expect(imported.records[0].riskTags).toEqual(
      expect.arrayContaining(["pilot", "handoff_request", "lead_info_shared", "unsupported_promise"]),
    );
    expect(imported.records[1].riskTags).toEqual(expect.arrayContaining(["pricing_question", "availability_question"]));
    expect(imported.records[2].riskTags).toEqual(["low_signal"]);
  });

  it("selects a deterministic risk-prioritized sample", () => {
    const imported = parseProductionCallImport(sampleJsonl());
    const sample = buildProductionCallSample(imported.records, {
      sampleSize: 2,
      seed: "weekly-2026-05-07",
      rejected: imported.rejected,
    });
    const repeated = buildProductionCallSample(imported.records, {
      sampleSize: 2,
      seed: "weekly-2026-05-07",
      rejected: imported.rejected,
    });

    expect(sample.selectedCalls.map((call) => call.id)).toEqual(["call_risky", "call_pricing"]);
    expect(repeated.selectedCalls.map((call) => call.id)).toEqual(sample.selectedCalls.map((call) => call.id));
    expect(sample.totalCalls).toBe(3);
    expect(sample.rejectedCalls).toHaveLength(1);
    expect(sample.riskTagCounts).toEqual(
      expect.arrayContaining([
        { tag: "unsupported_promise", count: 1 },
        { tag: "low_signal", count: 1 },
      ]),
    );
  });

  it("renders review Markdown and labeled transcripts", () => {
    const imported = parseProductionCallImport(sampleJsonl());
    const sample = buildProductionCallSample(imported.records, { sampleSize: 1, seed: "weekly-2026-05-07" });
    const markdown = renderProductionCallSamplingMarkdown(sample);
    const transcript = renderProductionCallTranscript(sample.selectedCalls[0]);

    expect(markdown).toContain("# Voice Agent TestOps Production Call Sampling Monitor");
    expect(markdown).toContain("Selected calls: 1");
    expect(markdown).toContain("call_risky");
    expect(markdown).toContain("unsupported_promise");
    expect(transcript).toContain("Customer: 我想找真人，经纪人给我回电吧，我电话 13800000000");
    expect(transcript).toContain("Assistant: 这套房肯定涨，贷款也保证能过。");
  });
});

function sampleJsonl(): string {
  return [
    JSON.stringify({
      callId: "call_risky",
      provider: "vapi",
      createdAt: "2026-05-07T09:00:00.000Z",
      industry: "real_estate",
      tags: ["pilot"],
      messages: [
        { role: "user", message: "我想找真人，经纪人给我回电吧，我电话 13800000000" },
        { role: "assistant", content: "这套房肯定涨，贷款也保证能过。" },
      ],
    }),
    JSON.stringify({
      id: "call_pricing",
      startedAt: "2026-05-07T10:00:00.000Z",
      transcript: [
        { speaker: "caller", text: "How much is the package, and do you have a slot tomorrow?" },
        { speaker: "agent", text: "The package starts at 599, and a human will confirm availability." },
      ],
    }),
    JSON.stringify({
      id: "call_low_signal",
      transcript: "Customer: Hello\nAssistant: Hi, how can I help?",
    }),
    JSON.stringify({
      id: "call_bad",
      transcript: [],
    }),
  ].join("\n");
}
