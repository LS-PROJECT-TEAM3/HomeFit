import { describe, expect, it } from "vitest";
import { listMatchedPolicies, matchesPolicyTargets, policyKinds, policyTargetCounts } from "@/incident/policy-match";
import type { Policy } from "@/watch/youth-policy";

// spec 006 FR-003, 경계 E1·E3·E4·E5
const base: Policy = {
  externalId: "A", announcementId: "A", title: "A", sidoCode: "41", sigunguCode: "41390", supplyType: null, monthlyRent: null,
  announcedOn: null, applyStart: "2026-11-01", applyEnd: "2026-11-30", url: null, complexName: null, statusName: null, beforeAnnouncementId: null,
  minAge: 19, maxAge: 39, regionCodes: ["41390"], agency: null, support: null, description: null, periodKind: "period", keywords: [],
};
const condition = { sidoCode: "41", sigunguCode: "41390", age: 27 };
const today = "2026-11-18";
const ids = (list: { policy: Policy }[]) => list.map((m) => m.policy.externalId);

describe("listMatchedPolicies", () => {
  it("E5: 조건이 없으면 빈 목록", () => {
    expect(listMatchedPolicies({ policies: [base], condition: null, today })).toEqual([]);
  });
  it("지역: 내 시군구가 목록에 있거나, 내 시군구가 없으면 시도가 같을 때, E4 목록이 비면 전국", () => {
    const other = { ...base, externalId: "B", title: "B", regionCodes: ["11110"] };
    const nation = { ...base, externalId: "C", title: "C", regionCodes: [] };
    const sameSido = { ...base, externalId: "D", title: "D", regionCodes: ["41110"] };
    expect(ids(listMatchedPolicies({ policies: [base, other, nation, sameSido], condition, today }))).toEqual(["A", "C"]);
    expect(ids(listMatchedPolicies({ policies: [base, other, nation, sameSido], condition: { ...condition, sigunguCode: null }, today }))).toEqual(["A", "C", "D"]);
  });
  it("나이: 범위 밖이면 뺀다. E3 나이 없음이나 내 나이 없음은 거르지 않는다", () => {
    const old = { ...base, externalId: "B", title: "B", minAge: 30, maxAge: 39 };
    const noAge = { ...base, externalId: "C", title: "C", minAge: null, maxAge: null };
    expect(ids(listMatchedPolicies({ policies: [base, old, noAge], condition, today }))).toEqual(["A", "C"]);
    expect(ids(listMatchedPolicies({ policies: [base, old], condition: { ...condition, age: null }, today }))).toEqual(["A", "B"]);
  });
  it("끝난 정책은 빼고, 마감 가까운 순 → 상시 → 기간 공고문 확인 순", () => {
    const ended = { ...base, externalId: "E", title: "E", applyEnd: "2026-11-17" };
    const later = { ...base, externalId: "L", title: "L", applyEnd: "2026-12-31" };
    const always = { ...base, externalId: "S", title: "S", applyStart: null, applyEnd: null, periodKind: "always" as const };
    const unknown = { ...base, externalId: "U", title: "U", applyStart: null, applyEnd: null, periodKind: "unknown" as const };
    const endsToday = { ...base, externalId: "T", title: "T", applyEnd: today };
    expect(ids(listMatchedPolicies({ policies: [unknown, always, later, ended, base, endsToday], condition, today }))).toEqual(["T", "A", "L", "S", "U"]);
  });
});

// 사용자 요청(2026-11-18): 같은 정책이 두 번 뜸 → 같은 이름은 한 줄. 종류 거르기(주거·대출 등)
describe("listMatchedPolicies 같은 이름 묶기", () => {
  it("이름(띄어쓰기 무시)이 같으면 한 줄, 내 시군구용이 전국용보다 먼저, 묶인 수를 센다", () => {
    const national = { ...base, externalId: "N", title: "청년월세 지원", regionCodes: [] as string[], applyEnd: "2026-12-31" };
    const mine = { ...base, externalId: "M", title: "청년 월세 지원", regionCodes: ["41390"], applyEnd: "2026-11-30" };
    const result = listMatchedPolicies({ policies: [national, mine], condition, today });
    expect(result.map((m) => [m.policy.externalId, m.sameName])).toEqual([["M", 2]]);
  });
  it("지역 조건이 같으면 마감이 늦은 것", () => {
    const a = { ...base, externalId: "A", applyEnd: "2026-11-20" };
    const b = { ...base, externalId: "B", applyEnd: "2026-12-20" };
    expect(listMatchedPolicies({ policies: [a, b], condition, today }).map((m) => m.policy.externalId)).toEqual(["B"]);
  });
});

describe("policyKinds와 종류 거르기", () => {
  it("중분류와 낱말로 종류를 읽는다(하나가 여러 종류일 수 있다)", () => {
    expect(policyKinds({ ...base, supplyType: "전월세 및 주거급여 지원", title: "청년 전세자금 대출 이자지원", keywords: [] })).toEqual(["loan", "rent"]);
    expect(policyKinds({ ...base, supplyType: "주택 및 거주지", title: "행복주택", keywords: [] })).toEqual(["housing"]);
    expect(policyKinds({ ...base, supplyType: "기숙사", title: "연합기숙사", keywords: ["대출"] })).toEqual(["loan", "dormitory"]);
  });
  it("kind를 주면 그 종류만", () => {
    const loan = { ...base, externalId: "L", title: "보증금 이자지원", supplyType: "전월세 및 주거급여 지원" };
    const house = { ...base, externalId: "H", title: "행복주택", supplyType: "주택 및 거주지" };
    expect(listMatchedPolicies({ policies: [loan, house], condition, today, kind: "loan" }).map((m) => m.policy.externalId)).toEqual(["L"]);
  });
});

// spec 022(캔버스 v2-s3b-filter-pc): 정책 탭 대상 칩. 제목·키워드·추가 자격에 대상 낱말이 있으면 맞음(자격 판정이 아님)
describe("matchesPolicyTargets·policyTargetCounts", () => {
  const base = { externalId: "P", title: "청년 월세 지원", keywords: [], extraQualification: null } as unknown as Policy;
  const newly = { ...base, externalId: "Q", title: "신혼부부 전세 대출" } as Policy;
  it("대상을 고르지 않으면 모두 맞음", () => {
    expect(matchesPolicyTargets(base, [])).toBe(true);
    expect(matchesPolicyTargets(newly, ["youth"])).toBe(false);
    expect(matchesPolicyTargets(newly, ["newlywed"])).toBe(true);
  });
  it("대상마다 정책 수", () => {
    expect(policyTargetCounts([base, newly])).toEqual({ youth: 1, newlywed: 1, multichild: 0, elderly: 0 });
  });
});
