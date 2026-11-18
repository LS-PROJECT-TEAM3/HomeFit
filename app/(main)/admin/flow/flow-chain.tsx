import type { FlowArrow, FlowBox } from "@/flow/graph";
import flowStyles from "./flow.module.css";

// spec 005 FR-003: 단계 상자 사이에 화살표와 넘긴 건수. 상자 상세(IA AD_070401_MD)는 펼침으로, 키보드로도 열린다
export function FlowChain({ boxes, arrows }: { boxes: FlowBox[]; arrows: FlowArrow[] }) {
  return (
    <ol className={flowStyles.chain} aria-label="단계 흐름">
      {boxes.map((box, i) => (
        <li key={box.name} style={{ display: "contents" }}>
          {i > 0 ? (
            <span className={flowStyles.arrow} aria-hidden="true">
              <span>→</span>
              <span>{arrows[i - 1].count === null ? "" : `${arrows[i - 1].count}건`}</span>
            </span>
          ) : null}
          <details className={`${flowStyles.box} ${flowStyles[box.state]}`}>
            <summary>
              <span className={flowStyles.name}>{box.label}</span>
              <span className={flowStyles.state}>{box.stateLabel}</span>
              <span className={flowStyles.count}>들어옴 {box.itemsIn ?? "—"} · 나감 {box.itemsOut ?? "—"}</span>
            </summary>
            {box.details.length > 0 ? (
              <dl className={flowStyles.details}>
                {box.details.map((d) => (
                  <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>
                ))}
              </dl>
            ) : (
              <p className={flowStyles.details}>상세 기록 없음</p>
            )}
          </details>
        </li>
      ))}
    </ol>
  );
}
