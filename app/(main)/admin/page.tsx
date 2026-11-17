import Link from "next/link";
import { StatusLabel, type PageStatus } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관리자 | HomeFit AI" };

const CARDS: [string, string, string, PageStatus][] = [
  ["/admin/users", "사용자 및 권한 관리", "회원 목록과 역할(읽기). 관리자 수정 기록은 다음 단계(PRD FR-20).", "skeleton"],
  ["/admin/watch", "외부 데이터 수집 현황 · API 오류와 실행 로그", "마이홈·기상청 실행 기록, 실패 이유, AI 호출 오류(읽기).", "ready"],
  ["/admin/incidents", "사건 및 처리 현황", "종류·상태별 수(읽기). 관리자도 대신 승인하지 못합니다.", "ready"],
  ["/admin/flow", "Agent Workflow 노드 캔버스(흐름 화면)", "가장 최근 실행의 단계 상자(읽기). 캔버스 그림은 다음 단계(PRD FR-23).", "skeleton"],
  ["/admin/sim", "사건 시뮬레이터", "가짜 공고·예보 묶음 목록. 버튼 실행은 다음 단계(PRD FR-24).", "skeleton"],
  ["/admin/eval", "Eval 테스트 결과", "맞힌·놓친·잘못 울린 수(PRD FR-25).", "skeleton"],
  ["/admin/chat", "위키 챗봇", "위키 쪽만 근거로 답(PRD FR-26).", "skeleton"],
];

// IA AD_070000_PG 관리자 개요 (spec 004)
export default function AdminPage() {
  return (
    <div className={styles.grid}>
      {CARDS.map(([href, title, text, status]) => (
        <Link key={href} href={href} className={styles.card}>
          <h2>{title}</h2>
          <p className={styles.muted}>{text}</p>
          <StatusLabel status={status} />
        </Link>
      ))}
    </div>
  );
}
