-- spec 009 (PRD v1.10 FR-28 알파), ERD v1.9 승인 2026-11-18: 실질 주거비 비교
-- 번호 0020은 docs/plan.md 조각 표 E에 정한 것(0018 위키, 0019 관리자 수정 기록은 다른 조각)

-- 1) 내 집 비용 칸 (모두 선택)
alter table public.homes
  add column energy_cost integer check (energy_cost between 0 and 2000000),
  add column electricity_kwh integer check (electricity_kwh between 0 and 3000),
  add column transit_fare integer check (transit_fare between 0 and 20000),
  add column trips_per_day integer check (trips_per_day between 1 and 10),
  add column commute_days integer check (commute_days between 1 and 31);

-- 2) 관심 주택: 회원당 여러 개. 상세 주소는 받지 않는다
create table public.interest_homes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  sigungu_code text not null check (sigungu_code ~ '^\d{5}$'),
  housing_type text not null check (housing_type in ('apartment', 'officetel', 'row_house', 'detached')),
  exclusive_area_m2 numeric check (exclusive_area_m2 between 0.3 and 300),
  deposit bigint check (deposit between 0 and 2000000000),
  monthly_rent integer not null check (monthly_rent between 0 and 10000000),
  maintenance_fee integer check (maintenance_fee between 0 and 2000000),
  energy_cost integer check (energy_cost between 0 and 2000000),
  electricity_kwh integer check (electricity_kwh between 0 and 3000),
  transit_fare integer check (transit_fare between 0 and 20000),
  trips_per_day integer check (trips_per_day between 1 and 10),
  commute_days integer check (commute_days between 1 and 31),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interest_homes_user on public.interest_homes (user_id, created_at);

-- 접근 규칙: 내 행만 읽기·넣기·고치기·지우기, 관리자는 읽기만 (spec 009 E9)
alter table public.interest_homes enable row level security;
create policy interest_homes_select on public.interest_homes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy interest_homes_insert_own on public.interest_homes for insert to authenticated
  with check (user_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy interest_homes_update_own on public.interest_homes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy interest_homes_delete_own on public.interest_homes for delete to authenticated
  using (user_id = (select auth.uid()));
