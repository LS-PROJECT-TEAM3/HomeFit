import Link from "next/link";
import { InfoTip } from "@/app/_components/info-tip";
import { GAS_TARIFF } from "@/incident/gas-bill";
import { GAS_SHARES, type GasYearView } from "@/incident/gas-year";
import { BillChart } from "../bill-chart";
import { about } from "../energy-figure";
import styles from "../energy.module.css";

// IA EN_110200_TB 난방비 > 12개월 예상 난방비 (spec 025 FR-002~006, PRD FR-28 v1.24, 캔버스 v2-energy-merged-heat).
// 모든 금액은 "추정". 근거: 가스공사 시도별 전체 판매량(가정용만이 아님)의 달별 비율, 검침·청구 달 기준

function Empty({ title, body, link }: { title: string; body: string; link: string }) {
  return (
    <section className={styles.card} aria-labelledby="gas-year-title">
      <h2 id="gas-year-title" className={styles.cardTitle}>12개월 예상 난방비</h2>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
      <Link href="/my/home" className={styles.buttonPrimary}>{link}</Link>
    </section>
  );
}

// 사용자 요청(2026-11-23): 추정 근거(spec 025 FR-004)는 카드 아래 문단 대신 제목 옆 설명 아이콘에 넣는다
function basis({ national, regionName }: { national: boolean; regionName: string }) {
  const { source } = GAS_SHARES;
  return (
    <>
      추정 근거: <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name} (새 창)</a>의 {source.years[0]}~{source.years[source.years.length - 1]}년{" "}
      {national ? "전국" : "내 집 시도"} 달별 비율로, 고지서 한 장을 바탕으로 나머지 달을 어림했어요(넣은 달 ÷ 그 달 비율 = 한 해).{national ? " 내 집 시도 자료를 쓸 수 없어 전국 비율을 썼어요." : ""} 가정용만이 아닌 전체 판매량(산업용 등 포함)이고, 판매는 검침·청구한 달 기준이라
      실제 쓴 달과 한 달쯤 다를 수 있어요. 요금은 {GAS_TARIFF.source.name}({GAS_TARIFF.source.basedOn}) {regionName} 단가, 부가세 포함이에요. 실제 고지서와 다를 수 있어요.
    </>
  );
}

export function GasYearCard({ view }: { view: GasYearView }) {
  if (view.kind === "none") {
    return <Empty title="고지서 한 장이면 돼요" body="설정 → 내 집 → 도시가스에 고지서의 사용량(MJ)과 몇 월 고지서인지 넣으면 12개월 예상 난방비를 보여 드려요." link="내 집에서 입력" />;
  }
  if (view.kind === "needRegion") {
    return <Empty title="요금 지역을 골라 주세요" body="이 지역은 도시가스 요금이 공급사마다 달라요. 설정 → 내 집 → 도시가스에서 고지서의 공급사와 같은 요금 지역을 골라 주세요." link="요금 지역 고르기" />;
  }
  const totals = view.year.months.map((m) => m.bill.totalWithVat);
  const peak = view.year.peakMonth;
  return (
    <section className={styles.card} aria-labelledby="gas-year-title">
      <span className={styles.cardTitleRow}>
        <h2 id="gas-year-title" className={styles.cardTitle}>12개월 예상 난방비</h2>
        <InfoTip icon text="고지서 한 장과 가스공사 달별 판매 비율로 한 해를 어림한 추정이에요. 눌러서 근거를 보세요." body={basis({ national: view.national, regionName: view.region.name })} label="12개월 예상 난방비 설명 보기" />
      </span>
      <p className={styles.emptyBody}>
        한 해 약 <b>{about(view.year.totalWithVat)}원</b>(추정, 부가세 포함) / {view.month}월 고지서 {view.mj.toLocaleString("ko-KR")}MJ / {view.region.name}
      </p>
      <BillChart values={totals} month={view.month} currentLabel="고지서 달" currentText={`${view.month}월 약 ${about(totals[view.month - 1])}원`} maxText={`${peak}월 약 ${about(totals[peak - 1])}원`} />
      {view.year.basicFeeMissing ? <p className={styles.emptyBody}>이 지역은 기본요금을 요금표에서 읽지 못해 빼고 계산했어요.</p> : null}
    </section>
  );
}
