-- spec 001 v0.3, plan v0.9 11단계, ERD v1.2
-- 슬랙 알림: 사용자별 수신 웹훅 대신 팀 슬랙 봇이 이메일로 사람을 찾아 DM으로 보낸다 (PRD v1.3 FR-37)
-- 표가 비어 있을 때(0행) 적용한다. 지울 자료가 없다.

alter table public.notification_settings drop constraint notification_settings_check;
alter table public.notification_settings drop constraint notification_settings_slack_webhook_url_check;
alter table public.notification_settings drop column slack_webhook_url;

alter table public.notification_settings
  -- 팀 슬랙에서 쓰는 이메일. 개인 정보라 본인만 읽는다(RLS는 0005 그대로, 관리자 규칙 없음)
  add column slack_email text check (slack_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- 봇이 이메일로 찾은 슬랙 사람 ID. DM을 보낼 곳
  add column slack_user_id text;

-- 슬랙 사람을 찾지 못했으면 켤 수 없다
alter table public.notification_settings
  add constraint notification_settings_enabled_needs_user check (not enabled or slack_user_id is not null);
