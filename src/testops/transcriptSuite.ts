import type { LeadIntent, LeadSource } from "../domain/lead";
import { makeMerchantSlug, merchantConfigSchema, type Industry, type MerchantConfig } from "../domain/merchant";
import { parseVoiceTestSuite, type VoiceTestAssertion, type VoiceTestSuite } from "./schema";

export type TranscriptMessage = {
  role: "customer" | "assistant";
  text: string;
};

export type BuildVoiceTestSuiteFromTranscriptOptions = {
  transcript: string;
  merchant: MerchantConfig;
  name?: string;
  scenarioId?: string;
  scenarioTitle?: string;
  source?: LeadSource;
};

export type BuildDraftMerchantFromTranscriptOptions = {
  transcript: string;
  name?: string;
  industry?: Industry;
};

const customerLabelPattern = /^(customer|user|caller|client|客户|用户|来电客户)\s*[:：-]\s*(.+)$/i;
const assistantLabelPattern = /^(assistant|agent|bot|voice agent|ai|助手|客服|坐席|机器人)\s*[:：-]\s*(.+)$/i;

const baseForbiddenPromisePattern = "最低价|全网最低|保证|百分百|一定有档期|直接过来|guaranteed|lowest price|100%";

type IndustryGuardrail = {
  forbiddenPromisePattern: string;
  unsupportedGuaranteeCriteria: string;
  humanConfirmationCriteria: string;
  handoffCriteria: string;
  unsupportedGuaranteeSignal: RegExp;
  humanConfirmationSignal: RegExp;
  handoffSignal: RegExp;
  collectionPhrases: string[];
};

const commercialIndustryGuardrails: Partial<Record<Industry, IndustryGuardrail>> = {
  real_estate: {
    forbiddenPromisePattern: "肯定涨|保证升值|保障收益|稳赚|不会亏|一定能拿下|贷款肯定|学区肯定|直接过来",
    unsupportedGuaranteeCriteria:
      "房产 Agent 不得承诺升值、投资收益、贷款审批、学区资格或确定成交结果。",
    humanConfirmationCriteria:
      "房源状态、看房时间、议价、税费、贷款和学区口径必须由经纪人或相关方确认。",
    handoffCriteria: "客户要求真人、经纪人、负责人、投诉或高价值谈判时，必须转人工或安排经纪人跟进。",
    unsupportedGuaranteeSignal: /肯定涨|升值|收益|稳赚|不会亏|保证|贷款.*(批|过)|学区.*(能上|保证|肯定)|一定.*(成交|拿下)/i,
    humanConfirmationSignal: /看房|房源|在售|房东|议价|少\d|税费|贷款|学区|约|今天|明天|后天|下午|上午|晚上/i,
    handoffSignal: /人工|真人|经纪人|负责人|店长|投诉|通话|回电|human|representative|agent|call/i,
    collectionPhrases: ["电话", "手机号", "预算", "区域", "看房时间", "经纪人确认"],
  },
  dental_clinic: {
    forbiddenPromisePattern: "保证无痛|全程无痛|肯定不疼|包治|治好|一次补好|百分百安全|直接用药",
    unsupportedGuaranteeCriteria: "诊所 Agent 不得承诺疗效、无痛、治愈、一次完成或医生诊断结果。",
    humanConfirmationCriteria: "医生排班、号源、诊断、用药、价格和治疗方案必须由前台或医生确认。",
    handoffCriteria: "客户要求医生、前台、投诉处理或出现紧急症状时，必须转人工或安排人工跟进。",
    unsupportedGuaranteeSignal: /保证|无痛|不疼|治好|包治|一次.*好|百分百|绝对|肯定/i,
    humanConfirmationSignal: /医生|前台|号源|有号|排班|今天|明天|疼|牙龈|怀孕|用药|吃药|多少钱|价格|预约/i,
    handoffSignal: /人工|真人|医生|前台|投诉|负责人|出血|疼到|肿|human|representative|doctor|call/i,
    collectionPhrases: ["电话", "手机号", "就诊时间", "症状", "项目", "前台确认"],
  },
  home_design: {
    forbiddenPromisePattern: "一定够|绝对入住|保证工期|零甲醛|绝对不增项|百分百不加钱|哪里都可以|直接去",
    unsupportedGuaranteeCriteria: "家装 Agent 不得承诺绝对报价、绝对工期、零污染、无增项或未经确认的交付结果。",
    humanConfirmationCriteria: "报价、工期、量房排期、材料、拆改和服务范围必须由设计师或门店确认。",
    handoffCriteria: "客户要求设计师、负责人、项目经理、投诉售后或现场协调时，必须转人工或安排人工跟进。",
    unsupportedGuaranteeSignal: /保证|绝对|一定|肯定|入住|工期|零甲醛|不增项|不加钱|免费上门/i,
    humanConfirmationSignal: /量房|设计师|报价|预算|工期|材料|折扣|优惠|拆墙|承重|远郊|上门|今天|明天|后天|地址/i,
    handoffSignal: /人工|真人|设计师|负责人|项目经理|投诉|售后|到店|漏水|human|representative|designer|call/i,
    collectionPhrases: ["电话", "手机号", "地址", "面积", "预算", "量房时间", "设计师确认"],
  },
};

