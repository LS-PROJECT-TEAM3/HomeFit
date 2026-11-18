// spec 005 FR-005 (PRD FR-20, IA AD_070100_TB): 관리자 회원 목록 요약. 순수 함수, 읽기만
import { toKstDate } from "@/watch/kst";

// 이메일은 auth 쪽에 있고 화면 권한으로 읽지 않는다. 회원 ID 앞 8자만 보인다

export type MemberSummary = {
  id: string; shortId: string; role: string; joinedOn: string;
  hasCondition: boolean; hasHome: boolean; incidents: number; waiting: number; isVirtual: boolean;
};

type Input = {
  profiles: readonly { id: string; role: string; created_at: string }[];
  conditionUserIds: readonly string[];
  homeUserIds: readonly string[];
  incidents: readonly { user_id: string; status: string }[];
  virtualIds: ReadonlySet<string>;
};

// 사용자 결정을 기다리는 상태(새 알림·승인 대기)
const WAITING = new Set(["new", "pending"]);

export function summarizeMembers({ profiles, conditionUserIds, homeUserIds, incidents, virtualIds }: Input): MemberSummary[] {
  const conditions = new Set(conditionUserIds);
  const homes = new Set(homeUserIds);
  return profiles.map((p) => {
    const mine = incidents.filter((i) => i.user_id === p.id);
    return {
      id: p.id, shortId: p.id.slice(0, 8), role: p.role === "admin" ? "관리자" : "회원", joinedOn: toKstDate(new Date(p.created_at)),
      hasCondition: conditions.has(p.id), hasHome: homes.has(p.id),
      incidents: mine.length, waiting: mine.filter((i) => WAITING.has(i.status)).length, isVirtual: virtualIds.has(p.id),
    };
  });
}
