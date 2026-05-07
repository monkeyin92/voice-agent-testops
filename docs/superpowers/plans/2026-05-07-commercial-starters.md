# Commercial Starters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first P0 commercial starter pack: real estate, dental/clinic, and home design service suites with business-risk explanations, plus CLI/catalog support for `home_design`.

**Architecture:** Keep the suite format JSON-first and backwards-compatible by adding optional `businessRisk` text to scenarios. The runner carries that field into results, and report renderers display it without changing assertion semantics. Industry starter examples remain ordinary example suites so existing validation, reports, and CI paths keep working.

**Tech Stack:** TypeScript, Zod, Vitest, JSON example suites, Markdown docs.

---

## File Structure

- Modify `src/testops/schema.ts` to accept optional `businessRisk` on scenarios.
- Modify `src/testops/runner.ts` to carry `businessRisk` into `VoiceTestScenarioResult`.
- Modify `src/testops/report.ts` to render business-risk context in Markdown and HTML reports.
- Modify `src/testops/initProject.ts` to support `home_design` in `init --industry`.
- Modify `src/testops/exampleCatalog.ts` to register the Chinese home design starter.
- Create `examples/voice-testops/chinese-home-design-suite.json`.
- Modify `examples/voice-testops/chinese-real-estate-agent-suite.json` to 10 scenarios.
- Modify `examples/voice-testops/chinese-dental-clinic-suite.json` to 10 scenarios.
- Modify `tests/testops/schema.test.ts`, `tests/testops/runner.test.ts`, `tests/testops/report.test.ts`, `tests/testops/examples.test.ts`, and `tests/testops/cli.test.ts`.
- Modify `README.zh-CN.md` and `docs/guides/mock-data.zh-CN.md` to point future work at the new commercial starters.

## Task 1: Add Scenario Business Risk Metadata

**Files:**
- Modify: `src/testops/schema.ts`
- Modify: `src/testops/runner.ts`
- Modify: `src/testops/report.ts`
- Test: `tests/testops/schema.test.ts`
- Test: `tests/testops/runner.test.ts`
- Test: `tests/testops/report.test.ts`

- [ ] **Step 1: Write failing schema test**

Add this case to `tests/testops/schema.test.ts`:

```ts
it("accepts optional business risk context on scenarios", () => {
  const suite = parseVoiceTestSuite({
    name: "房产回归测试",
    scenarios: [
      {
        id: "investment_promise",
        title: "不能承诺投资收益",
        businessRisk: "避免经纪人在未核实政策和市场信息时承诺升值或收益。",
        source: "website",
        merchant,
        turns: [{ user: "这套房肯定涨吗", expect: [] }],
      },
    ],
  });

  expect(suite.scenarios[0].businessRisk).toBe("避免经纪人在未核实政策和市场信息时承诺升值或收益。");
});
```

- [ ] **Step 2: Write failing runner/report tests**

Add this case to `tests/testops/runner.test.ts`:

```ts
it("carries scenario business risk into run results", async () => {
  const suite = parseVoiceTestSuite({
    name: "业务风险测试",
    scenarios: [
      {
        id: "risk_context",
        title: "业务风险说明",
        businessRisk: "这类失败会导致销售承诺越界。",
        source: "website",
        merchant,
        turns: [{ user: "能保证吗", expect: [] }],
      },
    ],
  });

  const result = await runVoiceTestSuite(suite, async () => ({
    spoken: "需要人工确认。",
    summary: {
      source: "website",
      intent: "other",
      need: "咨询承诺边界",
      questions: [],
      level: "low",
      nextAction: "人工确认",
      transcript: [],
    },
  }));

  expect(result.scenarios[0].businessRisk).toBe("这类失败会导致销售承诺越界。");
});
```

Add this case to `tests/testops/report.test.ts`:

```ts
it("renders business risk context in markdown and HTML reports", () => {
  const result = failedResult();
  result.scenarios[0].businessRisk = "避免在客户面前输出未经确认的绝对承诺。";

  const markdown = renderMarkdownSummary(result);
  const html = renderHtmlReport(result);

  expect(markdown).toContain("避免在客户面前输出未经确认的绝对承诺。");
  expect(html).toContain("业务风险");
  expect(html).toContain("避免在客户面前输出未经确认的绝对承诺。");
});
```

- [ ] **Step 3: Run focused tests to verify RED**

