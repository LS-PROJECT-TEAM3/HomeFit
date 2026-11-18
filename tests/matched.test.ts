import { describe, expect, it } from "vitest";
import { describeChange, summarizeChange } from "@/incident/change-text";
import { listMatchedNotices, noticeComplexes } from "@/incident/matched";
import { makeCondition, makeNotice } from "./fixtures";

const today = "2026-11-17";
const condition = makeCondition({ sigunguCode: null });

// FR-005, FR-017 (spec 001 v0.2)
describe("listMatchedNotices", () => {
  it("sort: 마감 가까운 순, 마감 지난 공고는 맨 아래에 '마감'으로", () => {
    const notices = [
      makeNotice({ externalId: "A-1", announcementId: "A", applyEnd: "2026-12-01" }),
      makeNotice({ externalId: "B-1", announcementId: "B", applyEnd: "2026-11-25" }),
      makeNotice({ externalId: "C-1", announcementId: "C", applyEnd: "2026-11-10" }),
    ];
    const list = listMatchedNotices({ notices, condition, today });
    expect(list.map((m) => [m.notice.announcementId, m.expired])).toEqual([["B", false], ["A", false], ["C", true]]);
  });

  it("마감일 없는 공고는 열린 공고 끝에", () => {
    const notices = [makeNotice({ externalId: "N-1", announcementId: "N", applyEnd: null }), makeNotice({ externalId: "A-1", announcementId: "A", applyEnd: "2026-12-01" })];
    expect(listMatchedNotices({ notices, condition, today }).map((m) => m.notice.announcementId)).toEqual(["A", "N"]);
  });

  it("조건에 안 맞는 공고와 조건 없음은 빠진다", () => {
    const busan = makeNotice({ sidoCode: "26", sigunguCode: "26710" });
    expect(listMatchedNotices({ notices: [busan], condition, today })).toEqual([]);
    expect(listMatchedNotices({ notices: [makeNotice()], condition: null, today })).toEqual([]);
  });

  it("같은 공고의 단지 여럿은 한 줄", () => {
    const notices = [makeNotice({ externalId: "A-1", announcementId: "A" }), makeNotice({ externalId: "A-2", announcementId: "A" })];
    expect(listMatchedNotices({ notices, condition, today })).toHaveLength(1);
  });

  it("가짜 공고(SIM-)는 시뮬레이터로 표시", () => {
    const [item] = listMatchedNotices({ notices: [makeNotice({ externalId: "SIM-1-0", announcementId: "SIM-1" })], condition, today });
    expect(item.isSimulated).toBe(true);
  });
});

// FR-009 (spec 001 v0.2): 사건 상세 맨 위 "무엇이 바뀌었나"
describe("describeChange", () => {
  it("칸 변화는 전 → 후로", () => {
    expect(describeChange({ kind: "changed", changes: [{ field: "applyEnd", before: "2026-11-30", after: "2026-12-07" }], relatedAnnouncementId: null })).toEqual({
      lines: ["접수 마감 2026-11-30 → 2026-12-07"],
      note: null,
    });
  });

  it("임대료는 원 단위, 빈 값은 '없음'", () => {
    const text = describeChange({ kind: "changed", changes: [{ field: "monthlyRent", before: 250000, after: null }], relatedAnnouncementId: null });
    expect(text?.lines).toEqual(["월 임대료 250,000원 → 없음"]);
  });

  it("정정공고는 이전 공고와 공고문 확인 안내", () => {
    expect(describeChange({ kind: "correction", changes: [], relatedAnnouncementId: "21577" })).toEqual({
      lines: ["정정공고: 이전 공고 21577을 고친 공고입니다"],
      note: "바뀐 내용은 공고문에서 확인해 주세요.",
    });
  });

  it("완화 재공고", () => {
    expect(describeChange({ kind: "relaxed", changes: [], relatedAnnouncementId: null })?.lines).toEqual([
      "같은 단지에 자격 완화·추가 모집·재공고가 올라왔습니다",
    ]);
  });

  it("v0.1 사건(변화 정보 없음)은 아무것도 보이지 않는다", () => {
    expect(describeChange(undefined)).toBeNull();
  });
});

