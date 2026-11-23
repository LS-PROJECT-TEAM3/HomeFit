-- spec 026 FR-003·FR-004 (PRD FR-16 v1.25, ERD v1.16, 사용자 승인 2026-11-23): 팔로우한 청년 주거지원 정책을 내 일정에.
-- 0016 add_notice_to_schedule과 같은 방식. 제목·마감일은 저장된 정책(source_items youth_policy)에서, 체크리스트는 코드가 만든 기본 목록.
-- 같은 사람·같은 정책은 일정 하나(0016 유일 색인 schedule_items_notice_unique)
create function public.add_policy_to_schedule(p_policy_id text, p_checklist jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_title text;
  v_due date;
  v_id uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_checklist) <> 'array' or jsonb_array_length(p_checklist) > 20 then raise exception 'bad_checklist'; end if;

  -- E2: 누른 사람이 팔로우한 정책만
  if not exists (
    select 1 from public.notice_follows
    where user_id = v_user and source_code = 'youth_policy' and announcement_id = p_policy_id and decision = 'follow'
  ) then raise exception 'not_followed'; end if;

  select id into v_id from public.schedule_items
  where user_id = v_user and source_code = 'youth_policy' and announcement_id = p_policy_id;
  if found then return v_id; end if;

  -- 정책 외부 ID는 정책 번호 그대로. 끝 날짜가 없으면(상시·모름) 마감일 없음(FR-004)
  select title, apply_end into v_title, v_due from public.source_items
  where source_code = 'youth_policy' and external_id = p_policy_id;
  if not found then raise exception 'policy_not_found'; end if; -- E4

  insert into public.schedule_items (user_id, source_code, announcement_id, title, due_date, checklist_state)
  values (
    v_user, 'youth_policy', p_policy_id, v_title, v_due,
    (select coalesce(jsonb_agg(item || jsonb_build_object('done', false)), '[]'::jsonb) from jsonb_array_elements(p_checklist) as item)
  )
  on conflict (user_id, source_code, announcement_id) where announcement_id is not null do nothing
  returning id into v_id;

  -- 두 번 동시에 눌러 위에서 못 찾았으면 먼저 들어간 것을 돌려준다
  if v_id is null then
    select id into v_id from public.schedule_items
    where user_id = v_user and source_code = 'youth_policy' and announcement_id = p_policy_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.add_policy_to_schedule(text, jsonb) from public, anon;
grant execute on function public.add_policy_to_schedule(text, jsonb) to authenticated;
