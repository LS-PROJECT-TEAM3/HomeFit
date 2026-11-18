import Link from "next/link";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { summarizeMembers } from "@/incident/member-summary";
import { createClient } from "@/lib/supabase/server";
import { parseVirtualUserIds } from "@/watch/simulation";
import styles from "@/app/_components/hub.module.css";

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

// IA AD_070100_TB 회원 (PRD FR-20, spec 005 FR-005). 읽기만. 이메일은 보이지 않고 회원 ID 앞 8자만
export default async function AdminUsersPage() {
  await connection();
  let rows;
  try {
    rows = await loadMembers();
  } catch {
    return <LoadError>회원 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  return (
    <>
      <p className={styles.muted}>회원 {rows.length}명. 이름을 누르면 조건·내 집·알림을 봅니다. 관리자 수정(담당자·시각·사유 기록)은 수정 기록 표가 필요해 아직 없습니다(spec 005 Q1). 관리자도 회원 대신 승인하지 못합니다.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th scope="col">회원</th><th scope="col">역할</th><th scope="col">가입</th><th scope="col">조건</th><th scope="col">내 집</th><th scope="col">알림</th><th scope="col">결정 기다림</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/admin/users/${row.id}`}>{row.shortId}…</Link>{row.isVirtual ? " (가상 계정)" : ""}</td>
                <td>{row.role}</td>
                <td>{row.joinedOn}</td>
                <td>{yes(row.hasCondition)}</td>
                <td>{yes(row.hasHome)}</td>
                <td className="tabular-nums">{row.incidents}건</td>
                <td className="tabular-nums">{row.waiting}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
