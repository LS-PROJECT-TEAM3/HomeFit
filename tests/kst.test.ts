import { describe, expect, it } from "vitest";
import { toKstDate } from "@/watch/kst";

// 마감 비교는 한국 날짜로 한다. 서버(Vercel)는 UTC로 돈다
describe("toKstDate", () => {
  it("UTC 15:00은 한국 다음 날 0시", () => {
    expect(toKstDate(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  });

  it("UTC 14:59는 한국 같은 날", () => {
    expect(toKstDate(new Date("2026-11-17T14:59:59Z"))).toBe("2026-11-17");
  });

  it("해가 바뀌는 때도 맞다", () => {
    expect(toKstDate(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
  });
});
