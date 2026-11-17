-- spec 004 v0.3 FR-007 (사용자 결정 2026-11-18): 챗봇 답변의 AI 호출 기록 용도 (ERD llm_calls.purpose)
alter table public.llm_calls drop constraint llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check
  check (purpose in ('application_plan', 'notice_summary', 'response_plan', 'chat_answer'));
