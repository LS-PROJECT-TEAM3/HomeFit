import { describe, expect, it } from "vitest";
import { checkEmail, checkNewPassword, routeAccess, safeNextPath } from "@/lib/supabase/auth-rules";

// spec 014 FR-001~003, 경계 E1·E4·E5·E7
describe("routeAccess (주소별 로그인 규칙)", () => {
  it("로그인·가입·재설정 메일 요청은 공개(로그인한 사람은 홈으로, E7)", () => {
    for (const path of ["/login", "/signup", "/reset-password"]) expect(routeAccess(path)).toBe("public");
  });
  it("E5: 새 비밀번호 화면은 로그인(메일 링크) 필요", () => {
    expect(routeAccess("/reset-password/new")).toBe("private");
  });
  it("메일 링크 확인 주소는 로그인 여부와 상관없이 연다", () => {
    expect(routeAccess("/auth/confirm")).toBe("open");
  });
  // spec 021 3단계: 브라우저가 쿠키 없이 가져가는 앱 정보·아이콘·서비스 워커는 로그인 화면으로 돌리지 않는다
  it("웹 푸시용 서비스 워커·앱 정보·아이콘은 연다", () => {
    for (const path of ["/sw.js", "/manifest.webmanifest", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png"]) {
      expect(routeAccess(path)).toBe("open");
    }
    expect(routeAccess("/icons/../admin")).toBe("private");
  });
  it("그 밖은 로그인 필요", () => {
    for (const path of ["/", "/schedule", "/login-help", "/reset-passwordx"]) expect(routeAccess(path)).toBe("private");
  });
});

describe("checkEmail (E1)", () => {
  it("비었거나 모양이 아니면 고칠 방법을 알린다", () => {
    expect(checkEmail("")).toBe("이메일을 입력해 주세요. 예: name@example.com");
    expect(checkEmail("name")).toBe("이메일 형식이 맞지 않습니다. name@example.com처럼 입력해 주세요.");
    expect(checkEmail("a b@c.d")).not.toBeNull();
  });
  it("모양이 맞으면 null", () => {
    expect(checkEmail("name@example.com")).toBeNull();
  });
});

describe("checkNewPassword (E4)", () => {
  it("8자 미만은 거절", () => {
    expect(checkNewPassword("1234567", "1234567")).toBe("비밀번호는 8자 이상이어야 합니다. 다시 입력해 주세요.");
  });
  it("두 칸이 다르면 거절", () => {
    expect(checkNewPassword("abcd1234", "abcd1235")).toBe("두 비밀번호가 같지 않습니다. 같은 비밀번호를 두 번 입력해 주세요.");
  });
  it("앞뒤 공백도 글자로 센다", () => {
    expect(checkNewPassword("  abcdef", "  abcdef")).toBeNull();
  });
  it("8자 이상이고 같으면 null", () => {
    expect(checkNewPassword("abcd1234", "abcd1234")).toBeNull();
  });
});

describe("safeNextPath (바깥 주소로 보내지 않기)", () => {
  it("이 사이트 안 주소만 그대로", () => {
    expect(safeNextPath("/reset-password/new")).toBe("/reset-password/new");
  });
  it("바깥 주소·이상한 값은 홈으로", () => {
    for (const bad of [null, "", "https://evil.example", "//evil.example", "/\\evil.example", "reset"]) expect(safeNextPath(bad)).toBe("/");
  });
  // PR #19 리뷰: 주소를 해석할 때 탭·줄바꿈이 지워져 "//evil.example"이 되는 것을 막는다
  it("탭·줄바꿈·캐리지 리턴 같은 제어 문자가 있으면 홈으로", () => {
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/reset-password\u0000"]) expect(safeNextPath(bad)).toBe("/");
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example"]) expect(new URL(bad, "http://localhost:3000").host).toBe("evil.example");
  });
});
