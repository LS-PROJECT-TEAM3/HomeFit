import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "공공데이터 출처 | AI 도우미 | HomeFit AI" };

// 기획안 AI Assistant "공공데이터 출처 기반 안내": 앱이 실제로 쓰는 출처 (docs/data-sources 후보, spec 004)
const SOURCES = [
  ["마이홈 공공임대 모집공고", "국토교통부 마이홈 API(공공데이터포털). 하루 1번 수집", "맞춤 공고, 주거 기회 알림"],
  ["기상청 단기예보", "공공데이터포털 15084084. 하루 2번(새벽·오후 발표 뒤)", "습도·결로 위험 알림"],
  ["법정동 코드", "행정안전부 법정동코드 API. 시군구 목록, 30일 저장", "조건·내 집의 시군구"],
  ["기상청 격자 좌표", "단기예보 활용가이드(2610) 격자 엑셀", "시군구 → 예보 위치"],
  ["내가 넣은 측정값", "실내 온도·습도(사용자 입력)", "결로 계산의 측정값"],
] as const;

export default function KnowledgeSourcesPage() {
  return (
    <section className={styles.card} aria-labelledby="src-title">
      <h2 id="src-title">이 앱이 쓰는 자료</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">자료</th><th scope="col">어디서·얼마나 자주</th><th scope="col">쓰는 곳</th></tr></thead>
          <tbody>{SOURCES.map(([name, where, use]) => <tr key={name}><th scope="row">{name}</th><td>{where}</td><td>{use}</td></tr>)}</tbody>
        </table>
      </div>
      <p className={styles.muted}>AI 글은 요약·대응안 초안에만 쓰고, 숫자 비교·판단은 코드로 합니다(CLAUDE.md 팀 규칙).</p>
    </section>
  );
}
