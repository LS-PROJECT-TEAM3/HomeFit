-- spec 023 결정 되돌리기 (ERD v1.13, 사용자 승인 2026-11-23)
-- 1) 공고 팔로우·관심 없음을 지워 "새 공고"로 (FR-001·FR-002). 본인 줄만
create policy notice_follows_delete_own on public.notice_follows for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) 처리 이력에 취소 두 종류. 이력은 여전히 쌓기만 한다 (FR-005·FR-008)
alter table public.incident_actions drop constraint incident_actions_action_check;
alter table public.incident_actions add constraint incident_actions_action_check
  check (action in ('approve', 'reject', 'cancel_approve', 'cancel_reject'));

-- 3) 승인 취소: 이력 한 줄 + 그 승인으로 만든 일정 지움 + 승인 대기로 (FR-004·FR-005). 본인 사건만(FR-007)
create function public.cancel_approval(p_incident_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.incidents
  where id = p_incident_id and user_id = (select auth.uid()) and status = 'approved'
  for update;
  if not found then raise exception 'incident_not_approved'; end if; -- E2·E3, 남의 사건도 여기서 막힘

  insert into public.incident_actions (incident_id, actor_id, action)
  values (p_incident_id, (select auth.uid()), 'cancel_approve');
  delete from public.schedule_items
  where response_plan_id in (select id from public.response_plans where incident_id = p_incident_id);
  update public.incidents set status = 'pending', closed_at = null where id = p_incident_id;
end;
$$;

-- 4) 거절 취소: 이력 한 줄 + 승인 대기로. 거절은 일정을 만들지 않았다 (FR-008, Intent Q5 해결)
create function public.cancel_rejection(p_incident_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.incidents
  where id = p_incident_id and user_id = (select auth.uid()) and status = 'rejected'
  for update;
  if not found then raise exception 'incident_not_rejected'; end if;

  insert into public.incident_actions (incident_id, actor_id, action)
  values (p_incident_id, (select auth.uid()), 'cancel_reject');
  update public.incidents set status = 'pending', closed_at = null where id = p_incident_id;
end;
$$;

revoke execute on function public.cancel_approval(uuid) from public, anon;
revoke execute on function public.cancel_rejection(uuid) from public, anon;
grant execute on function public.cancel_approval(uuid) to authenticated;
grant execute on function public.cancel_rejection(uuid) to authenticated;
