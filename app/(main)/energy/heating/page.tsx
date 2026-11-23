import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SectionBand } from "@/app/_components/section-band";
import { LoadError, Loading } from "@/app/_components/states";
import { gasReductions } from "@/incident/gas-bill";
import { gasYearFor, type GasYearView } from "@/incident/gas-year";
import { currentUserId } from "@/lib/supabase/server";
import { kstMonth } from "../../compare/cost-view";
import { loadMyHome } from "../../my/home/load";
import { about, BandFigure, PhoneSummary, type EnergyFigure } from "../energy-figure";
import { ENERGY_TABS } from "../tabs";
import { GasYearCard } from "./gas-year-card";
import { HeatingCalculator } from "./heating-calculator";
import styles from "../energy.module.css";

export const metadata = { title: "난방비 | 에너지 분석 | HomeFit AI" };

const band = (figure?: React.ReactNode) => <SectionBand title="에너지 분석" tabs={ENERGY_TABS} label="에너지 분석 탭" figure={figure} />;

// 사용자 요청(2026-11-23): 전기 탭처럼 띠에 이번 달 예상 난방비(12개월 어림 중 이번 달)와 항목 표·줄이면 얼마
function gasMonthFigure(view: Extract<GasYearView, { kind: "ready" }>, month: number): EnergyFigure {
  const { mj, bill } = view.year.months[month - 1];
  const [same, minus10] = gasReductions(view.region, mj);
  const saving = same.totalWithVat - minus10.totalWithVat;
  return {
    title: "이번 달 예상 난방비", basis: "추정값", total: bill.totalWithVat,
    tip: `내 집에 넣은 ${view.month}월 고지서(${view.mj.toLocaleString("ko-KR")}MJ)와 달별 판매 비율로 어림한 이번 달 값이에요. ${view.region.name} 주택용 요금에 부가세 10%를 더했어요.`,
    rows: [["예상 사용량", `${Math.round(mj).toLocaleString("ko-KR")}MJ`], ["도시가스 요금", `약 ${about(bill.total)}원`], ["부가세 10%", `약 ${about(bill.totalWithVat - bill.total)}원`]],
    callout: saving > 0 ? `10% 줄이면 월 약 ${about(saving)}원 덜 나와요` : null,
  };
}

// spec 025 FR-002~006: 내 집 고지서로 12개월 예상 난방비. 읽기 실패는 숨기지 않고 알린다(E7). 아래 계산기는 그대로
async function Heating() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let home: Awaited<ReturnType<typeof loadMyHome>>["home"] | undefined;
  try {
    ({ home } = await loadMyHome(userId));
  } catch (error) {
    console.error("난방비: 내 집을 읽지 못함", error); // 원인을 남긴다(오류를 삼키지 않음)
    home = undefined;
  }
  if (home === undefined) {
    return <>{band()}<main className={styles.main}><LoadError>내 집 도시가스 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError><HeatingCalculator /></main></>;
  }
  const view = gasYearFor(home);
  const figure = view.kind === "ready" ? gasMonthFigure(view, kstMonth(new Date())) : null;
  return (
    <>
      {band(figure ? <BandFigure figure={figure} /> : undefined)}
      <main className={styles.main}>
        {figure ? <PhoneSummary figure={figure} /> : null}
        <GasYearCard view={view} />
        <HeatingCalculator />
      </main>
    </>
  );
}

// IA EN_110200_TB 난방비 (PRD FR-28 v1.14·v1.24, spec 016, spec 025, spec 022 FR-012 캔버스 v2-energy-merged-heat)
export default function EnergyHeatingPage() {
  return (
    <Suspense fallback={<main className={styles.main}><Loading /></main>}>
      <Heating />
    </Suspense>
  );
}
