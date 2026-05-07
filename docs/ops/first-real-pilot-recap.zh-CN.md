# Voice Agent TestOps 第一个真实试点复盘模板

日期：2026-05-07

## 使用方式

这份模板只在跑过一个真实 endpoint 后填写。不要用它伪造试点结果，也不要把客户原始通话、录音、凭证或未授权报告提交到公开仓库。

填写前先确认：

- 已按 [试点数据脱敏和授权模板](pilot-data-sanitization-authorization.zh-CN.md) 确认数据边界。
- 已按 [外部试点 Runbook](external-pilot-runbook.zh-CN.md) 至少完成一次 `doctor` 和一次正式 `run`。
- 已在 [外部试跑记录表](external-pilot-tracker.zh-CN.md) 新增或更新对应试点行。

## 试点事实

| 字段 | 填写内容 |
|---|---|
| 试点 ID |  |
| 试点日期 |  |
| 试点对象 |  |
| 内部负责人 |  |
| 对方负责人 |  |
| 行业 starter |  |
| 接入方式 | HTTP / OpenClaw / Vapi / Retell / LiveKit / Pipecat / Transcript import |
| endpoint 类型 | 测试环境 / staging / production shadow / transcript-only |
| 数据授权状态 | 已确认 / 仅合成数据 / 暂停 / 需要补充确认 |
| 本次目标 | 30 分钟跑通 / 找真实失败 / 生成 regression / 评估付费兴趣 |

## 执行命令记录

记录实际运行过的命令。不要只写“已运行”。

### starter suite

```bash
npx voice-agent-testops init --industry real_estate --lang zh-CN --name "试点客户"
npx voice-agent-testops validate --suite voice-testops/suite.json
```

实际 suite：

```text
voice-testops/suite.json
```

### bridge 接入

```bash
npx voice-agent-testops doctor \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json
```

记录：

| 字段 | 结果 |
|---|---|
| doctor 结果 | pass / fail |
| 失败原因 |  |
| 修复动作 |  |

### baseline

首轮没有 baseline 时，记录为 first run：

```bash
npx voice-agent-testops run \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json \
  --summary .voice-testops/summary.md \
  --junit .voice-testops/junit.xml \
  --fail-on-severity critical
```

已有上一轮报告时，记录 baseline diff：

```bash
npx voice-agent-testops run \
  --agent http \
  --endpoint "$VOICE_AGENT_ENDPOINT" \
  --suite voice-testops/suite.json \
  --baseline .voice-testops-baseline/report.json \
  --diff-markdown .voice-testops/diff.md \
  --summary .voice-testops/summary.md \
  --junit .voice-testops/junit.xml \
  --fail-on-new \
  --fail-on-severity critical
```

### 真实失败导入

如果对方提供了脱敏通话或 call log，记录导入命令：

```bash
npx voice-agent-testops import-calls \
  --input examples/voice-testops/production-calls/sample-calls.jsonl \
  --out .voice-testops/call-sample.json \
  --summary .voice-testops/call-sampling.md \
  --transcripts .voice-testops/call-transcripts \
  --sample-size 20 \
  --seed pilot-week-1
```

未导入真实失败时，写明原因：

```text
未导入原因：
```

### regression draft

对确认真实有效的失败，生成 regression draft：

```bash
npx voice-agent-testops draft-regressions \
  --report .voice-testops/report.json \
  --suite voice-testops/suite.json \
  --out voice-testops/regression-draft.json \
  --clusters .voice-testops/failure-clusters.md
```

记录：

| 字段 | 结果 |
|---|---|
| 是否生成 regression draft | 是 / 否 / 不适用 |
| 进入候选 regression 的失败数 |  |
| 被人工否决的失败数 |  |
| 否决原因 |  |

### commercial report 和 pilot recap

生成客户复盘交付物：

```bash
npx voice-agent-testops pilot-report \
  --report .voice-testops/report.json \
  --commercial .voice-testops/commercial-report.md \
  --recap .voice-testops/pilot-recap.md \
  --customer "试点客户" \
  --period "第 1 次真实试点"
```

