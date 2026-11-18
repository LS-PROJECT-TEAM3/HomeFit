-- spec 003 2단계 (plan 003 2절 "DB 변경"), ERD v1.4 homes·indoor_measurements·sources. ERD 표·칸은 바꾸지 않는다
-- 내 집, 측정값(실내 온습도), 기상청 예보 출처, 승인 때 일정 마감일 규칙

-- 1) 내 집: 회원당 하나 (ERD homes, PRD FR-03)
create table public.homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  sigungu_code text not null check (sigungu_code ~ '^\d{5}$'),
  housing_type text not null check (housing_type in ('apartment', 'officetel', 'row_house', 'detached')),
  exclusive_area_m2 numeric not null check (exclusive_area_m2 between 1 and 300),
  contract_type text check (contract_type in ('monthly', 'jeonse')),
  deposit integer check (deposit >= 0),
  monthly_rent integer check (monthly_rent >= 0),
  contract_end_date date,
  window_type text not null check (window_type in ('single', 'double', 'unknown')),
  created_by uuid not null references public.profiles (id),
  updated_at timestamptz not null default now()
);

-- 2) 측정값: 내 집에 쌓인다 (ERD indoor_measurements, PRD FR-04)
create table public.indoor_measurements (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  temperature_c numeric not null check (temperature_c between -10 and 45),
  humidity_pct numeric not null check (humidity_pct between 0 and 100),
  measured_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index indoor_measurements_home_measured on public.indoor_measurements (home_id, measured_at desc);

-- 접근 규칙(ERD "접근 규칙"): 내 행만 읽기·쓰기, 관리자는 읽기만. 수집(서버 secret 키)은 RLS를 거치지 않는다
alter table public.homes enable row level security;
create policy homes_select on public.homes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy homes_insert_own on public.homes for insert to authenticated
  with check (user_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy homes_update_own on public.homes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.indoor_measurements enable row level security;
create policy indoor_measurements_select on public.indoor_measurements for select to authenticated
  using (
    exists (select 1 from public.homes h where h.id = home_id and h.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy indoor_measurements_insert_own on public.indoor_measurements for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.homes h where h.id = home_id and h.user_id = (select auth.uid()))
  );

-- 3) 기상청 단기예보 출처 (ERD sources.code, PRD FR-08)
insert into public.sources (code, name, schedule)
values ('kma_forecast', '기상청 단기예보', '하루 2번');

-- 4) 승인 때 일정 마감일: 사건에 dueDate가 있으면 그것(습도 사건 = 가장 위험한 시각 전날), 없으면 접수 마감일(공고 사건, 지금과 같음)
create or replace function public.approve_incident(p_incident_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_incident public.incidents;
  v_plan public.response_plans;
  v_schedule_id uuid;
begin
  select * into v_incident from public.incidents
  where id = p_incident_id and user_id = (select auth.uid())
  for update;
  if not found then raise exception 'incident_not_found'; end if;

  select * into v_plan from public.response_plans where incident_id = p_incident_id;
  if not found then raise exception 'plan_not_found'; end if;

  if v_incident.status = 'approved' then
    select id into v_schedule_id from public.schedule_items where response_plan_id = v_plan.id;
    return v_schedule_id;
  end if;
  if v_incident.status = 'rejected' then raise exception 'already_rejected'; end if; -- Q5 임시 처리

  insert into public.incident_actions (incident_id, actor_id, action)
  values (p_incident_id, (select auth.uid()), 'approve');
  update public.incidents set status = 'approved', closed_at = now() where id = p_incident_id;
  insert into public.schedule_items (user_id, response_plan_id, incident_id, title, due_date, checklist_state)
  values (
    v_incident.user_id, v_plan.id, p_incident_id,
    coalesce(v_incident.facts ->> 'title', '신청 준비 계획'),
    nullif(coalesce(v_incident.facts ->> 'dueDate', v_incident.facts ->> 'applyEnd'), '')::date,
    (select coalesce(jsonb_agg(item || jsonb_build_object('done', false)), '[]'::jsonb)
     from jsonb_array_elements(v_plan.checklist) as item)
  )
  returning id into v_schedule_id;
  return v_schedule_id;
end;
$$;
