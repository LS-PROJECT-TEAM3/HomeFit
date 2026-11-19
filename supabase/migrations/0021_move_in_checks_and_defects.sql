-- spec 019 (PRD v1.17 FR-29·FR-30), ERD v1.11 승인 2026-11-19("추천대로 진행"): 입주 전 점검 저장, 하자 기록과 사진
-- 다시 돌려도 멈추지 않게 if not exists·if exists로 쓴다(PR #15 리뷰에서 정한 방식)

-- 1) 관심 주택마다 입주 전 점검 결과. 항목 키(코드의 목록) → 확인했는지(true/false)
alter table public.interest_homes
  add column if not exists move_in_checklist jsonb not null default '{}'::jsonb,
  add column if not exists move_in_note text;
alter table public.interest_homes drop constraint if exists interest_homes_move_in_checklist_object;
alter table public.interest_homes add constraint interest_homes_move_in_checklist_object check (jsonb_typeof(move_in_checklist) = 'object');
alter table public.interest_homes drop constraint if exists interest_homes_move_in_note_length;
alter table public.interest_homes add constraint interest_homes_move_in_note_length check (move_in_note is null or char_length(move_in_note) <= 500);
-- 접근 규칙은 interest_homes 것을 그대로 쓴다(내 행만 고치기)

-- 2) 하자 기록: 내 집마다 여러 개. 고치기는 없고 넣기·지우기만(기록은 쌓는다)
create table if not exists public.defect_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes (id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('leak', 'mold', 'breakdown', 'other')),
  memo text not null check (char_length(btrim(memo)) between 1 and 500),
  -- 저장소 경로 "<회원 id>/<기록용 uuid>.<jpg|png|webp>". 사진은 하나까지, 없어도 된다
  photo_path text check (photo_path is null or photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index if not exists defect_records_home on public.defect_records (home_id, occurred_on desc);

alter table public.defect_records enable row level security;
drop policy if exists defect_records_select on public.defect_records;
create policy defect_records_select on public.defect_records for select to authenticated
  using (
    exists (select 1 from public.homes h where h.id = home_id and h.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
drop policy if exists defect_records_insert_own on public.defect_records;
create policy defect_records_insert_own on public.defect_records for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.homes h where h.id = home_id and h.user_id = (select auth.uid()))
  );
drop policy if exists defect_records_delete_own on public.defect_records;
create policy defect_records_delete_own on public.defect_records for delete to authenticated
  using (exists (select 1 from public.homes h where h.id = home_id and h.user_id = (select auth.uid())));

-- 3) 하자 사진 저장소: 비공개, 5MB, jpg·png·webp. 경로 첫 폴더가 내 회원 id인 파일만 올리고 보고 지운다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('defect-photos', 'defect-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists defect_photos_select_own on storage.objects;
create policy defect_photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'defect-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists defect_photos_insert_own on storage.objects;
create policy defect_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'defect-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists defect_photos_delete_own on storage.objects;
create policy defect_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'defect-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
