// spec 019 FR-001 (PRD FR-29): 입주 전 점검 항목과 저장 값 검사. 순수 함수. 안전·적합 판정은 하지 않는다
// spec 024 (PRD FR-29 v1.22): 항목별 메모와 관심 주택마다 내 항목. 저장 칸(interest_homes.move_in_checklist)은 그대로,
// 예전 값({키: true})도 그대로 읽힌다(FR-005). 저장 모양: { 키: true, notes: {키: 메모}, custom: [내 항목] }

/** 키는 DB(interest_homes.move_in_checklist)에 남는다. 글은 spec 004 뼈대 때와 같다 */
export const MOVE_IN_ITEMS = [
  { key: "light", label: "채광: 낮에 불을 끄고도 방이 밝은가" },
  { key: "noise", label: "소음: 창을 닫고 바깥·옆집 소리가 들리는가" },
  { key: "smell", label: "냄새: 하수구·곰팡이 냄새가 나는가" },
  { key: "mold", label: "곰팡이: 창틀·벽 모서리·욕실 실리콘에 검은 자국이 있는가" },
  { key: "water_pressure", label: "수압: 싱크대·샤워기 물을 같이 틀어도 세게 나오는가" },
  { key: "maintenance_fee", label: "관리비: 포함 항목(인터넷·수도·청소)과 금액을 받았는가" },
  { key: "window", label: "창 종류: 홑유리인지 이중유리인지 (결로와 난방비에 영향)" },
  // spec 024 FR-007 (사용자 결정 2026-11-23): 집을 볼 때 눈으로 확인하는 것 5개. 누수는 보이는 자국만, 예측하지 않는다(PRD 9절)
  { key: "drain", label: "배수: 싱크대·세면대·욕실 물이 잘 빠지고 냄새가 올라오지 않는가" },
  { key: "heating", label: "난방·보일러: 보일러가 잘 켜지고 바닥이 고르게 따뜻해지는가" },
  { key: "electric", label: "전기·콘센트: 콘센트 수와 위치가 쓸 만하고 차단기(두꺼비집)가 정상인가" },
  { key: "security", label: "방범: 현관·창문이 잘 잠기고, 저층이면 방범창이 있는가" },
  { key: "leak", label: "누수 흔적: 천장·벽·창 아래에 물 자국이나 얼룩이 있는가" },
] as const;

export type MoveInKey = (typeof MOVE_IN_ITEMS)[number]["key"];
export type CustomItem = { id: string; label: string; checked: boolean; note: string };
export type MoveInChecklist = { checked: Partial<Record<MoveInKey, true>>; notes: Partial<Record<MoveInKey, string>>; custom: CustomItem[] };

export const CUSTOM_MAX = 10;
export const LABEL_MAX = 40;
export const ITEM_NOTE_MAX = 200;
const NOTE_MAX = 500;
const ID_PATTERN = /^[a-z0-9]{6,12}$/;

const KEYS = new Set<string>(MOVE_IN_ITEMS.map((item) => item.key));
/** "채광: …"의 앞부분. 화면·AI 도우미·같은 이름 검사가 같이 쓴다 */
export const itemTitle = (label: string) => label.split(":")[0];
const TITLES = new Set(MOVE_IN_ITEMS.map((item) => itemTitle(item.label)));

export function emptyChecklist(): MoveInChecklist {
  return { checked: {}, notes: {}, custom: [] };
}

const isObject = (raw: unknown): raw is Record<string, unknown> => typeof raw === "object" && raw !== null && !Array.isArray(raw);

function readNotes(raw: unknown): MoveInChecklist["notes"] {
  if (!isObject(raw)) return {};
  const entries = Object.entries(raw).filter(([key, value]) => KEYS.has(key) && typeof value === "string" && value.length <= ITEM_NOTE_MAX);
  return Object.fromEntries(entries) as MoveInChecklist["notes"];
}

function readCustom(raw: unknown): CustomItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CustomItem[] = [];
  for (const value of raw) {
    if (!isObject(value)) continue;
    const { id, label, checked, note } = value;
    if (typeof id !== "string" || !ID_PATTERN.test(id) || items.some((item) => item.id === id)) continue;
    if (typeof label !== "string" || label.trim() === "" || label.trim().length > LABEL_MAX) continue;
    const memo = typeof note === "string" && note.length <= ITEM_NOTE_MAX ? note : "";
    items.push({ id, label, checked: checked === true, note: memo });
  }
  return items.slice(0, CUSTOM_MAX);
}

/** DB 값 → 점검. E5(spec 024)·E2(spec 019): 모르는 키·틀린 모양은 버린다 */
export function parseChecklist(raw: unknown): MoveInChecklist {
  if (!isObject(raw)) return emptyChecklist();
  const checked = Object.fromEntries(Object.entries(raw).filter(([key, value]) => KEYS.has(key) && value === true)) as MoveInChecklist["checked"];
  return { checked, notes: readNotes(raw.notes), custom: readCustom(raw.custom) };
}

