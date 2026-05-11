# No-reply growth plan

Date: 2026-05-11

Context: recent GitHub issue outreach produced two warm signals and many zero-reply issues. The next step is not more volume on the same issues. The next step is to convert proof into a lower-friction ask, then use GitHub comments only where there is already signal.

## Current state

| Group | Items | State | Decision |
|---|---:|---|---|
| Warm reply | 2 | `streamcoreai/streamcore-server#4`, `codewithmuh/ai-voice-agent#2` | Follow up once, with a concrete endpoint/transcript ask |
| Self-followed, no maintainer reply | 4 | Kevin Hu plus 0.1.19 seed updates | Wait; do not add another public bump yet |
| Zero-comment outreach | 15+ | Mostly open with no comments | One final close-the-loop follow-up at most, then dormant |
| Current proof assets | 4 | Public demo report, HTTP bridge demo, recording-derived seeds, Kevin Hu public sample | Aggregate under [public proof gallery](public-proof-gallery.md) |
| New low-friction commands | 2 | `transcript-trial`, `proof-card` | Use transcript-only trials and short proof cards before asking for a full endpoint |

## Execution schedule

| Date | Action | Target | Message rule |
|---|---|---|---|
| 2026-05-11 | Publish proof gallery and update tracker | Repo docs | No external bump |
| 2026-05-12 | Warm follow-up | `streamcoreai/streamcore-server#4` | Ask for scriptable route behind the public demo or one sanitized transcript |
| 2026-05-14 | Warm follow-up if no data arrives | `codewithmuh/ai-voice-agent#2` | Respect that they said "this week"; ask for the easiest of endpoint or transcript |
| 2026-05-13 to 2026-05-15 | Optional single close-the-loop note | 2026-05-08 zero-comment batch | Link one relevant proof, then stop |
| 2026-05-16 | Dormant review | All no-reply issues | Mark dormant unless a maintainer replied |
| 2026-05-18 | Channel shift | Discord, Discussions, email, LinkedIn | Lead with proof gallery, not another GitHub issue |

## Warm follow-up drafts

### Streamcore

```text
Quick follow-up. I can start with the public demo if there is a scriptable route behind streamcore.ai.

Minimum shape is just a way to send one user turn and receive the assistant reply, for example HTTP `{ "text": "..." } -> { "spoken": "..." }`, or a WebSocket equivalent. If that is not exposed, one sanitized transcript is enough.

I put the public-safe proof examples here so the ask is more concrete:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/public-proof-gallery.md

I would only share aggregate findings back on the issue unless you explicitly approve more detail.
```

### codewithmuh

```text
Quick check-in from last week. Either path is still fine:

1. a dev/test endpoint that returns `{ "spoken": string, "summary"?: object }`
2. one sanitized booking, missed-call, or handoff transcript

I put public-safe proof examples here so the expected output is clearer:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/public-proof-gallery.md

Please do not share production credentials, raw phone numbers, customer names, or private recording URLs in the issue.
```

### Cold close-the-loop

```text
No worries if now is not a good time. I put the public-safe proof examples here in case this becomes useful later:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/public-proof-gallery.md

The minimum trial remains one dev/test endpoint returning `{ "spoken": string, "summary"?: object }`, or one sanitized transcript with private details replaced by placeholders.
```

## Transcript-first fallback

If a maintainer says an endpoint is too much work, do not keep negotiating the bridge. Ask for one sanitized transcript and run:

```bash
pbpaste | npx voice-agent-testops transcript-trial \
  --stdin \
  --out-dir .voice-testops/<pilot-id> \
  --merchant-name "<project name>" \
  --industry outbound_leadgen \
  --customer "<project name>"
```

This produces `report.html`, `summary.md`, `commercial-report.md`, `pilot-recap.md`, `proof-card.md`, and, when failures exist, `regression-draft.json` plus `failure-clusters.md`.

For follow-up copy, use:

```bash
npx voice-agent-testops proof-card \
  --report .voice-testops/<pilot-id>/report.json \
  --out .voice-testops/<pilot-id>/proof-card.md \
  --customer "<project name>" \
  --period "first transcript-only trial"
```

## Stop rules

- Do not post more than one follow-up on a zero-reply GitHub issue.
- Do not ask for raw recordings, private replay URLs, customer names, phone numbers, API keys, bearer tokens, cookies, CRM exports, or production credentials.
- Do not describe a public sample dry run as an owner-approved benchmark.
- If a maintainer asks to move channels, move immediately and keep the GitHub issue quiet.
- If a maintainer says no, mark `closed_lost` with the reason and do not reopen the thread.

## Success metric

For this week, success is one of:

- one scriptable endpoint;
- one sanitized transcript;
- one maintainer saying the endpoint contract is wrong and naming the blocker;
- one non-GitHub conversation with a real voice-agent builder.

Stars, likes, or extra cold issues do not count as progress.
