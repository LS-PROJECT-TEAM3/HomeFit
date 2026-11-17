import styles from "./page.module.css";

// IA HM_000000_PG 홈. 1단계에서는 뼈대만 둔다. 대시보드 카드는 plan 5단계에서 만든다.
export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>HomeFit AI</h1>
      <p className={styles.lead}>
        나에게 맞는 주거 지원 공고를 놓치지 않도록 준비하고 있습니다.
      </p>
    </main>
  );
}
