import { CONTRACT_TYPES, HOUSING_TYPES, type ContractType, type HousingType } from "@/incident/home-form";

// spec 008 FR-001 (PRD FR-05, IA MY_030300_TB): 관심 지역 입력 검사. 순수 함수

export type AreaFormInput = { sidoCode: string; sigunguCodes: string[]; housingType: string; targetArea: string; areaUnit: string; contractType: string };
/** 사용자 요청(2026-11-18): 시군구 여러 곳을 한 번에. 저장은 시군구마다 관심 지역 한 줄 */
export type AreaValue = { sigunguCodes: string[]; housingType: HousingType; targetAreaM2: number; contractType: ContractType };
export type AreaField = "sigunguCodes" | "housingType" | "targetArea" | "contractType";
export type AreaFormResult = { ok: true; value: AreaValue } | { ok: false; errors: Partial<Record<AreaField, string>> };

const MESSAGES = {
  sigunguCodes: "시군구를 1~10곳 골라 주세요. 시세를 볼 지역입니다.",
  housingType: "주택 유형을 목록에서 골라 주세요.",
  targetArea: "기준 면적은 1~300㎡(0.3~90.7평) 사이 숫자로 입력해 주세요. 예: 20",
  contractType: "계약 형태(월세 / 전세)를 골라 주세요.",
} as const;

// 한 번에 넣을 수 있는 시군구 수. 수집은 시군구 × 유형 × 3개월만큼 API를 부르므로 너무 늘지 않게 막는다
const MAX_AREAS_AT_ONCE = 10;

// 1평 = 400/121㎡ (계량에 관한 법률 시행령의 환산, home-form과 같음)
const SQUARE_METERS_PER_PYEONG = 400 / 121;

function toSquareMeters(raw: string, unit: string): number {
  const text = raw.trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return Number.NaN;
  const value = Number(text);
  return unit === "pyeong" ? Math.round(value * SQUARE_METERS_PER_PYEONG * 100) / 100 : value;
}

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/** E10: 잘못된 칸마다 이유와 할 일 */
export function parseAreaForm(input: AreaFormInput): AreaFormResult {
  const errors: Partial<Record<AreaField, string>> = {};
  const area = toSquareMeters(input.targetArea, input.areaUnit);
  const codes = [...new Set(input.sigunguCodes)];
  if (codes.length === 0 || codes.length > MAX_AREAS_AT_ONCE || codes.some((code) => !/^\d{5}$/.test(code))) errors.sigunguCodes = MESSAGES.sigunguCodes;
  if (!isOneOf(HOUSING_TYPES, input.housingType)) errors.housingType = MESSAGES.housingType;
  if (!(area >= 1 && area <= 300)) errors.targetArea = MESSAGES.targetArea;
  if (!isOneOf(CONTRACT_TYPES, input.contractType)) errors.contractType = MESSAGES.contractType;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { sigunguCodes: codes, housingType: input.housingType as HousingType, targetAreaM2: area, contractType: input.contractType as ContractType } };
}
