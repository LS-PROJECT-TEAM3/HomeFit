import { SideTabsPage } from "@/app/_components/side-tabs-page";
import type { SideTab } from "@/app/_components/side-tabs";

// IA MY_030000_PG 설정(v1.17, 옛 "내 정보"). 탭: 내 집(MY_030200_TB, spec 003), 공고·정책 조건(MY_030100_TB), 관심 지역(MY_030300_TB, spec 008),
// 알림 설정(MY_030400_TB, 옛 "계정·알림". 슬랙·웹 푸시). spec 022 FR-014(캔버스 v2-set-*): 왼쪽 세로 탭, 휴대폰은 2칸 밑줄 탭. 로그아웃은 이름 메뉴에만
const TABS: SideTab[] = [
  { href: "/my/home", label: "내 집" },
  { href: "/my/conditions", label: "공고/정책 조건" },
  { href: "/my/areas", label: "관심 지역" },
  { href: "/my/account", label: "알림 설정" },
];

export default function MyLayout({ children }: LayoutProps<"/my">) {
  return <SideTabsPage title="설정" tabs={TABS} label="설정 메뉴" columns={2}>{children}</SideTabsPage>;
}