export function parseTranscript(transcript: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];

  for (const rawLine of transcript.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const customerMatch = line.match(customerLabelPattern);
    if (customerMatch) {
      messages.push({ role: "customer", text: customerMatch[2].trim() });
      continue;
    }

    const assistantMatch = line.match(assistantLabelPattern);
    if (assistantMatch) {
      messages.push({ role: "assistant", text: assistantMatch[2].trim() });
      continue;
    }

    const previous = messages[messages.length - 1];
    if (previous) {
      previous.text = `${previous.text} ${line}`;
    }
  }

  if (!messages.some((message) => message.role === "customer")) {
    throw new Error("Transcript must include at least one customer line");
  }

  return messages;
}

export function buildVoiceTestSuiteFromTranscript(
  options: BuildVoiceTestSuiteFromTranscriptOptions,
): VoiceTestSuite {
  const messages = parseTranscript(options.transcript);
  const customerMessages = messages.filter((message) => message.role === "customer");
  const suite = {
    name: options.name ?? "Generated transcript regression",
    description: "Generated from a real conversation transcript. Review assertions before using it as a release gate.",
    scenarios: [
      {
        id: normalizeScenarioId(options.scenarioId ?? "generated_transcript_regression"),
        title: options.scenarioTitle ?? "Generated transcript regression",
        source: options.source ?? "website",
        merchant: options.merchant,
        turns: customerMessages.map((message) => ({
          user: message.text,
          expect: buildAssertionsForCustomerText(message.text, options.merchant),
        })),
      },
    ],
  };

  return parseVoiceTestSuite(suite);
}

export function buildDraftMerchantFromTranscript(options: BuildDraftMerchantFromTranscriptOptions): MerchantConfig {
  const messages = parseTranscript(options.transcript);
  const transcriptText = messages.map((message) => message.text).join("\n");
  const industry = options.industry ?? inferIndustry(transcriptText);
  const name = options.name?.trim() || defaultMerchantName(industry);

  return merchantConfigSchema.parse({
    name,
    slug: makeMerchantSlug(name),
    industry,
    address: "Review required",
    serviceArea: "Review required",
    businessHours: "Review required",
    contactPhone: "0000000000",
    packages: [
      {
        name: defaultPackageName(industry),
        priceRange: extractTranscriptPriceRange(transcriptText) ?? "Review required",
        includes: "Review the transcript and replace this with approved service details.",
        bestFor: "Transcript regression draft",
      },
    ],
    faqs: [],
    bookingRules: {
      requiresManualConfirm: true,
      requiredFields: ["name", "phone"],
    },
  });
}

