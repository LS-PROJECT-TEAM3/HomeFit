-- Supabase 보안 점검(advisors) 결과 반영 (2026-11-17).
-- handle_new_user는 가입 트리거 전용이라 누구도 직접 부를 수 없게 한다.
-- is_admin은 RLS 정책이 로그인 사용자 권한으로 부르므로 authenticated만 남기고 anon은 막는다.
-- approve_incident·reject_incident·mark_incident_viewed는 로그인 사용자가 부르는 것이 의도다(본인 사건만 처리).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
