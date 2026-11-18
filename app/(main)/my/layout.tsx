import { SectionTabs, type Tab } from "@/app/_components/section-tabs";
import styles from "./my.module.css";

// IA MY_030000_PG 내 정보. 탭: 내 집(MY_030200_TB, spec 003), 공고·정책 조건(MY_030100_TB), 슬랙 알림(MY_030500_TB), 계정(MY_030400_TB)
// 관심 지역 탭은 시세 기능에서 더한다. 탭 모양은 spec 004 v0.2 공통 탭
const TABS: Tab[] = [
  { href: "/my/home", label: "내 집" },
  { href: "/my/conditions", label: "공고·정책 조건" },
  { href: "/my/notifications", label: "슬랙 알림" },
  { href: "/my/account", label: "계정" },
];

export default function MyLayout({ children }: LayoutProps<"/my">) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>내 정보</h1>
      <SectionTabs tabs={TABS} label="내 정보 메뉴" />
      {children}
    </main>
  );
}
