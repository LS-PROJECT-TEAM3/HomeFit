import type { WindowType } from "@/incident/condensation";

// FR-001, FR-002 (spec 003): 내 집·측정값 입력 검사. 순수 함수(현재 시각은 인자)

export const HOUSING_TYPES = ["apartment", "officetel", "row_house", "detached"] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];
export const WINDOW_TYPES: readonly WindowType[] = ["single", "double", "unknown"];

// ERD homes.housing_type, window_type 값과 화면 이름 (IA MY_030200_TB). 서버·화면 코드가 함께 쓴다
export const HOUSING_LABELS: Record<HousingType, string> = { apartment: "아파트", officetel: "오피스텔", row_house: "연립·다세대", detached: "단독·다가구" };
export const WINDOW_LABELS: Record<WindowType, string> = { single: "홑유리(유리 한 장)", double: "이중유리(유리 두 장)", unknown: "모름" };

/** areaUnit: "m2" | "pyeong" (사용자 요청 2026-11-17: 평으로도 입력). 저장은 늘 ㎡ */
export type HomeFormInput = {
  sidoCode: string; sigunguCode: string; housingType: string; exclusiveArea: string; areaUnit: string; windowType: string;
  /** spec 003 v0.2: 계약 칸(모두 선택) */
  contractType: string; deposit: string; monthlyRent: string; maintenanceFee: string; contractEndDate: string;
};
export const CONTRACT_TYPES = ["monthly", "jeonse"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];
export type HomeValue = {
  sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number; windowType: WindowType;
  contractType: ContractType | null; deposit: number | null; monthlyRent: number | null; maintenanceFee: number | null; contractEndDate: string | null;
};
type HomeField = "sigunguCode" | "housingType" | "exclusiveArea" | "windowType" | "contractType" | "deposit" | "monthlyRent" | "maintenanceFee" | "contractEndDate";
export type HomeFormResult = { ok: true; value: HomeValue } | { ok: false; errors: Partial<Record<HomeField, string>> };

export type MeasurementFormInput = { temperature: string; humidity: string; measuredAt: string };
export type MeasurementValue = { temperatureC: number; humidityPct: number; measuredAt: string };
type MeasurementField = "temperature" | "humidity" | "measuredAt";
export type MeasurementFormResult = { ok: true; value: MeasurementValue } | { ok: false; errors: Partial<Record<MeasurementField, string>> };

const MESSAGES = {
  sigungu: "시군구를 골라 주세요. 날씨 예보를 읽을 지역입니다.",
  housingType: "주택 유형을 목록에서 골라 주세요.",
  area: "전용면적은 1~300㎡ 사이 숫자로 입력해 주세요. 예: 20",
  areaPyeong: "전용면적은 0.3~90.7평 사이 숫자로 입력해 주세요. 예: 6",
  windowType: "창 종류를 골라 주세요. 모르면 '모름'을 고르면 됩니다.",
  contractType: "계약 형태를 목록에서 골라 주세요.",
  amount: "0 이상 숫자로 입력해 주세요. 예: 450000",
  endDate: "계약 만료일 형식이 맞지 않습니다. 2027-08-31처럼 입력해 주세요.",
  temperature: "실내 온도는 -10~45°C 사이로 입력해 주세요.",
  humidity: "실내 습도는 0~100% 사이로 입력해 주세요.",
  future: "측정 시각은 지금보다 늦을 수 없습니다.",
  timeFormat: "측정 시각 형식이 맞지 않습니다. 2026-11-18 08:30처럼 입력해 주세요.",
} as const;

/** 숫자 글자만 읽는다. 아니면 NaN */
function toNumber(raw: string): number {
  const text = raw.trim();
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
}

// 1평 = 400/121㎡ (계량에 관한 법률 시행령의 환산)
const SQUARE_METERS_PER_PYEONG = 400 / 121;

/** 입력 면적 → ㎡(소수 둘째 자리). 숫자가 아니면 NaN */
function toSquareMeters(raw: string, unit: string): number {
  const value = toNumber(raw);
  if (unit !== "pyeong") return value;
  return Math.round(value * SQUARE_METERS_PER_PYEONG * 100) / 100;
}

function inRange(value: number, min: number, max: number): boolean {
  return !Number.isNaN(value) && value >= min && value <= max;
}

