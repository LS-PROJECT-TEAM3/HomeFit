import { HOUSING_TYPES, type HousingType } from "@/incident/home-form";

// spec 009 FR-001·002 (PRD FR-28 v1.10, IA CP_040100_PG): 관심 주택·내 집 비용 칸 입력 검사. 순수 함수

export type CostFieldsInput = { energyCost: string; electricityKwh: string; transitFare: string; tripsPerDay: string; commuteDays: string };
export type CostFields = { energyCost: number | null; electricityKwh: number | null; transitFare: number | null; tripsPerDay: number | null; commuteDays: number | null };
type CostField = keyof CostFields;

export type InterestHomeInput = CostFieldsInput & {
  name: string; sidoCode: string; sigunguCode: string; housingType: string; exclusiveArea: string; areaUnit: string;
  deposit: string; monthlyRent: string; maintenanceFee: string;
};
export type InterestHomeValue = CostFields & {
  name: string; sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number | null;
  deposit: number | null; monthlyRent: number; maintenanceFee: number | null;
};
export type InterestHomeField = CostField | "name" | "sigunguCode" | "housingType" | "exclusiveArea" | "deposit" | "monthlyRent" | "maintenanceFee";
type Result<T, F extends string> = { ok: true; value: T } | { ok: false; errors: Partial<Record<F, string>> };

// 칸마다 받을 범위와 오류 문구(무엇이 안 됐는지 + 할 일)
const RANGES: Record<CostField | "deposit" | "monthlyRent" | "maintenanceFee", [number, number, string]> = {
  deposit: [0, 2_000_000_000, "보증금은 0 이상 숫자(원)로 입력해 주세요. 예: 5000000"],
  monthlyRent: [0, 10_000_000, "월세를 0 이상 숫자(원)로 입력해 주세요. 전세면 0. 예: 450000"],
  maintenanceFee: [0, 2_000_000, "관리비는 0 이상 숫자(원)로 입력해 주세요. 예: 70000"],
  energyCost: [0, 2_000_000, "에너지비는 0 이상 숫자(원)로 입력해 주세요. 예: 50000"],
  electricityKwh: [0, 3_000, "전기 사용량은 0~3000kWh 사이로 입력해 주세요. 고지서의 '사용량'을 보면 됩니다."],
  transitFare: [0, 20_000, "편도 요금은 0~20,000원 사이로 입력해 주세요. 예: 1500"],
  tripsPerDay: [1, 10, "하루 탈 횟수는 1~10 사이로 입력해 주세요. 비우면 2(출퇴근)."],
  commuteDays: [1, 31, "한 달 출근 일수는 1~31 사이로 입력해 주세요. 비우면 22."],
};
const MAX_NAME = 40;
const SQUARE_METERS_PER_PYEONG = 400 / 121; // 계량에 관한 법률 시행령의 환산 (home-form과 같음)

/** 빈 칸 = null, 숫자가 아니거나 범위 밖 = NaN */
function optionalNumber(raw: string, [min, max]: [number, number, string]): number | null {
  const text = raw.replaceAll(",", "").trim();
  if (text === "") return null;
  if (!/^\d+(\.\d+)?$/.test(text)) return Number.NaN;
  const value = Number(text);
  return value >= min && value <= max ? value : Number.NaN;
}

function readNumbers<K extends keyof typeof RANGES>(input: Record<K, string>, keys: readonly K[], errors: Partial<Record<string, string>>) {
  const out = {} as Record<K, number | null>;
  for (const key of keys) {
    const value = optionalNumber(input[key], RANGES[key]);
    if (Number.isNaN(value)) errors[key] = RANGES[key][2];
    out[key] = Number.isNaN(value) ? null : value === null ? null : Math.round(value);
  }
  return out;
}

const COST_KEYS = ["energyCost", "electricityKwh", "transitFare", "tripsPerDay", "commuteDays"] as const;

/** FR-002: 내 집 비용 칸(모두 선택) */
export function parseCostFields(input: CostFieldsInput): Result<CostFields, CostField> {
  const errors: Partial<Record<CostField, string>> = {};
  const value = readNumbers(input, COST_KEYS, errors);
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

function area(raw: string, unit: string): number | null {
  const value = optionalNumber(raw, [0.3, 300, ""]);
  if (value === null || Number.isNaN(value)) return value;
  return unit === "pyeong" ? Math.round(value * SQUARE_METERS_PER_PYEONG * 100) / 100 : value;
}

/** FR-001, E8: 관심 주택. 이름·시군구·유형·월세는 필수 */
export function parseInterestHomeForm(input: InterestHomeInput): Result<InterestHomeValue, InterestHomeField> {
  const errors: Partial<Record<InterestHomeField, string>> = {};
  const name = input.name.trim();
  if (name === "" || name.length > MAX_NAME) errors.name = `이름을 1~${MAX_NAME}자로 입력해 주세요. 상세 주소 대신 내가 알아볼 이름(예: 역 앞 오피스텔)을 씁니다.`;
  if (!/^\d{5}$/.test(input.sigunguCode)) errors.sigunguCode = "시군구를 골라 주세요.";
  if (!(HOUSING_TYPES as readonly string[]).includes(input.housingType)) errors.housingType = "주택 유형을 목록에서 골라 주세요.";
  const areaM2 = area(input.exclusiveArea, input.areaUnit);
  if (Number.isNaN(areaM2)) errors.exclusiveArea = "전용면적은 1~300㎡(0.3~90.7평) 사이 숫자로 입력해 주세요. 모르면 비워 두세요.";
  const money = readNumbers(input, ["deposit", "monthlyRent", "maintenanceFee"] as const, errors);
  if (money.monthlyRent === null && !errors.monthlyRent) errors.monthlyRent = RANGES.monthlyRent[2];
  const cost = readNumbers(input, COST_KEYS, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, sigunguCode: input.sigunguCode, housingType: input.housingType as HousingType, exclusiveAreaM2: areaM2, ...money, monthlyRent: money.monthlyRent ?? 0, ...cost },
  };
}
