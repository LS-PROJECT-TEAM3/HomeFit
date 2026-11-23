"use client";

import { useEffect } from "react";
import { lockChrome, setChromeHidden, topNavHeight } from "./chrome";

// 사용자 요청(2026-11-21): 버튼·체크박스·입력 칸 같은 조작 요소를 다루면, 그 요소가 속한 영역(카드)이
// 위쪽 메뉴와 탭 줄 바로 아래에 맞춰지게 스크롤한다. 빈 여백을 누르면 움직이지 않는다.
// 더 올라올 수 없는 아래쪽 영역(메모 등)은 브라우저가 끝까지만 내려가 화면 아래에 맞춰진다.
// 영역이 화면보다 커서 누른 요소가 밀려 나가면, 그 요소만 보이게 조금 옮긴다

const INTERACTIVE = "button, a[href], input, select, textarea, summary, label, [role='button'], [role='checkbox']";
const GAP = 16; // 메뉴·탭 줄과 영역 사이 여백

/** 지금 보이는 붙는 탭 줄(집 점검)의 높이 */
function stickyBarHeight(): number {
  const bar = [...document.querySelectorAll<HTMLElement>("[data-sticky-bar]")].find((el) => el.getClientRects().length > 0);
  return bar?.offsetHeight ?? 0;
}

function scrollTarget(control: Element, area: Element): number | null {
  const chrome = topNavHeight() + stickyBarHeight();
  const areaTop = area.getBoundingClientRect().top;
  if (Math.abs(areaTop - (chrome + GAP)) <= 4) return null; // 이미 맞춰져 있음
  let top = window.scrollY + areaTop - chrome - GAP;
  // 영역을 맞추면 누른 요소가 화면 아래로 나가는 경우: 그 요소가 보이게만
  const rect = control.getBoundingClientRect();
  const after = rect.bottom - (areaTop - chrome - GAP);
  if (after > window.innerHeight - GAP) top = window.scrollY + rect.bottom - window.innerHeight + GAP;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  top = Math.max(0, Math.min(top, max));
  return Math.abs(top - window.scrollY) > 4 ? top : null;
}

function onUse(event: Event) {
  const node = event.target;
  if (!(node instanceof Element)) return;
  if (event.type === "focusin" && !node.matches(":focus-visible")) return; // 키보드로 옮겨 갈 때만(마우스는 click에서)
  const control = node.closest(INTERACTIVE);
  if (!control || control.closest("dialog, [data-topnav], [data-sticky-bar]")) return;
  // 표시한 영역이 먼저, 없으면 카드(section), 그다음 목록 칸(li)
  const area = control.closest("[data-snap-section]") ?? control.closest("section") ?? control.closest("li");
  if (!area || !area.closest("main")) return;
  const top = scrollTarget(control, area);
  if (top === null) return;
  lockChrome(1200);
  setChromeHidden(false);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
}

/** (main) 화면 틀에 한 번 둔다 */
export function FocusScroll() {
  useEffect(() => {
    document.addEventListener("click", onUse);
    document.addEventListener("focusin", onUse);
    return () => {
      document.removeEventListener("click", onUse);
      document.removeEventListener("focusin", onUse);
    };
  }, []);
  return null;
}
