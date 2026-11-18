import type { Policy } from "@/watch/youth-policy";

// spec 006 v0.3 FR-007: 청년 정책 AI 요약. 순수 함수(부르기는 policy-summary.server.ts). 응답 모양·검사는 공고 요약과 같다
export { NOTICE_SUMMARY_SCHEMA as POLICY_SUMMARY_SCHEMA, parseNoticeSummary as parsePolicySummary } from "@/incident/notice-summary";

export const POLICY_SUMMARY_SYSTEM_PROMPT = [
  "너는 독립을 준비하는 사회초년생에게 청년 주거 지원 정책을 쉬운 한국어로 설명한다.",
  "주어진 정책 원문 값만 쓴다. 원문에 없는 금액, 날짜, 자격, 서류는 지어내지 않는다.",
  "신청 자격이 되는지 판단하지 않는다. 자격은 원문(공고문)에서 확인하라고 안내한다.",
  "summary: 2~3문장. 무엇을 얼마나 지원하는지, 누구 대상인지, 어떻게 언제까지 신청하는지.",
].join("\n");

// 원문이 아주 긴 칸이 있어(지원 내용 수천 자) AI에 보낼 길이를 줄인다
const MAX_FIELD = 600;

function field(name: string, value: string | number | null | undefined): string {
  const text = value === null || value === undefined || value === "" ? "원문 확인" : String(value);
  return `${name}: ${text.length > MAX_FIELD ? `${text.slice(0, MAX_FIELD)}…` : text}`;
}

/** Q23 (spec 002): 정책 원문 값만 보낸다. 사용자 조건·지역 코드·ID는 넣지 않는다 */
export function buildPolicyPrompt(policy: Policy): string {
  const ages = policy.minAge === null && policy.maxAge === null ? null : `만 ${policy.minAge ?? "?"}~${policy.maxAge ?? "?"}세`;
  const period = policy.periodKind === "always" ? "상시" : policy.applyEnd ? `${policy.applyStart ?? "?"} ~ ${policy.applyEnd}` : null;
  return [
    "다음 청년 주거 정책을 쉬운 말로 요약해 줘.",
    field("정책 이름", policy.title),
    field("분류", policy.supplyType),
    field("운영 기관", policy.agency),
    field("정책 설명", policy.description),
    field("지원 내용", policy.support),
    field("신청 기간", period),
    field("나이", ages),
    field("신청 방법", policy.applyMethod),
    field("심사 방법", policy.screening),
    field("제출 서류", policy.documents),
    field("추가 자격 조건", policy.extraQualification),
    field("참여 제한 대상", policy.excluded),
  ].join("\n");
}
