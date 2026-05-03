# 小红书商家 AI 语音接待员 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a commercial MVP for a content-platform lead to AI voice reception flow: merchant setup, public voice consultation page, OpenClaw automation adapter, lead summary, Feishu notification, and a lightweight admin console.

**Architecture:** A Next.js TypeScript app owns merchant setup, public consultation pages, API routes, lead persistence, and admin UI. Voice and OpenClaw are behind adapters so the first shippable product can run with a local provider in development and switch to production providers through environment variables. PostgreSQL is the production persistence layer; tests use repository fakes to keep domain logic fast.

**Tech Stack:** Next.js, TypeScript, Zod, Prisma, PostgreSQL, Redis-compatible queue interface, Vitest, OpenClaw HTTP adapter, Feishu webhook.

---

## Source Spec

- Spec: `docs/superpowers/specs/2026-05-03-xhs-ai-voice-receptionist-design.md`
- Repo root: `/Users/monkeyin/projects/voiceAI`

## File Structure

Create this structure:

```text
package.json
tsconfig.json
next.config.mjs
vitest.config.ts
.env.example
prisma/schema.prisma
src/app/page.tsx
src/app/layout.tsx
src/app/admin/page.tsx
src/app/admin/merchants/[merchantId]/page.tsx
src/app/m/[slug]/page.tsx
src/app/api/merchants/route.ts
src/app/api/merchants/[merchantId]/route.ts
src/app/api/leads/route.ts
src/app/api/leads/[leadId]/route.ts
src/app/api/notify/feishu/test/route.ts
src/components/admin/MerchantForm.tsx
src/components/admin/LeadTable.tsx
src/components/consult/ConsultationClient.tsx
src/components/consult/VoiceButton.tsx
src/domain/merchant.ts
src/domain/lead.ts
src/domain/templates.ts
src/domain/agentPrompt.ts
src/server/db/prisma.ts
src/server/repositories/merchantRepository.ts
src/server/repositories/leadRepository.ts
src/server/services/leadWorkflow.ts
src/server/services/notification.ts
src/server/services/agentAdapter.ts
src/server/services/localReceptionist.ts
src/server/services/evaluation.ts
src/styles/globals.css
tests/domain/merchant.test.ts
tests/domain/agentPrompt.test.ts
tests/server/leadWorkflow.test.ts
tests/server/localReceptionist.test.ts
tests/server/evaluation.test.ts
docs/ops/local-runbook.md
```

Boundaries:

- `src/domain/*` contains pure types, schema validation, industry templates, and prompt building.
- `src/server/repositories/*` isolates persistence. UI and services do not call Prisma directly.
- `src/server/services/agentAdapter.ts` is the OpenClaw integration boundary.
- `src/server/services/localReceptionist.ts` is a deterministic fallback for demos and tests.
- `src/server/services/leadWorkflow.ts` owns lead creation, summary validation, notification dispatch, and usage accounting.
- `src/components/consult/*` owns the public customer consultation experience.
- `src/components/admin/*` owns merchant setup and lead review.

## Task 1: Project Scaffold and Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/styles/globals.css`

- [ ] **Step 1: Create package manifest**

Create `package.json`:

```json
{
  "name": "xhs-ai-voice-receptionist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "6.19.3",
    "ioredis": "latest",
    "next": "latest",
    "react": "latest",
    "react-dom": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "prisma": "6.19.3",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Create TypeScript and Next config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

Create `next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
};

export default nextConfig;
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
```

- [ ] **Step 4: Create environment example**

Create `.env.example`:

```env
DATABASE_URL="postgresql://voiceai:voiceai@localhost:5432/voiceai"
OPENCLAW_AGENT_URL="http://localhost:3008/agents/receptionist/respond"
OPENCLAW_API_KEY="replace-with-openclaw-token"
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/replace-me"
PUBLIC_APP_URL="http://localhost:3000"
AGENT_MODE="local"
```

- [ ] **Step 5: Create global CSS**

Create `src/styles/globals.css`:

```css
:root {
  color-scheme: light;
  --ink: #1d1d1f;
  --muted: #686868;
  --line: #dad8d0;
  --paper: #fbfaf6;
  --surface: #ffffff;
  --accent: #0e6b5d;
  --accent-strong: #07463d;
  --danger: #b3261e;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--ink);
  background: var(--paper);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

a {
  color: inherit;
}

button,
input,
textarea,
select {
  font: inherit;
}
```

- [ ] **Step 6: Create root layout**

Create `src/app/layout.tsx`:

```tsx
import "@/styles/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "小红书商家 AI 语音接待员",
  description: "把内容平台来的咨询接成可跟进的预约线索。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and install exits with code 0.

- [ ] **Step 8: Run empty tests**

Run:

```bash
npm test
```

Expected: Vitest exits successfully if no tests exist, or reports no test files. If Vitest exits with a no-test error, continue after Task 2 adds tests.

- [ ] **Step 9: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs vitest.config.ts .env.example src/app/layout.tsx src/styles/globals.css
git commit -m "chore: scaffold AI voice receptionist app"
```

Expected: commit succeeds.

## Task 2: Domain Models and Validation

**Files:**
- Create: `src/domain/merchant.ts`
- Create: `src/domain/lead.ts`
- Test: `tests/domain/merchant.test.ts`

- [ ] **Step 1: Write merchant validation tests**

Create `tests/domain/merchant.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { merchantConfigSchema, makeMerchantSlug } from "@/domain/merchant";

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
```

- [ ] **Step 2: Run failing domain tests**

Run:

```bash
npm test -- tests/domain/merchant.test.ts
```

Expected: FAIL because `src/domain/merchant.ts` does not exist.

- [ ] **Step 3: Implement merchant domain**

Create `src/domain/merchant.ts`:

```ts
import { createHash } from "node:crypto";
import { z } from "zod";

export const industrySchema = z.enum(["photography", "home_design"]);
export type Industry = z.infer<typeof industrySchema>;

export const merchantPackageSchema = z.object({
  name: z.string().min(1),
  priceRange: z.string().min(1),
  includes: z.string().min(1),
  bestFor: z.string().min(1),
});

export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const bookingRulesSchema = z.object({
  requiresManualConfirm: z.boolean(),
  requiredFields: z.array(z.enum(["name", "phone", "preferredTime", "need", "budget", "location"])).min(2),
});

export const merchantConfigSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  industry: industrySchema,
  address: z.string().min(1),
  serviceArea: z.string().min(1),
  businessHours: z.string().min(1),
  contactPhone: z.string().min(6),
  feishuWebhookUrl: z.string().url().optional(),
  packages: z.array(merchantPackageSchema).min(1),
  faqs: z.array(faqSchema),
  bookingRules: bookingRulesSchema,
});

