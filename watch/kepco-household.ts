// spec 011 FR-001: 한전 전력데이터개방포털 「가구평균 전력사용량」 해석. 순수 함수(부르기는 kepco-household.server.ts)
// 형식: https://bigdata.kepco.co.kr OPEN API > 가구평균 전력사용량 API 가이드 (2026-11-18 확인)
import { householdAverageKwh } from "@/incident/energy-estimate";

/** 화면에 근거로 보일 통계 이름과 링크 (spec 011 FR-001) */
export const KEPCO_SOURCE = {
  name: "한국전력 전력데이터개방포털 「가구평균 전력사용량」(주택용)",
  url: "https://bigdata.kepco.co.kr/cmsmain.do?scode=S01&pcode=000171",
} as const;

export type HouseholdAverage = { kwh: number; households: number | null; year: string; month: string };

/** 법정동 시군구 코드 5자리(예: 11680) → 한전 시도 코드 2자리 + 시군구 코드 3자리 */
export function kepcoRegion(sigunguCode: string): { metroCd: string; cityCd: string } | null {
  if (!/^\d{5}$/.test(sigunguCode)) return null;
  return { metroCd: sigunguCode.slice(0, 2), cityCd: sigunguCode.slice(2) };
}

/** 한전은 매월 16일경 전전월 통계를 올린다. 전전월이 아직 없을 수 있어 그 전 달까지 두 달을 차례로 본다 */
export function kepcoQueryMonths(now: Date): { year: string; month: string }[] {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return [2, 3].map((back) => {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - back, 1));
    return { year: String(d.getUTCFullYear()), month: String(d.getUTCMonth() + 1).padStart(2, "0") };
  });
}

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

/** 시군구를 지정해 부른 응답의 첫 행. 모양이 다르거나 값이 없으면 null(E2) */
export function parseHouseholdAverage(json: unknown): HouseholdAverage | null {
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0] as Record<string, unknown>;
  // 가이드 표는 powerUseage, 예시는 powerUsage로 적어 둘 다 읽는다
  const kwh = householdAverageKwh(toNumber(row.powerUsage ?? row.powerUseage));
  if (kwh === null || typeof row.year !== "string" || typeof row.month !== "string") return null;
  return { kwh, households: toNumber(row.houseCnt), year: row.year, month: row.month };
}
