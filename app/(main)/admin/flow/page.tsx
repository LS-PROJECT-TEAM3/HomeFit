import Link from "next/link";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { buildFlow, sourceStarts, SOURCES } from "@/flow/graph";
import { createClient } from "@/lib/supabase/server";
import { maskSecrets } from "@/watch/mask";
import { FlowChain } from "./flow-chain";
import styles from "@/app/_components/hub.module.css";
import flowStyles from "./flow.module.css";

export const metadata = { title: "흐름 화면 | 관리자 | HomeFit AI" };

const TRIGGER: Record<string, string> = { scheduled: "정기", manual: "손으로", simulation: "시뮬레이터" };
const RUN_STATUS: Record<string, string> = { succeeded: "성공", failed: "실패", running: "도는 중" };

function kst(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

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

// IA AD_070400_TB 흐름 화면 (PRD FR-23, spec 005 FR-003): 시작 상자(출처마다) + 고른 실행의 단계 상자·화살표. 상자를 누르면 상세(AD_070401_MD)
export default async function AdminFlowPage({ searchParams }: PageProps<"/admin/flow">) {
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
    <>
      <p className={styles.muted}>실행 기록(runs·run_steps)에서 그립니다. 성공은 초록 실선, 실패는 빨강, 승인 대기는 주황 점선, 안 켜짐·도달 못 함은 회색 점선이고 글자로도 적었습니다. 상자를 누르면 상세가 열립니다(키 값은 가림).</p>
      <section className={styles.section} aria-labelledby="flow-starts">
        <h2 id="flow-starts">시작 상자</h2>
        <ul className={flowStyles.starts}>
          {starts.map((s) => (
            <li key={s.code} className={`${flowStyles.box} ${flowStyles[s.state]}`}>
              <span className={flowStyles.name}>{s.label}</span>
              <span className={flowStyles.state}>{s.stateLabel}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-labelledby="flow-run">
        <h2 id="flow-run">{selected ? `${sourceLabel(selected.source_code)} · ${kst(selected.started_at)} · ${TRIGGER[selected.trigger] ?? selected.trigger}` : "실행 기록"}</h2>
        {selected ? <FlowChain {...buildFlow(rows, secrets())} /> : <p className={styles.muted}>아직 실행 기록이 없습니다. 시뮬레이터에서 가짜 묶음을 돌려 보세요.</p>}
        {selected?.error_message ? <p role="note"><strong>오류:</strong> {maskSecrets(selected.error_message, secrets())}</p> : null}
      </section>
      <section className={styles.section} aria-labelledby="flow-pick">
        <h2 id="flow-pick">다른 실행 보기 (최근 30건)</h2>
        <ul className={flowStyles.runs}>
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/flow?run=${r.id}`} className={r.id === selected?.id ? flowStyles.current : undefined} aria-current={r.id === selected?.id ? "page" : undefined}>
                {kst(r.started_at)} {sourceLabel(r.source_code)} · {TRIGGER[r.trigger] ?? r.trigger} · {RUN_STATUS[r.status] ?? r.status}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
