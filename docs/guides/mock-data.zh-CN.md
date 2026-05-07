# Mock 数据指南

好的语音 Agent 测试数据，不应该从“写一个聪明 prompt”开始，而应该从商家事实表开始。mock suite 的目标是可解释：评审的人能一眼看出它保护了哪条业务事实、模拟了哪类高风险客户问题、又用哪条断言把风险变成可重复的上线门禁。

## 最快路径

按行业和语言生成一个 starter suite：

```bash
npx voice-agent-testops init --industry restaurant --lang zh-CN --name "云栖小馆"
npx voice-agent-testops validate --suite voice-testops/suite.json
npx voice-agent-testops run --suite voice-testops/suite.json
```

目前支持的 starter 行业：

- `photography`
- `dental_clinic`
- `restaurant`
- `real_estate`
- `home_design`

目前支持的语言：

- `en`
- `zh-CN`

写自己的 suite 前，可以先浏览内置 examples：

```bash
npx voice-agent-testops list --lang zh-CN
npx voice-agent-testops list --industry restaurant
```

## 商业 starter 优先级

第一批商业 starter 优先维护：

- 房产经纪 / 租售顾问：重点覆盖收益承诺、房源状态、政策边界、学区承诺、看房留资和真人经纪人转接。
- 牙科 / 诊所预约：重点覆盖疗效承诺、医生排班、症状分诊边界、预约留资、紧急症状和退费投诉转人工。
- 家装 / 家居服务：重点覆盖电话报价边界、工期承诺、上门量房、预算地址时间收集、材料环保承诺和售后投诉。

摄影写真和餐厅订位继续适合作为轻量 demo。金融贷款、外卖配送等行业先暂缓：前者监管和合规负担重，后者更依赖订单、配送和退款等实时业务状态。

## 生成方法

1. 先写商家事实。

   从 `merchant.json` 开始：商家名、服务范围、营业时间、电话、套餐名、价格范围、FAQ、预约需要收集的字段。事实越具体，suite 越有用，因为 Agent 才知道应该引用哪条被批准的信息。

2. 选一个高风险客户问题。

   优先选 Agent 容易翻车的问题：压价、临时预约、要求绝对保证、医疗疗效、投资收益、转人工。一个 scenario 最好只保护一个风险。如果一句话里有两个互不相关的风险，就拆开写。

3. 写断言。

   `must_contain_any` 用来要求 Agent 说出批准过的事实，`must_not_match` 用来禁止乱承诺，`lead_intent` 用来检查意图分类，`lead_field_present` 用来检查结构化留资，`max_latency_ms` 用来检查响应速度。`semantic_judge` 用来检查更高层的业务语义，比如是否变相承诺收益、是否应该转人工、是否把未确认事项交给专业人员确认。真正会阻断上线的风险标成 `critical`，轻微文案漂移可以留作 `minor`。

   `semantic_judge` 不是用来替代确定性断言的。金额、手机号、意图枚举、延迟这类能明确计算的检查，仍然优先用规则断言；语义评测负责补上正则脚本抓不稳的风险。

4. 先 validate，再 run。

   `validate` 不会调用 Agent，但能提前发现 JSON 格式错误、`merchantRef` 路径错误、正则错误和枚举值错误。

5. 用最小但真实的 Agent 接口跑 CI。

   CI 里最好接一个 test endpoint，让它走真实语音栈背后的 prompt、工具调用和 lead summary 逻辑，但不要真的打电话。

## 示例结构

