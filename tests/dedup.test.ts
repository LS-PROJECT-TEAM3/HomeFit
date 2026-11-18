import { describe, expect, it } from "vitest";
import { housingSupportDedupKey, noticeFingerprint } from "@/incident/dedup";
import { makeNotice } from "./fixtures";

// FR-006 (spec 001): 같은 공고는 사용자마다 사건 하나, 바뀌면 갱신
describe("housingSupportDedupKey", () => {
  it("같은 출처·같은 공고 ID는 같은 키다", () => {
    const a = housingSupportDedupKey("myhome_notice", "TEST-0001");
    const b = housingSupportDedupKey("myhome_notice", "TEST-0001");
    expect(a).toBe(b);
  });

  it("같은 공고의 다른 단지는 같은 키다(공고 ID로만 만든다)", () => {
    const a = makeNotice({ externalId: "21581-1", announcementId: "21581" });
    const b = makeNotice({ externalId: "21581-3", announcementId: "21581" });
    expect(housingSupportDedupKey("myhome_notice", a.announcementId)).toBe(
      housingSupportDedupKey("myhome_notice", b.announcementId),
    );
  });

  it("공고 ID가 다르면 키가 다르다", () => {
    expect(housingSupportDedupKey("myhome_notice", "TEST-0001")).not.toBe(
      housingSupportDedupKey("myhome_notice", "TEST-0002"),
    );
  });
});

describe("noticeFingerprint", () => {
  it("내용이 같으면 지문이 같다(안 바뀜)", () => {
    expect(noticeFingerprint(makeNotice())).toBe(noticeFingerprint(makeNotice()));
  });

  it("마감일만 바뀌어도 지문이 다르다(바뀜)", () => {
    expect(noticeFingerprint(makeNotice())).not.toBe(
      noticeFingerprint(makeNotice({ applyEnd: "2026-11-25" })),
    );
  });

  it("원문 링크만 바뀐 것은 바뀜으로 보지 않는다", () => {
    expect(noticeFingerprint(makeNotice())).toBe(
      noticeFingerprint(makeNotice({ url: "https://example.test/other" })),
    );
  });
});
