# Vapi Retell Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runnable Vapi/Retell quickstart bridge that lets a developer verify the HTTP TestOps contract locally, then wire the same bridge to platform webhooks within 30 minutes.

**Architecture:** Keep platform-specific logic in `examples/voice-platform-bridge/server.mjs`. The server exposes `POST /test-turn` for deterministic regression tests, `POST /vapi/webhook` for Vapi Server URL smoke tests, and `POST /retell/webhook` for Retell call-event webhook smoke tests. Docs explain that full Vapi/Retell calls are slower smoke tests, while CI should hit the deterministic `test-turn` bridge.

**Tech Stack:** Node.js `http`, Vitest dynamic ESM import, Markdown integration docs, existing `--agent http` adapter.

---

### Task 1: Runnable Bridge Example

**Files:**
- Create: `examples/voice-platform-bridge/server.mjs`
- Create: `examples/voice-platform-bridge/README.md`
- Create: `tests/testops/voicePlatformBridgeExample.test.ts`
- Modify: `package.json`
- Modify: `tests/testops/packageMetadata.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that import `examples/voice-platform-bridge/server.mjs` and expect:

- `createBridgeTurnResponse()` returns non-empty `spoken` plus a `summary.intent`, `summary.phone`, `summary.budget`, and `summary.preferredTime`.
- `createVapiWebhookAck()` recognizes Vapi message events and call IDs.
- `createRetellWebhookAck()` recognizes Retell `call_analyzed` events and call IDs.
- `package.json` contains `example:voice-platform-bridge`.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/testops/voicePlatformBridgeExample.test.ts tests/testops/packageMetadata.test.ts`

Expected: FAIL because the example and script do not exist.

- [ ] **Step 3: Implement bridge server**

Create a standalone Node server with:

- `GET /healthz`
- `POST /test-turn`
- `POST /vapi/webhook`
- `POST /retell/webhook`

Use port `4319` by default and no third-party dependencies.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/voicePlatformBridgeExample.test.ts tests/testops/packageMetadata.test.ts`

Expected: PASS.

### Task 2: Vapi and Retell Docs

**Files:**
- Modify: `docs/integrations/vapi.md`
- Modify: `docs/integrations/retell.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `tests/testops/integrationDocs.test.ts`

- [ ] **Step 1: Write doc assertions first**

Update integration doc tests to require:

- `npm run example:voice-platform-bridge`
- `http://127.0.0.1:4319/test-turn`
- Vapi phrases: `Server URLs`, `vapi listen --forward-to`, `/vapi/webhook`
- Retell phrases: `Call Event Webhook`, `LLM WebSocket`, `/retell/webhook`, `call_analyzed`

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: FAIL until docs are updated.

- [ ] **Step 3: Update docs**

Rewrite Vapi/Retell guides as 30-minute runbooks with official doc links and copy-paste commands:

- local bridge startup
- `doctor`
- `voice-test run`
- platform webhook smoke test
- CI recommendation

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/testops/integrationDocs.test.ts`

Expected: PASS.

### Task 3: Roadmap and Verification

**Files:**
- Modify: `docs/roadmap/2026-05-07-commercial-moat-roadmap.zh-CN.md`

- [ ] **Step 1: Mark roadmap item done**

Check off `补 Vapi / Retell 最短接入示例，优先保证 30 分钟内跑通。`

- [ ] **Step 2: Verify example against a real suite**

Run:

```bash
npm run example:voice-platform-bridge
npm run voice-test -- --suite examples/voice-testops/chinese-real-estate-agent-suite.json --agent http --endpoint http://127.0.0.1:4319/test-turn --fail-on-severity critical
```

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Commit, push, PR, merge, delete branch**

Run:

```bash
git add ...
git commit -m "feat: add Vapi and Retell quickstart bridge"
git push -u origin codex/vapi-retell-quickstart
gh pr create --title "feat: add Vapi and Retell quickstart bridge" --body "..."
gh pr merge --squash --delete-branch
git switch main
git pull --ff-only
git fetch --prune origin
```
