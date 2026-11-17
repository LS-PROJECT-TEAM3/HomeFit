-- plan 001 3단계: 첫 기능에 필요한 표 11개. 이름과 뜻은 docs/ERD.md v1.0을 따른다.

-- 회원 (ERD profiles)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

-- 공고·정책 조건 (ERD policy_conditions, FR-002)
create table public.policy_conditions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sido_code text not null check (sido_code ~ '^\d{2}$'),
  sigungu_code text check (sigungu_code ~ '^\d{5}$'),
  supply_types text[] not null default array['ALL'],
  max_monthly_rent integer check (max_monthly_rent >= 0),
  age integer check (age between 0 and 120),
  created_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now(),
  check (sigungu_code is null or left(sigungu_code, 2) = sido_code)
);

-- 수집 출처 (ERD sources)
create table public.sources (
  code text primary key,
  name text not null,
  schedule text not null,
  enabled boolean not null default true
);

insert into public.sources (code, name, schedule)
values ('myhome_notice', '마이홈 공공임대 모집공고', '하루 1번');

-- 실행 기록 (ERD runs, FR-003·004)
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  source_code text not null references public.sources (code),
  trigger text not null check (trigger in ('scheduled', 'manual', 'simulation')),
  triggered_by uuid references public.profiles (id),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 실행 단계 (ERD run_steps)
create table public.run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  step_order integer not null,
  step_name text not null check (
    step_name in ('collect', 'compare', 'detect', 'draft_plan', 'await_approval', 'record')
  ),
  status text not null check (status in ('succeeded', 'failed', 'waiting', 'skipped')),
  items_in integer,
  items_out integer,
  detail jsonb,
  started_at timestamptz,
  finished_at timestamptz
);

-- 공고 한 건 (ERD source_items, FR-003·006)
create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  source_code text not null references public.sources (code),
  external_id text not null,
  title text not null,
  sido_code text,
  sigungu_code text,
  supply_type text,
  monthly_rent integer,
  announced_at date,
  apply_start date,
  apply_end date,
  url text,
  content_hash text not null,
  raw jsonb not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_code, external_id)
);

-- 모은 값, 같은 모양 (ERD observations, 평가항목 P3-02)
create table public.observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  source_code text not null references public.sources (code),
  observed_at timestamptz not null,
  target text not null,
  metric text not null,
  value_numeric numeric,
  value_text text,
  change_amount numeric,
  source_item_id uuid references public.source_items (id),
  raw jsonb,
  is_simulated boolean not null default false
);

-- 사건 (ERD incidents, FR-005·006·009)
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  incident_type text not null check (
    incident_type in ('housing_support', 'humidity_condensation', 'rent_price_change')
  ),
  target_kind text not null check (target_kind in ('condition', 'home', 'interest_area')),
  target_id uuid,
  source_item_id uuid references public.source_items (id),
  run_id uuid not null references public.runs (id),
  dedup_key text not null,
  status text not null default 'new' check (status in ('new', 'pending', 'approved', 'rejected')),
  facts jsonb not null,
  is_updated boolean not null default false,
  is_simulated boolean not null default false,
  detected_at timestamptz not null default now(),
  first_viewed_at timestamptz,
  closed_at timestamptz,
  unique (user_id, dedup_key)
);

-- 대응안 (ERD response_plans, FR-010)
create table public.response_plans (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.incidents (id) on delete cascade,
  plan_type text not null check (
    plan_type in ('application_prep', 'response_plan', 'renewal_memo', 'interest_home_review')
  ),
  ai_summary text,
  checklist jsonb not null,
  citations jsonb not null default '[]'::jsonb,
  generation_status text not null check (generation_status in ('succeeded', 'failed')),
  model text,
  created_at timestamptz not null default now()
);

-- 처리 이력, 쌓기만 한다 (ERD incident_actions, FR-011·012)
create table public.incident_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  actor_id uuid not null references public.profiles (id),
  action text not null check (action in ('approve', 'reject')),
  reason text,
  created_at timestamptz not null default now(),
  check (action <> 'reject' or length(btrim(coalesce(reason, ''))) > 0)
);

-- 내 일정 (ERD schedule_items, FR-011·013)
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  response_plan_id uuid not null unique references public.response_plans (id) on delete cascade,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  title text not null,
  due_date date,
  checklist_state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_user_status_idx on public.incidents (user_id, status, detected_at desc);
create index runs_source_started_idx on public.runs (source_code, started_at desc);
create index schedule_items_user_idx on public.schedule_items (user_id, due_date);
