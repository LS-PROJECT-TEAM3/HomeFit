import { countAlertGroups } from "@/incident/home-dashboard";
import type { HumidityFacts } from "@/incident/humidity-detect";
import { listMyMatchedNotices } from "@/incident/notices.server";
import { listSchedule, type ScheduleItem } from "@/incident/schedule.server";
import { createClient } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { fetchSigunguList } from "@/watch/region.server";
import { loadMyHome, type MyHome, type MyMeasurement } from "./my/home/load";

// spec 003 v0.2 FR-010: 홈 카드 5개가 읽는 자료. 로그인한 사용자 권한(RLS)으로 읽고, 내 것만 거른다.
// 읽기 실패는 던져서 화면이 "조회 실패"를 보이게 한다(빈 값으로 숨기지 않음, P3-12)

export type RecentAlert = { id: string; title: string; status: string; kind: "risk" | "opportunity"; detectedAt: string };

export type HomeDashboard = {
  home: MyHome | null;
  sigunguName: string | null;
  latestMeasurement: MyMeasurement | null;
  /** 최근 측정값(최신이 앞). 습도 추이 그래프 (spec 004 v0.2 FR-006) */
  measurements: MyMeasurement[];
  /** 최근 알림 5건 타임라인 */
  recentAlerts: RecentAlert[];
  /** 열린 습도·결로 위험 중 가장 가까운 것 */
  openRisk: { id: string; title: string; riskAt: string } | null;
  lastWeatherCheckAt: string | null;
  alerts: { newRisk: number; newOpportunity: number; pending: number };
  recent: { approved: number; rejected: number };
  hasCondition: boolean;
  toDecide: number;
  schedule: ScheduleItem[];
};

const RECENT_DAYS_MS = 30 * 86_400_000;

/** 시군구 코드 → 이름. 목록을 못 불러오면 이름 없이 둔다(카드는 그대로) */
async function sigunguName(code: string): Promise<string | null> {
  try {
    return (await fetchSigunguList(code.slice(0, 2))).find((item) => item.code === code)?.name ?? null;
  } catch {
    return null;
  }
}

async function loadAlerts(userId: string, now: Date) {
  const supabase = await createClient();
  const since = new Date(now.getTime() - RECENT_DAYS_MS).toISOString();
  const [open, closed, weather, recent] = await Promise.all([
    supabase.from("incidents").select("id, incident_type, status, facts").eq("user_id", userId).in("status", ["new", "pending"]),
    supabase.from("incidents").select("status").eq("user_id", userId).in("status", ["approved", "rejected"]).gte("closed_at", since),
    supabase.rpc("collection_status", { p_source: "kma_forecast" }),
    supabase.from("incidents").select("id, incident_type, status, facts, detected_at").eq("user_id", userId).order("detected_at", { ascending: false }).limit(5),
  ]);
  if (open.error || closed.error || weather.error || recent.error) throw new Error("알림 현황을 불러오지 못했습니다.");
  const risks = open.data
    .filter((row) => row.incident_type === "humidity_condensation")
    .map((row) => ({ id: row.id, ...(row.facts as unknown as Pick<HumidityFacts, "title" | "riskAt">) }))
    .filter((risk) => Date.parse(risk.riskAt) > now.getTime())
    .sort((a, b) => a.riskAt.localeCompare(b.riskAt));
  return {
    alerts: countAlertGroups(open.data.map((row) => ({ incidentType: row.incident_type, status: row.status }))),
    recent: { approved: closed.data.filter((row) => row.status === "approved").length, rejected: closed.data.filter((row) => row.status === "rejected").length },
    openRisk: risks[0] ? { id: risks[0].id, title: risks[0].title, riskAt: risks[0].riskAt } : null,
    lastWeatherCheckAt: weather.data[0]?.last_success_at ?? null,
    recentAlerts: recent.data.map((row) => ({
      id: row.id, title: (row.facts as { title?: string }).title ?? "알림", status: row.status, detectedAt: row.detected_at,
      kind: row.incident_type === "housing_support" ? ("opportunity" as const) : ("risk" as const),
    })),
  };
}

export async function loadHomeDashboard(userId: string, now: Date): Promise<HomeDashboard> {
  const [mine, alerts, matched, schedule] = await Promise.all([
    loadMyHome(userId), loadAlerts(userId, now), listMyMatchedNotices(toKstDate(now)), listSchedule(3),
  ]);
  const open = matched.items.filter((item) => !item.expired);
  return {
    home: mine.home,
    sigunguName: mine.home ? await sigunguName(mine.home.sigunguCode) : null,
    latestMeasurement: mine.measurements[0] ?? null,
    measurements: mine.measurements,
    ...alerts,
    hasCondition: matched.hasCondition,
    toDecide: open.filter((item) => item.decision === "new").length,
    schedule,
  };
}
