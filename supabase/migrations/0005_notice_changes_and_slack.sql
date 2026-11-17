-- spec 001 v0.2, plan 7단계, ERD v1.1
-- 공고 변화 사건(FR-006, FR-016), 맞는 공고(FR-017), 슬랙 알림(FR-018, FR-019)

-- 1) 공고 한 건: 정정공고·같은 단지 판단과 "전 → 후"에 쓰는 칸 (ERD source_items)
alter table public.source_items
  add column complex_key text,
  add column status_name text,
  add column before_external_id text,
  add column previous_values jsonb;

create index source_items_complex_key_idx on public.source_items (source_code, complex_key);

-- 2) 맞는 공고 목록(FR-017): 공고는 공개 자료라 로그인한 사용자는 모두 읽는다 (ERD 접근 규칙 v1.1)
drop policy source_items_select on public.source_items;
create policy source_items_select on public.source_items for select to authenticated
  using (true);

-- 3) 실행 단계에 "알림" 상자 (ERD run_steps.step_name)
alter table public.run_steps drop constraint run_steps_step_name_check;
alter table public.run_steps add constraint run_steps_step_name_check check (
  step_name in ('collect', 'compare', 'detect', 'draft_plan', 'notify', 'await_approval', 'record')
);

-- 4) 슬랙 알림 설정 (ERD notification_settings). 웹훅 주소는 비밀값: 본인만 읽고 관리자도 못 읽는다
create table public.notification_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  slack_webhook_url text check (slack_webhook_url like 'https://hooks.slack.com/%'),
  enabled boolean not null default false,
  enabled_at timestamptz,
  updated_at timestamptz not null default now(),
  -- 주소 없이 켤 수는 없다
  check (not enabled or slack_webhook_url is not null)
);

alter table public.notification_settings enable row level security;
create policy notification_settings_select_own on public.notification_settings for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_settings_insert_own on public.notification_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_settings_update_own on public.notification_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 5) 알림 기록 (ERD notifications). 같은 사건은 한 번만 보낸다. 쓰기는 서버(수집)만
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('slack')),
  status text not null check (status in ('sent', 'failed')),
  attempts integer not null default 1 check (attempts >= 1),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (incident_id, channel)
);

create index notifications_retry_idx on public.notifications (status, attempts);

alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
