import { describe, expect, it } from "vitest";
import { addPolicyToScheduleError, buildPolicyChecklist, followedRowIds, policyDueText, POLICY_SOURCE } from "@/incident/policy-schedule";
import { scheduleOrigin } from "@/incident/schedule-origin";

// spec 026 FR-002~005, E2·E4 (qa C-2601~2604)
describe("buildPolicyChecklist (C-2601)", () => {
  it("끝 날짜가 있으면 마감 항목에 그 날짜", () => {
    expect(buildPolicyChecklist({ applyEnd: "2026-12-31", periodKind: "period" })).toEqual([
      { label: "공고문에서 신청 자격 확인하기", dueOn: null },
      { label: "정책 원문의 제출 서류 준비하기", dueOn: null },
      { label: "신청 마감(2026-12-31) 전에 신청하기", dueOn: "2026-12-31" },
    ]);
  });
  it("상시면 마감 없이 신청하기", () => {
    expect(buildPolicyChecklist({ applyEnd: null, periodKind: "always" })[2]).toEqual({ label: "신청하기(상시 신청, 공고문 확인)", dueOn: null });
  });
  it("기간을 모르면 원문에서 신청 기간 확인", () => {
    expect(buildPolicyChecklist({ applyEnd: null, periodKind: "unknown" })[2]).toEqual({ label: "신청 기간을 공고문에서 확인하고 신청하기", dueOn: null });
  });
  it("자격을 판정하는 말이 없다(PRD 9절)", () => {
    const labels = buildPolicyChecklist({ applyEnd: null, periodKind: "always" }).map((i) => i.label).join(" ");
    expect(labels).not.toMatch(/대상입니다|자격이 됩|해당합니다/);
    expect(buildPolicyChecklist({ applyEnd: null, periodKind: "always" })).toHaveLength(3);
  });
});

describe("policyDueText (C-2602)", () => {
  it("마감일이 없으면 상시와 기간 모름을 따로(spec v0.3), 있으면 null(일정 화면이 날짜로 보임)", () => {
    expect(policyDueText(null, "always")).toBe("상시 신청, 공고문 확인");
    expect(policyDueText(null, "unknown")).toBe("신청 기간 공고문 확인");
    expect(policyDueText(null, null)).toBe("신청 기간 공고문 확인"); // 정책을 찾지 못함
    expect(policyDueText("2026-12-31", "period")).toBeNull();
  });
});

describe("followedRowIds (C-2603, E5)", () => {
  const rows = [{ id: "P1" }, { id: "P2" }, { id: "P3" }];
  it("팔로우한 정책 ID의 줄만", () => {
    expect(followedRowIds(rows, ["P3"])).toEqual(new Set(["P3"]));
    expect(followedRowIds(rows, [])).toEqual(new Set());
  });
  it("E5(사용자 결정 \"ID가 같을 때만\"): 같은 이름 묶음의 다른 지역 건(P9)을 팔로우해도 대표 줄은 팔로우 중이 아님", () => {
    expect(followedRowIds(rows, ["P9"])).toEqual(new Set());
  });
});

describe("scheduleOrigin 정책 (C-2604)", () => {
  it("출처가 정책이면 정책 상세, 공고·알림은 그대로", () => {
    expect(scheduleOrigin({ incidentId: null, announcementId: "R2025 1", sourceCode: POLICY_SOURCE })).toEqual({ href: "/policy/R2025%201", label: "출처 정책 보기" });
    expect(scheduleOrigin({ incidentId: null, announcementId: "A1", sourceCode: "myhome_notice" })).toEqual({ href: "/notices/A1", label: "출처 공고 보기" });
    expect(scheduleOrigin({ incidentId: "i-1", announcementId: null, sourceCode: null })).toEqual({ href: "/incidents/i-1", label: "출처 알림 보기" });
  });
});

describe("addPolicyToScheduleError (E2·E4)", () => {
  it("DB 함수의 거절 이유 → 할 일", () => {
    expect(addPolicyToScheduleError("not_followed")).toBe("팔로우한 정책만 일정에 넣을 수 있어요. 먼저 팔로우해 주세요.");
    expect(addPolicyToScheduleError("policy_not_found")).toBe("정책을 찾을 수 없습니다. 정책 목록에서 다시 열어 주세요.");
    expect(addPolicyToScheduleError("??")).toBe("일정에 넣지 못했습니다. 잠시 뒤 다시 해 주세요.");
  });
});
