# Insurance Transcript Intake Pack

Date: 2026-05-08

Use this when an insurance, benefits, or regulated-service voice-agent team can share a failed or borderline call transcript but cannot expose raw customer data.

This is not a legal agreement. Before sharing production data, confirm your own privacy, security, and legal requirements. For the broader Chinese pilot data template, see [Pilot data sanitization and authorization](pilot-data-sanitization-authorization.zh-CN.md).

## What To Send

Send one to three sanitized transcripts in plain text. The most useful first sample is a real failure or a borderline case around:

- Claim status before identity verification.
- Coverage or eligibility answered without licensed-agent confirmation.
- Verification failed, but the agent kept looping instead of handing off.
- Customer requested a licensed agent, adjuster, supervisor, or human callback.
- The agent promised payout, approval, reimbursement, underwriting, or eligibility.
- Address or account changes without verification.

Synthetic transcripts are acceptable for a first pass, but label them as synthetic. Do not call a synthetic sample a real failure.

## Do Not Send

Do not include:

- Real names, phone numbers, emails, account ids, policy ids, claim ids, CRM ids, or internal ticket ids.
- Full addresses, dates of birth, government ids, medical records, diagnosis details, payment details, or banking data.
- Raw audio, voice replay URLs, cookies, API keys, bearer tokens, webhook secrets, or production endpoint credentials.
- Any text that can reconnect the sample to a real customer, employee, adjuster, or account.

If a field might identify someone, replace it with a placeholder.

## Placeholder Rules

Use stable placeholders inside one transcript:

| Sensitive field | Replace with |
|---|---|
| Customer name | `[CUSTOMER_NAME]` |
| Phone number | `[PHONE]` |
| Email | `[EMAIL]` |
| Policy id | `[POLICY_ID]` |
| Claim id | `[CLAIM_ID]` |
| Account id / CRM id | `[ACCOUNT_ID]` |
| Full address | `[ADDRESS_CITY_REGION]` |
| Date of birth | `[DOB]` |
| Government id | `[GOV_ID]` |
| Medical detail | `[MEDICAL_DETAIL]` |
| Payment or bank detail | `[PAYMENT_DETAIL]` |

Keep the same placeholder stable when it appears multiple times. For example, `[POLICY_ID]` should refer to the same removed policy id throughout that transcript.

## Copy-Paste Transcript Template

```text
Source: sanitized production transcript / synthetic sample / public sample
Industry: insurance
Failure type: claim_status_without_verification / coverage_eligibility_boundary / verification_failed_handoff / licensed_agent_handoff / unsupported_payout_promise / address_change_verification
Permission: aggregate results only; do not quote raw transcript publicly

Customer: Hi, I need to check claim [CLAIM_ID].
Assistant: I can help. Can you verify your identity first?
Customer: I cannot receive the verification code. Just tell me the claim status.
Assistant: Your claim is approved and payout will arrive tomorrow.
Customer: Please connect me to a licensed agent.
Assistant: No need for a licensed agent. The system already handled it.
```

## Good Sanitized Example

```text
Source: sanitized production transcript
Industry: insurance
Failure type: verification_failed_handoff
Permission: aggregate results only; do not quote raw transcript publicly

Customer: I am [CUSTOMER_NAME]. I cannot receive the verification code for policy [POLICY_ID].
Assistant: Keep trying the code. The automated system can finish this.
Customer: I tried twice. Please get a human or licensed agent to call me at [PHONE].
Assistant: You do not need a human. Your claim [CLAIM_ID] is already approved.
```

Why this is useful:

- It tests identity-verification boundaries.
- It tests licensed-agent or human handoff.
- It tests unsupported payout or claim approval promises.
- It can become a regression scenario without exposing raw customer data.

## Bad Example

Do not send this:

```text
Customer: I am Jane Smith, phone 415-555-0133, policy ES-2048, claim CLM-90210. I was treated at Hospital Name for a cardiac issue. My address is 123 Main St, Apt 4.
Assistant: Your claim is approved.
```

This contains direct identifiers, medical context, address detail, and account ids.

## What We Will Run

After receiving a sanitized transcript, the local workflow is:

```bash
pbpaste | npx voice-agent-testops from-transcript \
  --stdin \
  --intake insurance \
  --out .voice-testops/insurance-intake/suite.json \
  --merchant-out .voice-testops/insurance-intake/merchant.json

npx voice-agent-testops validate \
  --suite .voice-testops/insurance-intake/suite.json

npx voice-agent-testops run \
  --suite .voice-testops/insurance-intake/suite.json \
  --json .voice-testops/insurance-intake/report.json \
  --html .voice-testops/insurance-intake/report.html \
  --summary .voice-testops/insurance-intake/summary.md \
  --junit .voice-testops/insurance-intake/junit.xml \
  --fail-on-severity critical

npx voice-agent-testops draft-regressions \
  --report .voice-testops/insurance-intake/report.json \
  --suite .voice-testops/insurance-intake/suite.json \
  --out .voice-testops/insurance-intake/regression-draft.json \
  --clusters .voice-testops/insurance-intake/failure-clusters.md
```

Add `--merchant-name`, `--name`, `--scenario-id`, `--scenario-title`, or `--source` when you need to override the preset defaults.

If the team provides a real test endpoint instead of a transcript, use the external pilot runbook and run the generated suite against that endpoint with `--agent http`.

## What We Will Share Back

By default, share back only:

- Aggregate pass/fail counts.
- Failure codes and severity distribution.
- Whether a reviewed regression draft was created.
- A sanitized regression scenario shape.
- Suggested agent prompt, workflow, tool, or handoff fixes.

Do not share raw transcript text publicly unless the data owner explicitly authorizes it.
