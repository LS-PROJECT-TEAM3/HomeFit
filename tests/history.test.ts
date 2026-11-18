import { describe, expect, it } from "vitest";
import { findRecords, HISTORY_SYSTEM_PROMPT, toHistoryRecords } from "@/knowledge/history";

// spec 005 FR-006 (PRD FR-18, IA KN_050000_PG): 끝난 알림(승인·거절)을 찾는다. 답마다 출처 알림 링크
const rows = [
  { id: "i1", status: "approved", incidentType: "humidity_condensation", title: "결로 위험: 11월 18일 19시", closedAt: "2026-11-17T12:00:00Z", reason: null, todo: ["창문 열어 환기", "제습기 켜기"] },
  { id: "i2", status: "rejected", incidentType: "housing_support", title: "부산 국민임대 정례모집 마감 변경", closedAt: "2026-11-16T12:00:00Z", reason: "지역이 멀어요", todo: [] },
  { id: "i3", status: "pending", incidentType: "housing_support", title: "결로 아닌 승인 대기 알림", closedAt: null, reason: null, todo: [] },
];

describe("toHistoryRecords", () => {
  it("승인·거절로 끝난 알림만, 처리 결과·날짜·거절 사유·할 일을 글로 만든다", () => {
    const records = toHistoryRecords(rows);
    expect(records.map((r) => r.id)).toEqual(["R1", "R2"]);
    expect(records[0]).toMatchObject({ kind: "alert", href: "/incidents/i1", title: "결로 위험: 11월 18일 19시" });
    expect(records[0].text).toContain("승인함");
    expect(records[0].text).toContain("창문 열어 환기");
    expect(records[0].text).toContain("습도·결로");
    expect(records[1].text).toContain("거절 사유: 지역이 멀어요");
  });
});

describe("HISTORY_SYSTEM_PROMPT", () => {
  it("근거가 없을 때의 문장이 기록 찾기용으로 바뀐다", () => {
    expect(HISTORY_SYSTEM_PROMPT).toContain("기록에서 찾지 못했습니다.");
    expect(HISTORY_SYSTEM_PROMPT).not.toContain("공공데이터에서 찾지 못했습니다");
  });
});

describe("findRecords", () => {
  const records = toHistoryRecords(rows);
  it("낱말이 겹치는 끝난 알림을 찾는다(SC-005)", () => {
    expect(findRecords("결로 알림에 뭐 했지?", records).map((r) => r.id)).toEqual(["R1"]);
    expect(findRecords("거절한 국민임대", records).map((r) => r.id)).toEqual(["R2"]);
  });
  it("겹치는 낱말이 없으면 빈 목록(E6: AI를 부르지 않음)", () => {
    expect(findRecords("점심 메뉴", records)).toEqual([]);
    expect(findRecords("", records)).toEqual([]);
  });
});
