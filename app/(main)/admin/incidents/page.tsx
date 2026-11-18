import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "사건 현황 | 관리자 | HomeFit AI" };

const TYPE: Record<string, string> = { housing_support: "주거 기회(공고 변화)", humidity_condensation: "위험(습도·결로)", rent_price_change: "위험(시세)" };
const STATUSES = [["new", "새 알림"], ["pending", "승인 대기"], ["approved", "승인"], ["rejected", "거절"]] as const;

// IA AD_070300_TB 사건 현황 (PRD FR-22, spec 004). 전체 회원의 수만, 읽기만. 관리자도 대신 승인하지 못한다
export default async function AdminIncidentsPage() {
  await connection();
  const { data, error } = await (await createClient()).from("incidents").select("incident_type, status");
  if (error) return <LoadError>사건 현황을 불러오지 못했습니다.</LoadError>;
  const count = (type: string, status: string) => data.filter((row) => row.incident_type === type && row.status === status).length;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.muted}>전체 회원 {data.length}건. 코드·DB 이름은 &ldquo;사건&rdquo;, 화면 이름은 &ldquo;위험·기회 알림&rdquo;</caption>
        <thead><tr><th scope="col">종류</th>{STATUSES.map(([, label]) => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>
          {Object.entries(TYPE).map(([type, label]) => (
            <tr key={type}>
              <th scope="row">{label}</th>
              {STATUSES.map(([status]) => <td key={status}>{count(type, status)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
