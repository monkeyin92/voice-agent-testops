# Voice Agent TestOps 试点数据脱敏和授权模板

日期：2026-05-07

## 使用前声明

这份模板用于 Voice Agent TestOps 外部试点前的数据准备。它不是法律意见，也不是正式数据处理协议。涉及金融、医疗、未成年人、跨境传输、生产录音、客户身份信息或其他高风险数据时，试点方应先让法务或数据保护负责人确认。

默认规则：

- 能用合成数据，就不用真实客户数据。
- 能用脱敏 transcript，就不提供原始录音。
- 能用字段摘要，就不提供 CRM 原始记录。
- 没有明确授权，就不把真实通话、录音、客户资料或报告产物提交给 Voice Agent TestOps。
- 没有单独确认公开授权，就不把任何客户真实样本放入公开仓库。

## 参考原则

本模板参考这些公开原则，但不替代试点方所在地区的法律判断：

- [中华人民共和国个人信息保护法](https://www.miit.gov.cn/zwgk/zcwj/flfg/art/2022/art_04a0f1fb5df244e39688fd5372623a8d.html)：个人信息处理应有明确合理目的，收集范围应限于实现目的的最小范围；敏感个人信息需要更严格保护。
- [FTC Protecting Personal Information](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business)：企业应盘点数据、减少保留、保护保留数据、妥善销毁不再需要的数据，并准备安全事件响应。
- [NIST De-Identification of Personal Information](https://www.nist.gov/publications/de-identification-personal-information)：去标识化用于降低数据与特定个人重新关联的风险，但要在可用性和隐私保护之间做取舍。
- [EDPB pseudonymised vs anonymised FAQ](https://www.edpb.europa.eu/sme-data-protection-guide/faq-frequently-asked-questions/answer/what-difference-between_en)：假名化数据通常仍可能被视为个人数据；只有充分匿名化后才更可能脱离个人数据范围。

## 数据分级

| 等级 | 数据类型 | 是否可用于试点 | 处理要求 |
|---|---|---|---|
| A | 合成对话、公开行业规则、原创 starter 场景 | 可以 | 可进入公开 examples，但仍要避免真实商家事实 |
| B | 客户公开事实、通用业务政策、测试账号状态 | 可以 | 去掉客户独有策略、内部 SOP、真实价格表细节 |
| C | 脱敏 transcript、脱敏 call log、脱敏工具调用记录 | 受控可用 | 只放私有试点目录，需确认授权、保存期限和删除方式 |
| D | 原始录音、真实姓名、真实电话、完整地址、身份证、医疗健康、金融账户、未成年人信息 | 默认禁止 | 除非另有正式授权和合规评估，否则不进入试点 |
| E | API key、Bearer token、CRM 密钥、呼叫中心 webhook、生产 endpoint 凭证 | 禁止 | 永不写入 suite、report、issue、PR、公开仓库或聊天记录 |

## 可提供字段

试点客户通常可以提供：

- 行业和 starter 选择，例如 `real_estate`、`dental_clinic`、`home_design`、`insurance`、`restaurant`。
- 公开或已泛化的商家事实，例如营业时间、服务范围、预约规则、是否支持人工回访。
- 测试 endpoint 和测试账号，不使用生产客户凭证。
- 合成客户问题、脱敏 transcript、脱敏失败片段。
- 工具调用 schema，例如 `create_lead`、`book_appointment`、`handoff_to_human` 的字段结构。
- 测试安全的 backend state，例如 `{ "lead": { "status": "captured" } }`。
- 不指向真实客户的 report 样例和 regression draft。

如果某个字段无法判断是否安全，默认不提供。先把字段名、用途、来源、是否可还原到个人列出来，再由试点双方确认。

## 禁止提供字段

没有单独授权和合规评估时，不应提供：

- 真实姓名、昵称和能直接识别个人身份的称呼。
- 真实手机号、邮箱、微信号、身份证、护照、车牌号。
- 完整地址，包括门牌号、楼栋、房号、详细配送地址。
- 医疗健康信息，例如病历、诊断、检查结果、处方、具体症状与个人身份的组合。
- 金融账户、银行卡、贷款申请信息、信用评分、交易流水、支付凭证。
- 未成年人信息。
- 真实录音、声纹、照片、视频、语音 replay 长期公开链接。
- CRM id、订单号、工单号、合同号、房源唯一编号等可回连内部系统的标识。
- API key、token、cookie、webhook secret、生产 endpoint 认证信息。

## 脱敏替换规则

| 原始内容 | 替换方式 | 示例 |
|---|---|---|
| 真实姓名 | 稳定假名或角色名 | `王小明` -> `客户A` |
| 手机号 | 占位符或测试号 | `真实手机号` -> `<PHONE_1>` |
| 邮箱 | 占位符 | `name@example.com` -> `<EMAIL_1>` |
| 身份证 / 护照 | 占位符，不保留校验位 | `真实身份证号` -> `<ID_CARD_1>` |
| 完整地址 | 降到城市 / 区域级别 | `某市某区某小区3栋502` -> `某市某区某小区` |
| 医疗健康 | 删除身份关联，改成泛化描述 | `张三术后牙龈出血` -> `客户反馈口腔不适` |
| 金融账户 | 占位符，不保留尾号 | `6222 **** 1234` -> `<BANK_ACCOUNT_1>` |
| 订单 / 工单 / CRM id | 重新编号 | `CRM-984123` -> `LEAD_001` |
| 精确时间 | 相对时间 | `2026-05-07 14:30` -> `T+1 下午` |
| 金额 | 区间或测试金额 | `178432 元` -> `约 18 万元` |
| 音频 URL | 不提供，或使用短期授权测试链接 | `https://.../real-call.wav` -> `<AUDIO_REPLAY_URL_1>` |

脱敏后的占位符要在同一个样本内保持一致。例如同一通对话里的 `<PHONE_1>` 必须始终代表同一个被替换字段，避免破坏多轮上下文。

## 脱敏前后示例

不要提供这样的原始片段：

```json
{
  "customerText": "我是王小明，电话 真实手机号，住在杭州市西湖区某小区3栋502。上次医生说我牙周炎，明天 14:30 能复诊吗？",
  "spoken": "王先生，我看到您的病历和手机号了，可以帮您安排明天下午复诊。"
}
```

可以提供这样的脱敏片段：

```json
{
  "customerText": "我是客户A，电话 <PHONE_1>，住在某市某区某小区。上次有口腔不适，T+1 下午能复诊吗？",
  "spoken": "我可以帮您记录复诊需求，并请工作人员确认具体可预约时间。"
}
```

## 授权确认模板

试点开始前，把下面内容复制到客户项目文档或邮件中确认。

```markdown
# 试点数据授权确认

试点项目：
试点客户：
数据提供方负责人：
Voice Agent TestOps 负责人：
确认日期：

## 1. 数据来源

- [ ] 全部为合成数据
- [ ] 来自公开资料，已确认可用于试点
- [ ] 来自生产通话或 call log，已完成脱敏
- [ ] 来自内部 CRM / 工单 / 预约系统，已抽取为测试安全字段

## 2. 数据类型

- [ ] 用户问题
- [ ] Agent 回复
- [ ] summary / intent / lead 字段
- [ ] tool calls
- [ ] backend state
- [ ] audio replay URL
- [ ] voice metrics
- [ ] 其他：

## 3. 禁止项确认

- [ ] 不包含真实姓名
- [ ] 不包含真实手机号、邮箱、身份证、护照、车牌号
- [ ] 不包含完整地址
- [ ] 不包含医疗健康、金融账户、未成年人等敏感个人信息
- [ ] 不包含 API key、token、cookie、webhook secret 或生产凭证
- [ ] 不包含可回连真实客户的 CRM id、订单号、工单号或合同号

## 4. 授权范围

- [ ] 仅用于本次 Voice Agent TestOps 试点
- [ ] 可用于生成本地 report、summary、JUnit、commercial report、pilot recap
- [ ] 可用于生成脱敏 regression draft
- [ ] 不得进入公开仓库
- [ ] 不得用于模型训练
- [ ] 不得提供给未列明的第三方
- [ ] 如需公开展示，必须另行书面确认

## 5. 保存和删除

默认保存位置：
默认保存期限：
删除负责人：
删除日期：
删除确认方式：

## 6. 例外说明

需要额外授权或排除的数据：

## 7. 双方确认

数据提供方确认：
Voice Agent TestOps 负责人确认：
```

## 产物保存和删除

试点可能产生这些文件：

- `.voice-testops/report.json`
- `.voice-testops/report.html`
- `.voice-testops/summary.md`
- `.voice-testops/junit.xml`
- `.voice-testops/commercial-report.md`
- `.voice-testops/pilot-recap.md`
- `.voice-testops/call-sample.json`
- `.voice-testops/call-sampling.md`
- `.voice-testops/call-transcripts/`
- `voice-testops/regression-draft.json`
- `.voice-testops/failure-clusters.md`

处理规则：

- `.voice-testops/` 默认视为本地试点产物，不提交公开仓库。
- `report.json`、`commercial-report.md`、`pilot-recap.md` 可能包含客户事实或失败细节，默认只发给已授权成员。
- `call-transcripts/` 即使脱敏后也默认只放私有目录。
- `regression-draft.json` 进入客户 suite 前，需要再次人工确认是否还含有可识别信息。
- 默认保存期限建议不超过 30 天。确需长期保留，应写明原因、负责人和删除条件。

提交前至少运行一次敏感信息扫描：

```bash
rg -n "1[3-9][0-9]{9}|[0-9]{17}[0-9Xx]|身份证|银行卡|病历|Bearer|sk-" \
  voice-testops .voice-testops examples
git status --short
```

如果扫描命中真实敏感信息，先删除或替换，不进入 commit、issue、PR、聊天记录或公开报告。

## 公开仓库边界

公开仓库可以包含：

- 原创合成样本。
- 泛化后的行业风险场景。
- 已确认授权公开的匿名示例。
- 不含真实客户事实的 starter suite。

公开仓库不应包含：

- 客户真实 transcript，即使已经脱敏，除非另有公开授权。
- 原始录音、声纹、生产 call replay URL。
- 客户专属价格、话术、SOP、CRM 字段、工具配置。
- 内部失败复盘、误报/漏报分析、客户 benchmark。
- 任何可以回连到真实客户或真实商家的标识。

更多开源边界说明见：[开源边界与商业护城河](../growth/open-source-moat-boundary.zh-CN.md)。

## 试点前检查清单

进入外部试点前确认：

- [ ] 已选择 starter 行业和测试目标。
- [ ] 已确认所有输入数据属于 A、B 或已授权的 C 类。
- [ ] 已删除 D、E 类数据，或另行走正式授权和合规评估。
- [ ] 已确认 endpoint 使用测试环境和测试凭证。
- [ ] 已确认 report 产物保存位置、访问成员、保存期限和删除负责人。
- [ ] 已确认任何公开展示都需要单独授权。
- [ ] 已确认外部试点 runbook 可以执行。

下一步：[外部试点 Runbook](external-pilot-runbook.zh-CN.md)。
