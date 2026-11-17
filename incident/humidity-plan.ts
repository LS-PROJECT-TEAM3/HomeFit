import type { ChecklistItem } from "@/incident/checklist";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { windowTypeText } from "@/incident/humidity-text";
import { toKstHourLabel } from "@/watch/kst";

// FR-007 (spec 003): 습도·결로 대응 계획. 기본 할 일과 AI 초안에 줄 지시·내용. 순수 함수 [GLOSSARY 대응 계획]
// 날짜는 코드가 붙인다(AI가 날짜를 정하지 않는다, plan 003 위험과 대응). 호출은 humidity-plan.server.ts

/** AI 초안이 없거나 실패해도 보이는 기본 할 일 */
export function defaultHumidityChecklist(input: { dueDate: string; condition: "surface" | "humidity" }): ChecklistItem[] {
  const labels = [
    "아침·저녁 10분씩 창을 열어 환기하기",
    "제습기를 켜거나 제습제를 창가·옷장에 두기",
    "창에 맺힌 물기를 마른 수건으로 닦기",
    "창틀·실리콘 틈과 곰팡이 자국 살펴보기",
  ];
  return labels.map((label) => ({ label, dueOn: input.dueDate }));
}

export const HUMIDITY_PLAN_SYSTEM_PROMPT = [
  "너는 혼자 사는 사회초년생에게 집 안 결로·곰팡이를 막는 방법을 쉬운 한국어로 알려 준다.",
  "주어진 측정값·예보·추정값만 근거로 쓴다. 없는 숫자나 사실은 지어내지 않는다.",
  "추정값은 계산한 값이라 실제와 다를 수 있다고 한 번 말한다. 누수나 건물 하자는 판단하지 않는다.",
  "summary: 2~3문장. 언제 왜 조심해야 하는지와 가장 먼저 할 일.",
  "checklist: 할 일 3~5개. 한 항목은 한 문장, 40자 안팎. 날짜는 쓰지 않는다(날짜는 따로 붙인다).",
].join("\n");

function celsius(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}°C`;
}

/** Q23 (spec 002): 사용자·집을 알 수 있는 값(시군구 코드, ID)은 넣지 않는다 */
export function buildHumidityPrompt(facts: HumidityFacts): string {
  const lines = [
    "다음 값으로 결로·습도 대응 요약과 할 일을 만들어 줘.",
    `위험 종류: ${facts.condition === "surface" ? "창 결로(창 표면 온도가 이슬점 가까이 내려감)" : "높은 습도가 이어짐"}`,
    `가장 위험한 시각: ${toKstHourLabel(new Date(facts.riskAt))}`,
    `실내 온도: ${celsius(facts.measurement.temperatureC)} (측정값)`,
    `실내 습도: ${facts.measurement.humidityPct}% (측정값)`,
    `그때 바깥 기온: ${celsius(facts.outdoorC)} (기상청 예보)`,
    `창 종류: ${windowTypeText(facts.windowType)}`,
    `창 표면 온도(추정): ${facts.surfaceC.toFixed(1)}°C`,
    `이슬점(추정): ${facts.dewPointC.toFixed(1)}°C`,
  ];
  if (facts.condition === "humidity") lines.push(`앞으로 48시간 중 습하거나 비·눈 오는 시각: ${facts.humidHours}시간`);
  return lines.join("\n");
}

/** AI 할 일 + 코드가 정한 마감일 */
export function composeHumidityChecklist(labels: readonly string[], dueDate: string): ChecklistItem[] {
  return labels.map((label) => ({ label, dueOn: dueDate }));
}

/**
 * 4단계 리뷰 1: 사건이 갱신되면 할 일 글(AI가 쓴 것 포함)은 두고 날짜만 새 마감일로 바꾼다.
 * 저장된 목록 모양이 이상하면 빈 목록을 돌려 부르는 쪽이 기본 할 일을 쓰게 한다
 */
export function redateChecklist(stored: unknown, dueDate: string): ChecklistItem[] {
  if (!Array.isArray(stored)) return [];
  const labels = stored.map((item) => (typeof item === "object" && item !== null && typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label : null));
  if (labels.some((label) => label === null)) return [];
  return composeHumidityChecklist(labels as string[], dueDate);
}
