import { LoadError } from "@/app/_components/states";
import { EDITABLE_FIELDS, type EditTable } from "@/incident/admin-edit";
import { createClient } from "@/lib/supabase/server";
import { AdminCard } from "../../admin-card";
import styles from "../../admin.module.css";

const TABLE_LABEL: Record<string, string> = { policy_conditions: "공고/정책 조건", homes: "사는 집" };

const kst = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");

/** {칸: 값} → "월세 (원) 500,000" 한 줄씩. 칸 이름은 화면 라벨로 */
function describe(table: string, values: unknown): string {
  if (typeof values !== "object" || values === null) return "—";
  const fields = EDITABLE_FIELDS[table as EditTable] ?? {};
  return Object.entries(values)
    .map(([name, value]) => `${fields[name]?.label ?? name} ${value === null ? "비움" : typeof value === "number" ? value.toLocaleString("ko-KR") : String(value)}`)
    .join(", ");
}

// spec 010 FR-003 (PRD FR-20, P3-13): 이 회원의 수정 기록. 담당자·시각·고친 표·전후 값·사유. 지우거나 고치는 버튼은 없다
export async function AuditLogList({ targetIds }: { targetIds: string[] }) {
  const { data, error } = await (await createClient())
    .from("audit_logs")
    .select("id, actor_id, target_table, before, after, reason, created_at")
    .in("target_id", targetIds)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return <LoadError>수정 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  return (
    <AdminCard id="m-audit" title="관리자 수정 기록" tip="담당자, 시각, 고치기 전후 값, 사유가 남아요. 지우거나 고칠 수 없어요.">
      {data.length === 0 ? <p className={styles.help}>고친 기록이 없습니다.</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">시각</th><th scope="col">담당자</th><th scope="col">고친 곳</th><th scope="col">전 → 후</th><th scope="col">사유</th></tr></thead>
            <tbody>
              {data.map((log) => (
                <tr key={log.id}>
                  <td>{kst(log.created_at)}</td>
                  <td>관리자 {log.actor_id.slice(0, 8)}</td>
                  <td>{TABLE_LABEL[log.target_table] ?? log.target_table}</td>
                  <td>{describe(log.target_table, log.before)} → {describe(log.target_table, log.after)}</td>
                  <td>{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
