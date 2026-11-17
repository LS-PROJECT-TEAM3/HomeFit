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
};

type Existing = { hash: string; values: TrackedValues };

async function loadExisting(db: AdminClient, sourceCode: string, externalIds: string[]) {
  const existing = new Map<string, Existing>();
  if (externalIds.length === 0) return existing;
  const { data, error } = await db
    .from("source_items")
    .select("external_id, content_hash, apply_start, apply_end, monthly_rent, supply_type")
    .eq("source_code", sourceCode)
    .in("external_id", externalIds);
  if (error) throw new Error(`저장된 공고를 읽지 못했습니다: ${error.message}`);
  for (const row of data) {
    const values = { applyStart: row.apply_start, applyEnd: row.apply_end, monthlyRent: row.monthly_rent, supplyType: row.supply_type };
    existing.set(row.external_id, { hash: row.content_hash, values });
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

/** FR-003, FR-006, FR-016 (spec 001 v0.2): 공고를 저장하고, 저장 전 값과 이미 본 공고·단지를 함께 돌려준다 */
export async function saveSourceItems(db: AdminClient, sourceCode: string, notices: Notice[]): Promise<SavedItems> {
  const existing = await loadExisting(db, sourceCode, notices.map((n) => n.externalId));
  const seenBefore = await loadSeenBefore(db, sourceCode, notices.filter((n) => !existing.has(n.externalId)));
  const now = new Date().toISOString();
  const rows = notices.map((notice) => toRow(sourceCode, notice, existing.get(notice.externalId), now));
  const { data, error } = rows.length
    ? await db.from("source_items").upsert(rows, { onConflict: "source_code,external_id" }).select("id, external_id, content_hash")
    : { data: [], error: null };
  if (error) throw new Error(`공고를 저장하지 못했습니다: ${error.message}`);

  const saved: SavedItems = { idByExternalId: new Map(), newIds: new Set(), changedIds: new Set(), previousByExternalId: new Map(), ...seenBefore };
  for (const row of data) {
    saved.idByExternalId.set(row.external_id, row.id);
    const previous = existing.get(row.external_id);
    if (previous === undefined) saved.newIds.add(row.id);
    else {
      saved.previousByExternalId.set(row.external_id, previous.values);
      if (previous.hash !== row.content_hash) saved.changedIds.add(row.id);
    }
  }
  return saved;
}
