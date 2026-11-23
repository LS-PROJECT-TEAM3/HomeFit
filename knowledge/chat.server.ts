import { loadMyHome } from "@/app/(main)/my/home/load";
import { parseChecklist } from "@/incident/move-in-checklist";
import type { DefectKind } from "@/incident/defect-form";
import { listMyMatchedNotices } from "@/incident/notices.server";
import { listMyPolicies } from "@/incident/policies.server";
import { listSchedule } from "@/incident/schedule.server";
import { callLlm, newCallContext } from "@/lib/llm/call.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { defectSource, interestHomeSource, policySource } from "@/knowledge/chat-sources";
import { buildChatPrompt, CHAT_JSON_SCHEMA, CHAT_SYSTEM_PROMPT, parseChatAnswer, rankSources, sourceLabel, type ChatSource } from "@/knowledge/chat";
import { rejectReasonByIncident } from "@/incident/actions-history";

// spec 004 v0.3 FR-007: 챗봇 답. 내 처리 기록은 로그인 사용자 권한(RLS)으로, 예보는 내 집 시군구 것만 서버 권한으로 읽는다

const STATUS_TEXT: Record<string, string> = { new: "새 알림", pending: "승인 대기", approved: "승인함", rejected: "거절함" };
const MAX_SOURCES = 6;
const NOT_FOUND = "내 기록과 공공데이터에서 찾지 못했습니다.";

export type ChatReply = { answer: string; sources: { label: string; title: string; href?: string }[]; isMock: boolean };

async function alertSources(userId: string): Promise<ChatSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, status, facts, detected_at")
    .eq("user_id", userId)
    .order("detected_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("처리 기록을 읽지 못했습니다.");
  if (data.length === 0) return [];
  const ids = data.map((row) => row.id);
  const [plans, actions] = await Promise.all([
    supabase.from("response_plans").select("incident_id, checklist").in("incident_id", ids),
    supabase.from("incident_actions").select("incident_id, action, reason").in("incident_id", ids).order("created_at"),
  ]);
  if (plans.error || actions.error) throw new Error("처리 기록을 읽지 못했습니다.");
  const checklistOf = new Map(plans.data.map((p) => [p.incident_id, p.checklist as { label: string }[]]));
  const rejectOf = rejectReasonByIncident(actions.data); // spec 023: 거절 취소 뒤 다시 거절하면 마지막 사유
  return data.map((row, i) => {
    const facts = row.facts as { title?: string; applyEnd?: string | null; surfaceC?: number; dewPointC?: number };
    const checklist = checklistOf.get(row.id);
    const reason = rejectOf.get(row.id);
    const parts = [
      `상태 ${STATUS_TEXT[row.status] ?? row.status}${reason ? `(거절 사유: ${reason})` : ""}`,
      `알림 날짜 ${toKstDate(new Date(row.detected_at))}`,
      facts.applyEnd ? `접수 마감 ${facts.applyEnd}` : "",
      typeof facts.surfaceC === "number" ? `창 표면 ${facts.surfaceC.toFixed(1)}°C(추정), 이슬점 ${facts.dewPointC?.toFixed(1)}°C` : "",
      checklist ? `할 일: ${checklist.map((c) => c.label).join(", ")}` : "",
    ].filter(Boolean);
    return { id: `A${i + 1}`, kind: "alert" as const, title: facts.title ?? "알림", text: parts.join(" · "), href: `/incidents/${row.id}` };
  });
}

async function scheduleSources(): Promise<ChatSource[]> {
  return (await listSchedule(10)).map((item, i) => ({
    id: `C${i + 1}`, kind: "schedule" as const, title: item.title, href: `/schedule/${item.id}`,
    text: `마감 ${item.dueDate ?? "없음"} · 할 일 ${item.checklist.filter((c) => c.done).length}/${item.checklist.length} 완료: ${item.checklist.map((c) => c.label).join(", ")}`,
  }));
}

async function noticeSources(today: string): Promise<ChatSource[]> {
  const matched = await listMyMatchedNotices(today);
  return matched.items.filter((item) => !item.expired).slice(0, 30).map((item, i) => ({
    id: `N${i + 1}`, kind: "notice" as const, title: item.notice.title, href: `/notices/${encodeURIComponent(item.notice.announcementId)}`,
    text: `공급 유형 ${item.notice.supplyType ?? "공고문 확인"} · 접수 시작 ${item.notice.applyStart ?? "공고문 확인"} · 접수 마감(신청 마감일) ${item.notice.applyEnd ?? "공고문 확인"} · 월 임대료 ${item.notice.monthlyRent ? `${item.notice.monthlyRent.toLocaleString("ko-KR")}원부터` : "공고문 확인"} · 팔로우 ${item.decision === "follow" ? "함" : item.decision === "ignore" ? "관심 없음" : "아직"}`,
  }));
}

