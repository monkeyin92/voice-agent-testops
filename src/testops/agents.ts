import type { LeadSummary } from "../domain/lead";
import type { Merchant, MerchantConfig } from "../domain/merchant";
import type { ConversationMessage } from "../server/services/agentAdapter";
import type { VoiceTestScenario } from "./schema";

export type VoiceAgentTurnInput = {
  suiteName: string;
  scenario: VoiceTestScenario;
  merchant: Merchant;
  messages: ConversationMessage[];
  turnIndex: number;
  customerText: string;
};

export type VoiceAgentTurnOutput = {
  spoken: string;
  summary?: LeadSummary;
  tools?: VoiceAgentToolCall[];
  state?: Record<string, unknown>;
};

export type VoiceAgentExecutor = (input: VoiceAgentTurnInput) => Promise<VoiceAgentTurnOutput>;

export type VoiceAgentToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
};

export function makeTestMerchant(config: MerchantConfig, id: string): Merchant {
  const createdAt = new Date("2026-05-03T00:00:00.000Z");

  return {
    ...config,
    id,
    createdAt,
    updatedAt: createdAt,
  };
}
