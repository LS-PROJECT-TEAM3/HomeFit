import { describe, expect, it } from "vitest";
import { maskSecrets } from "@/watch/mask";

// FR-004 (spec 001): 실행 기록의 오류 메시지에 키 값이 남지 않는다
describe("maskSecrets", () => {
  it("알려 준 키 값을 ***로 가린다", () => {
    const text = "요청 실패: key=abcd1234efgh 로 401";
    expect(maskSecrets(text, ["abcd1234efgh"])).toBe("요청 실패: key=*** 로 401");
  });

  it("주소에 붙은 serviceKey 값은 키 목록에 없어도 가린다", () => {
    const text = "GET https://apis.data.go.kr/x?serviceKey=Zz9%2Bqq&pageNo=1 실패";
    expect(maskSecrets(text, [])).toBe("GET https://apis.data.go.kr/x?serviceKey=***&pageNo=1 실패");
  });

  it("같은 키가 여러 번 나와도 모두 가린다", () => {
    expect(maskSecrets("k1 k1", ["k1k1k1"])).toBe("k1 k1");
    expect(maskSecrets("SECRET-x SECRET-x", ["SECRET-x"])).toBe("*** ***");
  });

  it("빈 값이나 너무 짧은 값은 키로 보지 않는다", () => {
    expect(maskSecrets("abc 오류", ["", "ab"])).toBe("abc 오류");
  });
});
