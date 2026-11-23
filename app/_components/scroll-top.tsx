"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import styles from "./scroll-top.module.css";

const SHOW_AFTER_PX = 400;

/** 맨 위로 버튼(사용자 요청 2026-11-21). 조금 내려가면 오른쪽 아래 챗봇 버튼 위에 보인다. 움직임 줄이기 설정이면 바로 올라간다 */
export function ScrollTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!shown) return null;
  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };
  return (
    <button type="button" className={styles.button} onClick={toTop} aria-label="맨 위로" title="맨 위로">
      <span className={styles.arrow}><Icon name="chevron-down" size={22} /></span>
    </button>
  );
}
