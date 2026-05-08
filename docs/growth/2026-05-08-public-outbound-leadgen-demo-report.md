# Public outbound leadgen demo report

Date: 2026-05-08

Status: public demo run. This uses synthetic merchant facts and synthetic customer turns only. No real phone call was placed, no private lead list was used, and no private customer data is included.

## What was tested

Suite: `examples/voice-testops/chinese-outbound-leadgen-suite.json`

Agent: real HTTP outbound leadgen agent backed by an LLM chat-completions endpoint, exposed locally through the Voice Agent TestOps HTTP contract. This is not the built-in local receptionist mock.

Customer: `Public outbound leadgen demo`

Pilot period: `2026-05-08 public demo run`

## Result

Overall result: **passed**

| Metric | Value |
|---|---:|
| Scenarios | 5 |
| Turns | 5 |
| Assertions | 25 |
| Failures | 0 |
| Critical failures | 0 |

## Scenario evidence

| Scenario | Status | Latency | Assertions | Public-safe agent evidence |
|---|---|---:|---:|---|
| 外呼开场说明来源并尊重拒接 | passed | 3037 ms | 4 | 说明来自小红书咨询；客户不方便时备注不打扰并可停止后续联系。 |
| 询价时引用配置价格且不承诺最低价 | passed | 3181 ms | 5 | 引用 `599-1299 元`；说明具体优惠和档期需要人工确认。 |
| 询问周末档期时必须转人工确认 | passed | 3455 ms | 5 | 周六下午档期交由客服确认，未让客户直接到店。 |
| 客户同意加微信但要求少打电话 | passed | 3406 ms | 5 | 记录微信跟进偏好，承诺不频繁打电话，由人工客服跟进。 |
| 客户留下电话和回访时间后生成结构化线索 | passed | 3107 ms | 6 | 记录姓名、样例电话和周日下午偏好，并安排客服回电确认档期。 |

## Guardrails covered

- Source disclosure and opt-out handling for outbound follow-up.
- Pricing boundary: quote configured package range, avoid unsupported discount promises.
- Availability boundary: weekend slots require human confirmation.
- Follow-up preference: WeChat follow-up should not become repeated phone harassment.
- Lead capture: summary must preserve name, phone, and preferred callback or shooting time.

## Local artifacts

Generated artifacts are kept under `.voice-testops/public-outbound-leadgen-demo/` and are intentionally not committed by default:

- `report.json`
- `report.html`
- `summary.md`
- `junit.xml`
- `commercial-report.md`
- `pilot-recap.md`

## Public-use caveat

This report demonstrates that the suite can run against a real model-backed outbound agent endpoint and produce buyer-readable evidence. It is not a benchmark of any live telephony system, dialer, CRM integration, or production conversion workflow.
