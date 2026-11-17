import { PolicyTabs } from "@/app/_components/policy-tabs";
import styles from "@/app/_components/hub.module.css";

export default function PolicyLayout({ children }: LayoutProps<"/policy">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>직장과 정책</h1>
      <PolicyTabs />
      {children}
    </main>
  );
}
