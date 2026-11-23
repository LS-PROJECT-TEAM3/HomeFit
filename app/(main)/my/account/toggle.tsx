import styles from "./account.module.css";

// spec 022 FR-014(DS Toggle, 캔버스 v2-settings-alert-pc): 켜기/끄기 스위치. 상태는 색과 함께 손잡이 위치·글자("켜짐/꺼짐")로도
export function Toggle({ label, on, disabled, onClick }: { label: string; on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`${styles.toggle} ${on ? styles.toggleOn : ""}`} disabled={disabled} onClick={onClick}>
      <span className={styles.track} aria-hidden="true"><span className={styles.knob} /></span>
      <span className={styles.toggleText}>{label} {on ? "켜짐" : "꺼짐"}</span>
    </button>
  );
}
