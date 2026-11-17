import type { Notice } from "@/watch/notice";
import type { PolicyCondition } from "@/incident/match";

// 시험용 가짜 자료. 실제 공고·개인 정보가 아니다.
export function makeNotice(overrides: Partial<Notice> = {}): Notice {
  return {
    externalId: "TEST-0001-1",
    announcementId: "TEST-0001",
    title: "가짜 행복주택 입주자 모집",
    sidoCode: "11",
    sigunguCode: "11680",
    supplyType: "행복주택",
    monthlyRent: 250000,
    announcedOn: "2026-11-16",
    applyStart: "2026-11-20",
    applyEnd: "2026-11-22",
    url: "https://example.test/notice/0001",
    ...overrides,
  };
}

export function makeCondition(overrides: Partial<PolicyCondition> = {}): PolicyCondition {
  return {
    sidoCode: "11",
    sigunguCode: "11680",
    supplyTypes: ["ALL"],
    maxMonthlyRent: 300000,
    age: 26,
    ...overrides,
  };
}
