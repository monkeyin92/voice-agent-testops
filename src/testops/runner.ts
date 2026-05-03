import type { ConversationMessage } from "../server/services/agentAdapter";
import type { VoiceAgentExecutor } from "./agents";
import { makeTestMerchant } from "./agents";
import type { VoiceTestAssertion, VoiceTestScenario, VoiceTestSeverity, VoiceTestSuite } from "./schema";

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
};

export type VoiceTestScenarioResult = {
  id: string;
  title: string;
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

const systemClock: VoiceTestClock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

export async function runVoiceTestSuite(
  suite: VoiceTestSuite,
  agent: VoiceAgentExecutor,
  options: { clock?: VoiceTestClock } = {},
): Promise<VoiceTestRunResult> {
  const clock = options.clock ?? systemClock;
  const startedAt = clock.iso();
  const scenarioResults: VoiceTestScenarioResult[] = [];

  for (const scenario of suite.scenarios) {
    scenarioResults.push(await runScenario(suite.name, scenario, agent, clock));
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
): Promise<VoiceTestScenarioResult> {
  const merchant = makeTestMerchant(scenario.merchant, `test_${scenario.id}`);
  const messages: ConversationMessage[] = [];
  const turnResults: VoiceTestTurnResult[] = [];

  for (const [index, turn] of scenario.turns.entries()) {
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

    const failures = turn.expect.flatMap((assertion) => evaluateAssertion(assertion, output.spoken, latencyMs, output.summary));

    turnResults.push({
      index,
      user: turn.user,
      assistant: output.spoken,
      latencyMs,
      passed: failures.length === 0,
      assertions: turn.expect.length,
      failures,
    });
  }

  return {
    id: scenario.id,
    title: scenario.title,
    passed: turnResults.every((turn) => turn.passed),
    turns: turnResults,
  };
}

function evaluateAssertion(
  assertion: VoiceTestAssertion,
  spoken: string,
  latencyMs: number,
  summary: Awaited<ReturnType<VoiceAgentExecutor>>["summary"],
): VoiceTestFailure[] {
  switch (assertion.type) {
    case "must_contain_any": {
      const matched = assertion.phrases.some((phrase) => spoken.includes(phrase));
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
      return pattern.test(spoken)
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
      const value = summary?.[assertion.field];
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
      return summary?.intent === assertion.intent
        ? []
        : [
            {
              code: "lead_intent_mismatch",
              message: `线索意图应为 ${assertion.intent}，实际为 ${summary?.intent ?? "missing"}`,
              severity: assertion.severity,
            },
          ];
  }
}
