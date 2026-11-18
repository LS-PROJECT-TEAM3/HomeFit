import type { CostItem, RealCost } from "@/incident/real-cost";

// spec 009 FR-005: 값마다 종류를 글자로(색만으로 구분하지 않음, 디자인 기본선 5)
const KIND: Record<CostItem["kind"], string> = { input: "입력", calculated: "계산", missing: "미입력" };

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
      {cost.missing.length ? <small> (미입력 {cost.missing.join("·")} 빠짐)</small> : null}
    </span>
  );
}

/** 이번 달(한국 시각). 전기요금 하계 구간을 고르는 데만 쓴다 */
export function kstMonth(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(now));
}
