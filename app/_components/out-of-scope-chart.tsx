import { StatusLabel } from "./page-status";
import styles from "./hub.module.css";

// spec 004 v0.2: 범위 밖 화면의 빈 그래프 자리. 가짜 숫자를 그리지 않는다(실제 조사처럼 보이지 않게, CLAUDE.md)
export function OutOfScopeChart({ title, reason }: { title: string; reason: string }) {
  return (
    <section className={styles.card} aria-labelledby="oos-title">
      <h2 id="oos-title">{title}</h2>
      <StatusLabel status="out" />
      <div aria-hidden="true" style={{ height: 160, border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", display: "grid", placeItems: "center", color: "var(--color-muted-text)" }}>
        그래프 자리
      </div>
      <p className={styles.muted}>{reason}</p>
    </section>
  );
}
