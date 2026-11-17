import Link from "next/link";
import styles from "./my.module.css";

// IA MY_030000_PG 내 정보. 탭: 공고·정책 조건(MY_030100_TB), 계정(MY_030400_TB).
// 내 집·관심 지역 탭은 spec 001 제외 범위라 아직 두지 않는다.
export default function MyLayout({ children }: LayoutProps<"/my">) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>내 정보</h1>
      <nav aria-label="내 정보 메뉴" className={styles.tabs}>
        <Link href="/my/conditions" className={styles.tab}>공고·정책 조건</Link>
        <Link href="/my/account" className={styles.tab}>계정</Link>
      </nav>
      {children}
    </main>
  );
}
