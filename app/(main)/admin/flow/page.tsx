import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { SkeletonNotice } from "@/app/_components/page-status";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "흐름 화면 | 관리자 | HomeFit AI" };

const STEP: Record<string, string> = { collect: "수집", compare: "비교", detect: "감지", draft_plan: "계획 초안", notify: "슬랙 알림", await_approval: "승인 대기", record: "기록" };
// CLAUDE.md 디자인: 성공 초록 실선, 실패 빨강, 승인 대기 주황 점선, 안 켜짐 회색. 글자 라벨도 함께
const LOOK: Record<string, { label: string; border: string }> = {
  succeeded: { label: "성공", border: "2px solid var(--color-status-success)" },
  failed: { label: "실패", border: "2px solid var(--color-status-failed)" },
  waiting: { label: "승인 대기", border: "2px dashed var(--color-status-waiting)" },
  skipped: { label: "건너뜀", border: "2px solid var(--color-status-off)" },
};

async function latestSteps(source: string) {
  const supabase = await createClient();
  const { data: run, error } = await supabase.from("runs").select("id, started_at").eq("source_code", source).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!run) return { run: null, steps: [] };
  const { data: steps, error: stepError } = await supabase.from("run_steps").select("step_name, status, items_out").eq("run_id", run.id).order("step_order");
  if (stepError) throw stepError;
  return { run, steps };
}

const SOURCES = [["myhome_notice", "마이홈 공고"], ["kma_forecast", "기상청 예보"]] as const;

// IA AD_070400_TB 흐름 화면 (PRD FR-23, spec 004 뼈대): 출처별 가장 최근 실행의 단계를 상자로
export default async function AdminFlowPage() {
  await connection();
  let flows;
  try {
    flows = await Promise.all(SOURCES.map(async ([source, name]) => ({ name, ...(await latestSteps(source)) })));
  } catch {
    return <LoadError>흐름 기록을 불러오지 못했습니다.</LoadError>;
  }
  return (
    <>
      <SkeletonNotice>노드·화살표 캔버스, 분기 건수, 상자 상세(키 가림)는 다음 단계입니다(PRD FR-23). 지금은 가장 최근 실행의 단계만 순서대로 보입니다.</SkeletonNotice>
      {flows.map((flow) => (
        <section key={flow.name} className={styles.section} aria-label={flow.name}>
          <h2>{flow.name}</h2>
          {flow.run ? (
            <ol style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
              {flow.steps.map((step, i) => {
                const look = LOOK[step.status] ?? LOOK.skipped;
                return (
                  <li key={i} className={styles.card} style={{ border: look.border, padding: 12 }}>
                    <strong>{STEP[step.step_name] ?? step.step_name}</strong>
                    <span>{look.label} · {step.items_out ?? 0}건</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={styles.muted}>아직 실행 기록이 없습니다.</p>
          )}
        </section>
      ))}
    </>
  );
}
