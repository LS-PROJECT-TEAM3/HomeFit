// 로그인·가입·비밀번호 재설정이 함께 쓰는 규칙. 순수 함수 (spec 001 FR-001, spec 014 FR-001~003)

/** 가입과 새 비밀번호가 같은 규칙을 쓴다 (spec 001, spec 014 E4) */
export const MIN_PASSWORD = 8;

// IA MB_010000_PG, MB_010100_PG, MB_010300_PG: 로그인 안 해도 열고, 로그인했으면 홈으로
const PUBLIC_PATHS = new Set(["/login", "/signup", "/reset-password"]);
// 메일 링크 확인 주소는 로그인 여부와 상관없이 연다 (spec 014 FR-002)
// spec 021: 브라우저가 쿠키 없이 가져가는 서비스 워커·앱 정보·아이콘도 연다(로그인 화면으로 돌리면 웹 푸시·홈 화면 추가가 깨짐)
const OPEN_PATHS = new Set([
  "/auth/confirm",
  "/sw.js", "/manifest.webmanifest", "/apple-icon.png", "/icons/icon-192.png", "/icons/icon-512.png",
]);

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

/** 사용자 요청(2026-11-23): 내 집도 공고/정책 조건도 없는 처음 계정은 로그인 뒤 첫 설정으로, 그 밖에는 홈으로 */
export function afterSignInPath(saved: { hasHome: boolean; hasCondition: boolean }): "/onboarding" | "/" {
  return saved.hasHome || saved.hasCondition ? "/" : "/onboarding";
}

/**
 * 사용자 요청(2026-11-23, AI 해커톤 제출): 로그인 화면 오른쪽 아래 팝업에 가입 없이 써 볼 일반 계정을 적어 둔다.
 * 값은 환경변수에 두고(저장소에 남기지 않음) 둘 다 있을 때만 팝업을 켠다. 공개해도 되는 체험 계정만 넣는다
 */
export function demoAccount(env: Record<string, string | undefined>): { email: string; password: string } | null {
  const email = env.DEMO_USER_EMAIL?.trim() ?? "";
  const password = env.DEMO_USER_PASSWORD ?? "";
  return email && password ? { email, password } : null;
}
