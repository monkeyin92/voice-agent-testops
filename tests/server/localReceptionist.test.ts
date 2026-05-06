import { describe, expect, it } from "vitest";
import type { Merchant } from "@/domain/merchant";
import { respondWithLocalReceptionist } from "@/server/services/localReceptionist";

const merchant: Merchant = {
  id: "merchant_1",
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [{ name: "单人写真", priceRange: "599-1299 元", includes: "服装 2 套，精修 9 张", bestFor: "个人写真" }],
  faqs: [{ question: "周末可以拍吗", answer: "周末可以拍，需要提前预约档期。" }],
  bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone"] },
  createdAt: new Date("2026-05-03T00:00:00.000Z"),
  updatedAt: new Date("2026-05-03T00:00:00.000Z"),
};

describe("respondWithLocalReceptionist", () => {
  it("answers pricing with configured package facts", async () => {
    const response = await respondWithLocalReceptionist({
      merchant,
      source: "xiaohongshu",
      messages: [{ role: "customer", text: "写真多少钱", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(response.spoken).toContain("599-1299 元");
    expect(response.summary.intent).toBe("pricing");
    expect(response.summary.level).toBe("medium");
  });

  it("routes handoff requests to a human follow-up", async () => {
    const response = await respondWithLocalReceptionist({
      merchant,
      source: "website",
      messages: [{ role: "customer", text: "你别说了，我要找真人客服", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(response.spoken).toContain("人工");
    expect(response.summary.intent).toBe("handoff");
  });

  it("asks for contact details when a customer asks for a concrete appointment time", async () => {
    const response = await respondWithLocalReceptionist({
      merchant,
      source: "xiaohongshu",
      messages: [{ role: "customer", text: "我想约这周日拍单人写真，预算一千左右", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(response.spoken).toMatch(/电话|手机号|联系方式/);
    expect(response.summary.intent).toBe("availability");
  });

  it("extracts contact fields from customer messages for handoff follow-up", async () => {
    const response = await respondWithLocalReceptionist({
      merchant,
      source: "website",
      messages: [{ role: "customer", text: "我叫小林，电话 13800001111，想约周日拍", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(response.summary.customerName).toBe("小林");
    expect(response.summary.phone).toBe("13800001111");
    expect(response.summary.preferredTime).toBe("周日");
    expect(response.summary.intent).toBe("availability");
    expect(response.summary.level).toBe("high");
  });
});
