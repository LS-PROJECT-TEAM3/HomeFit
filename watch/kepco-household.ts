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

const SHAPE_ERROR = "한전 가구평균 응답 모양이 다름";

/**
 * 시군구를 지정해 부른 응답의 첫 행. 통계가 없으면(빈 목록, 본문 404, 0 이하 값) null(E2).
 * 모양이 다르거나 오류 코드가 있으면 던진다. "통계 없음"으로 하루 기억하지 않고 수집 오류로 보이게(팀 규칙 "읽기 실패는 오류로", PR #15 리뷰)
 */
export function parseHouseholdAverage(json: unknown): HouseholdAverage | null {
  if (typeof json !== "object" || json === null) throw new Error(SHAPE_ERROR);
  const body = json as { data?: unknown; errCd?: unknown };
  if (body.errCd !== undefined) {
    if (String(body.errCd) === "404") return null;
    throw new Error(`한전 가구평균 오류 ${String(body.errCd)}`);
  }
  if (!Array.isArray(body.data)) throw new Error(SHAPE_ERROR);
  if (body.data.length === 0) return null;
  const row = body.data[0] as Record<string, unknown> | null;
  if (typeof row !== "object" || row === null || typeof row.year !== "string" || typeof row.month !== "string") throw new Error(SHAPE_ERROR);
  // 가이드 표는 powerUseage, 예시는 powerUsage로 적어 둘 다 읽는다
  const kwh = householdAverageKwh(toNumber(row.powerUsage ?? row.powerUseage));
  if (kwh === null) return null;
  return { kwh, households: toNumber(row.houseCnt), year: row.year, month: row.month };
}
