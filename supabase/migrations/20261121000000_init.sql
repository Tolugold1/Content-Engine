-- Content Engine schema (Supabase / Postgres).
-- Shapes mirror packages/core/src/schemas.ts. Multi-table writes go through
-- the functions at the bottom so each one is a single transaction.

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
  reaction_summary text not null default '',
  top_takes text[] not null default '{}',
  virality_score numeric(3, 1) not null check (virality_score between 1 and 10),
  detected_at timestamptz not null default now()
);
create index trends_detected_idx on trends (detected_at desc);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references trends (id) on delete cascade,
  outlet text not null,
  title text not null,
  url text not null,
  snippet text,
  fetched_at timestamptz not null default now(),
  unique (trend_id, url)
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references trends (id) on delete cascade,
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
  duration_sec numeric(5, 1) not null,
  video_key text,
  still_key text,
  audio_key text,
  telegram_chat_id text,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drafts_status_created_idx on drafts (status, created_at desc);
create index drafts_created_idx on drafts (created_at desc);

create table claims (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references drafts (id) on delete cascade,
  position smallint not null,
  text text not null,
  status claim_status not null,
  evidence_ids uuid[] not null default '{}',
  verdict judge_verdict not null,
  note text
);
create index claims_draft_idx on claims (draft_id, position);

-- One review per draft: the primary key makes "first decision wins" safe when
-- Telegram and the dashboard answer at the same moment.
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
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  comments integer not null default 0 check (comments >= 0),
  shares integer not null default 0 check (shares >= 0),
  source text not null check (source in ('api', 'screenshot', 'manual')),
  checked_at timestamptz not null default now()
);
create index metrics_draft_idx on metrics (draft_id, checked_at desc);

create table pipeline_events (
  id bigint generated always as identity primary key,
  draft_id uuid not null references drafts (id) on delete cascade,
  stage text not null,
  note text,
  at timestamptz not null default now()
);
create index pipeline_events_draft_idx on pipeline_events (draft_id, at);

-- Every paid API call (Claude, ElevenLabs, X), tied to its trend for cost per video.
create table usage (
  id bigint generated always as identity primary key,
  trend_id uuid references trends (id) on delete set null,
  provider text not null check (provider in ('anthropic', 'elevenlabs', 'x')),
  stage text not null,
  model text not null,
  prompt_version text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  units numeric not null default 0,
  cost_usd numeric(10, 6) not null,
  latency_ms integer not null default 0,
  created_at timestamptz not null default now()
);
create index usage_trend_idx on usage (trend_id);
create index usage_created_idx on usage (created_at desc);

-- What the Telegram bot is waiting for in a chat (a reason, caption, link or screenshot).
create table telegram_sessions (
  chat_id text primary key,
  action text not null check (action in ('reject_reason', 'edit_caption', 'post_link', 'metrics_screenshot')),
  draft_id uuid not null references drafts (id) on delete cascade,
  platform platform,
  expires_at timestamptz not null
);

create table source_health (
  name text primary key,
  ok boolean not null,
  note text not null default '',
  checked_at timestamptz not null default now()
);

-- Server-side access only (service role). No anon or authenticated access.
alter table trends enable row level security;
alter table evidence enable row level security;
alter table drafts enable row level security;
alter table claims enable row level security;
alter table reviews enable row level security;
alter table edits enable row level security;
alter table posts enable row level security;
alter table metrics enable row level security;
alter table pipeline_events enable row level security;
alter table usage enable row level security;
alter table telegram_sessions enable row level security;
alter table source_health enable row level security;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger drafts_touch before update on drafts for each row execute function touch_updated_at();

-- Creates a draft with its claims and starting timeline in one transaction.
create or replace function create_draft(p_draft jsonb, p_claims jsonb, p_events jsonb)
returns uuid language plpgsql as $$
declare
  v_id uuid;
