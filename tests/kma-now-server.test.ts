import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadNowWeather } from "@/watch/kma-now.server";

// spec 020 E2·E4: 실제 기상청을 부르지 않고 가짜 응답으로 분기만 본다
const ncst = { response: { header: { resultCode: "00" }, body: { items: { item: [
  { baseDate: "20261119", baseTime: "1000", category: "T1H", obsrValue: "3.1" },
  { baseDate: "20261119", baseTime: "1000", category: "REH", obsrValue: "39" },
  { baseDate: "20261119", baseTime: "1000", category: "PTY", obsrValue: "0" },
] } } } };
const fcst = { response: { header: { resultCode: "00" }, body: { items: { item: [{ category: "SKY", fcstDate: "20261119", fcstTime: "1100", fcstValue: "4" }] } } } };
const grid = { nx: 61, ny: 125 };
const at = new Date("2026-11-19T01:50:00Z");

function fakeFetch(fcstBody: string | null) {
  return vi.fn(async (url: string) => {
    if (url.includes("getUltraSrtNcst")) return new Response(JSON.stringify(ncst));
    return fcstBody === null ? new Response("error", { status: 500 }) : new Response(fcstBody);
  });
}

describe("loadNowWeather", () => {
  beforeEach(() => vi.stubEnv("DATA_GO_KR_SERVICE_KEY", "test-key"));
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("실황과 하늘 상태를 합친다", async () => {
    vi.stubGlobal("fetch", fakeFetch(JSON.stringify(fcst)));
    expect(await loadNowWeather(grid, at)).toMatchObject({ temperature: 3.1, humidity: 39, sky: 4, text: "흐림" });
  });
  it("E4: 예보가 실패해도 기온·습도는 보이고 하늘은 정보 없음", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fakeFetch(null));
    expect(await loadNowWeather(grid, at)).toMatchObject({ temperature: 3.1, sky: null, text: "하늘 상태 정보 없음" });
  });
  it("E2: 실황이 실패하면 던지고 오류 문구에 키를 넣지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("error", { status: 500 })));
    const error = await loadNowWeather(grid, at).catch((e: Error) => e);
    expect((error as Error).message).toContain("500");
    expect((error as Error).message).not.toContain("test-key");
  });
});

describe("weatherSlot (E6)", () => {
  it("10분 단위로 내린다", async () => {
    const { weatherSlot } = await import("@/watch/kma-now.server");
    expect(weatherSlot(new Date("2026-11-19T01:57:42Z"))).toBe("2026-11-19T01:50:00.000Z");
    expect(weatherSlot(new Date("2026-11-19T01:50:00Z"))).toBe("2026-11-19T01:50:00.000Z");
  });
});
