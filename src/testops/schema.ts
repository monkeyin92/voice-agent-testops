import { z } from "zod";
import { leadIntentSchema, leadSourceSchema } from "../domain/lead";
import { merchantConfigSchema } from "../domain/merchant";

export const voiceTestSeveritySchema = z.enum(["critical", "major", "minor"]);
export type VoiceTestSeverity = z.infer<typeof voiceTestSeveritySchema>;

const assertionSeverity = voiceTestSeveritySchema.default("major");

export const semanticJudgeRubricSchema = z.enum([
  "no_unsupported_guarantee",
  "requires_human_confirmation",
  "requires_handoff",
]);
export type SemanticJudgeRubric = z.infer<typeof semanticJudgeRubricSchema>;

export const voiceMetricNameSchema = z.enum([
  "timeToFirstWordMs",
  "turnLatencyMs",
  "asrLatencyMs",
  "ttsLatencyMs",
  "silenceMs",
  "interruptionCount",
  "asrConfidence",
]);
export type VoiceMetricName = z.infer<typeof voiceMetricNameSchema>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
);
const backendStatePathSchema = z.string().min(1).regex(/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$/);

export const voiceTestAssertionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("must_contain_any"),
    phrases: z.array(z.string().min(1)).min(1),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("must_not_match"),
    pattern: z.string().min(1).refine(isValidRegex, "pattern must be a valid JavaScript regular expression"),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("max_latency_ms"),
    value: z.number().int().positive(),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("lead_field_present"),
    field: z.enum(["customerName", "phone", "need", "budget", "preferredTime", "location"]),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("lead_intent"),
    intent: leadIntentSchema,
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("semantic_judge"),
    rubric: semanticJudgeRubricSchema,
    criteria: z.string().min(1),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("tool_called"),
    name: z.string().min(1),
    minCount: z.number().int().positive().default(1),
    arguments: z.record(z.string(), jsonValueSchema).optional(),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("backend_state_present"),
    path: backendStatePathSchema,
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("backend_state_equals"),
    path: backendStatePathSchema,
    value: jsonValueSchema,
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("audio_replay_present"),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("voice_metric_max"),
    metric: voiceMetricNameSchema,
    value: z.number().nonnegative(),
    severity: assertionSeverity,
  }),
  z.object({
    type: z.literal("voice_metric_min"),
    metric: voiceMetricNameSchema,
    value: z.number().nonnegative(),
    severity: assertionSeverity,
  }),
]);

export type VoiceTestAssertion = z.infer<typeof voiceTestAssertionSchema>;

export const voiceTestTurnSchema = z.object({
  user: z.string().min(1),
  expect: z.array(voiceTestAssertionSchema).default([]),
});
export type VoiceTestTurn = z.infer<typeof voiceTestTurnSchema>;

export const voiceTestScenarioSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().min(1),
  description: z.string().optional(),
  businessRisk: z.string().min(1).optional(),
  source: leadSourceSchema,
  merchant: merchantConfigSchema,
  turns: z.array(voiceTestTurnSchema).min(1),
});
export type VoiceTestScenario = z.infer<typeof voiceTestScenarioSchema>;

export const voiceTestSuiteSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scenarios: z.array(voiceTestScenarioSchema).min(1),
});
export type VoiceTestSuite = z.infer<typeof voiceTestSuiteSchema>;

export function parseVoiceTestSuite(input: unknown): VoiceTestSuite {
  return voiceTestSuiteSchema.parse(input);
}

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}
