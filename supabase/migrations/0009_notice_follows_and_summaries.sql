-- spec 001 v0.5 (H-006 사용자 의견), PRD v1.5 FR-38, ERD v1.4
-- 맞는 공고 팔로우 승인·거절과 공고 요약

-- 1) 공고 팔로우: 사용자가 맞는 공고마다 팔로우(follow)·관심 없음(ignore)을 정한다. 본인만 읽고 쓴다
create table public.notice_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_code text not null references public.sources (code),
  announcement_id text not null,
  decision text not null check (decision in ('follow', 'ignore')),
  reason text,
  decided_at timestamptz not null default now(),
  primary key (user_id, source_code, announcement_id)
);

alter table public.notice_follows enable row level security;
create policy notice_follows_select on public.notice_follows for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy notice_follows_insert_own on public.notice_follows for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notice_follows_update_own on public.notice_follows for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 2) 공고 요약: 공고마다 한 줄. 공개 자료라 로그인하면 읽고, 쓰기는 서버(secret 키)만
create table public.notice_summaries (
  source_code text not null references public.sources (code),
  announcement_id text not null,
  summary text not null,
  model text not null,
  created_at timestamptz not null default now(),
  primary key (source_code, announcement_id)
);

alter table public.notice_summaries enable row level security;
create policy notice_summaries_select on public.notice_summaries for select to authenticated
  using (true);

-- 3) AI 호출 용도에 공고 요약 추가 (ERD llm_calls.purpose)
alter table public.llm_calls drop constraint llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check check (purpose in ('application_plan', 'notice_summary'));
