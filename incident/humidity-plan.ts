import type { ChecklistItem } from "@/incident/checklist";

// FR-007 (spec 003): 습도·결로 대응 계획의 기본 할 일. AI 초안이 없거나 실패해도 보인다 [GLOSSARY 대응 계획]
// 날짜는 코드가 붙인다(AI가 날짜를 정하지 않는다, plan 003 위험과 대응)

export function defaultHumidityChecklist(input: { dueDate: string; condition: "surface" | "humidity" }): ChecklistItem[] {
  const labels = [
    "아침·저녁 10분씩 창을 열어 환기하기",
    "제습기를 켜거나 제습제를 창가·옷장에 두기",
    "창에 맺힌 물기를 마른 수건으로 닦기",
    "창틀·실리콘 틈과 곰팡이 자국 살펴보기",
  ];
  return labels.map((label) => ({ label, dueOn: input.dueDate }));
}