export type MerchantConfig = z.infer<typeof merchantConfigSchema>;

export type Merchant = MerchantConfig & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export function makeMerchantSlug(name: string): string {
  const digest = createHash("sha256").update(name).digest("hex").slice(0, 8);
  return `merchant-${digest}`;
}
```

- [ ] **Step 4: Implement lead domain**

Create `src/domain/lead.ts`:

```ts
import { z } from "zod";

export const leadSourceSchema = z.enum(["xiaohongshu", "douyin", "wechat", "website", "unknown"]);
export type LeadSource = z.infer<typeof leadSourceSchema>;

export const leadIntentSchema = z.enum(["pricing", "availability", "booking", "service_info", "handoff", "other"]);
export type LeadIntent = z.infer<typeof leadIntentSchema>;

export const leadLevelSchema = z.enum(["high", "medium", "low"]);
export type LeadLevel = z.infer<typeof leadLevelSchema>;

export const leadSummarySchema = z.object({
  customerName: z.string().optional(),
  phone: z.string().optional(),
  source: leadSourceSchema,
  intent: leadIntentSchema,
  need: z.string().min(1),
  budget: z.string().optional(),
  preferredTime: z.string().optional(),
  location: z.string().optional(),
  questions: z.array(z.string()),
  level: leadLevelSchema,
  nextAction: z.string().min(1),
  transcript: z.array(
    z.object({
      role: z.enum(["customer", "assistant"]),
      text: z.string().min(1),
      at: z.string().datetime(),
    }),
  ),
});

export type LeadSummary = z.infer<typeof leadSummarySchema>;

export type Lead = LeadSummary & {
  id: string;
  merchantId: string;
  createdAt: Date;
  notifiedAt?: Date;
  notificationError?: string;
};
```

- [ ] **Step 5: Run domain tests**

Run:

```bash
npm test -- tests/domain/merchant.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit domain models**

Run:

```bash
git add src/domain/merchant.ts src/domain/lead.ts tests/domain/merchant.test.ts
git commit -m "feat: add merchant and lead domain models"
```

Expected: commit succeeds.

## Task 3: Industry Templates and Prompt Builder

**Files:**
- Create: `src/domain/templates.ts`
- Create: `src/domain/agentPrompt.ts`
- Test: `tests/domain/agentPrompt.test.ts`

- [ ] **Step 1: Write prompt tests**

Create `tests/domain/agentPrompt.test.ts`:

```ts
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
```

- [ ] **Step 2: Run failing prompt test**

Run:

```bash
npm test -- tests/domain/agentPrompt.test.ts
```

Expected: FAIL because `src/domain/agentPrompt.ts` does not exist.

- [ ] **Step 3: Add industry templates**

Create `src/domain/templates.ts`:

```ts
import type { Industry } from "./merchant";

export type IndustryTemplate = {
  industry: Industry;
  displayName: string;
  openingLine: string;
  requiredQuestions: string[];
  sensitiveRules: string[];
};

export const industryTemplates: Record<Industry, IndustryTemplate> = {
  photography: {
    industry: "photography",
    displayName: "摄影写真",
    openingLine: "你好，我是店里的 AI 接待助手。可以先告诉我你想拍什么类型的照片吗？",
    requiredQuestions: ["拍摄类型", "人数", "期望时间", "预算范围", "联系方式"],
    sensitiveRules: ["未确认档期前不得承诺具体拍摄时间", "未配置套餐外不得承诺赠品", "价格只按商家配置的区间说明"],
  },
  home_design: {
    industry: "home_design",
    displayName: "家装设计",
    openingLine: "你好，我是设计工作室的 AI 接待助手。可以先说一下房屋面积和装修需求吗？",
    requiredQuestions: ["房屋城市和区域", "面积", "装修类型", "预算范围", "计划开工时间", "联系方式"],
    sensitiveRules: ["未量房前不得承诺最终报价", "不承诺施工周期", "不评价未合作施工方"],
  },
};
```

- [ ] **Step 4: Add prompt builder**

Create `src/domain/agentPrompt.ts`:

