import styles from "./status.module.css";

// IA 공통 컴포넌트 "상태 배지": 색과 글자를 함께 쓴다 (.claude/rules/design.md 5)
export type IncidentStatus = "new" | "pending" | "approved" | "rejected";

const LABELS: Record<IncidentStatus, string> = {
  new: "새 사건",
  pending: "승인 대기",
  approved: "승인",
  rejected: "거절",
};

export function isIncidentStatus(value: string): value is IncidentStatus {
  return value in LABELS;
}

export function statusLabel(status: IncidentStatus): string {
  return LABELS[status];
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABELS[status]}</span>;
}

export function UpdatedBadge() {
  return <span className={`${styles.badge} ${styles.updated}`}>바뀜</span>;
}

export function SimulatedBadge() {
  return <span className={`${styles.badge} ${styles.simulated}`}>시뮬레이터</span>;
}

// FR-020 (spec 001 v0.5): 맞는 공고의 팔로우 상태도 사건 상태처럼 배지로 (H-006 사용자 의견)
export type NoticeStatus = "new" | "follow" | "ignore" | "closed";

const NOTICE_LABELS: Record<NoticeStatus, string> = { new: "새 공고", follow: "팔로우", ignore: "관심 없음", closed: "마감" };
const NOTICE_STYLES: Record<NoticeStatus, string> = { new: styles.new, follow: styles.approved, ignore: styles.rejected, closed: styles.updated };

export function NoticeBadge({ status }: { status: NoticeStatus }) {
  return <span className={`${styles.badge} ${NOTICE_STYLES[status]}`}>{NOTICE_LABELS[status]}</span>;
}
