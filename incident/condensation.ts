// FR-004, FR-005 (spec 003): 습도·결로 위험 계산과 판단. 순수 함수(현재 시각은 인자로 받는다)

export type WindowType = "single" | "double" | "unknown";

/** 기상청 예보 한 시각. 값을 못 읽은 칸은 null */
export type HourlyForecast = {
  forecastAt: string;
  temperature: number | null;
  humidity: number | null;
  precipitationType: number | null;
};

export type Measurement = { temperatureC: number; humidityPct: number; measuredAt: string };

const HOUR_MS = 3_600_000;

/**
 * 판단 기준. spec 003 v0.1 승인 값(Q2·Q4·Q16, 2026-11-17)과 plan 1절 출처.
 * Rsi 0.13 m²K/W(BS EN ISO 6946), 열관류율 홑유리 5.8·이중유리 2.8 W/m²K, 모름은 홑유리(더 위험한 쪽)
 */
export const RISK_RULES = {
  surfaceMarginC: 1,
  humidityThresholdPct: 70,
  outdoorHumidPct: 80,
  humidHoursThreshold: 12,
  horizonHours: 48,
  measurementMaxAgeMs: 7 * 24 * HOUR_MS,
  insideSurfaceResistance: 0.13,
  uValue: { single: 5.8, double: 2.8, unknown: 5.8 } satisfies Record<WindowType, number>,
} as const;

// Magnus 식 계수(물 위, -45~60°C)
const MAGNUS_A = 17.62;
const MAGNUS_B = 243.12;

/** 이슬점(°C). 문제정의 사건 기준 표 "이슬점(Magnus 식)" */
export function dewPoint(temperatureC: number, humidityPct: number): number {
  // 0%면 log(0)이 되어 숫자가 아니게 된다(리뷰 3번). 1% 아래는 결로와 상관없으니 1%로 본다
  const gamma = Math.log(Math.max(humidityPct, 1) / 100) + (MAGNUS_A * temperatureC) / (MAGNUS_B + temperatureC);
  return (MAGNUS_B * gamma) / (MAGNUS_A - gamma);
}

/** 창 안쪽 표면 온도 추정(정상 상태): Tsi = Ti − U·Rsi·(Ti − Te) */
export function surfaceTemperature(input: { indoorC: number; outdoorC: number; windowType: WindowType }): number {
  const factor = RISK_RULES.uValue[input.windowType] * RISK_RULES.insideSurfaceResistance;
  return input.indoorC - factor * (input.indoorC - input.outdoorC);
}

export type RiskDetail = {
  riskAt: string;
  outdoorC: number;
  outdoorHumidity: number | null;
  surfaceC: number;
  dewPointC: number;
  /** 표면 온도 − 이슬점. 작을수록 위험 */
  marginC: number;
  forecastHours: number;
  humidHours: number;
};

export type RiskAssessment =
  | { status: "no_measurement" | "stale_measurement" | "no_forecast" }
  | ({ status: "safe" } & RiskDetail)
  | ({ status: "risk"; condition: "surface" | "humidity" } & RiskDetail);

type AssessInput = {
  measurement: Measurement | null;
  windowType: WindowType;
  forecast: readonly HourlyForecast[];
  now: Date;
};

function upcomingHours(forecast: readonly HourlyForecast[], now: Date) {
  const start = now.getTime();
  const end = start + RISK_RULES.horizonHours * HOUR_MS;
  return forecast.filter((hour) => {
    const at = Date.parse(hour.forecastAt);
    return at > start && at <= end && hour.temperature !== null;
  });
}

function isHumidHour(hour: HourlyForecast): boolean {
  const wet = hour.precipitationType !== null && hour.precipitationType > 0;
  return wet || (hour.humidity !== null && hour.humidity >= RISK_RULES.outdoorHumidPct);
}

/** 앞으로 48시간, 가장 추운(표면 온도가 가장 낮은) 시각을 기준으로 조건 가·나를 본다 */
export function assessCondensationRisk({ measurement, windowType, forecast, now }: AssessInput): RiskAssessment {
  if (!measurement) return { status: "no_measurement" };
  if (now.getTime() - Date.parse(measurement.measuredAt) > RISK_RULES.measurementMaxAgeMs) return { status: "stale_measurement" };
  const hours = upcomingHours(forecast, now);
  if (hours.length === 0) return { status: "no_forecast" };

  const indoorC = measurement.temperatureC;
  const dewPointC = dewPoint(indoorC, measurement.humidityPct);
  const coldest = hours.reduce((low, hour) => ((hour.temperature as number) < (low.temperature as number) ? hour : low));
  const outdoorC = coldest.temperature as number;
  const surfaceC = surfaceTemperature({ indoorC, outdoorC, windowType });
  const detail: RiskDetail = {
    riskAt: coldest.forecastAt, outdoorC, outdoorHumidity: coldest.humidity, surfaceC, dewPointC,
    marginC: surfaceC - dewPointC, forecastHours: hours.length, humidHours: hours.filter(isHumidHour).length,
  };
  // 부동소수 오차로 "딱 같음"이 아님으로 바뀌지 않게 아주 작은 여유를 둔다
  if (detail.marginC <= RISK_RULES.surfaceMarginC + 1e-9) return { status: "risk", condition: "surface", ...detail };
  const humidIndoor = measurement.humidityPct >= RISK_RULES.humidityThresholdPct;
  if (humidIndoor && detail.humidHours >= RISK_RULES.humidHoursThreshold) {
    // 습도 조건은 습한 날이 시작될 때 대응해야 하므로 첫 습한 시각을 쓴다(리뷰 1번). 숫자 칸은 가장 추운 시각 그대로
    const firstHumid = hours.find(isHumidHour) as HourlyForecast;
    return { status: "risk", condition: "humidity", ...detail, riskAt: firstHumid.forecastAt };
  }
  return { status: "safe", ...detail };
}

/** Q16 (spec 003): 첫 위험 시각부터 48시간 안이면 같은 사건 */
export function sameRiskWindow(windowStart: string, riskAt: string): boolean {
  return Math.abs(Date.parse(riskAt) - Date.parse(windowStart)) < RISK_RULES.horizonHours * HOUR_MS;
}

/** 문제정의 "위험이 커지면 기존 사건을 갱신": 여유가 더 작아졌을 때만 */
export function isMoreSevere(previous: { marginC: number }, next: { marginC: number }): boolean {
  return next.marginC < previous.marginC;
}
