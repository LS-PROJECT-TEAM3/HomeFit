import { Suspense, type ReactNode } from "react";
import { SideTabs, type SideTab } from "./side-tabs";
import styles from "./side-tabs.module.css";

// spec 022 FR-014: 설정·관리자 화면 틀(기본형). 탭은 주소를 읽으므로 Suspense 안에 둔다(주소에 값이 있는 /admin/users/[id] 빌드 오류 방지)
type Props = { title: string; tabs: readonly SideTab[]; label: string; columns: 2 | 3; exactFirst?: boolean; centerPhoneHead?: boolean; children: ReactNode };

export function SideTabsPage({ title, tabs, label, columns, exactFirst, centerPhoneHead = false, children }: Props) {
  return (
    <main className={styles.page}>
      {centerPhoneHead ? (
        <div className={styles.centerHead}>
          <h1 className={styles.title}>{title}</h1>
          <span aria-hidden="true" className={styles.centerLine} />
        </div>
      ) : <h1 className={styles.title}>{title}</h1>}
      <div className={styles.layout}>
        <Suspense fallback={<div className={styles.nav} aria-hidden="true" />}>
          <SideTabs tabs={tabs} label={label} columns={columns} exactFirst={exactFirst} />
        </Suspense>
        <div className={styles.content}>{children}</div>
      </div>
    </main>
  );
}
