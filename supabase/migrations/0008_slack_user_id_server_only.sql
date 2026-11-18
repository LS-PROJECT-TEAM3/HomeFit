-- 12단계 리뷰 4번 (사용자 결정 2026-11-17): 슬랙 사람 ID는 서버(secret 키)만 쓴다.
-- 로그인 사용자는 알림 켜기·끄기(enabled, enabled_at, updated_at)만 직접 바꿀 수 있다.
-- 이메일·사람 ID는 서버 액션이 봇으로 찾은 뒤 secret 키로 저장한다(app/(main)/my/notifications/actions.ts).

revoke insert, update on public.notification_settings from authenticated, anon;
grant update (enabled, enabled_at, updated_at) on public.notification_settings to authenticated;

-- 쓰지 않게 된 본인 추가 규칙은 지운다(추가는 서버만)
drop policy notification_settings_insert_own on public.notification_settings;
