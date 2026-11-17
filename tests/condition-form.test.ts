import { describe, expect, it } from "vitest";
import { parseConditionForm } from "@/incident/condition-form";

// FR-002 (spec 001): 조건 입력 검사. 오류 문구는 "무엇이 안 됐는지 + 할 일" (.claude/rules/code.md 오류 처리)
const valid = { sidoCode: "11", sigunguCode: "", supplyTypes: ["ALL"], maxMonthlyRent: "", age: "", targetGroups: [] as string[] };

describe("parseConditionForm", () => {
  it("시도만 고르면 저장할 값이 된다. 공급 유형은 '모두'", () => {
    expect(parseConditionForm({ ...valid, supplyTypes: [] })).toEqual({
      ok: true,
      value: { sidoCode: "11", sigunguCode: null, supplyTypes: ["ALL"], maxMonthlyRent: null, age: null, targetGroups: [] },
    });
  });

  it("숫자 칸은 쉼표와 공백을 빼고 읽는다", () => {
    const result = parseConditionForm({ ...valid, maxMonthlyRent: " 300,000 ", age: "26" });
    expect(result.ok && result.value.maxMonthlyRent).toBe(300000);
    expect(result.ok && result.value.age).toBe(26);
  });

  it("월 임대료 상한이 음수면 이유와 할 일을 알려 준다", () => {
    expect(parseConditionForm({ ...valid, maxMonthlyRent: "-1" })).toEqual({
      ok: false,
      errors: { maxMonthlyRent: "월 임대료 상한은 0 이상이어야 합니다. 예: 300000" },
    });
  });

  it("월 임대료 상한 0은 받는다", () => {
    const result = parseConditionForm({ ...valid, maxMonthlyRent: "0" });
    expect(result.ok && result.value.maxMonthlyRent).toBe(0);
  });

  it("월 임대료 상한이 숫자가 아니면 막는다", () => {
    const result = parseConditionForm({ ...valid, maxMonthlyRent: "삼십만" });
    expect(result.ok).toBe(false);
  });

  it("시도를 고르지 않으면 막는다", () => {
    expect(parseConditionForm({ ...valid, sidoCode: "" })).toEqual({
      ok: false,
      errors: { sidoCode: "시도를 골라 주세요. 공고를 받을 지역입니다." },
    });
  });

  it("목록에 없는 시도 코드는 막는다", () => {
    expect(parseConditionForm({ ...valid, sidoCode: "99" }).ok).toBe(false);
  });

  it("시군구가 시도와 맞지 않으면 막는다", () => {
    const result = parseConditionForm({ ...valid, sidoCode: "11", sigunguCode: "26710" });
    expect(result.ok).toBe(false);
  });

  it("시군구 코드가 맞으면 받는다", () => {
    const result = parseConditionForm({ ...valid, sidoCode: "26", sigunguCode: "26710" });
    expect(result.ok && result.value.sigunguCode).toBe("26710");
  });

  it("나이가 범위 밖이면 막는다", () => {
    expect(parseConditionForm({ ...valid, age: "130" }).ok).toBe(false);
  });

  it("'모두'를 다른 유형과 함께 고르면 '모두'만 남긴다", () => {
    const result = parseConditionForm({ ...valid, supplyTypes: ["ALL", "행복주택"] });
    expect(result.ok && result.value.supplyTypes).toEqual(["ALL"]);
  });

  it("여러 칸이 틀리면 칸마다 문구를 준다", () => {
    const result = parseConditionForm({ ...valid, sidoCode: "", maxMonthlyRent: "-5" });
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["maxMonthlyRent", "sidoCode"]);
  });
});

// spec 001 v0.6: 대상은 목록 안의 값만, 겹치면 하나로
describe("parseConditionForm 대상", () => {
  it("youth만 고르면 youth, 목록 밖 값은 버림", () => {
    const result = parseConditionForm({ ...valid, targetGroups: ["youth", "youth", "castle"] });
    expect(result.ok && result.value.targetGroups).toEqual(["youth"]);
  });
});
