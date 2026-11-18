import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { yearlyBills } from "@/incident/energy-estimate";
import { currentUserId } from "@/lib/supabase/server";
import { EstimateNote, kstMonth, won } from "../../compare/cost-view";
import { BillChart } from "../bill-chart";
import { NoUsage, USAGE_KIND } from "../energy-states";
import { loadEnergyUsage, type EnergyLoaded } from "../load";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "월별 예상 에너지 비용 | 에너지 분석 | HomeFit AI" };

async function CostTable() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded: EnergyLoaded;
  try {
    loaded = await loadEnergyUsage(userId, new Date());
  } catch {
    return <LoadError>내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!loaded.hasHome || !loaded.usage) return <NoUsage hasHome={loaded.hasHome} failed={loaded.hasHome ? loaded.basis.failed : 0} />;
  const { usage, basis } = loaded;
  const rows = yearlyBills(usage.kwh);
  return (
    <section className={styles.card} aria-labelledby="cost-title">
      <h2 id="cost-title">월별 예상 전기요금</h2>
      <BillChart rows={rows} currentMonth={kstMonth(new Date())} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.muted}>
            매달 {usage.kwh.toLocaleString("ko-KR")} kWh({USAGE_KIND[usage.kind]})를 쓴다고 보고 한전 주택용 저압 요금표로 계산했습니다. 7·8월은 누진 구간이 넓어(300·450 kWh) 요금이 다릅니다.
          </caption>
          <thead><tr><th scope="col">월</th><th scope="col">예상 요금</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month}><th scope="row">{row.month}월</th><td className="tabular-nums">{won(row.bill)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.muted}>기본요금 + 전력량요금만 넣었고 부가세·기금·기후환경·연료비조정 요금은 빠져 있습니다.</p>
      <EstimateNote basis={basis} />
    </section>
  );
}

// 기획안 Energy Analysis "월별 예상 에너지 비용" (spec 011 FR-003)
export default function EnergyCostPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CostTable />
    </Suspense>
  );
}
