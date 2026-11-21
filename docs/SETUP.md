# Setup: getting and slotting in the keys

Everything the engine needs comes from environment variables. Copy `.env.example` to:

- `.env` at the repository root (used by the worker and by Docker), and
- `apps/web/.env.local` (used by the dashboard when you run it with `pnpm dev`).

Leave a value empty and that feature is skipped (the health endpoints at `/api/health` and the worker's `/health` show what is configured). A step that needs a missing key fails with a message naming the key and pointing to the section below.

| Feature                         | Keys                                                                     | Needed for                                        | Cost               |
| ------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- | ------------------ |
| [Supabase](#supabase)           | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                              | Everything beyond sample mode                     | Free tier          |
| [Inngest](#inngest)             | `INNGEST_DEV` (local) or `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`     | Running the pipeline                              | Free (self-hosted) |
| [Claude](#claude)               | `ANTHROPIC_API_KEY`                                                      | Triage, scripts, claim checks, screenshot reading | ~$15–20/month      |
| [ElevenLabs](#elevenlabs)       | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`                              | Your cloned voice                                 | $6–22/month        |
| [Cloudflare R2](#cloudflare-r2) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Storing audio, videos, stills                     | Free tier (10 GB)  |
| [Telegram](#telegram)           | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`      | Review on your phone                              | Free               |
| [X API](#x-api)                 | `X_BEARER_TOKEN`                                                         | X trends and reactions (optional)                 | ~$15–22/month      |
| [YouTube](#youtube)             | `YOUTUBE_API_KEY`                                                        | Trending videos + Shorts metrics (optional)       | Free               |
| [Football data](#football-data) | `FOOTBALL_DATA_API_KEY`                                                  | Matchday Hype fixtures (optional)                 | Free tier          |
| Dashboard                       | `APP_URL`, `DASHBOARD_PASSWORD`, `DOMAIN`                                | Public access                                     | —                  |

## Supabase

1. Create a project at supabase.com (free tier is enough).
2. Open **SQL Editor**, paste the whole of `supabase/migrations/20261121000000_init.sql` and run it. (With the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Project Settings → API**: copy the **Project URL** into `SUPABASE_URL` and the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key bypasses row-level security, so it must only ever live on the server (it does: nothing in the browser talks to Supabase). Every table has RLS on with no public policies.

## Inngest

Inngest runs the workflows: schedules, retries, waiting for your review, reminders.

- **Local:** run `npx inngest-cli@latest dev -u http://localhost:3001/api/inngest` and set `INNGEST_DEV=1` and `INNGEST_BASE_URL=http://localhost:8288`. Its UI at http://localhost:8288 shows every run step by step.
- **Production (docker-compose):** generate two keys with `openssl rand -hex 32` and put them in `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`. The compose file runs the self-hosted server with them; leave `INNGEST_DEV` empty.

## Claude

1. Create a key at console.anthropic.com → **API Keys**, put it in `ANTHROPIC_API_KEY`.
2. Set a monthly spend limit in the console while you learn your real usage.

Models are set in `packages/ai/src/client.ts`: Claude Haiku 5.5 for triage and screenshots, Claude Opus 5.5 for research, scripts and the claim check. Refusals fall back automatically to another model server-side.

## ElevenLabs

1. Subscribe to **Starter** (instant voice clone, 1–2 minutes of clean audio) or **Creator** (professional clone, 30+ minutes; recommended once you post daily: 3 videos a day is ~50k characters a month).
2. **Voices → Add voice → Clone**: record in a quiet room, mic close, your natural "gist" voice.
3. Copy the voice ID into `ELEVENLABS_VOICE_ID` and your API key (**Profile → API keys**) into `ELEVENLABS_API_KEY`.

`ELEVENLABS_MODEL_ID` defaults to `eleven_multilingual_v2`; switch to a cheaper/faster model if your plan's credits run short.

## Cloudflare R2

1. Cloudflare dashboard → **R2** → create a bucket (e.g. `golden-gist`). Keep it private.
2. **R2 → Manage API tokens → Create token** with _Object Read & Write_ on that bucket.
3. Fill `R2_ACCOUNT_ID` (shown on the R2 overview), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

Files stay private; the dashboard and Telegram use short-lived signed links. Optional: add a lifecycle rule to delete `drafts/` objects after 60 days.

## Telegram

1. Talk to **@BotFather** → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `message.chat.id` into `TELEGRAM_CHAT_ID`. Only this chat can control the bot.
3. Put a random string in `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 24`).
4. Connect the bot:
   - **Production:** with `APP_URL` set to your https domain, run `pnpm telegram:webhook` (in Docker: `docker compose exec worker pnpm telegram:webhook`).
   - **Local:** run `pnpm telegram:poll` instead; it pulls updates without a public URL.

## X API

1. developer.x.com → create a project and app on **pay-per-use**, set a monthly spending cap.
2. Copy the app's **Bearer token** into `X_BEARER_TOKEN`.

Used for Nigeria trends (hourly) and ~30 reactions per selected story, plus metrics for your own X posts. Without it the scout still runs on Google Trends, YouTube, news feeds and fixtures.

## YouTube

Google Cloud console → enable **YouTube Data API v3** → **Credentials → API key** → `YOUTUBE_API_KEY`. Used for Nigeria's most-popular chart and for reading your Shorts' public view counts. Free within the default quota.

## Football data

Register at football-data.org (free tier), copy the token into `FOOTBALL_DATA_API_KEY`. Followed teams and competitions are in `packages/core/src/settings.ts`.

## Brand and schedule

Brand voice, hashtag, posting times, daily quota, minimum score, news feeds and followed teams live in `packages/core/src/settings.ts`. Change them there; no other file needs editing.
