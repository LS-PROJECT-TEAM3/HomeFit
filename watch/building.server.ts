import { cacheLife } from "next/cache";
import { parseBuildingTitles, umdFromResponse, type BuildingQuery, type BuildingTitle } from "@/watch/building";

// spec 004 v0.4 FR-008, PRD v1.8 FR-34: 건축HUB 건축물대장 표제부와 읍면동 목록. 키는 서버 환경변수(DATA_GO_KR_SERVICE_KEY)만
const BUILDING_ENDPOINT = "https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo";
const REGION_ENDPOINT = "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList";
const TIMEOUT_MS = 15_000;

function serviceKey(): string {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  return key;
}

/** 조회만 한다. 넣은 주소는 어디에도 저장하지 않는다 */
export async function fetchBuildingTitles(query: BuildingQuery): Promise<BuildingTitle[]> {
  const params = new URLSearchParams({
    serviceKey: serviceKey(), sigunguCd: query.sigunguCode, bjdongCd: query.bjdongCode, bun: query.bun, ji: query.ji,
    _type: "json", numOfRows: "20", pageNo: "1",
  });
  const response = await fetch(`${BUILDING_ENDPOINT}?${params}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`건축HUB 응답 HTTP ${response.status}`);
  return parseBuildingTitles(await response.json());
}

/** 한 시군구의 읍면동. 행정 구역은 자주 바뀌지 않아 30일 저장(시군구 목록과 같음, watch/region.server.ts) */
export async function fetchUmdList(sigunguCode: string): Promise<{ code: string; name: string }[]> {
  "use cache";
  cacheLife({ revalidate: 60 * 60 * 24 * 30, expire: 60 * 60 * 24 * 60 });
  const params = new URLSearchParams({
    ServiceKey: serviceKey(), type: "json", pageNo: "1", numOfRows: "500", flag: "Y",
    sido_cd: sigunguCode.slice(0, 2), sgg_cd: sigunguCode.slice(2, 5),
  });
  const response = await fetch(`${REGION_ENDPOINT}?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`법정동 응답 HTTP ${response.status}`);
  return umdFromResponse(await response.json());
}
