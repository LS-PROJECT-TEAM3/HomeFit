import { cacheLife } from "next/cache";
import { aptEnergyQueryMonths, parseAptEnergy, type AptEnergy } from "@/watch/apt-energy";

// spec 018: 국토교통부 「공동주택 에너지 사용 정보」. 한 달에 한 번 바뀌는 값이라 DB에 넣지 않고 시군구·날짜마다 하루 기억한다.
// 키는 서버 환경변수 DATA_GO_KR_SERVICE_KEY(공공데이터포털, 2026-11-19 활용신청). 오류 문구에 주소(키 포함)를 넣지 않는다
const ENDPOINT = "https://apis.data.go.kr/1613000/ApHusEnergyUseInfoOfferServiceV2/getSignguAvrgEnergyUseAmountInfoSearchV2";
const TIMEOUT_MS = 15_000;

/** 한 시군구·한 달. 자료가 없으면(모두 0) null, 키·네트워크·모양 오류는 던진다 */
export async function fetchAptMonth(sigunguCode: string, searchDate: string): Promise<AptEnergy | null> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  const params = new URLSearchParams({ serviceKey, sigunguCode, searchDate, _type: "json" });
  const response = await fetch(`${ENDPOINT}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`공동주택 에너지 사용 정보 HTTP ${response.status}`);
  let json: unknown;
  try {
    json = JSON.parse(await response.text());
  } catch {
    throw new Error("공동주택 에너지 사용 정보 응답이 JSON이 아님");
  }
  return parseAptEnergy(json);
}

export type AptEnergyAverage = AptEnergy & { searchDate: string };

/** FR-002: 작년 같은 달, 없으면 그 전 해 같은 달. 둘 다 없으면 null */
export async function fetchAptEnergy(sigunguCode: string, today: string): Promise<AptEnergyAverage | null> {
  "use cache";
  cacheLife({ revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 2 });
  for (const searchDate of aptEnergyQueryMonths(new Date(`${today}T12:00:00+09:00`))) {
    const found = await fetchAptMonth(sigunguCode, searchDate);
    if (found) return { ...found, searchDate };
  }
  return null;
}