begin
  insert into drafts (trend_id, slug, title, hook, tone, category, status, scenes, captions, hashtags,
                      engagement_question, duration_sec, video_key, still_key, audio_key)
  values (
    (p_draft->>'trend_id')::uuid, p_draft->>'slug', p_draft->>'title', p_draft->>'hook',
    (p_draft->>'tone')::tone, p_draft->>'category', (p_draft->>'status')::draft_status,
    p_draft->'scenes', p_draft->'captions',
    array(select jsonb_array_elements_text(p_draft->'hashtags')),
    p_draft->>'engagement_question', (p_draft->>'duration_sec')::numeric,
    p_draft->>'video_key', p_draft->>'still_key', p_draft->>'audio_key'
  )
  returning id into v_id;

  insert into claims (draft_id, position, text, status, evidence_ids, verdict, note)
  select v_id, (c.ordinality - 1)::smallint, c.value->>'text', (c.value->>'status')::claim_status,
         array(select jsonb_array_elements_text(c.value->'evidence_ids'))::uuid[],
         (c.value->>'verdict')::judge_verdict, c.value->>'note'
  from jsonb_array_elements(p_claims) with ordinality as c(value, ordinality);

  insert into pipeline_events (draft_id, stage, note, at)
  select v_id, e->>'stage', e->>'note', coalesce((e->>'at')::timestamptz, now())
  from jsonb_array_elements(p_events) as e;

  return v_id;
end;
$$;

-- Moves a draft to a new status (optionally attaching media) and logs it.
create or replace function transition_draft(
  p_draft_id uuid, p_from draft_status[], p_to draft_status, p_stage text, p_note text, p_media jsonb default null
) returns void language plpgsql as $$
begin
  update drafts set
    status = p_to,
    video_key = coalesce(p_media->>'video', video_key),
    still_key = coalesce(p_media->>'still', still_key),
    audio_key = coalesce(p_media->>'audio', audio_key),
    duration_sec = coalesce((p_media->>'duration_sec')::numeric, duration_sec)
  where id = p_draft_id and status = any (p_from);
  if not found then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  insert into pipeline_events (draft_id, stage, note) values (p_draft_id, p_stage, p_note);
end;
$$;

-- Records the first review decision. Raises 'review_conflict' if one exists.
create or replace function review_draft(p_draft_id uuid, p_decision text, p_channel review_channel, p_reason text)
returns void language plpgsql as $$
begin
  perform 1 from drafts where id = p_draft_id and status = 'pending_review' for update;
  if not found then
    if exists (select 1 from reviews where draft_id = p_draft_id) then
      raise exception 'review_conflict' using errcode = 'P0001';
    end if;
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  insert into reviews (draft_id, decision, channel, reason) values (p_draft_id, p_decision, p_channel, p_reason)
  on conflict (draft_id) do nothing;
  if not found then
    raise exception 'review_conflict' using errcode = 'P0001';
  end if;
  update drafts set status = p_decision::draft_status where id = p_draft_id;
  insert into pipeline_events (draft_id, stage, note)
  values (p_draft_id, 'reviewed', initcap(p_decision) || ' on ' || case p_channel when 'web' then 'the dashboard' else 'Telegram' end);
end;
$$;

-- Replaces one platform caption and records the edit.
create or replace function edit_caption(p_draft_id uuid, p_platform platform, p_text text, p_channel review_channel)
returns void language plpgsql as $$
declare
  v_before text;
begin
  select captions->>p_platform::text into v_before
  from drafts where id = p_draft_id and status in ('pending_review', 'approved') for update;
  if not found then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_before is distinct from p_text then
    update drafts set captions = jsonb_set(captions, array[p_platform::text], to_jsonb(p_text)) where id = p_draft_id;
    insert into edits (draft_id, field, before, after, channel)
    values (p_draft_id, 'caption.' || p_platform::text, coalesce(v_before, ''), p_text, p_channel);
    insert into pipeline_events (draft_id, stage, note) values (p_draft_id, 'caption_edited', p_platform::text || ' caption edited');
  end if;
end;
$$;

-- Records where a draft went live (idempotent per platform).
create or replace function record_post(p_draft_id uuid, p_platform platform, p_url text, p_via text)
returns void language plpgsql as $$
begin
  perform 1 from drafts where id = p_draft_id and status in ('approved', 'posted') for update;
  if not found then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  insert into posts (draft_id, platform, url, via) values (p_draft_id, p_platform, p_url, p_via)
  on conflict (draft_id, platform) do update set url = excluded.url, via = excluded.via, posted_at = now();
  update drafts set status = 'posted' where id = p_draft_id;
  insert into pipeline_events (draft_id, stage, note) values (p_draft_id, 'posted', 'Posted on ' || p_platform::text);
end;
$$;

revoke all on function create_draft, transition_draft, review_draft, edit_caption, record_post from public, anon, authenticated;
