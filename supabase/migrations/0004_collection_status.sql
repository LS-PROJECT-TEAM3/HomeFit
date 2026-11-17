-- FR-004, FR-015 (spec 001): 일반 사용자는 runs 표를 볼 수 없다(관리자 전용).
-- 사건 목록에 "수집 오류"와 "마지막 확인 시각"만 보여 주려고, 출처별 마지막 상태와 시각만 돌려준다(오류 내용은 주지 않음).
create function public.collection_status(p_source text)
returns table (last_status text, last_finished_at timestamptz, last_success_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select r.status from public.runs r
     where r.source_code = p_source and r.status <> 'running' and r.trigger <> 'simulation'
     order by r.started_at desc limit 1),
    (select r.finished_at from public.runs r
     where r.source_code = p_source and r.status <> 'running' and r.trigger <> 'simulation'
     order by r.started_at desc limit 1),
    (select max(r.finished_at) from public.runs r
     where r.source_code = p_source and r.status = 'succeeded' and r.trigger <> 'simulation');
$$;

revoke execute on function public.collection_status(text) from public, anon;
grant execute on function public.collection_status(text) to authenticated;