```ts
import { industryTemplates } from "./templates";
import type { MerchantConfig } from "./merchant";

export function buildReceptionistPrompt(merchant: MerchantConfig): string {
  const template = industryTemplates[merchant.industry];
  const packages = merchant.packages
    .map((item) => `- ${item.name}：${item.priceRange}；包含：${item.includes}；适合：${item.bestFor}`)
    .join("\n");
  const faqs = merchant.faqs.map((faq) => `- Q：${faq.question}\n  A：${faq.answer}`).join("\n");

  return [
    `你是 ${merchant.name} 的 AI 语音接待助手。`,
    `行业：${template.displayName}`,
    `地址：${merchant.address}`,
    `服务范围：${merchant.serviceArea}`,
    `营业时间：${merchant.businessHours}`,
    "",
    "服务套餐：",
    packages,
    "",
    "常见问题：",
    faqs || "- 暂无额外 FAQ，只能根据商家资料回答。",
    "",
    "接待流程：",
    ...template.requiredQuestions.map((question, index) => `${index + 1}. 问清${question}`),
    "",
    "安全规则：",
    "- 不得编造价格、档期、优惠或服务承诺。",
    "- 商家资料没有的信息，必须说需要商家确认。",
    "- 语音回复要短，每次只问一个问题。",
    ...template.sensitiveRules.map((rule) => `- ${rule}`),
    "",
    "最后必须输出 JSON，字段为 customerName, phone, source, intent, need, budget, preferredTime, location, questions, level, nextAction。",
  ].join("\n");
}
```

- [ ] **Step 5: Run prompt tests**

Run:

```bash
npm test -- tests/domain/agentPrompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit templates**

Run:

```bash
git add src/domain/templates.ts src/domain/agentPrompt.ts tests/domain/agentPrompt.test.ts
git commit -m "feat: add industry templates and prompt builder"
```

Expected: commit succeeds.

## Task 4: Persistence Schema and Repositories

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/server/db/prisma.ts`
- Create: `src/server/repositories/merchantRepository.ts`
- Create: `src/server/repositories/leadRepository.ts`

- [ ] **Step 1: Add Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Merchant {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  industry        String
  address         String
  serviceArea     String
  businessHours   String
  contactPhone    String
  feishuWebhookUrl String?
  packagesJson    Json
  faqsJson        Json
  bookingRulesJson Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  leads           Lead[]
}

model Lead {
  id                 String   @id @default(cuid())
  merchantId         String
  source             String
  intent             String
  level              String
  customerName       String?
  phone              String?
  need               String
  budget             String?
  preferredTime      String?
  location           String?
  questionsJson      Json
  transcriptJson     Json
  nextAction         String
  notifiedAt         DateTime?
  notificationError  String?
  createdAt          DateTime @default(now())
  merchant           Merchant @relation(fields: [merchantId], references: [id])
}
```

- [ ] **Step 2: Add Prisma client singleton**

Create `src/server/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Add merchant repository**

Create `src/server/repositories/merchantRepository.ts`:

```ts
import { prisma } from "@/server/db/prisma";
import { merchantConfigSchema, type Merchant, type MerchantConfig } from "@/domain/merchant";

export async function createMerchant(config: MerchantConfig): Promise<Merchant> {
  const parsed = merchantConfigSchema.parse(config);
  const row = await prisma.merchant.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      industry: parsed.industry,
      address: parsed.address,
      serviceArea: parsed.serviceArea,
      businessHours: parsed.businessHours,
      contactPhone: parsed.contactPhone,
      feishuWebhookUrl: parsed.feishuWebhookUrl,
      packagesJson: parsed.packages,
      faqsJson: parsed.faqs,
      bookingRulesJson: parsed.bookingRules,
    },
  });

  return mapMerchant(row);
}

export async function listMerchants(): Promise<Merchant[]> {
  const rows = await prisma.merchant.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapMerchant);
}

export async function findMerchantBySlug(slug: string): Promise<Merchant | null> {
  const row = await prisma.merchant.findUnique({ where: { slug } });
  return row ? mapMerchant(row) : null;
}

export async function findMerchantById(id: string): Promise<Merchant | null> {
  const row = await prisma.merchant.findUnique({ where: { id } });
  return row ? mapMerchant(row) : null;
}

function mapMerchant(row: {
  id: string;
  name: string;
  slug: string;
  industry: string;
  address: string;
  serviceArea: string;
  businessHours: string;
  contactPhone: string;
  feishuWebhookUrl: string | null;
  packagesJson: unknown;
  faqsJson: unknown;
  bookingRulesJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}): Merchant {
  const config = merchantConfigSchema.parse({
    name: row.name,
    slug: row.slug,
    industry: row.industry,
    address: row.address,
    serviceArea: row.serviceArea,
    businessHours: row.businessHours,
    contactPhone: row.contactPhone,
    feishuWebhookUrl: row.feishuWebhookUrl ?? undefined,
    packages: row.packagesJson,
    faqs: row.faqsJson,
    bookingRules: row.bookingRulesJson,
  });

  return {
    id: row.id,
    ...config,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 4: Add lead repository**

Create `src/server/repositories/leadRepository.ts`:

```ts
import { prisma } from "@/server/db/prisma";
import { leadSummarySchema, type Lead, type LeadSummary } from "@/domain/lead";

export async function createLead(merchantId: string, summary: LeadSummary): Promise<Lead> {
  const parsed = leadSummarySchema.parse(summary);
  const row = await prisma.lead.create({
    data: {
      merchantId,
      source: parsed.source,
      intent: parsed.intent,
      level: parsed.level,
      customerName: parsed.customerName,
      phone: parsed.phone,
      need: parsed.need,
      budget: parsed.budget,
      preferredTime: parsed.preferredTime,
      location: parsed.location,
      questionsJson: parsed.questions,
      transcriptJson: parsed.transcript,
      nextAction: parsed.nextAction,
    },
  });

  return mapLead(row);
}

