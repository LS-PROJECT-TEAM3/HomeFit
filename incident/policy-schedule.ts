// spec 026 FR-002·FR-004·FR-005 (PRD FR-07·FR-16 v1.25): 팔로우한 청년 주거지원 정책을 내 일정에. 순수 함수.
// 자격은 판정하지 않는다(PRD 9절). 서류·자격은 원문에서 확인하게 한다
import type { Policy } from "@/watch/youth-policy";
import type { ChecklistItem } from "./checklist";

/** 정책 출처 코드(sources.code). 팔로우·일정 표에서 공고(myhome_notice)와 가른다 */
export const POLICY_SOURCE = "youth_policy";

type PolicyPeriod = Pick<Policy, "applyEnd" | "periodKind">;

/** FR-005: 기본 3개. 마감 항목은 끝 날짜가 있을 때만 날짜(FR-004, 없는 날짜를 지어내지 않음) */
export function buildPolicyChecklist(policy: PolicyPeriod): ChecklistItem[] {
  const apply: ChecklistItem = policy.applyEnd
    ? { label: `신청 마감(${policy.applyEnd}) 전에 신청하기`, dueOn: policy.applyEnd }
    : policy.periodKind === "always"
      ? { label: "신청하기(상시 신청, 공고문 확인)", dueOn: null }
      : { label: "신청 기간을 공고문에서 확인하고 신청하기", dueOn: null };
  return [
    { label: "공고문에서 신청 자격 확인하기", dueOn: null },
    { label: "정책 원문의 제출 서류 준비하기", dueOn: null },
    apply,
  ];
}

/** FR-004(v0.3): 마감일 없는 정책 일정에 붙는 글. 상시와 기간 모름을 따로(정책을 못 찾으면 기간 모름). 마감일이 있으면 null */
export function policyDueText(dueDate: string | null, periodKind: Policy["periodKind"] | null): string | null {
  if (dueDate !== null) return null;
  return periodKind === "always" ? "상시 신청, 공고문 확인" : "신청 기간 공고문 확인";
}

/** FR-002: "팔로우 중"만 보기 */
export function filterFollowed<T extends { id: string }>(rows: readonly T[], followed: ReadonlySet<string>): T[] {
  return rows.filter((row) => followed.has(row.id));
}

// DB 함수 add_policy_to_schedule이 던지는 이유(마이그레이션 0025) → 무엇이 안 됐는지 + 할 일 (E2·E4)
const MESSAGES: Record<string, string> = {
  not_followed: "팔로우한 정책만 일정에 넣을 수 있어요. 먼저 팔로우해 주세요.",
  policy_not_found: "정책을 찾을 수 없습니다. 정책 목록에서 다시 열어 주세요.",
};

export function addPolicyToScheduleError(reason: string): string {
  const key = Object.keys(MESSAGES).find((name) => reason.includes(name));
  return key ? MESSAGES[key] : "일정에 넣지 못했습니다. 잠시 뒤 다시 해 주세요.";
}
