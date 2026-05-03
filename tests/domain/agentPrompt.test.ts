import { describe, expect, it } from "vitest";
import { buildReceptionistPrompt } from "@/domain/agentPrompt";
import type { MerchantConfig } from "@/domain/merchant";

const merchant: MerchantConfig = {
  name: "光影写真馆",
  slug: "guangying-photo",
  industry: "photography",
  address: "上海市徐汇区示例路 88 号",
  serviceArea: "上海市区",
  businessHours: "10:00-21:00",
  contactPhone: "13800000000",
  packages: [
    {
      name: "单人写真",
      priceRange: "599-1299 元",
      includes: "服装 2 套，精修 9 张",
      bestFor: "个人形象照和生日写真",
    },
  ],
  faqs: [{ question: "周末可以拍吗", answer: "周末可以拍，需要提前预约档期。" }],
  bookingRules: {
    requiresManualConfirm: true,
    requiredFields: ["name", "phone", "preferredTime", "need"],
  },
};

describe("buildReceptionistPrompt", () => {
  it("includes merchant facts and anti-hallucination rules", () => {
    const prompt = buildReceptionistPrompt(merchant);

    expect(prompt).toContain("光影写真馆");
    expect(prompt).toContain("单人写真");
    expect(prompt).toContain("不得编造价格、档期、优惠或服务承诺");
    expect(prompt).toContain("输出 JSON");
  });
});