export async function listLeadsByMerchant(merchantId: string): Promise<Lead[]> {
  const rows = await prisma.lead.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapLead);
}

export async function findLeadById(id: string): Promise<Lead | null> {
  const row = await prisma.lead.findUnique({ where: { id } });
  return row ? mapLead(row) : null;
}

export async function markLeadNotified(id: string, notifiedAt: Date): Promise<void> {
  await prisma.lead.update({
    where: { id },
    data: { notifiedAt, notificationError: null },
  });
}

export async function markLeadNotificationError(id: string, notificationError: string): Promise<void> {
  await prisma.lead.update({
    where: { id },
    data: { notificationError },
  });
}

function mapLead(row: {
  id: string;
  merchantId: string;
  source: string;
  intent: string;
  level: string;
  customerName: string | null;
  phone: string | null;
  need: string;
  budget: string | null;
  preferredTime: string | null;
  location: string | null;
  questionsJson: unknown;
  transcriptJson: unknown;
  nextAction: string;
  notifiedAt: Date | null;
  notificationError: string | null;
  createdAt: Date;
}): Lead {
  const summary = leadSummarySchema.parse({
    source: row.source,
    intent: row.intent,
    level: row.level,
    customerName: row.customerName ?? undefined,
    phone: row.phone ?? undefined,
    need: row.need,
    budget: row.budget ?? undefined,
    preferredTime: row.preferredTime ?? undefined,
    location: row.location ?? undefined,
    questions: row.questionsJson,
    transcript: row.transcriptJson,
    nextAction: row.nextAction,
  });

  return {
    id: row.id,
    merchantId: row.merchantId,
    ...summary,
    createdAt: row.createdAt,
    notifiedAt: row.notifiedAt ?? undefined,
    notificationError: row.notificationError ?? undefined,
  };
}
```

- [ ] **Step 5: Generate Prisma client**

Run:

```bash
npm run prisma:generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 6: Commit persistence layer**

Run:

```bash
git add prisma/schema.prisma src/server/db/prisma.ts src/server/repositories/merchantRepository.ts src/server/repositories/leadRepository.ts
git commit -m "feat: add persistence schema and repositories"
```

Expected: commit succeeds.

## Task 5: Lead Workflow and Feishu Notification

**Files:**
- Create: `src/server/services/notification.ts`
- Create: `src/server/services/leadWorkflow.ts`
- Test: `tests/server/leadWorkflow.test.ts`

- [ ] **Step 1: Write lead workflow tests**

Create `tests/server/leadWorkflow.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { processLeadSummary } from "@/server/services/leadWorkflow";
import type { Merchant } from "@/domain/merchant";
import type { LeadSummary } from "@/domain/lead";

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
    const createLead = vi.fn().mockResolvedValue({ id: "lead_1", merchantId: merchant.id, ...summary, createdAt: new Date() });
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
```

- [ ] **Step 2: Run failing lead workflow tests**

Run:

```bash
npm test -- tests/server/leadWorkflow.test.ts
```

Expected: FAIL because `leadWorkflow.ts` does not exist.

- [ ] **Step 3: Add notification service**

Create `src/server/services/notification.ts`:

```ts
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
```

- [ ] **Step 4: Add lead workflow service**

Create `src/server/services/leadWorkflow.ts`:

```ts
import { leadSummarySchema, type Lead, type LeadSummary } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";
import { createLead, markLeadNotified, markLeadNotificationError } from "@/server/repositories/leadRepository";
import { notifyFeishuLead } from "@/server/services/notification";

type LeadRepositories = {
  createLead: typeof createLead;
  markLeadNotified: typeof markLeadNotified;
  markLeadNotificationError: typeof markLeadNotificationError;
};

export type ProcessLeadSummaryInput = {
  merchant: Merchant;
  summary: LeadSummary;
  repositories?: LeadRepositories;
  notify?: (input: { merchant: Merchant; lead: Lead }) => Promise<void>;
};

export async function processLeadSummary({
  merchant,
  summary,
  repositories = { createLead, markLeadNotified, markLeadNotificationError },
  notify = notifyFeishuLead,
}: ProcessLeadSummaryInput): Promise<Lead> {
  const parsed = leadSummarySchema.parse(summary);
  const lead = await repositories.createLead(merchant.id, parsed);

  try {
    await notify({ merchant, lead });
    await repositories.markLeadNotified(lead.id, new Date());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification error";
    await repositories.markLeadNotificationError(lead.id, message);
  }

  return lead;
}
```

- [ ] **Step 5: Run workflow tests**

Run:

```bash
npm test -- tests/server/leadWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit workflow**

Run:

```bash
git add src/server/services/notification.ts src/server/services/leadWorkflow.ts tests/server/leadWorkflow.test.ts
git commit -m "feat: add lead workflow and Feishu notification"
```

Expected: commit succeeds.

## Task 6: OpenClaw Adapter and Local Receptionist

**Files:**
- Create: `src/server/services/agentAdapter.ts`
- Create: `src/server/services/localReceptionist.ts`
- Test: `tests/server/localReceptionist.test.ts`

- [ ] **Step 1: Write local receptionist tests**

Create `tests/server/localReceptionist.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { respondWithLocalReceptionist } from "@/server/services/localReceptionist";
import type { Merchant } from "@/domain/merchant";

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
});
```

- [ ] **Step 2: Run failing local receptionist test**

Run:

```bash
npm test -- tests/server/localReceptionist.test.ts
```

Expected: FAIL because `localReceptionist.ts` does not exist.

- [ ] **Step 3: Add agent adapter**

Create `src/server/services/agentAdapter.ts`:

```ts
import { buildReceptionistPrompt } from "@/domain/agentPrompt";
import type { LeadSource, LeadSummary } from "@/domain/lead";
import type { Merchant } from "@/domain/merchant";
import { respondWithLocalReceptionist } from "@/server/services/localReceptionist";

