"use client";

import { useEffect, type RefObject } from "react";

// 사용자 요청(2026-11-23): 필수 칸을 비우고 다음/저장을 누르면 첫 오류 칸으로 옮겨 바로 입력하게 한다.
// 접힌 묶음 안이면 펼친다. 위아래에 붙는 머리·단계 줄에 가리지 않게 화면 가운데로 맞춘다
export function useFirstError(formRef: RefObject<HTMLFormElement | null>, errors: Record<string, string | undefined> | undefined) {
  const hasError = Boolean(errors && Object.values(errors).some(Boolean));
  useEffect(() => {
    if (!hasError) return;
    const target = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']");
    if (!target) return;
    for (let fold = target.closest("details"); fold; fold = fold.parentElement?.closest("details") ?? null) fold.open = true;
    const focusable = target.matches("input, select, textarea") ? target : target.querySelector<HTMLElement>("input, select, textarea");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    focusable?.focus({ preventScroll: true });
  }, [formRef, hasError, errors]);
}
