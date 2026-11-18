"use client";

import { useState } from "react";
import styles from "@/app/_components/hub.module.css";

// spec 004 FR-004, PRD FR-29: 입주 전 점검 항목. 뼈대라 체크는 이 화면에서만 기억하고 저장하지 않는다
const ITEMS = [
  "채광: 낮에 불을 끄고도 방이 밝은가",
  "소음: 창을 닫고 바깥·옆집 소리가 들리는가",
  "냄새: 하수구·곰팡이 냄새가 나는가",
  "곰팡이: 창틀·벽 모서리·욕실 실리콘에 검은 자국이 있는가",
  "수압: 싱크대·샤워기 물을 같이 틀어도 세게 나오는가",
  "관리비: 포함 항목(인터넷·수도·청소)과 금액을 받았는가",
  "창 종류: 홑유리인지 이중유리인지 (결로와 난방비에 영향)",
];

export function MoveInChecklist() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (index: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  return (
    <>
      <p className={styles.muted} role="status">{done.size}/{ITEMS.length} 확인</p>
      <ul className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
        {ITEMS.map((item, index) => (
          <li key={item}>
            <label>
              <input type="checkbox" checked={done.has(index)} onChange={() => toggle(index)} /> {item}
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}
