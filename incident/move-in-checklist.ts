// spec 019 FR-001 (PRD FR-29): 입주 전 점검 항목과 저장 값 검사. 순수 함수. 안전·적합 판정은 하지 않는다

/** 키는 DB(interest_homes.move_in_checklist)에 남는다. 글은 spec 004 뼈대 때와 같다 */
export const MOVE_IN_ITEMS = [
  { key: "light", label: "채광: 낮에 불을 끄고도 방이 밝은가" },
  { key: "noise", label: "소음: 창을 닫고 바깥·옆집 소리가 들리는가" },
  { key: "smell", label: "냄새: 하수구·곰팡이 냄새가 나는가" },
  { key: "mold", label: "곰팡이: 창틀·벽 모서리·욕실 실리콘에 검은 자국이 있는가" },
  { key: "water_pressure", label: "수압: 싱크대·샤워기 물을 같이 틀어도 세게 나오는가" },
  { key: "maintenance_fee", label: "관리비: 포함 항목(인터넷·수도·청소)과 금액을 받았는가" },
  { key: "window", label: "창 종류: 홑유리인지 이중유리인지 (결로와 난방비에 영향)" },
] as const;

export type MoveInKey = (typeof MOVE_IN_ITEMS)[number]["key"];
export type MoveInChecklist = Partial<Record<MoveInKey, true>>;

const KEYS = new Set<string>(MOVE_IN_ITEMS.map((item) => item.key));
const NOTE_MAX = 500;

/** E2: 목록에 있는 키의 true만 남긴다(목록이 바뀌어도 옛 키가 남지 않게) */
export function parseChecklist(raw: unknown): MoveInChecklist {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const entries = Object.entries(raw).filter(([key, value]) => KEYS.has(key) && value === true);
  return Object.fromEntries(entries.map(([key]) => [key, true])) as MoveInChecklist;
}

export function checkedCount(checklist: MoveInChecklist): number {
  return Object.keys(checklist).length;
}

export type ChecklistFormResult = { ok: true; checklist: MoveInChecklist; note: string | null } | { ok: false; error: string };

/** 저장할 값: 체크한 키 중 목록에 있는 것만, 메모는 500자 안(E2) */
export function parseChecklistForm(input: { checked: readonly string[]; note: string }): ChecklistFormResult {
  const note = input.note.trim();
  if (note.length > NOTE_MAX) return { ok: false, error: "메모는 500자 안으로 줄여 주세요." };
  const checklist = Object.fromEntries(input.checked.filter((key) => KEYS.has(key)).map((key) => [key, true])) as MoveInChecklist;
  return { ok: true, checklist, note: note === "" ? null : note };
}
