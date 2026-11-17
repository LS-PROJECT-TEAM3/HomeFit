import { connection } from "next/server";
import { Suspense } from "react";
import { ChatWidget } from "@/app/_components/chat-widget";
import { countOpenIncidents } from "@/incident/queries.server";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "./sidebar";
import styles from "./main.module.css";

/** 사이드바의 새 알림 수와 관리자 메뉴. 못 읽어도 메뉴는 그대로 보인다(숫자만 빠짐) */
async function SidebarWithCounts() {
  await connection();
  let newAlerts = 0;
  let isAdmin = false;
  try {
    const [counts, admin] = await Promise.all([countOpenIncidents(), (await createClient()).rpc("is_admin")]);
    newAlerts = counts.newCount;
    isAdmin = admin.data === true;
  } catch {
    // 숫자·관리자 메뉴만 빠지고 메뉴는 그대로
  }
  return <Sidebar newAlerts={newAlerts} isAdmin={isAdmin} />;
}

// IA 네비게이션 모델 (spec 004 v0.2 FR-001): PC는 왼쪽 사이드바, 휴대폰은 위쪽 메뉴 버튼. 화면마다 하위 항목은 위쪽 탭
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className={styles.shell}>
      {/* 사이드바는 주소를 읽어(usePathname) 지금 화면을 표시하므로, 기다리는 동안은 주소를 읽지 않는 빈 틀을 둔다(빌드 오류 방지) */}
      <Suspense fallback={<aside className={styles.sidebar} aria-hidden="true" />}>
        <SidebarWithCounts />
      </Suspense>
      <div className={styles.content}>{children}</div>
      {/* spec 004 v0.2 FR-007: 모든 화면에 뜨는 챗봇 창(틀) */}
      <ChatWidget />
    </div>
  );
}
