import styles from "./hub.module.css";

// spec 004: 화면마다 지금 상태를 글자로 밝힌다(되는 것 / 뼈대 / 이번 범위 밖). 색만 쓰지 않는다 (디자인 기본선 5)
export type PageStatus = "ready" | "skeleton" | "out";

const LABEL: Record<PageStatus, string> = { ready: "되는 것", skeleton: "뼈대", out: "이번 범위 밖" };

export function StatusLabel({ status }: { status: PageStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{LABEL[status]}</span>;
}

/** 뼈대 화면 맨 위 안내: 무엇이 들어올지와 근거(PRD FR 번호) */
export function SkeletonNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.notice} role="note">
      <StatusLabel status="skeleton" /> <span>{children}</span>
    </div>
  );
}
