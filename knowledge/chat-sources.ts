// spec 004 v0.5 FR-007 (사용자 결정 2026-11-19): 챗봇 자료 중 청년 주거 정책·관심 주택·하자 기록을 글로 만든다. 순수 함수
import { DEFECT_KINDS, type DefectKind } from "@/incident/defect-form";
import { MOVE_IN_ITEMS, type MoveInChecklist } from "@/incident/move-in-checklist";
import { realCost, type CostInput } from "@/incident/real-cost";
import type { ChatSource } from "@/knowledge/chat";
import type { Policy } from "@/watch/youth-policy";

const SUPPORT_MAX = 200; // 지원 내용이 길면 앞부분만(AI에 보내는 글 길이를 줄임)
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function period(policy: Policy): string {
  if (policy.periodKind === "always") return "상시 신청";
  if (policy.periodKind === "unknown") return "신청 기간 공고문 확인";
  return `신청 ${policy.applyStart ?? "?"} ~ ${policy.applyEnd ?? "?"}`;
}

/** 내 조건에 맞는 청년 주거 정책 한 건. 자격은 판정하지 않고 공고문 확인으로 둔다 */
export function policySource(policy: Policy, index: number): ChatSource {
  const support = policy.support ?? policy.description;
  const parts = [
    policy.agency ? `기관 ${policy.agency}` : "",
    support ? `지원 내용 ${support.replace(/\s+/g, " ").slice(0, SUPPORT_MAX)}` : "지원 내용 공고문 확인",
    period(policy),
    policy.minAge !== null || policy.maxAge !== null ? `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세` : "나이 조건 공고문 확인",
  ].filter(Boolean);
  return { id: `P${index + 1}`, kind: "policy", title: `청년 주거 정책: ${policy.title}`, text: parts.join(" · "), href: `/policy/${encodeURIComponent(policy.externalId)}` };
}

export type InterestHomeFacts = Omit<CostInput, "estimatedKwh" | "estimatedEnergyCost"> & {
  id: string; name: string; housingType: string; deposit: number | null; checklist: MoveInChecklist; note: string | null;
};

/** 점검 항목 이름은 "채광: …"의 앞부분만 */
const shortLabel = (label: string) => label.split(":")[0];

function checklistText(checklist: MoveInChecklist, note: string | null): string {
  const done = MOVE_IN_ITEMS.filter((item) => checklist[item.key]).map((item) => shortLabel(item.label));
  const head = `입주 전 점검 ${done.length}/${MOVE_IN_ITEMS.length} 확인${done.length ? `(${done.join(", ")})` : ""}`;
  return note ? `${head} · 메모: ${note}` : head;
}

/** 관심 주택 한 곳. 실질 주거비는 입력값만으로 낸다(에너지비 추정 API는 챗봇에서 부르지 않음, spec 004 v0.5) */
export function interestHomeSource(home: InterestHomeFacts, at: { index: number; month: number }): ChatSource {
  const cost = realCost(home, at.month);
  const parts = [
    `주택 유형 ${home.housingType}`,
    home.deposit !== null ? `보증금 ${won(home.deposit)}` : "",
    `월세 ${won(home.monthlyRent)}`,
    home.maintenanceFee !== null ? `관리비 ${won(home.maintenanceFee)}` : "",
    `실질 주거비 ${won(cost.total)}(한 달, 입력한 값 합계)`,
    cost.missing.length ? `미입력: ${cost.missing.join(", ")}` : "",
    checklistText(home.checklist, home.note),
  ].filter(Boolean);
  return { id: `I${at.index + 1}`, kind: "interest_home", title: `관심 주택: ${home.name}`, text: parts.join(" · "), href: `/compare/${home.id}` };
}

export type DefectFacts = { occurredOn: string; kind: DefectKind; memo: string; hasPhoto: boolean };

/** 내 집 하자 기록 한 건. 사진 주소는 AI에 보내지 않는다 */
export function defectSource(defect: DefectFacts, index: number): ChatSource {
  const kind = DEFECT_KINDS[defect.kind] ?? "기타";
  return {
    id: `D${index + 1}`, kind: "defect", title: `하자 기록: ${defect.occurredOn} ${kind}`,
    text: `${defect.memo} · 사진 ${defect.hasPhoto ? "있음" : "없음"}`, href: "/qc/records",
  };
}
