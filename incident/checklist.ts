import type { Notice } from "@/watch/notice";

export type ChecklistItem = {
  label: string;
  /** 원문 마감일. AI 글이 이 값을 덮지 않는다 (FR-010) */
  dueOn: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/**
 * FR-009, FR-013 (spec 001): 마감까지 남은 날을 글로 보여 준다. 색만 쓰지 않게 글자로 쓴다.
 * @param today 한국 날짜 "YYYY-MM-DD"
 */
export function describeDeadline(applyEnd: string | null, today: string): string | null {
  if (applyEnd === null) return null;
  const days = Math.round((toUtcDay(applyEnd) - toUtcDay(today)) / DAY_MS);
  if (days < 0) return "마감 지남";
  if (days === 0) return "오늘 마감";
  return `${days}일 남음`;
}

/**
 * FR-010 (spec 001): AI 초안이 없을 때도 보여 줄 신청 준비 체크리스트.
 * 자격은 판정하지 않는다 (CLAUDE.md 하지 않을 것).
 */
export function buildDefaultChecklist(notice: Notice): ChecklistItem[] {
  const deadlineItem: ChecklistItem =
    notice.applyEnd === null
      ? { label: "신청 기간을 공고문에서 확인하기", dueOn: null }
      : { label: `신청 마감(${notice.applyEnd}) 전에 신청하기`, dueOn: notice.applyEnd };
  return [
    { label: "공고문에서 신청 자격 확인하기", dueOn: null },
    { label: "공고문 기준으로 필요 서류 준비하기", dueOn: null },
    deadlineItem,
  ];
}
