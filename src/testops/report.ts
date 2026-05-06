import type { VoiceTestRunResult } from "./runner";

export function renderJsonReport(result: VoiceTestRunResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderHtmlReport(result: VoiceTestRunResult): string {
  const failedTurns = result.scenarios.flatMap((scenario) =>
    scenario.turns
      .filter((turn) => turn.failures.length > 0)
      .map((turn) => ({
        scenario,
        turn,
      })),
  );
  const scenarioRows = result.scenarios
    .map(
      (scenario) => `
        <section class="scenario">
          <div class="scenario-heading">
            <div>
              <h2>${escapeHtml(scenario.title)}</h2>
              <p class="muted">${escapeHtml(scenario.id)} · ${scenario.turns.length} 轮对话</p>
            </div>
            <span class="status ${scenario.passed ? "ok" : "risk"}">${scenario.passed ? "通过" : "有风险"}</span>
          </div>
          <div class="conversation">
          ${scenario.turns
            .map(
              (turn) => `
                <article class="turn ${turn.passed ? "passed" : "failed"}">
                  <div class="turn-meta">第 ${turn.index + 1} 轮 · ${turn.latencyMs}ms · ${
                    turn.passed ? `通过 ${turn.assertions} 条断言` : `${turn.failures.length} 个风险`
                  }</div>
                  <div class="bubble customer"><span>客户</span><p>${escapeHtml(turn.user)}</p></div>
                  <div class="bubble agent"><span>智能语音</span><p>${escapeHtml(turn.assistant)}</p></div>
                  ${renderFailures(turn.failures)}
                </article>
              `,
            )
            .join("")}
          </div>
        </section>
      `,
    )
    .join("");
  const recommendation = result.passed ? "上线建议：可以进入小范围试点" : "上线建议：暂缓上线，先修复高风险对话";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.suiteName)} · 智能语音体检单</title>
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
          <p class="eyebrow">智能语音体检单</p>
          <h1>${escapeHtml(result.suiteName)}</h1>
          <p class="muted">检测时间：${escapeHtml(result.startedAt)} - ${escapeHtml(result.finishedAt)}</p>
          <div class="recommendation ${result.passed ? "ok" : "risk"}">${recommendation}</div>
        </div>
        <div class="summary">
          <div class="metric"><span>场景</span><strong>${result.summary.scenarios}</strong><span>${result.summary.scenarios} 个场景</span></div>
          <div class="metric"><span>对话</span><strong>${result.summary.turns}</strong><span>${result.summary.turns} 轮</span></div>
          <div class="metric"><span>断言</span><strong>${result.summary.assertions}</strong><span>${result.summary.assertions} 条断言</span></div>
          <div class="metric"><span>风险</span><strong>${result.summary.failures}</strong><span>${result.summary.failures} 个失败</span></div>
        </div>
      </div>
    </section>
    <section class="insights">
      ${renderRiskSummary(failedTurns)}
      ${renderPassSummary(result)}
    </section>
    <h3>对话抽样</h3>
    ${scenarioRows}
  </main>
</body>
</html>
`;
}

function renderFailures(failures: VoiceTestRunResult["scenarios"][number]["turns"][number]["failures"]): string {
  if (failures.length === 0) {
    return "";
  }

  return failures
    .map(
      (failure) =>
        `<div class="failure"><strong>风险项：${escapeHtml(failure.code)}</strong> · ${escapeHtml(
          failure.severity,
        )}<br />${escapeHtml(failure.message)}<div class="repair"><strong>建议修复话术</strong>：${escapeHtml(
          repairAdviceFor(failure.code),
        )}</div></div>`,
    )
    .join("");
}

function renderRiskSummary(
  failedTurns: Array<{
    scenario: VoiceTestRunResult["scenarios"][number];
    turn: VoiceTestRunResult["scenarios"][number]["turns"][number];
  }>,
): string {
  if (failedTurns.length === 0) {
    return `<div class="insight"><h3>风险项</h3><p class="muted">本次未发现高风险回复。继续用更多真实客户问题做回归，可以逐步扩大试点范围。</p></div>`;
  }

  return `<div class="insight"><h3>风险项</h3><ul>${failedTurns
    .flatMap(({ scenario, turn }) =>
      turn.failures.map(
        (failure) =>
          `<li><strong>${escapeHtml(scenario.title)}</strong>：${escapeHtml(failure.message)}。${escapeHtml(
            repairAdviceFor(failure.code),
          )}</li>`,
      ),
    )
    .join("")}</ul></div>`;
}

function renderPassSummary(result: VoiceTestRunResult): string {
  const passedTurns = result.scenarios.reduce(
    (count, scenario) => count + scenario.turns.filter((turn) => turn.passed).length,
    0,
  );

  return `<div class="insight"><h3>通过项</h3><ul><li>${result.summary.scenarios} 个场景完成体检。</li><li>${passedTurns} 轮对话通过断言。</li><li>${result.summary.assertions} 条断言用于检查价格、档期、转人工、留资和安全边界。</li></ul></div>`;
}

function repairAdviceFor(code: string): string {
  switch (code) {
    case "forbidden_pattern_matched":
      return "删除绝对承诺，改成“需要商家确认”“会尽量沟通和引导”。";
    case "expected_phrase_missing":
      return "补充价格、套餐、档期确认等商家资料引用，先回答客户当前问题。";
    case "lead_intent_mismatch":
      return "调整意图识别规则，让询价、档期、转人工分别落到正确分类。";
    case "lead_field_missing":
      return "在高意向对话中主动收集手机号、称呼或期望时间。";
    case "latency_exceeded":
      return "检查模型链路、网络和工具调用，必要时缩短上下文或使用更快模型。";
    default:
      return "复盘该轮对话，补充提示词或测试样例后重新体检。";
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