export type ConversationMessage = {
  role: "customer" | "assistant";
  text: string;
  at: string;
};

export type AgentRequest = {
  merchant: Merchant;
  source: LeadSource;
  messages: ConversationMessage[];
};

export type AgentResponse = {
  spoken: string;
  summary: LeadSummary;
};

export async function requestReceptionistResponse(input: AgentRequest): Promise<AgentResponse> {
  if (process.env.AGENT_MODE !== "openclaw") {
    return respondWithLocalReceptionist(input);
  }

  const url = process.env.OPENCLAW_AGENT_URL;
  if (!url) {
    throw new Error("OPENCLAW_AGENT_URL is required when AGENT_MODE=openclaw");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENCLAW_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      prompt: buildReceptionistPrompt(input.merchant),
      merchant: input.merchant,
      source: input.source,
      messages: input.messages,
      outputContract: {
        spoken: "short customer-facing speech",
        summary: "LeadSummary JSON",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenClaw agent failed: ${response.status}`);
  }

  return (await response.json()) as AgentResponse;
}
```

- [ ] **Step 4: Add local receptionist**

Create `src/server/services/localReceptionist.ts`:

```ts
import type { AgentRequest, AgentResponse } from "./agentAdapter";

export async function respondWithLocalReceptionist(input: AgentRequest): Promise<AgentResponse> {
  const lastMessage = input.messages[input.messages.length - 1]?.text ?? "";
  const firstPackage = input.merchant.packages[0];
  const now = new Date().toISOString();
  const asksPrice = /价格|多少钱|费用|报价/.test(lastMessage);
  const asksTime = /档期|时间|周末|预约/.test(lastMessage);

  const spoken = asksPrice
    ? `${firstPackage.name}一般是 ${firstPackage.priceRange}，包含${firstPackage.includes}。你方便留个称呼和电话吗？`
    : asksTime
      ? `档期需要商家确认。我先记录你的期望时间，方便老板尽快联系你。`
      : `我先帮你记录需求。你想咨询${input.merchant.name}的哪项服务？`;

  return {
    spoken,
    summary: {
      source: input.source,
      intent: asksPrice ? "pricing" : asksTime ? "availability" : "service_info",
      need: lastMessage || "客户开始咨询",
      questions: lastMessage ? [lastMessage] : [],
      level: asksPrice || asksTime ? "medium" : "low",
      nextAction: "请老板确认客户需求并继续跟进",
      transcript: [
        ...input.messages,
        { role: "assistant", text: spoken, at: now },
      ],
    },
  };
}
```

- [ ] **Step 5: Run local receptionist tests**

Run:

```bash
npm test -- tests/server/localReceptionist.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit agent adapter**

Run:

```bash
git add src/server/services/agentAdapter.ts src/server/services/localReceptionist.ts tests/server/localReceptionist.test.ts
git commit -m "feat: add OpenClaw adapter and local receptionist"
```

Expected: commit succeeds.

## Task 7: API Routes

**Files:**
- Create: `src/app/api/merchants/route.ts`
- Create: `src/app/api/merchants/[merchantId]/route.ts`
- Create: `src/app/api/leads/route.ts`
- Create: `src/app/api/leads/[leadId]/route.ts`
- Create: `src/app/api/notify/feishu/test/route.ts`

- [ ] **Step 1: Add merchants list/create API**

Create `src/app/api/merchants/route.ts`:

```ts
import { NextResponse } from "next/server";
import { merchantConfigSchema } from "@/domain/merchant";
import { createMerchant, listMerchants } from "@/server/repositories/merchantRepository";

export async function GET() {
  const merchants = await listMerchants();
  return NextResponse.json({ merchants });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = merchantConfigSchema.parse(body);
  const merchant = await createMerchant(parsed);
  return NextResponse.json({ merchant }, { status: 201 });
}
```

- [ ] **Step 2: Add merchant detail API**

Create `src/app/api/merchants/[merchantId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { findMerchantById } from "@/server/repositories/merchantRepository";

export async function GET(_request: Request, context: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await context.params;
  const merchant = await findMerchantById(merchantId);

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  return NextResponse.json({ merchant });
}
```

- [ ] **Step 3: Add lead create API**

Create `src/app/api/leads/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { leadSourceSchema } from "@/domain/lead";
import { findMerchantById } from "@/server/repositories/merchantRepository";
import { requestReceptionistResponse } from "@/server/services/agentAdapter";
import { processLeadSummary } from "@/server/services/leadWorkflow";

const leadRequestSchema = z.object({
  merchantId: z.string().min(1),
  source: leadSourceSchema.default("unknown"),
  messages: z.array(
    z.object({
      role: z.enum(["customer", "assistant"]),
      text: z.string().min(1),
      at: z.string().datetime(),
    }),
  ).min(1),
});

export async function POST(request: Request) {
  const body = leadRequestSchema.parse(await request.json());
  const merchant = await findMerchantById(body.merchantId);

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const agentResponse = await requestReceptionistResponse({
    merchant,
    source: body.source,
    messages: body.messages,
  });
  const lead = await processLeadSummary({ merchant, summary: agentResponse.summary });

  return NextResponse.json({ spoken: agentResponse.spoken, lead }, { status: 201 });
}
```

- [ ] **Step 4: Add lead detail API**

Create `src/app/api/leads/[leadId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { findLeadById } from "@/server/repositories/leadRepository";

export async function GET(_request: Request, context: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await context.params;
  const lead = await findLeadById(leadId);

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}
```

- [ ] **Step 5: Add Feishu notification test API**

Create `src/app/api/notify/feishu/test/route.ts`:

```ts
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
```

- [ ] **Step 6: Run build type check**

Run:

```bash
npm run build
```

Expected: build succeeds or fails only because pages are not created. If pages are missing, complete Task 8 before re-running build.

- [ ] **Step 7: Commit API routes**

Run:

```bash
git add src/app/api/merchants/route.ts src/app/api/merchants/[merchantId]/route.ts src/app/api/leads/route.ts src/app/api/leads/[leadId]/route.ts src/app/api/notify/feishu/test/route.ts
git commit -m "feat: add merchant lead and notification APIs"
```

Expected: commit succeeds.

## Task 8: Public Consultation Page

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/m/[slug]/page.tsx`
- Create: `src/components/consult/ConsultationClient.tsx`
- Create: `src/components/consult/VoiceButton.tsx`

- [ ] **Step 1: Add landing redirect page**

Create `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">小红书商家 AI 语音接待员</p>
        <h1>把内容平台来的咨询，接成可跟进的预约线索。</h1>
        <p>客户打开商家链接，直接语音咨询；系统问清需求、生成摘要，并通知老板跟进。</p>
        <Link href="/admin" className="primary-link">进入后台</Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add merchant consultation page**

Create `src/app/m/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { findMerchantBySlug } from "@/server/repositories/merchantRepository";
import { ConsultationClient } from "@/components/consult/ConsultationClient";

export default async function MerchantConsultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const merchant = await findMerchantBySlug(slug);

  if (!merchant) {
    notFound();
  }

  return <ConsultationClient merchant={merchant} />;
}
```

- [ ] **Step 3: Add voice button component**

Create `src/components/consult/VoiceButton.tsx`:

```tsx
"use client";

type VoiceButtonProps = {
  disabled?: boolean;
  onTranscript: (text: string) => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }
}

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
};

export function VoiceButton({ disabled, onTranscript }: VoiceButtonProps) {
  function startRecognition() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      alert("当前浏览器不支持语音识别，请先使用文字输入。");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };
    recognition.start();
  }

  return (
    <button className="voice-button" disabled={disabled} onClick={startRecognition} type="button">
      按住说需求
    </button>
  );
}
```

- [ ] **Step 4: Add consultation client**

Create `src/components/consult/ConsultationClient.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { Merchant } from "@/domain/merchant";
import { VoiceButton } from "./VoiceButton";

