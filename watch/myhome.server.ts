import { parseMyhomeResponse, type ParseResult } from "@/watch/myhome";
import { uniqueByExternalId, type Notice } from "@/watch/notice";

const ENDPOINT = "https://apis.data.go.kr/1613000/HWSPR02/rsdtRcritNtcList";
const PAGE_SIZE = 100;
// 응답이 이상해 끝없이 넘기는 것을 막는다. 2026-11-17 전체 288건 = 3쪽
const MAX_PAGES = 20;

/** 한 쪽을 받아 오는 함수. 실제 API와 가짜 응답 묶음(시뮬레이터)이 같은 모양을 쓴다 */
export type PageFetcher = (pageNo: number, pageSize: number) => Promise<unknown>;

export function myhomeApiFetcher(serviceKey: string): PageFetcher {
  return async (pageNo, pageSize) => {
    const query = new URLSearchParams({
      serviceKey,
      pageNo: String(pageNo),
      numOfRows: String(pageSize),
    });
    const response = await fetch(`${ENDPOINT}?${query}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`마이홈 응답 HTTP ${response.status}`);
    return response.json();
  };
}

export type CollectedNotices = { notices: Notice[]; rawCount: number; skipped: number; duplicates: number };

/** FR-003 (spec 001): 모든 쪽을 받아 공고로 바꾼다. 응답 오류는 던진다(수집 오류, FR-004) */
export async function fetchAllMyhomeNotices(fetchPage: PageFetcher): Promise<CollectedNotices> {
  const notices: Notice[] = [];
  let skipped = 0;
  let totalCount = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= MAX_PAGES && (page - 1) * PAGE_SIZE < totalCount; page += 1) {
    const result: ParseResult = parseMyhomeResponse(await fetchPage(page, PAGE_SIZE));
    if (!result.ok) throw new Error(result.error);
    notices.push(...result.notices);
    skipped += result.skipped;
    totalCount = result.totalCount;
    if (result.notices.length + result.skipped === 0) break;
  }
  const unique = uniqueByExternalId(notices);
  return { notices: unique, rawCount: notices.length + skipped, skipped, duplicates: notices.length - unique.length };
}
