import Link from "next/link";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { createClient } from "@/lib/supabase/server";
import { consecutiveFailures } from "@/watch/run-health";
import { runNow } from "../actions";
import { RunButton } from "../run-button";
import { AdminCard } from "../admin-card";
import styles from "../admin.module.css";

export const metadata = { title: "수집 현황 | 관리자 | HomeFit AI" };
// 지금 한 번 실행은 수집 입구와 같은 상한 안에서 끝나야 한다
export const maxDuration = 300;

const SOURCE: Record<string, string> = { myhome_notice: "마이홈 공고", kma_forecast: "기상청 예보", youth_policy: "온통청년 정책", rtms_trade: "실거래가" };
// spec 006 FR-004: 지금 한 번 실행 버튼이 있는 출처
const RUNNABLE = [["myhome", "myhome_notice"], ["weather", "kma_forecast"], ["youth", "youth_policy"], ["rent", "rtms_trade"]] as const;
const STATUS: Record<string, string> = { succeeded: "성공", failed: "수집 오류", running: "도는 중" };
const TRIGGER: Record<string, string> = { scheduled: "정기", manual: "손으로", simulation: "시뮬레이터" };

// 보드처럼 "11.20 18:16"
function kst(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".") : "-";
}
const STATUS_CLASS: Record<string, string> = { succeeded: styles.ok, failed: styles.fail, running: styles.wait };

// IA AD_070200_TB 수집 현황 + 기획안 "API 오류 및 실행 로그" (PRD FR-21, spec 004). 읽기만. 오류 문구의 키는 수집 때 이미 가렸다
export default async function AdminWatchPage() {
  await connection();
  const supabase = await createClient();
  const [runs, calls] = await Promise.all([
    supabase.from("runs").select("id, source_code, trigger, status, error_message, started_at").order("started_at", { ascending: false }).limit(50),
    supabase.from("llm_calls").select("created_at, purpose, provider, ok, error_kind, latency_ms").eq("ok", false).order("created_at", { ascending: false }).limit(10),
  ]);
  if (runs.error || calls.error) return <LoadError>수집 기록을 불러오지 못했습니다.</LoadError>;
  return (
    <div className={styles.stack}>
      <AdminCard id="sources-title" title="출처별 상태" tip={'지금 한 번 실행은 실제 API를 부르고 "손으로"로 기록돼요. 연속 실패 수에는 시뮬레이터 실행을 넣지 않아요.'}>
        <div className={styles.sources}>
          {RUNNABLE.map(([source, code]) => {
            const failures = consecutiveFailures(runs.data, code);
            return (
              <div key={source} className={styles.source}>
                <span className={styles.sourceName}>{SOURCE[code]}</span>
                <span className={styles.sourceFail}>연속 실패 <b className={failures > 0 ? styles.fail : undefined}>{failures}회</b>{failures > 0 ? " (확인 필요)" : ""}</span>
                <RunButton label="지금 한 번 실행" run={runNow.bind(null, source)} />
              </div>
            );
          })}
        </div>
      </AdminCard>
      <AdminCard id="runs-title" title="최근 실행 20건" tip="시각을 누르면 그 실행의 단계를 흐름 화면에서 볼 수 있어요.">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">시각</th><th scope="col">출처</th><th scope="col">방식</th><th scope="col">결과</th><th scope="col">오류</th></tr></thead>
            <tbody>
              {runs.data.slice(0, 20).map((run) => (
                <tr key={run.id}>
                  <td><Link href={`/admin/flow?run=${run.id}`} className={styles.link}>{kst(run.started_at)}</Link></td>
                  <td>{SOURCE[run.source_code] ?? run.source_code}</td>
                  <td>{TRIGGER[run.trigger] ?? run.trigger}</td>
                  <td><b className={STATUS_CLASS[run.status]}>{STATUS[run.status] ?? run.status}</b></td>
                  <td>{run.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <AdminCard id="calls-title" title={<>AI 호출 오류<span className={styles.titleCount}>{calls.data.length}건</span></>}>
        {calls.data.length === 0 ? <p className={styles.help}>AI 호출 오류가 없어요.</p> : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th scope="col">시각</th><th scope="col">용도</th><th scope="col">공급자</th><th scope="col">오류 종류</th><th scope="col">걸린 시간</th></tr></thead>
              <tbody>
                {calls.data.map((call, i) => (
                  <tr key={i}>
                    <td>{kst(call.created_at)}</td><td>{call.purpose}</td><td>{call.provider}</td><td><b className={styles.fail}>{call.error_kind ?? ""}</b></td><td>{call.latency_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
