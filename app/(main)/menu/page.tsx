import Link from "next/link";
import { StatusLabel, type PageStatus } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "전체 메뉴 | HomeFit AI" };

type Item = { label: string; href: string; status: PageStatus };
type Group = { title: string; items: Item[] };

// spec 004 FR-001: 기획안 9절 서비스 화면 구성(사용자 붙여 줌 2026-11-17)을 그대로 묶어 링크로 둔다
const GROUPS: Group[] = [
  { title: "1. 홈 대시보드", items: [
    { label: "나의 주거 정보 · 월 예상 주거비 · 주거환경 분석 · 새 위험과 주거 기회 · 승인 대기", href: "/", status: "ready" },
  ] },
  { title: "2. 집 비교 (Housing Compare)", items: [
    { label: "관심 주택 등록", href: "/compare/new", status: "skeleton" },
    { label: "주택별 실질 비용 비교", href: "/compare/cost", status: "skeleton" },
    { label: "개인화 추천 결과·추천 근거", href: "/compare", status: "out" },
  ] },
  { title: "3. 집 점검 (Housing QC)", items: [
    { label: "결로 위험 시뮬레이터", href: "/qc#simulator", status: "ready" },
    { label: "입주 전 품질 점검", href: "/qc#checklist", status: "skeleton" },
    { label: "주거환경 기록(실내 온습도)", href: "/my/home", status: "ready" },
    { label: "하자 기록", href: "/qc#defects", status: "skeleton" },
    { label: "건축물 기본 정보", href: "/qc#building", status: "out" },
  ] },
  { title: "4. 에너지 분석 (Energy)", items: [
    { label: "예상 에너지 사용량·비용, 냉난방비 시뮬레이션", href: "/energy", status: "out" },
  ] },
  { title: "5. 직장과 정책 (Work & Policy)", items: [
    { label: "공공임대주택 모집 정보(맞춤 공고)", href: "/notices", status: "ready" },
    { label: "개인별 신청 계획(내 일정)", href: "/schedule", status: "ready" },
    { label: "청년 주거지원 정책", href: "/policy#youth", status: "skeleton" },
    { label: "직장 및 생활권 분석", href: "/policy#commute", status: "out" },
  ] },
  { title: "6. 위험·기회 알림 (Incident Center)", items: [
    { label: "새 알림, AI 분석, 대응안 승인·거절, 처리 이력", href: "/incidents", status: "ready" },
  ] },
  { title: "7. AI 도우미 (AI Assistant)", items: [
    { label: "과거 처리 기록 보기·찾기, 출처 기반 안내", href: "/knowledge", status: "skeleton" },
  ] },
  { title: "관리자", items: [
    { label: "회원·수집 현황·사건 현황·오류와 실행 기록·흐름·시뮬레이터·채점·위키 챗봇", href: "/admin", status: "skeleton" },
  ] },
];

// spec 004: 전체 메뉴(IA 네비게이션 모델의 "더 보기"). 각 칸에 지금 상태를 글자로 표시
export default function MenuPage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>전체 메뉴</h1>
      <p className={styles.lead}>기획안 9절 화면을 모두 모았습니다. &ldquo;뼈대&rdquo;는 화면만 있고 기능은 다음 단계에서 넣습니다.</p>
      <div className={styles.grid}>
        {GROUPS.map((group) => (
          <section key={group.title} className={styles.card} aria-label={group.title}>
            <h2>{group.title}</h2>
            <ul className={styles.list}>
              {group.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>{item.label}</Link> <StatusLabel status={item.status} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
