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
  const [address, setAddress] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [businessHours, setBusinessHours] = useState("10:00-18:00");
  const [contactPhone, setContactPhone] = useState("");
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState("");
  const [packageName, setPackageName] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [packageIncludes, setPackageIncludes] = useState("");
  const [packageBestFor, setPackageBestFor] = useState("");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const slug = makeClientSlug(name);
    const body = {
      name,
      slug,
      industry,
      address,
      serviceArea,
      businessHours,
      contactPhone,
      feishuWebhookUrl: feishuWebhookUrl || undefined,
      packages: [{ name: packageName, priceRange, includes: packageIncludes, bestFor: packageBestFor }],
      faqs: faqQuestion && faqAnswer ? [{ question: faqQuestion, answer: faqAnswer }] : [],
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
      <label>
        地址
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="上海市徐汇区示例路 88 号" />
      </label>
      <label>
        服务范围
        <input value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} placeholder="上海市区" />
      </label>
      <label>
        营业时间
        <input value={businessHours} onChange={(event) => setBusinessHours(event.target.value)} placeholder="10:00-18:00" />
      </label>
      <label>
        联系电话
        <input value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="13800000000" />
      </label>
      <label>
        飞书 Webhook
        <input value={feishuWebhookUrl} onChange={(event) => setFeishuWebhookUrl(event.target.value)} placeholder="可留空" />
      </label>
      <label>
        套餐名称
        <input value={packageName} onChange={(event) => setPackageName(event.target.value)} placeholder="单人写真" />
      </label>
      <label>
        价格区间
        <input value={priceRange} onChange={(event) => setPriceRange(event.target.value)} placeholder="599-1299 元" />
      </label>
      <label>
        套餐包含
        <textarea value={packageIncludes} onChange={(event) => setPackageIncludes(event.target.value)} placeholder="服装 2 套，精修 9 张" />
      </label>
      <label>
        适合人群
        <textarea value={packageBestFor} onChange={(event) => setPackageBestFor(event.target.value)} placeholder="个人形象照和生日写真" />
      </label>
      <label>
        常见问题
        <input value={faqQuestion} onChange={(event) => setFaqQuestion(event.target.value)} placeholder="周末可以拍吗" />
      </label>
      <label>
        常见问题答案
        <textarea value={faqAnswer} onChange={(event) => setFaqAnswer(event.target.value)} placeholder="周末可以拍，需要提前预约档期。" />
      </label>
      <button onClick={submit} type="button">
        创建
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
