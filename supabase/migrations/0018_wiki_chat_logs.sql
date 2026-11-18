-- spec 012 FR-013·FR-014 (PRD FR-26, 평가항목 P3-21), ERD chat_logs. DB 번호 0018은 조각 A 몫(docs/plan.md 2절)
-- wiki_chunks는 만들지 않는다: 배포 묶음의 위키 파일을 바로 읽는다(spec 012 Q3)

-- 1) 위키 챗봇 질문 기록. 하루 질문 수는 created_at으로 센다(ERD 저장하지 않고 계산하는 값)
create table public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 300),
  answer text not null check (char_length(answer) between 1 and 600),
  cited_pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index chat_logs_user_created on public.chat_logs (user_id, created_at desc);

-- 접근 규칙(ERD "wiki_chunks, chat_logs"): 일반 사용자는 볼 수 없고, 관리자는 챗봇을 쓰고 내 질문 기록만 본다.
-- 고치기·지우기 정책은 두지 않는다(기록은 쌓기만)
alter table public.chat_logs enable row level security;
create policy chat_logs_select_own_admin on public.chat_logs for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));
create policy chat_logs_insert_own_admin on public.chat_logs for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_admin()));

-- 2) AI 호출 기록 용도에 위키 챗봇 답을 더한다(ERD llm_calls.purpose, 기존 네 값은 그대로)
alter table public.llm_calls drop constraint llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check
  check (purpose in ('application_plan', 'notice_summary', 'response_plan', 'chat_answer', 'wiki_answer'));
