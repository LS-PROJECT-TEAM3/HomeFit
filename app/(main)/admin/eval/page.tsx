import { EVAL_CASES } from "@/eval/cases";
import { scoreCases, type Tally } from "@/eval/score";
import { AdminCard } from "../admin-card";
import styles from "../admin.module.css";

export const metadata = { title: "채점 결과 | 관리자 | HomeFit AI" };

const KIND: Record<string, string> = { notice: "공고 변화", humidity: "습도/결로 위험", rent: "시세 변화" };

function TallyRow({ label, t }: { label: string; t: Tally }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td className={styles.num}>{t.total}</td>
      <td className={styles.num}>{t.hit}</td>
      <td className={styles.num}>{t.missed}</td>
      <td className={styles.num}>{t.falseAlarm}</td>
      <td className={styles.num}>{t.quietCorrect}</td>
    </tr>
  );
}

// IA AD_070600_TB 채점 결과 (PRD FR-25, spec 005 FR-004, CUJ-04 5단계). 열 때마다 지금 규칙으로 다시 채점한다(DB·AI 안 부름)
export default function AdminEvalPage() {
  const report = scoreCases(EVAL_CASES);
  return (
    <div className={styles.stack}>
      <AdminCard id="eval-title" title="채점 결과" tip={`정답이 붙은 가짜 묶음 ${report.summary.total}건을 지금 감지 규칙에 넣은 결과예요. npm run eval로 eval/results.json에 남겨요. 정답은 문제정의의 사건 기준에서 가져왔어요. 맞힘은 울려야 해서 울림, 놓침은 울려야 하는데 안 울림, 잘못 울림은 안 울려야 하는데 울림이에요.`}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">묶음</th><th scope="col" className={styles.num}>전체</th><th scope="col" className={styles.num}>맞힘</th><th scope="col" className={styles.num}>놓침</th><th scope="col" className={styles.num}>잘못 울림</th><th scope="col" className={styles.num}>조용히 맞음</th></tr></thead>
          <tbody>
            <TallyRow label="합계" t={report.summary} />
            <TallyRow label={KIND.notice} t={report.byKind.notice} />
            <TallyRow label={KIND.humidity} t={report.byKind.humidity} />
            <TallyRow label={KIND.rent} t={report.byKind.rent} />
          </tbody>
        </table>
      </div>
      </AdminCard>
      <AdminCard id="cases-title" title="사례별">
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
                  <td><b className={verdict === "맞힘" || verdict === "조용히 맞음" ? styles.ok : styles.fail}>{verdict}</b></td>
                  <td>{r.basis}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </AdminCard>
    </div>
  );
}
