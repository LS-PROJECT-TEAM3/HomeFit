import { parseYouthPolicyResponse, type Policy } from "@/watch/youth-policy";

const ENDPOINT = "https://www.youthcenter.go.kr/go/ythip/getPlcy";
const PAGE_SIZE = 100;
// 응답이 이상해 끝없이 넘기는 것을 막는다. 2026-11-18 주거 424건 = 5쪽
const MAX_PAGES = 20;

/** 한 쪽을 받아 오는 함수. 시험·시뮬레이터가 같은 모양으로 갈아 끼울 수 있다 */
export type PolicyPageFetcher = (pageNum: number, pageSize: number) => Promise<unknown>;

export function youthPolicyApiFetcher(apiKey: string): PolicyPageFetcher {
  return async (pageNum, pageSize) => {
    // spec 006 FR-001: 대분류 "주거"만 (PRD FR-07 "주거 정책")
    const query = new URLSearchParams({ apiKeyNm: apiKey, pageNum: String(pageNum), pageSize: String(pageSize), rtnType: "json", lclsfNm: "주거" });
    const response = await fetch(`${ENDPOINT}?${query}`, { cache: "no-store" });
    const body = await response.text();
    try {
      // 키가 틀리면 403과 함께 {errorCode, errorMsg} JSON이 온다(2026-11-18 확인). 해석은 parseYouthPolicyResponse가 한다
      return JSON.parse(body);
    } catch {
      throw new Error(`온통청년 응답 HTTP ${response.status}, JSON이 아닙니다`);
    }
  };
}

export type CollectedPolicies = { policies: Policy[]; rawCount: number; skipped: number; duplicates: number };

/** spec 006 FR-001·002: 모든 쪽을 받아 정책으로. 응답 오류는 던진다(수집 오류) */
export async function fetchAllYouthPolicies(fetchPage: PolicyPageFetcher): Promise<CollectedPolicies> {
  const policies: Policy[] = [];
  let skipped = 0;
  let totalCount = Number.POSITIVE_INFINITY;
  for (let page = 1; page <= MAX_PAGES && (page - 1) * PAGE_SIZE < totalCount; page += 1) {
    const result = parseYouthPolicyResponse(await fetchPage(page, PAGE_SIZE));
    if (!result.ok) throw new Error(result.error);
    policies.push(...result.policies);
    skipped += result.skipped;
    totalCount = result.totalCount;
    if (result.policies.length + result.skipped === 0) break;
  }
  // E7: 같은 정책 ID는 한 건만(마지막 것)
  const unique = [...new Map(policies.map((p) => [p.externalId, p])).values()];
  return { policies: unique, rawCount: policies.length + skipped, skipped, duplicates: policies.length - unique.length };
}
