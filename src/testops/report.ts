import type { VoiceTestRunResult } from "./runner";

export type ReportLocale = "zh-CN" | "en";

type ReportCopy = {
  htmlLang: string;
  titleSuffix: string;
  eyebrow: string;
  timeLabel: string;
  recommendation: { passed: string; failed: string };
  metrics: {
    scenarios: string;
    turns: string;
    assertions: string;
    failures: string;
    scenarioUnit: (count: number) => string;
    turnUnit: (count: number) => string;
    assertionUnit: (count: number) => string;
    failureUnit: (count: number) => string;
  };
  status: { passed: string; failed: string };
  scenarioTurns: (count: number) => string;
  turnMeta: (input: { index: number; latencyMs: number; passed: boolean; assertions: number; failures: number }) => string;
  customer: string;
  agent: string;
  businessRiskLabel: string;
  riskHeading: string;
  passedHeading: string;
  conversationSample: string;
  noRisk: string;
  riskItemPrefix: string;
  repairLabel: string;
  passedSummary: (result: VoiceTestRunResult, passedTurns: number) => string;
  repairAdvice: (code: string) => string;
};

const zhCopy: ReportCopy = {
  htmlLang: "zh-CN",
  titleSuffix: "智能语音体检单",
  eyebrow: "智能语音体检单",
  timeLabel: "检测时间",
  recommendation: {
    passed: "上线建议：可以进入小范围试点",
    failed: "上线建议：暂缓上线，先修复高风险对话",
  },
  metrics: {
    scenarios: "场景",
    turns: "对话",
    assertions: "断言",
    failures: "风险",
    scenarioUnit: (count) => `${count} 个场景`,
    turnUnit: (count) => `${count} 轮`,
    assertionUnit: (count) => `${count} 条断言`,
    failureUnit: (count) => `${count} 个失败`,
  },
  status: { passed: "通过", failed: "有风险" },
  scenarioTurns: (count) => `${count} 轮对话`,
  turnMeta: ({ index, latencyMs, passed, assertions, failures }) =>
    `第 ${index + 1} 轮 · ${latencyMs}ms · ${passed ? `通过 ${assertions} 条断言` : `${failures} 个风险`}`,
  customer: "客户",
  agent: "智能语音",
  businessRiskLabel: "业务风险",
  riskHeading: "风险项",
  passedHeading: "通过项",
  conversationSample: "对话抽样",
  noRisk: "本次未发现高风险回复。继续用更多真实客户问题做回归，可以逐步扩大试点范围。",
  riskItemPrefix: "风险项",
  repairLabel: "建议修复话术",
  passedSummary: (result, passedTurns) =>
    `<li>${result.summary.scenarios} 个场景完成体检。</li><li>${passedTurns} 轮对话通过断言。</li><li>${result.summary.assertions} 条断言用于检查价格、档期、转人工、留资和安全边界。</li>`,
  repairAdvice: repairAdviceForZh,
};

const enCopy: ReportCopy = {
  htmlLang: "en",
  titleSuffix: "Voice Agent Health Report",
  eyebrow: "Voice Agent Health Report",
  timeLabel: "Run time",
  recommendation: {
    passed: "Launch advice: ready for a small pilot",
    failed: "Launch advice: pause launch and fix high-risk turns",
  },
  metrics: {
    scenarios: "Scenarios",
    turns: "Turns",
    assertions: "Assertions",
    failures: "Risks",
    scenarioUnit: (count) => `${count} scenario${count === 1 ? "" : "s"}`,
    turnUnit: (count) => `${count} turn${count === 1 ? "" : "s"}`,
    assertionUnit: (count) => `${count} assertion${count === 1 ? "" : "s"}`,
    failureUnit: (count) => `${count} failure${count === 1 ? "" : "s"}`,
  },
  status: { passed: "Passed", failed: "At risk" },
  scenarioTurns: (count) => `${count} conversation turn${count === 1 ? "" : "s"}`,
  turnMeta: ({ index, latencyMs, passed, assertions, failures }) =>
    `Turn ${index + 1} · ${latencyMs}ms · ${passed ? `${assertions} assertions passed` : `${failures} risks`}`,
  customer: "Customer",
  agent: "Voice agent",
  businessRiskLabel: "Business risk",
  riskHeading: "Risks",
  passedHeading: "Passed checks",
  conversationSample: "Conversation sample",
  noRisk: "No high-risk reply found in this run. Keep expanding coverage with more real customer questions before launch.",
  riskItemPrefix: "Risk",
  repairLabel: "Suggested fix",
  passedSummary: (result, passedTurns) =>
    `<li>${result.summary.scenarios} scenario${result.summary.scenarios === 1 ? "" : "s"} completed.</li><li>${passedTurns} conversation turn${passedTurns === 1 ? "" : "s"} passed.</li><li>${result.summary.assertions} assertions checked pricing, availability, handoff, lead capture, and safety boundaries.</li>`,
  repairAdvice: repairAdviceForEn,
};

