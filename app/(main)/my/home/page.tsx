import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError } from "@/app/_components/states";
import { RISK_RULES } from "@/incident/condensation";
import { currentUserId } from "@/lib/supabase/server";
import { HomeForm } from "./home-form";
import { loadMyHome, type MyMeasurement } from "./load";
import { MeasurementDialog } from "./measurement-dialog";
import styles from "../my.module.css";

export const metadata = { title: "내 집 | HomeFit AI" };

function kstText(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
}

// Q4 (spec 003): 7일 넘은 측정값은 결로 판단에 쓰지 않는다. 색만이 아니라 글자로 알린다(디자인 기본선 5)
function MeasurementList({ measurements, now }: { measurements: MyMeasurement[]; now: Date }) {
  if (measurements.length === 0) {
    return <p>아직 측정값이 없습니다. 측정값이 있어야 결로 위험을 알려 드릴 수 있습니다.</p>;
  }
  return (
    <ul className={styles.list}>
      {measurements.map((m) => {
        const stale = now.getTime() - Date.parse(m.measuredAt) > RISK_RULES.measurementMaxAgeMs;
        return (
          <li key={m.id}>
            <span className="tabular-nums">{m.temperatureC}°C · 습도 {m.humidityPct}%</span> · {kstText(m.measuredAt)}
            {stale ? <strong> · 오래된 측정값(7일 넘음)</strong> : null}
          </li>
        );
      })}
    </ul>
  );
}

async function HomeSections() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded: Awaited<ReturnType<typeof loadMyHome>>;
  try {
    loaded = await loadMyHome(userId);
  } catch {
    return <LoadError>내 집 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  return (
    <>
      <section className={styles.section} aria-labelledby="home-title">
        <h2 id="home-title">내 집</h2>
        <HomeForm initial={loaded.home} />
      </section>
      <section className={styles.section} aria-labelledby="measure-title">
        <h2 id="measure-title">실내 온습도</h2>
        {loaded.home ? (
          <>
            <MeasurementDialog />
            <MeasurementList measurements={loaded.measurements} now={new Date()} />
          </>
        ) : (
          <p>내 집을 먼저 등록해 주세요. 위에서 저장하면 온습도를 넣을 수 있습니다.</p>
        )}
      </section>
      <p className={styles.note}>누수·건물 하자는 이 앱으로 알 수 없습니다. 결로·습도 위험만 알려 드립니다.</p>
    </>
  );
}

// IA MY_030200_TB 내 집, MY_030201_MD 실내 온습도 입력 (FR-001, FR-002, spec 003)
export default function HomePage() {
  return (
    <Suspense fallback={<p role="status">불러오는 중…</p>}>
      <HomeSections />
    </Suspense>
  );
}
