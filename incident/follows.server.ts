import type { FollowSet } from "@/incident/detect";
import type { AdminClient } from "@/lib/supabase/admin";

type Follows = Map<string, { announcements: Set<string>; complexKeys: Set<string> }>;

/**
 * FR-020 (spec 001 v0.5): 수집용. 사용자별 팔로우한 공고와 그 공고들의 단지 키(완화 재공고 판단).
 * 수집은 사용자 없이 돌아 secret 키로 읽는다.
 */
export async function loadFollows(db: AdminClient, sourceCode: string): Promise<{ get(userId: string): FollowSet | undefined }> {
  const { data, error } = await db.from("notice_follows").select("user_id, announcement_id").eq("source_code", sourceCode).eq("decision", "follow");
  if (error) throw new Error(`팔로우를 읽지 못했습니다: ${error.message}`);
  const follows: Follows = new Map();
  for (const row of data) {
    const entry = follows.get(row.user_id) ?? { announcements: new Set(), complexKeys: new Set() };
    entry.announcements.add(row.announcement_id);
    follows.set(row.user_id, entry);
  }
  const ids = [...new Set(data.map((row) => row.announcement_id))];
  if (ids.length === 0) return follows;
  // 외부 ID는 "공고 ID-단지 번호"라서 앞부분으로 찾는다
  const { data: items, error: itemError } = await db
    .from("source_items")
    .select("external_id, complex_key")
    .eq("source_code", sourceCode)
    .or(ids.map((id) => `external_id.like.${id}-*`).join(","));
  if (itemError) throw new Error(`팔로우한 공고의 단지를 읽지 못했습니다: ${itemError.message}`);
  for (const entry of follows.values()) {
    for (const item of items) {
      const announcementId = [...entry.announcements].find((id) => item.external_id.startsWith(`${id}-`));
      if (announcementId && item.complex_key) entry.complexKeys.add(item.complex_key);
    }
  }
  return follows;
}
