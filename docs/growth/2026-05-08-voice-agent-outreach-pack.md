# Voice Agent TestOps Outreach Pack

Date: 2026-05-08

Goal: get one real voice-agent endpoint or 1-3 sanitized transcripts from smaller, more responsive voice-agent builders.

Current operating plan after the first no-reply batch: [No-reply growth plan](2026-05-11-no-reply-growth-plan.md).

Public-safe proof link for future outreach: [Public proof gallery](public-proof-gallery.md).

## Copy-paste issue / discussion message

```text
Hi! I’m building an open-source Voice Agent TestOps tool and I’m looking for 3 real voice-agent projects to try it on this week.

It does not replace your voice stack. It runs scripted conversations against a test endpoint or sanitized transcript, then produces a JSON/HTML report for risky behavior such as:

- continuing after customer refusal / opt-out
- unsupported price, gift, availability, or outcome promises
- missed lead fields like phone, callback time, or preferred channel
- wrong handoff intent
- latency over threshold

I just added a public outbound leadgen demo report here:
https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/2026-05-08-public-outbound-leadgen-demo-report.md

If you have a dev endpoint or can share 1-3 sanitized transcripts, I can adapt a small suite to your project and share the report back. No raw phone numbers, private recording URLs, or customer names are needed.

Minimum endpoint shape:
POST /test-turn
return: { "spoken": "...", "summary": { ...optional lead fields... } }

Would you be open to a lightweight trial? If issue comments are not the right place, happy to move this to Discussions/email/Discord.
```

## Shorter reply version

```text
I’m looking for one real voice-agent endpoint or sanitized transcript to test Voice Agent TestOps against. It runs scripted customer turns, checks risky behavior, and returns JSON/HTML reports. I can adapt the suite to your domain and share the report back privately. Would that be useful for this project?
```

## 0.1.19 recording-seed reply

Use this for outbound / Vapi / Retell / LiveKit projects after the `0.1.19` release:

```text
Quick update: I just published voice-agent-testops@0.1.19 with a public-safe outbound recording seed suite.

The shape is: 50 private outbound recordings -> 5 reviewed regression candidates -> public synthetic turns for opt-out, private-channel pressure, gift promises, age/health qualification, and call-quality fallback.

You can inspect it without cloning:

npx --yes voice-agent-testops@0.1.19 list --industry outbound_leadgen
npx --yes voice-agent-testops@0.1.19 validate --suite examples/voice-testops/chinese-outbound-recording-seeds-suite.json

If you have one dev endpoint or one sanitized transcript, I can adapt this into a tiny project-specific report and share the output back. No raw recording URLs, phone numbers, or customer names are needed.
```

## Higher-response target list

Prioritize projects with clear business voice-agent use cases, recent updates, open issues, and small/medium maintainer footprint.

| Priority | Target | Link | Why it fits | Suggested angle |
|---:|---|---|---|---|
| 1 | Awaisali36 outbound real-estate Vapi agent | https://github.com/Awaisali36/Outbound-Real-State-Voice-AI-Agent- | Outbound lead calls, appointments, Vapi/n8n/Airtable; close to our outbound suite | Offer real-estate/outbound leadgen regression report |
| 2 | santmun Sofia voice agent | https://github.com/santmun/sofia-voice-agent | Retell + Twilio + Notion real-estate voice agent | Ask for one dev endpoint or sanitized failed call |
| 3 | askjohngeorge Pipecat lead qualifier | https://github.com/askjohngeorge/pipecat-lead-qualifier | Lead qualification bot; directly matches lead field and handoff assertions | Offer lead capture + opt-out checks |
| 4 | kylecampbell LiveKit outbound caller | https://github.com/kylecampbell/livekit-outbound-caller-agent | LiveKit + Twilio outbound caller | Offer outbound consent / handoff / promise guardrail suite |
| 5 | tetratensor LiveKit outbound caller | https://github.com/tetratensor/LiveKit-Outbound-Caller-Voice-Agent | PSTN outbound with LiveKit SIP trunks | Offer endpoint contract test and public-safe report |
| 6 | kirklandsig AIReceptionist | https://github.com/kirklandsig/AIReceptionist | Self-hosted AI phone receptionist | Offer appointment booking / human handoff checks |
| 7 | blackdwarftech siphon | https://github.com/blackdwarftech/siphon | Framework for AI calling agents; likely cares about testing story | Ask whether TestOps adapter would help users |
| 8 | intellwe AI calling agent | https://github.com/intellwe/ai-calling-agent | Twilio + OpenAI Realtime calling system | Offer Twilio phone-agent regression report |
| 9 | videosdk WhatsApp AI calling agent | https://github.com/videosdk-community/videosdk-whatsapp-ai-calling-agent | WhatsApp voice calling with Twilio/VideoSDK | Offer channel-specific consent and lead capture checks |
| 10 | VoiceBlender | https://github.com/VoiceBlender/voiceblender | Programmable voice platform with AI agents and SIP/WebRTC | Ask for REST/webhook test endpoint integration |
| 11 | rapidaai voice-ai | https://github.com/rapidaai/voice-ai | Voice AI orchestration platform; less likely than tiny repos but high relevance | Offer TestOps as release-gate example |
| 12 | theaifutureguy LiveKit voice agent | https://github.com/theaifutureguy/livekit-voice-agent | Production-ready LiveKit voice agent with telephony integration | Offer production-readiness report |
| 13 | codewithmuh AI voice receptionist | https://github.com/codewithmuh/ai-voice-agent | AI receptionist built with Claude SDK + Vapi | Offer booking/handoff test suite |
| 14 | ashishreddy2411 restaurant voice agent | https://github.com/ashishreddy2411/restaurant-voice-agent | Restaurant phone receptionist with LiveKit/Twilio | Offer restaurant booking suite |
| 15 | Teleglobals voicebot calling agent | https://github.com/Teleglobals-org/voicebot-calling-agent | Multilingual real-estate property search voice bot | Offer real-estate guardrail suite |
| 16 | frejun Teler Vapi bridge | https://github.com/frejun-tech/teler-vapi-bridge | Vapi telephony bridge; small but B2B-adjacent | Offer bridge contract test |
| 17 | DrDroidLab VoiceSummary | https://github.com/DrDroidLab/voicesummary | Transcript analysis and classification, not an agent but adjacent | Ask whether imported reports/transcripts could interop |
| 18 | voicetestdev VoiceTest | https://github.com/voicetestdev/voicetest | Similar testing category; maybe competitor/peer | Watch first; only reach out with interoperability angle |

