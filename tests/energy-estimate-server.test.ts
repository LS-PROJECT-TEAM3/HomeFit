import { describe, expect, it, vi } from "vitest";

// spec 011 E2, 코드 점검 2: 한 시군구가 실패해도 나머지는 추정하고, 실패 수를 센다
vi.mock("@/watch/kepco-household.server", () => ({
  fetchHouseholdAverage: vi.fn(async (code: string) => {
    if (code === "11680") return { kwh: 326.76, households: 1, year: "2026", month: "09" };
    if (code === "41135") throw new Error("한전 가구평균 응답 HTTP 500");
    return null;
  }),
}));

const { loadEstimateBasis } = await import("@/incident/energy-estimate.server");
const home = (sigunguCode: string) => ({ sigunguCode, energyCost: null, electricityKwh: null });

describe("loadEstimateBasis", () => {
  it("성공한 시군구만 평균을 담고, 실패는 세고, 통계 없음은 실패가 아니다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const basis = await loadEstimateBasis([home("11680"), home("41135"), home("26110")], new Date("2026-11-18T03:00:00Z"));
    expect([...basis.averages.keys()]).toEqual(["11680"]);
    expect(basis.failed).toBe(1);
  });
});
