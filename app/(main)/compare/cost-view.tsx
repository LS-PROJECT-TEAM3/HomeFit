import type { EstimateBasis } from "@/incident/energy-estimate.server";
import type { CostItem, RealCost } from "@/incident/real-cost";
import { ENERGY_PANEL } from "@/incident/energy-panel";
import { APT_ENERGY_SOURCE } from "@/watch/apt-energy";
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

/** spec 011 FR-001·spec 017 FR-003: 추정값의 근거(한전 지역 평균 + 패널조사 주택 종류·면적 보정). 한전 값이 없거나 못 불러온 곳도 알린다 */
export function EstimateNote({ basis }: { basis: EstimateBasis }) {
  if (basis.requested === 0) return null;
  const months = [...new Set([...basis.averages.values()].map((a) => `${a.year}년 ${Number(a.month)}월`))];
  const missing = basis.requested - basis.averages.size;
  const { source } = ENERGY_PANEL;
  return (
    <p className={styles.muted}>
      &ldquo;추정값&rdquo;은 사용량을 모르는 집의 한 달 전기 사용량을 어림해 요금표로 계산한 값입니다.
      {months.length ? <> 기준은 그 시군구의 <a href={KEPCO_SOURCE.url} target="_blank" rel="noreferrer">{KEPCO_SOURCE.name}</a>({months.join("·")} 기준) 가구당 평균이고,</> : null}
      {" "}<a href={source.url} target="_blank" rel="noreferrer">{source.name}</a>({source.basedOn}년 기준)의 주택 종류별·면적별 전국 가구당 사용량 비율로 보정했습니다(오피스텔은 &ldquo;다세대/연립/기타&rdquo; 값).
      {missing > 0 ? <> 한전 값이 없거나 불러오지 못한 지역 {missing}곳은 패널조사 전국 평균으로 추정했습니다{basis.failed ? "(잠시 뒤 다시 열면 지역 값으로 바뀔 수 있습니다)" : ""}.</> : null}
      <AptEnergyNote basis={basis} />
    </p>
  );
}

/** spec 018 FR-004: 아파트는 시군구 아파트 평균 사용금액 × 면적. 관리비와 두 번 세지 않게 안내 */
function AptEnergyNote({ basis }: { basis: EstimateBasis }) {
  if (basis.aptAverages.size === 0 && basis.aptFailed === 0) return null;
  const months = [...new Set([...basis.aptAverages.values()].map((a) => `${a.searchDate.slice(0, 4)}년 ${Number(a.searchDate.slice(4))}월`))];
  return (
    <>
      {months.length ? <> 면적을 넣은 아파트는 <a href={APT_ENERGY_SOURCE.url} target="_blank" rel="noreferrer">{APT_ENERGY_SOURCE.name}</a>({months.join("·")}, 작년 같은 달)의 전기·난방·급탕·가스 금액(원/㎡)에 전용면적을 곱했습니다. 아파트 관리비 고지서에 전기·난방이 이미 들어 있으면 두 번 세지 않도록 에너지비를 0으로 넣어 주세요.</> : null}
      {basis.aptFailed ? <> 아파트 평균 사용금액을 불러오지 못한 지역 {basis.aptFailed}곳은 전기 사용량으로만 추정했습니다.</> : null}
    </>
  );
}
