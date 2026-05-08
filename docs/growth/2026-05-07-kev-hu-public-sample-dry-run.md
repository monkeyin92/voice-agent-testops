# Kevin Hu public sample dry run

Date: 2026-05-07

Rerun: 2026-05-08

Status: Public sample dry run only. This is not endorsed by the repository owner, does not use a private Vapi endpoint, and is not a benchmark of the live prototype.

## Source and boundary

Source repository: [kev-hu/vapi-voice-agent](https://github.com/kev-hu/vapi-voice-agent)

Public sample: `demo/sample-call.md`

License: MIT License, from the repository `LICENSE` file.

Related outreach issue: [kev-hu/vapi-voice-agent#1](https://github.com/kev-hu/vapi-voice-agent/issues/1)

Data handling boundary:

- The raw transcript was not committed.
- Generated artifacts stayed under `.voice-testops/kev-hu-public-sample/`, which is ignored by git.
- The run used only public repository content plus local Voice Agent TestOps tooling.
- No private customer data, endpoint token, audio, or production call recording was used.

## Why this sample

The public sample is useful because it covers three common regulated-support risks:

- Happy path claim status after identity verification.
- coverage / eligibility question that must escalate to a licensed agent.
- failed verification that should escalate gracefully instead of looping or shaming the caller.

This maps well to our external pilot thesis: voice agents do not only need PII redaction checks; they need repeatable evidence around identity verification, answer boundaries, escalation quality, and false containment.

## Commands run

Normalize speaker labels from the Markdown sample and generate a local suite. The 2026-05-08 rerun explicitly pins the transcript draft to `--industry insurance` so the proof covers the new insurance suite instead of relying on automatic industry inference:

```bash
mkdir -p .voice-testops/kev-hu-public-sample

gh api repos/kev-hu/vapi-voice-agent/contents/demo/sample-call.md --jq .content \
  | base64 --decode \
  | perl -pe 's/^\*\*Sarah:\*\*/Customer:/; s/^\*\*Alex \(AI\):\*\*/Assistant:/; s/^\*\*Alex:\*\*/Assistant:/;' \
  | npx voice-agent-testops from-transcript \
      --stdin \
      --out .voice-testops/kev-hu-public-sample/suite.json \
      --merchant-out .voice-testops/kev-hu-public-sample/merchant.json \
      --merchant-name "EverSure Insurance" \
      --industry insurance \
      --name "Kevin Hu public sample dry run" \
      --source website \
      --scenario-id "kev_hu_insurance_public_sample" \
      --scenario-title "Kevin Hu insurance public sample"
```

Rerun proof:

```text
Generated suite: .voice-testops/kev-hu-public-sample/suite.json
Transcript: read from stdin
Merchant draft: .voice-testops/kev-hu-public-sample/merchant.json
Customer turns: 14
```

Generated merchant proof:

```json
{
  "name": "EverSure Insurance",
  "industry": "insurance",
  "packages": [{ "name": "Draft policy and claim support" }]
}
```

Validate the generated suite:

```bash
npx voice-agent-testops validate \
  --suite .voice-testops/kev-hu-public-sample/suite.json
```

Validation output:

```text
Suite valid: Kevin Hu public sample dry run
Scenarios: 1
Turns: 14
Assertions: 46
```

Run the local dry run and produce review artifacts:

```bash
npx voice-agent-testops run \
  --suite .voice-testops/kev-hu-public-sample/suite.json \
  --json .voice-testops/kev-hu-public-sample/report.json \
  --html .voice-testops/kev-hu-public-sample/report.html \
  --summary .voice-testops/kev-hu-public-sample/summary.md \
  --junit .voice-testops/kev-hu-public-sample/junit.xml \
  --fail-on-severity critical
```

Run output:

```text
Kevin Hu public sample dry run: failed (11 failures, 46 assertions)
Severity gate: passed (0 failures at or above critical)
```

Draft regression and pilot review assets:

```bash
npx voice-agent-testops draft-regressions \
  --report .voice-testops/kev-hu-public-sample/report.json \
  --suite .voice-testops/kev-hu-public-sample/suite.json \
  --out .voice-testops/kev-hu-public-sample/regression-draft.json \
  --clusters .voice-testops/kev-hu-public-sample/failure-clusters.md

npx voice-agent-testops pilot-report \
  --report .voice-testops/kev-hu-public-sample/report.json \
  --commercial .voice-testops/kev-hu-public-sample/commercial-report.md \
  --recap .voice-testops/kev-hu-public-sample/pilot-recap.md \
  --customer "Kevin Hu public sample" \
  --period "public sample dry run"
```

Generated local artifacts:

- `suite.json`
- `merchant.json`
- `report.json`
- `report.html`
- `summary.md`
- `junit.xml`
- `regression-draft.json`
- `failure-clusters.md`
- `commercial-report.md`
- `pilot-recap.md`

## Result interpretation

This run proves the public transcript can be converted into a reproducible test suite and downstream review packet. It does not prove the public prototype passed or failed, because we did not run against a live Vapi endpoint.

Observed dry run result:

- Scenarios: 1
- Customer turns: 14
- Assertions: 46
- Assertion mix: 14 `must_not_match`, 14 `max_latency_ms`, 14 `lead_intent`, 4 `semantic_judge`
- Failures: 11
- Critical failures: 0
- Severity gate: passed
- Failure cluster: `lead_intent_mismatch` only, all `major`

Before the insurance increment, the dry run exposed a product limitation: the starter library had no insurance industry profile, so the transcript generator inferred `real_estate` and produced generic intent checks. The result had 13 failures across 42 assertions and mainly proved that the tooling lacked regulated-service coverage.

After the insurance increment, the same public sample generates an insurance merchant draft and insurance-specific assertions. The generated suite now includes the insurance forbidden-promise pattern plus semantic judge rubrics for `requires_human_confirmation` and `no_unsupported_guarantee`. Product coverage now includes:

- `insurance` starter, industry schema, and `init --industry insurance` project generator.
- English and Chinese insurance regulated-service suites.
- Regulated-service local receptionist responses for claim, coverage, eligibility, verification failure, complaint, and licensed-agent handoff paths.
- Transcript guardrails for identity verification, claim status, coverage / eligibility, payout or underwriting guarantees, address changes, and human escalation.

The remaining failures are not critical safety failures. They are 11 `lead_intent_mismatch` checks where the transcript draft expected `other` for short follow-up answers such as policy numbers or names, while the local regulated-service agent summarized them as `service_info`. This is useful follow-up evidence for intent continuity, but it no longer blocks the insurance suite proof.

## Product learning

This dry run adds three concrete next steps:

1. Keep `--industry insurance` in public-sample reruns whenever the source sample is known to be an insurance or regulated-service flow.
2. Keep the transcript import path strict about speaker labels, but document common Markdown speaker forms such as `**Alex:**` and `**Alex (AI):**`.
3. After this product increment lands, add insurance semantic judge annotation seed so the insurance path has a human-labeled baseline, not only deterministic suite coverage.
4. Treat public samples as acquisition artifacts: they show time-to-first-report and workflow coverage, while private customer data remains outside the open repository.

## Next external step

If [kev-hu/vapi-voice-agent#1](https://github.com/kev-hu/vapi-voice-agent/issues/1) receives a reply, the next ask should be one of:

- A temporary test endpoint, so the same suite can run against the actual agent.
- Three sanitized transcripts, so we can compare public-sample behavior with more realistic conversation drift.
- Permission to share an aggregate report back on the issue without copying private transcript content.
