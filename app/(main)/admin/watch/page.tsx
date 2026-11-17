import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "수집 현황 | 관리자 | HomeFit AI" };

const SOURCE: Record<string, string> = { myhome_notice: "마이홈 공고", kma_forecast: "기상청 예보" };
const STATUS: Record<string, string> = { succeeded: "성공", failed: "수집 오류", running: "도는 중" };
const TRIGGER: Record<string, string> = { scheduled: "정기", manual: "손으로", simulation: "시뮬레이터" };

function kst(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

// IA AD_070200_TB 수집 현황 + 기획안 "API 오류 및 실행 로그" (PRD FR-21, spec 004). 읽기만. 오류 문구의 키는 수집 때 이미 가렸다
export default async function AdminWatchPage() {
  await connection();
  const supabase = await createClient();
  const [runs, calls] = await Promise.all([
    supabase.from("runs").select("id, source_code, trigger, status, error_message, started_at").order("started_at", { ascending: false }).limit(20),
    supabase.from("llm_calls").select("created_at, purpose, provider, ok, error_kind, latency_ms").eq("ok", false).order("created_at", { ascending: false }).limit(10),
  ]);
  if (runs.error || calls.error) return <LoadError>수집 기록을 불러오지 못했습니다.</LoadError>;
  return (
    <>
      <h2>최근 실행 20건</h2>
      <p className={styles.muted}>&ldquo;지금 한 번 실행&rdquo; 버튼과 연속 실패 수는 다음 단계입니다(PRD FR-21).</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">시각</th><th scope="col">출처</th><th scope="col">방식</th><th scope="col">결과</th><th scope="col">오류</th></tr></thead>
          <tbody>
            {runs.data.map((run) => (
              <tr key={run.id}>
                <td>{kst(run.started_at)}</td>
                <td>{SOURCE[run.source_code] ?? run.source_code}</td>
                <td>{TRIGGER[run.trigger] ?? run.trigger}</td>
                <td><strong>{STATUS[run.status] ?? run.status}</strong></td>
                <td>{run.error_message ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className={styles.section}>AI 호출 오류 최근 10건</h2>
      {calls.data.length === 0 ? (
        <p className={styles.muted}>AI 호출 오류가 없습니다.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">시각</th><th scope="col">용도</th><th scope="col">공급자</th><th scope="col">오류 종류</th><th scope="col">걸린 시간</th></tr></thead>
            <tbody>
              {calls.data.map((call, i) => (
                <tr key={i}>
                  <td>{kst(call.created_at)}</td><td>{call.purpose}</td><td>{call.provider}</td><td>{call.error_kind ?? ""}</td><td>{call.latency_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
