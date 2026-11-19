import { describe, expect, it, vi } from "vitest";

// spec 011 E2, 코드 점검 2: 한 시군구가 실패해도 나머지는 추정하고, 실패 수를 센다
vi.mock("@/watch/kepco-household.server", () => ({
  fetchHouseholdAverage: vi.fn(async (code: string) => {
    if (code === "11680") return { kwh: 326.76, households: 1, year: "2026", month: "09" };
    if (code === "41135") throw new Error("한전 가구평균 응답 HTTP 500");
    return null;
  }),
}));

// spec 018: 아파트 시군구 평균 사용금액도 가짜로(실제 API를 부르지 않는다)
const aptFetch = vi.fn(async (code: string) => {
  if (code === "11680") return { perM2: 2922, parts: { elect: 907, heat: 1681, waterHot: 327, gas: 7 }, searchDate: "202511" };
  if (code === "41135") throw new Error("공동주택 에너지 사용 정보 HTTP 500");
  return null;
});
vi.mock("@/watch/apt-energy.server", () => ({ fetchAptEnergy: (code: string) => aptFetch(code) }));

const { loadEstimateBasis } = await import("@/incident/energy-estimate.server");
const home = (sigunguCode: string) => ({ sigunguCode, energyCost: null, electricityKwh: null });

describe("loadEstimateBasis", () => {
  it("성공한 시군구만 평균을 담고, 실패는 세고, 통계 없음은 실패가 아니다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const basis = await loadEstimateBasis([home("11680"), home("41135"), home("26110")], new Date("2026-11-18T03:00:00Z"));
    expect([...basis.averages.keys()]).toEqual(["11680"]);
    expect(basis.failed).toBe(1);
  });
  it("spec 018 E5: 면적이 있는 아파트의 시군구만 아파트 평균을 부르고, 실패는 따로 센다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    aptFetch.mockClear();
    const apt = (sigunguCode: string, exclusiveAreaM2: number | null) => ({ ...home(sigunguCode), housingType: "apartment" as const, exclusiveAreaM2 });
    const basis = await loadEstimateBasis(
      [apt("11680", 84), apt("41135", 59), apt("26110", null), { ...home("11440"), housingType: "officetel" as const, exclusiveAreaM2: 20 }],
      new Date("2026-11-18T03:00:00Z"),
    );
    expect(aptFetch.mock.calls.map(([code]) => code)).toEqual(["11680", "41135"]);
    expect([...basis.aptAverages.keys()]).toEqual(["11680"]);
    expect(basis.aptFailed).toBe(1);
  });
});
