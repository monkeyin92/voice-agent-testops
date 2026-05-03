"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function makeClientSlug(name: string): string {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || `merchant-${Date.now().toString(36)}`;
}

export function MerchantForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<"photography" | "home_design">("photography");
  const [message, setMessage] = useState("");

  async function submit() {
    const slug = makeClientSlug(name);
    const body = {
      name,
      slug,
      industry,
      address: "请补充地址",
      serviceArea: "请补充服务范围",
      businessHours: "10:00-18:00",
      contactPhone: "13800000000",
      packages: [{ name: "基础套餐", priceRange: "请补充价格", includes: "请补充包含内容", bestFor: "请补充适合人群" }],
      faqs: [{ question: "如何预约", answer: "留下联系方式后，商家会确认时间。" }],
      bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone", "need"] },
    };

    const response = await fetch("/api/merchants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as { merchant?: { slug: string } };
    if (response.ok && data.merchant) {
      setMessage(`已创建商家链接：/m/${data.merchant.slug}`);
      router.refresh();
    } else {
      setMessage("创建失败，请检查配置。");
    }
  }

  return (
    <section className="admin-card">
      <h2>创建商家</h2>
      <label>
        商家名称
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        行业模板
        <select value={industry} onChange={(event) => setIndustry(event.target.value as "photography" | "home_design")}>
          <option value="photography">摄影写真</option>
          <option value="home_design">家装设计</option>
        </select>
      </label>
      <button onClick={submit} type="button">
        创建
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
