import Link from "next/link";
import styles from "./my.module.css";

// IA MY_030000_PG 내 정보. 탭: 내 집(MY_030200_TB, spec 003), 공고·정책 조건(MY_030100_TB), 알림(MY_030500_TB), 계정(MY_030400_TB).
// 관심 지역 탭은 시세 기능에서 더한다.
export default function MyLayout({ children }: LayoutProps<"/my">) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>내 정보</h1>
      <nav aria-label="내 정보 메뉴" className={styles.tabs}>
        <Link href="/my/home" className={styles.tab}>내 집</Link>
        <Link href="/my/conditions" className={styles.tab}>공고·정책 조건</Link>
        <Link href="/my/notifications" className={styles.tab}>슬랙 알림</Link>
        <Link href="/my/account" className={styles.tab}>계정</Link>
      </nav>
      {children}
    </main>
  );
}
