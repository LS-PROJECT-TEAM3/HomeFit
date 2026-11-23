import Link from "next/link";
import styles from "./auth.module.css";

const POINTS = [
  ["맞춤 공고", "조건에 맞는 공공임대 공고와 청년 주거 정책"],
  ["내 집 변화", "습도/결로 위험과 주변 전월세 시세 변화"],
  ["승인한 대응만", "내가 승인한 할 일만 일정에 저장"],
] as const;

// spec 022: 로그인·가입·비밀번호 재설정은 첫 설정(app/(setup))과 같은 틀. 로고 머리 + 왼쪽 안내 + 오른쪽 입력
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.head}>
        <Link href="/" className={styles.logo} aria-label="HomeFit 홈">HomeFit</Link>
      </header>
      <div className={styles.body}>
        <main className={styles.main}>
          <div className={styles.panel}>{children}</div>
        </main>
        <aside className={styles.aside} aria-label="HomeFit 소개">
          <p className={styles.asideTitle}>대응할 시간이<br />남아 있을 때<br />먼저 알려 드려요</p>
          <ol className={styles.points}>
            {POINTS.map(([name, text], i) => (
              <li key={name} className={styles.point}>
                <span className={styles.pointNum} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.pointText}><b className={styles.pointName}>{name}</b>{text}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
