// 로그인·가입·비밀번호 재설정이 함께 쓰는 규칙. 순수 함수 (spec 001 FR-001, spec 014 FR-001~003)

/** 가입과 새 비밀번호가 같은 규칙을 쓴다 (spec 001, spec 014 E4) */
export const MIN_PASSWORD = 8;

// IA MB_010000_PG, MB_010100_PG, MB_010300_PG: 로그인 안 해도 열고, 로그인했으면 홈으로
const PUBLIC_PATHS = new Set(["/login", "/signup", "/reset-password"]);
// 메일 링크 확인 주소는 로그인 여부와 상관없이 연다 (spec 014 FR-002)
const OPEN_PATHS = new Set(["/auth/confirm"]);

export type RouteAccess = "public" | "open" | "private";

export function routeAccess(pathname: string): RouteAccess {
  if (PUBLIC_PATHS.has(pathname)) return "public";
  if (OPEN_PATHS.has(pathname)) return "open";
  return "private";
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** spec 014 E1. 고칠 것이 없으면 null */
export function checkEmail(email: string): string | null {
  if (email === "") return "이메일을 입력해 주세요. 예: name@example.com";
  if (!EMAIL_SHAPE.test(email)) return "이메일 형식이 맞지 않습니다. name@example.com처럼 입력해 주세요.";
  return null;
}

/** spec 014 E4. 앞뒤 공백도 글자로 센다(가입과 같음) */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다. 다시 입력해 주세요.`;
  if (password !== confirm) return "두 비밀번호가 같지 않습니다. 같은 비밀번호를 두 번 입력해 주세요.";
  return null;
}

// 주소를 해석할 때 탭·줄바꿈 같은 제어 문자는 지워져 "/\t/evil" → "//evil"(바깥 사이트)이 된다(PR #19 리뷰)
const CONTROL_CHAR = /[\u0000-\u001F\u007F]/;

/** 메일 링크의 next 값으로 바깥 사이트에 보내지 않는다. 이 사이트 안 주소만 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || CONTROL_CHAR.test(next)) return "/";
  return next;
}
