import { describe, expect, it } from "vitest";
import { contractEndText, countAlertGroups, environmentLine, measurementState, monthlyHousingCost, scheduleDateParts, toPyeong } from "@/incident/home-dashboard";

// spec 003 v0.2 FR-010 (홈 카드 5개) 계산. 순수 함수(오늘·지금은 인자)
describe("monthlyHousingCost (월 예상 주거비 = 월세 + 관리비)", () => {
  it("월세 450,000 + 관리비 70,000 = 520,000", () => {
    expect(monthlyHousingCost({ contractType: "monthly", monthlyRent: 450000, maintenanceFee: 70000 })).toEqual({ status: "ok", rent: 450000, fee: 70000, total: 520000 });
  });
  it("관리비가 비면 월세만 합계, 관리비 없음 표시", () => {
    expect(monthlyHousingCost({ contractType: "monthly", monthlyRent: 450000, maintenanceFee: null })).toEqual({ status: "no_fee", rent: 450000, fee: null, total: 450000 });
  });
  it("전세면 월세 0", () => {
    expect(monthlyHousingCost({ contractType: "jeonse", monthlyRent: null, maintenanceFee: 50000 })).toEqual({ status: "ok", rent: 0, fee: 50000, total: 50000 });
  });
  it("계약 정보가 없으면 계산하지 않음", () => {
    expect(monthlyHousingCost({ contractType: null, monthlyRent: null, maintenanceFee: null })).toEqual({ status: "no_contract" });
    expect(monthlyHousingCost({ contractType: null, monthlyRent: null, maintenanceFee: 70000 })).toEqual({ status: "no_contract" });
    expect(monthlyHousingCost({ contractType: "monthly", monthlyRent: null, maintenanceFee: 70000 })).toEqual({ status: "no_contract" });
  });
});

describe("contractEndText", () => {
  const today = "2026-11-18";
  it("남은 날 / 오늘 / 지남 / 없음", () => {
    expect(contractEndText("2027-08-31", today)).toBe("계약 만료까지 286일");
    expect(contractEndText("2026-11-18", today)).toBe("오늘 계약 만료");
    expect(contractEndText("2026-11-01", today)).toBe("계약 만료일 지남");
    expect(contractEndText(null, today)).toBeNull();
  });
});

describe("toPyeong", () => {
  it("㎡를 평으로(소수 한 자리)", () => {
    expect(toPyeong(33.06)).toBe(10);
    expect(toPyeong(20)).toBe(6.1); // 6.05평
    expect(toPyeong(59.5)).toBe(18);
  });
});

describe("measurementState (Q4: 7일)", () => {
  const now = new Date("2026-11-18T06:00:00+09:00");
  it("없음 / 오래됨 / 새것", () => {
    expect(measurementState(null, now)).toBe("none");
    expect(measurementState("2026-11-10T00:00:00+09:00", now)).toBe("stale");
    expect(measurementState("2026-11-17T22:00:00+09:00", now)).toBe("fresh");
  });
});

describe("countAlertGroups (새 위험·주거 기회·승인 대기)", () => {
  it("습도·시세는 위험, 공고는 주거 기회. 새 것만 세고 승인 대기는 따로", () => {
    expect(countAlertGroups([
      { incidentType: "humidity_condensation", status: "new" },
      { incidentType: "rent_price_change", status: "new" },
      { incidentType: "housing_support", status: "new" },
      { incidentType: "housing_support", status: "pending" },
      { incidentType: "humidity_condensation", status: "pending" },
      { incidentType: "housing_support", status: "approved" },
    ])).toEqual({ newRisk: 2, newOpportunity: 1, pending: 2 });
  });
});

describe("리뷰 3 (5단계): 계약 형태를 안 골라도 월세가 있으면 계산", () => {
  it("형태 없음 + 월세 450,000 + 관리비 70,000 = 520,000", () => {
    expect(monthlyHousingCost({ contractType: null, monthlyRent: 450000, maintenanceFee: 70000 })).toEqual({ status: "ok", rent: 450000, fee: 70000, total: 520000 });
  });
});

describe("environmentLine (리뷰 1: 판단하지 않았으면 '위험 없음'이라 하지 않음)", () => {
  it("측정값 없음·오래됨이면 판단 안 함 문구", () => {
    expect(environmentLine({ state: "none", lastCheckAt: "2026-11-18" })).toBe("측정값이 있어야 결로 위험을 판단합니다");
    expect(environmentLine({ state: "stale", lastCheckAt: "2026-11-18" })).toBe("측정값이 7일 넘어 결로 위험을 판단하지 않았습니다. 새로 재서 넣어 주세요");
  });
  it("새 측정값이면 위험 없음, 예보를 아직 못 봤으면 그렇게", () => {
    expect(environmentLine({ state: "fresh", lastCheckAt: "11. 18. 오전 05:30" })).toBe("앞으로 48시간 결로 위험 없음 · 예보 확인 11. 18. 오전 05:30");
    expect(environmentLine({ state: "fresh", lastCheckAt: null })).toBe("아직 예보를 확인하지 않았습니다");
  });
});

// spec 022 FR-011: 홈 다가오는 일정 줄의 날짜 칸("12.05" / "토요일")
describe("scheduleDateParts", () => {
  it("날짜를 월.일과 요일로", () => {
    expect(scheduleDateParts("2026-12-05")).toEqual({ date: "12.05", weekday: "토요일" });
    expect(scheduleDateParts("2027-01-04")).toEqual({ date: "01.04", weekday: "월요일" });
  });
  it("마감일이 없으면 null", () => {
    expect(scheduleDateParts(null)).toBe(null);
  });
});
