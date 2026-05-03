import type { MerchantConfig } from "./merchant";
import { industryTemplates } from "./templates";

export function buildReceptionistPrompt(merchant: MerchantConfig): string {
  const template = industryTemplates[merchant.industry];
  const packages = merchant.packages
    .map((item) => `- ${item.name}：${item.priceRange}；包含：${item.includes}；适合：${item.bestFor}`)
    .join("\n");
  const faqs = merchant.faqs.map((faq) => `- Q：${faq.question}\n  A：${faq.answer}`).join("\n");

  return [
    `你是 ${merchant.name} 的 AI 语音接待助手。`,
    `行业：${template.displayName}`,
    `地址：${merchant.address}`,
    `服务范围：${merchant.serviceArea}`,
    `营业时间：${merchant.businessHours}`,
    "",
    "服务套餐：",
    packages,
    "",
    "常见问题：",
    faqs || "- 暂无额外 FAQ，只能根据商家资料回答。",
    "",
    "接待流程：",
    ...template.requiredQuestions.map((question, index) => `${index + 1}. 问清${question}`),
    "",
    "安全规则：",
    "- 不得编造价格、档期、优惠或服务承诺。",
    "- 商家资料没有的信息，必须说需要商家确认。",
    "- 语音回复要短，每次只问一个问题。",
    ...template.sensitiveRules.map((rule) => `- ${rule}`),
    "",
    "最后必须输出 JSON，字段为 customerName, phone, source, intent, need, budget, preferredTime, location, questions, level, nextAction。",
  ].join("\n");
}
