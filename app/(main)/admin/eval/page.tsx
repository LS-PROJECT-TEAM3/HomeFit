import { EVAL_CASES } from "@/eval/cases";
import { scoreCases, type Tally } from "@/eval/score";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "채점 결과 | 관리자 | HomeFit AI" };

const KIND: Record<string, string> = { notice: "공고 변화", humidity: "습도·결로 위험" };

function TallyRow({ label, t }: { label: string; t: Tally }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className="tabular-nums">{t.total}</td>
      <td className="tabular-nums">{t.hit}</td>
      <td className="tabular-nums">{t.missed}</td>
      <td className="tabular-nums">{t.falseAlarm}</td>
      <td className="tabular-nums">{t.quietCorrect}</td>
    </tr>
  );
}

// IA AD_070600_TB 채점 결과 (PRD FR-25, spec 005 FR-004, CUJ-04 5단계). 열 때마다 지금 규칙으로 다시 채점한다(DB·AI 안 부름)
export default function AdminEvalPage() {
  const report = scoreCases(EVAL_CASES);
  return (
    <>
      <p className={styles.muted}>정답이 붙은 가짜 묶음 {report.summary.total}건을 지금 감지 규칙에 넣은 결과입니다. 같은 결과를 <code>npm run eval</code>로 <code>eval/results.json</code>에 남깁니다. 정답은 문제정의의 사건 기준과 spec 경계 상황에서 가져왔습니다.</p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.muted}>맞힘 = 울려야 해서 울림, 놓침 = 울려야 하는데 안 울림, 잘못 울림 = 안 울려야 하는데 울림</caption>
          <thead><tr><th scope="col">묶음</th><th scope="col">전체</th><th scope="col">맞힘</th><th scope="col">놓침</th><th scope="col">잘못 울림</th><th scope="col">조용히 맞음</th></tr></thead>
          <tbody>
            <TallyRow label="합계" t={report.summary} />
            <TallyRow label={KIND.notice} t={report.byKind.notice} />
            <TallyRow label={KIND.humidity} t={report.byKind.humidity} />
            <tr><th scope="row">실거래가 시세</th><td colSpan={5} className={styles.muted}>시세 수집 기능이 없어 묶음이 아직 없습니다.</td></tr>
          </tbody>
        </table>
      </div>
      <h2 className={styles.section}>사례별</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">ID</th><th scope="col">종류</th><th scope="col">상황</th><th scope="col">정답</th><th scope="col">규칙 결과</th><th scope="col">판정</th><th scope="col">정답 근거</th></tr></thead>
          <tbody>
            {report.results.map((r) => {
              const verdict = r.expected === r.predicted ? (r.expected ? "맞힘" : "조용히 맞음") : r.expected ? "놓침" : "잘못 울림";
              return (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{KIND[r.kind]}</td>
                  <td>{r.title}</td>
                  <td>{r.expected ? "알림" : "알림 아님"}</td>
                  <td>{r.predicted ? "알림" : "알림 아님"}</td>
                  <td><strong>{verdict}</strong></td>
                  <td>{r.basis}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
