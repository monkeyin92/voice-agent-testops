import { z } from "zod";

export const leadSourceSchema = z.enum(["xiaohongshu", "douyin", "wechat", "website", "phone", "unknown"]);
export type LeadSource = z.infer<typeof leadSourceSchema>;

export const leadIntentSchema = z.enum([
  "pricing",
  "availability",
  "booking",
  "service_info",
  "handoff",
  "other",
]);
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
