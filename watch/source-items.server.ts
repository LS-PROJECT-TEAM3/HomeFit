import { noticeFingerprint } from "@/incident/dedup";
import type { AdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Notice } from "@/watch/notice";

export type SavedItems = {
  /** externalId → source_items.id */
  idByExternalId: Map<string, string>;
  newIds: Set<string>;
  changedIds: Set<string>;
};

async function loadExistingHashes(db: AdminClient, sourceCode: string, externalIds: string[]) {
  const hashes = new Map<string, string>();
  if (externalIds.length === 0) return hashes;
  const { data, error } = await db
    .from("source_items")
    .select("external_id, content_hash")
    .eq("source_code", sourceCode)
    .in("external_id", externalIds);
  if (error) throw new Error(`저장된 공고를 읽지 못했습니다: ${error.message}`);
  data.forEach((row) => hashes.set(row.external_id, row.content_hash));
  return hashes;
}

/** FR-003, FR-006 (spec 001): 공고를 저장하고, 처음 본 것과 바뀐 것을 가려낸다 */
export async function saveSourceItems(db: AdminClient, sourceCode: string, notices: Notice[]): Promise<SavedItems> {
  const before = await loadExistingHashes(db, sourceCode, notices.map((n) => n.externalId));
  const now = new Date().toISOString();
  const rows = notices.map((notice) => ({
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
    raw: notice as unknown as Json, // Notice는 JSON으로 바꿀 수 있는 값만 가진다
    last_seen_at: now,
  }));
  const { data, error } = rows.length
    ? await db.from("source_items").upsert(rows, { onConflict: "source_code,external_id" }).select("id, external_id, content_hash")
    : { data: [], error: null };
  if (error) throw new Error(`공고를 저장하지 못했습니다: ${error.message}`);

  const saved: SavedItems = { idByExternalId: new Map(), newIds: new Set(), changedIds: new Set() };
  for (const row of data) {
    saved.idByExternalId.set(row.external_id, row.id);
    const previous = before.get(row.external_id);
    if (previous === undefined) saved.newIds.add(row.id);
    else if (previous !== row.content_hash) saved.changedIds.add(row.id);
  }
  return saved;
}
