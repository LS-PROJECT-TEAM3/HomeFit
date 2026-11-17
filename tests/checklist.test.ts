import { describe, expect, it } from "vitest";
import { buildDefaultChecklist, describeDeadline } from "@/incident/checklist";
import { makeNotice } from "./fixtures";

const today = "2026-11-17";

// FR-009, FR-013 (spec 001): 남은 날 수 표시
describe("describeDeadline", () => {
  it("5일 남음", () => {
    expect(describeDeadline("2026-11-22", today)).toBe("5일 남음");
  });

  it("오늘 마감", () => {
    expect(describeDeadline(today, today)).toBe("오늘 마감");
  });

  it("마감 지남", () => {
    expect(describeDeadline("2026-11-16", today)).toBe("마감 지남");
  });

  it("마감일이 없으면 표시하지 않는다", () => {
    expect(describeDeadline(null, today)).toBeNull();
  });

  it("달이 바뀌어도 날 수를 맞게 센다", () => {
    expect(describeDeadline("2026-12-01", "2026-11-30")).toBe("1일 남음");
  });
});

// FR-010 (spec 001): AI가 실패해도 쓸 기본 체크리스트
describe("buildDefaultChecklist", () => {
  it("항목이 3개 이상이고 마감일은 원문 값이다", () => {
    const items = buildDefaultChecklist(makeNotice({ applyEnd: "2026-11-22" }));
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((item) => item.dueOn === "2026-11-22")).toBe(true);
  });

  it("자격은 판정하지 않고 공고문 확인 항목으로 둔다", () => {
    const items = buildDefaultChecklist(makeNotice());
    expect(items.some((item) => item.label.includes("공고문"))).toBe(true);
  });

  it("마감일이 없으면 신청 기간을 공고문에서 확인하라는 항목을 둔다", () => {
    const items = buildDefaultChecklist(makeNotice({ applyEnd: null }));
    expect(items.some((item) => item.label.includes("신청 기간"))).toBe(true);
    expect(items.every((item) => item.dueOn === null)).toBe(true);
  });
});

describe("describeDeadline 값이 없을 때", () => {
  it("마감일 칸이 아예 없는 사건(습도·결로, spec 003)도 오류 없이 null", () => {
    expect(describeDeadline(undefined, "2026-11-17")).toBeNull();
  });
});
