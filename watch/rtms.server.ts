import type { HousingType } from "@/incident/home-form";
import { parseRtmsResponse, type Trade } from "@/watch/rtms";

// spec 008 FR-002: 국토부 전월세 실거래가 4개 API (2026-11-18 실제 응답 확인)
const ENDPOINTS: Record<HousingType, string> = {
  apartment: "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  officetel: "RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
  row_house: "RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
  detached: "RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
};
const PAGE_SIZE = 1000;
// 한 시군구·한 달이 1000건을 넘는 곳(큰 구의 아파트)이 있어 쪽을 넘긴다. 끝없이 넘기지 않게 막는다
const MAX_PAGES = 10;

export type RtmsQuery = { housingType: HousingType; sigunguCode: string; dealYmd: string; pageNo: number; pageSize: number };
/** 한 쪽 받기. 실제 API와 가짜 묶음(시뮬레이터)이 같은 모양 */
export type RtmsFetcher = (query: RtmsQuery) => Promise<unknown>;

export function rtmsApiFetcher(serviceKey: string): RtmsFetcher {
  return async ({ housingType, sigunguCode, dealYmd, pageNo, pageSize }) => {
    const query = new URLSearchParams({ serviceKey, LAWD_CD: sigunguCode, DEAL_YMD: dealYmd, numOfRows: String(pageSize), pageNo: String(pageNo), _type: "json" });
    const response = await fetch(`https://apis.data.go.kr/1613000/${ENDPOINTS[housingType]}?${query}`, { cache: "no-store" });
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`실거래가 응답 HTTP ${response.status}, JSON이 아닙니다`);
    }
  };
}

async function fetchMonth(fetcher: RtmsFetcher, key: { sigunguCode: string; housingType: HousingType }, dealYmd: string): Promise<Trade[]> {
  const trades: Trade[] = [];
  let total = Number.POSITIVE_INFINITY;
  for (let pageNo = 1; pageNo <= MAX_PAGES && (pageNo - 1) * PAGE_SIZE < total; pageNo += 1) {
    const result = parseRtmsResponse(await fetcher({ ...key, dealYmd, pageNo, pageSize: PAGE_SIZE }), key.housingType);
    if (!result.ok) throw new Error(result.error);
    trades.push(...result.trades);
    total = result.totalCount;
    if (result.trades.length + result.skipped === 0) break;
  }
  return trades;
}

export type CollectedTrades = { trades: Trade[]; okKeys: string[]; failed: { key: string; reason: string }[] };

/** spec 008 FR-002, E7: 시군구 × 유형마다 3개월. 한 묶음이 실패해도 나머지는 계속하고 실패를 따로 돌려준다 */
export async function fetchTrades(fetcher: RtmsFetcher, keys: readonly { sigunguCode: string; housingType: HousingType }[], months: readonly string[]): Promise<CollectedTrades> {
  const out: CollectedTrades = { trades: [], okKeys: [], failed: [] };
  for (const key of keys) {
    const name = `${key.sigunguCode}:${key.housingType}`;
    try {
      for (const month of months) out.trades.push(...(await fetchMonth(fetcher, key, month)));
      out.okKeys.push(name);
    } catch (cause) {
      out.failed.push({ key: name, reason: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  return out;
}
