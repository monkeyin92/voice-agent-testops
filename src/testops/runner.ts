import type { ConversationMessage } from "../server/services/agentAdapter";
import type { VoiceAgentAudioReplay, VoiceAgentExecutor, VoiceAgentToolCall, VoiceAgentVoiceMetrics } from "./agents";
import { makeTestMerchant } from "./agents";
import { createRuleBasedSemanticJudge, type VoiceSemanticJudge } from "./semanticJudge";
import type { VoiceMetricName, VoiceTestAssertion, VoiceTestScenario, VoiceTestSeverity, VoiceTestSuite } from "./schema";

export type VoiceTestClock = {
  now: () => number;
  iso: () => string;
};

export type VoiceTestFailure = {
  code: string;
  message: string;
  severity: VoiceTestSeverity;
};

export type VoiceTestTurnResult = {
  index: number;
  user: string;
  assistant: string;
  latencyMs: number;
  passed: boolean;
  assertions: number;
  failures: VoiceTestFailure[];
  tools?: VoiceAgentToolCall[];
  state?: Record<string, unknown>;
  audio?: VoiceAgentAudioReplay;
  voiceMetrics?: VoiceAgentVoiceMetrics;
};

export type VoiceTestScenarioResult = {
  id: string;
  title: string;
  businessRisk?: string;
  passed: boolean;
  turns: VoiceTestTurnResult[];
};

export type VoiceTestRunResult = {
  id: string;
  suiteName: string;
  passed: boolean;
  startedAt: string;
  finishedAt: string;
  summary: {
    scenarios: number;
    turns: number;
    assertions: number;
    failures: number;
  };
  scenarios: VoiceTestScenarioResult[];
};

export type VoiceTestProgressEvent =
  | {
      type: "turn:start";
      scenarioIndex: number;
      scenarioId: string;
      scenarioTitle: string;
      turnIndex: number;
      turnTotal: number;
      user: string;
    }
  | {
      type: "turn:finish";
      scenarioIndex: number;
      scenarioId: string;
      scenarioTitle: string;
      turnIndex: number;
      turnTotal: number;
      passed: boolean;
      failures: number;
      latencyMs: number;
    };

export type VoiceTestRunOptions = {
  clock?: VoiceTestClock;
  onProgress?: (event: VoiceTestProgressEvent) => void;
  semanticJudge?: VoiceSemanticJudge;
};

const systemClock: VoiceTestClock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

export async function runVoiceTestSuite(
  suite: VoiceTestSuite,
  agent: VoiceAgentExecutor,
  options: VoiceTestRunOptions = {},
): Promise<VoiceTestRunResult> {
  const clock = options.clock ?? systemClock;
  const semanticJudge = options.semanticJudge ?? createRuleBasedSemanticJudge();
  const startedAt = clock.iso();
  const scenarioResults: VoiceTestScenarioResult[] = [];

  for (const [scenarioIndex, scenario] of suite.scenarios.entries()) {
    scenarioResults.push(
      await runScenario(suite.name, scenario, agent, clock, scenarioIndex, options.onProgress, semanticJudge),
    );
  }

  const assertions = scenarioResults.reduce(
    (count, scenario) => count + scenario.turns.reduce((turnCount, turn) => turnCount + turn.assertions, 0),
    0,
  );
  const failures = scenarioResults.reduce(
    (count, scenario) => count + scenario.turns.reduce((turnCount, turn) => turnCount + turn.failures.length, 0),
    0,
  );
  const turns = scenarioResults.reduce((count, scenario) => count + scenario.turns.length, 0);

  return {
    id: `run_${Date.now()}`,
    suiteName: suite.name,
    passed: failures === 0,
    startedAt,
    finishedAt: clock.iso(),
    summary: {
      scenarios: scenarioResults.length,
      turns,
      assertions,
      failures,
    },
    scenarios: scenarioResults,
  };
}

async function runScenario(
  suiteName: string,
  scenario: VoiceTestScenario,
  agent: VoiceAgentExecutor,
  clock: VoiceTestClock,
  scenarioIndex: number,
  onProgress: VoiceTestRunOptions["onProgress"],
  semanticJudge: VoiceSemanticJudge,
): Promise<VoiceTestScenarioResult> {
  const merchant = makeTestMerchant(scenario.merchant, `test_${scenario.id}`);
  const messages: ConversationMessage[] = [];
  const turnResults: VoiceTestTurnResult[] = [];

  for (const [index, turn] of scenario.turns.entries()) {
    onProgress?.({
      type: "turn:start",
      scenarioIndex,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      turnIndex: index,
      turnTotal: scenario.turns.length,
      user: turn.user,
    });

    const customerMessage: ConversationMessage = {
      role: "customer",
      text: turn.user,
      at: clock.iso(),
    };
    messages.push(customerMessage);

    const started = clock.now();
    const output = await agent({
      suiteName,
      scenario,
      merchant,
      messages: [...messages],
      turnIndex: index,
      customerText: turn.user,
    });
    const latencyMs = Math.max(0, clock.now() - started);

    const assistantMessage: ConversationMessage = {
      role: "assistant",
      text: output.spoken,
      at: clock.iso(),
    };
    messages.push(assistantMessage);

    const failures = (
      await Promise.all(
        turn.expect.map((assertion) =>
          evaluateAssertion(assertion, output, latencyMs, turn.user, semanticJudge),
        ),
      )
    ).flat();
    const passed = failures.length === 0;

    turnResults.push({
      index,
      user: turn.user,
      assistant: output.spoken,
      latencyMs,
      passed,
      assertions: turn.expect.length,
      failures,
      ...(output.tools ? { tools: output.tools } : {}),
      ...(output.state ? { state: output.state } : {}),
      ...(output.audio ? { audio: output.audio } : {}),
      ...(output.voiceMetrics ? { voiceMetrics: output.voiceMetrics } : {}),
    });

    onProgress?.({
      type: "turn:finish",
      scenarioIndex,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      turnIndex: index,
      turnTotal: scenario.turns.length,
      passed,
      failures: failures.length,
      latencyMs,
    });
  }

  return {
    id: scenario.id,
    title: scenario.title,
    businessRisk: scenario.businessRisk,
    passed: turnResults.every((turn) => turn.passed),
    turns: turnResults,
  };
}