type ChatMessage = {
  role: "customer" | "assistant";
  text: string;
  at: string;
};

export function ConsultationClient({ merchant }: { merchant: Merchant }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const source = useMemo(() => {
    if (typeof window === "undefined") return "unknown";
    const value = new URLSearchParams(window.location.search).get("source");
    return value ?? "unknown";
  }, []);

  async function submitCustomerText(value: string) {
    const clean = value.trim();
    if (!clean) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "customer", text: clean, at: new Date().toISOString() }];
    setMessages(nextMessages);
    setText("");
    setLoading(true);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ merchantId: merchant.id, source, messages: nextMessages }),
    });
    const data = await response.json();

    if (response.ok) {
      const assistantMessage: ChatMessage = { role: "assistant", text: data.spoken, at: new Date().toISOString() };
      setMessages([...nextMessages, assistantMessage]);
      setLeadId(data.lead.id);
      window.speechSynthesis?.speak(new SpeechSynthesisUtterance(data.spoken));
    } else {
      setMessages([...nextMessages, { role: "assistant", text: "语音接待暂时繁忙，请留下电话，商家会尽快联系你。", at: new Date().toISOString() }]);
    }

    setLoading(false);
  }

  return (
    <main className="consult-page">
      <section className="merchant-header">
        <p className="eyebrow">{merchant.industry === "photography" ? "摄影写真咨询" : "家装设计咨询"}</p>
        <h1>{merchant.name}</h1>
        <p>{merchant.address} · {merchant.businessHours}</p>
      </section>

      <section className="chat-panel">
        {messages.length === 0 ? (
          <p className="empty-state">点击语音按钮，或直接输入你想咨询的问题。</p>
        ) : (
          messages.map((message, index) => (
            <div className={`bubble ${message.role}`} key={`${message.at}-${index}`}>
              {message.text}
            </div>
          ))
        )}
      </section>

      <form
        className="input-row"
        onSubmit={(event) => {
          event.preventDefault();
          void submitCustomerText(text);
        }}
      >
        <VoiceButton disabled={loading} onTranscript={(transcript) => void submitCustomerText(transcript)} />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="也可以输入文字咨询" />
        <button disabled={loading} type="submit">发送</button>
      </form>

      {leadId ? <p className="lead-done">已生成咨询记录，商家会根据摘要跟进。</p> : null}
    </main>
  );
}
```

- [ ] **Step 5: Extend CSS for public pages**

Append to `src/styles/globals.css`:

```css
.page-shell,
.consult-page {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 48px 0;
}

