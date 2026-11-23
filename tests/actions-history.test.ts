import { describe, expect, it } from "vitest";
import { latestRejectReason, rejectReasonByIncident } from "@/incident/actions-history";

// spec 023 FR-005·FR-008, 경계 E7 (qa C-2301): 처리 이력은 쌓기만 하므로 거절 사유는 마지막 거절 줄에서 읽는다
const reject = (reason: string) => ({ action: "reject", reason });
const cancelReject = { action: "cancel_reject", reason: null };

describe("latestRejectReason", () => {
  it("이력이 없으면 null", () => {
    expect(latestRejectReason([])).toBeNull();
  });
  it("거절 하나면 그 사유", () => {
    expect(latestRejectReason([reject("자격이 안 돼요")])).toBe("자격이 안 돼요");
  });
  it("거절 → 거절 취소 → 거절이면 마지막 사유", () => {
    expect(latestRejectReason([reject("자격이 안 돼요"), cancelReject, reject("일정이 맞지 않아요")])).toBe("일정이 맞지 않아요");
  });
  it("거절을 취소한 뒤로 거절이 없으면 null", () => {
    expect(latestRejectReason([reject("자격이 안 돼요"), cancelReject])).toBeNull();
  });
  it("거절 취소만 있거나 승인만 있으면 null", () => {
    expect(latestRejectReason([cancelReject])).toBeNull();
    expect(latestRejectReason([{ action: "approve", reason: null }, { action: "cancel_approve", reason: null }])).toBeNull();
  });
});

describe("rejectReasonByIncident", () => {
  it("사건마다 시각 순 이력에서 마지막 거절 사유를 고른다", () => {
    const rows = [
      { incident_id: "a", ...reject("이미 지원했어요") },
      { incident_id: "b", action: "approve", reason: null },
      { incident_id: "a", ...cancelReject },
      { incident_id: "a", ...reject("관심이 없어요") },
    ];
    const reasons = rejectReasonByIncident(rows);
    expect(reasons.get("a")).toBe("관심이 없어요");
    expect(reasons.has("b")).toBe(false);
  });
});
