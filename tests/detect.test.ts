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

// v0.5 전 시험은 모든 공고를 팔로우한 상태로 돌린다
const FOLLOW_ALL = { has: () => true, get: () => ({ announcements: { has: () => true }, complexKeys: { has: () => true } }) } as never;

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
    const planned = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser, busanUser], existingKeys: new Set(), today, sourceCode: source, follows: FOLLOW_ALL });
    expect(planned.map((p) => p.userId)).toEqual(["user-a"]);
  });

  it("같은 공고의 단지가 여럿이고 변화가 같으면 사용자마다 사건 하나", () => {
    const changes = [changeOf({ externalId: "A-1", announcementId: "A" }), changeOf({ externalId: "A-2", announcementId: "A", sigunguCode: "11440" })];
    const planned = planChangeIncidents({ changes, owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: FOLLOW_ALL });
    expect(planned).toHaveLength(1);
    expect(planned[0].dedupKey).toBe(changeDedupKey(source, changes[0]));
  });

  it("이미 있는 사건은 다시 만들지 않는다(같은 변화 재수집)", () => {
    const change = changeOf();
    const key = `user-a|${changeDedupKey(source, change)}`;
    const planned = planChangeIncidents({ changes: [change], owners: [seoulUser], existingKeys: new Set([key]), today, sourceCode: source, follows: FOLLOW_ALL });
    expect(planned).toEqual([]);
  });

  it("변화가 없으면 아무것도 만들지 않는다", () => {
    expect(planChangeIncidents({ changes: [], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: FOLLOW_ALL })).toEqual([]);
  });

  it("사건 facts에 원문 값과 변화(종류, 전 → 후)를 담는다", () => {
    const [planned] = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: FOLLOW_ALL });
    expect(planned.facts).toMatchObject({
      title: "가짜 행복주택 입주자 모집",
      applyEnd: "2026-11-25",
      change: { kind: "changed", changes: [{ field: "applyEnd", before: "2026-11-22", after: "2026-11-25" }] },
    });
  });
});

// 12단계 리뷰 2번: 합치기는 사람마다 맞는 단지만 고른 뒤에
describe("planChangeIncidents 단지 합치기", () => {
  it("공고의 두 번째 단지만 내 시군구여도 사건이 생기고, 단지 여럿 변화는 사건 하나", () => {
    const daedeok: ConditionOwner = { userId: "user-d", condition: makeCondition({ sidoCode: "30", sigunguCode: "30230" }) };
    const changes = [
      changeOf({ externalId: "A-1", announcementId: "A", sidoCode: "30", sigunguCode: "30200", complexName: "유성" }),
      changeOf({ externalId: "A-2", announcementId: "A", sidoCode: "30", sigunguCode: "30230", complexName: "대덕" }),
      changeOf({ externalId: "A-3", announcementId: "A", sidoCode: "30", sigunguCode: "30230", complexName: "대덕2" }),
    ];
    const planned = planChangeIncidents({ changes, owners: [daedeok], existingKeys: new Set(), today, sourceCode: source, follows: FOLLOW_ALL });
    expect(planned).toHaveLength(1);
    expect(planned[0].externalId).toBe("A-2");
  });
});

// FR-006·FR-016·FR-020 (spec 001 v0.5): 팔로우한 공고의 변화만 사건
describe("planChangeIncidents 팔로우", () => {
  const follow = (announcements: string[], complexKeys: string[] = []) =>
    new Map([["user-a", { announcements: new Set(announcements), complexKeys: new Set(complexKeys) }]]);

  it("팔로우하지 않은 공고의 변화는 사건이 아니다", () => {
    const planned = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: follow([]) });
    expect(planned).toEqual([]);
  });

  it("팔로우한 공고의 변화는 사건", () => {
    const planned = planChangeIncidents({ changes: [changeOf()], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: follow(["TEST-0001"]) });
    expect(planned).toHaveLength(1);
  });

  it("정정공고는 고치기 전 공고를 팔로우했으면 사건", () => {
    const correction: NoticeChange = { notice: makeNotice({ externalId: "NEW-1", announcementId: "NEW" }), kind: "correction", changes: [], relatedAnnouncementId: "OLD" };
    expect(planChangeIncidents({ changes: [correction], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: follow(["OLD"]) })).toHaveLength(1);
    expect(planChangeIncidents({ changes: [correction], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: follow([]) })).toEqual([]);
  });

  it("완화 재공고는 같은 단지를 팔로우했으면 사건", () => {
    const relaxed: NoticeChange = { notice: makeNotice({ externalId: "R-1", announcementId: "R" }), kind: "relaxed", changes: [], relatedAnnouncementId: null };
    expect(planChangeIncidents({ changes: [relaxed], owners: [seoulUser], existingKeys: new Set(), today, sourceCode: source, follows: follow([], ["11680:가짜단지1"]) })).toHaveLength(1);
  });
});
