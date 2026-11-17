import { cacheLife } from "next/cache";
import { sigunguFromResponse, type Sigungu } from "@/watch/region";

const ENDPOINT = "https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList";

/**
 * FR-002 (spec 001 v0.3), Q18: 공공데이터포털 법정동코드 API로 한 시도의 시군구를 받는다.
 * umd_cd=000으로 시도·시군구 줄만 받아(경기도 56줄) 한 번 부르면 끝난다. 행정 구역은 자주 바뀌지 않아 30일 동안 저장해 둔다.
 * 실패는 던진다(저장하지 않음). 화면은 "불러오지 못했습니다"를 보이고 시도만으로 저장하게 한다.
 */
export async function fetchSigunguList(sidoCode: string): Promise<Sigungu[]> {
  "use cache";
  cacheLife({ revalidate: 60 * 60 * 24 * 30, expire: 60 * 60 * 24 * 60 });
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) throw new Error("DATA_GO_KR_SERVICE_KEY 없음");
  const query = new URLSearchParams({
    ServiceKey: serviceKey, type: "json", pageNo: "1", numOfRows: "200", flag: "Y", sido_cd: sidoCode, umd_cd: "000",
  });
  const response = await fetch(`${ENDPOINT}?${query}`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`법정동 응답 HTTP ${response.status}`);
  const list = sigunguFromResponse(await response.json(), sidoCode);
  if (list === null) throw new Error("법정동 응답 모양이 다릅니다");
  return list;
}
