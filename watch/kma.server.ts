import type { Grid } from "@/watch/kma-grid";

// FR-003 (spec 003): 기상청 단기예보 호출. 키는 서버 환경변수(DATA_GO_KR_SERVICE_KEY)만 쓴다 (PRD FR-27)
const ENDPOINT = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
// 한 발표의 전체 예보(약 1,000행)를 한 번에 받는다
const ROWS = "1000";
const TIMEOUT_MS = 15_000;

export type BaseTime = { baseDate: string; baseTime: string };
/** 격자 하나의 예보 응답(JSON). 실제 API와 가짜 예보(개발)가 같은 모양을 쓴다 */
export type ForecastFetcher = (grid: Grid, base: BaseTime) => Promise<unknown>;

export function kmaApiFetcher(serviceKey: string): ForecastFetcher {
  return async (grid, base) => {
    const query = new URLSearchParams({
      serviceKey, pageNo: "1", numOfRows: ROWS, dataType: "JSON",
      base_date: base.baseDate, base_time: base.baseTime, nx: String(grid.nx), ny: String(grid.ny),
    });
    const response = await fetch(`${ENDPOINT}?${query}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`기상청 응답 HTTP ${response.status}`);
    // 키 오류 등은 JSON이 아니라 XML로 올 수 있다. 해석 단계에서 오류가 되도록 글자로 넘긴다
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };
}