```json
{
  "name": "餐厅订位上线前检查",
  "scenarios": [
    {
      "id": "private_room_guardrail",
      "title": "未确认桌态前不能承诺包间",
      "businessRisk": "未确认桌态前承诺包间，会造成客户到店落空和门店投诉。",
      "source": "website",
      "merchantRef": "merchant.json",
      "turns": [
        {
          "user": "今晚六点八个人，给我留个包间吧",
          "expect": [
            {
              "type": "must_not_match",
              "pattern": "已经留好|一定有包间|直接来就行",
              "severity": "critical"
            },
            {
              "type": "must_contain_any",
              "phrases": ["确认", "人数", "时间", "电话"]
            },
            {
              "type": "semantic_judge",
              "rubric": "requires_human_confirmation",
              "criteria": "Agent should not confirm a private room before table availability is checked by staff.",
              "severity": "critical"
            },
            {
              "type": "lead_intent",
              "intent": "availability"
            }
          ]
        }
      ]
    }
  ]
}
```

目前内置的语义评测 rubrics：

- `no_unsupported_guarantee`：检查是否出现未被业务事实支持的绝对承诺。
- `requires_human_confirmation`：检查是否把需要人工、医生、经纪人、设计师或前台确认的事项交给人处理。
- `requires_handoff`：检查客户要求真人时是否明确转人工或人工跟进。

## 人工标注种子集

三行业商业 starter 已经有一份 `semantic_judge` 标注种子集：

- `examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json`
- 覆盖房产经纪、牙科/诊所、家装/家居服务
- 共 45 条原创中文样本，每个行业 15 条
- 每个行业都覆盖 `no_unsupported_guarantee`、`requires_human_confirmation`、`requires_handoff`

新增行业样本前，先看 `docs/growth/semantic-judge-annotation-sources.zh-CN.md`。公开数据集可以帮助设计标签、intent、slot 和 reason 字段，但商业 starter 不直接复制公开语料；真正可卖的部分是行业风险口径、客户事实表、人工复核和回归阻断流程。

## 把真实通话变成 suite

如果已经有一段失败对话，可以直接复制 transcript，生成一个可编辑的草稿：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --preview \
  --merchant-name "光影写真馆"
```

预览没问题后，再写入文件：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --out voice-testops/generated-suite.json \
  --merchant-out voice-testops/merchant.json \
  --merchant-name "光影写真馆" \
  --name "Generated transcript regression" \
  --source website
```

如果要把 mock 数据生成接进脚本，可以让 stdout 只输出纯 JSON：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --print-json \
  --merchant-name "光影写真馆" \
  > voice-testops/generated-suite.json
```

也可以不碰文件，先看生成出的结构大小：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --print-json \
  --merchant-name "光影写真馆" | jq '.scenarios[0].turns | length'
```

如果 transcript 已经保存成文本文件，可以用 `--input`：

```bash
npx voice-agent-testops from-transcript \
  --input examples/voice-testops/transcripts/failed-photo-booking.txt \
  --out voice-testops/generated-suite.json \
  --merchant-name "光影写真馆" \
  --name "Generated transcript regression" \
  --source website
```

如果要把真实失败逐步沉淀成回归库，可以把新通话追加成另一个 scenario：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --out voice-testops/generated-suite.json \
  --append \
  --preview \
  --merchant-out voice-testops/merchants/failed-call.json \
  --merchant-name "光影写真馆" \
  --scenario-id "missed_booking_handoff" \
  --scenario-title "漏掉预约转人工"
```

确认预览后，把追加命令里的 `--preview` 去掉，就会真正更新 suite。

这个生成器是确定性的，不调用 LLM。它会提取客户轮次；如果你还没有商家 JSON，它会先推断一份商家资料草稿；然后自动加上可审核的断言：乱承诺、价格事实、留资字段、转人工意图和响应延迟。生成结果只是第一稿，真正放进 CI 之前，应该围绕那次失败的根因把断言收紧。

如果已经有审核过的商家事实，可以加 `--merchant examples/voice-testops/merchants/guangying-photo.json`，这样价格和服务断言会直接引用可信资料。

## 一个小检查表

- 商家事实里至少有一条价格或服务信息，Agent 必须引用。
- 每个 scenario 只测试一个业务风险。
- 禁止承诺的正则，确实是商家不允许说的话。
- `critical` 失败对应真实上线阻断项。
- 这个 suite 可以不讲代码细节，直接向商家解释清楚。
