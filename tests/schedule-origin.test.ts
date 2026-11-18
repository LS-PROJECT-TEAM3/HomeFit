import { describe, expect, it } from "vitest";
import { addToScheduleError, scheduleOrigin } from "@/incident/schedule-origin";

// spec 007 FR-004, 경계 E1·E5
describe("scheduleOrigin", () => {
  it("알림에서 온 일정은 출처 알림으로", () => {
    expect(scheduleOrigin({ incidentId: "i-1", announcementId: null })).toEqual({ href: "/incidents/i-1", label: "출처 알림 보기" });
  });
  it("공고에서 온 일정은 출처 공고로(공고 ID는 주소에 맞게)", () => {
    expect(scheduleOrigin({ incidentId: null, announcementId: "SIM 1/2" })).toEqual({ href: "/notices/SIM%201%2F2", label: "출처 공고 보기" });
  });
  it("둘 다 없으면 링크 없음", () => {
    expect(scheduleOrigin({ incidentId: null, announcementId: null })).toBeNull();
  });
});

describe("addToScheduleError", () => {
  it("E1·E5: DB 함수의 거절 이유를 사용자 문구로", () => {
    expect(addToScheduleError("not_followed")).toBe("팔로우한 공고만 일정에 넣을 수 있습니다. 먼저 팔로우해 주세요.");
    expect(addToScheduleError("notice_not_found")).toBe("공고를 찾을 수 없습니다. 맞춤 공고에서 다시 열어 주세요.");
    expect(addToScheduleError("다른 오류")).toBe("일정에 넣지 못했습니다. 잠시 뒤 다시 해 주세요.");
  });
});
