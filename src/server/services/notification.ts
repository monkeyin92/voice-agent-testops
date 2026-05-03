import type { Lead } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";

export type NotifyLeadInput = {
  merchant: Merchant;
  lead: Lead;
};

export async function notifyFeishuLead({ merchant, lead }: NotifyLeadInput): Promise<void> {
  const webhook = merchant.feishuWebhookUrl ?? process.env.FEISHU_WEBHOOK_URL;
  if (!webhook) {
    throw new Error("Feishu webhook is not configured");
  }

  const text = [
    `新咨询：${merchant.name}`,
    `客户：${lead.customerName ?? "未留姓名"}`,
    `电话：${lead.phone ?? "未留电话"}`,
    `来源：${lead.source}`,
    `意向：${lead.intent} / ${lead.level}`,
    `需求：${lead.need}`,
    `预算：${lead.budget ?? "未说明"}`,
    `时间：${lead.preferredTime ?? "未说明"}`,
    `下一步：${lead.nextAction}`,
  ].join("\n");

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text },
    }),
  });

  if (!response.ok) {
    throw new Error(`Feishu notification failed: ${response.status}`);
  }
}
