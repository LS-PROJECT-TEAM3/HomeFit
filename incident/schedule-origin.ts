/** spec 007 FR-004: 일정이 어디서 왔는지(알림 또는 공고)에 따라 출처 링크. ERD schedule_items v1.7 */
export function scheduleOrigin(item: { incidentId: string | null; announcementId: string | null }): { href: string; label: string } | null {
  if (item.incidentId) return { href: `/incidents/${item.incidentId}`, label: "출처 알림 보기" };
  if (item.announcementId) return { href: `/notices/${encodeURIComponent(item.announcementId)}`, label: "출처 공고 보기" };
  return null;
}

// DB 함수 add_notice_to_schedule이 던지는 이유 (마이그레이션 0016)
const MESSAGES: Record<string, string> = {
  not_followed: "팔로우한 공고만 일정에 넣을 수 있습니다. 먼저 팔로우해 주세요.",
  notice_not_found: "공고를 찾을 수 없습니다. 맞춤 공고에서 다시 열어 주세요.",
};

/** spec 007 E1·E5: 거절 이유 → 무엇이 안 됐는지 + 할 일 */
export function addToScheduleError(reason: string): string {
  return MESSAGES[reason] ?? "일정에 넣지 못했습니다. 잠시 뒤 다시 해 주세요.";
}
