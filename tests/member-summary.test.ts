import { describe, expect, it } from "vitest";
import { readMemberView, summarizeMembers, viewMembers } from "@/incident/member-summary";

// spec 005 FR-005 (PRD FR-20, IA AD_070100_TB): 관리자 회원 목록 요약. 읽기만
describe("summarizeMembers", () => {
  const profiles = [
    { id: "aaaaaaaa-1111", role: "admin", created_at: "2026-11-01T00:00:00Z" },
    { id: "bbbbbbbb-2222", role: "member", created_at: "2026-11-01T16:00:00Z" },
  ];
  // 가입일은 한국 날짜: 11-01 16:00 UTC = 11-02 01:00 KST
  it("회원마다 조건·내 집·알림 수·승인 대기 수를 세고, 가상 계정을 표시한다", () => {
    const rows = summarizeMembers({
      profiles,
      conditionUserIds: ["bbbbbbbb-2222"],
      homeUserIds: ["bbbbbbbb-2222"],
      incidents: [
        { user_id: "bbbbbbbb-2222", status: "pending" }, { user_id: "bbbbbbbb-2222", status: "new" },
        { user_id: "bbbbbbbb-2222", status: "approved" }, { user_id: "aaaaaaaa-1111", status: "rejected" },
      ],
      virtualIds: new Set(["bbbbbbbb-2222"]),
    });
    expect(rows).toEqual([
      { id: "aaaaaaaa-1111", shortId: "aaaaaaaa-1111", role: "관리자", joinedOn: "2026-11-01", hasCondition: false, hasHome: false, incidents: 1, waiting: 0, isVirtual: false },
      { id: "bbbbbbbb-2222", shortId: "bbbbbbbb-2222", role: "회원", joinedOn: "2026-11-02", hasCondition: true, hasHome: true, incidents: 3, waiting: 2, isVirtual: true },
    ]);
  });
  it("승인 대기는 새 알림과 승인 대기를 함께 센다(사용자 결정을 기다리는 것)", () => {
    const [row] = summarizeMembers({ profiles: [profiles[1]], conditionUserIds: [], homeUserIds: [], incidents: [{ user_id: "bbbbbbbb-2222", status: "new" }], virtualIds: new Set() });
    expect(row.waiting).toBe(1);
  });
});

describe("readMemberView / viewMembers (회원 표 정렬·역할 거르기)", () => {
  const base = { hasCondition: false, hasHome: false, isVirtual: false, shortId: "" };
  const rows = [
    { ...base, id: "a", role: "회원", joinedOn: "2026-11-01", incidents: 3, waiting: 0 },
    { ...base, id: "b", role: "관리자", joinedOn: "2026-11-02", incidents: 1, waiting: 2 },
    { ...base, id: "c", role: "회원", joinedOn: "2026-11-03", incidents: 3, waiting: 1 },
  ];
  it("모르는 값은 기본(가입 오름차순, 전체)", () => {
    expect(readMemberView({ sort: "x", dir: "up", role: "boss" })).toEqual({ sort: "joined", dir: "asc", role: "all" });
    expect(readMemberView({ sort: "waiting", dir: "desc", role: "admin" })).toEqual({ sort: "waiting", dir: "desc", role: "관리자" });
  });
  it("내림차순으로 정렬하고 같은 값은 가입 순서를 지킨다", () => {
    expect(viewMembers(rows, { sort: "incidents", dir: "desc", role: "all" }).map((m) => m.id)).toEqual(["a", "c", "b"]);
    expect(viewMembers(rows, { sort: "waiting", dir: "asc", role: "all" }).map((m) => m.id)).toEqual(["a", "c", "b"]);
  });
  it("역할로 거른다", () => {
    expect(viewMembers(rows, { sort: "joined", dir: "asc", role: "회원" }).map((m) => m.id)).toEqual(["a", "c"]);
  });
});
