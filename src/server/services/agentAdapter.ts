import { buildReceptionistPrompt } from "@/domain/agentPrompt";
import type { LeadSource, LeadSummary } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";
import { respondWithLocalReceptionist } from "@/server/services/localReceptionist";

export type ConversationMessage = {
  role: "customer" | "assistant";
  text: string;
  at: string;
};

export type AgentRequest = {
  merchant: Merchant;
  source: LeadSource;
  messages: ConversationMessage[];
};

export type AgentResponse = {
  spoken: string;
  summary: LeadSummary;
};

export async function requestReceptionistResponse(input: AgentRequest): Promise<AgentResponse> {
  if (process.env.AGENT_MODE !== "openclaw") {
    return respondWithLocalReceptionist(input);
  }

  const url = process.env.OPENCLAW_AGENT_URL;
  if (!url) {
    throw new Error("OPENCLAW_AGENT_URL is required when AGENT_MODE=openclaw");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENCLAW_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      prompt: buildReceptionistPrompt(input.merchant),
      merchant: input.merchant,
      source: input.source,
      messages: input.messages,
      outputContract: {
        spoken: "short customer-facing speech",
        summary: "LeadSummary JSON",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenClaw agent failed: ${response.status}`);
  }

  return (await response.json()) as AgentResponse;
}
