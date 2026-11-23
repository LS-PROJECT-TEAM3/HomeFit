// spec 025 FR-001·FR-002·FR-003·FR-005 (PRD FR-28 v1.24): 내 집 고지서 한 장 → 12개월 예상 도시가스 사용량·요금. 순수 함수.
// 달별 비율: 한국가스공사 「월별 시도별 도시가스 판매현황」 2022~2024 평균(전체 용도, 가정용만이 아님. 판매월 = 검침·청구 기준).
// 자료는 저장소 파일(watch/gas-monthly-share.json), 뽑은 방법은 docs/data-sources.md
import data from "@/watch/gas-monthly-share.json";
import { GAS_TARIFF, gasBill, MAX_MJ, type GasBill, type GasRegion } from "./gas-bill";

export type GasShares = {
  source: { name: string; url: string; file: string; years: number[]; unit: string; note: string };
  national: number[];
  sido: Record<string, number[]>;
};

export const GAS_SHARES: GasShares = data;

/** 시군구 코드 앞 2자리 → 판매현황의 시도 이름. 강원(42→51)·전북(45→52)은 옛 코드와 새 코드 모두.
 * 이 앱은 광주(29)·전남(46)을 "12"(전남광주통합특별시, watch/sido.ts)로 쓴다 → "광주전남" 묶음(지역을 고르면 광주 또는 전남 비율) */
const SIDO_BY_CODE: Record<string, string> = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주", "30": "대전", "31": "울산", "36": "세종", "41": "경기",
  "42": "강원", "51": "강원", "12": "광주전남", "43": "충북", "44": "충남", "45": "전북", "52": "전북", "46": "전남", "47": "경북", "48": "경남", "50": "제주",
};

/** 시도 → 요금표(watch/gas-tariff.json) 공급 지역. 하나면 자동, 여러 개면 내 집에서 고른다(spec 025 Q1) */
const TARIFF_REGIONS: Record<string, string[]> = {
  서울: ["서울특별시"], 경기: ["경기도"], 인천: ["인천광역시"], 부산: ["부산시"], 대구: ["대구시"], 광주: ["광주시"], 대전: ["대전시"],
  울산: ["울산시"], 세종: ["세종시"], 제주: ["제주"],
  강원: ["강원 춘천시", "강원 원주시", "강원 영동지역", "평창"],
  충북: ["충북 청주시", "충북 충주시"],
  충남: ["충남 천안시", "충남 서산시"],
  전북: ["전북 전주시", "전북 군산시", "전북 익산시"],
  전남: ["전남 목포시", "전남 순천시", "전남 여수시", "전남 나주시"],
  경북: ["경북 구미시", "경북 포항시", "경북 경주시", "경북 안동시"],
  경남: ["경남 창원시", "경남 진주시", "경남 양산시"],
  광주전남: ["광주시", "전남 목포시", "전남 순천시", "전남 여수시", "전남 나주시"],
};

export function sidoOfSigungu(sigunguCode: string): string | null {
  return SIDO_BY_CODE[sigunguCode.slice(0, 2)] ?? null;
}

export function tariffRegionsFor(sido: string | null): string[] {
  return sido ? (TARIFF_REGIONS[sido] ?? []) : [];
}

/** 비율 자료에서 찾을 시도. "광주전남"은 고른 요금 지역으로 광주·전남을 가른다(안 골랐으면 null → 전국) */
export function shareSido(sido: string | null, region: string | null): string | null {
  if (sido !== "광주전남") return sido;
  if (!region) return null;
  return region === "광주시" ? "광주" : "전남";
}

/** E3: 시도 비율이 없거나 0인 달이 있으면 전국 비율 */
export function monthlyShares(sido: string | null, shares: GasShares = GAS_SHARES): { shares: number[]; national: boolean } {
  const own = sido ? shares.sido[sido] : undefined;
  if (own && own.length === 12 && own.every((v) => v > 0)) return { shares: own, national: false };
  return { shares: shares.national, national: true };
}

export type GasYear = {
  months: { month: number; mj: number; bill: GasBill }[];
  annualMj: number;
  totalWithVat: number;
  peakMonth: number;
  basicFeeMissing: boolean;
};

/** FR-002·FR-003: 넣은 달 ÷ 그 달 비율 = 한 해, 한 해 × 달 비율 = 그 달. 넣은 달은 넣은 값 그대로(계산기와 같은 요금, SC-001). 요금은 달마다 반올림(E4) */
export function yearlyGas(input: { mj: number; month: number; region: GasRegion; shares: number[] }): GasYear {
  const annualMj = input.mj / input.shares[input.month - 1];
  const months = input.shares.map((share, index) => {
    const month = index + 1;
    const mj = month === input.month ? input.mj : annualMj * share;
    return { month, mj, bill: gasBill(input.region, mj) };
  });
  const peak = months.reduce((best, m) => (m.mj > best.mj ? m : best), months[0]);
  return {
    months, annualMj,
    totalWithVat: months.reduce((total, m) => total + m.bill.totalWithVat, 0),
    peakMonth: peak.month,
    basicFeeMissing: input.region.basicFee === null,
  };
}

export function findTariffRegion(name: string | null): GasRegion | null {
  return GAS_TARIFF.regions.find((region) => region.name === name) ?? null;
}

export type GasFieldsInput = { usage: string; month: string; region: string };
export type GasFields = { mj: number; month: number; region: string | null };
export type GasFieldsResult = { ok: true; value: GasFields | null } | { ok: false; errors: Partial<Record<"gasUsage" | "gasMonth" | "gasRegion", string>> };

const USAGE_ERROR = "사용량은 1~100,000MJ 사이 정수로 입력해 주세요. 고지서의 사용량(MJ) 칸 숫자예요.";
const MONTH_ERROR = "몇 월 고지서인지 골라 주세요.";
const REGION_ERROR = "도시가스 요금 지역을 골라 주세요. 고지서의 공급사를 보면 알 수 있어요.";

/** 내 집 "도시가스" 칸 검사(E1·E2·FR-005). 사용량·달을 둘 다 비우면 지운다(null) */
export function parseGasFields(input: GasFieldsInput, sido: string | null): GasFieldsResult {
  const usage = input.usage.replaceAll(",", "").trim();
  const monthText = input.month.trim();
  if (usage === "" && monthText === "") return { ok: true, value: null };
  if (usage === "") return { ok: false, errors: { gasUsage: "고지서의 도시가스 사용량(MJ)을 입력해 주세요." } };
  const mj = Number(usage);
  if (!/^\d+$/.test(usage) || mj < 1 || mj > MAX_MJ) return { ok: false, errors: { gasUsage: USAGE_ERROR } };
  const month = Number(monthText);
  if (!/^\d{1,2}$/.test(monthText) || month < 1 || month > 12) return { ok: false, errors: { gasMonth: MONTH_ERROR } };
  const choices = tariffRegionsFor(sido);
  if (choices.length === 0) return { ok: false, errors: { gasRegion: "내 집 지역으로 도시가스 요금표를 찾지 못했어요. 기본 정보의 시/도를 확인해 주세요." } };
  if (choices.length === 1) return { ok: true, value: { mj, month, region: null } };
  if (!choices.includes(input.region)) return { ok: false, errors: { gasRegion: REGION_ERROR } };
  return { ok: true, value: { mj, month, region: input.region } };
}
