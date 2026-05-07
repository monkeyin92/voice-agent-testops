# Voice Agent TestOps 外部试点就绪复盘

日期：2026-05-07

## 当前结论

当前项目已经可以进入第一批外部开发者试点，但不应直接包装成完整商业 SaaS。

更准确的定位是：

> 可开源自助试跑、可用 HTTP bridge 接入真实 voice agent、可把失败沉淀成 regression 资产的试点 MVP。

现在最应该验证的不是“功能还能不能继续加”，而是：

- 外部团队能否在 30 分钟内接入自己的 agent。
- 失败报告是否能让工程、产品和客户都理解。
- 真实失败是否能在一周内沉淀成稳定 regression suite。
- 至少 1 个试点对象是否愿意持续使用或讨论付费。

## P0/P1/P2 能力映射

| 试点问题 | 已有能力 | 复盘判断 |
|---|---|---|
| 外部团队如何接入自己的 agent | HTTP bridge、OpenClaw adapter、Vapi/Retell/LiveKit/Pipecat 指南、`doctor` | 已足够支撑第一批手把手试点 |
| 如何写行业场景 | 房产、诊所、家装 starter；mock-data 指南；JSON Schema | 已足够支撑低监管高价值行业 |
| 为什么不是正则脚本 | `semantic_judge`、人工标注集、业务风险字段、工具/状态断言、音频 replay/voice metrics | 已有差异化，但仍需要真实失败样本验证稳定性 |
| 如何进入 CI | `run`、severity gate、baseline diff、JUnit/Markdown/HTML/JSON | 已足够支撑工程团队试跑 |
| 如何从真实失败变成资产 | `from-transcript`、`import-calls`、`draft-regressions`、失败聚类 | 已形成闭环，需要在真实试点中打磨 |
| 如何给客户复盘 | HTML report、PDF/PNG export、`pilot-report` commercial/recap Markdown | 已能生成试点交付物 |

## 30 分钟外部试点路径

目标对象：正在交付或维护 voice agent 的开发者、集成商、AI 客服团队，不优先找普通商家。

1. 选择一个行业 starter：

   ```bash
   npx voice-agent-testops init --industry real_estate --lang zh-CN --name "试点客户"
   ```

2. 让对方提供一个测试 endpoint，最小返回 `{ spoken, summary }`，推荐逐步补充 `{ tools, state, audio, voiceMetrics }`。

3. 先跑 `doctor`，排除接入问题：

   ```bash
   npx voice-agent-testops doctor \
     --agent http \
     --endpoint "$VOICE_AGENT_ENDPOINT" \
     --suite voice-testops/suite.json
   ```

4. 跑第一份报告：

   ```bash
   npx voice-agent-testops run \
     --agent http \
     --endpoint "$VOICE_AGENT_ENDPOINT" \
     --suite voice-testops/suite.json \
     --summary .voice-testops/summary.md \
     --junit .voice-testops/junit.xml \
     --fail-on-severity critical
   ```

5. 生成客户复盘交付物：

   ```bash
   npx voice-agent-testops pilot-report \
     --report .voice-testops/report.json \
     --commercial .voice-testops/commercial-report.md \
     --recap .voice-testops/pilot-recap.md \
     --customer "试点客户" \
     --period "第 1 次试跑"
   ```

6. 如果已有真实通话导出，用 `import-calls` 做抽样，并把高风险 transcript 交给 `from-transcript` 和 `draft-regressions`。

## Go / No-Go

### Go：可以开始外部试点

满足以下条件即可进入外部试点：

- 至少一个 HTTP / OpenClaw / Vapi / Retell 接入路径跑通。
- 对方能提供不含真实敏感信息的测试商家资料或脱敏生产通话。
- starter suite 至少覆盖 10 个高风险场景。
- `doctor` 通过。
- `run --fail-on-severity critical` 能生成 JSON、HTML、Markdown、JUnit。
- 至少一次失败能被转成 regression draft。
- 试点复盘能输出 `commercial-report.md` 和 `pilot-recap.md`。

### No-Go：不要承诺商用稳定

出现以下情况时，只能做内部演示或受控技术验证：

