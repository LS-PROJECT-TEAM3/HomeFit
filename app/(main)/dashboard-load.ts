import { withEstimate } from "@/incident/energy-estimate";
import { loadEstimateBasis } from "@/incident/energy-estimate.server";
import { listMyMatchedNotices } from "@/incident/notices.server";
import { realCost, type RealCost } from "@/incident/real-cost";
import { listSchedule, type ScheduleItem } from "@/incident/schedule.server";
import { createClient } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { fetchSigunguList } from "@/watch/region.server";
import { kstMonth } from "./compare/cost-view";
import { loadMyHome, type MyHome, type MyMeasurement } from "./my/home/load";

// spec 022 FR-011(홈 보드 v2-home-pc): 띠·카드가 읽는 자료. 로그인한 사용자 권한(RLS)으로 읽고, 내 것만 거른다.
// 읽기 실패는 던져서 화면이 "조회 실패"를 보이게 한다(빈 값으로 숨기지 않음, P3-12)

export type HomeAlert = { id: string; title: string; kind: "risk" | "opportunity"; detectedAt: string };

export type HomeDashboard = {
  home: MyHome | null;
  sigunguName: string | null;
  latestMeasurement: MyMeasurement | null;
  /** 확인할 일 = 새 알림(status new). 위쪽 메뉴 알림 배지와 같은 수 (사용자 결정 2026-11-21) */
  newAlerts: HomeAlert[];
  schedule: ScheduleItem[];
  hasCondition: boolean;
  /** 아직 정하지 않은 맞춤 공고 수와 그중 첫 공고 이름 */
  newNotices: { count: number; firstTitle: string | null };
  /** 월 실질 주거비(월세 + 관리비 + 에너지비). 월세를 모르면 null */
  cost: RealCost | null;
};

/** 시군구 코드 → 이름. 목록을 못 불러오면 이름 없이 둔다(카드는 그대로) */
async function sigunguName(code: string): Promise<string | null> {
  try {
    return (await fetchSigunguList(code.slice(0, 2))).find((item) => item.code === code)?.name ?? null;
  } catch {
    return null;
  }
}

async function loadNewAlerts(userId: string): Promise<HomeAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("incidents").select("id, incident_type, facts, detected_at")
    .eq("user_id", userId).eq("status", "new").order("detected_at", { ascending: false });
  if (error) throw new Error("알림을 불러오지 못했습니다.");
  return data.map((row) => ({
    id: row.id, title: (row.facts as { title?: string }).title ?? "알림", detectedAt: row.detected_at,
    // [GLOSSARY 사건] 위험 = 습도·결로·시세, 주거 기회 = 공고 변화
    kind: row.incident_type === "housing_support" ? ("opportunity" as const) : ("risk" as const),
  }));
}

/**
 * 집 비교와 같은 계산(realCost)으로 월세 + 관리비 + 에너지비. 홈 카드는 교통비를 넣지 않는다(보드 설명 "월세, 관리비, 에너지비를 더한 한 달 비용").
 * 전세면 월세 0. 에너지 추정 근거를 못 불러와도 월세·관리비는 보인다
 */
async function homeCost(home: MyHome, now: Date): Promise<RealCost | null> {
  const rent = home.contractType === "jeonse" ? 0 : home.monthlyRent;
  if (rent === null) return null;
  const mine = { ...home, monthlyRent: rent, transitFare: null };
  let estimated = withEstimate(mine, new Map());
  try {
    const basis = await loadEstimateBasis([mine], now);
    estimated = withEstimate(mine, basis.averages, basis.aptAverages);
  } catch {
    // 추정 근거만 빠지고 패널 전국 평균으로 계산한다(withEstimate 기본)
  }
  return realCost(estimated, kstMonth(now));
}

export async function loadHomeDashboard(userId: string, now: Date): Promise<HomeDashboard> {
  const [mine, newAlerts, matched, schedule] = await Promise.all([
    loadMyHome(userId), loadNewAlerts(userId), listMyMatchedNotices(toKstDate(now)), listSchedule(),
  ]);
  const toDecide = matched.items.filter((item) => !item.expired && item.decision === "new");
  const [name, cost] = mine.home ? await Promise.all([sigunguName(mine.home.sigunguCode), homeCost(mine.home, now)]) : [null, null];
  return {
    home: mine.home,
    sigunguName: name,
    latestMeasurement: mine.measurements[0] ?? null,
    newAlerts,
    schedule,
    hasCondition: matched.hasCondition,
    newNotices: { count: toDecide.length, firstTitle: toDecide[0]?.notice.title ?? null },
    cost,
  };
}
