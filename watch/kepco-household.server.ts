import { cacheLife } from "next/cache";
import { kepcoQueryMonths, kepcoRegion, parseHouseholdAverage, type HouseholdAverage } from "@/watch/kepco-household";

// spec 011 FR-001, Q4 (B): 한전 「가구평균 전력사용량」. 한 달에 한 번 바뀌는 값이라 DB에 넣지 않고 하루 동안 기억한다.
// 키는 서버 환경변수 KEPCO_API_KEY에만 둔다. 오류 문구에 주소(키 포함)를 넣지 않는다
const ENDPOINT = "https://bigdata.kepco.co.kr/openapi/v1/powerUsage/houseAve.do";
const TIMEOUT_MS = 15_000;

/** 한 달치 부르기. 시험이 가짜 fetch로 404·오류 분기를 확인한다(코드 점검 2) */
export async function fetchMonth(region: { metroCd: string; cityCd: string }, period: { year: string; month: string }): Promise<HouseholdAverage | null> {
  const apiKey = process.env.KEPCO_API_KEY;
  if (!apiKey) throw new Error("KEPCO_API_KEY 없음");
  const params = new URLSearchParams({ ...period, ...region, apiKey, returnType: "json" });
  const response = await fetch(`${ENDPOINT}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  // 그 달·시군구 통계가 없으면 404 {"errCd":"404","errMsg":"NotFound"}로 답한다(2026-11-18 실제 호출로 확인)
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`한전 가구평균 응답 HTTP ${response.status}`);
  const text = await response.text();
  try {
    return parseHouseholdAverage(JSON.parse(text));
  } catch {
    throw new Error("한전 가구평균 응답이 JSON이 아님");
  }
}

/** 그 시군구의 가장 최근 달 가구 평균. 통계가 없으면 null, 키·네트워크 오류는 던진다(부르는 쪽이 수집 오류로 보여 준다) */
export async function fetchHouseholdAverage(sigunguCode: string, today: string): Promise<HouseholdAverage | null> {
  "use cache";
  cacheLife({ revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 2 });
  const region = kepcoRegion(sigunguCode);
  if (!region) return null;
  for (const period of kepcoQueryMonths(new Date(`${today}T12:00:00+09:00`))) {
    const found = await fetchMonth(region, period);
    if (found) return found;
  }
  return null;
}
