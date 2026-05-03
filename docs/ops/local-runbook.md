# Local Runbook

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL 15 or newer.
- A Feishu bot webhook for notification testing.

## Environment

Copy `.env.example` to both `.env` and `.env.local`.

Prisma CLI reads `.env`. Next.js reads `.env.local` during local app runtime. Keep both files aligned for local development.

```env
DATABASE_URL="postgresql://voiceai:voiceai@localhost:5432/voiceai"
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/replace-me"
AGENT_MODE="local"
PUBLIC_APP_URL="http://localhost:3000"
```

## Setup

```bash
npm install
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

## Manual Acceptance

1. Open `http://localhost:3000/admin`.
2. Create a merchant named `光影写真馆`.
3. Open `/m/<merchant-slug>?source=xiaohongshu`.
4. Ask `写真多少钱`.
5. Confirm the page speaks or displays a response with the configured price range.
6. Confirm a lead appears in the merchant detail page.
7. Confirm Feishu receives the lead summary when webhook is configured.

## Commercial Readiness Gate

The MVP is ready for first merchant trials when all checks pass:

- `npm test` passes.
- `npm run build` passes.
- Admin can create a merchant.
- Public page can create a lead.
- Feishu test endpoint returns `{ "ok": true }`.
- Two industry templates have at least 50 evaluation prompts each.
- Five pilot merchants can be manually onboarded by the team.