describe("describeChange 단지별", () => {
  it("단지 이름이 있으면 줄 앞에 붙인다", () => {
    const text = describeChange({ kind: "changed", changes: [{ field: "monthlyRent", before: 200000, after: 210000, complex: "가동" }], relatedAnnouncementId: null });
    expect(text?.lines).toEqual(["가동 월 임대료 200,000원 → 210,000원"]);
  });
});

// FR-008 수용 기준 3 (spec 001 v0.4, H-006): 사건 목록의 바뀐 내용 한 줄
describe("summarizeChange", () => {
  it("한 칸이면 그 줄", () => {
    expect(summarizeChange({ kind: "changed", changes: [{ field: "applyEnd", before: "2026-12-03", after: "2026-12-09" }], relatedAnnouncementId: null })).toBe("접수 마감 2026-12-03 → 2026-12-09");
  });

  it("여럿이면 첫 줄 외 N건", () => {
    const change = { kind: "changed" as const, relatedAnnouncementId: null, changes: [
      { field: "applyEnd" as const, before: "a", after: "b" }, { field: "monthlyRent" as const, before: 1, after: 2 }, { field: "supplyType" as const, before: "x", after: "y" },
    ] };
    expect(summarizeChange(change)).toBe("접수 마감 a → b 외 2건");
  });

  it("정정공고·완화는 짧게", () => {
    expect(summarizeChange({ kind: "correction", changes: [], relatedAnnouncementId: "21577" })).toBe("정정공고: 이전 공고 21577");
    expect(summarizeChange({ kind: "relaxed", changes: [], relatedAnnouncementId: null })).toBe("같은 단지 자격 완화·추가 모집·재공고");
  });

  it("이전 기준 사건", () => {
    expect(summarizeChange(undefined)).toBe("이전 기준: 처음 보인 공고");
  });
});

// FR-017 수용 기준 4 (spec 001 v0.4): 공고 상세의 단지별 요약
describe("noticeComplexes", () => {
  it("단지마다 이름·시군구·임대료, 같은 단지는 한 번", () => {
    const notices = [
      makeNotice({ externalId: "A-2", complexName: "나동", sigunguCode: "30230", monthlyRent: 300000 }),
      makeNotice({ externalId: "A-1", complexName: "가동", sigunguCode: "30200", monthlyRent: 200000 }),
      makeNotice({ externalId: "A-1", complexName: "가동", sigunguCode: "30200", monthlyRent: 200000 }),
    ];
    expect(noticeComplexes(notices)).toEqual([
      { externalId: "A-1", name: "가동", sigunguCode: "30200", monthlyRent: 200000 },
      { externalId: "A-2", name: "나동", sigunguCode: "30230", monthlyRent: 300000 },
    ]);
  });

  it("단지 이름이 없으면 '단지 정보 없음'", () => {
    expect(noticeComplexes([makeNotice({ complexName: null })])[0].name).toBe("단지 정보 없음");
  });
});

// FR-020 (spec 001 v0.5): 목록 표시와 순서
describe("listMatchedNotices 팔로우", () => {
  it("새 공고·팔로우는 마감 순, 관심 없음은 그 아래, 마감 지난 공고는 맨 아래", () => {
    const notices = [
      makeNotice({ externalId: "A-1", announcementId: "A", applyEnd: "2026-11-20" }),
      makeNotice({ externalId: "B-1", announcementId: "B", applyEnd: "2026-11-30" }),
      makeNotice({ externalId: "C-1", announcementId: "C", applyEnd: "2026-11-25" }),
      makeNotice({ externalId: "D-1", announcementId: "D", applyEnd: "2026-11-01" }),
    ];
    const decisions = new Map([["A", "ignore" as const], ["B", "follow" as const]]);
    const list = listMatchedNotices({ notices, condition, today, decisions });
    expect(list.map((m) => [m.notice.announcementId, m.decision])).toEqual([["C", "new"], ["B", "follow"], ["A", "ignore"], ["D", "new"]]);
  });
});
