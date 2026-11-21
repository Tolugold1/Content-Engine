# Testing before you host

## 1. Automated checks (no keys needed)

```bash
pnpm install
pnpm check        # format, lint, typecheck, 46 unit and integration tests
pnpm build        # production build of the dashboard
```

The tests cover the review rules (first decision wins, reasons, caption limits, posting), the Telegram bot flows, source parsers, voice timing, the claim-status logic, and the whole draft-producer workflow (including the "claims fail twice → blocked" path) with mocked APIs.

## 2. Dashboard preview (no keys)

```bash
pnpm dev          # http://localhost:3000
```

Runs on fictional sample drafts. Try: approve, reject with a reason, edit a caption, mark as posted, download the MP4 and still, filters and search in the Library, the Insights page.

## 3. Full pipeline locally

You need at least Supabase, Claude, ElevenLabs, R2 and Telegram keys (see `SETUP.md`). Put them in `.env` **and** `apps/web/.env.local`, plus `INNGEST_DEV=1` and `INNGEST_BASE_URL=http://localhost:8288`.

Open four terminals:

```bash
npx inngest-cli@latest dev -u http://localhost:3001/api/inngest   # workflow server + UI on :8288
pnpm dev:worker                                                    # pipeline + rendering on :3001
pnpm dev                                                           # dashboard on :3000
pnpm telegram:poll                                                 # Telegram without a public URL
```

### Checklist

| #   | Do                                                                                                                 | Expect                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Studio → **Scan now**                                                                                              | Inngest UI shows `trend-scout` running; Studio's source list fills in                                              |
| 2   | Wait for `produce-draft` (2–5 min per story)                                                                       | Steps: reactions → research → script → claim check → voice → render                                                |
| 3   | —                                                                                                                  | Telegram receives the video with Approve / Reject / Edit; the draft is in Review on the dashboard                  |
| 4   | Tap **Approve** in Telegram                                                                                        | Telegram caption shows "Approved on Telegram"; the dashboard shows the posting kit (refresh happens automatically) |
| 5   | On another draft, click **Reject** on the dashboard with a reason                                                  | The Telegram preview updates to "Rejected on the dashboard"                                                        |
| 6   | Approve the same draft in both places quickly                                                                      | Only one decision is kept; the other side says "Already approved"                                                  |
| 7   | Telegram: **Edit caption** → pick X → send new text                                                                | The caption changes on the dashboard; an edit appears on Insights                                                  |
| 8   | Post the MP4 by hand, tap **Mark TikTok as posted**, paste the link                                                | Draft shows Posted; `track-metrics` waits 24h                                                                      |
| 9   | Wait 24h (to test sooner, set `metricsCheckpointHours: [0.05]` in `packages/core/src/settings.ts`, i.e. 3 minutes) | The bot asks for analytics screenshots; send one and the numbers appear under Performance                          |
| 10  | Insights page                                                                                                      | Spend by stage and cost per posted video are filled in                                                             |

### Useful commands

```bash
curl localhost:3000/api/health          # which integrations the dashboard sees
curl localhost:3001/health              # same for the worker
curl -X POST localhost:3000/api/scans   # trigger a scan from the terminal
```

## 4. Evals (prompt quality)

```bash
pnpm eval              # all golden cases (~$1)
pnpm eval rumour       # one group
```

Reports land in `evals/reports/`. The run fails below an 85% pass rate; CI runs it on `main` when the `ANTHROPIC_API_KEY` secret is set (and on pull requests labelled `run-evals`).
