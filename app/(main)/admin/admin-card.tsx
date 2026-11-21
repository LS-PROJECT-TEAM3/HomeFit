import type { ReactNode } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import styles from "./admin.module.css";

// spec 022 FR-014(캔버스 v2-admin-*-pc, DS Card): 관리자 화면 칸. 세리프 제목 + 설명은 아이콘(보드처럼 긴 문장을 숨김)
export function AdminCard({ title, tip, children, id }: { title: ReactNode; tip?: string; children: ReactNode; id: string }) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <div className={styles.head}>
        <h2 id={id} className={styles.title}>{title}</h2>
        {tip ? <InfoTip icon text={tip} label={`${typeof title === "string" ? title : "이 칸"} 설명 보기`} /> : null}
      </div>
      {children}
    </section>
  );
}
