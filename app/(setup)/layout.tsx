import Link from "next/link";
import styles from "./setup.module.css";

// spec 022(캔버스 v2-s1-open-pc·v2-s2-open-pc): 첫 설정은 위쪽 메뉴 없이 로고만 있는 머리(68px). 로그인 확인은 화면이 한다
export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.head}>
        <Link href="/" className={styles.logo} aria-label="HomeFit 홈">HomeFit</Link>
      </header>
      {children}
    </div>
  );
}
