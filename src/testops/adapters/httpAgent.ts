import type { VoiceAgentExecutor, VoiceAgentTurnOutput } from "../agents";

export type HttpAgentOptions = {
  endpoint: string;
  headers?: Record<string, string>;
};

export function createHttpAgent(options: HttpAgentOptions): VoiceAgentExecutor {
  return async (input) => {
    const response = await fetch(options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify({
        suiteName: input.suiteName,
        scenarioId: input.scenario.id,
        turnIndex: input.turnIndex,
        customerText: input.customerText,
        source: input.scenario.source,
        merchant: input.merchant,
        messages: input.messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP agent failed with ${response.status}`);
    }

    const body = (await response.json()) as Partial<VoiceAgentTurnOutput>;
    if (typeof body.spoken !== "string" || body.spoken.trim().length === 0) {
      throw new Error("HTTP agent response must include non-empty spoken");
    }

    return body as VoiceAgentTurnOutput;
  };
}
