#!/usr/bin/env node

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

const input = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
const customerText = String(input.customerText ?? "");
const scenarioId = String(input.scenarioId ?? "scenario");
const turnIndex = Number(input.turnIndex ?? 0);
const now = new Date().toISOString();

let spoken = "我先记录您的需求，并请人工确认后续安排。";
let intent = "other";
if (/价格|多少钱|price|cost/i.test(customerText)) {
  spoken = "价格需要按具体方案确认，我不会在电话里承诺未核实的报价。";
  intent = "pricing";
}
if (/人工|真人|客服|human|agent/i.test(customerText)) {
  spoken = "可以，我会记录转人工需求，并请真人客服跟进。";
  intent = "handoff";
}

const configuredMediaDir = input.sip?.mediaDir ? String(input.sip.mediaDir).replace(/\/$/, "") : "/tmp/voice-agent-testops";
const mediaDir = configuredMediaDir.startsWith("/") ? configuredMediaDir : `${process.cwd()}/${configuredMediaDir}`;

process.stdout.write(
  `${JSON.stringify(
    {
      spoken,
      summary: {
        source: input.source ?? "phone",
        intent,
        level: intent === "handoff" ? "high" : "medium",
        need: customerText || "SIP smoke test",
        questions: customerText ? [customerText] : [],
        nextAction: intent === "handoff" ? "人工客服跟进" : "继续确认客户需求",
        transcript: [{ role: "assistant", text: spoken, at: now }],
      },
      audio: {
        url: `file://${mediaDir}/${scenarioId}-turn-${turnIndex + 1}.wav`,
        label: "Mock SIP replay",
        mimeType: "audio/wav",
        durationMs: 4200,
      },
      voiceMetrics: {
        timeToFirstWordMs: 720,
        turnLatencyMs: 4200,
        asrConfidence: 0.93,
      },
    },
    null,
    2,
  )}\n`,
);
