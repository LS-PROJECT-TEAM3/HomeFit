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
