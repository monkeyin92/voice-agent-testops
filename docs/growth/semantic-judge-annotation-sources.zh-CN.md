# Semantic Judge 人工标注样本公开数据源调研

更新日期：2026-05-07

这份调研用于指导 `semantic_judge` 的人工标注样本建设。结论先说清楚：公开数据适合帮我们设计标签体系、字段结构、意图分布和对话变体，但不应该直接把公开语料复制进商业 starter。我们的可商用护城河要来自行业化风险定义、客户业务事实、人工复核规范、失败回归闭环和真实通话反馈。

开源 starter 与商业护城河的边界见 `docs/growth/open-source-moat-boundary.zh-CN.md`。简单说，公开 seed 是样板间和标准化入口；客户真实通话、专属 regression suite、人工复核结论、误报漏报分析和生产监控历史不应进入公开仓库。

已落地的种子集：

- `examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json`
- 60 条原创中文样本
- 覆盖 `real_estate`、`dental_clinic`、`home_design`、`insurance`
- 覆盖 `no_unsupported_guarantee`、`requires_human_confirmation`、`requires_handoff`

## 使用原则

1. 公开数据只做参考，不直接复制。

   可以参考公开集的标签、intent、slot、reason 字段设计，也可以参考它们如何覆盖多轮任务和安全风险。不要把原始用户话术、回复、隐私内容或争议样本直接放进我们的 examples。

2. 标注样本必须贴近客户的上线风险。

   对 voice agent 公司来说，测试价值不在于“找一堆对话跑一遍”，而在于把行业高风险口径变成可复用门禁。例如房产不能承诺升值，诊所不能承诺疗效，家装不能承诺绝对报价和工期。

3. 每条样本都要能解释为什么 pass 或 fail。

   `expected` 只是标签，`reason` 才是销售、运营、客户成功和工程都能对齐的依据。后续做 LLM judge 或人工复核时，也优先看 reason 是否稳定。

4. 公共 benchmark 不能替代私有反馈闭环。

   真正有商业价值的数据来自客户真实失败通话、上线阻断、复盘后的新 regression suite，以及行业专家对边界口径的修订。

## 数据源评估

| 数据源 | 可借鉴内容 | 许可证/注意事项 | 本项目使用方式 |
| --- | --- | --- | --- |
| [AllenAI ProsocialDialog](https://huggingface.co/datasets/allenai/prosocial-dialog) | 对话安全标签、标注理由、需要谨慎或干预的分级思路 | Hugging Face 标注为 `cc-by-4.0`；内容含敏感/冒犯样本，不能直接混入商业示例 | 只参考 `safety_label`、`safety_annotations`、`reason` 这类字段设计 |
| [Bitext Customer Support LLM Chatbot Training Dataset](https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset) | 客服 query、category、intent、response 的结构，以及同一意图的多种表达 | Hugging Face 标注为 `cdla-sharing-1.0`；英文泛客服数据，不等于行业合规样本 | 只参考客服意图覆盖和措辞多样性 |
| [MultiWOZ 2.2](https://huggingface.co/datasets/pfb30/multi_woz_v22) | 多轮任务型对话、slot/state/dialog act、需要收集和确认的信息结构 | Hugging Face 标注为 `apache-2.0`；英文、领域不直接匹配三行业 | 参考“客户目标、槽位、系统行为”的结构设计 |
| [BANKING77](https://huggingface.co/datasets/PolyAI/banking77) | 银行业 77 类细粒度 intent，适合后续金融 starter 的 intent taxonomy | Hugging Face 标注为 `cc-by-4.0`；是单轮查询分类，不是完整 voice agent 对话 | 当前不直接使用；未来做金融/贷款行业时可作为 taxonomy 起点 |
| [MultiWOZ 2.4 GitHub](https://github.com/smartyfh/MultiWOZ2.4) | 修订标注错误、提升 dialogue state tracking 评测质量的方法 | GitHub repo 标注为 MIT；仍需检查具体数据继承关系 | 参考“持续修订标注集”的维护方法 |

## 首批标注集结构

`semantic-judge-seed.zh-CN.json` 不是训练集，而是评测校准集。它回答三个问题：

- 这句话有没有越界承诺？
- 这个事项是否必须让人确认？
- 客户要人工时，Agent 有没有真的转人工？

每条样本包含：

- `industry`：当前限定为 `real_estate`、`dental_clinic`、`home_design`、`insurance`
- `rubric`：对应 `semantic_judge` 的三个 rubric
- `criteria`：自然语言评判标准
- `expected`：`pass` 或 `fail`
- `user`：客户问题
- `spoken`：Agent 回复
- `reason`：标注理由
- `evidence`：触发判断的关键短语

覆盖策略：

- 每个行业 15 条
- 每个行业的每个 rubric 5 条
- 每个行业/rubric 组合至少包含一个 `pass` 和一个 `fail`
- 高风险场景优先标 `critical`

保险 / 监管服务的 seed 在 deterministic suite 之后补齐，用来校准身份核验、理赔状态、coverage / eligibility、地址变更、投诉升级和持牌顾问转接这些语义边界，避免只有脚本断言而没有人工标注基准。

## 后续扩展路线

1. 用真实失败通话扩样。

   每接入一个试点客户，至少沉淀 10 条真实失败或边界样本。客户可提供脱敏 transcript，我们负责转成 `expected`、`reason`、`evidence`。

2. 建立双人复核。

   关键行业样本至少由业务 owner 和测试 owner 各复核一次。分歧不直接平均，而是回到 rubric 定义，必要时拆出新 rubric。

3. 用公开数据做 paraphrase，不做事实来源。

   可以借鉴公开集的表达多样性，生成同义问题和口语化追问；事实、价格、承诺边界必须来自客户事实表或行业规范。

4. 把标注集接入 evaluator 回归。

   后续 `semantic_judge` 升级为 LLM-as-judge 或混合 judge 时，这 60 条样本要作为最小校准集。任何新版 judge 若在这些样本上倒退，都不能默认上线。

   当前校准入口：

   ```bash
   npx voice-agent-testops calibrate-judge \
     --seed examples/voice-testops/annotations/semantic-judge-seed.zh-CN.json \
     --out .voice-testops/semantic-judge-calibration.md \
     --json .voice-testops/semantic-judge-calibration.json
   ```

   校准报告会按 industry、rubric 和 industry/rubric 统计一致率、误判方向和分歧样例。发布门禁可追加 `--fail-on-disagreement`。

5. 让标注资产变成销售材料。

   对外可以展示“我们不是帮你跑几个脚本，而是帮你把行业风险变成可追踪的上线门禁”。每个客户试点结束后，应交付新增样本数、阻断风险数、误报/漏报复盘和下一轮 regression suite。
