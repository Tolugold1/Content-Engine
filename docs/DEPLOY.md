# Deploying to a VPS

One small server runs everything: the dashboard, the worker (rendering), the workflow server and HTTPS.

## Server

- 2 vCPU / 4 GB RAM minimum (e.g. Hetzner CX22), Ubuntu 24.04. Rendering one 30-second video takes ~1–2 minutes.
- Install Docker: `curl -fsSL https://get.docker.com | sh`
- Point a domain (e.g. `studio.example.com`) at the server's IP with an A record.

## First deploy

```bash
git clone <your repo> content-engine && cd content-engine
cp .env.example .env        # fill it in: docs/SETUP.md
```

In `.env` set at least: `APP_URL=https://studio.example.com`, `DOMAIN=studio.example.com`, the sign-in keys (`SUPABASE_ANON_KEY`, `OWNER_EMAIL`, `SIGNUP_CODE`), `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (`openssl rand -hex 32` each), and leave `INNGEST_DEV` empty.

```bash
docker compose up -d --build
docker compose exec worker pnpm telegram:webhook   # connect Telegram to https://<domain>/api/telegram/webhook
curl https://studio.example.com/api/health
```

Apply the database migration once in Supabase (SQL Editor, or `supabase db push`), then open `https://<domain>/signup` and create your account (see `SETUP.md#authentication`).

## Operating it

| Task                            | Command                                                               |
| ------------------------------- | --------------------------------------------------------------------- |
| Logs                            | `docker compose logs -f worker` (or `web`, `inngest`)                 |
| Workflow runs, retries, replays | `ssh -L 8288:localhost:8288 <server>` then open http://localhost:8288 |
| Update                          | `git pull && docker compose up -d --build`                            |
| Restart one service             | `docker compose restart worker`                                       |
| Trigger a scan                  | Dashboard → Scan now                                                  |

The trend scout runs hourly from 07:05 to 23:05 Lagos time (`SCHEDULE` in `packages/core/src/settings.ts`).

## Security notes

- Only `OWNER_EMAIL` can sign in (Supabase Auth). Pages, server actions and the API all require that session; `/api/health` and the Telegram webhook are excluded, and the webhook checks Telegram's secret token instead.
- Turn off public sign-ups in Supabase; the app creates the single owner account itself.
- The Inngest UI is bound to `127.0.0.1`; reach it through an SSH tunnel only.
- Secrets live only in `.env` on the server. Supabase uses the service-role key server-side; RLS blocks everything else.
- R2 objects are private; links expire after 15–60 minutes.
