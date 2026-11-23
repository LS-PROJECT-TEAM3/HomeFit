import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { buildFlow, friendlyRunError, sourceStarts, SOURCES } from "@/flow/graph";
import { createClient } from "@/lib/supabase/server";
import { maskSecrets } from "@/watch/mask";
import { FlowChain } from "./flow-chain";
import { AdminCard } from "../admin-card";
import { ShowMoreRows } from "../show-more";
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
  const onlyFailed = params.runs === "failed";
  const listed = onlyFailed ? runs.filter((r) => r.status === "failed") : runs;
  const listHref = (failed: boolean) => {
    const q = new URLSearchParams();
    if (selected) q.set("run", selected.id);
    if (failed) q.set("runs", "failed");
    return `/admin/flow?${q.toString()}`;
  };
  return (
    <div className={styles.stack}>
      <AdminCard id="flow-starts" title="시작 상자" tip="출처(수집 대상)마다 가장 최근 실행의 결과예요. 상자를 누르면 아래에 그 출처의 실행 흐름이 나와요. 초록 실선은 성공, 빨강은 실패, 주황 점선은 승인 대기, 회색 점선은 안 켜짐이나 도달 못 함이고 글자로도 적었어요.">
        <ul className={flowStyles.starts}>
          {starts.map((s) => {
            // 사용자 요청(2026-11-23): 시작 상자를 누르면 그 출처의 최근 실행을 본다. 지금 보는 출처는 바탕을 채우고 아래 꼭지로 아래 카드와 잇는다
            const latest = runs.find((r) => r.source_code === s.code);
            const viewing = selected?.source_code === s.code;
            const inner = (
              <>
                <span className={flowStyles.name}>{s.label}</span>
                <span className={flowStyles.state}>{s.stateLabel}</span>
              </>
            );
            return (
              <li key={s.code}>
                {latest ? (
                  <Link href={`/admin/flow?run=${latest.id}`} scroll={false} className={`${flowStyles.box} ${flowStyles[s.state]}`} aria-current={viewing ? "true" : undefined}>{inner}</Link>
                ) : <span className={`${flowStyles.box} ${flowStyles[s.state]}`} style={{ display: "block" }}>{inner}</span>}
              </li>
            );
          })}
        </ul>
      </AdminCard>
      {/* 사용자 요청(2026-11-23): 위에서 고른 시작 상자의 실행이라는 것을 머리 줄과 왼쪽 띠로 이어 보인다 */}
      <div className={flowStyles.runLinked}>
      <AdminCard id="flow-run" title={selected ? (
        <>
          <span className={flowStyles.runFrom}>{sourceLabel(selected.source_code)}의 실행 흐름</span>
          {kst(selected.started_at)} {TRIGGER[selected.trigger] ?? selected.trigger}
          <b className={`${styles.titleCount} ${RUN_CLASS[selected.status] ?? ""}`}>{RUN_STATUS[selected.status] ?? selected.status}</b>
        </>
      ) : "실행 기록"}>
        {selected ? <FlowChain key={selected.id} {...buildFlow(rows, secrets())} /> : <Empty>아직 실행 기록이 없습니다. 시뮬레이터에서 가짜 묶음을 돌려 보세요.</Empty>}
        {selected?.error_message ? (
          // 사용자 요청(2026-11-23): 쉬운 설명을 먼저, 원문(키 값은 가림)은 접어 둔다
          <div role="note" className={styles.help}>
            <p className={styles.help}><b className={styles.fail}>오류</b> {friendlyRunError(selected.error_message)}</p>
            <details className={flowStyles.raw}>
              <summary>원문 보기</summary>
              <p>{maskSecrets(selected.error_message, secrets())}</p>
            </details>
          </div>
        ) : null}
      </AdminCard>
      </div>
      <AdminCard id="flow-pick" title={<>다른 실행 보기<span className={styles.titleCount}>최근 {runs.length}건</span></>}>
        <nav className={flowStyles.filters} aria-label="실행 결과 거르기">
          <Link href={listHref(false)} scroll={false} className={flowStyles.filter} aria-current={onlyFailed ? undefined : "page"}>전체</Link>
          <Link href={listHref(true)} scroll={false} className={flowStyles.filter} aria-current={onlyFailed ? "page" : undefined}>실패만 {runs.filter((r) => r.status === "failed").length}</Link>
        </nav>
        {listed.length === 0 ? <p className={styles.help}>실패한 실행이 없어요.</p> : (
          <ShowMoreRows
            head={<tr><th scope="col">시각</th><th scope="col">출처</th><th scope="col">방식</th><th scope="col">결과</th></tr>}
            rows={listed.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/flow?run=${r.id}${onlyFailed ? "&runs=failed" : ""}`} scroll={false} className={styles.link} aria-current={r.id === selected?.id ? "page" : undefined}>{kst(r.started_at)}</Link>
                </td>
                <td>{sourceLabel(r.source_code)}</td>
                <td>{TRIGGER[r.trigger] ?? r.trigger}</td>
                <td><b className={RUN_CLASS[r.status]}>{RUN_STATUS[r.status] ?? r.status}</b></td>
              </tr>
            ))}
          />
        )}
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
