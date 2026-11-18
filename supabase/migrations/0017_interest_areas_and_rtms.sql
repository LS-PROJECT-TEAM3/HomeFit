-- spec 008 (PRD FR-05, FR-09, FR-12), ERD v1.8 interest_areas, sources `rtms_trade`

-- 1) 관심 지역: 회원당 여러 개 (ERD interest_areas)
--    last_median_value = 지난번 본 월세 중간값(월세 계약만), last_median_deposit = 지난번 본 보증금 중간값.
--    사용자 결정(2026-11-18) "월세·보증금 둘 다 비교"에 따라 보증금 칸을 더함(spec 008 Q2)
create table public.interest_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  sigungu_code text not null check (sigungu_code ~ '^\d{5}$'),
  housing_type text not null check (housing_type in ('apartment', 'officetel', 'row_house', 'detached')),
  target_area_m2 numeric not null check (target_area_m2 between 1 and 300),
  contract_type text not null check (contract_type in ('monthly', 'jeonse')),
  last_median_value integer check (last_median_value >= 0),
  last_median_deposit bigint check (last_median_deposit >= 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index interest_areas_user on public.interest_areas (user_id);

-- 접근 규칙: 내 행만 읽기·넣기·지우기, 관리자는 읽기만. 지난번 값은 수집(서버 secret 키)만 쓴다
alter table public.interest_areas enable row level security;
create policy interest_areas_select on public.interest_areas for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy interest_areas_insert_own on public.interest_areas for insert to authenticated
  with check (user_id = (select auth.uid()) and created_by = (select auth.uid()) and last_median_value is null and last_median_deposit is null);
create policy interest_areas_delete_own on public.interest_areas for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) 실거래가 출처 (ERD sources.code, PRD FR-09)
insert into public.sources (code, name, schedule)
values ('rtms_trade', '국토부 전월세 실거래가', '한 달 1번')
on conflict (code) do nothing;
