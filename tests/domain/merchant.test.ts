import { describe, expect, it } from "vitest";
import { makeMerchantSlug, merchantConfigSchema } from "@/domain/merchant";

describe("merchant domain", () => {
  it("accepts a valid photography merchant config", () => {
    const result = merchantConfigSchema.safeParse({
      name: "光影写真馆",
      slug: "guangying-photo",
      industry: "photography",
      address: "上海市徐汇区示例路 88 号",
      serviceArea: "上海市区",
      businessHours: "10:00-21:00",
      contactPhone: "13800000000",
      feishuWebhookUrl: "https://open.feishu.cn/open-apis/bot/v2/hook/demo",
      packages: [
        {
          name: "单人写真",
          priceRange: "599-1299 元",
          includes: "服装 2 套，精修 9 张",
          bestFor: "个人形象照和生日写真",
        },
      ],
      faqs: [
        {
          question: "周末可以拍吗",
          answer: "周末可以拍，需要提前预约档期。",
        },
      ],
      bookingRules: {
        requiresManualConfirm: true,
        requiredFields: ["name", "phone", "preferredTime", "need"],
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts the public example library industries", () => {
    for (const industry of ["dental_clinic", "restaurant", "real_estate"]) {
      const result = merchantConfigSchema.safeParse({
        name: `${industry} demo`,
        slug: `${industry.replace("_", "-")}-demo`,
        industry,
        address: "88 Sample Street",
        serviceArea: "Sample City",
        businessHours: "10:00-21:00",
        contactPhone: "13800000000",
        packages: [
          {
            name: "Starter package",
            priceRange: "$99-$199",
            includes: "Initial consultation",
            bestFor: "new customers",
          },
        ],
        faqs: [{ question: "Can I book today?", answer: "Availability must be confirmed by staff." }],
        bookingRules: {
          requiresManualConfirm: true,
          requiredFields: ["name", "phone"],
        },
      });

      expect(result.success, industry).toBe(true);
    }
  });

  it("rejects a merchant without packages", () => {
    const result = merchantConfigSchema.safeParse({
      name: "空配置商家",
      slug: "empty-shop",
      industry: "photography",
      address: "上海",
      serviceArea: "上海",
      businessHours: "10:00-18:00",
      contactPhone: "13800000000",
      packages: [],
      faqs: [],
      bookingRules: {
        requiresManualConfirm: true,
        requiredFields: ["name", "phone"],
      },
    });

    expect(result.success).toBe(false);
  });

  it("creates a stable slug from Chinese shop names", () => {
    expect(makeMerchantSlug("光影写真馆")).toMatch(/^merchant-[a-f0-9]{8}$/);
  });
});
