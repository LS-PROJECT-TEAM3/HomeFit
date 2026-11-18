import Link from "next/link";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { createClient } from "@/lib/supabase/server";
import { consecutiveFailures } from "@/watch/run-health";
import { runNow } from "../actions";
import { RunButton } from "../run-button";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "수집 현황 | 관리자 | HomeFit AI" };
// 지금 한 번 실행은 수집 입구와 같은 상한 안에서 끝나야 한다
export const maxDuration = 300;

const SOURCE: Record<string, string> = { myhome_notice: "마이홈 공고", kma_forecast: "기상청 예보", youth_policy: "온통청년 정책", rtms_trade: "실거래가" };
// spec 006 FR-004: 지금 한 번 실행 버튼이 있는 출처
const RUNNABLE = [["myhome", "myhome_notice"], ["weather", "kma_forecast"], ["youth", "youth_policy"], ["rent", "rtms_trade"]] as const;
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
    supabase.from("runs").select("id, source_code, trigger, status, error_message, started_at").order("started_at", { ascending: false }).limit(50),
    supabase.from("llm_calls").select("created_at, purpose, provider, ok, error_kind, latency_ms").eq("ok", false).order("created_at", { ascending: false }).limit(10),
  ]);
  if (runs.error || calls.error) return <LoadError>수집 기록을 불러오지 못했습니다.</LoadError>;
  return (
    <>
      <h2>출처별 상태</h2>
      <div className={styles.grid}>
        {RUNNABLE.map(([source, code]) => {
          const failures = consecutiveFailures(runs.data, code);
          return (
            <section key={source} className={styles.card} aria-label={SOURCE[code]}>
              <h3>{SOURCE[code]}</h3>
              <p>
                연속 실패: <strong className="tabular-nums">{failures}회</strong>
                {failures > 0 ? " — 확인이 필요합니다" : ""}
              </p>
              <RunButton label="지금 한 번 실행" run={runNow.bind(null, source)} />
            </section>
          );
        })}
      </div>
      <p className={styles.muted}>지금 한 번 실행은 실제 API를 부르고 &ldquo;손으로&rdquo;로 기록됩니다. 연속 실패 수에는 시뮬레이터 실행을 넣지 않습니다.</p>
      <h2 className={styles.section}>최근 실행 20건</h2>
      <p className={styles.muted}>시각을 누르면 그 실행의 단계를 흐름 화면에서 봅니다(IA AD_070201_PG 수집 실행 상세).</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">시각</th><th scope="col">출처</th><th scope="col">방식</th><th scope="col">결과</th><th scope="col">오류</th></tr></thead>
          <tbody>
            {runs.data.slice(0, 20).map((run) => (
              <tr key={run.id}>
                <td><Link href={`/admin/flow?run=${run.id}`}>{kst(run.started_at)}</Link></td>
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
