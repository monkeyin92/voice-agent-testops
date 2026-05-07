import type { VoiceAgentExecutor, VoiceAgentTurnOutput } from "../agents";

type FetchLike = typeof fetch;

export type OpenClawAgentOptions = {
  endpoint: string;
  apiKey?: string;
  mode?: "custom" | "responses";
  fetchImpl?: FetchLike;
};

export function createOpenClawAgent(options: OpenClawAgentOptions): VoiceAgentExecutor {
  const fetcher = options.fetchImpl ?? fetch;

  return async (input) => {
    const response = await fetcher(options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
      },
      body: JSON.stringify(options.mode === "responses" ? buildResponsesPayload(input) : buildCustomPayload(input)),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw agent failed with ${response.status}${await formatErrorBody(response)}`);
    }

    const body = (await response.json()) as Partial<VoiceAgentTurnOutput> & OpenResponsesBody;
    const output = options.mode === "responses" ? mapOpenResponsesBody(body) : body;
    if (typeof output.spoken !== "string" || output.spoken.trim().length === 0) {
      throw new Error("OpenClaw response must include non-empty spoken");
    }

    return output as VoiceAgentTurnOutput;
  };
}

async function formatErrorBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    return trimmed.length > 0 ? `: ${trimmed.slice(0, 500)}` : "";
  } catch {
    return "";
  }
}

type OpenClawTurnInput = Parameters<VoiceAgentExecutor>[0];

type OpenResponsesBody = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function buildCustomPayload(input: OpenClawTurnInput) {
  return {
    provider: "voice-agent-testops",
    suiteName: input.suiteName,
    scenarioId: input.scenario.id,
    input: {
      customerText: input.customerText,
      turnIndex: input.turnIndex,
      source: input.scenario.source,
      merchant: input.merchant,
      messages: input.messages,
    },
    outputContract: {
      spoken: "short voice-agent response",
      summary: "optional LeadSummary-compatible JSON",
      tools: "optional array of tool calls: [{ name, arguments, result }]",
      state: "optional backend state snapshot used by backend_state assertions",
      audio: "optional replay metadata: { url, label, mimeType, durationMs }",
      voiceMetrics:
        "optional numeric metrics: { timeToFirstWordMs, turnLatencyMs, asrLatencyMs, ttsLatencyMs, silenceMs, interruptionCount, asrConfidence }",
    },
  };
}

function buildResponsesPayload(input: OpenClawTurnInput) {
  return {
    model: "openclaw",
    input: [
      `你是一个待测试的语音 Agent。只输出 JSON，不要 Markdown，不要代码块，不要额外解释。`,
      `硬性规则：直接回答用户当前问题；不要先问称呼；不要自我介绍；不要说“刚上线”；不要在回答价格、档期、转人工问题前寒暄。`,
      `如果用户询问价格，必须引用商家 packages 中匹配服务的 priceRange 和 includes，并把 summary.intent 设为 pricing。`,
      `如果用户询问档期、预约时间或能否过去，必须说明需要商家或真人客服确认，并把 summary.intent 设为 availability。`,
      `如果用户要求人工、真人、客服、老板联系，必须响应转人工，并把 summary.intent 设为 handoff。`,
      `JSON 必须包含 spoken 和 summary。spoken 是给客户听到的简短中文回复。summary 必须兼容 LeadSummary。`,
      `summary 字段要求：source 使用 "${input.scenario.source}"；intent 只能是 pricing、availability、booking、service_info、handoff、other；level 只能是 high、medium、low；transcript 可以输出空数组。`,
      `测试套件：${input.suiteName}`,
      `场景：${input.scenario.title}`,
      `商家资料：${JSON.stringify(input.merchant)}`,
      `历史消息：${JSON.stringify(input.messages)}`,
      `用户当前输入：${input.customerText}`,
      `只输出 JSON 示例：{"spoken":"单人写真一般是 599-1299 元，档期需要人工确认。","summary":{"source":"${input.scenario.source}","intent":"pricing","level":"medium","need":"客户咨询单人写真价格","questions":["单人写真多少钱"],"nextAction":"人工确认档期后跟进","transcript":[]}}`,
    ].join("\n"),
    metadata: {
      suiteName: input.suiteName,
      scenarioId: input.scenario.id,
      turnIndex: String(input.turnIndex),
    },
  };
}

function mapOpenResponsesBody(body: OpenResponsesBody): VoiceAgentTurnOutput {
  const spoken = extractOpenResponseText(body);
  const structured = parseVoiceAgentJson(spoken);

  return structured ?? { spoken: spoken ?? "" };
}

function extractOpenResponseText(body: OpenResponsesBody): string | undefined {
  if (typeof body.output_text === "string") {
    return body.output_text;
  }

  const textParts =
    body.output
      ?.flatMap((item) => item.content ?? [])
      .flatMap((content) => (typeof content.text === "string" ? [content.text] : [])) ?? [];

  return textParts.length > 0 ? textParts.join("\n") : undefined;
}

function parseVoiceAgentJson(text: string | undefined): VoiceAgentTurnOutput | undefined {
  if (typeof text !== "string") {
    return undefined;
  }

  const cleaned = stripJsonFence(text);
  try {
    const parsed = JSON.parse(cleaned) as Partial<VoiceAgentTurnOutput>;
    if (typeof parsed.spoken !== "string" || parsed.spoken.trim().length === 0) {
      return undefined;
    }

    return {
      spoken: parsed.spoken,
      ...(isRecord(parsed.summary) ? { summary: parsed.summary } : {}),
      ...(Array.isArray(parsed.tools) ? { tools: parsed.tools } : {}),
      ...(isRecord(parsed.state) ? { state: parsed.state } : {}),
      ...(isRecord(parsed.audio) ? { audio: parsed.audio } : {}),
      ...(isRecord(parsed.voiceMetrics) ? { voiceMetrics: parsed.voiceMetrics } : {}),
    } as VoiceAgentTurnOutput;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() ?? trimmed;
}
