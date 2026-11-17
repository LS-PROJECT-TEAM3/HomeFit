import { SectionTabs } from "@/app/_components/section-tabs";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { requireAdmin } from "./guard";
import styles from "@/app/_components/hub.module.css";

const TABS = [
  ["/admin", "개요"], ["/admin/users", "회원"], ["/admin/watch", "수집 현황·오류"], ["/admin/incidents", "사건 현황"],
  ["/admin/flow", "흐름 화면"], ["/admin/sim", "시뮬레이터"], ["/admin/eval", "채점 결과"], ["/admin/chat", "위키 챗봇"],
] as const;

async function Gate({ children }: { children: React.ReactNode }) {
  await connection();
  let allowed: boolean;
  try {
    allowed = await requireAdmin();
  } catch {
    return <LoadError>관리자 권한을 확인하지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!allowed) return <LoadError>관리자만 볼 수 있습니다.</LoadError>;
  return <>{children}</>;
}

// IA AD_070000_PG 관리자 (spec 004 뼈대). 보조 네비게이션은 위쪽 탭 (IA 네비게이션 모델)
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>관리자</h1>
      <SectionTabs label="관리자 메뉴" tabs={TABS.map(([href, label]) => ({ href, label }))} />
      <div>
        <Suspense fallback={<Loading />}>
          <Gate>{children}</Gate>
        </Suspense>
      </div>
    </main>
  );
}
