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
    lines: change.changes.map((c) => `${FIELD_LABEL[c.field]} ${show(c.field, c.before)} → ${show(c.field, c.after)}`),
    note: null,
  };
}
