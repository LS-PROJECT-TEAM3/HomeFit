-- spec 010 FR-003 (PRD FR-20, IA AD_070102_MD, ERD audit_logs, 평가항목 P3-13): 관리자 수정 기록.
-- 관리자는 회원의 공고 조건·내 집(spec 010 Q1 결정)의 숫자·날짜 칸만 고친다. 고치기와 기록은 한 함수 안에서 함께 되거나 함께 안 된다(E11).
-- 기록은 쌓기만 한다: 관리자 읽기 정책만 두고 쓰기·고치기·지우기 정책은 두지 않는다(쓰기는 아래 함수로만).

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  target_table text not null check (target_table in ('policy_conditions', 'homes')),
  target_id uuid not null,
  before jsonb not null,
  after jsonb not null,
  reason text not null check (char_length(btrim(reason)) between 2 and 200),
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_table, target_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated
  using ((select public.is_admin()));

-- p_target_id: 공고 조건은 회원 ID(user_id), 내 집은 내 집 ID. p_changes: 바뀐 칸만 {칸: 값}
create function public.admin_update_member_input(p_table text, p_target_id uuid, p_changes jsonb, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed text[];
  v_keys text[];
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if; -- E12
  if p_reason is null or char_length(btrim(p_reason)) not between 2 and 200 then raise exception 'invalid_reason'; end if; -- E10
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' or p_changes = '{}'::jsonb then raise exception 'no_changes'; end if; -- E13

  v_allowed := case p_table
    when 'policy_conditions' then array['max_monthly_rent', 'age']
    when 'homes' then array['exclusive_area_m2', 'deposit', 'monthly_rent', 'maintenance_fee', 'contract_end_date']
  end;
  if v_allowed is null then raise exception 'table_not_allowed'; end if;
  select array_agg(k) into v_keys from jsonb_object_keys(p_changes) as k;
  if not (v_keys <@ v_allowed) then raise exception 'field_not_allowed'; end if;

  if p_table = 'policy_conditions' then
    select to_jsonb(c) into v_before from public.policy_conditions c where c.user_id = p_target_id for update;
    if not found then raise exception 'target_not_found'; end if;
    update public.policy_conditions c set
      max_monthly_rent = case when p_changes ? 'max_monthly_rent' then (p_changes ->> 'max_monthly_rent')::integer else c.max_monthly_rent end,
      age = case when p_changes ? 'age' then (p_changes ->> 'age')::integer else c.age end,
      updated_at = now()
    where c.user_id = p_target_id
    returning to_jsonb(c) into v_after;
  else
    select to_jsonb(h) into v_before from public.homes h where h.id = p_target_id for update;
    if not found then raise exception 'target_not_found'; end if;
    update public.homes h set
      exclusive_area_m2 = case when p_changes ? 'exclusive_area_m2' then (p_changes ->> 'exclusive_area_m2')::numeric else h.exclusive_area_m2 end,
      deposit = case when p_changes ? 'deposit' then (p_changes ->> 'deposit')::integer else h.deposit end,
      monthly_rent = case when p_changes ? 'monthly_rent' then (p_changes ->> 'monthly_rent')::integer else h.monthly_rent end,
      maintenance_fee = case when p_changes ? 'maintenance_fee' then (p_changes ->> 'maintenance_fee')::integer else h.maintenance_fee end,
      contract_end_date = case when p_changes ? 'contract_end_date' then (p_changes ->> 'contract_end_date')::date else h.contract_end_date end,
      updated_at = now()
    where h.id = p_target_id
    returning to_jsonb(h) into v_after;
  end if;

  insert into public.audit_logs (actor_id, target_table, target_id, before, after, reason)
  values (
    (select auth.uid()), p_table, p_target_id,
    (select jsonb_object_agg(k, v_before -> k) from unnest(v_keys) as k),
    (select jsonb_object_agg(k, v_after -> k) from unnest(v_keys) as k),
    btrim(p_reason)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.admin_update_member_input(text, uuid, jsonb, text) from public, anon;
grant execute on function public.admin_update_member_input(text, uuid, jsonb, text) to authenticated;
