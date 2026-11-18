import { describe, expect, it } from "vitest";
import { ADMIN_EDIT_ERRORS, EDITABLE_FIELDS, parseAdminEdit } from "@/incident/admin-edit";

// spec 010 FR-003 (PRD FR-20, IA AD_070102_MD): 관리자 수정 입력 검사. 사유 필수(E10), 바뀐 칸만(E13)
const HOME_BEFORE = { exclusive_area_m2: 21, deposit: 10_000_000, monthly_rent: 500_000, maintenance_fee: null, contract_end_date: "2027-06-30" };
const homeForm = (over: Record<string, string>) => ({
  exclusive_area_m2: "21", deposit: "10000000", monthly_rent: "500000", maintenance_fee: "", contract_end_date: "2027-06-30", reason: "회원 요청으로 월세 정정", ...over,
});

describe("EDITABLE_FIELDS", () => {
  it("공고 조건과 내 집만 고칠 수 있다 (spec 010 Q1)", () => {
    expect(Object.keys(EDITABLE_FIELDS).sort()).toEqual(["homes", "policy_conditions"]);
  });
});

describe("parseAdminEdit", () => {
  it("바뀐 칸만 고르고 사유를 다듬어 돌려준다", () => {
    const result = parseAdminEdit({ table: "homes", form: homeForm({ monthly_rent: "450000", reason: "  회원 요청으로 월세 정정 " }), before: HOME_BEFORE });
    expect(result).toEqual({ ok: true, changes: { monthly_rent: 450_000 }, reason: "회원 요청으로 월세 정정" });
  });
  it("빈 선택 칸은 null로 바꾼다", () => {
    const result = parseAdminEdit({ table: "homes", form: homeForm({ contract_end_date: "" }), before: HOME_BEFORE });
    expect(result).toEqual({ ok: true, changes: { contract_end_date: null }, reason: "회원 요청으로 월세 정정" });
  });
  it.each([["", "비움"], ["가", "1자"], ["가".repeat(201), "201자"]])("사유가 %#번(%s)이면 저장하지 않는다 (E10)", (reason) => {
    const result = parseAdminEdit({ table: "homes", form: homeForm({ monthly_rent: "450000", reason }), before: HOME_BEFORE });
    expect(result).toEqual({ ok: false, errors: { reason: ADMIN_EDIT_ERRORS.reason } });
  });
  it("사유 2자와 200자는 된다", () => {
    for (const reason of ["정정", "가".repeat(200)]) {
      expect(parseAdminEdit({ table: "homes", form: homeForm({ monthly_rent: "1", reason }), before: HOME_BEFORE }).ok).toBe(true);
    }
  });
  it("바뀐 것이 없으면 저장하지 않는다 (E13)", () => {
    expect(parseAdminEdit({ table: "homes", form: homeForm({}), before: HOME_BEFORE })).toEqual({ ok: false, errors: { form: ADMIN_EDIT_ERRORS.noChange } });
  });
  it("숫자 칸 검사: 음수·글자·면적 범위 밖·나이 범위 밖·날짜 모양", () => {
    const bad = parseAdminEdit({ table: "homes", form: homeForm({ deposit: "-1", monthly_rent: "오십만", exclusive_area_m2: "301", contract_end_date: "2027-13-01" }), before: HOME_BEFORE });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.ok ? {} : bad.errors).sort()).toEqual(["contract_end_date", "deposit", "exclusive_area_m2", "monthly_rent"]);
    const age = parseAdminEdit({ table: "policy_conditions", form: { max_monthly_rent: "", age: "121", reason: "나이 정정" }, before: { max_monthly_rent: null, age: 26 } });
    expect(age).toEqual({ ok: false, errors: { age: ADMIN_EDIT_ERRORS.age } });
  });
  it("면적은 필수라 비울 수 없고, 소수를 받는다", () => {
    expect(parseAdminEdit({ table: "homes", form: homeForm({ exclusive_area_m2: "" }), before: HOME_BEFORE })).toEqual({ ok: false, errors: { exclusive_area_m2: ADMIN_EDIT_ERRORS.area } });
    expect(parseAdminEdit({ table: "homes", form: homeForm({ exclusive_area_m2: "20.5" }), before: HOME_BEFORE })).toEqual({ ok: true, changes: { exclusive_area_m2: 20.5 }, reason: "회원 요청으로 월세 정정" });
  });
  it("공고 조건의 월세 상한·나이를 고친다", () => {
    const result = parseAdminEdit({ table: "policy_conditions", form: { max_monthly_rent: "600000", age: "26", reason: "상한 정정" }, before: { max_monthly_rent: 500_000, age: 26 } });
    expect(result).toEqual({ ok: true, changes: { max_monthly_rent: 600_000 }, reason: "상한 정정" });
  });
});
