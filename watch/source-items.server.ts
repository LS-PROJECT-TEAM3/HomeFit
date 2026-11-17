import { noticeFingerprint } from "@/incident/dedup";
import { complexKeyOf, type TrackedValues } from "@/incident/notice-change";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Notice } from "@/watch/notice";

export type SavedItems = {
  /** externalId → source_items.id */
  idByExternalId: Map<string, string>;
  newIds: Set<string>;
  changedIds: Set<string>;
  /** 이번 수집 전에 저장돼 있던 값 (FR-006 전 → 후) */
  previousByExternalId: Map<string, TrackedValues>;
  /** 이번 수집 전에 본 공고 ID 중 새 공고의 이전 공고 ID와 겹치는 것 (FR-016 정정공고) */
  seenAnnouncementIds: Set<string>;
  /** 이번 수집 전에 본 단지 키 중 새 공고와 겹치는 것 (FR-016 완화 재공고) */
  seenComplexKeys: Set<string>;
  /** 이미 있던 공고의 새 값. 사건·계획을 저장한 **뒤에** commitSourceItems로 쓴다 (리뷰 2026-11-17) */
  pendingRows: ReturnType<typeof toRow>[];
};

type Existing = { id: string; hash: string; values: TrackedValues };

async function loadExisting(db: AdminClient, sourceCode: string, externalIds: string[]) {
  const existing = new Map<string, Existing>();
  if (externalIds.length === 0) return existing;
  const { data, error } = await db
    .from("source_items")
    .select("id, external_id, content_hash, apply_start, apply_end, monthly_rent, supply_type")
    .eq("source_code", sourceCode)
    .in("external_id", externalIds);
  if (error) throw new Error(`저장된 공고를 읽지 못했습니다: ${error.message}`);
  for (const row of data) {
    const values = { applyStart: row.apply_start, applyEnd: row.apply_end, monthlyRent: row.monthly_rent, supplyType: row.supply_type };
    existing.set(row.external_id, { id: row.id, hash: row.content_hash, values });
  }
  return existing;
}

/** 외부 ID는 "공고 ID-단지 번호"라서 공고 ID로 앞부분을 찾는다 */
async function loadSeenAnnouncements(db: AdminClient, sourceCode: string, announcementIds: string[]) {
  const seen = new Set<string>();
  if (announcementIds.length === 0) return seen;
  const filter = announcementIds.map((id) => `external_id.like.${id}-*`).join(",");
  const { data, error } = await db.from("source_items").select("external_id").eq("source_code", sourceCode).or(filter);
  if (error) throw new Error(`이전 공고를 읽지 못했습니다: ${error.message}`);
  for (const row of data) {
    const id = announcementIds.find((a) => row.external_id.startsWith(`${a}-`));
    if (id) seen.add(id);
  }
  return seen;
}

async function loadSeenComplexKeys(db: AdminClient, sourceCode: string, keys: string[]) {
  if (keys.length === 0) return new Set<string>();
  const { data, error } = await db.from("source_items").select("complex_key").eq("source_code", sourceCode).in("complex_key", keys);
  if (error) throw new Error(`단지 정보를 읽지 못했습니다: ${error.message}`);
  return new Set(data.map((row) => row.complex_key).filter((key): key is string => key !== null));
}

async function loadSeenBefore(db: AdminClient, sourceCode: string, newNotices: Notice[]) {
  const beforeIds = [...new Set(newNotices.map((n) => n.beforeAnnouncementId).filter((id): id is string => !!id))];
  const complexKeys = [...new Set(newNotices.map(complexKeyOf).filter((key): key is string => key !== null))];
  return {
    seenAnnouncementIds: await loadSeenAnnouncements(db, sourceCode, beforeIds),
    seenComplexKeys: await loadSeenComplexKeys(db, sourceCode, complexKeys),
  };
}

function toRow(sourceCode: string, notice: Notice, previous: Existing | undefined, now: string) {
  return {
    source_code: sourceCode,
    external_id: notice.externalId,
    title: notice.title,
    sido_code: notice.sidoCode,
    sigungu_code: notice.sigunguCode,
    supply_type: notice.supplyType,
    monthly_rent: notice.monthlyRent,
    announced_at: notice.announcedOn,
    apply_start: notice.applyStart,
    apply_end: notice.applyEnd,
    url: notice.url,
    content_hash: noticeFingerprint(notice),
    complex_key: complexKeyOf(notice),
    status_name: notice.statusName,
    before_external_id: notice.beforeAnnouncementId,
    // ERD source_items.previous_values: 바로 앞 수집 때의 값
    previous_values: previous ? (previous.values as unknown as Json) : null,
    raw: notice as unknown as Json, // Notice는 JSON으로 바꿀 수 있는 값만 가진다
    last_seen_at: now,
  };
}

/**
 * FR-003, FR-006, FR-016 (spec 001 v0.2): 처음 본 공고만 지금 저장하고(사건에 ID가 필요), 이미 있던 공고의 새 값은 미뤄 둔다.
 * 먼저 덮어쓰면, 사건·계획 저장이 실패한 날 다음 수집이 새 값과 비교해 그 변화를 영영 놓친다 (리뷰 2026-11-17).
 */
export async function saveSourceItems(db: AdminClient, sourceCode: string, notices: Notice[]): Promise<SavedItems> {
  const existing = await loadExisting(db, sourceCode, notices.map((n) => n.externalId));
  const fresh = notices.filter((n) => !existing.has(n.externalId));
  const seenBefore = await loadSeenBefore(db, sourceCode, fresh);
  const now = new Date().toISOString();
  const freshRows = fresh.map((notice) => toRow(sourceCode, notice, undefined, now));
  const { data, error } = freshRows.length
    // 크론이 두 번 겹쳐 같은 새 공고를 넣어도 실패하지 않게 upsert
    ? await db.from("source_items").upsert(freshRows, { onConflict: "source_code,external_id" }).select("id, external_id")
    : { data: [], error: null };
  if (error) throw new Error(`공고를 저장하지 못했습니다: ${error.message}`);

  const saved: SavedItems = {
    idByExternalId: new Map(), newIds: new Set(), changedIds: new Set(), previousByExternalId: new Map(), ...seenBefore, pendingRows: [],
  };
  for (const row of data) {
    saved.idByExternalId.set(row.external_id, row.id);
    saved.newIds.add(row.id);
  }
  for (const notice of notices) {
    const previous = existing.get(notice.externalId);
    if (!previous) continue;
    saved.idByExternalId.set(notice.externalId, previous.id);
    saved.previousByExternalId.set(notice.externalId, previous.values);
    if (previous.hash !== noticeFingerprint(notice)) saved.changedIds.add(previous.id);
    saved.pendingRows.push(toRow(sourceCode, notice, previous, now));
  }
  return saved;
}

/** 이미 있던 공고의 새 값을 쓴다. 사건·계획을 저장한 뒤에 부른다 */
export async function commitSourceItems(db: AdminClient, saved: SavedItems): Promise<void> {
  if (saved.pendingRows.length === 0) return;
  const { error } = await db.from("source_items").upsert(saved.pendingRows, { onConflict: "source_code,external_id" });
  if (error) throw new Error(`공고 새 값을 저장하지 못했습니다: ${error.message}`);
}
