"use client";

import { useState } from "react";
import type { FlowArrow, FlowBox } from "@/flow/graph";
import flowStyles from "./flow.module.css";

// spec 005 FR-003: 단계 상자 사이에 화살표와 넘긴 건수. 상자 상세(IA AD_070401_MD)
// 사용자 요청(2026-11-23): 상자를 펼치면 줄 높이가 바뀌어 어지러웠다. 상자 크기는 고정하고,
// 누른 상자의 기록은 아래 한 칸에 보인다. 처음에는 실패한 상자, 없으면 첫 상자를 보여 준다
export function FlowChain({ boxes, arrows }: { boxes: FlowBox[]; arrows: FlowArrow[] }) {
  const first = Math.max(0, boxes.findIndex((b) => b.state === "failed"));
  const [picked, setPicked] = useState(first);
  const box = boxes[picked];
  return (
    <>
      <p className={flowStyles.chainHelp}>단계 상자를 누르면 아래에 그 단계의 기록이 나와요.</p>
      <ol className={flowStyles.chain} aria-label="단계 흐름">
        {boxes.map((b, i) => (
          // 화살표는 다음 상자와 한 칸에 둬서, 줄이 바뀌어도 줄 끝에 화살표만 남지 않는다
          <li key={b.name} className={flowStyles.step}>
            {i > 0 ? (
              <span className={flowStyles.arrow} aria-hidden="true">
                <span>→</span>
                <span>{arrows[i - 1].count === null ? "" : `${arrows[i - 1].count}건`}</span>
              </span>
            ) : null}
            <button type="button" className={`${flowStyles.box} ${flowStyles.stepBox} ${flowStyles[b.state]}`} aria-pressed={i === picked} onClick={() => setPicked(i)}>
              <span className={flowStyles.name}>{b.label}</span>
              <span className={flowStyles.state}>{b.stateLabel}</span>
              {b.itemsIn === null && b.itemsOut === null ? null : (
                <span className={flowStyles.count}>들어옴 {b.itemsIn ?? 0} / 나감 {b.itemsOut ?? 0}</span>
              )}
            </button>
          </li>
        ))}
      </ol>
      {box ? (
        // 사용자 요청(2026-11-23): 위아래로 쌓인 작은 글자는 읽기 어려웠다. 머리(단계·상태·건수) + 이름/값 타일 격자, 0이나 "없음"은 흐리게
        <section className={flowStyles.detailPanel} aria-live="polite" aria-label={`${box.label} 기록`}>
          <div className={flowStyles.detailHead}>
            <b className={flowStyles.detailTitle}>{box.label} 단계</b>
            <span className={`${flowStyles.detailState} ${flowStyles[box.state]}`}><span className={flowStyles.state}>{box.stateLabel}</span></span>
            {box.itemsIn === null && box.itemsOut === null ? null : (
              <span className={flowStyles.detailCount}>들어옴 <b>{box.itemsIn ?? 0}</b> / 나감 <b>{box.itemsOut ?? 0}</b></span>
            )}
          </div>
          {box.details.length > 0 ? (
            <dl className={flowStyles.tiles}>
              {box.details.map((d) => (
                <div key={d.label} className={`${flowStyles.tile} ${isEmptyValue(d.value) ? flowStyles.tileEmpty : ""}`}>
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          ) : <p className={flowStyles.detailNone}>이 단계는 따로 남긴 기록이 없어요.</p>}
        </section>
      ) : null}
    </>
  );
}

/** 0, "없음", 모두 0인 묶음("보냄 0 · 실패 0")은 흐리게 보여 눈이 먼저 값 있는 칸으로 가게 한다 */
function isEmptyValue(value: string): boolean {
  if (value === "없음" || value === "0") return true;
  const numbers = value.match(/\d+/g);
  return numbers !== null && /·/.test(value) && numbers.every((n) => n === "0");
}
