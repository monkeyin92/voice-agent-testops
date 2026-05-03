import { describe, expect, it, vi } from "vitest";
import type { LeadSummary } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";
import { processLeadSummary } from "@/server/services/leadWorkflow";

const merchant: Merchant = {
  id: "merchant_1",
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  feishuWebhookUrl: "https://open.feishu.cn/open-apis/bot/v2/hook/demo",
  packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套", bestFor: "个人写真" }],
  faqs: [],
  bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
  createdAt: new Date("2026-05-03T00:00:00.000Z"),
  updatedAt: new Date("2026-05-03T00:00:00.000Z"),
};

const summary: LeadSummary = {
  customerName: "李女士",
  phone: "13900000000",
  source: "xiaohongshu",
  intent: "booking",
  need: "想拍一组生日写真",
  budget: "1000 元左右",
  preferredTime: "周末下午",
  questions: ["是否可以周末拍", "是否包含妆造"],
  level: "high",
  nextAction: "老板确认周末档期后联系客户",
  transcript: [
    { role: "customer", text: "我想问下生日写真多少钱", at: "2026-05-03T10:00:00.000Z" },
    { role: "assistant", text: "单人写真一般 599 到 1299 元。", at: "2026-05-03T10:00:02.000Z" },
  ],
};

describe("processLeadSummary", () => {
  it("creates a lead and sends notification for valid summary", async () => {
    const createLead = vi.fn().mockResolvedValue({
      id: "lead_1",
      merchantId: merchant.id,
      ...summary,
      createdAt: new Date(),
    });
    const markLeadNotified = vi.fn().mockResolvedValue(undefined);
    const markLeadNotificationError = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockResolvedValue(undefined);

    const lead = await processLeadSummary({
      merchant,
      summary,
      repositories: { createLead, markLeadNotified, markLeadNotificationError },
      notify,
    });

    expect(lead.id).toBe("lead_1");
    expect(createLead).toHaveBeenCalledWith(merchant.id, summary);
    expect(notify).toHaveBeenCalledOnce();
    expect(markLeadNotified).toHaveBeenCalledWith("lead_1", expect.any(Date));
  });
});
