import { describe, expect, it } from "vitest";
import { foldStatus, parseCostFields, parseInterestHomeForm } from "@/incident/interest-home-form";

// spec 009 FR-001·002, 경계 E8
const input = {
  name: "역 앞 오피스텔", sidoCode: "41", sigunguCode: "41390", housingType: "officetel", exclusiveArea: "20", areaUnit: "m2",
  deposit: "5000000", monthlyRent: "450000", maintenanceFee: "70000", energyCost: "", electricityKwh: "180", transitFare: "1500", tripsPerDay: "", commuteDays: "",
};

describe("parseInterestHomeForm", () => {
  it("맞는 값, 빈 선택 칸은 null", () => {
    expect(parseInterestHomeForm(input)).toEqual({
      ok: true,
      value: {
        name: "역 앞 오피스텔", sigunguCode: "41390", housingType: "officetel", exclusiveAreaM2: 20, deposit: 5_000_000, monthlyRent: 450_000, maintenanceFee: 70_000,
        energyCost: null, electricityKwh: 180, transitFare: 1_500, tripsPerDay: null, commuteDays: null,
      },
    });
  });
  it("E8: 이름 비움·41자, 월세 비움·음수, kWh 3001, 편도 20001, 하루 횟수 0, 출근 일수 32", () => {
    const bad = parseInterestHomeForm({ ...input, name: " ", monthlyRent: "-1", electricityKwh: "3001", transitFare: "20001", tripsPerDay: "0", commuteDays: "32" });
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(["commuteDays", "electricityKwh", "monthlyRent", "name", "transitFare", "tripsPerDay"]);
    expect(parseInterestHomeForm({ ...input, name: "가".repeat(41) }).ok).toBe(false);
    expect(parseInterestHomeForm({ ...input, monthlyRent: "" }).ok).toBe(false);
  });
  it("평으로 넣으면 ㎡, 면적은 비워도 됨", () => {
    expect(parseInterestHomeForm({ ...input, exclusiveArea: "6", areaUnit: "pyeong" })).toMatchObject({ ok: true, value: { exclusiveAreaM2: 19.83 } });
    expect(parseInterestHomeForm({ ...input, exclusiveArea: "" })).toMatchObject({ ok: true, value: { exclusiveAreaM2: null } });
  });
});

describe("parseCostFields (내 집 비용 칸)", () => {
  it("모두 비우면 모두 null", () => {
    expect(parseCostFields({ energyCost: "", electricityKwh: "", transitFare: "", tripsPerDay: "", commuteDays: "" })).toEqual({
      ok: true, value: { energyCost: null, electricityKwh: null, transitFare: null, tripsPerDay: null, commuteDays: null },
    });
  });
  it("숫자가 아니면 오류", () => {
    expect(parseCostFields({ energyCost: "abc", electricityKwh: "", transitFare: "", tripsPerDay: "", commuteDays: "" })).toMatchObject({ ok: false, errors: { energyCost: expect.any(String) } });
  });
});

// spec 022 FR-011(집 비교 등록 창 보드): 칸 묶음 상태 글자. 색만이 아니라 글자로 (디자인 기본선 5)
describe("foldStatus", () => {
  it("필수 칸이 비면 몇 칸인지 알림", () => {
    expect(foldStatus({ all: ["", "", "1", ""], required: ["", ""] })).toEqual({ text: "필수 2칸 비어 있어요", warn: true });
  });
  it("필수가 다 차면 채운 칸 수", () => {
    expect(foldStatus({ all: ["a", "11", " ", "x", "y"], required: ["a", "11"] })).toEqual({ text: "입력함 4/5", warn: false });
    expect(foldStatus({ all: ["", "", ""], required: [] })).toEqual({ text: "입력함 0/3", warn: false });
  });
});
