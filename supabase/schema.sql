create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  provider text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  normalized_domain text not null,
  status text not null check (status in ('pending', 'running', 'complete', 'error')),
  source text not null default 'fresh' check (source in ('fresh', 'running', 'cache', 'forced')),
  cached_from_scan_id uuid references public.scans(id) on delete set null,
  results jsonb,
  error text,
  crtsh_error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists scans_normalized_domain_idx on public.scans(normalized_domain);
create index if not exists scans_domain_complete_idx on public.scans(normalized_domain, completed_at desc) where status = 'complete';
create index if not exists scans_status_idx on public.scans(status);

create table if not exists public.scan_requests (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  domain text not null,
  source text not null check (source in ('fresh', 'running', 'cache', 'forced')),
  cache_age_seconds integer,
  forced boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists scan_requests_user_created_idx on public.scan_requests(user_id, created_at desc);
create index if not exists scan_requests_scan_idx on public.scan_requests(scan_id);

create table if not exists public.user_activity (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_user_created_idx on public.user_activity(user_id, created_at desc);
create index if not exists user_activity_action_idx on public.user_activity(action);

create table if not exists public.ai_suggestions (
  id bigserial primary key,
  scan_id uuid not null references public.scans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_suggestions_scan_idx on public.ai_suggestions(scan_id, created_at desc);
create index if not exists ai_suggestions_user_idx on public.ai_suggestions(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.scan_requests enable row level security;
alter table public.user_activity enable row level security;
alter table public.ai_suggestions enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "scans authenticated select" on public.scans;
create policy "scans authenticated select" on public.scans
  for select to authenticated
  using (true);

drop policy if exists "scan_requests own select" on public.scan_requests;
create policy "scan_requests own select" on public.scan_requests
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "scan_requests own insert" on public.scan_requests;
create policy "scan_requests own insert" on public.scan_requests
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_activity own select" on public.user_activity;
create policy "user_activity own select" on public.user_activity
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_activity own insert" on public.user_activity;
create policy "user_activity own insert" on public.user_activity
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "ai_suggestions own select" on public.ai_suggestions;
create policy "ai_suggestions own select" on public.ai_suggestions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_suggestions own insert" on public.ai_suggestions;
create policy "ai_suggestions own insert" on public.ai_suggestions
  for insert to authenticated
  with check (auth.uid() = user_id);
