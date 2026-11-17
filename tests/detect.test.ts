import { describe, expect, it } from "vitest";
import { planNewIncidents, type ConditionOwner } from "@/incident/detect";
import { housingSupportDedupKey } from "@/incident/dedup";
import { makeCondition, makeNotice } from "./fixtures";

const today = "2026-11-17";
const source = "myhome_notice";
const seoulUser: ConditionOwner = { userId: "user-a", condition: makeCondition({ sigunguCode: null }) };
const busanUser: ConditionOwner = {
  userId: "user-b",
  condition: makeCondition({ sidoCode: "26", sigunguCode: null }),
};

// FR-005, FR-006 (spec 001): 공고 × 조건 → 새로 만들 사건
describe("planNewIncidents", () => {
  it("조건이 맞는 사용자에게만 사건을 만든다", () => {
    const planned = planNewIncidents({ notices: [makeNotice()], owners: [seoulUser, busanUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned.map((p) => p.userId)).toEqual(["user-a"]);
  });

  it("같은 공고의 단지가 여럿이어도 사용자마다 사건 하나", () => {
    const notices = [
      makeNotice({ externalId: "A-1", announcementId: "A" }),
      makeNotice({ externalId: "A-2", announcementId: "A", sigunguCode: "11440" }),
    ];
    const planned = planNewIncidents({ notices, owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned).toHaveLength(1);
    expect(planned[0].dedupKey).toBe(housingSupportDedupKey(source, "A"));
  });

  it("이미 있는 사건은 다시 만들지 않는다(재수집)", () => {
    const key = `user-a|${housingSupportDedupKey(source, "TEST-0001")}`;
    const planned = planNewIncidents({ notices: [makeNotice()], owners: [seoulUser], existingKeys: new Set([key]), today, sourceCode: source });
    expect(planned).toEqual([]);
  });

  it("조건을 넣은 사용자가 없으면 아무것도 만들지 않는다", () => {
    expect(planNewIncidents({ notices: [makeNotice()], owners: [], existingKeys: new Set(), today, sourceCode: source })).toEqual([]);
  });

  it("사건마다 화면에 보일 원문 값(facts)을 담는다", () => {
    const [planned] = planNewIncidents({ notices: [makeNotice()], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned.facts).toMatchObject({
      title: "가짜 행복주택 입주자 모집",
      announcementId: "TEST-0001",
      applyEnd: "2026-11-22",
      url: "https://example.test/notice/0001",
    });
  });
});
