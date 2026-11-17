import { ALL_SUPPLY_TYPES, type PolicyCondition } from "@/incident/match";
import { isKnownSidoCode } from "@/watch/sido";

export type ConditionFormInput = {
  sidoCode: string;
  sigunguCode: string;
  supplyTypes: readonly string[];
  maxMonthlyRent: string;
  age: string;
};

export type ConditionField = "sidoCode" | "sigunguCode" | "maxMonthlyRent" | "age";

export type ConditionFormResult =
  | { ok: true; value: PolicyCondition }
  | { ok: false; errors: Partial<Record<ConditionField, string>> };

const MESSAGES: Record<string, string> = {
  sidoRequired: "시도를 골라 주세요. 공고를 받을 지역입니다.",
  sidoUnknown: "알 수 없는 시도입니다. 목록에서 다시 골라 주세요.",
  sigunguMismatch: "시군구가 고른 시도에 속하지 않습니다. 시군구를 다시 골라 주세요.",
  rentInvalid: "월 임대료 상한은 0 이상이어야 합니다. 예: 300000",
  ageInvalid: "나이는 0~120 사이 숫자로 입력해 주세요. 예: 26",
};

// 빈 칸은 null, 숫자가 아니면 NaN
function toOptionalInt(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  return /^-?\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

function normalizeSupplyTypes(types: readonly string[]): string[] {
  const picked = types.filter((type) => type.trim() !== "");
  if (picked.length === 0 || picked.includes(ALL_SUPPLY_TYPES)) return [ALL_SUPPLY_TYPES];
  return [...new Set(picked)];
}

function regionError(input: ConditionFormInput): Partial<Record<ConditionField, string>> {
  if (input.sidoCode === "") return { sidoCode: MESSAGES.sidoRequired };
  if (!isKnownSidoCode(input.sidoCode)) return { sidoCode: MESSAGES.sidoUnknown };
  const sigungu = input.sigunguCode.trim();
  if (sigungu !== "" && !(/^\d{5}$/.test(sigungu) && sigungu.startsWith(input.sidoCode))) {
    return { sigunguCode: MESSAGES.sigunguMismatch };
  }
  return {};
}

/** FR-002 (spec 001): 화면에서 받은 조건을 검사해 저장할 값으로 바꾼다 */
export function parseConditionForm(input: ConditionFormInput): ConditionFormResult {
  const rent = toOptionalInt(input.maxMonthlyRent);
  const age = toOptionalInt(input.age);
  const errors: Partial<Record<ConditionField, string>> = { ...regionError(input) };
  if (rent !== null && (Number.isNaN(rent) || rent < 0)) errors.maxMonthlyRent = MESSAGES.rentInvalid;
  if (age !== null && (Number.isNaN(age) || age < 0 || age > 120)) errors.age = MESSAGES.ageInvalid;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      sidoCode: input.sidoCode,
      sigunguCode: input.sigunguCode.trim() === "" ? null : input.sigunguCode.trim(),
      supplyTypes: normalizeSupplyTypes(input.supplyTypes),
      maxMonthlyRent: rent,
      age,
    },
  };
}
