import type { IncidentFacts } from "@/incident/detect";
import type { TrackedField } from "@/incident/notice-change";

const FIELD_LABEL: Record<TrackedField, string> = {
  applyStart: "접수 시작",
  applyEnd: "접수 마감",
  monthlyRent: "월 임대료",
  supplyType: "공급 유형",
};

function show(field: TrackedField, value: string | number | null): string {
  if (value === null || value === "") return "없음";
  if (field === "monthlyRent" && typeof value === "number") return `${value.toLocaleString("ko-KR")}원`;
  return String(value);
}

export type ChangeText = { lines: string[]; note: string | null };

/**
 * FR-009 (spec 001 v0.2): 사건 상세 맨 위 "무엇이 바뀌었나". 원문 값만 쓰고 자격은 판정하지 않는다.
 * v0.1 사건은 변화 정보가 없어 null.
 */
export function describeChange(change: IncidentFacts["change"]): ChangeText | null {
  if (!change) return null;
  if (change.kind === "correction") {
    return { lines: [`정정공고: 이전 공고 ${change.relatedAnnouncementId ?? "?"}을 고친 공고입니다`], note: "바뀐 내용은 공고문에서 확인해 주세요." };
  }
  if (change.kind === "relaxed") {
    return { lines: ["같은 단지에 자격 완화·추가 모집·재공고가 올라왔습니다"], note: "바뀐 내용은 공고문에서 확인해 주세요." };
  }
  return {
    lines: change.changes.map((c) => `${c.complex ? `${c.complex} ` : ""}${FIELD_LABEL[c.field]} ${show(c.field, c.before)} → ${show(c.field, c.after)}`),
    note: null,
  };
}

/** FR-008 수용 기준 3 (spec 001 v0.4, H-006): 사건 목록에 보일 바뀐 내용 한 줄 */
export function summarizeChange(change: IncidentFacts["change"]): string {
  if (!change) return "이전 기준: 처음 보인 공고";
  if (change.kind === "correction") return `정정공고: 이전 공고 ${change.relatedAnnouncementId ?? "?"}`;
  if (change.kind === "relaxed") return "같은 단지 자격 완화·추가 모집·재공고";
  const lines = describeChange(change)?.lines ?? [];
  if (lines.length === 0) return "바뀐 내용은 상세에서 확인";
  return lines.length > 1 ? `${lines[0]} 외 ${lines.length - 1}건` : lines[0];
}

const HEADLINE: Record<TrackedField, string> = {
  applyStart: "접수 시작일이 바뀌었어요",
  applyEnd: "접수 마감일이 바뀌었어요",
  monthlyRent: "월 임대료가 바뀌었어요",
  supplyType: "공급 유형이 바뀌었어요",
};

/** spec 022(v2-s4-alert-pc): 공고 상세 "내 알림" 카드 제목. 바뀐 칸이 하나면 그 칸, 여럿이면 묶어서 */
export function changeHeadline(change: IncidentFacts["change"]): string {
  if (!change) return "새 공고 알림이 왔어요";
  if (change.kind === "correction") return "정정공고가 올라왔어요";
  if (change.kind === "relaxed") return "같은 단지에 새 모집이 올라왔어요";
  const fields = [...new Set(change.changes.map((c) => c.field))];
  return fields.length === 1 ? HEADLINE[fields[0]] : "공고 내용이 여러 곳 바뀌었어요";
}
