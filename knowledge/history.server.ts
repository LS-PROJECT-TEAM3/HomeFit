import { callLlm, newCallContext } from "@/lib/llm/call.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildChatPrompt, CHAT_JSON_SCHEMA, parseChatAnswer } from "@/knowledge/chat";
import { findRecords, HISTORY_NOT_FOUND, HISTORY_SYSTEM_PROMPT, toHistoryRecords, type ClosedIncidentRow } from "@/knowledge/history";

// spec 005 FR-006 (PRD FR-18): 기록 찾기. 내 끝난 알림은 로그인 사용자 권한(RLS)으로 읽는다. AI에는 이메일·회원 ID를 보내지 않는다

const MAX_CLOSED = 50;

export type HistoryHit = { title: string; text: string; href?: string };
export type HistoryAnswer = { hits: HistoryHit[]; answer: string | null; aiFailed: boolean };

async function loadClosedRows(userId: string): Promise<ClosedIncidentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, status, incident_type, facts, closed_at")
    .eq("user_id", userId)
    .in("status", ["approved", "rejected"])
    .order("closed_at", { ascending: false })
    .limit(MAX_CLOSED);
  if (error) throw new Error("처리 기록을 읽지 못했습니다.");
  if (data.length === 0) return [];
  const ids = data.map((row) => row.id);
  const [plans, actions] = await Promise.all([
    supabase.from("response_plans").select("incident_id, checklist").in("incident_id", ids),
    supabase.from("incident_actions").select("incident_id, action, reason").in("incident_id", ids),
  ]);
  if (plans.error || actions.error) throw new Error("처리 기록을 읽지 못했습니다.");
  const todoOf = new Map(plans.data.map((p) => [p.incident_id, (p.checklist as { label: string }[]).map((c) => c.label)]));
  const reasonOf = new Map(actions.data.filter((a) => a.action === "reject").map((a) => [a.incident_id, a.reason]));
  return data.map((row) => ({
    id: row.id, status: row.status, incidentType: row.incident_type, closedAt: row.closed_at,
    title: (row.facts as { title?: string }).title ?? "알림", reason: reasonOf.get(row.id) ?? null, todo: todoOf.get(row.id) ?? [],
  }));
}

/** 찾은 기록은 늘 보이고, 찾은 것이 있을 때만 AI 답을 붙인다(E6). AI가 실패해도 찾은 기록은 보인다 */
export async function searchHistory(userId: string, question: string): Promise<HistoryAnswer> {
  const picked = findRecords(question, toHistoryRecords(await loadClosedRows(userId)));
  const hits = picked.map((r) => ({ title: r.title, text: r.text, href: r.href }));
  if (picked.length === 0) return { hits, answer: HISTORY_NOT_FOUND, aiFailed: false };
  const result = await callLlm(createAdminClient(), {
    request: { purpose: "chat_answer", system: HISTORY_SYSTEM_PROMPT, prompt: buildChatPrompt(question, picked), schema: CHAT_JSON_SCHEMA as unknown as Record<string, unknown>, maxOutputTokens: 2000 },
    parse: (raw) => parseChatAnswer(raw, new Set(picked.map((s) => s.id))),
    ctx: newCallContext(null),
  });
  return result.ok ? { hits, answer: result.data.answer, aiFailed: false } : { hits, answer: null, aiFailed: true };
}
