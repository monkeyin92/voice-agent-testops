# Voice Agent TestOps 录音资源 Intake Runbook

日期：2026-05-08

## 使用场景

这份 runbook 用于整理一批真实或半真实的电话录音资源，再决定哪些可以进入 Voice Agent TestOps 的 transcript、regression 或 ASR 噪声样本流程。

它不替代 [试点数据脱敏和授权模板](pilot-data-sanitization-authorization.zh-CN.md)。录音、声纹、手机号、微信号、客户姓名、通话文件名、call replay URL 都可能是个人信息或可回连标识。没有明确授权时，原始录音和原始链接只应留在私有环境，不进入公开仓库、issue、PR 或聊天记录。

## 目标

整理录音资源时，先回答三个问题：

- 这条录音是否有授权和保存边界？
- 这条录音是否能脱敏成 transcript？
- 这条录音最终适合做 regression、ASR 低质量样本，还是应该丢弃？

推荐先整理 20-30 条，不要一开始处理上百条。第一批的目标是校准流程，不是追求覆盖率。

## 私有 Manifest

公开仓库只提供模板：[recording-intake-template.csv](../../examples/voice-testops/recording-intake-template.csv)。

真实 manifest 建议放在私有目录，例如：

```text
.voice-testops/recordings/recording-intake.csv
```

`.voice-testops/` 默认不提交。真实 `audio_url_private`、原始文件名、下载后的录音、ASR 原文和未审核 transcript 都应保留在这个私有目录或客户自己的安全存储里。

## 字段字典

| 字段 | 必填 | 取值建议 | 用途 |
|---|---|---|---|
| `recording_id` | 是 | `outbound_001` | 脱敏稳定 ID，不使用手机号、call id、订单号 |
| `audio_url_private` | 私有必填 | `<PRIVATE_AUDIO_URL_1>` | 原始录音链接，只能出现在私有 manifest |
| `call_date` | 是 | `2026-05-07` | 通话日期，可降精度到日期 |
| `business_type` | 是 | `insurance` / `outbound_leadgen` / `real_estate` / `dental_clinic` / `home_design` / `restaurant` / `ecommerce` / `unknown` | 决定后续 starter、rubric 和 guardrail |
| `direction` | 是 | `inbound` / `outbound` / `unknown` | 判断默认 turn 角色 |
| `duration_sec` | 否 | `43` | 过滤超短、超长或异常录音 |
| `language` | 否 | `zh-CN` / `en` / `mixed` | 选择转写和人工复核策略 |
| `quality` | 是 | `clear` / `noisy` / `unusable` | 决定能否转 transcript |
| `has_pii` | 是 | `yes` / `no` / `unknown` | 决定脱敏强度 |
| `consent_status` | 是 | `authorized` / `internal_sample` / `public_sample` / `synthetic` / `unknown` | 决定是否可以处理、分享或长期保存 |
| `main_pattern` | 是 | `wechat_followup` / `project_cooperation` / `claim_status` / `pricing` / `handoff` / `unsupported_promise` / `complaint` / `no_answer` / `low_signal` / `other` | 方便批量挑选高价值样本 |
| `risk_tag` | 是 | `handoff` / `unsupported_promise` / `pricing` / `pii` / `low_signal` / `asr_failure` / `compliance` / `human_confirmation` / `other` | 决定 regression 或噪声样本用途 |
| `usefulness` | 是 | `keep` / `maybe` / `discard` | 第一轮人工筛选结果 |
| `turn_role_hint` | 是 | `customer` / `assistant` / `both` / `unknown` | 传给 `from-transcript --turn-role` 的线索 |
| `transcript_status` | 是 | `none` / `draft` / `sanitized` / `reviewed` | 防止未审核 transcript 误入回归 |
| `regression_candidate` | 是 | `yes` / `maybe` / `no` | 是否值得转成 scenario |
| `notes` | 否 | 简短说明 | 只写脱敏说明和业务模式，不贴原文敏感片段 |

## 第一轮筛选规则

标为 `keep`：

- 通话清晰，能听出完整业务意图。
- 已授权或是内部可处理样本。
- 可以脱敏到不含真实手机号、微信号、姓名、完整地址、call id、订单号。
- 暴露明确风险：转人工、加微信、报价、承诺效果、保险理赔/coverage、身份核验失败、投诉。

标为 `maybe`：

- 业务意图有价值，但 ASR 噪声较大。
- 通话很短，但能覆盖 `no_answer`、`low_signal`、客户拒绝、打断等真实边界。
- 可作为 ASR / intake 鲁棒性样本，但不直接进入 regression。

标为 `discard`：

- 授权状态是 `unknown` 且无法补充确认。
- 原始录音或文件名包含敏感信息，且无法安全脱敏。
- 没有业务内容，只有重复“喂”、静音、空号或无效拨打。
- 含有医疗健康、金融账户、未成年人、身份证等敏感信息，且没有单独合规评估。

## 批处理流程

1. 复制模板到私有目录：

