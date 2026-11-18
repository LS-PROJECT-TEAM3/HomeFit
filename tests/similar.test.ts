import { describe, expect, it } from "vitest";
import type { ClosedIncidentRow } from "@/knowledge/history";
import { findSimilarIncidents, SIMILAR_LIMIT } from "@/knowledge/similar";

// spec 010 FR-002 (PRD FR-18): 알림 상세의 비슷한 지난 알림. 같은 종류만, 자기 자신 빼고, 낱말이 많이 겹치는 순 최대 3건
function row(over: Partial<ClosedIncidentRow> & { id: string }): ClosedIncidentRow {
  return { status: "approved", incidentType: "rent_price_change", title: "알림", closedAt: "2026-11-01T00:00:00Z", reason: null, todo: [], ...over };
}

const CURRENT = { id: "now", incidentType: "rent_price_change", title: "내 집 주변 오피스텔 월세 시세가 내 계약보다 12% 높습니다" };

describe("findSimilarIncidents", () => {
  it("같은 종류만 고르고 다른 종류는 뺀다", () => {
    const closed = [row({ id: "a", title: "내 집 주변 오피스텔 월세 시세가 내 계약보다 10% 높습니다" }), row({ id: "b", incidentType: "humidity_condensation", title: "내 집 결로 위험" })];
    expect(findSimilarIncidents({ current: CURRENT, closed }).map((s) => s.id)).toEqual(["a"]);
  });
  it("지금 보고 있는 알림은 빼서, 자기 자신만 끝났으면 0건이다 (E8)", () => {
    expect(findSimilarIncidents({ current: CURRENT, closed: [row({ id: "now", title: CURRENT.title })] })).toEqual([]);
  });
  it("끝난 알림이 없으면 빈 목록이다 (E8)", () => {
    expect(findSimilarIncidents({ current: CURRENT, closed: [] })).toEqual([]);
  });
  it("승인·거절로 끝난 것만 고른다", () => {
    const closed = [row({ id: "a", status: "pending", title: "오피스텔 월세 시세" }), row({ id: "b", status: "rejected", reason: "이사 계획 없음", title: "오피스텔 월세 시세" })];
    expect(findSimilarIncidents({ current: CURRENT, closed }).map((s) => s.id)).toEqual(["b"]);
  });
  it("낱말이 많이 겹치는 순, 같으면 최근에 끝낸 순으로 최대 3건", () => {
    const closed = [
      row({ id: "old-same", title: "내 집 주변 오피스텔 월세 시세가 내 계약보다 15% 높습니다", closedAt: "2026-09-01T00:00:00Z" }),
      row({ id: "few", title: "관심 지역 아파트 보증금 시세가 지난번보다 11% 내렸습니다", closedAt: "2026-11-10T00:00:00Z" }),
      row({ id: "new-same", title: "내 집 주변 오피스텔 월세 시세가 내 계약보다 11% 높습니다", closedAt: "2026-10-01T00:00:00Z" }),
      row({ id: "mid", title: "내 집 주변 아파트 월세 시세가 내 계약보다 10% 낮습니다", closedAt: "2026-11-15T00:00:00Z" }),
    ];
    const ids = findSimilarIncidents({ current: CURRENT, closed }).map((s) => s.id);
    expect(ids).toHaveLength(SIMILAR_LIMIT);
    expect(ids).toEqual(["new-same", "old-same", "mid"]);
  });
  it("PR #11 리뷰: 제목 낱말이 하나도 겹치지 않으면 같은 종류여도 보이지 않는다", () => {
    const closed = [row({ id: "x", title: "관심 지역 전세 보증금 하락" }), row({ id: "y", title: "알림" })];
    expect(findSimilarIncidents({ current: CURRENT, closed })).toEqual([]);
  });
  it("줄마다 처리 결과·사유·처리한 날(한국 날짜)·링크를 준다", () => {
    const [hit] = findSimilarIncidents({ current: CURRENT, closed: [row({ id: "b", status: "rejected", reason: "이사 계획 없음", title: "월세 시세", closedAt: "2026-11-17T16:00:00Z" })] });
    expect(hit).toEqual({ id: "b", title: "월세 시세", result: "거절함 (사유: 이사 계획 없음)", closedOn: "2026-11-18", href: "/incidents/b" });
  });
});
