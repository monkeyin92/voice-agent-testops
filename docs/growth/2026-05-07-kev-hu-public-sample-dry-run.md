# Kevin Hu public sample dry run

Date: 2026-05-07

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

Normalize speaker labels from the Markdown sample and generate a local suite:

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
      --name "Kevin Hu public sample dry run" \
      --source website \
      --scenario-id "kev_hu_insurance_public_sample" \
      --scenario-title "Kevin Hu insurance public sample"
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
Assertions: 42
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
Kevin Hu public sample dry run: failed (13 failures, 42 assertions)
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
- Assertions: 42
- Failures: 13
- Critical failures: 0
- Severity gate: passed
- Failure cluster: `lead_intent_mismatch`

The main product limitation is explicit: the current starter library has no insurance industry profile. The transcript generator inferred `real_estate`, which caused generic lead-intent checks to expect `other` while local output looked like `service_info`. That is a tooling coverage gap, not evidence that the insurance prototype is unsafe.

## Product learning

This dry run adds three concrete next steps:

1. Add a regulated-service or insurance starter before presenting this as industry-specific coverage.
2. Keep the transcript import path strict about speaker labels, but document common Markdown speaker forms such as `**Alex:**` and `**Alex (AI):**`.
3. Treat public samples as acquisition artifacts: they show time-to-first-report and workflow coverage, while private customer data remains outside the open repository.

## Next external step

If [kev-hu/vapi-voice-agent#1](https://github.com/kev-hu/vapi-voice-agent/issues/1) receives a reply, the next ask should be one of:

- A temporary test endpoint, so the same suite can run against the actual agent.
- Three sanitized transcripts, so we can compare public-sample behavior with more realistic conversation drift.
- Permission to share an aggregate report back on the issue without copying private transcript content.