/** 점검 → 저장 값. 메모·내 항목이 없으면 예전과 같은 모양({키: true}) */
export function toStored(list: MoveInChecklist): Record<string, unknown> {
  const notes = Object.fromEntries(Object.entries(list.notes).filter(([, note]) => typeof note === "string" && note.trim() !== ""));
  return {
    ...list.checked,
    ...(Object.keys(notes).length ? { notes } : {}),
    ...(list.custom.length ? { custom: list.custom } : {}),
  };
}

/** 저장하지 않은 변경 판단용 비교 값. 키 순서·빈 메모와 상관없이 내용이 같으면 같다(2단계 리뷰) */
export function checklistSnapshot(list: MoveInChecklist): string {
  const base = MOVE_IN_ITEMS.map((item) => [Boolean(list.checked[item.key]), (list.notes[item.key] ?? "").trim()]);
  const custom = list.custom.map((item) => [item.id, item.label, item.checked, item.note.trim()]);
  return JSON.stringify([base, custom]);
}

/** FR-006: 확인한 수와 전체 수에 내 항목도 센다 */
export function checkedCount(list: MoveInChecklist): number {
  return Object.keys(list.checked).length + list.custom.filter((item) => item.checked).length;
}

export function totalCount(list: MoveInChecklist): number {
  return MOVE_IN_ITEMS.length + list.custom.length;
}

/** E1~E3: 새 내 항목 이름 검사. existing은 이 집에 이미 있는 내 항목 이름 */
export function checkCustomLabel(label: string, existing: readonly string[]): string | null {
  const name = label.trim();
  if (name === "") return "항목 이름을 적어 주세요.";
  if (name.length > LABEL_MAX) return `항목 이름은 ${LABEL_MAX}자 안으로 줄여 주세요.`;
  if (existing.length >= CUSTOM_MAX) return `내 항목은 집마다 ${CUSTOM_MAX}개까지 더할 수 있어요.`;
  if (TITLES.has(name) || existing.some((other) => other.trim() === name)) return "이미 있는 항목이에요. 다른 이름을 적어 주세요.";
  return null;
}

export type ChecklistFormResult = { ok: true; checklist: MoveInChecklist; note: string | null } | { ok: false; error: string };

const READ_FAILED = "점검 내용을 읽지 못했습니다. 페이지를 새로고침한 뒤 다시 저장해 주세요.";
const tooLong = (title: string) => `"${title}" 메모는 ${ITEM_NOTE_MAX}자 안으로 줄여 주세요.`;

/** 서버에서 다시 하는 검사(E1~E4). 문제가 있으면 첫 문구, 없으면 null */
function formError(raw: Record<string, unknown>): string | null {
  const notes = isObject(raw.notes) ? raw.notes : {};
  const long = MOVE_IN_ITEMS.find((item) => typeof notes[item.key] === "string" && (notes[item.key] as string).length > ITEM_NOTE_MAX);
  if (long) return tooLong(itemTitle(long.label));
  const custom = Array.isArray(raw.custom) ? raw.custom.filter(isObject) : [];
  if (custom.length > CUSTOM_MAX) return `내 항목은 집마다 ${CUSTOM_MAX}개까지 더할 수 있어요.`;
  // 읽을 때 버려질 id(형식이 틀리거나 겹침)는 여기서 거절한다. 조용히 사라지지 않게(1단계 리뷰)
  const ids = custom.map((item) => item.id);
  if (ids.some((id, i) => typeof id !== "string" || !ID_PATTERN.test(id) || ids.indexOf(id) !== i)) return READ_FAILED;
  for (let i = 0; i < custom.length; i += 1) {
    const label = typeof custom[i].label === "string" ? (custom[i].label as string) : "";
    const others = custom.slice(0, i).map((item) => String(item.label ?? ""));
    const error = checkCustomLabel(label, others);
    if (error) return error;
    if (typeof custom[i].note === "string" && (custom[i].note as string).length > ITEM_NOTE_MAX) return tooLong(label.trim());
  }
  return null;
}

/** 화면이 보낸 저장 모양 JSON과 집 메모를 검사해 저장할 값으로 */
export function parseChecklistForm(input: { checklist: string; note: string }): ChecklistFormResult {
  const note = input.note.trim();
  if (note.length > NOTE_MAX) return { ok: false, error: "메모는 500자 안으로 줄여 주세요." };
  let raw: unknown;
  try {
    raw = JSON.parse(input.checklist);
  } catch {
    return { ok: false, error: READ_FAILED };
  }
  if (!isObject(raw)) return { ok: false, error: READ_FAILED };
  const error = formError(raw);
  if (error) return { ok: false, error };
  const parsed = parseChecklist(raw);
  return { ok: true, checklist: { ...parsed, custom: parsed.custom.map((item) => ({ ...item, label: item.label.trim() })) }, note: note === "" ? null : note };
}
