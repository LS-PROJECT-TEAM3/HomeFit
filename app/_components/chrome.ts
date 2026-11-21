"use client";

// 사용자 요청(2026-11-21): 위쪽 메뉴와 화면 탭(머리 부분)을 화면 위에 붙여 두고, 직접 아래로 스크롤하면 숨기고 위로 스크롤하면 보인다.
// 상태는 <html data-chrome="hidden">로 둔다(메뉴·탭 CSS가 같이 읽음). 자동 이동 중에는 잠가서 방향 판단이 끼어들지 않게 한다

export function setChromeHidden(hidden: boolean) {
  document.documentElement.dataset.chrome = hidden ? "hidden" : "shown";
}

let lockUntil = 0;

/** ms 동안 숨김·보임 판단을 멈춘다(내용을 눌러 자동 이동할 때 메뉴·탭을 보인 채로 두려고) */
export function lockChrome(ms: number) {
  lockUntil = Date.now() + ms;
}

export function chromeLocked(): boolean {
  return Date.now() < lockUntil;
}

/** 지금 보이는 위쪽 메뉴의 높이(PC 72px, 휴대폰 60px) */
export function topNavHeight(): number {
  const nav = [...document.querySelectorAll<HTMLElement>("[data-topnav]")].find((el) => el.getClientRects().length > 0);
  return nav?.offsetHeight ?? 0;
}
