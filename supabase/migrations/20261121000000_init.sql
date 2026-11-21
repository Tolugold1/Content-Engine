-- Content Engine: initial schema (Supabase / Postgres)
-- Shapes mirror packages/core/src/schemas.ts.

create extension if not exists pgcrypto;

create type draft_status as enum ('rendering', 'pending_review', 'approved', 'rejected', 'posted', 'failed');
create type tone as enum ('comedy', 'explainer', 'hype');
create type platform as enum ('tiktok', 'instagram', 'youtube', 'x', 'facebook');
create type claim_status as enum ('confirmed', 'reported', 'chatter');
create type judge_verdict as enum ('supported', 'misframed', 'unsupported');
create type review_channel as enum ('web', 'telegram');

create table trends (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sources text[] not null default '{}',
  mood text not null,
  reaction_summary text,
  top_takes text[] not null default '{}',
  virality_score numeric(3, 1) check (virality_score between 1 and 10),
  category text,
  detected_at timestamptz not null default now()
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid references trends (id) on delete set null,
  slug text not null unique,
  title text not null,
  hook text not null,
  tone tone not null,
  category text not null,
  status draft_status not null default 'rendering',
  scenes jsonb not null,
  captions jsonb not null,
  hashtags text[] not null default '{}',
  engagement_question text not null,
  duration_sec numeric(5, 1),
  video_key text,  -- R2 object key; the app signs short-lived URLs
  still_key text,
  cost_usd numeric(8, 4) not null default 0,
  telegram_chat_id text,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drafts_status_created_idx on drafts (status, created_at desc);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references trends (id) on delete cascade,
  outlet text not null,
  title text not null,
  url text not null,
  snippet text,
  fetched_at timestamptz not null default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts (id) on delete cascade,
  text text not null,
  status claim_status not null,
  evidence_ids uuid[] not null default '{}',
  verdict judge_verdict not null,
  note text
);

-- One review per draft. The primary key is what makes "first decision wins"
-- safe when Telegram and the dashboard answer at the same moment:
--   insert ... on conflict (draft_id) do nothing returning *
-- returns no row for the slower channel, which then shows the existing decision.
create table reviews (
  draft_id uuid primary key references drafts (id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  channel review_channel not null,
  reason text,
  created_at timestamptz not null default now(),
  check (decision = 'approved' or reason is not null)
);

-- Every human edit, kept as training signal for prompts and few-shot examples.
create table edits (
  id bigint generated always as identity primary key,
  draft_id uuid not null references drafts (id) on delete cascade,
  field text not null,
  before text not null,
  after text not null,
  channel review_channel not null,
  created_at timestamptz not null default now()
);

create table posts (
  id bigint generated always as identity primary key,
  draft_id uuid not null references drafts (id) on delete cascade,
  platform platform not null,
  url text not null,
  via text not null check (via in ('manual', 'api')),
  posted_at timestamptz not null default now(),
  unique (draft_id, platform)
);

create table metrics (
  id bigint generated always as identity primary key,
  draft_id uuid not null references drafts (id) on delete cascade,
  platform platform not null,
  views integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  source text not null check (source in ('api', 'screenshot', 'manual')),
  checked_at timestamptz not null default now()
);
create index metrics_draft_idx on metrics (draft_id, checked_at desc);

create table pipeline_events (
  id bigint generated always as identity primary key,
  trend_id uuid references trends (id) on delete cascade,
  draft_id uuid references drafts (id) on delete cascade,
  stage text not null,
  note text,
  at timestamptz not null default now()
);
create index pipeline_events_draft_idx on pipeline_events (draft_id, at);

-- Cost and quality telemetry for every model call.
create table llm_calls (
  id bigint generated always as identity primary key,
  draft_id uuid references drafts (id) on delete set null,
  stage text not null,
  model text not null,
  prompt_version text not null,
  input_tokens integer not null,
  output_tokens integer not null,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(10, 6) not null,
  latency_ms integer not null,
  created_at timestamptz not null default now()
);

-- The dashboard and workers use the service role on the server; no anon access.
alter table trends enable row level security;
alter table drafts enable row level security;
alter table evidence enable row level security;
alter table claims enable row level security;
alter table reviews enable row level security;
alter table edits enable row level security;
alter table posts enable row level security;
alter table metrics enable row level security;
alter table pipeline_events enable row level security;
alter table llm_calls enable row level security;

-- Live "new draft" updates in the dashboard.
alter publication supabase_realtime add table drafts;