.hero,
.merchant-header,
.chat-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--accent);
  font-weight: 700;
}

.primary-link,
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: var(--accent);
  color: white;
  min-height: 40px;
  padding: 0 16px;
  text-decoration: none;
  cursor: pointer;
}

.chat-panel {
  min-height: 320px;
  margin: 16px 0;
}

.empty-state {
  color: var(--muted);
}

.bubble {
  max-width: 76%;
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: 8px;
  line-height: 1.6;
}

.bubble.customer {
  margin-left: auto;
  background: #e8f3ef;
}

.bubble.assistant {
  background: #f0eee7;
}

.input-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
}

.input-row input {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0 12px;
}

.lead-done {
  color: var(--accent-strong);
  font-weight: 700;
}
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit public consultation page**

Run:

```bash
git add src/app/page.tsx src/app/m/[slug]/page.tsx src/components/consult/ConsultationClient.tsx src/components/consult/VoiceButton.tsx src/styles/globals.css
git commit -m "feat: add public voice consultation page"
```

Expected: commit succeeds.

## Task 9: Admin Console

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/merchants/[merchantId]/page.tsx`
- Create: `src/components/admin/MerchantForm.tsx`
- Create: `src/components/admin/LeadTable.tsx`

- [ ] **Step 1: Add admin merchant form**

Create `src/components/admin/MerchantForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { makeMerchantSlug } from "@/domain/merchant";

export function MerchantForm() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<"photography" | "home_design">("photography");
  const [message, setMessage] = useState("");

  async function submit() {
    const slug = makeMerchantSlug(name);
    const body = {
      name,
      slug,
      industry,
      address: "请补充地址",
      serviceArea: "请补充服务范围",
      businessHours: "10:00-18:00",
      contactPhone: "请补充电话",
      packages: [{ name: "基础套餐", priceRange: "请补充价格", includes: "请补充包含内容", bestFor: "请补充适合人群" }],
      faqs: [{ question: "如何预约", answer: "留下联系方式后，商家会确认时间。" }],
      bookingRules: { requiresManualConfirm: true, requiredFields: ["name", "phone", "need"] },
    };

    const response = await fetch("/api/merchants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    setMessage(response.ok ? `已创建商家链接：/m/${slug}` : "创建失败，请检查配置。");
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
      <button onClick={submit} type="button">创建</button>
      {message ? <p>{message}</p> : null}
    </section>
  );
}
```

- [ ] **Step 2: Add lead table**

Create `src/components/admin/LeadTable.tsx`:

```tsx
import type { Lead } from "@/domain/lead";

export function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <table className="lead-table">
      <thead>
        <tr>
          <th>客户</th>
          <th>电话</th>
          <th>需求</th>
          <th>意向</th>
          <th>下一步</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.id}>
            <td>{lead.customerName ?? "未留姓名"}</td>
            <td>{lead.phone ?? "未留电话"}</td>
            <td>{lead.need}</td>
            <td>{lead.level}</td>
            <td>{lead.nextAction}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Add admin home**

Create `src/app/admin/page.tsx`:

```tsx
import Link from "next/link";
import { MerchantForm } from "@/components/admin/MerchantForm";
import { listMerchants } from "@/server/repositories/merchantRepository";

export default async function AdminPage() {
  const merchants = await listMerchants();

  return (
    <main className="admin-shell">
      <h1>AI 语音接待后台</h1>
      <MerchantForm />
      <section className="admin-card">
        <h2>商家列表</h2>
        {merchants.map((merchant) => (
          <p key={merchant.id}>
            <Link href={`/admin/merchants/${merchant.id}`}>{merchant.name}</Link>
            <span> · </span>
            <Link href={`/m/${merchant.slug}?source=xiaohongshu`}>咨询页</Link>
          </p>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add merchant detail admin page**

Create `src/app/admin/merchants/[merchantId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { LeadTable } from "@/components/admin/LeadTable";
import { findMerchantById } from "@/server/repositories/merchantRepository";
import { listLeadsByMerchant } from "@/server/repositories/leadRepository";

export default async function MerchantAdminPage({ params }: { params: Promise<{ merchantId: string }> }) {
  const { merchantId } = await params;
  const merchant = await findMerchantById(merchantId);

  if (!merchant) {
    notFound();
  }

  const leads = await listLeadsByMerchant(merchant.id);

  return (
    <main className="admin-shell">
      <h1>{merchant.name}</h1>
      <p>咨询页：/m/{merchant.slug}?source=xiaohongshu</p>
      <LeadTable leads={leads} />
    </main>
  );
}
```

- [ ] **Step 5: Extend CSS for admin**

Append to `src/styles/globals.css`:

```css
.admin-shell {
  width: min(1080px, calc(100% - 32px));
  margin: 0 auto;
  padding: 40px 0;
}

.admin-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  margin: 16px 0;
  padding: 20px;
}

.admin-card label {
  display: grid;
  gap: 6px;
  margin: 12px 0;
}

.admin-card input,
.admin-card select {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0 10px;
}

.lead-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--surface);
}

.lead-table th,
.lead-table td {
  border-bottom: 1px solid var(--line);
  padding: 10px;
  text-align: left;
  vertical-align: top;
}
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit admin console**

Run:

```bash
git add src/app/admin/page.tsx src/app/admin/merchants/[merchantId]/page.tsx src/components/admin/MerchantForm.tsx src/components/admin/LeadTable.tsx src/styles/globals.css
git commit -m "feat: add merchant admin console"
```

