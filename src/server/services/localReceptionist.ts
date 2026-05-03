import type { AgentRequest, AgentResponse } from "./agentAdapter";

export async function respondWithLocalReceptionist(input: AgentRequest): Promise<AgentResponse> {
  const lastMessage = input.messages[input.messages.length - 1]?.text ?? "";
  const firstPackage = input.merchant.packages[0];
  const now = new Date().toISOString();
  const asksPrice = /价格|多少钱|费用|报价/.test(lastMessage);
  const asksTime = /档期|时间|周末|预约/.test(lastMessage);

  const spoken = asksPrice
    ? `${firstPackage.name}一般是 ${firstPackage.priceRange}，包含${firstPackage.includes}。你方便留个称呼和电话吗？`
    : asksTime
      ? "档期需要商家确认。我先记录你的期望时间，方便老板尽快联系你。"
      : `我先帮你记录需求。你想咨询${input.merchant.name}的哪项服务？`;

  return {
    spoken,
    summary: {
      source: input.source,
      intent: asksPrice ? "pricing" : asksTime ? "availability" : "service_info",
      need: lastMessage || "客户开始咨询",
      questions: lastMessage ? [lastMessage] : [],
      level: asksPrice || asksTime ? "medium" : "low",
      nextAction: "请老板确认客户需求并继续跟进",
      transcript: [...input.messages, { role: "assistant", text: spoken, at: now }],
    },
  };
}
