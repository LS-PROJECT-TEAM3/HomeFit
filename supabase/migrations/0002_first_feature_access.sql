-- plan 001 3단계: 접근 규칙(ERD "접근 규칙"), 가입 때 회원 행, 승인·거절 함수.
-- 사용자는 내 행만, 관리자는 읽기만, 수집 쓰기는 서버(secret 키, RLS 우회)만 한다.

-- 관리자인지 (RLS 안에서 profiles를 다시 RLS로 읽지 않게 security definer)
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- 가입하면 회원 행을 만든다 (FR-001)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.policy_conditions enable row level security;
alter table public.sources enable row level security;
alter table public.runs enable row level security;
alter table public.run_steps enable row level security;
alter table public.source_items enable row level security;
alter table public.observations enable row level security;
alter table public.incidents enable row level security;
alter table public.response_plans enable row level security;
alter table public.incident_actions enable row level security;
alter table public.schedule_items enable row level security;

-- profiles: 내 행 읽기, 이름만 고치기(역할은 못 바꿈). 관리자는 전체 읽기
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- policy_conditions: 내 행만 쓰기(FR-002, FR-014). 관리자는 읽기
create policy conditions_select on public.policy_conditions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy conditions_insert_own on public.policy_conditions for insert to authenticated
  with check (user_id = (select auth.uid()) and created_by = (select auth.uid()));
create policy conditions_update_own on public.policy_conditions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and created_by = (select auth.uid()));

-- 수집 표: 일반 사용자는 볼 수 없음, 관리자 읽기
create policy sources_admin_select on public.sources for select to authenticated
  using ((select public.is_admin()));
create policy runs_admin_select on public.runs for select to authenticated
  using ((select public.is_admin()));
create policy run_steps_admin_select on public.run_steps for select to authenticated
  using ((select public.is_admin()));
create policy observations_admin_select on public.observations for select to authenticated
  using ((select public.is_admin()));

-- source_items: 내 사건의 근거 공고만 읽기
create policy source_items_select on public.source_items for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.incidents i
      where i.source_item_id = source_items.id and i.user_id = (select auth.uid())
    )
  );

-- 사건·대응안·이력: 내 것만 읽기. 바꾸기는 아래 함수로만
create policy incidents_select on public.incidents for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy response_plans_select on public.response_plans for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.incidents i
      where i.id = response_plans.incident_id and i.user_id = (select auth.uid())
    )
  );
create policy incident_actions_select on public.incident_actions for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.incidents i
      where i.id = incident_actions.incident_id and i.user_id = (select auth.uid())
    )
  );

-- schedule_items: 내 것 읽기, 체크 상태만 고치기 (FR-013)
create policy schedule_select on public.schedule_items for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy schedule_update_own on public.schedule_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.schedule_items from authenticated;
grant update (checklist_state, updated_at) on public.schedule_items to authenticated;

-- 상세를 처음 열면 승인 대기로, 처음 연 시각 저장 (FR-009, 대표 KPI)
create function public.mark_incident_viewed(p_incident_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.incidents
  set first_viewed_at = coalesce(first_viewed_at, now()),
      status = case when status = 'new' then 'pending' else status end
  where id = p_incident_id and user_id = (select auth.uid());
$$;

-- 승인: 이력 + 상태 + 내 일정을 한 번에. 본인 사건만, 두 번 눌러도 일정 하나 (FR-011)
create function public.approve_incident(p_incident_id uuid)
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
    nullif(v_incident.facts ->> 'applyEnd', '')::date,
    (select coalesce(jsonb_agg(item || jsonb_build_object('done', false)), '[]'::jsonb)
     from jsonb_array_elements(v_plan.checklist) as item)
  )
  returning id into v_schedule_id;
  return v_schedule_id;
end;
$$;

-- 거절: 사유 필수, 일정은 건드리지 않음 (FR-012). 이미 끝난 사건은 못 바꿈(Q5 임시 처리)
create function public.reject_incident(p_incident_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'reason_required'; end if;
  perform 1 from public.incidents
  where id = p_incident_id and user_id = (select auth.uid()) and status in ('new', 'pending')
  for update;
  if not found then raise exception 'incident_not_open'; end if;

  insert into public.incident_actions (incident_id, actor_id, action, reason)
  values (p_incident_id, (select auth.uid()), 'reject', btrim(p_reason));
  update public.incidents set status = 'rejected', closed_at = now() where id = p_incident_id;
end;
$$;

revoke execute on function public.mark_incident_viewed(uuid) from public, anon;
revoke execute on function public.approve_incident(uuid) from public, anon;
revoke execute on function public.reject_incident(uuid, text) from public, anon;
grant execute on function public.mark_incident_viewed(uuid) to authenticated;
grant execute on function public.approve_incident(uuid) to authenticated;
grant execute on function public.reject_incident(uuid, text) to authenticated;
