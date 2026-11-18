import { describe, expect, it } from "vitest";
import { latestBaseTime, parseKmaForecast } from "@/watch/kma";
import { findGrid } from "@/watch/kma-grid";
import sample from "@/watch/fixtures/kma-sample.json";

// FR-003 (spec 003): 기상청 단기예보 응답 해석, 발표 시각 고르기, 시군구 → 격자
describe("parseKmaForecast", () => {
  it("실제 응답 저장본(2026-11-17 20시 발표)을 시간별 기온·습도·강수 형태로 묶는다", () => {
    const hours = parseKmaForecast(sample);
    expect(hours.length).toBeGreaterThanOrEqual(80);
    expect(hours[0]).toEqual({ forecastAt: "2026-11-17T12:00:00.000Z", temperature: 11, humidity: expect.any(Number), precipitationType: expect.any(Number) });
    const times = hours.map((hour) => hour.forecastAt);
    expect([...times].sort()).toEqual(times);
  });

  it("결과 코드가 00이 아니면 오류(변화 없음이 아님)", () => {
    const failed = { response: { header: { resultCode: "03", resultMsg: "NO_DATA" } } };
    expect(() => parseKmaForecast(failed)).toThrow(/기상청 응답 오류 03/);
  });

  it("items가 비었거나 모양이 다르면 오류", () => {
    const empty = { response: { header: { resultCode: "00" }, body: { items: { item: [] } } } };
    expect(() => parseKmaForecast(empty)).toThrow();
    expect(() => parseKmaForecast({ hello: 1 })).toThrow();
    expect(() => parseKmaForecast("<OpenAPI_ServiceResponse>")).toThrow();
  });

  it("숫자가 아닌 값(빈칸, 글자)은 null로 두고 그 시각은 남긴다", () => {
    const odd = {
      response: { header: { resultCode: "00" }, body: { items: { item: [
        { category: "TMP", fcstDate: "20261118", fcstTime: "0600", fcstValue: "" },
        { category: "REH", fcstDate: "20261118", fcstTime: "0600", fcstValue: "강수없음" },
        { category: "PTY", fcstDate: "20261118", fcstTime: "0600", fcstValue: "0" },
        { category: "TMP", fcstDate: "20261118", fcstTime: "0700", fcstValue: "-3" },
      ] } } },
    };
    expect(parseKmaForecast(odd)).toEqual([
      { forecastAt: "2026-11-17T21:00:00.000Z", temperature: null, humidity: null, precipitationType: 0 },
      { forecastAt: "2026-11-17T22:00:00.000Z", temperature: -3, humidity: null, precipitationType: null },
    ]);
  });
});

describe("latestBaseTime (KST, 발표 뒤 10분부터)", () => {
  it("05:09는 02시, 05:10은 05시", () => {
    expect(latestBaseTime(new Date("2026-11-18T05:09:00+09:00"))).toEqual({ baseDate: "20261118", baseTime: "0200" });
    expect(latestBaseTime(new Date("2026-11-18T05:10:00+09:00"))).toEqual({ baseDate: "20261118", baseTime: "0500" });
  });
  it("00:30은 전날 23시", () => {
    expect(latestBaseTime(new Date("2026-11-18T00:30:00+09:00"))).toEqual({ baseDate: "20261117", baseTime: "2300" });
  });
  it("17:40은 17시", () => {
    expect(latestBaseTime(new Date("2026-11-18T17:40:00+09:00"))).toEqual({ baseDate: "20261118", baseTime: "1700" });
  });
});

describe("findGrid", () => {
  const table = { sido: { "41": [60, 120] as [number, number] }, sigungu: { "41131": [63, 124] as [number, number], "41210": [58, 125] as [number, number] } };
  it("시군구가 표에 있으면 그 격자", () => {
    expect(findGrid(table, "41210")).toEqual({ nx: 58, ny: 125, precision: "sigungu" });
  });
  it("구가 있는 시(41130 성남시)는 같은 시의 첫 구", () => {
    expect(findGrid(table, "41130")).toEqual({ nx: 63, ny: 124, precision: "city" });
  });
  it("시군구가 없으면 시도 대표", () => {
    expect(findGrid(table, "41999")).toEqual({ nx: 60, ny: 120, precision: "sido" });
  });
  it("모르는 시도·이상한 코드는 null", () => {
    expect(findGrid(table, "99110")).toBeNull();
    expect(findGrid(table, "abc")).toBeNull();
  });
});
