import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadVoiceTestSuite } from "@/testops/suiteLoader";

const merchant = {
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
};

describe("loadVoiceTestSuite", () => {
  it("resolves merchantRef paths relative to the suite file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "voice-suite-"));
    await mkdir(path.join(root, "merchants"));
    await writeFile(path.join(root, "merchants/photo-studio.json"), JSON.stringify(merchant), "utf8");
    const suitePath = path.join(root, "suite.json");
    await writeFile(
      suitePath,
      JSON.stringify({
        name: "商家样例引用测试",
        scenarios: [
          {
            id: "pricing",
            title: "客户询价",
            source: "website",
            merchantRef: "merchants/photo-studio.json",
            turns: [{ user: "单人写真多少钱", expect: [{ type: "must_contain_any", phrases: ["599", "1299"] }] }],
          },
        ],
      }),
      "utf8",
    );

    const suite = await loadVoiceTestSuite(suitePath);

    expect(suite.scenarios[0].merchant.name).toBe("光影写真馆");
    expect(suite.scenarios[0]).not.toHaveProperty("merchantRef");
  });

  it("loads the public photo studio multi-turn demo suite", async () => {
    const suite = await loadVoiceTestSuite("examples/voice-testops/photo-studio-multiturn-suite.json");

    expect(suite.name).toContain("写真馆");
    expect(suite.scenarios).toHaveLength(3);
    expect(suite.scenarios.every((scenario) => scenario.merchant.slug === "guangying-photo")).toBe(true);
  });
});
