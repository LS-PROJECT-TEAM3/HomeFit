import Link from "next/link";
import { Icon } from "@/app/_components/icons";
import styles from "./overview.module.css";

export const metadata = { title: "관리자 | HomeFit AI" };

// IA AD_070000_PG 관리자 개요 (spec 004, spec 005·010·012). spec 022 FR-014(캔버스 v2-admin-overview-pc): 3칸 카드, 문구는 보드대로.
// 근거 요구: 회원 PRD FR-20, 수집 FR-21, 흐름 FR-23, 시뮬레이터 FR-24, 채점 FR-25, 위키 챗봇 FR-26
const CARDS: [string, string, string][] = [
  ["/admin/users", "회원", "회원 목록과 상세, 조건 수정 기록을 봐요."],
  ["/admin/watch", "수집 현황/오류", "출처별 연속 실패 수, 실행 기록, AI 호출 오류를 봐요."],
  ["/admin/incidents", "사건 현황", "종류와 상태별 사건 수를 봐요. 관리자도 대신 승인할 수 없어요."],
  ["/admin/flow", "흐름 화면", "실행마다 단계 상자와 건수를 봐요."],
  ["/admin/sim", "시뮬레이터", "가짜 묶음을 버튼으로 돌려 봐요. 알림은 가상 계정에만 가요."],
  ["/admin/eval", "채점 결과", "정답이 붙은 묶음 28건의 맞힘, 놓침, 잘못 울림을 봐요."],
  ["/admin/chat", "위키 챗봇", "팀 위키만 근거로 답해요. 없으면 없다고 답해요."],
];

export default function AdminPage() {
  return (
    <ul className={styles.grid}>
      {CARDS.map(([href, title, text]) => (
        <li key={href}>
          <Link href={href} className={styles.card}>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.text}>{text}</p>
            <span className={styles.open}><span className={styles.openText}>열기</span><Icon name="chevron-right" size={18} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
