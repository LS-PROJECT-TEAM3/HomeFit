-- PRD v1.7 FR-02, ERD v1.6 policy_conditions.target_groups, spec 001 v0.6 FR-005 (사용자 결정 2026-11-18)
-- 대상(청년·사회초년생 / 신혼·신생아 / 다자녀 / 고령자). 빈 목록 = 모두. 제목으로 맞춤 공고를 거른다(자격 판정 아님)
alter table public.policy_conditions
  add column target_groups text[] not null default '{}'
  check (target_groups <@ array['youth', 'newlywed', 'multichild', 'elderly']::text[]);
