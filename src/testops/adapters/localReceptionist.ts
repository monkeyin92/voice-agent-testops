import { respondWithLocalReceptionist } from "../../server/services/localReceptionist";
import type { VoiceAgentExecutor } from "../agents";

export function createLocalReceptionistAgent(): VoiceAgentExecutor {
  return async (input) =>
    respondWithLocalReceptionist({
      merchant: input.merchant,
      source: input.scenario.source,
      messages: input.messages,
    });
}