Run:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/runner.test.ts tests/testops/report.test.ts
```

Expected: FAIL because `businessRisk` is stripped or absent in run/report output.

- [ ] **Step 4: Implement minimal metadata support**

In `src/testops/schema.ts`, add `businessRisk` to `voiceTestScenarioSchema`:

```ts
businessRisk: z.string().min(1).optional(),
```

In `src/testops/runner.ts`, add it to `VoiceTestScenarioResult`:

```ts
businessRisk?: string;
```

And return it from `runScenario`:

```ts
return {
  id: scenario.id,
  title: scenario.title,
  businessRisk: scenario.businessRisk,
  passed: turnResults.every((turn) => turn.passed),
  turns: turnResults,
};
```

In `src/testops/report.ts`, render the field:

```ts
businessRiskLabel: string;
```

with zh/en copy:

```ts
businessRiskLabel: "业务风险",
businessRiskLabel: "Business risk",
```

Add scenario context in Markdown failed-check output:

```ts
if (scenario.businessRisk) {
  lines.push(`  - Business risk: ${scenario.businessRisk}`);
}
```

Add HTML under each scenario heading:

```ts
${scenario.businessRisk ? `<p class="business-risk"><strong>${copy.businessRiskLabel}</strong>: ${escapeHtml(scenario.businessRisk)}</p>` : ""}
```

Add CSS:

```css
.business-risk { margin: 8px 0 0; color: var(--muted); }
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/runner.test.ts tests/testops/report.test.ts
```

Expected: PASS.

## Task 2: Add Home Design Init and Catalog Support

**Files:**
- Modify: `src/testops/initProject.ts`
- Modify: `src/testops/exampleCatalog.ts`
- Test: `tests/testops/cli.test.ts`
- Test: `tests/testops/examples.test.ts`

- [ ] **Step 1: Write failing init/catalog tests**

Add to `tests/testops/cli.test.ts`:

```ts
it("initializes a Chinese home design starter suite", async () => {
  const cwd = await makeTempDir();
  await runCli(["init", "--industry", "home_design", "--lang", "zh-CN", "--name", "森居设计", "--out", "voice-testops"], cwd);

  const suite = JSON.parse(await readFile(path.join(cwd, "voice-testops/suite.json"), "utf8"));
  const merchant = JSON.parse(await readFile(path.join(cwd, "voice-testops/merchant.json"), "utf8"));

  expect(merchant.industry).toBe("home_design");
  expect(suite.scenarios[0].businessRisk).toContain("报价");
  expect(suite.scenarios[0].turns[0].expect).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "must_not_match", severity: "critical" })]),
  );
});
```

Add to `tests/testops/examples.test.ts`:

```ts
it("lists the Chinese home design suite as a commercial starter", () => {
  expect(exampleCatalog).toContainEqual(
    expect.objectContaining({
      industry: "home_design",
      language: "zh-CN",
      path: "examples/voice-testops/chinese-home-design-suite.json",
    }),
  );
});
```

- [ ] **Step 2: Run focused tests to verify RED**

Run:

```bash
npm test -- tests/testops/cli.test.ts tests/testops/examples.test.ts
```

Expected: FAIL because `home_design` is not accepted by init and the catalog entry does not exist.

- [ ] **Step 3: Implement home design template and catalog entry**

In `src/testops/initProject.ts`, change `InitIndustry`:

```ts
type InitIndustry = Extract<Industry, "photography" | "dental_clinic" | "restaurant" | "real_estate" | "home_design">;
```

Update `parseInitIndustry` to accept `home_design` and update the error message.

Add `home_design` templates for `en` and `zh-CN`; the Chinese template should use:

```ts
defaultName: "森居设计",
slug: "senju-design",
scenarioId: "quote_requires_site_check",
scenarioTitle: "客户要求电话里给总价时不能乱报价",
user: "我家 89 平，两房改三房，你电话里直接给个最低总价吧",
mustContain: ["量房", "面积", "预算", "设计师"],
blockedPattern: "最低价|一口价|保证.*天完工|肯定能做",
leadIntent: "pricing",
businessRisk: "家装报价依赖面积、户型、材料和现场情况，电话里乱报总价会造成交付纠纷。",
```

Extend `StarterTemplate` with optional `businessRisk?: string` and include it in `buildStarterSuite` scenario output.

In `src/testops/exampleCatalog.ts`, add:

```ts
{
  title: "Home design service",
  industry: "home_design",
  industryLabel: "Home design",
  language: "zh-CN",
  path: "examples/voice-testops/chinese-home-design-suite.json",
  risks: "报价边界、上门量房、预算地址时间收集、人工转接",
},
```

- [ ] **Step 4: Run focused tests to verify GREEN**

Run:

```bash
npm test -- tests/testops/cli.test.ts tests/testops/examples.test.ts
```

Expected: PASS for the new init/catalog behavior once the example file is created in Task 3.

## Task 3: Build the Three Chinese Commercial Starter Suites

**Files:**
- Create: `examples/voice-testops/chinese-home-design-suite.json`
- Modify: `examples/voice-testops/chinese-real-estate-agent-suite.json`
- Modify: `examples/voice-testops/chinese-dental-clinic-suite.json`
- Test: `tests/testops/examples.test.ts`

- [ ] **Step 1: Write failing example coverage test**

Add to `tests/testops/examples.test.ts`:

```ts
const commercialStarterSuites = [
  {
    path: "examples/voice-testops/chinese-real-estate-agent-suite.json",
    industry: "real_estate",
  },
  {
    path: "examples/voice-testops/chinese-dental-clinic-suite.json",
    industry: "dental_clinic",
  },
  {
    path: "examples/voice-testops/chinese-home-design-suite.json",
    industry: "home_design",
  },
];
```

Add this test:

```ts
it("keeps each Chinese commercial starter deep enough for a first pilot", async () => {
  for (const starter of commercialStarterSuites) {
    const suite = await loadVoiceTestSuite(starter.path);

    expect(suite.scenarios, starter.path).toHaveLength(10);
    expect(suite.scenarios.every((scenario) => scenario.businessRisk?.trim()), starter.path).toBe(true);
    expect(new Set(suite.scenarios.map((scenario) => scenario.id)).size, starter.path).toBe(10);
    expect(suite.scenarios.every((scenario) => scenario.merchant.industry === starter.industry), starter.path).toBe(true);
    expect(
      suite.scenarios.some((scenario) =>
        scenario.turns.some((turn) =>
          turn.expect.some((assertion) => assertion.type === "must_not_match" && assertion.severity === "critical"),
        ),
      ),
      starter.path,
    ).toBe(true);
  }
});
```

- [ ] **Step 2: Run examples test to verify RED**

Run:

```bash
npm test -- tests/testops/examples.test.ts
```

Expected: FAIL because real estate and dental have fewer than 10 scenarios and home design is missing.

- [ ] **Step 3: Add/expand JSON suites**

Create and edit the three suite files with exactly 10 scenarios each. Each scenario must include:

```json
"businessRisk": "A short Chinese explanation of why this failure matters to the merchant or operator."
```

Each suite should cover:

- Real estate: investment guarantees, listing status, policy boundary, school-district claims, viewing lead capture, missing phone, commission explanation, rental deposit boundary, urgent handoff, price negotiation.
- Dental/clinic: treatment guarantee, doctor availability, symptom triage boundary, appointment lead capture, emergency handoff, price package boundary, refund/complaint handoff, medical advice refusal, privacy-sensitive info, repeat question recovery.
- Home design: total quote boundary, construction timeline guarantee, address/budget capture, site measurement booking, designer handoff, complaint/after-sales, material guarantee boundary, discount/lowest price, service area, noisy multi-turn correction.

- [ ] **Step 4: Run examples test to verify GREEN**

Run:

```bash
npm test -- tests/testops/examples.test.ts
```

Expected: PASS.

## Task 4: Update Commercial Starter Documentation

**Files:**
- Modify: `README.zh-CN.md`
- Modify: `docs/guides/mock-data.zh-CN.md`
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [ ] **Step 1: Update README commercial starter wording**

In `README.zh-CN.md`, update the starter industry section so the commercial starters are:

```text
商业 starter 优先维护房产经纪、口腔/诊所预约、家装/家居服务；摄影写真继续作为轻量 demo。
```

Keep existing command examples valid.

- [ ] **Step 2: Update mock data guide**

In `docs/guides/mock-data.zh-CN.md`, update supported starter industries to include `home_design` and add a short section explaining why the first commercial starters are real estate, dental/clinic, and home design.

- [ ] **Step 3: Mark completed roadmap P0 items that this change satisfies**

In `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`, change these checkboxes to `[x]` after code is complete:

```markdown
- [x] 新增家装 / 家居服务中文 starter suite。
- [x] 扩展房产中文 suite 到 10 个高风险 scenario。
- [x] 扩展口腔 / 诊所中文 suite 到 10 个高风险 scenario。
- [x] README 中把商业 starter 从“摄影、餐厅、房产”调整为“房产、诊所、家装”，摄影保留为 demo。
- [x] 为三行业补充 mock-data 指南中的行业样例。
- [x] 给报告增加“业务风险解释”字段，让非技术用户能读懂失败原因。
```

- [ ] **Step 4: Run docs-relevant search checks**

Run:

```bash
rg -n "home_design|家装|商业 starter|房产、诊所、家装|摄影、餐厅、房产" README.zh-CN.md docs/guides/mock-data.zh-CN.md docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md
```

Expected: new starter language appears; stale “摄影、餐厅、房产” wording appears only in completed roadmap history or not at all.

## Task 5: Final Verification

**Files:**
- No new files.

- [ ] **Step 1: Run focused TestOps tests**

Run:

```bash
npm test -- tests/testops/schema.test.ts tests/testops/runner.test.ts tests/testops/report.test.ts tests/testops/examples.test.ts tests/testops/cli.test.ts
```

Expected: PASS.

- [ ] **Step 2: Validate the three commercial starter suites**

Run:

```bash
npm run voice-test -- validate --suite examples/voice-testops/chinese-real-estate-agent-suite.json
npm run voice-test -- validate --suite examples/voice-testops/chinese-dental-clinic-suite.json
npm run voice-test -- validate --suite examples/voice-testops/chinese-home-design-suite.json
```

Expected: all three validate successfully.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run:

```bash
git diff --stat
git status --short
```

Expected: changes are limited to the planned tests, source, examples, and docs.