记录：

| 字段 | 路径或链接 |
|---|---|
| commercial report | `.voice-testops/commercial-report.md` |
| pilot recap | `.voice-testops/pilot-recap.md` |
| 客户已查看 | 是 / 否 |
| 客户反馈会议日期 |  |

## 证据清单

| 产物 | 是否存在 | 路径或私有链接 | 备注 |
|---|---|---|---|
| `.voice-testops/report.json` |  |  |  |
| `.voice-testops/report.html` |  |  |  |
| `.voice-testops/summary.md` |  |  |  |
| `.voice-testops/junit.xml` |  |  |  |
| `.voice-testops/diff.md` |  |  |  |
| `.voice-testops/commercial-report.md` |  |  |  |
| `.voice-testops/pilot-recap.md` |  |  |  |
| `.voice-testops/call-sample.json` |  |  |  |
| `.voice-testops/call-sampling.md` |  |  |  |
| `.voice-testops/call-transcripts/` |  |  |  |
| `voice-testops/regression-draft.json` |  |  |  |
| `.voice-testops/failure-clusters.md` |  |  |  |

## 失败复盘

只记录被证据支持的失败。不要把接入字段缺失误写成 agent 业务失败。

| 序号 | 场景 | 轮次 | failure code | severity | 失败类型 | 证据 | 客户是否认可 | 处理动作 |
|---:|---|---:|---|---|---|---|---|---|
| 1 |  |  |  |  | business_risk / endpoint_contract / judge_disagreement / lead_capture_gap / tool_or_state_gap / audio_or_latency |  | 是 / 否 / 待复核 |  |

复盘时回答：

1. 失败是否来自真实 agent 行为，而不是 bridge 返回字段缺失？
2. 客户是否认可这是上线风险？
3. 这个失败能否转成稳定 regression？
4. 需要改 agent prompt、workflow、工具、知识库、还是测试断言？
5. 是否需要新增或修订 semantic judge seed？

## 客户反馈

| 问题 | 记录 |
|---|---|
| 当前怎么测试 voice agent 上线质量 |  |
| 最怕上线后出什么事故 |  |
| 哪个失败结论最有价值 |  |
| 哪个失败结论不认可 |  |
| 最希望补什么能力 |  |
| 是否愿意继续试点 | 是 / 否 / 需要条件 |
| 是否讨论付费 | 场景库 / 监控 / adapter / 报告 / CI gate / 私有化 / 人工复核 |

## 后续动作

| 动作 | 负责人 | 截止日期 | 验收标准 | 状态 |
|---|---|---|---|---|
| 修复 endpoint contract |  |  | `doctor` pass | open |
| 把确认失败加入 regression suite |  |  | regression case 合入客户私有 suite | open |
| 复跑 baseline diff |  |  | 新增 critical 为 0 | open |
| 更新外部试跑记录表 |  |  | tracker 状态更新为 `continue` / `closed_lost` | open |

## Go / No-Go

### Go：进入下一轮试点

满足任意两条即可继续：

- 30 分钟内完成 bridge 接入并生成第一份 report。
- 至少一个失败被客户认可为真实上线风险。
- 至少一个失败生成 regression draft。
- 客户愿意提供更多脱敏通话或安排复跑。
- 客户开始讨论付费能力、私有化、监控或人工复核。

### No-Go：暂停该对象

出现以下情况时暂停：

- 数据授权无法确认。
- endpoint 无法稳定复现，且对方无法提供 transcript-only 替代。
- 客户不认可任何失败结论，也无法提供更真实的场景。
- 所有问题都停留在 bridge 字段缺失，暂时没有可评估的 agent 行为。

## 更新位置

复盘完成后同步更新：

- [外部试跑记录表](external-pilot-tracker.zh-CN.md)
- [外部验证清单](../growth/voice-agent-testops-validation.md)
- [外部试点就绪复盘](external-pilot-readiness-review.zh-CN.md)
