import type { ChecklistItem } from "@/incident/checklist";

// spec 008 FR-006: 시세 알림의 대응 계획. 기본 할 일·검토일. 순수 함수 [CUJ-03 4~5단계]

/** 계약 만료 2달 전(그 달에 같은 날이 없으면 달 마지막 날). CUJ-03 5단계 "계약 만료 2달 전 일정" */
export function reviewDate(contractEnd: string | null): string | null {
  if (!contractEnd || !/^\d{4}-\d{2}-\d{2}$/.test(contractEnd)) return null;
  const year = Number(contractEnd.slice(0, 4));
  const month = Number(contractEnd.slice(5, 7)) - 2; // 1월이면 -1 → 앞 해 11월
  const target = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(Number(contractEnd.slice(8, 10)), lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** AI 초안이 없거나 실패해도 보이는 기본 할 일. 내 집 = 재계약 판단 메모, 관심 지역 = 다시 보기 */
export function defaultRentChecklist(input: { target: "home" | "interest_area"; dueDate: string | null }): ChecklistItem[] {
  const labels = input.target === "home"
    ? ["주변 거래 비교표에서 중간값·거래 수·기간 확인하기", "재계약 때 집주인과 이야기할 금액과 근거 적어 두기", "같은 조건 매물 시세를 다른 곳에서도 한 번 더 보기"]
    : ["관심 지역 비교표에서 중간값·거래 수·기간 확인하기", "예산(보증금·월세)이 아직 맞는지 다시 보기", "관심 지역 조건(면적·계약 형태)을 바꿀지 정하기"];
  return labels.map((label) => ({ label, dueOn: input.dueDate }));
}

// AI 초안 지시 (spec 008 FR-006). 호출은 rent-plan.server.ts. 전환율·매매·자격 판단은 하지 않는다(PRD 9절)
export const RENT_PLAN_SYSTEM_PROMPT = [
  "너는 혼자 사는 사회초년생이 재계약·이사를 판단하도록 주변 전월세 실거래 시세를 쉬운 한국어로 풀어 준다.",
  "주어진 숫자만 근거로 쓴다. 없는 숫자나 사실은 지어내지 않는다. 보증금과 월세를 하나로 바꾸는 전환율은 쓰지 않는다.",
  "실거래가 중간값이라 실제 매물 가격과 다를 수 있고 거래 수가 적으면 흔들릴 수 있다고 한 번 말한다.",
  "summary: 2~3문장. 무엇이 얼마나 다른지와 먼저 할 일.",
  "checklist: 할 일 3~5개. 한 항목은 한 문장, 40자 안팎. 날짜는 쓰지 않는다(날짜는 따로 붙인다).",
].join("\n");

function manwon(won: number): string {
  return `${Math.round(won / 10_000).toLocaleString("ko-KR")}만 원`;
}

/** Q23 (spec 002): 사용자·집을 알 수 있는 값(시군구 코드, ID)은 넣지 않는다 */
export function buildRentPrompt(facts: {
  target: "home" | "interest_area"; housingLabel: string; contractType: "monthly" | "jeonse"; months: [string, string]; count: number;
  areaMin: number; areaMax: number; diffs: { field: "monthlyRent" | "deposit"; base: number; median: number; percent: number }[];
}): string {
  const baseName = facts.target === "home" ? "내 계약" : "지난번 본 중간값";
  return [
    `다음 값으로 ${facts.target === "home" ? "재계약 판단 메모" : "관심 지역 다시 보기"} 요약과 할 일을 만들어 줘.`,
    `주택 유형: ${facts.housingLabel}, 계약 형태: ${facts.contractType === "monthly" ? "월세" : "전세"}`,
    `비교한 거래: ${facts.months[0]} ~ ${facts.months[1]} 실거래 ${facts.count}건, 면적 ${facts.areaMin}~${facts.areaMax}㎡`,
    ...facts.diffs.map((d) => `${d.field === "monthlyRent" ? "월세" : "보증금"}: ${baseName} ${manwon(d.base)}, 주변 중간값 ${manwon(d.median)} (${d.percent > 0 ? "+" : ""}${d.percent}%)`),
  ].join("\n");
}
