// spec 010 FR-003 (PRD FR-20, IA AD_070102_MD): 관리자 수정 입력 검사. 순수 함수
// 고칠 수 있는 표는 공고 조건과 내 집만(spec 010 Q1 결정). 칸은 회원이 잘못 넣기 쉬운 숫자·날짜만 고른다
// Q4 임시 처리: 어느 칸을 고칠지는 문서에 없다. 지역·유형·창 종류처럼 고르는 칸은 회원이 직접 고치고, 관리자는 숫자·날짜만 고친다

type Kind = "money" | "age" | "area" | "date";
export type EditTable = "policy_conditions" | "homes";
export type EditValue = number | string | null;

export const EDITABLE_FIELDS: Record<EditTable, Record<string, { label: string; kind: Kind }>> = {
  policy_conditions: {
    max_monthly_rent: { label: "월세 상한 (원)", kind: "money" },
    age: { label: "나이", kind: "age" },
  },
  homes: {
    exclusive_area_m2: { label: "전용면적 (㎡)", kind: "area" },
    deposit: { label: "보증금 (원)", kind: "money" },
    monthly_rent: { label: "월세 (원)", kind: "money" },
    maintenance_fee: { label: "관리비 (원)", kind: "money" },
    contract_end_date: { label: "계약 만료일", kind: "date" },
  },
};

export const ADMIN_EDIT_ERRORS = {
  reason: "수정 사유를 2~200자로 적어 주세요. 예: 회원 요청으로 월세 정정",
  money: "0 이상의 숫자만 넣어 주세요. 예: 450000",
  age: "나이는 0~120 사이 숫자로 넣어 주세요. 예: 26",
  area: "전용면적은 1~300㎡ 사이 숫자로 넣어 주세요. 예: 21",
  date: "날짜 형식이 맞지 않습니다. 2027-06-30처럼 넣어 주세요.",
  noChange: "바뀐 내용이 없습니다.",
} as const;

type Parsed = { value: EditValue } | { error: string };

function parseInt0(raw: string, max: number, error: string): Parsed {
  if (!/^\d+$/.test(raw) || Number(raw) > max) return { error };
  return { value: Number(raw) };
}

function parseDate(raw: string): Parsed {
  const date = new Date(`${raw}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return { error: ADMIN_EDIT_ERRORS.date };
  return { value: raw };
}

function parseField(kind: Kind, raw: string): Parsed {
  if (raw === "") return kind === "area" ? { error: ADMIN_EDIT_ERRORS.area } : { value: null };
  if (kind === "money") return parseInt0(raw, 2_000_000_000, ADMIN_EDIT_ERRORS.money);
  if (kind === "age") return parseInt0(raw, 120, ADMIN_EDIT_ERRORS.age);
  if (kind === "date") return parseDate(raw);
  const area = Number(raw);
  return /^\d+(\.\d+)?$/.test(raw) && area >= 1 && area <= 300 ? { value: area } : { error: ADMIN_EDIT_ERRORS.area };
}

export type AdminEditResult = { ok: true; changes: Record<string, EditValue>; reason: string } | { ok: false; errors: Record<string, string> };

/** 칸마다 검사하고, 고치기 전 값과 다른 칸만 돌려준다. 사유는 앞뒤 빈칸을 떼고 2~200자 */
export function parseAdminEdit({ table, form, before }: { table: EditTable; form: Record<string, string>; before: Record<string, EditValue> }): AdminEditResult {
  const errors: Record<string, string> = {};
  const changes: Record<string, EditValue> = {};
  for (const [name, { kind }] of Object.entries(EDITABLE_FIELDS[table])) {
    const parsed = parseField(kind, (form[name] ?? "").trim());
    if ("error" in parsed) errors[name] = parsed.error;
    else if (parsed.value !== (before[name] ?? null)) changes[name] = parsed.value;
  }
  const reason = (form.reason ?? "").trim();
  if (reason.length < 2 || reason.length > 200) errors.reason = ADMIN_EDIT_ERRORS.reason;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  if (Object.keys(changes).length === 0) return { ok: false, errors: { form: ADMIN_EDIT_ERRORS.noChange } };
  return { ok: true, changes, reason };
}
