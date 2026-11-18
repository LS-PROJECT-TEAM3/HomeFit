import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError } from "@/app/_components/states";
import { RISK_RULES } from "@/incident/condensation";
import { currentUserId } from "@/lib/supabase/server";
import { Fold } from "@/app/_components/fold";
import { HOUSING_LABELS, WINDOW_LABELS } from "@/incident/home-form";
import { fetchSigunguList } from "@/watch/region.server";
import { toKstDate } from "@/watch/kst";
import { HomeForm } from "./home-form";
import { loadMyHome, type MyHome, type MyMeasurement } from "./load";
import formStyles from "@/app/_components/form.module.css";
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

const man = (won: number) => `${Math.round(won / 10_000).toLocaleString("ko-KR")}만 원`;

async function sigunguName(code: string): Promise<string> {
  try {
    return (await fetchSigunguList(code.slice(0, 2))).find((s) => s.code === code)?.name ?? code;
  } catch {
    return code;
  }
}

function daysLeft(end: string, today: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

// 사용자 요청(2026-11-18): 저장된 내용을 맨 위에 한눈에. 고칠 때만 아래 칸을 연다
async function HomeSummary({ home }: { home: MyHome }) {
  // 계약 형태와 금액을 한 번에: "월세 50만 원(보증금 1,000만 원)" / "전세 1억 원"
  const amount = home.contractType === "jeonse"
    ? (home.deposit ? `전세 ${man(home.deposit)}` : "전세")
    : home.monthlyRent ? `월세 ${man(home.monthlyRent)}${home.deposit ? `(보증금 ${man(home.deposit)})` : ""}` : home.contractType === "monthly" ? "월세" : null;
  const contract = [
    amount,
    home.maintenanceFee ? `관리비 ${man(home.maintenanceFee)}` : null,
    home.contractEndDate ? `만료까지 ${daysLeft(home.contractEndDate, toKstDate(new Date()))}일` : null,
  ].filter(Boolean);
  return (
    <div className={formStyles.summaryCard} aria-label="저장된 내 집 요약">
      <p><strong>{await sigunguName(home.sigunguCode)}</strong> · {HOUSING_LABELS[home.housingType]} · {home.exclusiveAreaM2}㎡ · 창 {WINDOW_LABELS[home.windowType]}</p>
      <p>{contract.length ? contract.join(" · ") : "계약 정보 없음"}</p>
    </div>
  );
}

function latestText(measurements: MyMeasurement[]): string {
  const m = measurements[0];
  return m ? `최근 ${m.temperatureC}°C · ${m.humidityPct}%` : "측정값 없음";
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
        {loaded.home ? <HomeSummary home={loaded.home} /> : null}
        <HomeForm initial={loaded.home} />
      </section>
      <section className={styles.section} aria-label="실내 온습도">
        {loaded.home ? (
          <Fold title="실내 온습도" status={latestText(loaded.measurements)} open={loaded.measurements.length === 0}>
            <MeasurementDialog />
            <MeasurementList measurements={loaded.measurements} now={new Date()} />
          </Fold>
        ) : (
          <p>내 집을 먼저 등록해 주세요. 위에서 저장하면 실내 온습도를 넣을 수 있습니다.</p>
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
