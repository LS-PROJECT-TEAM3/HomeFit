import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { SkeletonNotice } from "@/app/_components/page-status";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "회원 | 관리자 | HomeFit AI" };

// IA AD_070100_TB 회원 (PRD FR-20, spec 004 뼈대). 이메일 같은 개인 정보는 보이지 않고 회원 ID 앞부분만
export default async function AdminUsersPage() {
  await connection();
  const { data, error } = await (await createClient()).from("profiles").select("id, role, created_at").order("created_at");
  if (error) return <LoadError>회원 목록을 불러오지 못했습니다.</LoadError>;
  return (
    <>
      <SkeletonNotice>회원 상세(입력·수집 자료·알림·실패)와 관리자 수정(담당자·시각·사유 기록)은 다음 단계입니다(PRD FR-20).</SkeletonNotice>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">회원 ID</th><th scope="col">역할</th><th scope="col">가입</th></tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id}>
                <td>{row.id.slice(0, 8)}…</td>
                <td>{row.role === "admin" ? "관리자" : "회원"}</td>
                <td>{new Date(row.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
