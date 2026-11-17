import { describe, expect, it } from "vitest";
import {
  changeDedupKey,
  complexKeyOf,
  diffTracked,
  findNoticeChanges,
  trackedValues,
  type ChangeInput,
} from "@/incident/notice-change";
import { makeNotice } from "./fixtures";

const today = "2026-11-17";
const source = "myhome_notice";

function input(overrides: Partial<ChangeInput> = {}): ChangeInput {
  return {
    notices: [makeNotice()],
    previousByExternalId: new Map(),
    seenAnnouncementIds: new Set(),
    seenComplexKeys: new Set(),
    today,
    ...overrides,
  };
}

// FR-006 (spec 001 v0.2): 바뀐 칸만 전 → 후로
describe("diffTracked", () => {
  it("마감일만 바뀌면 그 칸 하나", () => {
    const before = trackedValues(makeNotice({ applyEnd: "2026-11-30" }));
    const after = trackedValues(makeNotice({ applyEnd: "2026-12-07" }));
    expect(diffTracked(before, after)).toEqual([{ field: "applyEnd", before: "2026-11-30", after: "2026-12-07" }]);
  });

  it("같으면 빈 목록", () => {
    expect(diffTracked(trackedValues(makeNotice()), trackedValues(makeNotice()))).toEqual([]);
  });

  it("임대료만 바뀌면 임대료 칸", () => {
    const changes = diffTracked(trackedValues(makeNotice()), trackedValues(makeNotice({ monthlyRent: 230000 })));
    expect(changes).toEqual([{ field: "monthlyRent", before: 250000, after: 230000 }]);
  });

  it("제목·링크만 바뀐 것은 변화가 아니다", () => {
    const before = trackedValues(makeNotice());
    const after = trackedValues(makeNotice({ title: "제목만 다름", url: "https://example.test/x" }));
    expect(diffTracked(before, after)).toEqual([]);
  });
});

describe("findNoticeChanges", () => {
  it("firstSeen: 처음 보인 공고는 변화가 아니다(맞는 공고일 뿐)", () => {
    expect(findNoticeChanges(input())).toEqual([]);
  });

  it("baseline: 이미 저장된 공고가 같은 값이면 변화가 아니다(0005 전 자료 포함)", () => {
    const notice = makeNotice();
    const previous = new Map([[notice.externalId, trackedValues(notice)]]);
    expect(findNoticeChanges(input({ notices: [notice], previousByExternalId: previous }))).toEqual([]);
  });

  it("마감일이 바뀌면 changed 변화 하나", () => {
    const notice = makeNotice({ applyEnd: "2026-12-07" });
    const previous = new Map([[notice.externalId, trackedValues(makeNotice({ applyEnd: "2026-11-30" }))]]);
    const [change] = findNoticeChanges(input({ notices: [notice], previousByExternalId: previous }));
    expect(change.kind).toBe("changed");
    expect(change.changes).toEqual([{ field: "applyEnd", before: "2026-11-30", after: "2026-12-07" }]);
  });

  it("expired: 마감이 지난 공고의 변화는 사건으로 보지 않는다", () => {
    const notice = makeNotice({ applyEnd: "2026-11-16", monthlyRent: 1 });
    const previous = new Map([[notice.externalId, trackedValues(makeNotice({ applyEnd: "2026-11-16" }))]]);
    expect(findNoticeChanges(input({ notices: [notice], previousByExternalId: previous }))).toEqual([]);
  });

  // FR-016 (spec 001 v0.2)
  it("correction: 이미 본 공고를 고친 정정공고는 변화", () => {
    const notice = makeNotice({ externalId: "NEW-1", announcementId: "NEW", statusName: "정정공고", beforeAnnouncementId: "OLD" });
    const [change] = findNoticeChanges(input({ notices: [notice], seenAnnouncementIds: new Set(["OLD"]) }));
    expect(change.kind).toBe("correction");
    expect(change.relatedAnnouncementId).toBe("OLD");
  });

  it("correction: 본 적 없는 공고의 정정공고는 변화가 아니다", () => {
    const notice = makeNotice({ externalId: "NEW-1", announcementId: "NEW", beforeAnnouncementId: "OLD" });
    expect(findNoticeChanges(input({ notices: [notice] }))).toEqual([]);
  });

  it("relaxed: 같은 단지에 '자격완화' 공고가 새로 오면 변화", () => {
    const old = makeNotice();
    const notice = makeNotice({ externalId: "R-1", announcementId: "R", title: "가짜단지 자격완화 예비입주자 모집" });
    const [change] = findNoticeChanges(input({ notices: [notice], seenComplexKeys: new Set([complexKeyOf(old)!]) }));
    expect(change.kind).toBe("relaxed");
  });

  it("relaxed: 다른 단지이거나 낱말이 없으면 변화가 아니다", () => {
    const old = makeNotice();
    const otherComplex = makeNotice({ externalId: "R-1", announcementId: "R", title: "자격완화 모집", complexName: "다른단지" });
    const noWord = makeNotice({ externalId: "R-2", announcementId: "R2", title: "일반 모집" });
    const seen = new Set([complexKeyOf(old)!]);
    expect(findNoticeChanges(input({ notices: [otherComplex, noWord], seenComplexKeys: seen }))).toEqual([]);
  });

  it("단지 이름이 없으면 단지 키도 없다", () => {
    expect(complexKeyOf(makeNotice({ complexName: null }))).toBeNull();
  });
});

describe("changeDedupKey", () => {
  const notice = makeNotice({ applyEnd: "2026-12-07" });
  const change = { notice, kind: "changed" as const, changes: [{ field: "applyEnd" as const, before: "2026-11-30", after: "2026-12-07" }], relatedAnnouncementId: null };

  it("같은 변화는 같은 키(재수집해도 한 번)", () => {
    expect(changeDedupKey(source, change)).toBe(changeDedupKey(source, { ...change }));
  });

  it("같은 공고라도 바뀐 뒤 값이 다르면 다른 키", () => {
    const later = { ...change, changes: [{ field: "applyEnd" as const, before: "2026-12-07", after: "2026-12-14" }] };
    expect(changeDedupKey(source, change)).not.toBe(changeDedupKey(source, later));
  });

  it("같은 공고의 다른 단지라도 같은 변화면 같은 키", () => {
    const other = { ...change, notice: makeNotice({ externalId: "TEST-0001-2", applyEnd: "2026-12-07" }) };
    expect(changeDedupKey(source, change)).toBe(changeDedupKey(source, other));
  });

  it("정정공고는 새 공고 ID로 키를 만든다", () => {
    const correction = { notice: makeNotice({ announcementId: "NEW" }), kind: "correction" as const, changes: [], relatedAnnouncementId: "OLD" };
    expect(changeDedupKey(source, correction)).toBe("housing_support:myhome_notice:NEW:correction");
  });
});
