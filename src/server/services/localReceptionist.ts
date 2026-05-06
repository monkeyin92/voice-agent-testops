import type { AgentRequest, AgentResponse } from "./agentAdapter";

export async function respondWithLocalReceptionist(input: AgentRequest): Promise<AgentResponse> {
  const lastMessage = input.messages[input.messages.length - 1]?.text ?? "";
  const firstPackage = input.merchant.packages[0];
  const now = new Date().toISOString();
  const asksPrice = /价格|多少钱|费用|报价/.test(lastMessage);
  const asksHandoff = /人工|真人|客服|老板|转接|联系/.test(lastMessage);
  const asksTime = /档期|时间|周末|预约|想约|周一|周二|周三|周四|周五|周六|周日|过去/.test(lastMessage);
  const contactFields = extractContactFields(lastMessage);

  const spoken = asksHandoff
    ? "可以，我先帮你记录转人工需求，请留下电话或联系方式，老板会尽快联系你。"
    : asksPrice
      ? `${firstPackage.name}一般是 ${firstPackage.priceRange}，包含${firstPackage.includes}。你方便留个称呼和电话吗？`
      : asksTime
        ? "档期需要商家确认。我先记录你的期望时间，请留下电话或联系方式，方便老板尽快联系你。"
        : `我先帮你记录需求。你想咨询${input.merchant.name}的哪项服务？`;

  return {
    spoken,
    summary: {
      source: input.source,
      intent: asksHandoff ? "handoff" : asksPrice ? "pricing" : asksTime ? "availability" : "service_info",
      need: lastMessage || "客户开始咨询",
      questions: lastMessage ? [lastMessage] : [],
      level: contactFields.phone ? "high" : asksHandoff || asksPrice || asksTime ? "medium" : "low",
      nextAction: asksHandoff ? "请老板人工联系客户" : "请老板确认客户需求并继续跟进",
      transcript: [...input.messages, { role: "assistant", text: spoken, at: now }],
      ...contactFields,
    },
  };
}

function extractContactFields(text: string) {
  const phone = text.match(/1[3-9]\d{9}/)?.[0];
  const customerName = text.match(/我(?:叫|是)\s*([\u4e00-\u9fa5A-Za-z]{1,12})(?:[，,。；;\s]|$)/)?.[1];
  const preferredTime = text.match(/(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天]|周末|今天|明天|后天/)?.[0];

  return {
    ...(customerName ? { customerName } : {}),
    ...(phone ? { phone } : {}),
    ...(preferredTime ? { preferredTime } : {}),
  };
}