Expected: commit succeeds.

## Task 10: Evaluation Suite

**Files:**
- Create: `src/server/services/evaluation.ts`
- Test: `tests/server/evaluation.test.ts`

- [ ] **Step 1: Write evaluation tests**

Create `tests/server/evaluation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateLeadSummary } from "@/server/services/evaluation";

describe("evaluateLeadSummary", () => {
  it("flags missing phone for high intent lead", () => {
    const result = evaluateLeadSummary({
      source: "xiaohongshu",
      intent: "booking",
      level: "high",
      need: "想预约周末写真",
      questions: ["周末有没有档期"],
      nextAction: "老板确认档期",
      transcript: [{ role: "customer", text: "想预约周末写真", at: "2026-05-03T10:00:00.000Z" }],
    });

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("high_intent_missing_phone");
  });
});
```

- [ ] **Step 2: Run failing evaluation test**

Run:

```bash
npm test -- tests/server/evaluation.test.ts
```

Expected: FAIL because `evaluation.ts` does not exist.

- [ ] **Step 3: Add evaluation service**

Create `src/server/services/evaluation.ts`:

```ts
import type { LeadSummary } from "@/domain/lead";

export type EvaluationResult = {
  passed: boolean;
  failures: string[];
};

export function evaluateLeadSummary(summary: LeadSummary): EvaluationResult {
  const failures: string[] = [];

  if (summary.level === "high" && !summary.phone) {
    failures.push("high_intent_missing_phone");
  }

  if (/一定|保证|最低价|百分百/.test(summary.nextAction)) {
    failures.push("unsafe_commitment");
  }

  if (summary.need.trim().length < 4) {
    failures.push("need_too_short");
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
```

- [ ] **Step 4: Run evaluation tests**

Run:

```bash
npm test -- tests/server/evaluation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit evaluation suite**

Run:

```bash
git add src/server/services/evaluation.ts tests/server/evaluation.test.ts
git commit -m "feat: add lead summary evaluation"
```

Expected: commit succeeds.

## Task 11: Local Runbook and Commercial Readiness Checklist

**Files:**
- Create: `docs/ops/local-runbook.md`

- [ ] **Step 1: Add local runbook**

Create `docs/ops/local-runbook.md`:

```markdown
# Local Runbook

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL 15 or newer.
- A Feishu bot webhook for notification testing.

## Environment

Copy `.env.example` to `.env.local` and set:

```env
DATABASE_URL="postgresql://voiceai:voiceai@localhost:5432/voiceai"
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/replace-me"
AGENT_MODE="local"
PUBLIC_APP_URL="http://localhost:3000"
```

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Manual Acceptance

1. Open `http://localhost:3000/admin`.
2. Create a merchant named `光影写真馆`.
3. Open `/m/<merchant-slug>?source=xiaohongshu`.
4. Ask `写真多少钱`.
5. Confirm the page speaks or displays a response with the configured price range.
6. Confirm a lead appears in the merchant detail page.
7. Confirm Feishu receives the lead summary when webhook is configured.

## Commercial Readiness Gate

The MVP is ready for first merchant trials when all checks pass:

- `npm test` passes.
- `npm run build` passes.
- Admin can create a merchant.
- Public page can create a lead.
- Feishu test endpoint returns `{ "ok": true }`.
- Two industry templates have at least 50 evaluation prompts each.
- Five pilot merchants can be manually onboarded by the team.
```

- [ ] **Step 2: Commit runbook**

Run:

```bash
git add docs/ops/local-runbook.md
git commit -m "docs: add local runbook and readiness gate"
```

Expected: commit succeeds.

## Task 12: Final Verification

**Files:**
- Inspect all files changed in Tasks 1-11.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all Vitest test suites pass.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Next.js build succeeds.

- [ ] **Step 3: Verify repository status**

Run:

```bash
git status --short
```

Expected: no uncommitted files.

- [ ] **Step 4: Completion audit**

Check these artifacts:

```text
Spec requirement: merchant setup
Evidence: src/app/admin/page.tsx, src/components/admin/MerchantForm.tsx

Spec requirement: public consultation link
Evidence: src/app/m/[slug]/page.tsx, src/components/consult/ConsultationClient.tsx

Spec requirement: voice or speech interaction
Evidence: src/components/consult/VoiceButton.tsx and browser speech synthesis in ConsultationClient

Spec requirement: OpenClaw automation boundary
Evidence: src/server/services/agentAdapter.ts

Spec requirement: local demo fallback
Evidence: src/server/services/localReceptionist.ts and tests/server/localReceptionist.test.ts

Spec requirement: lead summary
Evidence: src/domain/lead.ts, src/server/services/leadWorkflow.ts

Spec requirement: Feishu notification
Evidence: src/server/services/notification.ts, src/app/api/notify/feishu/test/route.ts

Spec requirement: lightweight admin
Evidence: src/app/admin/page.tsx, src/app/admin/merchants/[merchantId]/page.tsx

Spec requirement: evaluation
Evidence: src/server/services/evaluation.ts, tests/server/evaluation.test.ts
```

No requirement is complete without file evidence plus passing tests or a manual acceptance record in `docs/ops/local-runbook.md`.

- [ ] **Step 5: Final commit if verification changed docs**

If the runbook or plan is edited during verification, run:

```bash
git add docs/ops/local-runbook.md docs/superpowers/plans/2026-05-03-xhs-ai-voice-receptionist.md
git commit -m "docs: update MVP verification notes"
```

Expected: commit succeeds only if files changed.
