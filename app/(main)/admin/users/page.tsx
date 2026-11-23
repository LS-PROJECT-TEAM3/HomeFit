import Link from "next/link";
import { connection } from "next/server";
import { Empty, LoadError } from "@/app/_components/states";
import { summarizeMembers } from "@/incident/member-summary";
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
const ROLE: Record<string, string> = { admin: "관리자", user: "회원" };

// IA AD_070100_TB 회원 (PRD FR-20, spec 005 FR-005). 읽기만. 이메일은 보이지 않고 회원 ID 앞 8자만
export default async function AdminUsersPage() {
  await connection();
  let rows;
  try {
    rows = await loadMembers();
  } catch {
    return <LoadError>회원 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (rows.length === 0) return <Empty>아직 가입한 회원이 없습니다.</Empty>;
  return (
    <AdminCard id="members-title" title={<>회원<span className={styles.titleCount}>{rows.length}명</span></>}
      tip="이름을 누르면 조건과 내 집, 알림을 볼 수 있어요. 숫자와 날짜를 고치면 담당자, 시각, 사유가 수정 기록에 남아요(spec 010 FR-003). 관리자도 회원 대신 승인할 수 없어요.">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th scope="col">회원</th><th scope="col">역할</th><th scope="col">가입</th><th scope="col">조건</th><th scope="col">내 집</th><th scope="col">알림</th><th scope="col">결정 기다림</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/admin/users/${row.id}`} className={styles.link}>{row.shortId}…</Link>{row.isVirtual ? " 가상 계정" : ""}</td>
                <td>{ROLE[row.role] ?? row.role}</td>
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
