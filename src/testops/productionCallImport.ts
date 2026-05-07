import { createHash } from "node:crypto";
import { leadSourceSchema, type LeadSource } from "../domain/lead";
import { industrySchema, type Industry } from "../domain/merchant";
import { parseTranscript } from "./transcriptSuite";

export type ProductionCallTranscriptMessage = {
  role: "customer" | "assistant";
  text: string;
  at?: string;
};

export type ProductionCallRecord = {
  id: string;
  provider?: string;
  startedAt?: string;
  source: LeadSource;
  industry?: Industry;
  riskTags: string[];
  transcript: ProductionCallTranscriptMessage[];
  transcriptPath?: string;
};

export type ProductionCallImportRejected = {
  index: number;
  reason: string;
};

export type ProductionCallImportResult = {
  records: ProductionCallRecord[];
  rejected: ProductionCallImportRejected[];
};

export type ProductionCallSampleOptions = {
  sampleSize: number;
  seed?: string;
  riskOnly?: boolean;
  rejected?: ProductionCallImportRejected[];
};

export type ProductionCallSample = {
  seed: string;
  sampleSize: number;
  totalCalls: number;
  selectedCalls: ProductionCallRecord[];
  rejectedCalls: ProductionCallImportRejected[];
  riskTagCounts: Array<{ tag: string; count: number }>;
};

const riskTagWeights: Record<string, number> = {
  unsupported_promise: 50,
  handoff_request: 40,
  lead_info_shared: 30,
  pricing_question: 20,
  availability_question: 20,
  booking_intent: 20,
  long_call: 10,
  low_signal: 0,
};

export function parseProductionCallImport(content: string): ProductionCallImportResult {
  const rawRecords = parseRawRecords(content);
  const records: ProductionCallRecord[] = [];
  const rejected: ProductionCallImportRejected[] = [];

  rawRecords.forEach((rawRecord, index) => {
    try {
      records.push(normalizeProductionCallRecord(rawRecord, index));
    } catch (error) {
      rejected.push({ index, reason: error instanceof Error ? error.message : "Invalid call record" });
    }
  });

  if (records.length === 0) {
    throw new Error("No valid production call records found");
  }

  return { records, rejected };
}

export function buildProductionCallSample(
  records: ProductionCallRecord[],
  options: ProductionCallSampleOptions,
): ProductionCallSample {
  if (!Number.isInteger(options.sampleSize) || options.sampleSize <= 0) {
    throw new Error("--sample-size must be a positive integer");
  }

  const seed = options.seed ?? "default";
  const candidates = options.riskOnly ? records.filter((record) => hasReviewRisk(record)) : records;
  const selectedCalls = [...candidates]
    .sort((left, right) => compareSampleCandidates(left, right, seed))
    .slice(0, options.sampleSize);

  return {
    seed,
    sampleSize: options.sampleSize,
    totalCalls: records.length,
    selectedCalls,
    rejectedCalls: options.rejected ?? [],
    riskTagCounts: countRiskTags(records),
  };
}

