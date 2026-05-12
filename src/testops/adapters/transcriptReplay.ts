import type { LeadIntent, LeadSource, LeadSummary } from "../../domain/lead";
import type { ConversationMessage } from "../../server/services/agentAdapter";
import type { VoiceAgentExecutor } from "../agents";
import { parseTranscript } from "../transcriptSuite";

type TranscriptReplayTurn = {
  customer: string;
  assistant: string;
};

export function createTranscriptReplayAgent(options: { transcript: string; source?: LeadSource }): VoiceAgentExecutor {
  const turns = buildReplayTurns(options.transcript);

  return async (input) => {
    const replay = turns[input.turnIndex] ?? turns[turns.length - 1];
    const spoken = replay?.assistant ?? "No assistant response was found in the transcript.";
    const now = new Date().toISOString();
    const assistantMessage: ConversationMessage = {
      role: "assistant",
      text: spoken,
      at: now,
    };

    return {
      spoken,
      summary: buildReplaySummary({
        source: options.source ?? input.scenario.source,
        customerText: input.customerText,
        assistantText: spoken,
        messages: [...input.messages, assistantMessage],
      }),
    };
  };
}

function buildReplayTurns(transcript: string): TranscriptReplayTurn[] {
  const messages = parseTranscript(transcript);
  const turns: TranscriptReplayTurn[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "customer") {
      continue;
    }

    const nextAssistant = messages.slice(index + 1).find((candidate) => candidate.role === "assistant");
    turns.push({
      customer: message.text,
      assistant: nextAssistant?.text ?? "No assistant response was found in the transcript.",
    });
  }

  return turns;
}

function buildReplaySummary(options: {
  source: LeadSource;
  customerText: string;
  assistantText: string;
  messages: ConversationMessage[];
}): LeadSummary {
  const combined = `${options.customerText}\n${options.assistantText}`;
  const contactFields = extractContactFields(combined);
  const intent = inferIntent(options.customerText);

  return {
    source: options.source,
    intent,
    need: options.customerText,
    questions: [options.customerText],
    level: contactFields.phone || contactFields.customerName ? "high" : intent === "handoff" || intent === "booking" ? "medium" : "low",
    nextAction: inferNextAction(intent),
    transcript: options.messages.map((message) => ({
      role: message.role,
      text: message.text,
      at: message.at,
    })),
    ...contactFields,
  };
}

function inferIntent(text: string): LeadIntent {
  if (/人工|真人|客服|老板|转接|联系|跟进|投诉|human|person|call me|contact|handoff|transfer/i.test(text)) {
    return "handoff";
  }
  if (/预约|报名|下单|购买|到店|book|booking|appointment|reserve|schedule|cleaning|checkup/i.test(text)) {
    return "booking";
  }
  if (/档期|时间|周末|今天|明天|后天|available|availability|weekend|when/i.test(text)) {
    return "availability";
  }
  if (/价格|多少钱|费用|报价|预算|price|cost|how much|fee|budget/i.test(text)) {
    return "pricing";
  }
  if (/服务|包含|怎么做|介绍|what|how|service/i.test(text)) {
    return "service_info";
  }
  return "other";
}

function inferNextAction(intent: LeadIntent): string {
  if (intent === "handoff") {
    return "Review handoff request and assign a human follow-up owner.";
  }
  if (intent === "booking" || intent === "availability") {
    return "Confirm availability and required contact fields before booking.";
  }
  if (intent === "pricing") {
    return "Verify pricing boundaries against approved merchant facts.";
  }
  return "Review the transcript result and decide whether to add a regression case.";
}

function extractContactFields(text: string): Partial<
  Pick<LeadSummary, "customerName" | "phone" | "budget" | "preferredTime" | "location">
> {
  const phone = text.match(/(?:\+?\d[\d -]{6,}\d|1[3-9]\d{9}|\[(?:PHONE|PHONE_NUMBER|CALLER_PHONE)\])/i)?.[0]?.replace(/\s+/g, " ");
  const customerName = text.match(/我(?:叫|是)\s*([\u4e00-\u9fa5A-Za-z]{1,24})(?:[，,。；;\s]|$)/)?.[1];
  const budget = text.match(/(?:预算|budget)[^\d$￥¥]*(?:[$￥¥]?\s?\d+(?:[,.]\d+)?\s?(?:万|k|K|元|块|dollars?)?)/i)?.[0];
  const preferredTime = text.match(
    /(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天]|周末|今天|明天|后天|上午|下午|晚上|today|tomorrow|tonight|morning|afternoon|evening|weekend|\b(?:\d{1,2})(?::\d{2})?\s?(?:am|pm)\b/i,
  )?.[0];
  const location = text.match(/浦东|徐汇|闵行|黄浦|静安|长宁|朝阳|海淀|[^\s，,。；;]{1,16}(?:区|路|街|小区|花园|公寓|city|street|ave|avenue)/i)?.[0];

  return {
    ...(customerName ? { customerName } : {}),
    ...(phone ? { phone } : {}),
    ...(budget ? { budget } : {}),
    ...(preferredTime ? { preferredTime } : {}),
    ...(location ? { location } : {}),
  };
}
