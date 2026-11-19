import { SectionTabs, type Tab } from "./section-tabs";

// 기획안 9절 Work & Policy → "청년 정책" (spec 004 v0.6: 직장·생활권 탭 뺌, 사용자 결정 2026-11-19). 공공임대 모집 = 맞춤 공고, 신청 계획 = 내 일정
const TABS: Tab[] = [
  { href: "/notices", label: "공공임대 모집(맞춤 공고)" },
  { href: "/schedule", label: "신청 계획(내 일정)" },
  { href: "/policy", label: "청년 주거지원 정책" }, // spec 006 FR-003
];

export function PolicyTabs() {
  return <SectionTabs tabs={TABS} label="청년 정책 메뉴" />;
}
