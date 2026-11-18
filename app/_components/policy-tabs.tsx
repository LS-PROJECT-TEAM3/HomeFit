import { SectionTabs, type Tab } from "./section-tabs";

// 기획안 9절 Work & Policy (spec 004 v0.2): 공공임대 모집 = 맞춤 공고, 신청 계획 = 내 일정
const TABS: Tab[] = [
  { href: "/notices", label: "공공임대 모집(맞춤 공고)" },
  { href: "/schedule", label: "신청 계획(내 일정)" },
  { href: "/policy", label: "청년 주거지원 정책" }, // spec 006 FR-003
  { href: "/policy/commute", label: "직장·생활권", note: "범위 밖" },
];

export function PolicyTabs() {
  return <SectionTabs tabs={TABS} label="직장과 정책 메뉴" />;
}
