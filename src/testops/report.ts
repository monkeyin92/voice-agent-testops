import type { VoiceTestRunResult } from "./runner";

export function renderJsonReport(result: VoiceTestRunResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function renderHtmlReport(result: VoiceTestRunResult): string {
  const scenarioRows = result.scenarios
    .map(
      (scenario) => `
        <section class="scenario ${scenario.passed ? "passed" : "failed"}">
          <h2>${escapeHtml(scenario.title)}</h2>
          <p class="muted">${escapeHtml(scenario.id)} · ${scenario.passed ? "passed" : "failed"}</p>
          ${scenario.turns
            .map(
              (turn) => `
                <article class="turn ${turn.passed ? "passed" : "failed"}">
                  <div class="turn-meta">Turn ${turn.index + 1} · ${turn.latencyMs}ms · ${turn.failures.length} failed</div>
                  <p><strong>User</strong> ${escapeHtml(turn.user)}</p>
                  <p><strong>Agent</strong> ${escapeHtml(turn.assistant)}</p>
                  ${renderFailures(turn.failures)}
                </article>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.suiteName)} · Voice Agent TestOps</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #182026; background: #f6f7f8; }
    main { max-width: 1080px; margin: 0 auto; padding: 32px 20px 56px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    h2 { margin: 0; font-size: 20px; }
    .muted { color: #65717c; }
    .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
    .metric, .scenario, .turn { border: 1px solid #d9dee3; border-radius: 8px; background: #fff; }
    .metric { padding: 16px; }
    .metric span { display: block; color: #65717c; font-size: 13px; }
    .metric strong { display: block; margin-top: 6px; font-size: 26px; }
    .scenario { padding: 18px; margin-top: 16px; }
    .turn { padding: 14px; margin-top: 12px; }
    .failed { border-color: #d96b5f; }
    .passed { border-color: #8dbb8d; }
    .turn-meta { color: #65717c; font-size: 13px; }
    .failure { margin: 8px 0 0; padding: 10px; border-radius: 6px; background: #fff0ee; color: #8a2b20; }
    @media (max-width: 760px) { .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(result.suiteName)}</h1>
    <p class="muted">${result.passed ? "passed" : "failed"} · ${escapeHtml(result.startedAt)} - ${escapeHtml(result.finishedAt)}</p>
    <div class="summary">
      <div class="metric"><span>Scenarios</span><strong>${result.summary.scenarios}</strong></div>
      <div class="metric"><span>Turns</span><strong>${result.summary.turns}</strong></div>
      <div class="metric"><span>Assertions</span><strong>${result.summary.assertions}</strong></div>
      <div class="metric"><span>Failures</span><strong>${result.summary.failures} failed</strong></div>
    </div>
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
        `<div class="failure"><strong>${escapeHtml(failure.code)}</strong> · ${escapeHtml(failure.severity)}<br />${escapeHtml(
          failure.message,
        )}</div>`,
    )
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
