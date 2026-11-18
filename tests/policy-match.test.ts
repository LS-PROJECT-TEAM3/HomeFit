import { describe, expect, it } from "vitest";
import { listMatchedPolicies } from "@/incident/policy-match";
import type { Policy } from "@/watch/youth-policy";

// spec 006 FR-003, 경계 E1·E3·E4·E5
const base: Policy = {
  externalId: "A", announcementId: "A", title: "가", sidoCode: "41", sigunguCode: "41390", supplyType: null, monthlyRent: null,
  announcedOn: null, applyStart: "2026-11-01", applyEnd: "2026-11-30", url: null, complexName: null, statusName: null, beforeAnnouncementId: null,
  minAge: 19, maxAge: 39, regionCodes: ["41390"], agency: null, support: null, description: null, periodKind: "period",
};
const condition = { sidoCode: "41", sigunguCode: "41390", age: 27 };
const today = "2026-11-18";
const ids = (list: { policy: Policy }[]) => list.map((m) => m.policy.externalId);

describe("listMatchedPolicies", () => {
  it("E5: 조건이 없으면 빈 목록", () => {
    expect(listMatchedPolicies({ policies: [base], condition: null, today })).toEqual([]);
  });
  it("지역: 내 시군구가 목록에 있거나, 내 시군구가 없으면 시도가 같을 때, E4 목록이 비면 전국", () => {
    const other = { ...base, externalId: "B", regionCodes: ["11110"] };
    const nation = { ...base, externalId: "C", regionCodes: [] };
    const sameSido = { ...base, externalId: "D", regionCodes: ["41110"] };
    expect(ids(listMatchedPolicies({ policies: [base, other, nation, sameSido], condition, today }))).toEqual(["A", "C"]);
    expect(ids(listMatchedPolicies({ policies: [base, other, nation, sameSido], condition: { ...condition, sigunguCode: null }, today }))).toEqual(["A", "C", "D"]);
  });
  it("나이: 범위 밖이면 뺀다. E3 나이 없음이나 내 나이 없음은 거르지 않는다", () => {
    const old = { ...base, externalId: "B", minAge: 30, maxAge: 39 };
    const noAge = { ...base, externalId: "C", minAge: null, maxAge: null };
    expect(ids(listMatchedPolicies({ policies: [base, old, noAge], condition, today }))).toEqual(["A", "C"]);
    expect(ids(listMatchedPolicies({ policies: [base, old], condition: { ...condition, age: null }, today }))).toEqual(["A", "B"]);
  });
  it("끝난 정책은 빼고, 마감 가까운 순 → 상시 → 기간 공고문 확인 순", () => {
    const ended = { ...base, externalId: "E", applyEnd: "2026-11-17" };
    const later = { ...base, externalId: "L", applyEnd: "2026-12-31" };
    const always = { ...base, externalId: "S", applyStart: null, applyEnd: null, periodKind: "always" as const };
    const unknown = { ...base, externalId: "U", applyStart: null, applyEnd: null, periodKind: "unknown" as const };
    const endsToday = { ...base, externalId: "T", applyEnd: today };
    expect(ids(listMatchedPolicies({ policies: [unknown, always, later, ended, base, endsToday], condition, today }))).toEqual(["T", "A", "L", "S", "U"]);
  });
});
