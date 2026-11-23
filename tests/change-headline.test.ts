import { describe, expect, it } from "vitest";
import { changeHeadline } from "@/incident/change-text";

// spec 022(캔버스 v2-s4-alert-pc): 공고 상세 내 알림 카드 제목
describe("changeHeadline", () => {
  it("바뀐 칸이 하나면 그 칸 이름", () => {
    expect(changeHeadline({ kind: "changed", changes: [{ field: "applyEnd", before: "2026-11-30", after: "2026-11-28" }], relatedAnnouncementId: null })).toBe("접수 마감일이 바뀌었어요");
  });
  it("여러 칸·정정·완화·처음 공고", () => {
    expect(changeHeadline({ kind: "changed", changes: [{ field: "applyEnd", before: null, after: null }, { field: "monthlyRent", before: 1, after: 2 }], relatedAnnouncementId: null })).toBe("공고 내용이 여러 곳 바뀌었어요");
    expect(changeHeadline({ kind: "correction", changes: [], relatedAnnouncementId: "A" })).toBe("정정공고가 올라왔어요");
    expect(changeHeadline({ kind: "relaxed", changes: [], relatedAnnouncementId: null })).toBe("같은 단지에 새 모집이 올라왔어요");
    expect(changeHeadline(undefined)).toBe("새 공고 알림이 왔어요");
  });
});
