-- spec 002 FR-004, plan 002 2단계, ERD v1.3 llm_calls
-- AI 호출 기록. 보낸 글·받은 글·키는 저장하지 않는다. 쓰기는 서버(수집)만, 읽기는 관리자만

create table public.llm_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.runs (id) on delete set null,
  provider text not null check (provider in ('gemini', 'claude', 'mock')),
  model text,
  purpose text not null check (purpose in ('application_plan')),
  ok boolean not null,
  error_kind text check (
    error_kind in ('config', 'auth', 'rate_limit', 'timeout', 'refused', 'invalid_json', 'invalid_shape', 'server', 'unknown')
  ),
  attempts integer not null check (attempts >= 1),
  latency_ms integer not null check (latency_ms >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  -- 성공이면 실패 종류가 없고, 실패면 있다
  check ((ok and error_kind is null) or (not ok and error_kind is not null))
);

create index llm_calls_created_at_idx on public.llm_calls (created_at desc);
create index llm_calls_run_id_idx on public.llm_calls (run_id);

alter table public.llm_calls enable row level security;
create policy llm_calls_admin_select on public.llm_calls for select to authenticated
  using ((select public.is_admin()));
