import { NextResponse } from "next/server";
import { notifyFeishuLead } from "@/server/services/notification";

export async function POST() {
  await notifyFeishuLead({
    merchant: {
      id: "demo",
      name: "演示商家",
      slug: "demo",
      industry: "photography",
      address: "上海",
      serviceArea: "上海",
      businessHours: "10:00-18:00",
      contactPhone: "13800000000",
      feishuWebhookUrl: process.env.FEISHU_WEBHOOK_URL,
      packages: [{ name: "演示套餐", priceRange: "599-1299 元", includes: "演示内容", bestFor: "演示客户" }],
      faqs: [],
      bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    lead: {
      id: "lead_demo",
      merchantId: "demo",
      source: "xiaohongshu",
      intent: "booking",
      level: "high",
      customerName: "测试客户",
      phone: "13900000000",
      need: "测试通知",
      questions: ["这是一条测试通知吗"],
      nextAction: "确认飞书机器人收到消息",
      transcript: [],
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
