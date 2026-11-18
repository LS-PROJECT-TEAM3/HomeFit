import { describe, expect, it } from "vitest";
import { parseAreaForm } from "@/incident/area-form";
import { defaultRentChecklist, reviewDate } from "@/incident/rent-plan";

// spec 008 FR-001·006, 경계 E10
describe("reviewDate", () => {
  it("계약 만료 2달 전(달 끝은 그 달 마지막 날로), 만료일이 없으면 null", () => {
    expect(reviewDate("2027-08-31")).toBe("2027-06-30");
    expect(reviewDate("2027-03-15")).toBe("2027-01-15");
    expect(reviewDate("2027-01-10")).toBe("2026-11-10");
    expect(reviewDate(null)).toBeNull();
  });
});

describe("defaultRentChecklist", () => {
  it("내 집은 재계약 판단 메모, 날짜는 검토일", () => {
    const items = defaultRentChecklist({ target: "home", dueDate: "2027-06-30" });
    expect(items.length).toBe(3);
    expect(items.every((i) => i.dueOn === "2027-06-30")).toBe(true);
    expect(items[0].label).toContain("주변 거래");
  });
  it("관심 지역은 다시 보기, 날짜 없음", () => {
    const items = defaultRentChecklist({ target: "interest_area", dueDate: null });
    expect(items.every((i) => i.dueOn === null)).toBe(true);
  });
});

describe("parseAreaForm", () => {
  const input = { sidoCode: "30", sigunguCodes: ["30170"], housingType: "officetel", targetArea: "30", areaUnit: "m2", contractType: "monthly" };
  it("맞는 값", () => {
    expect(parseAreaForm(input)).toEqual({ ok: true, value: { sigunguCodes: ["30170"], housingType: "officetel", targetAreaM2: 30, contractType: "monthly" } });
  });
  it("사용자 요청(2026-11-18): 시군구 여러 곳을 한 번에(겹친 것은 하나로, 10곳까지)", () => {
    expect(parseAreaForm({ ...input, sigunguCodes: ["30170", "30110", "30170"] })).toMatchObject({ ok: true, value: { sigunguCodes: ["30170", "30110"] } });
    expect(parseAreaForm({ ...input, sigunguCodes: Array.from({ length: 11 }, (_, i) => String(30100 + i)) }).ok).toBe(false);
  });
  it("평으로 넣으면 ㎡로", () => {
    expect(parseAreaForm({ ...input, targetArea: "10", areaUnit: "pyeong" })).toMatchObject({ ok: true, value: { targetAreaM2: 33.06 } });
  });
  it("E10: 면적 0·300㎡ 초과, 모르는 유형·계약 형태, 시군구 없음", () => {
    const result = parseAreaForm({ ...input, sigunguCodes: [], housingType: "castle", targetArea: "0", contractType: "sale" });
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(["contractType", "housingType", "sigunguCodes", "targetArea"]);
    expect(parseAreaForm({ ...input, targetArea: "301" }).ok).toBe(false);
  });
});

describe("withObject", () => {
  it("받침 있으면 을, 없으면 를", async () => {
    const { withObject } = await import("@/incident/korean");
    expect(withObject("신청 준비 계획")).toBe("신청 준비 계획을");
    expect(withObject("재계약 판단 메모")).toBe("재계약 판단 메모를");
    expect(withObject("관심 지역 다시 보기")).toBe("관심 지역 다시 보기를");
  });
});
