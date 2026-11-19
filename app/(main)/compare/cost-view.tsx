import type { EstimateBasis } from "@/incident/energy-estimate.server";
import type { CostItem, RealCost } from "@/incident/real-cost";
import { KEPCO_SOURCE } from "@/watch/kepco-household";
import styles from "@/app/_components/hub.module.css";

// spec 009 FR-005·spec 011 FR-002: 값마다 종류를 글자로(색만으로 구분하지 않음, 디자인 기본선 5)
const KIND: Record<CostItem["kind"], string> = { input: "입력", calculated: "계산", estimated: "추정값", missing: "미입력" };

export function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function CostCell({ item }: { item: CostItem }) {
  if (item.value === null) return <span>미입력</span>;
  return <span className="tabular-nums">{won(item.value)} <small>({KIND[item.kind]})</small></span>;
}

export function TotalText({ cost }: { cost: RealCost }) {
  return (
    <span className="tabular-nums">
      <strong>{won(cost.total)}</strong>
      {cost.estimated.length ? <small> (추정 포함: {cost.estimated.join("·")})</small> : null}
      {cost.missing.length ? <small> (미입력 {cost.missing.join("·")} 빠짐)</small> : null}
    </span>
  );
}

/** 이번 달(한국 시각). 전기요금 하계 구간을 고르는 데만 쓴다 */
export function kstMonth(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(now));
}

/** spec 011 FR-001·SC-001: 추정값의 근거(통계 이름·기준 달·링크). 불러오지 못한 시군구가 있으면 알린다 */
export function EstimateNote({ basis }: { basis: EstimateBasis }) {
  const months = [...new Set([...basis.averages.values()].map((a) => `${a.year}년 ${Number(a.month)}월`))];
  if (months.length === 0 && basis.failed === 0) return null;
  return (
    <p className={styles.muted}>
      {months.length ? <>&ldquo;추정값&rdquo;은 사용량을 모르는 집에 그 시군구의 <a href={KEPCO_SOURCE.url} target="_blank" rel="noreferrer">{KEPCO_SOURCE.name}</a>({months.join("·")} 기준) 가구당 평균 사용량을 넣어 요금표로 계산한 값입니다. 집 면적은 반영하지 않습니다. </> : null}
      {basis.failed ? <>한전 통계를 불러오지 못한 지역 {basis.failed}곳은 에너지비를 추정하지 못했습니다. 잠시 뒤 다시 열어 주세요.</> : null}
    </p>
  );
}
