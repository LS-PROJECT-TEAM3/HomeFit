import styles from "./states.module.css";

// IA 공통 컴포넌트 "빈 화면·불러오는 중·조회 실패": 데이터 없음과 조회 실패를 다른 문구로 (.claude/rules/design.md 7, P3-12)
export function Loading({ label = "불러오는 중…" }: { label?: string }) {
  return <p className={styles.loading} role="status">{label}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>;
}

export function LoadError({ children }: { children: React.ReactNode }) {
  return <div className={styles.error} role="alert">{children}</div>;
}
