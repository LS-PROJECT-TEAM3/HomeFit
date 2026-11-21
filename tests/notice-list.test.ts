import { describe, expect, it } from "vitest";
import type { PolicyCondition } from "@/incident/match";
import type { MatchedNotice } from "@/incident/matched";
import { applyOverride, conditionChips, daysLeft, groupCounts, noticeGroup, sortNotices, supplyTypeCounts } from "@/incident/notice-list";
import type { Notice } from "@/watch/notice";

// spec 022(캔버스 v2-s3-*): 맞춤 공고 목록의 내 조건 칩·잠깐 좁히기·상태 묶음·마감 임박
const saved: PolicyCondition = { sidoCode: "11", sigunguCode: "11620", supplyTypes: ["행복주택", "매입임대"], maxMonthlyRent: 500000, age: 27, targetGroups: [] };

function notice(id: string, extra: Partial<Notice> = {}): Notice {
  return {
    externalId: `${id}-1`, announcementId: id, title: `공고 ${id}`, sidoCode: "11", sigunguCode: "11620", supplyType: "행복주택",
    monthlyRent: 300000, announcedOn: "2026-11-01", applyStart: "2026-11-01", applyEnd: "2026-11-30", url: null, complexName: null, statusName: null, beforeAnnouncementId: null, ...extra,
  };
}
const item = (n: Notice, decision: MatchedNotice["decision"], expired = false): MatchedNotice => ({ notice: n, decision, expired, isSimulated: false });

describe("applyOverride", () => {
  it("주소 값으로 바꾼 칸만 덮어쓴다", () => {
    expect(applyOverride(saved, { types: "국민임대,행복주택", rent: "" })).toMatchObject({ supplyTypes: ["국민임대", "행복주택"], maxMonthlyRent: null, sigunguCode: "11620", age: 27 });
  });
  it("시도를 바꾸면 저장된 시군구는 비운다", () => {
    expect(applyOverride(saved, { sido: "26" })).toMatchObject({ sidoCode: "26", sigunguCode: null });
  });
  it("값이 틀리면 저장된 조건 그대로", () => {
    expect(applyOverride(saved, { age: "abc" })).toEqual(saved);
    expect(applyOverride(saved, { sido: "99" })).toEqual(saved);
  });
});

describe("supplyTypeCounts", () => {
  it("공급 유형 조건만 빼고 맞는 공고를 유형마다 센다(같은 공고는 한 번)", () => {
    const notices = [notice("A"), notice("A", { externalId: "A-2" }), notice("B", { supplyType: "국민임대" }), notice("C", { sidoCode: "26", sigunguCode: "26110" })];
    expect(supplyTypeCounts(notices, saved)).toEqual({ 행복주택: 1, 국민임대: 1 });
  });
});

describe("noticeGroup·groupCounts", () => {
  const items = [item(notice("A"), "new"), item(notice("B"), "follow"), item(notice("C"), "ignore"), item(notice("D"), "follow", true)];
  it("마감 지난 공고는 결정과 상관없이 마감", () => {
    expect(items.map(noticeGroup)).toEqual(["new", "follow", "ignore", "closed"]);
    expect(groupCounts(items)).toEqual({ all: 4, new: 1, follow: 1, ignore: 1, closed: 1 });
  });
});

describe("daysLeft", () => {
  it("남은 날, 없으면 null", () => {
    expect(daysLeft("2026-11-25", "2026-11-22")).toBe(3);
    expect(daysLeft(null, "2026-11-22")).toBeNull();
  });
});

describe("sortNotices", () => {
  it("최근 공고 순은 공고일이 늦은 것부터, 마감 순은 들어온 순서 그대로", () => {
    const rows = [{ id: "A", announcedOn: "2026-11-01" }, { id: "B", announcedOn: "2026-11-10" }, { id: "C", announcedOn: null }];
    expect(sortNotices(rows, "recent").map((r) => r.id)).toEqual(["B", "A", "C"]);
    expect(sortNotices(rows, "deadline").map((r) => r.id)).toEqual(["A", "B", "C"]);
  });
});

describe("conditionChips", () => {
  it("칩 글자", () => {
    expect(conditionChips(saved, "서울특별시 관악구")).toEqual({ region: "서울특별시 관악구", types: "행복주택 외 1", rent: "50만원 이하", age: "만 27세" });
    expect(conditionChips({ ...saved, supplyTypes: ["ALL"], maxMonthlyRent: null, age: null }, "서울특별시")).toMatchObject({ types: "전체", rent: "제한 없음", age: "입력 안 함" });
  });
});
