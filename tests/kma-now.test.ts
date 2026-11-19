import { describe, expect, it } from "vitest";
import { fcstBase, ncstBase, parseNcst, parseSky, weatherText } from "@/watch/kma-now";

// spec 020 FR-001·FR-002, 경계 E3·E4·E7. 응답 모양은 2026-11-19 실제 호출(강남구 격자 61,125)과 같다
const ncstItem = (category: string, obsrValue: string) => ({ baseDate: "20261119", baseTime: "1000", category, nx: 61, ny: 125, obsrValue });
const ok = (item: unknown[]) => ({ response: { header: { resultCode: "00", resultMsg: "NORMAL_SERVICE" }, body: { items: { item } } } });

describe("기준 시각 (E3, E7)", () => {
  it("실황: 한국 시각에서 15분 전의 정시", () => {
    expect(ncstBase(new Date("2026-11-19T01:20:00Z"))).toEqual({ baseDate: "20261119", baseTime: "1000" }); // 한국 10:20
    expect(ncstBase(new Date("2026-11-19T01:10:00Z"))).toEqual({ baseDate: "20261119", baseTime: "0900" }); // 한국 10:10
    expect(ncstBase(new Date("2026-11-18T15:05:00Z"))).toEqual({ baseDate: "20261118", baseTime: "2300" }); // 한국 00:05 → 전날 23시
  });
  it("예보: 45분 전 기준의 HH30", () => {
    expect(fcstBase(new Date("2026-11-19T01:50:00Z"))).toEqual({ baseDate: "20261119", baseTime: "1030" }); // 한국 10:50
    expect(fcstBase(new Date("2026-11-19T01:20:00Z"))).toEqual({ baseDate: "20261119", baseTime: "0930" }); // 한국 10:20
  });
});

describe("parseNcst (FR-001)", () => {
  it("기온·습도·강수 형태·1시간 강수량·풍속과 관측 시각", () => {
    const json = ok([ncstItem("PTY", "0"), ncstItem("REH", "39"), ncstItem("RN1", "0"), ncstItem("T1H", "3.1"), ncstItem("WSD", "3.7"), ncstItem("VEC", "130")]);
    expect(parseNcst(json)).toEqual({ temperature: 3.1, humidity: 39, precipitationType: 0, rain1h: 0, windSpeed: 3.7, observedAt: "2026-11-19T10:00" });
  });
  it("기온·습도가 없으면 모양이 다름으로 던진다", () => {
    expect(() => parseNcst(ok([ncstItem("PTY", "0")]))).toThrow("모양이 다름");
  });
  it("오류 코드는 코드와 함께 던진다(E2)", () => {
    expect(() => parseNcst({ response: { header: { resultCode: "03", resultMsg: "NO_DATA" } } })).toThrow("기상청 초단기 오류 03");
  });
});

describe("parseSky (FR-002, E4)", () => {
  const fc = (fcstTime: string, fcstValue: string, category = "SKY") => ({ category, fcstDate: "20261119", fcstTime, fcstValue });
  it("지금 시각 이후 가장 가까운 SKY", () => {
    expect(parseSky(ok([fc("1100", "3"), fc("1200", "4"), fc("1100", "20", "T1H")]), new Date("2026-11-19T01:50:00Z"))).toBe(3);
  });
  it("SKY가 없으면 null", () => {
    expect(parseSky(ok([fc("1100", "20", "T1H")]), new Date("2026-11-19T01:50:00Z"))).toBeNull();
  });
});

describe("weatherText (FR-002)", () => {
  it("비·눈이 오면 강수 형태", () => {
    expect(weatherText(1, 1)).toBe("비");
    expect(weatherText(7, null)).toBe("눈날림");
  });
  it("안 오면 하늘 상태, 모르면 안내", () => {
    expect(weatherText(0, 1)).toBe("맑음");
    expect(weatherText(0, 4)).toBe("흐림");
    expect(weatherText(0, null)).toBe("하늘 상태 정보 없음");
  });
});
