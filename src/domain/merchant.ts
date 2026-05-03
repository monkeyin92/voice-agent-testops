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
  requiredFields: z
    .array(z.enum(["name", "phone", "preferredTime", "need", "budget", "location"]))
    .min(2),
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