/** 내 집과 내 시군구의 앞으로 48시간 예보 요약(실제 예보만, 시뮬레이션 제외) */
async function homeAndForecastSources(userId: string, now: Date): Promise<ChatSource[]> {
  const { home, measurements } = await loadMyHome(userId);
  if (!home) return [];
  const latest = measurements[0];
  const homeText = [
    `주택 유형 ${home.housingType}, 전용 ${home.exclusiveAreaM2}㎡, 창 ${home.windowType}`,
    home.monthlyRent !== null ? `월세 ${home.monthlyRent.toLocaleString("ko-KR")}원` : "",
    home.maintenanceFee !== null ? `관리비 ${home.maintenanceFee.toLocaleString("ko-KR")}원` : "",
    home.contractEndDate ? `계약 만료 ${home.contractEndDate}` : "",
    latest ? `최근 실내 ${latest.temperatureC}°C·습도 ${latest.humidityPct}%(${toKstDate(new Date(latest.measuredAt))})` : "실내 온습도 측정값 없음",
  ].filter(Boolean).join(" · ");
  const result: ChatSource[] = [{ id: "H1", kind: "home", title: "내 집", text: homeText, href: "/my/home" }];
  const { data } = await createAdminClient()
    .from("observations")
    .select("metric, value_numeric, observed_at")
    .eq("source_code", "kma_forecast").eq("target", home.sigunguCode).eq("is_simulated", false)
    .gt("observed_at", now.toISOString()).lte("observed_at", new Date(now.getTime() + 48 * 3_600_000).toISOString())
    .in("metric", ["temperature", "humidity"]);
  const temps = (data ?? []).filter((r) => r.metric === "temperature").map((r) => Number(r.value_numeric));
  const hums = (data ?? []).filter((r) => r.metric === "humidity").map((r) => Number(r.value_numeric));
  if (temps.length > 0) {
    result.push({ id: "W1", kind: "forecast", title: "기상청 단기예보(내 시군구, 앞으로 48시간)", text: `최저 기온 ${Math.min(...temps)}°C, 최고 기온 ${Math.max(...temps)}°C, 최고 습도 ${hums.length ? Math.max(...hums) : "?"}%` });
  }
  return result;
}

/** v0.5: 내 조건에 맞는 청년 주거 정책(조건이 없으면 없음) */
async function policySources(today: string): Promise<ChatSource[]> {
  const { items } = await listMyPolicies(today);
  return items.slice(0, 30).map((item, i) => policySource(item.policy, i));
}

/** v0.5: 관심 주택과 입주 전 점검. 로그인 사용자 권한(RLS)으로 내 것만 */
async function interestHomeSources(userId: string, month: number): Promise<ChatSource[]> {
  const { data, error } = await (await createClient())
    .from("interest_homes")
    .select("id, name, housing_type, deposit, monthly_rent, maintenance_fee, energy_cost, electricity_kwh, transit_fare, trips_per_day, commute_days, move_in_checklist, move_in_note")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error("관심 주택을 읽지 못했습니다.");
  return data.map((r, index) => interestHomeSource({
    id: r.id, name: r.name, housingType: r.housing_type, deposit: r.deposit, monthlyRent: r.monthly_rent, maintenanceFee: r.maintenance_fee,
    energyCost: r.energy_cost, electricityKwh: r.electricity_kwh, transitFare: r.transit_fare, tripsPerDay: r.trips_per_day, commuteDays: r.commute_days,
    checklist: parseChecklist(r.move_in_checklist), note: r.move_in_note,
  }, { index, month }));
}

/** v0.5: 내 집 하자 기록 최근 20건. 사진은 있는지만 */
async function defectSources(userId: string): Promise<ChatSource[]> {
  const supabase = await createClient();
  const { data: home, error: homeError } = await supabase.from("homes").select("id").eq("user_id", userId).maybeSingle();
  if (homeError) throw new Error("내 집을 읽지 못했습니다.");
  if (!home) return [];
  const { data, error } = await supabase.from("defect_records").select("occurred_on, kind, memo, photo_path").eq("home_id", home.id).order("occurred_on", { ascending: false }).limit(20);
  if (error) throw new Error("하자 기록을 읽지 못했습니다.");
  return data.map((r, i) => defectSource({ occurredOn: r.occurred_on, kind: r.kind as DefectKind, memo: r.memo, hasPhoto: r.photo_path !== null }, i));
}

export async function answerChat(userId: string, question: string, now: Date): Promise<ChatReply> {
  const today = toKstDate(now);
  const month = Number(today.slice(5, 7));
  // 서로 기다릴 필요가 없어 한꺼번에 읽는다
  const groups = await Promise.all([
    alertSources(userId), scheduleSources(), noticeSources(today), homeAndForecastSources(userId, now),
    policySources(today), interestHomeSources(userId, month), defectSources(userId),
  ]);
  const all = groups.flat();
  const picked = rankSources(question, all, MAX_SOURCES);
  if (picked.length === 0) return { answer: NOT_FOUND, sources: [], isMock: false };
  const result = await callLlm(createAdminClient(), {
    request: { purpose: "chat_answer", system: CHAT_SYSTEM_PROMPT, prompt: buildChatPrompt(question, picked), schema: CHAT_JSON_SCHEMA as unknown as Record<string, unknown>, maxOutputTokens: 2000 },
    parse: (raw) => parseChatAnswer(raw, new Set(picked.map((s) => s.id))),
    ctx: newCallContext(null),
  });
  if (!result.ok) throw new Error("답을 만들지 못했습니다.");
  const used = picked.filter((s) => result.data.sourceIds.includes(s.id));
  return {
    answer: result.data.answer,
    sources: used.map((s) => ({ label: sourceLabel(s.kind), title: s.title, href: s.href })),
    isMock: result.provider === "mock",
  };
}
