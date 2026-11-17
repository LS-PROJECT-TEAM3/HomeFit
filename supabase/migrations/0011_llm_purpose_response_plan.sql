-- spec 003 4단계 (FR-007): 습도·결로 대응 계획 AI 초안의 호출 기록 용도 (ERD llm_calls.purpose)
alter table public.llm_calls drop constraint llm_calls_purpose_check;
alter table public.llm_calls add constraint llm_calls_purpose_check
  check (purpose in ('application_plan', 'notice_summary', 'response_plan'));
