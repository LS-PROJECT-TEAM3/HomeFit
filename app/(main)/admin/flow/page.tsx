import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { buildFlow, sourceStarts, SOURCES } from "@/flow/graph";
import { createClient } from "@/lib/supabase/server";
import { maskSecrets } from "@/watch/mask";
import { FlowChain } from "./flow-chain";
import { AdminCard } from "../admin-card";
import styles from "../admin.module.css";
import flowStyles from "./flow.module.css";

export const metadata = { title: "흐름 화면 | 관리자 | HomeFit AI" };

const TRIGGER: Record<string, string> = { scheduled: "정기", manual: "손으로", simulation: "시뮬레이터" };
const RUN_STATUS: Record<string, string> = { succeeded: "성공", failed: "실패", running: "도는 중" };

// 보드처럼 "11.20 18:16"
function kst(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");
}
const RUN_CLASS: Record<string, string> = { succeeded: styles.ok, failed: styles.fail, running: styles.wait };

// 상자 상세에서 가릴 키 값(서버에서만 읽는다, PRD FR-27)
function secrets(): string[] {
  return [process.env.DATA_GO_KR_SERVICE_KEY, process.env.SUPABASE_SECRET_KEY, process.env.GEMINI_API_KEY, process.env.ANTHROPIC_API_KEY, process.env.SLACK_BOT_TOKEN, process.env.CRON_SECRET, process.env.YOUTH_POLICY_API_KEY]
    .filter((v): v is string => typeof v === "string");
}

async function loadRuns() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("runs").select("id, source_code, trigger, status, started_at, error_message").order("started_at", { ascending: false }).limit(30);
  if (error) throw error;
  return data;
}

async function loadSteps(runId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("run_steps").select("step_name, status, items_in, items_out, detail").eq("run_id", runId).order("step_order");
  if (error) throw error;
  return data;
}

function sourceLabel(code: string): string {
  return SOURCES.find((s) => s.code === code)?.label ?? code;
}

// 기록 읽기는 Suspense 안에서 한다(Next.js 16 Cache Components: 밖에서 읽으면 화면 전체가 막힌다)
async function FlowContent({ searchParams }: PageProps<"/admin/flow">) {
  await connection();
  const params = await searchParams;
  const wanted = typeof params.run === "string" ? params.run : null;
  let runs: Awaited<ReturnType<typeof loadRuns>>;
  let rows: Awaited<ReturnType<typeof loadSteps>> = [];
  try {
    runs = await loadRuns();
    const picked = runs.find((r) => r.id === wanted) ?? runs[0];
    if (picked) rows = await loadSteps(picked.id);
  } catch {
    return <LoadError>흐름 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  const selected = runs.find((r) => r.id === wanted) ?? runs[0] ?? null;
  const starts = sourceStarts(runs);
  return (
    <div className={styles.stack}>
      <AdminCard id="flow-starts" title="시작 상자" tip="실행 기록에서 그려요. 초록 실선은 성공, 빨강은 실패, 주황 점선은 승인 대기, 회색 점선은 안 켜짐이나 도달 못 함이고 글자로도 적었어요. 상자를 누르면 상세가 열려요(키 값은 가림).">
        <ul className={flowStyles.starts}>
          {starts.map((s) => (
            <li key={s.code} className={`${flowStyles.box} ${flowStyles[s.state]}`}>
              <span className={flowStyles.name}>{s.label}</span>
              <span className={flowStyles.state}>{s.stateLabel}</span>
            </li>
          ))}
        </ul>
      </AdminCard>
      <AdminCard id="flow-run" title={selected ? `${sourceLabel(selected.source_code)} ${kst(selected.started_at)} ${TRIGGER[selected.trigger] ?? selected.trigger}` : "실행 기록"}>
        {selected ? <FlowChain {...buildFlow(rows, secrets())} /> : <Empty>아직 실행 기록이 없습니다. 시뮬레이터에서 가짜 묶음을 돌려 보세요.</Empty>}
        {selected?.error_message ? <p role="note" className={styles.help}><b className={styles.fail}>오류</b> {maskSecrets(selected.error_message, secrets())}</p> : null}
      </AdminCard>
      <AdminCard id="flow-pick" title="다른 실행 보기 (최근 30건)">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">시각</th><th scope="col">출처</th><th scope="col">방식</th><th scope="col">결과</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/admin/flow?run=${r.id}`} className={styles.link} aria-current={r.id === selected?.id ? "page" : undefined}>{kst(r.started_at)}</Link>
                    {r.id === selected?.id ? <span className={styles.titleCount}>보는 중</span> : null}
                  </td>
                  <td>{sourceLabel(r.source_code)}</td>
                  <td>{TRIGGER[r.trigger] ?? r.trigger}</td>
                  <td><b className={RUN_CLASS[r.status]}>{RUN_STATUS[r.status] ?? r.status}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

// IA AD_070400_TB 흐름 화면 (PRD FR-23, spec 005 FR-003): 시작 상자(출처마다) + 고른 실행의 단계 상자·화살표. 상자를 누르면 상세(AD_070401_MD)
export default function AdminFlowPage(props: PageProps<"/admin/flow">) {
  return (
    <Suspense fallback={<Loading />}>
      <FlowContent {...props} />
    </Suspense>
  );
}
