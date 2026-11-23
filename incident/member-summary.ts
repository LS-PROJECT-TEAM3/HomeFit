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
    // 사용자 요청(2026-11-23): 앞 8자는 너무 짧아 두 번째 묶음까지(13자) 보인다
    return {
      id: p.id, shortId: p.id.slice(0, 13), role: p.role === "admin" ? "관리자" : "회원", joinedOn: toKstDate(new Date(p.created_at)),
      hasCondition: conditions.has(p.id), hasHome: homes.has(p.id),
      incidents: mine.length, waiting: mine.filter((i) => WAITING.has(i.status)).length, isVirtual: virtualIds.has(p.id),
    };
  });
}

// 사용자 요청(2026-11-23): 회원 표 머리를 눌러 오름차순/내림차순, 역할(관리자/회원)로 거르기. 값은 주소에 남는다
export const MEMBER_SORT_KEYS = ["member", "role", "joined", "condition", "home", "incidents", "waiting"] as const;
export type MemberSortKey = (typeof MEMBER_SORT_KEYS)[number];
export type MemberView = { sort: MemberSortKey; dir: "asc" | "desc"; role: "all" | "관리자" | "회원" };

const ROLE_PARAM: Record<string, MemberView["role"]> = { admin: "관리자", member: "회원" };

/** 주소 값 → 보기 설정. 모르는 값은 기본(가입 오름차순, 전체) */
export function readMemberView(params: Record<string, string | string[] | undefined>): MemberView {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const sort = (MEMBER_SORT_KEYS as readonly string[]).includes(one(params.sort)) ? (one(params.sort) as MemberSortKey) : "joined";
  return { sort, dir: one(params.dir) === "desc" ? "desc" : "asc", role: ROLE_PARAM[one(params.role)] ?? "all" };
}

const SORT_VALUE: Record<MemberSortKey, (m: MemberSummary) => string | number> = {
  member: (m) => m.id, role: (m) => m.role, joined: (m) => m.joinedOn,
  condition: (m) => Number(m.hasCondition), home: (m) => Number(m.hasHome), incidents: (m) => m.incidents, waiting: (m) => m.waiting,
};

/** 역할로 거르고 정렬한다. 같은 값이면 가입일 순서를 지킨다 */
export function viewMembers(rows: readonly MemberSummary[], view: MemberView): MemberSummary[] {
  const value = SORT_VALUE[view.sort];
  const sign = view.dir === "asc" ? 1 : -1;
  return rows
    .filter((m) => view.role === "all" || m.role === view.role)
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const x = value(a.m);
      const y = value(b.m);
      return (x < y ? -1 : x > y ? 1 : 0) * sign || a.i - b.i;
    })
    .map(({ m }) => m);
}
