import { isSimulatedNotice, parseVirtualUserIds } from "@/watch/simulation";
import { listMatchedNotices, type FollowDecision, type MatchedNotice } from "@/incident/matched";
import { applyOverride, supplyTypeCounts, type ConditionOverride } from "@/incident/notice-list";
import type { IncidentFacts } from "@/incident/detect";
import type { PolicyCondition, TargetGroup } from "@/incident/match";
import { createClient, requireUserId } from "@/lib/supabase/server";
import type { Notice } from "@/watch/notice";

// 너무 오래 전에 끝난 공고까지 읽지 않는다(목록 끝 "마감" 공고는 최근 30일만)
const EXPIRED_DAYS_SHOWN = 30;

function daysBefore(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function myCondition(userId: string): Promise<PolicyCondition | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("policy_conditions")
    .select("sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("조건을 불러오지 못했습니다.");
  if (!data) return null;
  return { sidoCode: data.sido_code, sigunguCode: data.sigungu_code, supplyTypes: data.supply_types, maxMonthlyRent: data.max_monthly_rent, age: data.age, targetGroups: data.target_groups as TargetGroup[] };
}

export type MatchedResult =
  | { hasCondition: false; items: [] }
  | { hasCondition: true; items: MatchedNotice[]; saved: PolicyCondition; condition: PolicyCondition; typeCounts: Record<string, number> };

/**
 * FR-017 (spec 001 v0.2): 내 맞는 공고. 저장하지 않고 공고와 조건을 그때그때 비교한다(ERD 계산 값).
 * 공고는 공개 자료라 로그인 사용자 모두 읽는다(마이그레이션 0005).
 * spec 022(v2-s3-pc): override는 목록에서 잠깐 바꾼 조건(조건 고정을 끈 때). 저장된 조건은 그대로 둔다
 */
export async function listMyMatchedNotices(today: string, override: ConditionOverride = {}): Promise<MatchedResult> {
  const userId = await requireUserId();
  const saved = await myCondition(userId);
  if (!saved) return { hasCondition: false, items: [] };
  const condition = applyOverride(saved, override);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("source_items")
    .select("raw")
    .eq("source_code", "myhome_notice")
    // spec 001 v0.6: 전세임대(시군구 없음)는 전국 공고라 시도와 상관없이 가져와 matchesCondition이 고른다
    .or(`sido_code.eq.${condition.sidoCode},supply_type.eq.전세임대`)
    .or(`apply_end.is.null,apply_end.gte.${daysBefore(today, EXPIRED_DAYS_SHOWN)}`)
    .limit(1000);
  if (error) throw new Error("맞는 공고를 불러오지 못했습니다.");
  // 사용자 결정(2026-11-18): 실제 계정에는 가짜 공고(SIM-)를 보이지 않는다. 가상 계정만 본다
  const virtual = parseVirtualUserIds(process.env.SIMULATION_USER_IDS).has(userId);
  const notices = data
    .map((row) => row.raw as unknown as Notice) // raw는 Notice로 저장했다 (watch/source-items.server.ts)
    .filter((notice) => virtual || !isSimulatedNotice(notice.externalId));
  // FR-020 (spec 001 v0.5): 내 팔로우·관심 없음
  const follows = await supabase.from("notice_follows").select("announcement_id, decision").eq("user_id", userId).eq("source_code", "myhome_notice");
  if (follows.error) throw new Error("맞는 공고를 불러오지 못했습니다.");
  const decisions = new Map(follows.data.map((row) => [row.announcement_id, row.decision as FollowDecision]));
  return { hasCondition: true, items: listMatchedNotices({ notices, condition, today, decisions }), saved, condition, typeCounts: supplyTypeCounts(notices, condition) };
}

/** facts.change: 무엇이 바뀌었나(카드 제목·한 줄 설명). detectedAt·closedAt은 확인한 때·처리한 때 */
export type NoticeIncident = { id: string; status: string; change: IncidentFacts["change"]; detectedAt: string; closedAt: string | null };
export type NoticeDetail = { notices: Notice[]; myIncidents: NoticeIncident[]; myDecision: FollowDecision | null; myScheduleId: string | null };

/**
 * FR-017 수용 기준 4·5 (spec 001 v0.4): 공고 하나(단지 여럿)의 원문 값과, 이 공고로 생긴 내 사건.
 * 공고 ID로 찾는다. 외부 ID는 "공고 ID-단지 번호"라서 앞부분으로 찾는다.
 */
export async function getNoticeDetail(announcementId: string): Promise<NoticeDetail | null> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const [items, incidents, follow, schedule] = await Promise.all([
    supabase.from("source_items").select("raw").eq("source_code", "myhome_notice").like("external_id", `${announcementId}-%`).limit(50),
    supabase.from("incidents").select("id, status, facts, detected_at, closed_at").eq("user_id", userId).eq("facts->>announcementId", announcementId).order("detected_at", { ascending: false }),
    supabase.from("notice_follows").select("decision").eq("user_id", userId).eq("source_code", "myhome_notice").eq("announcement_id", announcementId).maybeSingle(),
    // spec 007 FR-001: 이 공고를 이미 내 일정에 넣었나
    supabase.from("schedule_items").select("id").eq("user_id", userId).eq("source_code", "myhome_notice").eq("announcement_id", announcementId).maybeSingle(),
  ]);
  if (items.error || incidents.error || follow.error || schedule.error) throw new Error("공고를 불러오지 못했습니다.");
  const notices = items.data.map((row) => row.raw as unknown as Notice);
  if (notices.length === 0) return null;
  const myIncidents = incidents.data.map((row) => ({
    id: row.id, status: row.status, change: (row.facts as unknown as IncidentFacts).change, detectedAt: row.detected_at, closedAt: row.closed_at,
  }));
  return { notices, myIncidents, myDecision: (follow.data?.decision as FollowDecision | undefined) ?? null, myScheduleId: schedule.data?.id ?? null };
}
