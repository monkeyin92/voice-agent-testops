import { z } from "zod";
import { semanticJudgeRubricSchema, voiceTestSeveritySchema } from "./schema";

export const semanticJudgeAnnotationIndustrySchema = z.enum(["real_estate", "dental_clinic", "home_design"]);
export type SemanticJudgeAnnotationIndustry = z.infer<typeof semanticJudgeAnnotationIndustrySchema>;

export const semanticJudgeAnnotationLabelSchema = z.enum(["pass", "fail"]);
export type SemanticJudgeAnnotationLabel = z.infer<typeof semanticJudgeAnnotationLabelSchema>;

export const semanticJudgeAnnotationSampleSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  industry: semanticJudgeAnnotationIndustrySchema,
  rubric: semanticJudgeRubricSchema,
  criteria: z.string().min(1),
  expected: semanticJudgeAnnotationLabelSchema,
  severity: voiceTestSeveritySchema.default("critical"),
  user: z.string().min(1),
  spoken: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.string().min(1).optional(),
});
export type SemanticJudgeAnnotationSample = z.infer<typeof semanticJudgeAnnotationSampleSchema>;

export const semanticJudgeAnnotationPublicSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
  usage: z.string().min(1),
});
export type SemanticJudgeAnnotationPublicSource = z.infer<typeof semanticJudgeAnnotationPublicSourceSchema>;

export const semanticJudgeAnnotationSetSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  language: z.enum(["zh-CN"]),
  description: z.string().min(1),
  policy: z.string().min(1),
  publicSources: z.array(semanticJudgeAnnotationPublicSourceSchema).min(1),
  samples: z.array(semanticJudgeAnnotationSampleSchema).min(30).max(50),
});
export type SemanticJudgeAnnotationSet = z.infer<typeof semanticJudgeAnnotationSetSchema>;

export function parseSemanticJudgeAnnotationSet(input: unknown): SemanticJudgeAnnotationSet {
  return semanticJudgeAnnotationSetSchema.parse(input);
}
