import sample from "@/watch/fixtures/myhome-sample.json";
import type { MyhomeItem } from "@/watch/myhome";
import type { PageFetcher } from "@/watch/myhome.server";

/**
 * 가짜 응답 묶음 (plan 001 4단계, QA C-015~C-021). 실제 공고와 섞이지 않게 공고 ID 앞에 SIM-을 붙인다.
 * - sample: 실제 응답 3건
 * - changed: sample과 같은데 마감일이 하루 늦음 (FR-006 "바뀜")
 * - malformed: 한 건의 공고 ID가 비어 있음 (spec 3절 형식 다름)
 * - failure: 연결 실패. 오류에 가짜 키가 섞여 가려지는지 본다 (FR-004)
 * - bulk: 부산 공고 300건 (spec 3절 대량)
 */
export const FIXTURE_NAMES = ["sample", "changed", "malformed", "failure", "bulk"] as const;
export type FixtureName = (typeof FIXTURE_NAMES)[number];

const baseItems: MyhomeItem[] = sample.response.body.item.map((item) => ({ ...item, pblancId: `SIM-${item.pblancId}` }));

function shiftDate(yyyymmdd: string | undefined, days: number): string {
  if (!yyyymmdd) return "";
  const date = new Date(Date.UTC(+yyyymmdd.slice(0, 4), +yyyymmdd.slice(4, 6) - 1, +yyyymmdd.slice(6, 8) + days));
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function itemsFor(name: Exclude<FixtureName, "failure">): MyhomeItem[] {
  if (name === "changed") return baseItems.map((item) => ({ ...item, endDe: shiftDate(item.endDe, 1) }));
  if (name === "malformed") return baseItems.map((item, i) => (i === 0 ? { ...item, pblancId: "" } : item));
  if (name === "bulk") {
    // 부산 공고로 만든다: 속도만 보려는 묶음이라 시험 계정(서울 조건)에 사건 300개가 생기지 않게 한다
    const template = baseItems[0];
    return Array.from({ length: 300 }, (_, i) => ({ ...template, pblancId: `SIM-BULK-${i + 1}`, houseSn: 0 }));
  }
  return baseItems;
}

function page(items: MyhomeItem[], pageNo: number, pageSize: number) {
  return {
    response: {
      header: { resultCode: "00", resultMsg: "NORMAL SERVICE" },
      body: { totalCount: items.length, item: items.slice((pageNo - 1) * pageSize, pageNo * pageSize) },
    },
  };
}

export function isFixtureName(value: string): value is FixtureName {
  return (FIXTURE_NAMES as readonly string[]).includes(value);
}

export function fixtureFetcher(name: FixtureName): PageFetcher {
  return async (pageNo, pageSize) => {
    if (name === "failure") {
      throw new Error("fetch failed: https://apis.data.go.kr/x?serviceKey=FAKE-KEY-123456&pageNo=1");
    }
    return page(itemsFor(name), pageNo, pageSize);
  };
}
