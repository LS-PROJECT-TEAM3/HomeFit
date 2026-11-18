import { Suspense } from "react";
import { PolicyTabs } from "@/app/_components/policy-tabs";
import styles from "@/app/_components/hub.module.css";

export default function PolicyLayout({ children }: LayoutProps<"/policy">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>직장과 정책</h1>
      {/* 정책 상세(/policy/[id])처럼 주소에 값이 있는 화면은 탭이 주소를 읽을 때까지 기다려야 한다(Cache Components 빌드 오류, 관리자 탭과 같음) */}
      <Suspense fallback={<div className={styles.tabsFallback} aria-hidden="true" />}>
        <PolicyTabs />
      </Suspense>
      {children}
    </main>
  );
}
