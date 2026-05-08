import type { AgentRequest, AgentResponse } from "./agentAdapter";

export async function respondWithLocalReceptionist(input: AgentRequest): Promise<AgentResponse> {
  const lastMessage = input.messages[input.messages.length - 1]?.text ?? "";
  const firstPackage = input.merchant.packages[0];
  const now = new Date().toISOString();
  const asksPrice = /价格|多少钱|费用|报价|退保|保费|price|cost|how much|package|fee|refund/i.test(lastMessage);
  const asksHandoff =
    /人工|真人|客服|老板|转接|联系|跟进|加.*微信|微信|回电|回电话|投诉|主管|拒赔|持牌|顾问|理赔专员|human|person|call me|contact me|follow up|handoff|transfer|licensed agent|adjuster/i.test(
      lastMessage,
    );
  const asksTime =
    /档期|时间|周末|预约|想约|周一|周二|周三|周四|周五|周六|周日|过去|available|availability|weekend|book|booking|appointment/i.test(
      lastMessage,
    );
  const contactFields = extractContactFields(lastMessage);
  const regulatedReply = buildRegulatedServiceReply(input.merchant.industry, lastMessage, asksHandoff);

  const spoken =
    regulatedReply ??
    (asksHandoff
      ? "可以，我先帮你记录转人工需求，请留下电话或联系方式，老板会尽快联系你。"
      : asksPrice
        ? `${firstPackage.name}一般是 ${firstPackage.priceRange}，包含${firstPackage.includes}。你方便留个称呼和电话吗？`
        : asksTime
          ? "档期需要商家确认。我先记录你的期望时间，请留下电话或联系方式，方便老板尽快联系你。"
          : `我先帮你记录需求。你想咨询${input.merchant.name}的哪项服务？`);

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

function buildRegulatedServiceReply(industry: string, text: string, asksHandoff: boolean): string | undefined {
  if (industry !== "insurance") {
    return undefined;
  }

  if (asksHandoff || /核验失败|验证失败|投诉|拒赔|主管|licensed agent|adjuster|human/i.test(text)) {
    return "可以，我先帮你记录人工或持牌顾问跟进需求。为保护隐私，请留下电话，后续由人工完成身份核验并联系处理。";
  }

  if (/coverage|eligibility|保障|理赔|赔付|报销|保单|claim|policy|核保/i.test(text)) {
    return "这类保单、理赔、coverage 和 eligibility 问题需要先完成身份核验，再由人工或持牌顾问确认，不能在自动对话里承诺赔付或保障资格。请留下电话和要处理的问题。";
  }

  return "保险服务涉及身份核验和持牌顾问确认。我可以先记录你的需求和联系方式，再安排人工安全跟进。";
}

function extractContactFields(text: string) {
  const phone = text.match(/1[3-9]\d{9}/)?.[0];
  const customerName = text.match(/我(?:叫|是)\s*([\u4e00-\u9fa5A-Za-z]{1,12})(?:[，,。；;\s]|$)/)?.[1];
  const preferredTime = text.match(/(?:这周|下周)?周[一二三四五六日天]|星期[一二三四五六日天]|周末|今天|明天|后天/)?.[0];
  const location = text.match(/浦东|徐汇|闵行|黄浦|静安|长宁|朝阳|海淀|[^\s，,。；;]{1,10}(?:区|路|街|小区|花园|公寓)/)?.[0];

  return {
    ...(customerName ? { customerName } : {}),
    ...(phone ? { phone } : {}),
    ...(preferredTime ? { preferredTime } : {}),
    ...(location ? { location } : {}),
  };
}
