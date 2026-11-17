import { describe, expect, it } from "vitest";
import type { HourlyForecast } from "@/incident/condensation";
import { planHumidityIncidents, type HomeForCheck, type OpenHumidityIncident } from "@/incident/humidity-detect";
import { defaultHumidityChecklist } from "@/incident/humidity-plan";
import { buildWeatherFixture, isWeatherFixtureName } from "@/watch/weather-fixtures";
import { parseKmaForecast } from "@/watch/kma";

// FR-004, FR-005, FR-011 (spec 003): 예보 → 습도·결로 사건 계획. 순수 함수
const NOW = new Date("2026-11-18T06:00:00+09:00");

function hours(count: number, temperature: (h: number) => number): HourlyForecast[] {
  return Array.from({ length: count }, (_, i) => ({
    forecastAt: new Date(NOW.getTime() + (i + 1) * 3_600_000).toISOString(),
    temperature: temperature(i + 1), humidity: 50, precipitationType: 0,
  }));
}

const home: HomeForCheck = {
  homeId: "home-1", userId: "user-1", sigunguCode: "26350", windowType: "unknown",
  measurement: { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-17T21:00:00+09:00" },
};
const coldAt20 = hours(48, (h) => (h === 20 ? -5 : 3));
const riskAt = new Date(NOW.getTime() + 20 * 3_600_000).toISOString();

function plan(input: { homes?: HomeForCheck[]; forecast?: HourlyForecast[]; open?: OpenHumidityIncident[] }) {
  return planHumidityIncidents({
    homes: input.homes ?? [home],
    forecastBySigungu: new Map([["26350", input.forecast ?? coldAt20]]),
    openIncidents: input.open ?? [],
    now: NOW,
  });
}

describe("planHumidityIncidents", () => {
  it("위험하면 새 사건: 같은 48시간 키, 근거 숫자, 마감일은 가장 위험한 시각 전날(KST)", () => {
    const result = plan({});
    expect(result.create).toHaveLength(1);
    const [created] = result.create;
    expect(created.userId).toBe("user-1");
    expect(created.homeId).toBe("home-1");
    expect(created.dedupKey).toBe(`humidity|home-1|${riskAt}`);
    expect(created.facts).toMatchObject({
      kind: "humidity", riskAt, windowStart: riskAt, condition: "surface", windowType: "unknown", sigunguCode: "26350",
      dueDate: "2026-11-18", outdoorC: -5, measurement: home.measurement, forecastHours: 48,
    });
    expect(created.facts.title).toBe("결로 위험: 11월 19일 02시");
    expect(created.facts.surfaceC).toBeCloseTo(1.15, 1);
  });

  it("위험이 오늘 안이면 마감일은 오늘(지난 날짜로 잡지 않음)", () => {
    const soon = hours(48, (h) => (h === 2 ? -5 : 3));
    const [created] = plan({ forecast: soon }).create;
    expect(created.facts.dueDate).toBe("2026-11-18");
  });

  it("안전하면 아무것도 안 하고 이유를 센다", () => {
    const result = plan({ forecast: hours(48, () => 15) });
    expect(result.create).toHaveLength(0);
    expect(result.counts.safe).toBe(1);
  });

  it("측정값 없음·오래됨, 예보 없는 시군구는 건너뛰고 센다", () => {
    const noMeasure = { ...home, homeId: "h2", measurement: null };
    const stale = { ...home, homeId: "h3", measurement: { ...home.measurement!, measuredAt: "2026-11-01T00:00:00+09:00" } };
    const elsewhere = { ...home, homeId: "h4", sigunguCode: "11110" };
    const result = plan({ homes: [noMeasure, stale, elsewhere] });
    expect(result.create).toHaveLength(0);
    expect(result.counts).toMatchObject({ no_measurement: 1, stale_measurement: 1, no_forecast: 1 });
  });

  it("같은 48시간 안에 열린 사건이 있고 덜 위험하거나 같으면 건너뜀", () => {
    const open: OpenHumidityIncident = { id: "inc-1", homeId: "home-1", windowStart: riskAt, marginC: -20, status: "new" };
    const result = plan({ open: [open] });
    expect(result.create).toHaveLength(0);
    expect(result.update).toHaveLength(0);
    expect(result.counts.same_window).toBe(1);
  });

  it("같은 48시간 안에서 더 위험해지면 기존 사건 갱신(창 시작은 그대로)", () => {
    const open: OpenHumidityIncident = { id: "inc-1", homeId: "home-1", windowStart: riskAt, marginC: -5, status: "pending" };
    const result = plan({ open: [open] });
    expect(result.create).toHaveLength(0);
    expect(result.update).toEqual([expect.objectContaining({ incidentId: "inc-1" })]);
    expect(result.update[0].facts.windowStart).toBe(riskAt);
  });

  it("승인·거절된 사건은 바꾸지 않고, 같은 48시간이면 새로 만들지도 않음", () => {
    const done: OpenHumidityIncident = { id: "inc-1", homeId: "home-1", windowStart: riskAt, marginC: -5, status: "approved" };
    const result = plan({ open: [done] });
    expect(result.update).toHaveLength(0);
    expect(result.create).toHaveLength(0);
  });

  it("기존 사건 창 밖(48시간 지남)이면 새 사건", () => {
    const old = new Date(NOW.getTime() - 40 * 3_600_000).toISOString();
    const open: OpenHumidityIncident = { id: "inc-1", homeId: "home-1", windowStart: old, marginC: -20, status: "new" };
    expect(plan({ open: [open] }).create).toHaveLength(1);
  });
});

describe("defaultHumidityChecklist", () => {
  it("환기·제습·창 물기·창호 점검, 날짜는 마감일", () => {
    const items = defaultHumidityChecklist({ dueDate: "2026-11-18", condition: "surface" });
    expect(items.map((item) => item.label)).toEqual([
      "아침·저녁 10분씩 창을 열어 환기하기",
      "제습기를 켜거나 제습제를 창가·옷장에 두기",
      "창에 맺힌 물기를 마른 수건으로 닦기",
      "창틀·실리콘 틈과 곰팡이 자국 살펴보기",
    ]);
    expect(items.every((item) => item.dueOn === "2026-11-18")).toBe(true);
  });
});

describe("weather fixtures", () => {
  it("정해진 이름만 받는다", () => {
    expect(isWeatherFixtureName("cold")).toBe(true);
    expect(isWeatherFixtureName("rm -rf")).toBe(false);
  });

  it("cold는 기상청 모양이고 20°C·60% 홑유리 집에 위험, safe는 안전", () => {
    const cold = parseKmaForecast(buildWeatherFixture("cold", NOW));
    const safe = parseKmaForecast(buildWeatherFixture("safe", NOW));
    const run = (forecast: HourlyForecast[]) => plan({ forecast }).create.length;
    expect(run(cold)).toBe(1);
    expect(run(safe)).toBe(0);
  });

  it("colder는 cold보다 더 위험(갱신 시험용)", () => {
    const margin = (name: "cold" | "colder") => plan({ forecast: parseKmaForecast(buildWeatherFixture(name, NOW)) }).create[0].facts.marginC;
    expect(margin("colder")).toBeLessThan(margin("cold"));
  });

  it("humid는 실내 75% 이중유리 집에 습도 위험(조건 나), 위험 시각은 첫 습한 시각 (3단계 리뷰 3)", () => {
    const humidHome = { ...home, windowType: "double" as const, measurement: { ...home.measurement!, temperatureC: 24, humidityPct: 75 } };
    const [created] = plan({ homes: [humidHome], forecast: parseKmaForecast(buildWeatherFixture("humid", NOW)) }).create;
    expect(created.facts.condition).toBe("humidity");
    expect(created.facts.title).toMatch(/^습도 위험: /);
    expect(created.facts.riskAt).toBe(new Date(NOW.getTime() + 3_600_000).toISOString());
  });

  it("failure·malformed는 해석에서 오류", () => {
    expect(() => parseKmaForecast(buildWeatherFixture("failure", NOW))).toThrow();
    expect(() => parseKmaForecast(buildWeatherFixture("malformed", NOW))).toThrow();
  });
});