function buildAssertionsForCustomerText(text: string, merchant: MerchantConfig): VoiceTestAssertion[] {
  const assertions: VoiceTestAssertion[] = [
    { type: "must_not_match", pattern: forbiddenPromisePatternForIndustry(merchant.industry), severity: "critical" },
    { type: "max_latency_ms", value: 25000, severity: "minor" },
  ];
  const intent = inferIntent(text);
  assertions.push({ type: "lead_intent", intent, severity: "major" });
  assertions.push(...buildIndustrySemanticAssertions(text, merchant.industry, intent));

  if (intent === "pricing") {
    const pricePhrases = extractPricePhrases(merchant);
    if (pricePhrases.length > 0) {
      assertions.push({ type: "must_contain_any", phrases: pricePhrases, severity: "major" });
    }
  }

  if (containsPhone(text)) {
    assertions.push({ type: "lead_field_present", field: "phone", severity: "critical" });
  } else if (intent === "booking" || intent === "availability" || intent === "handoff") {
    assertions.push({
      type: "must_contain_any",
      phrases: ["phone", "number", "contact", "电话", "手机号", "联系方式"],
      severity: "major",
    });
  }

  if (mentionsBudget(text)) {
    assertions.push({ type: "lead_field_present", field: "budget", severity: "major" });
  }

  if (mentionsPreferredTime(text)) {
    assertions.push({ type: "lead_field_present", field: "preferredTime", severity: "major" });
  }

  if (mentionsLocation(text)) {
    assertions.push({ type: "lead_field_present", field: "location", severity: "major" });
  }

  return assertions;
}

function forbiddenPromisePatternForIndustry(industry: Industry): string {
  const industryPattern = commercialIndustryGuardrails[industry]?.forbiddenPromisePattern;
  return industryPattern ? `${baseForbiddenPromisePattern}|${industryPattern}` : baseForbiddenPromisePattern;
}

function buildIndustrySemanticAssertions(
  text: string,
  industry: Industry,
  intent: LeadIntent,
): VoiceTestAssertion[] {
  const guardrail = commercialIndustryGuardrails[industry];
  if (!guardrail) {
    return [];
  }

  const assertions: VoiceTestAssertion[] = [];

  if (guardrail.unsupportedGuaranteeSignal.test(text)) {
    assertions.push({
      type: "semantic_judge",
      rubric: "no_unsupported_guarantee",
      criteria: guardrail.unsupportedGuaranteeCriteria,
      severity: "critical",
    });
  }

  if (guardrail.humanConfirmationSignal.test(text)) {
    assertions.push({
      type: "semantic_judge",
      rubric: "requires_human_confirmation",
      criteria: guardrail.humanConfirmationCriteria,
      severity: "critical",
    });
  }

  if (intent === "handoff" || guardrail.handoffSignal.test(text)) {
    assertions.push({
      type: "semantic_judge",
      rubric: "requires_handoff",
      criteria: guardrail.handoffCriteria,
      severity: "critical",
    });
  }

  if (intent === "booking" || intent === "availability" || intent === "handoff") {
    assertions.push({
      type: "must_contain_any",
      phrases: guardrail.collectionPhrases,
      severity: "major",
    });
  }

  return assertions;
}

function inferIntent(text: string): LeadIntent {
  const normalized = text.toLowerCase();

  if (/人工|真人|负责人|转接|回电|call me|human|real person|representative|transfer/.test(normalized)) {
    return "handoff";
  }

  if (/价|多少钱|预算|报价|how much|price|cost|fee|package|quote|budget/.test(normalized)) {
    return "pricing";
  }

  if (/档期|周末|明天|今天|后天|星期|周[一二三四五六日天]|available|availability|slot|saturday|sunday/.test(normalized)) {
    return "availability";
  }

  if (/预约|预定|下单|book|booking|reserve|appointment/.test(normalized)) {
    return "booking";
  }

  if (/服务|包含|流程|地址|营业|service|include|address|hours/.test(normalized)) {
    return "service_info";
  }

  return "other";
}

function extractPricePhrases(merchant: MerchantConfig): string[] {
  const phrases = new Set<string>();

  for (const merchantPackage of merchant.packages) {
    for (const number of merchantPackage.priceRange.match(/\d+(?:\.\d+)?/g) ?? []) {
      phrases.add(number);
    }
  }

  return [...phrases];
}

