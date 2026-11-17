import { describe, expect, it } from "vitest";
import {
  assessCondensationRisk, dewPoint, isMoreSevere, RISK_RULES, sameRiskWindow, surfaceTemperature,
  type HourlyForecast,
} from "@/incident/condensation";

// FR-004, FR-005 (spec 003): 결로 계산과 위험 판단. spec 3절 경계·예외 상황을 모두 사례로 둔다
const NOW = new Date("2026-11-18T06:00:00+09:00");
const measured = { temperatureC: 20, humidityPct: 60, measuredAt: "2026-11-17T21:00:00+09:00" };

/** NOW 다음 시각부터 hours시간치 예보. 값은 함수로 정한다 */
function forecast(hours: number, at: (hour: number) => Partial<HourlyForecast>): HourlyForecast[] {
  return Array.from({ length: hours }, (_, index) => ({
    forecastAt: new Date(NOW.getTime() + (index + 1) * 3_600_000).toISOString(),
    temperature: 10, humidity: 50, precipitationType: 0, ...at(index + 1),
  }));
}

describe("dewPoint (Magnus)", () => {
  it("20°C·60%면 약 12.0°C", () => {
    expect(dewPoint(20, 60)).toBeCloseTo(12.0, 1);
  });
  it("습도 100%면 이슬점 = 온도", () => {
    expect(dewPoint(15, 100)).toBeCloseTo(15, 6);
  });
});

describe("surfaceTemperature", () => {
  it("홑유리 20°C / -5°C → 약 1.15°C", () => {
    expect(surfaceTemperature({ indoorC: 20, outdoorC: -5, windowType: "single" })).toBeCloseTo(1.15, 2);
  });
  it("이중유리 20°C / 5°C → 약 14.5°C", () => {
    expect(surfaceTemperature({ indoorC: 20, outdoorC: 5, windowType: "double" })).toBeCloseTo(14.54, 2);
  });
  it("창 종류 모름은 홑유리로 계산한다(더 위험한 쪽)", () => {
    const unknown = surfaceTemperature({ indoorC: 20, outdoorC: 0, windowType: "unknown" });
    expect(unknown).toBe(surfaceTemperature({ indoorC: 20, outdoorC: 0, windowType: "single" }));
  });
  it("실내가 바깥보다 추워도 막지 않고 계산한다", () => {
    expect(surfaceTemperature({ indoorC: 5, outdoorC: 10, windowType: "single" })).toBeGreaterThan(5);
  });
});

