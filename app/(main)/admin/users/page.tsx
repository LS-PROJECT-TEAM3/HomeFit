import Link from "next/link";
import { connection } from "next/server";
import { Empty, LoadError } from "@/app/_components/states";
import { readMemberView, summarizeMembers, viewMembers, type MemberSortKey, type MemberView } from "@/incident/member-summary";
import { createClient } from "@/lib/supabase/server";
import { parseVirtualUserIds } from "@/watch/simulation";
import { AdminCard } from "../admin-card";
import styles from "../admin.module.css";

export const metadata = { title: "회원 | 관리자 | HomeFit AI" };

async function loadMembers() {
  const supabase = await createClient();
  const [profiles, conditions, homes, incidents] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at").order("created_at"),
    supabase.from("policy_conditions").select("user_id"),
    supabase.from("homes").select("user_id"),
    supabase.from("incidents").select("user_id, status"),
  ]);
  if (profiles.error || conditions.error || homes.error || incidents.error) throw new Error("회원 목록을 불러오지 못했습니다.");
  return summarizeMembers({
    profiles: profiles.data,
    conditionUserIds: conditions.data.map((r) => r.user_id),
    homeUserIds: homes.data.map((r) => r.user_id),
    incidents: incidents.data,
    virtualIds: parseVirtualUserIds(process.env.SIMULATION_USER_IDS),
  });
}

const yes = (value: boolean) => (value ? "있음" : "없음");

const COLUMNS: [MemberSortKey, string][] = [
  ["member", "회원"], ["role", "역할"], ["joined", "가입"], ["condition", "조건"], ["home", "집"], ["incidents", "알림"], ["waiting", "결정 기다림"],
];
const ROLE_FILTERS: [MemberView["role"], string, string | null][] = [["all", "전체", null], ["관리자", "관리자", "admin"], ["회원", "회원", "member"]];

function hrefOf(view: MemberView, change: Partial<MemberView>): string {
  const next = { ...view, ...change };
  const q = new URLSearchParams();
  if (next.sort !== "joined") q.set("sort", next.sort);
  if (next.dir !== "asc") q.set("dir", next.dir);
  const role = ROLE_FILTERS.find(([value]) => value === next.role)?.[2];
  if (role) q.set("role", role);
  return q.size ? `/admin/users?${q.toString()}` : "/admin/users";
}

/** 표 머리: 누르면 그 칸으로 정렬, 한 번 더 누르면 방향을 바꾼다. 지금 정렬은 화살표 + aria-sort */
function SortHead({ view, column, label }: { view: MemberView; column: MemberSortKey; label: string }) {
  const on = view.sort === column;
  const dir = on && view.dir === "asc" ? "desc" : "asc";
  return (
    <th scope="col" aria-sort={on ? (view.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={hrefOf(view, { sort: column, dir })} className={`${styles.sortLink} ${on ? styles.sortOn : ""}`}>
        {label}
        {/* 사용자 요청(2026-11-23): 칸 끝에 위아래 삼각형. 지금 방향만 진하게 */}
        <span className={styles.sortMarks} aria-hidden="true">
          <span className={on && view.dir === "asc" ? styles.sortMarkOn : undefined}>▲</span>
          <span className={on && view.dir === "desc" ? styles.sortMarkOn : undefined}>▼</span>
        </span>
        <span className={styles.srOnly}>{on ? (view.dir === "asc" ? ", 오름차순, 눌러서 내림차순" : ", 내림차순, 눌러서 오름차순") : ", 눌러서 정렬"}</span>
      </Link>
    </th>
  );
}

// IA AD_070100_TB 회원 (PRD FR-20, spec 005 FR-005). 읽기만. 이메일은 보이지 않고 회원 ID 앞부분만
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  await connection();
  const view = readMemberView(await searchParams);
  let all;
  try {
    all = await loadMembers();
  } catch {
    return <LoadError>회원 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (all.length === 0) return <Empty>아직 가입한 회원이 없습니다.</Empty>;
  const rows = viewMembers(all, view);
  const count = (role: MemberView["role"]) => (role === "all" ? all.length : all.filter((m) => m.role === role).length);
  return (
    // 사용자 요청(2026-11-23): 몇 명인지는 역할 칩 "전체 n"에 있으니 제목에서는 뺀다
    <AdminCard id="members-title" title="회원"
      tip="회원 번호를 누르면 공고/정책 조건과 집 정보, 알림을 볼 수 있어요. 표 머리를 누르면 정렬돼요. 숫자와 날짜를 고치면 담당자, 시각, 사유가 수정 기록에 남아요(spec 010 FR-003). 관리자도 회원 대신 승인할 수 없어요.">
      <nav className={styles.chipNav} aria-label="역할로 거르기">
        {ROLE_FILTERS.map(([value, label]) => (
          <Link key={value} href={hrefOf(view, { role: value })} className={styles.filterChip} aria-current={view.role === value ? "page" : undefined}>
            {label} <span className={styles.filterCount}>{count(value)}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>{COLUMNS.map(([column, label]) => <SortHead key={column} view={view} column={column} label={label} />)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/admin/users/${row.id}`} className={styles.link}>{row.shortId}…</Link>{row.isVirtual ? " 가상 계정" : ""}</td>
                <td>{row.role}</td>
                <td>{row.joinedOn.slice(5).replace("-", ".")}</td>
                <td>{yes(row.hasCondition)}</td>
                <td>{yes(row.hasHome)}</td>
                <td>{row.incidents}건</td>
                <td>{row.waiting > 0 ? <b className={styles.wait}>{row.waiting}건</b> : `${row.waiting}건`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
