// spec 005 FR-001 (PRD FR-21): 수집 현황의 연속 실패 수. 순수 함수
// 시뮬레이터 실행(가짜 실패 묶음)과 아직 도는 실행은 실제 수집 상태가 아니라서 세지 않는다

export type RunHealthRow = { source_code: string; status: string; trigger: string };

/** runs는 최근 것이 앞에 오게 넘긴다 */
export function consecutiveFailures(runs: readonly RunHealthRow[], sourceCode: string): number {
  let count = 0;
  for (const run of runs) {
    if (run.source_code !== sourceCode || run.trigger === "simulation" || run.status === "running") continue;
    if (run.status !== "failed") return count;
    count += 1;
  }
  return count;
}