describe("assessCondensationRisk", () => {
  const base = { measurement: measured, windowType: "single" as const, now: NOW };

  it("홑유리 한파(최저 -5°C)는 위험(가), 가장 위험한 시각은 최저 기온 시각", () => {
    const result = assessCondensationRisk({ ...base, forecast: forecast(48, (h) => ({ temperature: h === 20 ? -5 : 3 })) });
    expect(result.status).toBe("risk");
    if (result.status !== "risk") return;
    expect(result.condition).toBe("surface");
    expect(result.riskAt).toBe(new Date(NOW.getTime() + 20 * 3_600_000).toISOString());
    expect(result.outdoorC).toBe(-5);
    expect(result.dewPointC).toBeCloseTo(12.0, 1);
    expect(result.surfaceC).toBeCloseTo(1.15, 2);
    expect(result.marginC).toBeCloseTo(1.15 - 12.0, 1);
  });

  it("이중유리 온화(최저 5°C)는 위험 아님", () => {
    const result = assessCondensationRisk({ ...base, windowType: "double", forecast: forecast(48, () => ({ temperature: 5 })) });
    expect(result.status).toBe("safe");
  });

  it("표면 온도가 이슬점 + 1°C와 딱 같으면 위험(이하)", () => {
    const dew = dewPoint(20, 60);
    const k = RISK_RULES.insideSurfaceResistance * RISK_RULES.uValue.single;
    const outdoorC = 20 - (20 - (dew + RISK_RULES.surfaceMarginC)) / k;
    const result = assessCondensationRisk({ ...base, forecast: forecast(48, () => ({ temperature: outdoorC })) });
    expect(result.status).toBe("risk");
  });

  it("조건 나: 실내 70% 이상이고 습한 시각이 12시간이면 위험, 11시간이면 아님", () => {
    const humidMeasurement = { ...measured, temperatureC: 24, humidityPct: 70 };
    const warm = (humidHours: number) => forecast(48, (h) => ({ temperature: 23, humidity: h <= humidHours ? 85 : 50 }));
    const twelve = assessCondensationRisk({ ...base, windowType: "double", measurement: humidMeasurement, forecast: warm(12) });
    expect(twelve.status).toBe("risk");
    if (twelve.status === "risk") {
      expect(twelve.condition).toBe("humidity");
      expect(twelve.humidHours).toBe(12);
    }
    const eleven = assessCondensationRisk({ ...base, windowType: "double", measurement: humidMeasurement, forecast: warm(11) });
    expect(eleven.status).toBe("safe");
  });

  it("조건 나의 가장 위험한 시각은 가장 추운 시각이 아니라 첫 습한 시각(리뷰 1번)", () => {
    const humidMeasurement = { ...measured, temperatureC: 24, humidityPct: 75 };
    // 3~14시간 뒤가 습하고, 가장 추운 때는 40시간 뒤
    const hours = forecast(48, (h) => ({ temperature: h === 40 ? 18 : 23, humidity: h >= 3 && h <= 14 ? 90 : 50 }));
    const result = assessCondensationRisk({ ...base, windowType: "double", measurement: humidMeasurement, forecast: hours });
    expect(result.status).toBe("risk");
    if (result.status === "risk") {
      expect(result.condition).toBe("humidity");
      expect(result.riskAt).toBe(new Date(NOW.getTime() + 3 * 3_600_000).toISOString());
    }
  });

  it("습도 0% 측정값도 숫자로 계산하고 안전(리뷰 3번)", () => {
    const dry = assessCondensationRisk({ ...base, measurement: { ...measured, humidityPct: 0 }, forecast: forecast(48, () => ({ temperature: -10 })) });
    expect(dry.status).toBe("safe");
    if (dry.status === "safe") expect(Number.isFinite(dry.dewPointC)).toBe(true);
  });

  it("조건 나: 비·눈 예보 시각도 습한 시각으로 센다", () => {
    const humidMeasurement = { ...measured, temperatureC: 24, humidityPct: 75 };
    const rainy = forecast(48, (h) => ({ temperature: 23, humidity: 60, precipitationType: h <= 12 ? 1 : 0 }));
    expect(assessCondensationRisk({ ...base, windowType: "double", measurement: humidMeasurement, forecast: rainy }).status).toBe("risk");
  });

  it("실내 습도가 69%면 습한 날이 이어져도 조건 나는 아님", () => {
    const humidMeasurement = { ...measured, temperatureC: 24, humidityPct: 69 };
    const humid = forecast(48, () => ({ temperature: 23, humidity: 90 }));
    expect(assessCondensationRisk({ ...base, windowType: "double", measurement: humidMeasurement, forecast: humid }).status).toBe("safe");
  });

  it("측정값이 없으면 판단하지 않는다", () => {
    const result = assessCondensationRisk({ ...base, measurement: null, forecast: forecast(48, () => ({ temperature: -10 })) });
    expect(result.status).toBe("no_measurement");
  });

  it("측정값이 7일 넘게 지나면 판단하지 않는다(딱 7일은 씀)", () => {
    const sevenDays = new Date(NOW.getTime() - 7 * 86_400_000).toISOString();
    const older = new Date(NOW.getTime() - 7 * 86_400_000 - 60_000).toISOString();
    const cold = forecast(48, () => ({ temperature: -10 }));
    expect(assessCondensationRisk({ ...base, measurement: { ...measured, measuredAt: sevenDays }, forecast: cold }).status).toBe("risk");
    expect(assessCondensationRisk({ ...base, measurement: { ...measured, measuredAt: older }, forecast: cold }).status).toBe("stale_measurement");
  });

  it("48시간 뒤 예보와 지난 시각은 보지 않는다", () => {
    const result = assessCondensationRisk({ ...base, forecast: forecast(60, (h) => ({ temperature: h > 48 ? -10 : 15 })) });
    expect(result.status).toBe("safe");
    if (result.status === "safe") expect(result.forecastHours).toBe(48);
  });

  it("예보가 48시간보다 짧으면 받은 시간까지만 보고 그 수를 알려 준다", () => {
    const result = assessCondensationRisk({ ...base, forecast: forecast(30, () => ({ temperature: -5 })) });
    expect(result.status).toBe("risk");
    if (result.status === "risk") expect(result.forecastHours).toBe(30);
  });

  it("값이 빈 시각은 건너뛰고, 쓸 수 있는 시각이 없으면 no_forecast", () => {
    const someEmpty = forecast(48, (h) => ({ temperature: h % 2 === 0 ? null : 15 }));
    const partial = assessCondensationRisk({ ...base, forecast: someEmpty });
    expect(partial.status).toBe("safe");
    if (partial.status === "safe") expect(partial.forecastHours).toBe(24);
    const empty = assessCondensationRisk({ ...base, forecast: forecast(48, () => ({ temperature: null })) });
    expect(empty.status).toBe("no_forecast");
  });

  it("습도 100%면 바깥이 조금만 추워도 위험", () => {
    const wet = { ...measured, temperatureC: 20, humidityPct: 100 };
    const result = assessCondensationRisk({ ...base, windowType: "double", measurement: wet, forecast: forecast(48, () => ({ temperature: 18 })) });
    expect(result.status).toBe("risk");
  });
});

describe("sameRiskWindow (Q16: 첫 위험 시각부터 48시간)", () => {
  const start = "2026-11-18T12:00:00.000Z";
  it("시작 +47시간은 같은 창, +48시간부터는 새 창", () => {
    expect(sameRiskWindow(start, "2026-11-20T11:00:00.000Z")).toBe(true);
    expect(sameRiskWindow(start, "2026-11-20T12:00:00.000Z")).toBe(false);
  });
  it("시작보다 앞선 시각도 48시간 안이면 같은 창", () => {
    expect(sameRiskWindow(start, "2026-11-18T09:00:00.000Z")).toBe(true);
  });
});

describe("isMoreSevere", () => {
  it("여유(표면 − 이슬점)가 더 작으면 더 위험", () => {
    expect(isMoreSevere({ marginC: -5 }, { marginC: -7 })).toBe(true);
    expect(isMoreSevere({ marginC: -5 }, { marginC: -5 })).toBe(false);
    expect(isMoreSevere({ marginC: -5 }, { marginC: -3 })).toBe(false);
  });
});
