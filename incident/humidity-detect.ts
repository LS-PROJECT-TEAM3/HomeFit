import {
  assessCondensationRisk, isMoreSevere, sameRiskWindow,
  type HourlyForecast, type Measurement, type RiskAssessment, type WindowType,
} from "@/incident/condensation";
import { toKstDate } from "@/watch/kst";

// FR-004, FR-005 (spec 003): 예보를 읽은 뒤 내 집마다 습도·결로 사건을 새로 만들지, 갱신할지, 건너뛸지 정한다. 순수 함수

export type HomeForCheck = {
  homeId: string;
  userId: string;
  sigunguCode: string;
  windowType: WindowType;
  measurement: Measurement | null;
};

/** 같은 집의 습도 사건(최근 것). 승인·거절된 것도 같은 48시간 판단에 쓴다 */
export type OpenHumidityIncident = { id: string; homeId: string; windowStart: string; marginC: number; status: string };

/** 사건 상세에 그대로 보일 판단 근거(그때 값). AI 글이 덮지 않는다 */
export type HumidityFacts = {
  kind: "humidity";
  title: string;
  /** 승인하면 일정 마감일(가장 위험한 시각 전날, 오늘보다 앞이면 오늘) */
  dueDate: string;
  riskAt: string;
  windowStart: string;
  condition: "surface" | "humidity";
  windowType: WindowType;
  sigunguCode: string;
  measurement: Measurement;
  outdoorC: number;
  outdoorHumidity: number | null;
  surfaceC: number;
  dewPointC: number;
  marginC: number;
  forecastHours: number;
  humidHours: number;
};

export type PlannedHumidityIncident = { userId: string; homeId: string; dedupKey: string; facts: HumidityFacts };
export type HumidityUpdate = { incidentId: string; facts: HumidityFacts };
type SkipReason = Exclude<RiskAssessment["status"], "risk"> | "same_window";

export type HumidityPlan = {
  create: PlannedHumidityIncident[];
  update: HumidityUpdate[];
  counts: Record<SkipReason, number>;
};

type PlanInput = {
  homes: readonly HomeForCheck[];
  forecastBySigungu: ReadonlyMap<string, readonly HourlyForecast[]>;
  openIncidents: readonly OpenHumidityIncident[];
  now: Date;
};

const DAY_MS = 86_400_000;
const OPEN_STATUSES = new Set(["new", "pending"]);

function kstLabel(iso: string): string {
  const kst = new Date(Date.parse(iso) + 9 * 3_600_000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${String(kst.getUTCHours()).padStart(2, "0")}시`;
}

function dueDateFor(riskAt: string, now: Date): string {
  const dayBefore = toKstDate(new Date(Date.parse(riskAt) - DAY_MS));
  const today = toKstDate(now);
  return dayBefore < today ? today : dayBefore;
}

function factsFor(home: HomeForCheck, risk: Extract<RiskAssessment, { status: "risk" }>, windowStart: string, now: Date): HumidityFacts {
  const word = risk.condition === "surface" ? "결로 위험" : "습도 위험";
  return {
    kind: "humidity", title: `${word}: ${kstLabel(risk.riskAt)}`, dueDate: dueDateFor(risk.riskAt, now), windowStart,
    windowType: home.windowType, sigunguCode: home.sigunguCode, measurement: home.measurement as Measurement,
    riskAt: risk.riskAt, condition: risk.condition, outdoorC: risk.outdoorC, outdoorHumidity: risk.outdoorHumidity,
    surfaceC: risk.surfaceC, dewPointC: risk.dewPointC, marginC: risk.marginC, forecastHours: risk.forecastHours, humidHours: risk.humidHours,
  };
}

/** 같은 집의 사건 중 이번 위험 시각과 같은 48시간 창에 있는 것(가장 최근 창) */
function sameWindowIncident(open: readonly OpenHumidityIncident[], homeId: string, riskAt: string) {
  return open
    .filter((incident) => incident.homeId === homeId && sameRiskWindow(incident.windowStart, riskAt))
    .sort((a, b) => b.windowStart.localeCompare(a.windowStart))[0];
}

export function planHumidityIncidents({ homes, forecastBySigungu, openIncidents, now }: PlanInput): HumidityPlan {
  const plan: HumidityPlan = { create: [], update: [], counts: { no_measurement: 0, stale_measurement: 0, no_forecast: 0, safe: 0, same_window: 0 } };
  for (const home of homes) {
    const forecast = forecastBySigungu.get(home.sigunguCode) ?? [];
    const risk = assessCondensationRisk({ measurement: home.measurement, windowType: home.windowType, forecast, now });
    if (risk.status !== "risk") {
      plan.counts[risk.status] += 1;
      continue;
    }
    const existing = sameWindowIncident(openIncidents, home.homeId, risk.riskAt);
    if (!existing) {
      plan.create.push({ userId: home.userId, homeId: home.homeId, dedupKey: `humidity|${home.homeId}|${risk.riskAt}`, facts: factsFor(home, risk, risk.riskAt, now) });
      continue;
    }
    // 문제정의 "위험이 커지면 기존 사건을 갱신". 승인·거절된 사건은 바꾸지 않는다
    if (OPEN_STATUSES.has(existing.status) && isMoreSevere(existing, risk)) {
      plan.update.push({ incidentId: existing.id, facts: factsFor(home, risk, existing.windowStart, now) });
      continue;
    }
    plan.counts.same_window += 1;
  }
  return plan;
}
