-- spec 007 (PRD FR-16 v1.9, ERD v1.7): 팔로우한 공고를 알림 없이 내 일정에 넣기. 사용자 결정 2026-11-18 "표 고치기"

-- 1) 일정의 출처는 알림(사건+대응안) 또는 공고 둘 중 하나
alter table public.schedule_items
  alter column response_plan_id drop not null,
  alter column incident_id drop not null,
  add column source_code text references public.sources (code),
  add column announcement_id text;

alter table public.schedule_items add constraint schedule_items_origin_check check (
  (incident_id is not null and response_plan_id is not null)
  or (source_code is not null and announcement_id is not null)
);

-- spec 007 FR-002: 같은 사람·같은 공고는 일정 하나
create unique index schedule_items_notice_unique
  on public.schedule_items (user_id, source_code, announcement_id)
  where announcement_id is not null;

-- 2) spec 007 FR-001·003: 누른 사람이 팔로우한 공고만. 제목·마감일은 저장된 공고에서 읽고, 체크리스트는 코드가 만든 기본 목록
create function public.add_notice_to_schedule(p_announcement_id text, p_checklist jsonb)
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

  if not exists (
    select 1 from public.notice_follows
    where user_id = v_user and source_code = 'myhome_notice' and announcement_id = p_announcement_id and decision = 'follow'
  ) then raise exception 'not_followed'; end if;

  select id into v_id from public.schedule_items
  where user_id = v_user and source_code = 'myhome_notice' and announcement_id = p_announcement_id;
  if found then return v_id; end if;

  -- 외부 ID는 "공고 ID-단지 번호". 단지가 여럿이면 가장 늦은 마감
  select title, apply_end into v_title, v_due from public.source_items
  -- LIKE를 쓰지 않는다(공고 ID의 _·% 글자가 와일드카드가 되지 않게)
  where source_code = 'myhome_notice' and left(external_id, length(p_announcement_id) + 1) = p_announcement_id || '-'
  order by apply_end desc nulls last
  limit 1;
  if not found then raise exception 'notice_not_found'; end if;

  insert into public.schedule_items (user_id, source_code, announcement_id, title, due_date, checklist_state)
  values (
    v_user, 'myhome_notice', p_announcement_id, v_title, v_due,
    (select coalesce(jsonb_agg(item || jsonb_build_object('done', false)), '[]'::jsonb) from jsonb_array_elements(p_checklist) as item)
  )
  on conflict (user_id, source_code, announcement_id) where announcement_id is not null do nothing
  returning id into v_id;

  -- 두 번 동시에 눌러 위에서 못 찾았으면 먼저 들어간 것을 돌려준다
  if v_id is null then
    select id into v_id from public.schedule_items
    where user_id = v_user and source_code = 'myhome_notice' and announcement_id = p_announcement_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.add_notice_to_schedule(text, jsonb) from public, anon;
grant execute on function public.add_notice_to_schedule(text, jsonb) to authenticated;
