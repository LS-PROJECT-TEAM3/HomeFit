// spec 023 FR-005·FR-008: 처리 이력(incident_actions)은 지우지 않고 쌓기만 한다.
// 거절 → 거절 취소 → 다시 거절이면 거절 줄이 여럿이라, 사유는 시각 순 이력의 마지막 거절에서 읽는다.
// 알림 상세·처리 기록·기록 찾기 세 곳이 같이 쓴다

export type ActionRow = { action: string; reason: string | null };

/** 시각 순 이력에서 지금 유효한 거절 사유. 마지막 거절 뒤에 거절 취소가 있으면 null */
export function latestRejectReason(rows: readonly ActionRow[]): string | null {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].action === "cancel_reject") return null;
    if (rows[i].action === "reject") return rows[i].reason;
  }
  return null;
}

/** 여러 사건의 시각 순 이력 → 사건별 거절 사유(거절 사유가 있는 사건만) */
export function rejectReasonByIncident(rows: readonly (ActionRow & { incident_id: string })[]): Map<string, string> {
  const reasons = new Map<string, string>();
  for (const row of rows) {
    if (row.action === "reject" && row.reason) reasons.set(row.incident_id, row.reason);
    if (row.action === "cancel_reject") reasons.delete(row.incident_id);
  }
  return reasons;
}
