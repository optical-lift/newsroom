-- Optical Lift Newsroom: shared workspace + Transcript Core V1 custody spine.
-- This migration is intentionally not applied yet. It is the production schema contract
-- for the future dedicated Newsroom Supabase project, not Atlas's database.

create extension if not exists pgcrypto;

create table if not exists public.newsroom_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsroom_workspace_memberships (
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'reporter', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.is_newsroom_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.newsroom_workspace_memberships membership
    where membership.workspace_id = p_workspace_id
      and membership.user_id = auth.uid()
  );
$$;

revoke all on function public.is_newsroom_workspace_member(uuid) from public;
grant execute on function public.is_newsroom_workspace_member(uuid) to authenticated;

create table if not exists public.transcript_recordings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  title text not null,
  recorded_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  state text not null default 'uploading' check (
    state in (
      'uploading',
      'source_ready',
      'processing',
      'partially_processed',
      'ready',
      'failed_retryable',
      'failed_terminal',
      'deleted'
    )
  ),
  original_asset_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists transcript_recordings_workspace_created_idx
  on public.transcript_recordings(workspace_id, created_at desc);

create table if not exists public.transcript_audio_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  recording_id uuid not null references public.transcript_recordings(id) on delete cascade,
  kind text not null check (kind in ('original', 'normalized', 'chunk')),
  storage_path text not null unique,
  content_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text,
  created_at timestamptz not null default now(),
  unique (recording_id, kind, storage_path)
);

alter table public.transcript_recordings
  drop constraint if exists transcript_recordings_original_asset_fk;

alter table public.transcript_recordings
  add constraint transcript_recordings_original_asset_fk
  foreign key (original_asset_id)
  references public.transcript_audio_assets(id)
  on delete set null;

create unique index if not exists transcript_one_original_asset_per_recording_idx
  on public.transcript_audio_assets(recording_id)
  where kind = 'original';

create table if not exists public.transcript_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  recording_id uuid not null references public.transcript_recordings(id) on delete cascade,
  stage text not null check (stage in ('validate', 'normalize', 'chunk', 'transcribe', 'reassemble', 'diarize', 'index')),
  state text not null check (
    state in ('queued', 'processing', 'partially_processed', 'ready', 'failed_retryable', 'failed_terminal')
  ),
  provider text,
  model text,
  attempt integer not null default 1 check (attempt >= 1),
  source_asset_id uuid references public.transcript_audio_assets(id) on delete set null,
  output_asset_id uuid references public.transcript_audio_assets(id) on delete set null,
  provider_request_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transcript_processing_jobs_recording_idx
  on public.transcript_processing_jobs(recording_id, created_at);

create table if not exists public.transcript_transcripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  recording_id uuid not null unique references public.transcript_recordings(id) on delete cascade,
  current_revision_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.transcript_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  transcript_id uuid not null references public.transcript_transcripts(id) on delete cascade,
  ordinal integer not null check (ordinal >= 1),
  kind text not null check (kind in ('machine', 'human')),
  provider text,
  model text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (transcript_id, ordinal)
);

alter table public.transcript_transcripts
  drop constraint if exists transcript_transcripts_current_revision_fk;

alter table public.transcript_transcripts
  add constraint transcript_transcripts_current_revision_fk
  foreign key (current_revision_id)
  references public.transcript_revisions(id)
  on delete set null;

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  transcript_id uuid not null references public.transcript_transcripts(id) on delete cascade,
  start_ms bigint not null check (start_ms >= 0),
  end_ms bigint not null check (end_ms > start_ms),
  created_at timestamptz not null default now()
);

create index if not exists transcript_segments_timeline_idx
  on public.transcript_segments(transcript_id, start_ms, end_ms);

create table if not exists public.transcript_segment_texts (
  workspace_id uuid not null references public.newsroom_workspaces(id) on delete cascade,
  revision_id uuid not null references public.transcript_revisions(id) on delete cascade,
  segment_id uuid not null references public.transcript_segments(id) on delete cascade,
  text text not null,
  primary key (revision_id, segment_id)
);

alter table public.newsroom_workspaces enable row level security;
alter table public.newsroom_workspace_memberships enable row level security;
alter table public.transcript_recordings enable row level security;
alter table public.transcript_audio_assets enable row level security;
alter table public.transcript_processing_jobs enable row level security;
alter table public.transcript_transcripts enable row level security;
alter table public.transcript_revisions enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.transcript_segment_texts enable row level security;

create policy "workspace members can read workspace"
  on public.newsroom_workspaces
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(id));

create policy "members can read own workspace membership"
  on public.newsroom_workspace_memberships
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "workspace members can read recordings"
  on public.transcript_recordings
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can create recordings"
  on public.transcript_recordings
  for insert
  to authenticated
  with check (
    public.is_newsroom_workspace_member(workspace_id)
    and (created_by is null or created_by = auth.uid())
  );

create policy "workspace members can update recordings"
  on public.transcript_recordings
  for update
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id))
  with check (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read audio asset metadata"
  on public.transcript_audio_assets
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read processing jobs"
  on public.transcript_processing_jobs
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read transcripts"
  on public.transcript_transcripts
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read transcript revisions"
  on public.transcript_revisions
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read transcript segments"
  on public.transcript_segments
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

create policy "workspace members can read transcript segment text"
  on public.transcript_segment_texts
  for select
  to authenticated
  using (public.is_newsroom_workspace_member(workspace_id));

-- Private source bucket. Upload and playback URLs are created server-side after
-- workspace authorization; authenticated clients do not receive direct bucket policy.
insert into storage.buckets (id, name, public)
values ('newsroom-recordings', 'newsroom-recordings', false)
on conflict (id) do update set public = false;