export function renderProductionCallSamplingMarkdown(sample: ProductionCallSample): string {
  const lines = [
    "# Voice Agent TestOps Production Call Sampling Monitor",
    "",
    `Seed: ${sample.seed}`,
    `Requested sample size: ${sample.sampleSize}`,
    `Total calls: ${sample.totalCalls}`,
    `Selected calls: ${sample.selectedCalls.length}`,
    `Rejected records: ${sample.rejectedCalls.length}`,
    "",
    "## Risk Tags",
    "",
  ];

  if (sample.riskTagCounts.length === 0) {
    lines.push("- No risk tags found.");
  } else {
    for (const item of sample.riskTagCounts) {
      lines.push(`- ${item.tag}: ${item.count}`);
    }
  }

  lines.push("", "## Selected Calls", "");
  if (sample.selectedCalls.length === 0) {
    lines.push("No calls selected.", "");
    return `${lines.join("\n")}\n`;
  }

  sample.selectedCalls.forEach((call, index) => {
    const customerTurns = call.transcript.filter((message) => message.role === "customer").length;
    const assistantTurns = call.transcript.filter((message) => message.role === "assistant").length;
    lines.push(`### ${index + 1}. ${call.id}`);
    lines.push("");
    if (call.provider) {
      lines.push(`Provider: ${call.provider}`);
    }
    if (call.startedAt) {
      lines.push(`Started at: ${call.startedAt}`);
    }
    if (call.industry) {
      lines.push(`Industry: ${call.industry}`);
    }
    if (call.transcriptPath) {
      lines.push(`Transcript: ${call.transcriptPath}`);
    }
    lines.push(`Risk tags: ${call.riskTags.join(", ")}`);
    lines.push(`Turns: ${call.transcript.length} (${customerTurns} customer / ${assistantTurns} assistant)`);
    lines.push("");
  });

  if (sample.rejectedCalls.length > 0) {
    lines.push("## Rejected Records", "");
    for (const rejected of sample.rejectedCalls) {
      lines.push(`- ${rejected.index}: ${rejected.reason}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function renderProductionCallTranscript(record: ProductionCallRecord): string {
  const lines = record.transcript.map((message) => {
    const label = message.role === "customer" ? "Customer" : "Assistant";
    return `${label}: ${message.text}`;
  });

  return `${lines.join("\n")}\n`;
}

function parseRawRecords(content: string): unknown[] {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Call import input is empty");
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (isRecord(parsed) && Array.isArray(parsed.calls)) {
      return parsed.calls;
    }
    if (isRecord(parsed) && Array.isArray(parsed.records)) {
      return parsed.records;
    }
    return [parsed];
  } catch {
    return trimmed.split(/\r?\n/).map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        throw new Error(`Invalid JSONL record at line ${index + 1}`);
      }
    });
  }
}

function normalizeProductionCallRecord(rawRecord: unknown, index: number): ProductionCallRecord {
  if (!isRecord(rawRecord)) {
    throw new Error("Call record must be an object");
  }

  const transcript = extractTranscriptMessages(rawRecord);
  if (transcript.length === 0) {
    throw new Error("Call record must include transcript messages");
  }

  const id =
    firstString(rawRecord, [
      ["id"],
      ["callId"],
      ["call_id"],
      ["conversationId"],
      ["conversation_id"],
      ["call", "id"],
      ["call", "callId"],
      ["call", "call_id"],
    ]) ?? `call_${index + 1}`;
  const explicitTags = extractExplicitTags(rawRecord);
  const source = parseLeadSource(firstString(rawRecord, [["source"], ["leadSource"], ["lead_source"]]));
  const industry = parseIndustry(firstString(rawRecord, [["industry"], ["merchantIndustry"], ["merchant_industry"]]));

  return {
    id,
    provider: firstString(rawRecord, [["provider"], ["platform"], ["vendor"], ["call", "provider"]]),
    startedAt: firstString(rawRecord, [
      ["startedAt"],
      ["createdAt"],
      ["startTime"],
      ["started_at"],
      ["created_at"],
      ["timestamp"],
      ["call", "startedAt"],
      ["call", "createdAt"],
    ]),
    source,
    industry,
    riskTags: inferRiskTags(transcript, explicitTags),
    transcript,
  };
}

function extractTranscriptMessages(rawRecord: Record<string, unknown>): ProductionCallTranscriptMessage[] {
  const transcriptValue =
    rawRecord.transcript ?? rawRecord.messages ?? rawRecord.conversation ?? rawRecord.turns ?? nestedValue(rawRecord, ["call", "transcript"]);

  if (typeof transcriptValue === "string") {
    return parseTranscript(transcriptValue);
  }

  if (Array.isArray(transcriptValue) && transcriptValue.length === 0) {
    return [];
  }

  if (Array.isArray(transcriptValue) && transcriptValue.every((item) => typeof item === "string")) {
    return parseTranscript(transcriptValue.join("\n"));
  }

  if (!Array.isArray(transcriptValue)) {
    return [];
  }

  return transcriptValue
    .map(normalizeTranscriptMessage)
    .filter((message): message is ProductionCallTranscriptMessage => Boolean(message));
}

function normalizeTranscriptMessage(rawMessage: unknown): ProductionCallTranscriptMessage | undefined {
  if (!isRecord(rawMessage)) {
    return undefined;
  }

  const role = normalizeRole(firstString(rawMessage, [["role"], ["speaker"], ["from"], ["sender"], ["author"]]));
  const text = firstString(rawMessage, [["text"], ["message"], ["content"], ["transcript"], ["value"]]);
  if (!role || !text) {
    return undefined;
  }

  return {
    role,
    text,
    at: firstString(rawMessage, [["at"], ["timestamp"], ["time"], ["createdAt"], ["created_at"]]),
  };
}

function inferRiskTags(messages: ProductionCallTranscriptMessage[], explicitTags: string[]): string[] {
  const tags = new Set(explicitTags.map(normalizeTag).filter((tag) => tag.length > 0));
  const customerText = messages
    .filter((message) => message.role === "customer")
    .map((message) => message.text)
    .join("\n");
  const assistantText = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.text)
    .join("\n");

  if (/人工|真人|负责人|转接|回电|human|real person|representative|transfer|call me/i.test(customerText)) {
    tags.add("handoff_request");
  }
  if (/(?:\+?\d[\s-]?){7,}/.test(customerText)) {
    tags.add("lead_info_shared");
  }
  if (/价|多少钱|预算|报价|how much|price|cost|fee|package|quote|budget/i.test(customerText)) {
    tags.add("pricing_question");
  }
  if (/档期|周末|明天|今天|后天|星期|周[一二三四五六日天]|available|availability|slot|tomorrow|saturday|sunday/i.test(customerText)) {
    tags.add("availability_question");
  }
  if (/预约|预定|下单|book|booking|reserve|appointment/i.test(customerText)) {
    tags.add("booking_intent");
  }
  if (/最低价|全网最低|保证|百分百|一定有档期|直接过来|肯定涨|稳赚|不会亏|贷款.*(批|过)|无痛|包治|零甲醛|不增项|guaranteed|lowest price|100%/i.test(assistantText)) {
    tags.add("unsupported_promise");
  }
  if (messages.length >= 8) {
    tags.add("long_call");
  }
  if (tags.size === 0) {
    tags.add("low_signal");
  }

  return [...tags].sort(compareRiskTags);
}

function extractExplicitTags(rawRecord: Record<string, unknown>): string[] {
  const tags = rawRecord.riskTags ?? rawRecord.risk_tags ?? rawRecord.tags;
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === "string");
}

function countRiskTags(records: ProductionCallRecord[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const record of records) {
    for (const tag of record.riskTags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || compareRiskTags(left.tag, right.tag));
}

function compareSampleCandidates(left: ProductionCallRecord, right: ProductionCallRecord, seed: string): number {
  return (
    riskScore(right) - riskScore(left) ||
    stableHash(`${seed}:${left.id}`) - stableHash(`${seed}:${right.id}`) ||
    left.id.localeCompare(right.id)
  );
}

function riskScore(record: ProductionCallRecord): number {
  return record.riskTags.reduce((score, tag) => score + (riskTagWeights[tag] ?? 5), 0);
}

function hasReviewRisk(record: ProductionCallRecord): boolean {
  return record.riskTags.some((tag) => tag !== "low_signal");
}

function stableHash(value: string): number {
  return Number.parseInt(createHash("sha256").update(value).digest("hex").slice(0, 12), 16);
}

function compareRiskTags(left: string, right: string): number {
  return (riskTagWeights[right] ?? 5) - (riskTagWeights[left] ?? 5) || left.localeCompare(right);
}

function parseLeadSource(value: string | undefined): LeadSource {
  const parsed = leadSourceSchema.safeParse(value);
  return parsed.success ? parsed.data : "unknown";
}

function parseIndustry(value: string | undefined): Industry | undefined {
  const parsed = industrySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function normalizeRole(value: string | undefined): "customer" | "assistant" | undefined {
  if (!value) {
    return undefined;
  }

  if (/customer|user|caller|client|human|客户|用户|来电客户/i.test(value)) {
    return "customer";
  }
  if (/assistant|agent|bot|voice agent|ai|客服|坐席|机器人/i.test(value)) {
    return "assistant";
  }
  return undefined;
}

function normalizeTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstString(rawRecord: Record<string, unknown>, paths: string[][]): string | undefined {
  for (const path of paths) {
    const value = nestedValue(rawRecord, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function nestedValue(rawRecord: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = rawRecord;
  for (const key of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