function evaluateAssertion(
  assertion: VoiceTestAssertion,
  output: Awaited<ReturnType<VoiceAgentExecutor>>,
  latencyMs: number,
  user: string,
  semanticJudge: VoiceSemanticJudge,
): Promise<VoiceTestFailure[]> | VoiceTestFailure[] {
  switch (assertion.type) {
    case "must_contain_any": {
      const matched = assertion.phrases.some((phrase) => output.spoken.includes(phrase));
      return matched
        ? []
        : [
            {
              code: "expected_phrase_missing",
              message: `回复没有包含任一预期短语：${assertion.phrases.join(" / ")}`,
              severity: assertion.severity,
            },
          ];
    }
    case "must_not_match": {
      const pattern = new RegExp(assertion.pattern);
      return pattern.test(output.spoken)
        ? [
            {
              code: "forbidden_pattern_matched",
              message: `回复命中了禁止模式：${assertion.pattern}`,
              severity: assertion.severity,
            },
          ]
        : [];
    }
    case "max_latency_ms":
      return latencyMs > assertion.value
        ? [
            {
              code: "latency_exceeded",
              message: `响应耗时 ${latencyMs}ms，超过阈值 ${assertion.value}ms`,
              severity: assertion.severity,
            },
          ]
        : [];
    case "lead_field_present": {
      const value = output.summary?.[assertion.field];
      return typeof value === "string" && value.trim().length > 0
        ? []
        : [
            {
              code: "lead_field_missing",
              message: `线索摘要缺少字段：${assertion.field}`,
              severity: assertion.severity,
            },
          ];
    }
    case "lead_intent":
      return output.summary?.intent === assertion.intent
        ? []
        : [
            {
              code: "lead_intent_mismatch",
              message: `线索意图应为 ${assertion.intent}，实际为 ${output.summary?.intent ?? "missing"}`,
              severity: assertion.severity,
            },
          ];
    case "semantic_judge":
      return evaluateSemanticJudgeAssertion(assertion, output.spoken, user, output.summary, semanticJudge);
    case "tool_called":
      return evaluateToolCalledAssertion(assertion, output.tools ?? []);
    case "backend_state_present":
      return evaluateBackendStatePresentAssertion(assertion, output.state);
    case "backend_state_equals":
      return evaluateBackendStateEqualsAssertion(assertion, output.state);
    case "audio_replay_present":
      return evaluateAudioReplayPresentAssertion(assertion, output.audio);
    case "voice_metric_max":
      return evaluateVoiceMetricMaxAssertion(assertion, output.voiceMetrics);
    case "voice_metric_min":
      return evaluateVoiceMetricMinAssertion(assertion, output.voiceMetrics);
  }
}

function evaluateToolCalledAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "tool_called" }>,
  tools: VoiceAgentToolCall[],
): VoiceTestFailure[] {
  const matchingByName = tools.filter((tool) => tool.name === assertion.name);
  if (matchingByName.length < assertion.minCount) {
    return [
      {
        code: "tool_call_missing",
        message: `工具调用不足：${assertion.name} 需要至少 ${assertion.minCount} 次，实际 ${matchingByName.length} 次`,
        severity: assertion.severity,
      },
    ];
  }

  if (!assertion.arguments) {
    return [];
  }

  const matchingArguments = matchingByName.filter((tool) =>
    deepContains(tool.arguments ?? {}, assertion.arguments ?? {}),
  );

  return matchingArguments.length >= assertion.minCount
    ? []
    : [
        {
          code: "tool_arguments_mismatch",
          message: `工具 ${assertion.name} 没有匹配预期参数子集：${JSON.stringify(assertion.arguments)}`,
          severity: assertion.severity,
        },
      ];
}

function evaluateBackendStatePresentAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "backend_state_present" }>,
  state: Record<string, unknown> | undefined,
): VoiceTestFailure[] {
  const actual = getPathValue(state, assertion.path);
  return actual.exists
    ? []
    : [
        {
          code: "backend_state_missing",
          message: `后端状态缺少路径：${assertion.path}`,
          severity: assertion.severity,
        },
      ];
}

function evaluateBackendStateEqualsAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "backend_state_equals" }>,
  state: Record<string, unknown> | undefined,
): VoiceTestFailure[] {
  const actual = getPathValue(state, assertion.path);
  if (!actual.exists) {
    return [
      {
        code: "backend_state_missing",
        message: `后端状态缺少路径：${assertion.path}`,
        severity: assertion.severity,
      },
    ];
  }

  return deepEqual(actual.value, assertion.value)
    ? []
    : [
        {
          code: "backend_state_mismatch",
          message: `后端状态 ${assertion.path} 应为 ${JSON.stringify(assertion.value)}，实际为 ${JSON.stringify(
            actual.value,
          )}`,
          severity: assertion.severity,
        },
      ];
}

function evaluateAudioReplayPresentAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "audio_replay_present" }>,
  audio: VoiceAgentAudioReplay | undefined,
): VoiceTestFailure[] {
  return typeof audio?.url === "string" && audio.url.trim().length > 0
    ? []
    : [
        {
          code: "audio_replay_missing",
          message: "缺少音频 replay：agent 输出需要包含 audio.url",
          severity: assertion.severity,
        },
      ];
}

function evaluateVoiceMetricMaxAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "voice_metric_max" }>,
  metrics: VoiceAgentVoiceMetrics | undefined,
): VoiceTestFailure[] {
  const actual = getVoiceMetric(metrics, assertion.metric);
  if (!actual.exists) {
    return [
      {
        code: "voice_metric_missing",
        message: `语音指标缺失：${assertion.metric}`,
        severity: assertion.severity,
      },
    ];
  }

  return actual.value <= assertion.value
    ? []
    : [
        {
          code: "voice_metric_exceeded",
          message: `语音指标 ${assertion.metric} 为 ${formatMetricValue(assertion.metric, actual.value)}，超过阈值 ${formatMetricValue(
            assertion.metric,
            assertion.value,
          )}`,
          severity: assertion.severity,
        },
      ];
}

function evaluateVoiceMetricMinAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "voice_metric_min" }>,
  metrics: VoiceAgentVoiceMetrics | undefined,
): VoiceTestFailure[] {
  const actual = getVoiceMetric(metrics, assertion.metric);
  if (!actual.exists) {
    return [
      {
        code: "voice_metric_missing",
        message: `语音指标缺失：${assertion.metric}`,
        severity: assertion.severity,
      },
    ];
  }

  return actual.value >= assertion.value
    ? []
    : [
        {
          code: "voice_metric_below_minimum",
          message: `语音指标 ${assertion.metric} 为 ${formatMetricValue(assertion.metric, actual.value)}，低于阈值 ${formatMetricValue(
            assertion.metric,
            assertion.value,
          )}`,
          severity: assertion.severity,
        },
      ];
}

function getVoiceMetric(
  metrics: VoiceAgentVoiceMetrics | undefined,
  metric: VoiceMetricName,
): { exists: true; value: number } | { exists: false } {
  const value = metrics?.[metric];
  return typeof value === "number" && Number.isFinite(value) ? { exists: true, value } : { exists: false };
}

function getPathValue(state: Record<string, unknown> | undefined, path: string): { exists: boolean; value?: unknown } {
  let current: unknown = state;

  for (const segment of path.split(".")) {
    if (!isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { exists: false };
    }
    current = current[segment];
  }

  return { exists: true, value: current };
}

function deepContains(actual: unknown, expected: unknown): boolean {
  if (isRecord(expected)) {
    if (!isRecord(actual)) {
      return false;
    }

    return Object.entries(expected).every(([key, expectedValue]) =>
      Object.prototype.hasOwnProperty.call(actual, key) && deepContains(actual[key], expectedValue),
    );
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) {
      return false;
    }

    return expected.every((expectedValue, index) => deepContains(actual[index], expectedValue));
  }

  return deepEqual(actual, expected);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((leftValue, index) => deepEqual(leftValue, right[index]));
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]))
    );
  }

  return false;
}

function formatMetricValue(metric: VoiceMetricName, value: number): string {
  if (metric === "asrConfidence") {
    return `${Math.round(value * 100)}%`;
  }

  return metric.endsWith("Ms") ? `${value}ms` : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function evaluateSemanticJudgeAssertion(
  assertion: Extract<VoiceTestAssertion, { type: "semantic_judge" }>,
  spoken: string,
  user: string,
  summary: Awaited<ReturnType<VoiceAgentExecutor>>["summary"],
  semanticJudge: VoiceSemanticJudge,
): Promise<VoiceTestFailure[]> {
  const result = await semanticJudge({ assertion, spoken, user, summary });

  return result.passed
    ? []
    : [
        {
          code: "semantic_judge_failed",
          message: `语义断言未通过（${assertion.rubric}）：${result.reason}${
            result.evidence ? `；证据：${result.evidence}` : ""
          }`,
          severity: assertion.severity,
        },
      ];
}
