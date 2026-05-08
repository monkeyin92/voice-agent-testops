import type { Industry } from "../domain/merchant";

export type ExampleLanguage = "en" | "zh-CN";

export type ExampleCatalogEntry = {
  title: string;
  industry: Industry;
  industryLabel: string;
  language: ExampleLanguage;
  path: string;
  risks: string;
};

export const exampleCatalog: ExampleCatalogEntry[] = [
  {
    title: "Photo studio launch check",
    industry: "photography",
    industryLabel: "Photography",
    language: "en",
    path: "examples/voice-testops/english-photo-studio-suite.json",
    risks: "pricing facts, unsafe guarantees, lead intent",
  },
  {
    title: "Xiaohongshu receptionist demo",
    industry: "photography",
    industryLabel: "Photography",
    language: "zh-CN",
    path: "examples/voice-testops/xhs-receptionist-suite.json",
    risks: "价格事实、档期确认、手机号留资",
  },
  {
    title: "Chinese pricing risk suite",
    industry: "photography",
    industryLabel: "Photography",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-risk-suite.json",
    risks: "乱报价、过度承诺、转人工意图",
  },
  {
    title: "OpenClaw smoke suite",
    industry: "photography",
    industryLabel: "Photography",
    language: "zh-CN",
    path: "examples/voice-testops/openclaw-suite.json",
    risks: "真实 endpoint 合同、价格护栏",
  },
  {
    title: "Generated transcript regression",
    industry: "photography",
    industryLabel: "Photography",
    language: "en",
    path: "examples/voice-testops/generated-transcript-suite.json",
    risks: "turn extraction, unsafe promise review, lead fields",
  },
  {
    title: "Photo studio multi-turn demo",
    industry: "photography",
    industryLabel: "Photography",
    language: "zh-CN",
    path: "examples/voice-testops/photo-studio-multiturn-suite.json",
    risks: "多轮询价、档期、质量承诺、转人工",
  },
  {
    title: "Expected failing demo",
    industry: "photography",
    industryLabel: "Photography",
    language: "zh-CN",
    path: "examples/voice-testops/failing-demo-suite.json",
    risks: "intentionally red suite for report walkthroughs",
  },
  {
    title: "Dental clinic",
    industry: "dental_clinic",
    industryLabel: "Dental clinic",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-dental-clinic-suite.json",
    risks: "疗效承诺、医生排班、手机号留资",
  },
  {
    title: "Dental clinic",
    industry: "dental_clinic",
    industryLabel: "Dental clinic",
    language: "en",
    path: "examples/voice-testops/english-dental-clinic-suite.json",
    risks: "treatment guarantees, dentist availability, phone capture",
  },
  {
    title: "Restaurant booking",
    industry: "restaurant",
    industryLabel: "Restaurant booking",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-restaurant-booking-suite.json",
    risks: "未确认桌态、低消编造、订位信息",
  },
  {
    title: "Restaurant booking",
    industry: "restaurant",
    industryLabel: "Restaurant booking",
    language: "en",
    path: "examples/voice-testops/english-restaurant-booking-suite.json",
    risks: "unconfirmed tables, minimum-spend claims, booking details",
  },
  {
    title: "Real estate agent",
    industry: "real_estate",
    industryLabel: "Real estate agent",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-real-estate-agent-suite.json",
    risks: "收益承诺、房源状态、看房留资",
  },
  {
    title: "Real estate agent",
    industry: "real_estate",
    industryLabel: "Real estate agent",
    language: "en",
    path: "examples/voice-testops/english-real-estate-agent-suite.json",
    risks: "investment promises, listing status, viewing lead capture",
  },
  {
    title: "Home design service",
    industry: "home_design",
    industryLabel: "Home design",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-home-design-suite.json",
    risks: "报价边界、上门量房、预算地址时间收集、人工转接",
  },
  {
    title: "Insurance regulated service",
    industry: "insurance",
    industryLabel: "Insurance regulated service",
    language: "zh-CN",
    path: "examples/voice-testops/chinese-insurance-regulated-service-suite.json",
    risks: "身份核验、理赔状态、coverage/eligibility、持牌顾问转接",
  },
  {
    title: "Insurance regulated service",
    industry: "insurance",
    industryLabel: "Insurance regulated service",
    language: "en",
    path: "examples/voice-testops/english-insurance-regulated-service-suite.json",
    risks: "identity verification, claim status, coverage eligibility, licensed-agent handoff",
  },
];

export function parseExampleLanguage(value: string): ExampleLanguage {
  if (value === "en") {
    return "en";
  }

  if (value === "zh" || value === "zh-CN") {
    return "zh-CN";
  }

  throw new Error("--lang must be en or zh-CN");
}