- 对方只能提供真实敏感通话，且没有脱敏流程。
- 对方没有稳定测试 endpoint，只能临时人工转发。
- 失败报告无法解释业务风险，只剩技术错误。
- semantic judge 结论和人工复核明显不一致。
- 无法把真实失败转成后续可重复运行的 suite。

## 阻塞缺口

这些缺口会影响第一批外部试点质量，应优先处理或在试点协议里明确边界：

1. 缺少标准化试点包。

   当前命令已经齐全，但还需要一份“给外部用户照着跑”的单页 runbook，把 endpoint contract、命令、产物和复盘方式放在一起。

2. 缺少真实用户试跑记录。

   现有能力来自内部设计和样例验证，还没有足够外部 agent 跑通记录。下一阶段的核心指标应是 3 个外部 agent 成功跑通。

3. 缺少脱敏约定模板。

   项目已支持从 transcript / call log 进入回归闭环，但外部试点必须先约定不提交身份证、完整地址、医疗隐私、客户真实姓名等敏感字段。

4. 缺少 judge 复核流程。

   `semantic_judge` 已可用，但每个新行业的前 20-50 条失败仍应人工复核，避免误判被当作商业结论。

## 非阻塞缺口

这些事项可以暂缓，不应阻挡外部试点：

- Web dashboard。
- 账号体系、团队权限、支付。
- 私有化部署包装。
- 全行业覆盖。
- 金融贷款深度合规包。
- 真实电话拨打、SIP、WebRTC 自动化。

原因：第一批验证的关键是“是否愿意接入并持续使用”，不是产品形态完整度。

## 下一步优先级

### P3-1：外部试点 runbook

产出一份面向外部开发者的单页指南：

- 适用对象。
- 10 分钟本地 demo。
- 30 分钟 HTTP 接入。
- endpoint request/response contract。
- 报告产物说明。
- 常见失败和修复。

当前文档：[外部试点 Runbook](external-pilot-runbook.zh-CN.md)。

### P3-2：试点数据脱敏和授权模板

产出一份试点前置文档：

- 可以提供哪些字段。
- 不应提供哪些字段。
- 如何替换真实姓名、电话、地址、病历、交易信息。
- 生成 report 后如何处理产物。

### P3-3：外部试跑记录表升级

把现有验证清单升级为可执行 tracking 表：

- 接入方式。
- 跑通耗时。
- 首次失败类型。
- 是否生成 regression。
- 是否愿意继续试点。

### P3-4：第一个真实试点复盘

目标不是新增功能，而是拿 1 个真实 endpoint 完整跑通：

- starter suite；
- bridge 接入；
- baseline；
- 真实失败导入；
- regression draft；
- commercial report；
- pilot recap。

## 验收命令和产物

每个外部试点至少保留这些命令和产物：

```bash
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops doctor --agent http --endpoint "$VOICE_AGENT_ENDPOINT" --suite voice-testops/suite.json
npx voice-agent-testops run --agent http --endpoint "$VOICE_AGENT_ENDPOINT" --suite voice-testops/suite.json --summary .voice-testops/summary.md --junit .voice-testops/junit.xml --fail-on-severity critical
npx voice-agent-testops pilot-report --report .voice-testops/report.json --commercial .voice-testops/commercial-report.md --recap .voice-testops/pilot-recap.md
```

必须产出：

- `.voice-testops/report.json`
- `.voice-testops/report.html`
- `.voice-testops/summary.md`
- `.voice-testops/junit.xml`
- `.voice-testops/commercial-report.md`
- `.voice-testops/pilot-recap.md`

如果有真实通话，还应产出：

- `.voice-testops/call-sample.json`
- `.voice-testops/call-sampling.md`
- `.voice-testops/call-transcripts/`
- `voice-testops/regression-draft.json`
- `.voice-testops/failure-clusters.md`

## 复盘结论

当前应进入外部试点验证，不应直接进入大规模商业版开发。

下一轮开发的正确方向是 P3：把已有能力包装成可复制的外部试点流程，并拿真实 agent 验证接入耗时、失败解释力和 regression 闭环。