function copyFor(locale: ReportLocale): ReportCopy {
  return locale === "en" ? enCopy : zhCopy;
}

export function renderJsonReport(result: VoiceTestRunResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderMarkdownSummary(result: VoiceTestRunResult): string {
  const failedTurns = collectFailedTurns(result);
  const lines = [
    "# Voice Agent TestOps",
    "",
    `**Suite:** ${result.suiteName}`,
    `**Status:** ${result.passed ? "passed" : "failed"}`,
    `**Run:** ${result.startedAt} - ${result.finishedAt}`,
    "",
    `Scenarios: ${result.summary.scenarios} · Turns: ${result.summary.turns} · Assertions: ${result.summary.assertions} · Failures: ${result.summary.failures}`,
    "",
  ];

  if (failedTurns.length === 0) {
    lines.push("## Result", "", "No failed checks in this run.", "");
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Failed Checks", "");
  for (const { scenario, turn } of failedTurns) {
    lines.push(`- ${scenario.title} / turn ${turn.index + 1}`);
    if (scenario.businessRisk) {
      lines.push(`  - Business risk: ${scenario.businessRisk}`);
    }
    for (const failure of turn.failures) {
      lines.push(`  - \`${failure.code}\` (${failure.severity}): ${failure.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderJunitReport(result: VoiceTestRunResult): string {
  const failureCount = result.summary.failures;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="Voice Agent TestOps" tests="${result.summary.turns}" failures="${failureCount}">`,
    `  <testsuite name="${escapeXml(result.suiteName)}" tests="${result.summary.turns}" failures="${failureCount}" assertions="${result.summary.assertions}" timestamp="${escapeXml(result.startedAt)}" time="${runTimeSeconds(result)}">`,
  ];

  for (const scenario of result.scenarios) {
    for (const turn of scenario.turns) {
      lines.push(
        `    <testcase classname="${escapeXml(scenario.id)}" name="${escapeXml(
          `${scenario.title} / turn ${turn.index + 1}`,
        )}" assertions="${turn.assertions}" time="${(turn.latencyMs / 1000).toFixed(3)}">`,
      );

      for (const failure of turn.failures) {
        lines.push(
          `      <failure type="${escapeXml(failure.code)}" message="${escapeXml(failure.message)}">${escapeXml(
            `${failure.severity}: ${failure.message}`,
          )}</failure>`,
        );
      }

      lines.push("    </testcase>");
    }
  }

  lines.push("  </testsuite>", "</testsuites>");
  return `${lines.join("\n")}\n`;
}

export function renderHtmlReport(result: VoiceTestRunResult, options: { locale?: ReportLocale } = {}): string {
  const copy = copyFor(options.locale ?? "zh-CN");
  const failedTurns = collectFailedTurns(result);
  const scenarioRows = result.scenarios
    .map(
      (scenario) => `
        <section class="scenario">
          <div class="scenario-heading">
            <div>
              <h2>${escapeHtml(scenario.title)}</h2>
              <p class="muted">${escapeHtml(scenario.id)} · ${copy.scenarioTurns(scenario.turns.length)}</p>
              ${
                scenario.businessRisk
                  ? `<p class="business-risk"><strong>${copy.businessRiskLabel}</strong>: ${escapeHtml(
                      scenario.businessRisk,
                    )}</p>`
                  : ""
              }
            </div>
            <span class="status ${scenario.passed ? "ok" : "risk"}">${
              scenario.passed ? copy.status.passed : copy.status.failed
            }</span>
          </div>
          <div class="conversation">
          ${scenario.turns
            .map(
              (turn) => `
                <article class="turn ${turn.passed ? "passed" : "failed"}">
                  <div class="turn-meta">${copy.turnMeta({
                    index: turn.index,
                    latencyMs: turn.latencyMs,
                    passed: turn.passed,
                    assertions: turn.assertions,
                    failures: turn.failures.length,
                  })}</div>
                  <div class="bubble customer"><span>${copy.customer}</span><p>${escapeHtml(turn.user)}</p></div>
                  <div class="bubble agent"><span>${copy.agent}</span><p>${escapeHtml(turn.assistant)}</p></div>
                  ${renderFailures(turn.failures, copy)}
                </article>
              `,
            )
            .join("")}
          </div>
        </section>
      `,
    )
    .join("");
  const recommendation = result.passed ? copy.recommendation.passed : copy.recommendation.failed;

  return `<!doctype html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.suiteName)} · ${copy.titleSuffix}</title>
  <style>
    :root { --ink: #1f2328; --muted: #65717c; --line: #d9dee3; --paper: #fbfcfd; --panel: #ffffff; --green: #217a4b; --green-bg: #eaf6ef; --red: #a13a2f; --red-bg: #fff0ee; --blue: #285f9f; --blue-bg: #edf4ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif; color: var(--ink); background: var(--paper); }
    main { max-width: 1120px; margin: 0 auto; padding: 34px 20px 58px; }
    h1 { margin: 0; font-size: 34px; line-height: 1.15; letter-spacing: 0; }
    h2 { margin: 0; font-size: 20px; line-height: 1.35; letter-spacing: 0; }
    h3 { margin: 0 0 10px; font-size: 16px; letter-spacing: 0; }
    p { line-height: 1.65; }
    .muted { color: var(--muted); }
    .hero { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 22px; }
    .eyebrow { margin: 0 0 8px; color: var(--blue); font-weight: 700; font-size: 13px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(260px, .8fr); gap: 24px; align-items: end; }
    .recommendation { margin: 16px 0 0; padding: 12px 14px; border-radius: 8px; font-weight: 700; }
    .recommendation.ok { background: var(--green-bg); color: var(--green); }
    .recommendation.risk { background: var(--red-bg); color: var(--red); }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0 0; }
    .metric { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 13px; }
    .metric strong { display: block; margin-top: 6px; font-size: 26px; line-height: 1; }
    .insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
    .insight { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 16px; }
    .insight ul { margin: 0; padding-left: 20px; }
    .insight li { margin: 8px 0; line-height: 1.55; }
    .scenario { border-top: 1px solid var(--line); padding: 22px 0; }
    .scenario-heading { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
    .business-risk { margin: 8px 0 0; color: var(--muted); }
    .status { display: inline-flex; align-items: center; justify-content: center; min-width: 68px; padding: 6px 10px; border-radius: 8px; font-size: 13px; font-weight: 700; }
    .status.ok { background: var(--green-bg); color: var(--green); }
    .status.risk { background: var(--red-bg); color: var(--red); }
    .conversation { display: grid; gap: 16px; }
    .turn { border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 14px; }
    .turn.failed { border-color: #e0a095; }
    .turn-meta { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
    .bubble { max-width: 78%; margin: 10px 0; padding: 12px 14px; border-radius: 8px; }
    .bubble span { display: block; margin-bottom: 4px; font-size: 12px; font-weight: 700; color: var(--muted); }
    .bubble p { margin: 0; }
    .bubble.customer { background: var(--blue-bg); margin-right: auto; }
    .bubble.agent { background: #f1f5f2; margin-left: auto; }
    .failure { margin: 12px 0 0; padding: 12px; border-radius: 8px; background: var(--red-bg); color: var(--red); }
    .failure strong { color: var(--red); }
    .repair { margin-top: 8px; color: #5b241f; }
    @media (max-width: 820px) { .hero-grid, .insights { grid-template-columns: 1fr; } .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } .bubble { max-width: 100%; } }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">${copy.eyebrow}</p>
          <h1>${escapeHtml(result.suiteName)}</h1>
          <p class="muted">${copy.timeLabel}: ${escapeHtml(result.startedAt)} - ${escapeHtml(result.finishedAt)}</p>
          <div class="recommendation ${result.passed ? "ok" : "risk"}">${recommendation}</div>
        </div>
        <div class="summary">
          <div class="metric"><span>${copy.metrics.scenarios}</span><strong>${result.summary.scenarios}</strong><span>${copy.metrics.scenarioUnit(result.summary.scenarios)}</span></div>
          <div class="metric"><span>${copy.metrics.turns}</span><strong>${result.summary.turns}</strong><span>${copy.metrics.turnUnit(result.summary.turns)}</span></div>
          <div class="metric"><span>${copy.metrics.assertions}</span><strong>${result.summary.assertions}</strong><span>${copy.metrics.assertionUnit(result.summary.assertions)}</span></div>
          <div class="metric"><span>${copy.metrics.failures}</span><strong>${result.summary.failures}</strong><span>${copy.metrics.failureUnit(result.summary.failures)}</span></div>
        </div>
      </div>
    </section>
    <section class="insights">
      ${renderRiskSummary(failedTurns, copy)}
      ${renderPassSummary(result, copy)}
    </section>
    <h3>${copy.conversationSample}</h3>
    ${scenarioRows}
  </main>
</body>
</html>
`;
}

function renderFailures(
  failures: VoiceTestRunResult["scenarios"][number]["turns"][number]["failures"],
  copy: ReportCopy,
): string {
  if (failures.length === 0) {
    return "";
  }

  return failures
    .map(
      (failure) =>
        `<div class="failure"><strong>${copy.riskItemPrefix}: ${escapeHtml(failure.code)}</strong> · ${escapeHtml(
          failure.severity,
        )}<br />${escapeHtml(failure.message)}<div class="repair"><strong>${copy.repairLabel}</strong>: ${escapeHtml(
          copy.repairAdvice(failure.code),
        )}</div></div>`,
    )
    .join("");
}

function collectFailedTurns(result: VoiceTestRunResult): Array<{
  scenario: VoiceTestRunResult["scenarios"][number];
  turn: VoiceTestRunResult["scenarios"][number]["turns"][number];
}> {
  return result.scenarios.flatMap((scenario) =>
    scenario.turns
      .filter((turn) => turn.failures.length > 0)
      .map((turn) => ({
        scenario,
        turn,
      })),
  );
}

function runTimeSeconds(result: VoiceTestRunResult): string {
  const durationMs = Date.parse(result.finishedAt) - Date.parse(result.startedAt);
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "0.000";
  }

  return (durationMs / 1000).toFixed(3);
}

function renderRiskSummary(
  failedTurns: Array<{
    scenario: VoiceTestRunResult["scenarios"][number];
    turn: VoiceTestRunResult["scenarios"][number]["turns"][number];
  }>,
  copy: ReportCopy,
): string {
  if (failedTurns.length === 0) {
    return `<div class="insight"><h3>${copy.riskHeading}</h3><p class="muted">${copy.noRisk}</p></div>`;
  }

  return `<div class="insight"><h3>${copy.riskHeading}</h3><ul>${failedTurns
    .flatMap(({ scenario, turn }) =>
      turn.failures.map(
        (failure) =>
          `<li><strong>${escapeHtml(scenario.title)}</strong>：${escapeHtml(failure.message)}。${escapeHtml(
            copy.repairAdvice(failure.code),
          )}</li>`,
      ),
    )
    .join("")}</ul></div>`;
}

function renderPassSummary(result: VoiceTestRunResult, copy: ReportCopy): string {
  const passedTurns = result.scenarios.reduce(
    (count, scenario) => count + scenario.turns.filter((turn) => turn.passed).length,
    0,
  );

  return `<div class="insight"><h3>${copy.passedHeading}</h3><ul>${copy.passedSummary(result, passedTurns)}</ul></div>`;
}

function repairAdviceForZh(code: string): string {
  switch (code) {
    case "forbidden_pattern_matched":
      return "删除绝对承诺，改成“需要商家确认”“会尽量沟通和引导”。";
    case "expected_phrase_missing":
      return "补充价格、套餐、档期确认等商家资料引用，先回答客户当前问题。";
    case "lead_intent_mismatch":
      return "调整意图识别规则，让询价、档期、转人工分别落到正确分类。";
    case "lead_field_missing":
      return "在高意向对话中主动收集手机号、称呼或期望时间。";
    case "semantic_judge_failed":
      return "按评测理由复盘回复，收紧提示词、业务事实或转人工条件。";
    case "latency_exceeded":
      return "检查模型链路、网络和工具调用，必要时缩短上下文或使用更快模型。";
    default:
      return "复盘该轮对话，补充提示词或测试样例后重新体检。";
  }
}

function repairAdviceForEn(code: string): string {
  switch (code) {
    case "forbidden_pattern_matched":
      return "Remove absolute promises and route uncertain claims to human confirmation.";
    case "expected_phrase_missing":
      return "Answer the current customer question with configured package, price, or availability facts.";
    case "lead_intent_mismatch":
      return "Tune intent routing so pricing, availability, booking, and handoff land in the right bucket.";
    case "lead_field_missing":
      return "Ask for and extract the required lead field, such as phone, name, or preferred time.";
    case "semantic_judge_failed":
      return "Review the judge rationale, then tighten prompts, approved facts, or handoff rules.";
    case "latency_exceeded":
      return "Check model latency, network hops, and tool calls; shorten context or use a faster model if needed.";
    default:
      return "Review this turn, update the prompt or suite, and rerun the health check.";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}
