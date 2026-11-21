import { Icon } from "@/app/_components/icons";
import styles from "@/app/_components/form.module.css";

/**
 * 사용자 요청(2026-11-18) "내 정보 입력이 너무 많고 보기 불편": 칸 묶음을 접는다.
 * 브라우저 기본 details/summary라 키보드(Enter·Space)로 열고 닫히고, 접혀 있어도 칸은 폼과 함께 저장된다.
 * status는 "입력함 4/5"처럼 글자로 보인다(색만으로 구분하지 않음, 디자인 기본선 5)
 */
export function Fold({ title, status, open, children }: { title: string; status?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className={styles.fold} open={open}>
      <summary className={styles.foldSummary}>
        <span className={styles.foldTitle}>{title}</span>
        {status ? <span className={styles.foldStatus}>{status}</span> : null}
        <span className={styles.foldChevron} aria-hidden="true"><Icon name="chevron-down" size={20} /></span>
      </summary>
      <div className={styles.foldBody}>{children}</div>
    </details>
  );
}

/** 채운 칸 수 → "입력함 n/m" 또는 "비어 있음" */
export function filledStatus(values: readonly string[]): string {
  const filled = values.filter((v) => v.trim() !== "").length;
  return filled === 0 ? "비어 있음" : `입력함 ${filled}/${values.length}`;
}