// 보증금도 넉넉히 받되 잘못 친 값을 막는다(10억 원)
const MAX_AMOUNT = 1_000_000_000;

/** 빈 칸은 null, 쉼표·공백은 빼고 읽는다. 잘못된 값은 NaN */
function toOptionalAmount(raw: string): number | null {
  const text = raw.replace(/[,\s]/g, "");
  if (text === "") return null;
  const value = /^\d+$/.test(text) ? Number(text) : Number.NaN;
  return value <= MAX_AMOUNT ? value : Number.NaN;
}

function toOptionalDate(raw: string): string | null | undefined {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) return undefined;
  return text;
}

type ContractPart = Pick<HomeValue, "contractType" | "deposit" | "monthlyRent" | "maintenanceFee" | "contractEndDate">;

/** spec 003 v0.2 FR-001 수용 기준 6·7: 계약 칸은 모두 선택. 전세면 월세 0 */
function parseContract(input: HomeFormInput, errors: Partial<Record<HomeField, string>>): ContractPart {
  const contractType = input.contractType === "" ? null : (input.contractType as ContractType);
  if (contractType !== null && !(CONTRACT_TYPES as readonly string[]).includes(contractType)) errors.contractType = MESSAGES.contractType;
  const amounts = { deposit: toOptionalAmount(input.deposit), monthlyRent: toOptionalAmount(input.monthlyRent), maintenanceFee: toOptionalAmount(input.maintenanceFee) };
  for (const [field, value] of Object.entries(amounts)) {
    if (value !== null && Number.isNaN(value)) errors[field as HomeField] = MESSAGES.amount;
  }
  const contractEndDate = toOptionalDate(input.contractEndDate);
  if (contractEndDate === undefined) errors.contractEndDate = MESSAGES.endDate;
  return { contractType, ...amounts, monthlyRent: contractType === "jeonse" ? 0 : amounts.monthlyRent, contractEndDate: contractEndDate ?? null };
}

export function parseHomeForm(input: HomeFormInput): HomeFormResult {
  const errors: Partial<Record<HomeField, string>> = {};
  const sigungu = input.sigunguCode.trim();
  // 시도가 비면 startsWith("")가 늘 참이라 따로 막는다(리뷰 4번)
  if (input.sidoCode === "" || !/^\d{5}$/.test(sigungu) || !sigungu.startsWith(input.sidoCode)) errors.sigunguCode = MESSAGES.sigungu;
  if (!(HOUSING_TYPES as readonly string[]).includes(input.housingType)) errors.housingType = MESSAGES.housingType;
  const area = toSquareMeters(input.exclusiveArea, input.areaUnit);
  if (!inRange(area, 1, 300)) errors.exclusiveArea = input.areaUnit === "pyeong" ? MESSAGES.areaPyeong : MESSAGES.area;
  if (!(WINDOW_TYPES as readonly string[]).includes(input.windowType)) errors.windowType = MESSAGES.windowType;
  const contract = parseContract(input, errors);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { sigunguCode: sigungu, housingType: input.housingType as HousingType, exclusiveAreaM2: area, windowType: input.windowType as WindowType, ...contract },
  };
}

/** 화면의 datetime-local 값("2026-11-18T08:30")은 KST로 읽는다 */
function parseKstLocal(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.trim())) return null;
  const date = new Date(`${raw.trim()}:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseMeasurementForm(input: MeasurementFormInput, now: Date): MeasurementFormResult {
  const errors: Partial<Record<MeasurementField, string>> = {};
  const temperature = toNumber(input.temperature);
  const humidity = toNumber(input.humidity);
  if (!inRange(temperature, -10, 45)) errors.temperature = MESSAGES.temperature;
  if (!inRange(humidity, 0, 100)) errors.humidity = MESSAGES.humidity;
  const measuredAt = parseKstLocal(input.measuredAt);
  if (!measuredAt) errors.measuredAt = MESSAGES.timeFormat;
  else if (measuredAt.getTime() > now.getTime()) errors.measuredAt = MESSAGES.future;
  if (Object.keys(errors).length > 0 || !measuredAt) return { ok: false, errors };
  return { ok: true, value: { temperatureC: temperature, humidityPct: humidity, measuredAt: measuredAt.toISOString() } };
}
