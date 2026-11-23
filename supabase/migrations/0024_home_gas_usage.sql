-- spec 025 내 집 도시가스 사용량 (ERD v1.15, PRD FR-28 v1.24, 사용자 승인 2026-11-23)
-- 고지서 한 장: 한 달 사용량(MJ)과 몇 월 고지서인지. 요금 지역은 지역이 여러 개인 도에서만 고른다(어느 지역이 맞는지는 서버가 검사)
alter table public.homes
  add column if not exists gas_usage_mj integer,
  add column if not exists gas_bill_month smallint,
  add column if not exists gas_tariff_region text;

alter table public.homes add constraint homes_gas_usage_range check (gas_usage_mj is null or gas_usage_mj between 1 and 100000);
alter table public.homes add constraint homes_gas_bill_month_range check (gas_bill_month is null or gas_bill_month between 1 and 12);
-- E2: 사용량과 달은 함께 있거나 함께 없다. 지역은 사용량이 있을 때만
alter table public.homes add constraint homes_gas_pair check ((gas_usage_mj is null) = (gas_bill_month is null));
alter table public.homes add constraint homes_gas_region check (gas_tariff_region is null or (gas_usage_mj is not null and length(gas_tariff_region) <= 40));
