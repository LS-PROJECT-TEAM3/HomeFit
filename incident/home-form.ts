import type { WindowType } from "@/incident/condensation";

// FR-001, FR-002 (spec 003): 내 집·측정값 입력 검사. 순수 함수(현재 시각은 인자)

export const HOUSING_TYPES = ["apartment", "officetel", "row_house", "detached"] as const;
export type HousingType = (typeof HOUSING_TYPES)[number];
export const WINDOW_TYPES: readonly WindowType[] = ["single", "double", "unknown"];

export type HomeFormInput = { sidoCode: string; sigunguCode: string; housingType: string; exclusiveArea: string; windowType: string };
export type HomeValue = { sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number; windowType: WindowType };
type HomeField = "sigunguCode" | "housingType" | "exclusiveArea" | "windowType";
export type HomeFormResult = { ok: true; value: HomeValue } | { ok: false; errors: Partial<Record<HomeField, string>> };

export type MeasurementFormInput = { temperature: string; humidity: string; measuredAt: string };
export type MeasurementValue = { temperatureC: number; humidityPct: number; measuredAt: string };
type MeasurementField = "temperature" | "humidity" | "measuredAt";
export type MeasurementFormResult = { ok: true; value: MeasurementValue } | { ok: false; errors: Partial<Record<MeasurementField, string>> };

const MESSAGES = {
  sigungu: "시군구를 골라 주세요. 날씨 예보를 읽을 지역입니다.",
  housingType: "주택 유형을 목록에서 골라 주세요.",
  area: "전용면적은 1~300㎡ 사이 숫자로 입력해 주세요. 예: 20",
  windowType: "창 종류를 골라 주세요. 모르면 '모름'을 고르면 됩니다.",
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

function inRange(value: number, min: number, max: number): boolean {
  return !Number.isNaN(value) && value >= min && value <= max;
}

export function parseHomeForm(input: HomeFormInput): HomeFormResult {
  const errors: Partial<Record<HomeField, string>> = {};
  const sigungu = input.sigunguCode.trim();
  // 시도가 비면 startsWith("")가 늘 참이라 따로 막는다(리뷰 4번)
  if (input.sidoCode === "" || !/^\d{5}$/.test(sigungu) || !sigungu.startsWith(input.sidoCode)) errors.sigunguCode = MESSAGES.sigungu;
  if (!(HOUSING_TYPES as readonly string[]).includes(input.housingType)) errors.housingType = MESSAGES.housingType;
  const area = toNumber(input.exclusiveArea);
  if (!inRange(area, 1, 300)) errors.exclusiveArea = MESSAGES.area;
  if (!(WINDOW_TYPES as readonly string[]).includes(input.windowType)) errors.windowType = MESSAGES.windowType;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { sigunguCode: sigungu, housingType: input.housingType as HousingType, exclusiveAreaM2: area, windowType: input.windowType as WindowType },
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
