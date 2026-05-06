# Voice Agent TestOps

[![Voice Agent TestOps](https://img.shields.io/badge/Voice%20Agent-TestOps-285f9f)](https://github.com/monkeyin92/voice-agent-testops)
[![npm version](https://img.shields.io/npm/v/voice-agent-testops?color=cb3837)](https://www.npmjs.com/package/voice-agent-testops)
[![CI](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml/badge.svg)](https://github.com/monkeyin92/voice-agent-testops/actions/workflows/voice-testops.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933)](https://nodejs.org/)

[English](README.md) · [中文](README.zh-CN.md)

**Voice Agent TestOps 是给语音 Agent 上线前用的回归测试工具。**

它会按照场景脚本自动和你的 Agent 对话，然后检查那些最容易在真实客户面前出事故的地方：乱报价、乱承诺、漏收手机号、转人工意图识别错误、响应太慢。

它不是语音 Agent 框架，也不替代 OpenClaw、Vapi、Retell、LiveKit、Pipecat 或 Twilio。它更像一条上线前的安全绳：你的 Agent 可以自由变强，但每次变更都要先跑过高风险场景。

[30 秒试跑](#30-秒试跑) · [场景库](#场景库) · [生成 Mock 数据](#生成-mock-数据) · [接入真实-agent](#接入真实-agent) · [把真实失败对话变成回归测试](#把真实失败对话变成回归测试) · [场景格式](#场景格式)

![Voice Agent TestOps 中文报告预览](docs/assets/report-preview-zh-CN.png)

## 为什么值得做

语音 Agent 的问题往往不是“不会回答”，而是“回答得太自信”。

客户问价格，它编了一个不存在的最低价。客户问档期，它直接说可以来。客户给了电话，它话术里说会记录，结构化摘要却没有 `phone`。这些问题如果等到真实商家或真实客户发现，成本就已经发生了。

Voice Agent TestOps 的目标很朴素：

- 把高风险客户问题写成测试场景。
- 每次改 prompt、模型、workflow 或工具调用后自动跑一遍。
- 输出开发者能看懂的 JSON，也输出老板和客户能看懂的 HTML/PDF 报告。

## 能抓什么问题

| 风险 | 失败例子 | 断言 |
|---|---|---|
| 乱报价 | “这是全网最低价，保证。” | `must_not_match` |
| 漏事实 | Agent 没有引用配置里的 `599-1299` 价格范围 | `must_contain_any` |
| 漏线索 | 客户给了手机号，摘要里没有 `phone` | `lead_field_present` |
| 意图错分 | 要求转人工却被分类成 `pricing` | `lead_intent` |
| 响应太慢 | 单轮回复耗时 12 秒 | `max_latency_ms` |

## 30 秒试跑

先生成一个 starter suite，不需要任何 API key：

```bash
npx voice-agent-testops init
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops run --suite voice-testops/suite.json
```

如果要接入真实 HTTP Agent，可以直接生成带 CI 的模板：

```bash
npx voice-agent-testops init --stack http --name "Lumen Portrait Studio" --with-ci
```

想换行业或语言，可以直接从 mock 模板开始：

```bash
npx voice-agent-testops list --lang zh-CN
npx voice-agent-testops init --industry restaurant --lang zh-CN --name "云栖小馆"
```

生成面向商家演示的报告：

```bash
npx voice-agent-testops run --suite examples/voice-testops/photo-studio-multiturn-suite.json
npm run report:export
```

你会得到：

- `.voice-testops/report.json`：给 CI 和自动化流程用
- `.voice-testops/report.html`：给开发调试和现场讲解用
- `.voice-testops/report.pdf`：给客户、老板、试点复盘用
- `.voice-testops/report.png`：给微信群、飞书、社群快速预览

## 场景库

公开 examples 按中英文成对维护。每个行业都有中文和英文 suite，风险结构一致，方便同时服务本地商家和海外开发者。

| 行业 | 中文 suite | 英文 suite | 覆盖风险 |
|---|---|---|---|
| 牙科诊所 | [chinese-dental-clinic-suite.json](examples/voice-testops/chinese-dental-clinic-suite.json) | [english-dental-clinic-suite.json](examples/voice-testops/english-dental-clinic-suite.json) | 疗效承诺、医生排班、手机号留资 |
| 餐厅订位 | [chinese-restaurant-booking-suite.json](examples/voice-testops/chinese-restaurant-booking-suite.json) | [english-restaurant-booking-suite.json](examples/voice-testops/english-restaurant-booking-suite.json) | 未确认桌态、低消编造、订位信息 |
| 房产经纪 | [chinese-real-estate-agent-suite.json](examples/voice-testops/chinese-real-estate-agent-suite.json) | [english-real-estate-agent-suite.json](examples/voice-testops/english-real-estate-agent-suite.json) | 收益承诺、房源状态、看房留资 |

也可以在终端里直接浏览：

```bash
npx voice-agent-testops list
npx voice-agent-testops list --lang zh-CN
npx voice-agent-testops list --industry restaurant
```

## 生成 Mock 数据

这些 examples 不是随手写的演示 JSON，而是从一套固定方法生成：先写商家事实，再写高风险客户问题，最后把“必须回答什么、不能承诺什么、必须收集什么线索”变成断言。这样 mock 数据可解释、可审核，也方便替换成真实商家的资料。

```bash
npx voice-agent-testops init --industry restaurant --lang zh-CN --name "云栖小馆"
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops run --suite voice-testops/suite.json
```

目前内置 starter 行业包括 `photography`、`dental_clinic`、`restaurant`、`real_estate`；语言支持 `en` 和 `zh-CN`。

更完整的生成方法见 [Mock 数据指南](docs/guides/mock-data.zh-CN.md)：它会讲清楚如何从商家资料做出自己的 suite，而不是只能照抄仓库里有限的 examples。

## 接入真实 Agent

### 通用 HTTP Agent

先跑一个本地示例服务：

```bash
npm run example:http-agent
```

另开一个终端运行测试：

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn
```

示例代码在 [examples/http-agent-server/server.mjs](examples/http-agent-server/server.mjs)。真正接入时，把里面的 `createTestAgentResponse()` 换成你自己的 Agent 调用即可。

通用 HTTP endpoint 接收一轮测试输入，并返回 `{ spoken, summary }`。`spoken` 必填，`summary` 可选；如果返回结构化摘要，留资和意图断言会更有价值。

### OpenClaw-compatible Endpoint

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "$OPENCLAW_AGENT_URL" \
  --api-key "$OPENCLAW_API_KEY" \
  --openclaw-mode responses
```

本地 OpenClaw Gateway 的启动方式见 [docs/ops/openclaw-docker.md](docs/ops/openclaw-docker.md)。

## 集成文档

这些文档默认用英文，方便国外开发者直接阅读和转发；中文 README 保留入口，便于国内用户快速找到对应接入方式。

- [HTTP](docs/integrations/http.md)：最通用的 `POST /test-turn` 接入方式
- [OpenClaw](docs/integrations/openclaw.md)：直接测试 `/v1/responses` 兼容端点
- [Vapi](docs/integrations/vapi.md)：用 test-turn bridge 覆盖 Vapi 背后的 prompt、工具和留资逻辑
- [Retell](docs/integrations/retell.md)：用 custom LLM / app server bridge 跑回归
- [LiveKit Agents](docs/integrations/livekit.md)：把实时房间背后的决策层接入 CI
- [Pipecat](docs/integrations/pipecat.md)：把 pipeline 的业务回复层变成可重复测试的 HTTP bridge

## 把真实失败对话变成回归测试

如果你已经遇到过一次真实失败，把 transcript 保存成文本文件，然后生成一个可编辑的 suite：

```bash
npx voice-agent-testops from-transcript \
  --transcript examples/voice-testops/transcripts/failed-photo-booking.txt \
  --merchant examples/voice-testops/merchants/guangying-photo.json \
  --out examples/voice-testops/generated-transcript-suite.json \
  --name "Generated transcript regression" \
  --source website
```

这个生成器不调用 LLM，只做确定性规则提取：客户轮次、乱承诺拦截、价格事实、留资字段、转人工意图和延迟断言。生成结果应该先人工检查，再放进 CI 作为上线门禁。

## 场景格式

Suite 就是 JSON。它描述商家资料、客户对话，以及每一轮必须满足的断言。

```json
{
  "name": "写真馆上线前体检",
  "scenarios": [
    {
      "id": "pricing",
      "title": "客户询价时不能乱承诺",
      "source": "website",
      "merchantRef": "merchants/guangying-photo.json",
      "turns": [
        {
          "user": "单人写真多少钱，能保证拍得好看吗",
          "expect": [
            { "type": "must_contain_any", "phrases": ["599", "1299"] },
            { "type": "must_not_match", "pattern": "最低价|百分百|保证拍得好看" },
            { "type": "lead_intent", "intent": "pricing" },
            { "type": "max_latency_ms", "value": 25000 }
          ]
        }
      ]
    }
  ]
}
```

## 常用命令

CI 里可以用 `--fail-on-severity critical` 只阻断高危失败。这样轻微文案漂移会留在报告里，但不会和乱报价、漏手机号、错误转人工这类上线事故混在一起。

```bash
npx voice-agent-testops run \
  --suite examples/voice-testops/chinese-risk-suite.json \
  --fail-on-severity critical
```

```bash
npm test
npm run build
npm audit --audit-level=high
```

## 它适合谁

- 正在做 voice agent 的开发者
- 给商家交付 AI 客服、电话机器人、实时语音助手的团队
- 想把 prompt / workflow 变更纳入 CI 的工程团队
- 想向客户解释“为什么这个 Agent 可以上线”的集成商

如果你正在做真实语音 Agent，欢迎拿一个测试 endpoint 跑一下。最有价值的反馈不是“看起来不错”，而是“我的 Agent 在这个场景里失败了，原因是这里”。这正是这个项目想捕捉的东西。

## 更多文档

- [贡献指南](CONTRIBUTING.md)
- [Mock 数据指南](docs/guides/mock-data.zh-CN.md)
- [HTTP Agent 接入](docs/integrations/http.md)
- [OpenClaw 接入](docs/integrations/openclaw.md)
- [Vapi 接入](docs/integrations/vapi.md)
- [Retell 接入](docs/integrations/retell.md)
- [LiveKit Agents 接入](docs/integrations/livekit.md)
- [Pipecat 接入](docs/integrations/pipecat.md)
