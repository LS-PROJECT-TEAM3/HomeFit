import { describe, expect, it } from "vitest";
import { matchesCondition } from "@/incident/match";
import { makeCondition, makeNotice } from "./fixtures";

const today = "2026-11-17";

// FR-005 (spec 001), spec 3절 경계·예외, Q15 가정
describe("matchesCondition", () => {
  it("시군구가 같으면 맞는다", () => {
    expect(matchesCondition(makeNotice(), makeCondition(), today)).toBe(true);
  });

  it("시도가 다르면 맞지 않는다", () => {
    const busan = makeNotice({ sidoCode: "26", sigunguCode: "26110" });
    expect(matchesCondition(busan, makeCondition(), today)).toBe(false);
  });

  it("같은 시도의 다른 시군구는 맞지 않는다", () => {
    const mapo = makeNotice({ sigunguCode: "11440" });
    expect(matchesCondition(mapo, makeCondition(), today)).toBe(false);
  });

  it("Q15 가정: 조건의 시군구가 비면 같은 시도 공고는 모두 맞는다", () => {
    const mapo = makeNotice({ sigunguCode: "11440" });
    expect(matchesCondition(mapo, makeCondition({ sigunguCode: null }), today)).toBe(true);
  });

  it("Q15 가정: 공고에 시군구가 없으면(시도 전체 공고) 시도만 비교한다", () => {
    const whole = makeNotice({ sigunguCode: null });
    expect(matchesCondition(whole, makeCondition(), today)).toBe(true);
  });

  it("임대료 상한 경계: 상한과 같으면 맞고 1원 넘으면 맞지 않는다", () => {
    const condition = makeCondition({ maxMonthlyRent: 300000 });
    expect(matchesCondition(makeNotice({ monthlyRent: 300000 }), condition, today)).toBe(true);
    expect(matchesCondition(makeNotice({ monthlyRent: 300001 }), condition, today)).toBe(false);
  });

  it("상한 0이면 0원 공고만 맞는다", () => {
    const condition = makeCondition({ maxMonthlyRent: 0 });
    expect(matchesCondition(makeNotice({ monthlyRent: 0 }), condition, today)).toBe(true);
    expect(matchesCondition(makeNotice({ monthlyRent: 1 }), condition, today)).toBe(false);
  });

  it("상한이 비면 임대료로 거르지 않는다", () => {
    const condition = makeCondition({ maxMonthlyRent: null });
    expect(matchesCondition(makeNotice({ monthlyRent: 9_000_000 }), condition, today)).toBe(true);
  });

  it("Q15 가정: 공고에 임대료가 없으면 상한이 있어도 맞는 것으로 본다(공고문 확인 안내)", () => {
    expect(matchesCondition(makeNotice({ monthlyRent: null }), makeCondition(), today)).toBe(true);
  });

  it("공급 유형 '모두'는 어떤 유형이든 맞는다", () => {
    const notice = makeNotice({ supplyType: "국민임대" });
    expect(matchesCondition(notice, makeCondition({ supplyTypes: ["ALL"] }), today)).toBe(true);
  });

  it("고른 공급 유형에 없으면 맞지 않는다", () => {
    const notice = makeNotice({ supplyType: "국민임대" });
    const condition = makeCondition({ supplyTypes: ["행복주택"] });
    expect(matchesCondition(notice, condition, today)).toBe(false);
  });

  it("조건이 없으면 맞지 않는다", () => {
    expect(matchesCondition(makeNotice(), null, today)).toBe(false);
  });

  it("이미 마감된 공고는 맞지 않는다(사건을 만들지 않는다)", () => {
    expect(matchesCondition(makeNotice({ applyEnd: "2026-11-16" }), makeCondition(), today)).toBe(false);
  });

  it("오늘 마감인 공고는 맞는다", () => {
    expect(matchesCondition(makeNotice({ applyEnd: today }), makeCondition(), today)).toBe(true);
  });

  it("마감일이 없는 공고는 마감으로 거르지 않는다", () => {
    expect(matchesCondition(makeNotice({ applyEnd: null }), makeCondition(), today)).toBe(true);
  });
});
