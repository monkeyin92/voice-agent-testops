type JsonSchema = Record<string, unknown>;

const severityProperty: JsonSchema = {
  type: "string",
  enum: ["critical", "major", "minor"],
  default: "major",
  description: "How seriously this assertion should count in reports and severity gates.",
};

export function buildVoiceTestSuiteJsonSchema(): JsonSchema {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://github.com/monkeyin92/voice-agent-testops/schemas/voice-test-suite.schema.json",
    title: "Voice Agent TestOps Suite",
    description: "Schema for authoring voice-agent regression suites.",
    type: "object",
    additionalProperties: false,
    required: ["name", "scenarios"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        description: "Human-readable suite name shown in CLI output and reports.",
      },
      description: {
        type: "string",
        description: "Optional context for reviewers.",
      },
      scenarios: {
        type: "array",
        minItems: 1,
        items: buildScenarioSchema(),
      },
    },
    $defs: {
      merchant: buildMerchantSchema(),
    },
  };
}

function buildScenarioSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "title", "source", "turns"],
    oneOf: [
      {
        required: ["merchant"],
        not: { required: ["merchantRef"] },
      },
      {
        required: ["merchantRef"],
        not: { required: ["merchant"] },
      },
    ],
    properties: {
      id: {
        type: "string",
        pattern: "^[a-z0-9][a-z0-9_-]*$",
        description: "Stable scenario id for reports and HTTP test-turn requests.",
      },
      title: {
        type: "string",
        minLength: 1,
      },
      description: {
        type: "string",
      },
      source: {
        type: "string",
        enum: ["xiaohongshu", "douyin", "wechat", "website", "unknown"],
      },
      merchant: {
        $ref: "#/$defs/merchant",
        description: "Inline merchant facts for this scenario.",
      },
      merchantRef: {
        type: "string",
        minLength: 1,
        description: "Path to a merchant JSON file, resolved relative to the suite file.",
      },
      turns: {
        type: "array",
        minItems: 1,
        items: buildTurnSchema(),
      },
    },
  };
}

function buildMerchantSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "slug",
      "industry",
      "address",
      "serviceArea",
      "businessHours",
      "contactPhone",
      "packages",
      "faqs",
      "bookingRules",
    ],
    properties: {
      name: { type: "string", minLength: 1 },
      slug: { type: "string", pattern: "^[a-z0-9-]+$" },
      industry: {
        type: "string",
        enum: ["photography", "home_design", "dental_clinic", "restaurant", "real_estate"],
      },
      address: { type: "string", minLength: 1 },
      serviceArea: { type: "string", minLength: 1 },
      businessHours: { type: "string", minLength: 1 },
      contactPhone: { type: "string", minLength: 6 },
      feishuWebhookUrl: { type: "string", format: "uri" },
      packages: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "priceRange", "includes", "bestFor"],
          properties: {
            name: { type: "string", minLength: 1 },
            priceRange: { type: "string", minLength: 1 },
            includes: { type: "string", minLength: 1 },
            bestFor: { type: "string", minLength: 1 },
          },
        },
      },
      faqs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["question", "answer"],
          properties: {
            question: { type: "string", minLength: 1 },
            answer: { type: "string", minLength: 1 },
          },
        },
      },
      bookingRules: {
        type: "object",
        additionalProperties: false,
        required: ["requiresManualConfirm", "requiredFields"],
        properties: {
          requiresManualConfirm: { type: "boolean" },
          requiredFields: {
            type: "array",
            minItems: 2,
            items: {
              type: "string",
              enum: ["name", "phone", "preferredTime", "need", "budget", "location"],
            },
          },
        },
      },
    },
  };
}

function buildTurnSchema(): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["user"],
    properties: {
      user: {
        type: "string",
        minLength: 1,
        description: "Customer text sent to the agent on this turn.",
      },
      expect: {
        type: "array",
        default: [],
        items: buildAssertionSchema(),
      },
    },
  };
}

function buildAssertionSchema(): JsonSchema {
  return {
    oneOf: [
      {
        title: "must_contain_any",
        type: "object",
        additionalProperties: false,
        required: ["type", "phrases"],
        properties: {
          type: { const: "must_contain_any" },
          phrases: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
          severity: severityProperty,
        },
      },
      {
        title: "must_not_match",
        type: "object",
        additionalProperties: false,
        required: ["type", "pattern"],
        properties: {
          type: { const: "must_not_match" },
          pattern: {
            type: "string",
            minLength: 1,
            description: "JavaScript regular expression that must not match the spoken response.",
          },
          severity: severityProperty,
        },
      },
      {
        title: "max_latency_ms",
        type: "object",
        additionalProperties: false,
        required: ["type", "value"],
        properties: {
          type: { const: "max_latency_ms" },
          value: { type: "integer", minimum: 1 },
          severity: severityProperty,
        },
      },
      {
        title: "lead_field_present",
        type: "object",
        additionalProperties: false,
        required: ["type", "field"],
        properties: {
          type: { const: "lead_field_present" },
          field: {
            type: "string",
            enum: ["customerName", "phone", "need", "budget", "preferredTime", "location"],
          },
          severity: severityProperty,
        },
      },
      {
        title: "lead_intent",
        type: "object",
        additionalProperties: false,
        required: ["type", "intent"],
        properties: {
          type: { const: "lead_intent" },
          intent: {
            type: "string",
            enum: ["pricing", "availability", "booking", "service_info", "handoff", "other"],
          },
          severity: severityProperty,
        },
      },
      {
        title: "semantic_judge",
        type: "object",
        additionalProperties: false,
        required: ["type", "rubric", "criteria"],
        properties: {
          type: { const: "semantic_judge" },
          rubric: {
            type: "string",
            enum: ["no_unsupported_guarantee", "requires_human_confirmation", "requires_handoff"],
            description: "High-level business-risk rubric evaluated by the semantic judge.",
          },
          criteria: {
            type: "string",
            minLength: 1,
            description: "Natural-language instruction explaining what the judge should evaluate.",
          },
          severity: severityProperty,
        },
      },
      {
        title: "tool_called",
        type: "object",
        additionalProperties: false,
        required: ["type", "name"],
        properties: {
          type: { const: "tool_called" },
          name: {
            type: "string",
            minLength: 1,
            description: "Expected tool/function name returned by the test bridge.",
          },
          minCount: {
            type: "integer",
            minimum: 1,
            default: 1,
            description: "Minimum number of calls with this name, and with matching arguments when provided.",
          },
          arguments: {
            type: "object",
            description: "Expected JSON argument subset. Nested objects are matched as subsets.",
          },
          severity: severityProperty,
        },
      },
      {
        title: "backend_state_present",
        type: "object",
        additionalProperties: false,
        required: ["type", "path"],
        properties: {
          type: { const: "backend_state_present" },
          path: {
            type: "string",
            pattern: "^[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*$",
            description: "Dot path inside the optional state object returned by the test bridge.",
          },
          severity: severityProperty,
        },
      },
      {
        title: "backend_state_equals",
        type: "object",
        additionalProperties: false,
        required: ["type", "path", "value"],
        properties: {
          type: { const: "backend_state_equals" },
          path: {
            type: "string",
            pattern: "^[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*$",
            description: "Dot path inside the optional state object returned by the test bridge.",
          },
          value: {
            description: "Expected JSON value at the selected backend state path.",
          },
          severity: severityProperty,
        },
      },
    ],
  };
}
