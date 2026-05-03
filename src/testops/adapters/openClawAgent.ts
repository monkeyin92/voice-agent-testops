import type { VoiceAgentExecutor, VoiceAgentTurnOutput } from "../agents";

type FetchLike = typeof fetch;

export type OpenClawAgentOptions = {
  endpoint: string;
  apiKey?: string;
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
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw agent failed with ${response.status}`);
    }

    const body = (await response.json()) as Partial<VoiceAgentTurnOutput>;
    if (typeof body.spoken !== "string" || body.spoken.trim().length === 0) {
      throw new Error("OpenClaw response must include non-empty spoken");
    }

    return body as VoiceAgentTurnOutput;
  };
}
