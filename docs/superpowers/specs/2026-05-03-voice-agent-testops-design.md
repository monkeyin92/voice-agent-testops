# Voice Agent TestOps 产品设计

日期：2026-05-03  
状态：MVP 已落地  
目标阶段：开发者可试用 MVP

## 1. 定位

Voice Agent TestOps 是 AI 语音 Agent 的自动化测试、评测与报告工具。它不做完整客服平台，也不替代 OpenClaw、Vapi、Retell 或 FreeSWITCH，而是测试这些系统构建出来的 Agent 是否能稳定上线。

一句话：

> 用场景脚本自动和语音 Agent 对话，检查延迟、话术安全、字段收集、意图识别和业务承诺，并生成可分享报告。

## 2. 目标用户

第一阶段目标用户是技术团队：

- 正在用 OpenClaw 或其他平台做 voice agent 的开发者。
- 给客户交付 AI 语音客服的集成商。
- 企业内部客服、呼叫中心和 AI 平台团队。

不优先服务普通小商家。小商家接待 MVP 只作为 demo agent 和场景样本保留。

## 3. MVP 范围

已落地的第一版包含：

- JSON 场景 DSL：定义商家资料、用户轮次和断言。
- 断言类型：
  - `must_contain_any`
  - `must_not_match`
  - `max_latency_ms`
  - `lead_field_present`
  - `lead_intent`
- Agent adapter：
  - `local-receptionist`：复用当前仓库的小红书接待 demo agent。
  - `http`：对任意 HTTP voice/text agent 发起测试。
- Runner：按场景逐轮执行 agent，记录延迟、回复、摘要和失败原因。
- 报告：
  - JSON 报告。
  - HTML 报告。
- CLI：
  - `npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json`

第一版暂不做：

- 真实音频注入。
- WebSocket 流式音频。
- 电话呼叫。
- 线上抽样监控。
- 用户登录、计费、团队权限。

这些能力都应作为 adapter 或 SaaS 层追加，不进入第一版核心。

## 4. 架构

```text
Suite JSON
  -> Schema Validation
  -> Agent Adapter
      -> local receptionist demo
      -> HTTP endpoint
  -> Test Runner
  -> Assertions
  -> JSON / HTML Report
```

核心边界：

- `schema` 只负责校验测试定义。
- `agents` 只定义被测 agent 的标准接口。
- `adapters` 只把不同 agent 入口适配到标准接口。
- `runner` 只负责编排对话和评估断言。
- `report` 只负责输出结果。
- `cli` 只负责文件、参数、adapter 选择和进程退出码。

## 5. 数据流

1. 开发者编写 suite JSON。
2. CLI 读取 suite 并做 Zod 校验。
3. Runner 为每个 scenario 创建测试商家和消息上下文。
4. 每个用户 turn 调用 agent adapter。
5. Runner 记录响应延迟和 assistant 回复。
6. Runner 对当前 turn 执行断言。
7. CLI 输出 JSON 和 HTML 报告。
8. 如果有失败，CLI 返回非 0 退出码，可接入 CI。

## 6. 失败模型

每个失败包含：

- `code`：机器可读失败码。
- `message`：人类可读原因。
- `severity`：`critical`、`major` 或 `minor`。

第一版只要有任一失败就判定 run 失败。后续可以允许按 severity 配置发布门禁。

## 7. 推广样例

当前 demo suite 使用原小红书接待 agent，验证两个真实问题：

- 客户询价时只能引用配置价格，不能乱说最低价或保证。
- 客户问档期时必须提示商家确认，不能直接承诺。

这使旧 MVP 不再是要继续卖给商家的产品，而是 TestOps 的被测样例。

## 8. 后续路线

下一阶段建议：

1. 增加 OpenClaw adapter。
2. 增加 WebSocket/stream adapter。
3. 增加场景生成器：从录音、转写或客服 SOP 自动生成 suite。
4. 增加线上抽样监控：失败自动生成回归场景。
5. 增加 dashboard：趋势、失败聚类、agent 版本对比。
6. 增加中文 benchmark 场景库。

## 9. 验证

本设计已通过以下本地验证：

- `npm test -- tests/testops/schema.test.ts tests/testops/runner.test.ts tests/testops/report.test.ts`
- `npm test -- tests/testops/cliArgs.test.ts`
- `npm test`
- `npm run voice-test -- --suite examples/voice-testops/xhs-receptionist-suite.json`
- `npm run build`
