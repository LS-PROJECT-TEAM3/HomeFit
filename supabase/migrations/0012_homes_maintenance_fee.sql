-- spec 003 v0.2 5단계 (Q17), ERD v1.5 homes.maintenance_fee, PRD v1.6 FR-03·FR-13
-- 홈 "월 예상 주거비" = 월세 + 관리비. 넣지 않아도 된다(선택)
alter table public.homes add column maintenance_fee integer check (maintenance_fee >= 0);
