// spec 004 v0.2: 메뉴·탭·작은 그래프에 쓰는 순수 함수(화면 없이 시험한다)

/** 지금 주소가 이 메뉴에 속하는가. 홈("/")은 정확히 같을 때만, 나머지는 하위 주소까지 */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type MenuKey = "home" | "notices" | "alerts" | "schedule" | "more" | "account";

// spec 022 FR-010, IA v1.17: 위쪽 메뉴 자리. 정책은 맞춤 공고 안 탭, 설정·관리자는 이름 메뉴
const MENU_PATHS: [MenuKey, string[]][] = [
  ["notices", ["/notices", "/policy"]],
  ["alerts", ["/incidents"]],
  ["schedule", ["/schedule"]],
  ["more", ["/compare", "/qc", "/energy", "/knowledge"]],
  ["account", ["/my", "/admin"]],
];

/** 지금 주소가 위쪽 메뉴의 어느 칸인가. 메뉴에 없는 화면은 null */
export function activeMenu(pathname: string): MenuKey | null {
  if (pathname === "/") return "home";
  const found = MENU_PATHS.find(([, hrefs]) => hrefs.some((href) => isActivePath(pathname, href)));
  return found ? found[0] : null;
}

/** 값 목록 → SVG polyline 좌표. 큰 값이 위. 값이 모두 같으면 가운데 줄 */
export function sparklinePoints(values: readonly number[], box: { width: number; height: number }): string {
  if (values.length === 0) return "";
  const round = (n: number) => Math.round(n * 10) / 10;
  if (values.length === 1) return `${round(box.width / 2)},${round(box.height / 2)}`;
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * box.width;
      const y = span === 0 ? box.height / 2 : box.height - ((value - min) / span) * box.height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}
