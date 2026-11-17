import { describe, expect, it } from "vitest";
import { planChangeIncidents, type ConditionOwner } from "@/incident/detect";
import { changeDedupKey, type NoticeChange } from "@/incident/notice-change";
import { makeCondition, makeNotice } from "./fixtures";

const today = "2026-11-17";
const source = "myhome_notice";
const seoulUser: ConditionOwner = { userId: "user-a", condition: makeCondition({ sigunguCode: null }) };
const busanUser: ConditionOwner = {
  userId: "user-b",
  condition: makeCondition({ sidoCode: "26", sigunguCode: null }),
};

function changeOf(overrides = {}): NoticeChange {
  return {
    notice: makeNotice({ applyEnd: "2026-11-25", ...overrides }),
    kind: "changed",
    changes: [{ field: "applyEnd", before: "2026-11-22", after: "2026-11-25" }],
    relatedAnnouncementId: null,
  };
}

// FR-006, FR-016 (spec 001 v0.2): 공고 변화 × 조건 → 새로 만들 사건
// v0.1의 planNewIncidents(처음 보인 공고 → 사건) 시험을 v0.2 기준으로 바꿨다 (spec 001 v0.2 승인 2026-11-17)
describe("planChangeIncidents", () => {
  it("조건이 맞는 사용자에게만 사건을 만든다", () => {
    const planned = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser, busanUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned.map((p) => p.userId)).toEqual(["user-a"]);
  });

  it("같은 공고의 단지가 여럿이고 변화가 같으면 사용자마다 사건 하나", () => {
    const changes = [changeOf({ externalId: "A-1", announcementId: "A" }), changeOf({ externalId: "A-2", announcementId: "A", sigunguCode: "11440" })];
    const planned = planChangeIncidents({ changes, owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned).toHaveLength(1);
    expect(planned[0].dedupKey).toBe(changeDedupKey(source, changes[0]));
  });

  it("이미 있는 사건은 다시 만들지 않는다(같은 변화 재수집)", () => {
    const change = changeOf();
    const key = `user-a|${changeDedupKey(source, change)}`;
    const planned = planChangeIncidents({ changes: [change], owners: [seoulUser], existingKeys: new Set([key]), today, sourceCode: source });
    expect(planned).toEqual([]);
  });

  it("변화가 없으면 아무것도 만들지 않는다", () => {
    expect(planChangeIncidents({ changes: [], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source })).toEqual([]);
  });

  it("사건 facts에 원문 값과 변화(종류, 전 → 후)를 담는다", () => {
    const [planned] = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source });
    expect(planned.facts).toMatchObject({
      title: "가짜 행복주택 입주자 모집",
      applyEnd: "2026-11-25",
      change: { kind: "changed", changes: [{ field: "applyEnd", before: "2026-11-22", after: "2026-11-25" }] },
    });
  });
});