## Send order

1. Send to priorities 1-8 first; they are concrete and likely to need pilot evidence.
2. Avoid opening issues on repos that clearly say no support or no promotion; use Discussions/email if available.
3. Track each contact in `docs/ops/external-pilot-tracker.zh-CN.md`.
4. Success metric is not a positive reply; success is one endpoint, one sanitized transcript, or one concrete integration blocker.


## Sent issue log

| Date | Priority | Target | Issue | Status | Follow-up date |
|---|---:|---|---|---|---|
| 2026-05-08 | 1 | Awaisali36 outbound real-estate Vapi agent | https://github.com/Awaisali36/Outbound-Real-State-Voice-AI-Agent-/issues/6 | contacted | 2026-05-10 |
| 2026-05-08 | 2 | santmun Sofia voice agent | https://github.com/santmun/sofia-voice-agent/issues/2 | contacted | 2026-05-10 |
| 2026-05-08 | 3 | askjohngeorge Pipecat lead qualifier | https://github.com/askjohngeorge/pipecat-lead-qualifier/issues/1 | contacted | 2026-05-10 |
| 2026-05-08 | 4 | kylecampbell LiveKit outbound caller | https://github.com/kylecampbell/livekit-outbound-caller-agent/issues/4 | contacted | 2026-05-10 |
| 2026-05-08 | 5 | tetratensor LiveKit outbound caller | https://github.com/tetratensor/LiveKit-Outbound-Caller-Voice-Agent/issues/1 | contacted | 2026-05-10 |
| 2026-05-08 | 6 | kirklandsig AIReceptionist | https://github.com/kirklandsig/AIReceptionist/issues/12 | contacted | 2026-05-10 |
| 2026-05-08 | 7 | blackdwarftech siphon | https://github.com/blackdwarftech/siphon/issues/19 | contacted | 2026-05-10 |
| 2026-05-08 | 8 | intellwe AI calling agent | https://github.com/intellwe/ai-calling-agent/issues/2 | contacted | 2026-05-10 |
| 2026-05-09 | 9 | videosdk WhatsApp AI calling agent | https://github.com/videosdk-community/videosdk-whatsapp-ai-calling-agent/issues/2 | contacted + 0.1.19 note | 2026-05-11 |
| 2026-05-09 | 10 | VoiceBlender | https://github.com/VoiceBlender/voiceblender/issues/28 | contacted + 0.1.19 note | 2026-05-11 |
| 2026-05-09 | 12 | theaifutureguy LiveKit voice agent | https://github.com/theaifutureguy/livekit-voice-agent/issues/6 | contacted + 0.1.19 note | 2026-05-11 |
| 2026-05-09 | 13 | codewithmuh AI voice receptionist | https://github.com/codewithmuh/ai-voice-agent/issues/2 | contacted | 2026-05-11 |
| 2026-05-09 | 15 | Teleglobals voicebot calling agent | https://github.com/Teleglobals-org/voicebot-calling-agent/issues/1 | contacted | 2026-05-11 |
| 2026-05-09 | 16 | frejun Teler Vapi bridge | https://github.com/frejun-tech/teler-vapi-bridge/issues/6 | contacted | 2026-05-11 |

## 48-hour follow-up templates

Use one short reply only. Do not add a second wall of text.

After 2026-05-11, prefer the warmer, proof-led drafts in the [no-reply growth plan](2026-05-11-no-reply-growth-plan.md). These older templates are still useful for short replies, but do not keep bumping zero-reply GitHub issues.

### Endpoint follow-up

```text
Quick follow-up: if a temporary endpoint is easier than transcripts, I only need a dev/test URL that returns `{ "spoken": string, "summary"?: object }`. I can run a tiny suite and share the report back privately.
```

### Transcript follow-up

```text
Quick follow-up: if an endpoint is too much, one sanitized transcript is enough. Please replace names/phones/recording URLs with placeholders like `[PHONE]` and `[CALL_ID]`; I can turn it into a small regression report.
```

### Close-the-loop follow-up

```text
No worries if now is not a good time. If this becomes useful later, the public demo report is here: https://github.com/monkeyin92/voice-agent-testops/blob/main/docs/growth/2026-05-08-public-outbound-leadgen-demo-report.md
```
