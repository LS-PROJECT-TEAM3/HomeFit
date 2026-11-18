import { describe, expect, it } from "vitest";
import { uniqueByExternalId } from "@/watch/notice";
import { makeNotice } from "./fixtures";

// 2026-11-17 실제 수집에서 같은 공고·단지가 한 응답에 두 번 와서 저장이 실패함 (qa 실패와 조치 7)
describe("uniqueByExternalId", () => {
  it("같은 줄 ID가 여러 번이면 마지막 것 하나만 남긴다", () => {
    const first = makeNotice({ externalId: "A-1", applyEnd: "2026-11-20" });
    const again = makeNotice({ externalId: "A-1", applyEnd: "2026-11-25" });
    const other = makeNotice({ externalId: "B-1" });
    expect(uniqueByExternalId([first, other, again])).toEqual([again, other]);
  });

  it("겹치는 것이 없으면 그대로", () => {
    const list = [makeNotice({ externalId: "A-1" }), makeNotice({ externalId: "B-1" })];
    expect(uniqueByExternalId(list)).toEqual(list);
  });
});
