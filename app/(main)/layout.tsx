import { connection } from "next/server";
import { Suspense } from "react";
import { ChatWidget } from "@/app/_components/chat-widget";
import { countOpenIncidents } from "@/incident/queries.server";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "./top-nav";
import styles from "./main.module.css";

/** 위쪽 메뉴의 새 알림 수, 관리자 메뉴, 로그인 이메일. 못 읽어도 메뉴는 그대로 보인다(숫자·관리자만 빠짐) */
async function TopNavWithCounts() {
  await connection();
  let newAlerts = 0;
  let isAdmin = false;
  let email = "알 수 없음";
  try {
    const supabase = await createClient();
    const [counts, admin, claims] = await Promise.all([countOpenIncidents(), supabase.rpc("is_admin"), supabase.auth.getClaims()]);
    newAlerts = counts.newCount;
    isAdmin = admin.data === true;
    if (typeof claims.data?.claims?.email === "string") email = claims.data.claims.email;
  } catch {
    // 숫자·관리자 메뉴만 빠지고 메뉴는 그대로
  }
  return <TopNav newAlerts={newAlerts} isAdmin={isAdmin} email={email} />;
}

// IA v1.17 네비게이션 모델 (spec 022 FR-010): 위쪽 메뉴줄, 휴대폰은 메뉴 버튼. 화면마다 하위 항목은 화면 안 탭
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={styles.shell}>
      {/* 메뉴는 주소를 읽어(usePathname) 지금 화면을 표시하므로, 기다리는 동안은 같은 높이의 빈 줄을 둔다(빌드 오류 방지) */}
      <Suspense fallback={<div className={styles.navPlaceholder} aria-hidden="true" />}>
        <TopNavWithCounts />
      </Suspense>
      <div className={styles.content}>{children}</div>
      {/* spec 004 v0.2 FR-007: 모든 화면에 뜨는 챗봇 창(틀) */}
      <ChatWidget />
    </div>
  );
}