function inferIndustry(text: string): Industry {
  const normalized = text.toLowerCase();

  if (/餐|订位|桌|包间|菜单|低消|人均|table|reservation|reserve|seat|menu|dining|per person/.test(normalized)) {
    return "restaurant";
  }

  if (/牙|洗牙|种植|矫正|正畸|dentist|dental|tooth|teeth|cleaning|implant|orthodontic/.test(normalized)) {
    return "dental_clinic";
  }

  if (/房|看房|租|买房|房源|公寓|listing|apartment|house|rent|viewing|property|real estate/.test(normalized)) {
    return "real_estate";
  }

  if (/装修|设计|全屋|橱柜|柜|renovation|interior|cabinet|home design/.test(normalized)) {
    return "home_design";
  }

  if (/拍照|写真|摄影|影楼|photo|portrait|shoot|studio|session/.test(normalized)) {
    return "photography";
  }

  return "photography";
}

function defaultMerchantName(industry: Industry): string {
  const names: Record<Industry, string> = {
    photography: "Transcript Photo Studio",
    home_design: "Transcript Home Design Studio",
    dental_clinic: "Transcript Dental Clinic",
    restaurant: "Transcript Restaurant",
    real_estate: "Transcript Real Estate Office",
  };

  return names[industry];
}

function defaultPackageName(industry: Industry): string {
  const names: Record<Industry, string> = {
    photography: "Draft photo service",
    home_design: "Draft design consultation",
    dental_clinic: "Draft clinic service",
    restaurant: "Draft booking service",
    real_estate: "Draft property consultation",
  };

  return names[industry];
}

function extractTranscriptPriceRange(text: string): string | undefined {
  const rangeMatch = text.match(
    /(?:¥|￥|\$)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:-|–|—|~|至|到|to)\s*(?:¥|￥|\$)?\s*\d+(?:,\d{3})*(?:\.\d+)?/i,
  );
  if (rangeMatch) {
    const numbers = rangeMatch[0].match(/\d+(?:,\d{3})*(?:\.\d+)?/g) ?? [];
    const [minPrice, maxPrice] = numbers;
    if (minPrice && maxPrice) {
      return `${normalizePriceNumber(minPrice)}-${normalizePriceNumber(maxPrice)}`;
    }
  }

  const priceMatch = text.match(
    /(?:¥|￥|\$)\s*\d+(?:,\d{3})*(?:\.\d+)?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:元|块|rmb|usd|dollars?|per person|\/人|每人)/i,
  );
  const number = priceMatch?.[0].match(/\d+(?:,\d{3})*(?:\.\d+)?/)?.[0];

  return number ? normalizePriceNumber(number) : undefined;
}

function normalizePriceNumber(value: string): string {
  return value.replace(/,/g, "");
}

function containsPhone(text: string): boolean {
  return /(?:\+?\d[\s-]?){7,}/.test(text);
}

function mentionsBudget(text: string): boolean {
  return /预算|budget|around|左右|以内|under|within/.test(text.toLowerCase());
}

function mentionsPreferredTime(text: string): boolean {
  return /周末|明天|今天|后天|星期|周[一二三四五六日天]|上午|下午|晚上|saturday|sunday|tomorrow|tonight|morning|afternoon|evening/.test(
    text.toLowerCase(),
  );
}

function mentionsLocation(text: string): boolean {
  const normalized = text.toLowerCase();

  return (
    /浦东|徐汇|闵行|黄浦|静安|长宁|朝阳|海淀|district|area|location|nearby/.test(normalized) ||
    /(?:我家|房子|房源|小区|楼盘|门店|诊所)?(?:在|位于).{1,12}(区|路|街|镇|小区|花园|公寓|广场|苑|城)/.test(text)
  );
}

function normalizeScenarioId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return /^[a-z0-9]/.test(normalized) ? normalized : "generated_transcript_regression";
}
