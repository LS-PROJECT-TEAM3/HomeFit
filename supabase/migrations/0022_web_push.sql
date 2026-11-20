-- spec 021 (PRD v1.20 FR-35), plan 승인 2026-11-20("모두 승인"): 웹 푸시 알림 받을 기기와 알림 기록 종류
-- 다시 돌려도 멈추지 않게 if not exists·if exists로 쓴다(PR #15 리뷰에서 정한 방식)

-- 1) 알림 받을 기기: 웹 푸시를 켠 브라우저 하나에 한 줄. 받을 주소(endpoint)는 브라우저마다 하나라
--    같은 브라우저에서 다른 계정이 켜면 그 줄이 나중 계정 것이 된다(spec E3). 그래서 넣기·바꾸기는 서버만 한다
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 256),
  auth text not null check (char_length(auth) between 1 and 128),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);

-- 받을 주소는 개인 정보라 본인만 읽고 지운다. 관리자도 볼 수 없다(spec 5절)
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) 알림 기록에 웹 푸시 종류. (incident_id, channel) 유일이라 사건마다 사람마다 한 번(spec Q1)
alter table public.notifications drop constraint if exists notifications_channel_check;
alter table public.notifications add constraint notifications_channel_check check (channel in ('slack', 'web_push'));
