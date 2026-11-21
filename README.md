# Content Engine

Personal content creation tool: spots what's trending in Nigeria, writes short scripts with every claim checked
against sources, voices them in a cloned voice, renders vertical videos and sends them for one-tap approval on
Telegram or in a 3D web dashboard. First brand: **Golden Gist by Tolugold**.

![Golden Gist Studio](docs/screenshots/studio.webp)

## Golden Gist Studio (dashboard)

- **Studio:** a 3D gold emblem (React Three Fiber), the week at a glance, what's waiting, what's ready to post, what's live.
- **Review queue:** the same drafts Telegram receives, with claim checks summarised.
- **Draft page:** the video in a 3D phone frame, Approve / Reject, per-platform captions with copy and edit, a posting
  checklist, "mark as posted" links, the claim ledger, the script and a full timeline.
- **Library:** every video by day, filter by status or template, search, one-click MP4 and still downloads.

Approving on the web and on Telegram use the same rules and the same database row, and the first decision wins.
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000, runs on built-in sample data
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm typecheck`.

Copy `.env.example` to `apps/web/.env.local` to configure. Set `DASHBOARD_PASSWORD` before deploying anywhere public:
every page and download then asks for it.

## Layout

```
apps/web/            Next.js 16 dashboard
packages/core/       Shared types, review rules, platform limits, event contract
supabase/migrations/ Postgres schema
docs/                Architecture and decisions
```

The sample stories, people, clubs and outlets in `apps/web/lib/sample-data.ts` are fictional.
