import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "공공데이터 출처 | AI 도우미 | HomeFit AI" };

type Source = { name: string; where: string; use: string; terms: string };

// IA KN_050200_TB: 앱이 실제로 쓰는 출처와 이용 조건. 내용은 docs/data-sources.md 1·2.6절을 따른다(2026-11-19 맞춤)
const SOURCES: Source[] = [
  { name: "마이홈 공공임대 모집공고", where: "공공데이터포털 15108420 · 매일 09:00", use: "맞춤 공고, 주거 기회 알림, 챗봇", terms: "무료, 이용 제한 없음" },
  { name: "온통청년 청년정책", where: "온통청년 오픈 API · 매일 09:10", use: "청년 주거지원 정책, 챗봇", terms: "무료, 심의 승인 뒤 키 발급" },
  { name: "기상청 단기예보", where: "공공데이터포털 15084084 · 매일 05:30, 17:30", use: "습도·결로 위험 알림, 챗봇", terms: "무료, 공공누리 제1유형(출처 표시)" },
  { name: "기상청 초단기실황·초단기예보", where: "단기예보 조회서비스 · 홈을 열 때(10분 기억)", use: "홈 바깥 날씨", terms: "무료, 공공누리 제1유형(출처 표시)" },
  { name: "전월세 실거래가(아파트·오피스텔·연립다세대·단독다가구)", where: "공공데이터포털 15126472~15126475 · 매월 2일 10:00", use: "시세 변화 알림", terms: "무료, 이용 제한 없음" },
  { name: "법정동 코드", where: "공공데이터포털 15077871 · 필요할 때(30일 기억)", use: "조건·내 집의 시군구", terms: "무료, 이용 제한 없음" },
  { name: "건축HUB 건축물대장", where: "공공데이터포털 15134735 · 조회할 때만", use: "건축물 기본 정보", terms: "무료, 이용 제한 없음(갱신 월간)" },
  { name: "한국전력 가구평균 전력사용량", where: "전력데이터개방포털 · 화면을 열 때(하루 기억)", use: "에너지비 추정", terms: "무료, 이용 제한 없음" },
  { name: "국토교통부 공동주택 에너지 사용 정보", where: "공공데이터포털 15012964 · 화면을 열 때(하루 기억)", use: "아파트 에너지비 추정", terms: "무료, 자동 승인" },
  { name: "한국가스공사 도시가스 소매요금표", where: "공공데이터포털 15157367 파일 · 연 1회 받아 둠", use: "냉난방비 시뮬레이션", terms: "무료, 이용 제한 없음" },
  { name: "에너지경제연구원 가구에너지패널조사 14차", where: "KESIS 공개 결과표 파일 · 2023년 기준 값", use: "주택 종류·면적별 에너지비 보정", terms: "공개 자료" },
  { name: "기상청 격자 좌표", where: "단기예보 활용가이드 격자 엑셀", use: "시군구 → 예보 위치", terms: "단기예보와 같음" },
  { name: "내가 넣은 값", where: "내 집 실내 온습도, 관심 주택, 점검·하자 기록", use: "결로 계산, 집 비교, 챗봇", terms: "본인만 봄(관리자는 사진 뺀 기록 읽기). 챗봇 질문 때 AI 공급자로 전달" },
];

export default function KnowledgeSourcesPage() {
  return (
    <section className={styles.card} aria-labelledby="src-title">
      <h2 id="src-title">이 앱이 쓰는 자료</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">자료</th><th scope="col">어디서·얼마나 자주</th><th scope="col">쓰는 곳</th><th scope="col">이용 조건</th></tr></thead>
          <tbody>{SOURCES.map((s) => <tr key={s.name}><th scope="row">{s.name}</th><td>{s.where}</td><td>{s.use}</td><td>{s.terms}</td></tr>)}</tbody>
        </table>
      </div>
      <p className={styles.muted}>AI 글은 요약·대응안 초안·답변에만 쓰고, 숫자 비교·판단은 코드로 합니다. 공고 신청 자격은 판정하지 않고 공고문에서 확인하도록 안내합니다.</p>
      {/* 서윤 PR #19 리뷰(2026-11-19): 챗봇이 내 정보를 AI 공급자로 보내므로 "본인만 봄"만으로는 사실과 다르다 */}
      <p className={styles.muted}>AI 도우미에 질문하면, 질문과 관련된 내 정보(내 집·관심 주택·점검 메모·하자 메모 등)가 답을 만들기 위해 AI 공급자(지금은 Google Gemini)로 전달됩니다. 사진은 보내지 않습니다. 메모에는 이름·연락처·상세 주소 같은 개인 정보를 적지 마세요.</p>
    </section>
  );
}
