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
    },
  };
}

function buildResponsesPayload(input: OpenClawTurnInput) {
  return {
    model: "openclaw",
    input: [
      `你是一个待测试的语音 Agent。请用简短中文回复用户。`,
      `测试套件：${input.suiteName}`,
      `场景：${input.scenario.title}`,
      `商家资料：${JSON.stringify(input.merchant)}`,
      `用户当前输入：${input.customerText}`,
    ].join("\n"),
    metadata: {
      suiteName: input.suiteName,
      scenarioId: input.scenario.id,
      turnIndex: String(input.turnIndex),
    },
  };
}

function mapOpenResponsesBody(body: OpenResponsesBody): VoiceAgentTurnOutput {
  const spoken =
    body.output_text ??
    body.output?.flatMap((item) => item.content ?? []).find((content) => typeof content.text === "string")?.text;

  return { spoken: spoken ?? "" };
}