```bash
mkdir -p .voice-testops/recordings
cp examples/voice-testops/recording-intake-template.csv \
  .voice-testops/recordings/recording-intake.csv
```

2. 填写 20-30 条录音 manifest。不要把真实 URL、手机号文件名或 call id 复制到仓库文件。如果手上只有一行一个 URL 的私有列表，也可以先直接作为 `--input` 跑 triage；工具会保守归一成 `maybe` / `pii` / `consent_status=unknown` / `regression_candidate=no`，再等人工补字段。

3. 先跑 intake triage，确认字段、授权状态和候选样本边界：

```bash
npx voice-agent-testops recording-intake \
  --input .voice-testops/recordings/recording-intake.csv \
  --summary .voice-testops/recordings/intake-summary.md
```

`intake-summary.md` 会汇总 `keep` / `maybe` / `discard`、`business_type`、`risk_tag`、`quality`、`turn_role_hint`，并列出可进入下一步的 `regression_candidate=yes` 样本。报告不会输出真实 `audio_url_private`；如果 manifest 里出现真实 URL、`consent_status=unknown` 仍标 `keep`、`quality=unusable` 仍标候选回归，命令会在问题区标出对应行。

4. 只下载和转写 `usefulness=keep` 或 `maybe` 的录音。原始音频和未脱敏 transcript 放在 `.voice-testops/recordings/raw/` 和 `.voice-testops/recordings/transcripts/`。

5. 人工脱敏 transcript。至少替换：

- 手机号、微信号、邮箱、身份证、车牌号；
- 客户姓名、商户实名、完整地址；
- 订单号、CRM id、call id、录音文件名；
- 生产 URL、签名参数、长期可访问音频链接。

6. 按 `turn_role_hint` 生成草稿：

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --turn-role assistant \
  --out .voice-testops/recordings/generated/outbound-suite.json \
  --merchant-out .voice-testops/recordings/generated/outbound-merchant.json \
  --merchant-name "Outbound lead generation" \
  --scenario-id "outbound_wechat_followup" \
  --source unknown
```

如果是保险或监管服务 transcript，再加 `--intake insurance`。如果风险句在客户侧，使用默认的 `--turn-role customer` 或省略该参数。

7. 验证生成结果：

```bash
npx voice-agent-testops validate \
  --suite .voice-testops/recordings/generated/outbound-suite.json

npx voice-agent-testops run \
  --suite .voice-testops/recordings/generated/outbound-suite.json \
  --summary .voice-testops/recordings/generated/summary.md \
  --json .voice-testops/recordings/generated/report.json \
  --fail-on-severity critical
```

8. 只有 `transcript_status=reviewed` 且 `regression_candidate=yes` 的样本，才考虑人工收紧断言后进入正式 suite。

## 外呼录音特别规则

外呼、电销、线索合作录音里，业务风险经常在坐席侧：

- “我这边是做线索业务的”
- “有项目想跟您合作”
- “方便加微信后续跟进吗”
- “让负责人联系您”

这类样本生成 regression 时应使用：

```bash
--turn-role assistant
```

不要为了套用现有 inbound 模式，把坐席侧话术改写成客户侧话术。保持风险句来源清楚，后续才能判断是 prompt、ASR、路由还是人工话术问题。

## 保险样本特别规则

保险、理赔、coverage、eligibility、核保、身份核验失败这类样本优先使用 [Insurance transcript intake pack](insurance-transcript-intake.md)。

进入 regression 前必须确认：

- 不包含真实保单号、赔案号、身份证、银行卡、完整地址；
- 不承诺赔付、报销比例、核保结果或 coverage 资格；
- 需要人工或持牌顾问确认的内容已标成 `human_confirmation` 或 `handoff` 风险。

## 批次验收

每一批录音整理完，至少产出：

- 私有 `.voice-testops/recordings/recording-intake.csv`；
- 每条 `keep` 样本的一份脱敏 transcript；
- 一个简短批次结论：多少条 `keep` / `maybe` / `discard`；
- 1-3 条正式 regression candidate；
- 低质量样本是否只用于 `low_signal` / `asr_failure`，不进入业务 regression。

提交代码前运行敏感信息扫描：

```bash
rg -n "1[3-9][0-9]{9}|[0-9]{17}[0-9Xx]|https?://[^[:space:]]+\\.(wav|mp3|m4a)|Bearer|sk-" \
  README.md README.zh-CN.md docs examples src tests
git status --short
```

命中真实链接、手机号、身份证、token 或生产 call replay URL 时，先删除或替换，不进入 commit。

## 下一步

拿到第一批 20-30 条录音后，先不要全部转成 suite。先按 manifest 做人工 triage，挑：

- 3 条清晰外呼 / 加微信 / 人工跟进样本；
- 1-2 条保险或合规边界样本；
- 1-2 条 ASR 噪声样本，仅用于 intake 鲁棒性。

再把这些样本分别沉淀成 regression、semantic judge seed 或 low-signal intake 测试。
