-- spec 006 FR-001 (PRD FR-07): 온통청년 주거 정책 출처 (ERD sources.code, source_items.source_code `youth_policy`)
insert into public.sources (code, name, schedule)
values ('youth_policy', '온통청년 주거 정책', '하루 1번')
on conflict (code) do nothing;
