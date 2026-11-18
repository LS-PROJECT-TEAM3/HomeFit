import Link from "next/link";
import { StatusLabel, type PageStatus } from "@/app/_components/page-status";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관리자 | HomeFit AI" };

const CARDS: [string, string, string, PageStatus][] = [
  ["/admin/users", "사용자 및 권한 관리", "회원 목록·상세(조건·내 집·알림, 읽기). 관리자 수정과 수정 기록은 표가 필요해 아직 없음(PRD FR-20, spec 005 Q1).", "skeleton"],
  ["/admin/watch", "외부 데이터 수집 현황 · API 오류와 실행 로그", "출처별 연속 실패 수, 지금 한 번 실행, 실행 기록·실패 이유, AI 호출 오류(PRD FR-21).", "ready"],
  ["/admin/incidents", "사건 및 처리 현황", "종류·상태별 수(읽기). 관리자도 대신 승인하지 못합니다.", "ready"],
  ["/admin/flow", "Agent Workflow 노드 캔버스(흐름 화면)", "시작 상자 3종, 실행별 단계 상자·화살표·건수, 상자 상세(키 가림)(PRD FR-23).", "ready"],
  ["/admin/sim", "사건 시뮬레이터", "가짜 공고·예보 묶음을 버튼으로 실행, 알림은 가상 계정에게만(PRD FR-24).", "ready"],
  ["/admin/eval", "Eval 테스트 결과", "정답 묶음 18건의 맞힌·놓친·잘못 울린 수, npm run eval 결과 파일(PRD FR-25).", "ready"],
  ["/admin/chat", "위키 챗봇", "위키 쪽만 근거로 답(PRD FR-26). 질문 기록 표(chat_logs)가 필요해 아직 없음(spec 005 Q2).", "skeleton"],
];

// IA AD_070000_PG 관리자 개요 (spec 004, spec 005에서 상태 갱신)
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
