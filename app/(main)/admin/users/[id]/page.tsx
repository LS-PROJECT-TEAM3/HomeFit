import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { isIncidentStatus, statusLabel } from "@/app/_components/status";
import { HOUSING_LABELS } from "@/incident/home-form";
import { createClient } from "@/lib/supabase/server";
import { parseVirtualUserIds } from "@/watch/simulation";
import { SIDO_OPTIONS } from "@/watch/sido";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "회원 상세 | 관리자 | HomeFit AI" };

const TYPE: Record<string, string> = { housing_support: "주거 기회", humidity_condensation: "습도·결로 위험", rent_price_change: "시세" };
const TARGET: Record<string, string> = { youth: "청년", newlywed: "신혼·신생아", multichild: "다자녀", elderly: "고령자" };
const WINDOW: Record<string, string> = { single: "홑유리", double: "이중유리", unknown: "모름" };
const CONTRACT: Record<string, string> = { monthly: "월세", jeonse: "전세" };

const won = (value: number | null) => (value === null ? "—" : `${value.toLocaleString("ko-KR")}원`);
const sidoName = (code: string) => SIDO_OPTIONS.find((s) => s.code === code)?.name ?? code;
const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function loadMember(id: string) {
  const supabase = await createClient();
  const [profile, condition, home, incidents] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at").eq("id", id).maybeSingle(),
    supabase.from("policy_conditions").select("sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups, updated_at").eq("user_id", id).maybeSingle(),
    supabase.from("homes").select("id, sigungu_code, housing_type, exclusive_area_m2, contract_type, deposit, monthly_rent, maintenance_fee, contract_end_date, window_type").eq("user_id", id).maybeSingle(),
    supabase.from("incidents").select("id, incident_type, status, facts, is_simulated, detected_at").eq("user_id", id).order("detected_at", { ascending: false }).limit(30),
  ]);
  if (profile.error || condition.error || home.error || incidents.error) throw new Error("회원 정보를 불러오지 못했습니다.");
  let measurement: { temperature_c: number; humidity_pct: number; measured_at: string } | null = null;
  if (home.data) {
    const m = await supabase.from("indoor_measurements").select("temperature_c, humidity_pct, measured_at").eq("home_id", home.data.id).order("measured_at", { ascending: false }).limit(1).maybeSingle();
    if (m.error) throw new Error("측정값을 불러오지 못했습니다.");
    measurement = m.data;
  }
  return { profile: profile.data, condition: condition.data, home: home.data, incidents: incidents.data, measurement };
}

function titleOf(facts: unknown): string {
  return typeof facts === "object" && facts !== null && "title" in facts && typeof facts.title === "string" ? facts.title : "제목 없음";
}

// IA AD_070101_PG 회원 상세 (PRD FR-20, spec 005 FR-005). 읽기만, 승인 버튼 없음(관리자는 대신 승인하지 못한다)
export default async function AdminUserDetailPage({ params }: PageProps<"/admin/users/[id]">) {
  await connection();
  const { id } = await params;
  let data;
  try {
    data = await loadMember(id);
  } catch {
    return <LoadError>회원 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!data.profile) notFound();
  const { condition, home, incidents, measurement } = data;
  const isVirtual = parseVirtualUserIds(process.env.SIMULATION_USER_IDS).has(id);
  return (
    <>
      <p><Link href="/admin/users">← 회원 목록</Link></p>
      <h2>회원 {id.slice(0, 8)}…{isVirtual ? " (가상 계정)" : ""}</h2>
      <p className={styles.muted}>{data.profile.role === "admin" ? "관리자" : "회원"} · 가입 {data.profile.created_at.slice(0, 10)}. 읽기만 합니다.</p>
      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="m-condition">
          <h2 id="m-condition">내 조건</h2>
          {condition ? (
            <ul className={styles.list}>
              <li>지역: {sidoName(condition.sido_code)} {condition.sigungu_code ?? "(시군구 전체)"}</li>
              <li>공급 유형: {condition.supply_types.includes("ALL") ? "모두" : condition.supply_types.join(", ")}</li>
              <li>월세 상한: {won(condition.max_monthly_rent)}</li>
              <li>나이: {condition.age ?? "—"}</li>
              <li>대상: {condition.target_groups.length === 0 ? "모두" : condition.target_groups.map((t) => TARGET[t] ?? t).join(", ")}</li>
            </ul>
          ) : <p className={styles.muted}>조건을 아직 넣지 않았습니다.</p>}
        </section>
        <section className={styles.card} aria-labelledby="m-home">
          <h2 id="m-home">내 집</h2>
          {home ? (
            <ul className={styles.list}>
              <li>시군구 코드 {home.sigungu_code} · {HOUSING_LABELS[home.housing_type as keyof typeof HOUSING_LABELS] ?? home.housing_type} · {home.exclusive_area_m2}㎡ · {WINDOW[home.window_type] ?? home.window_type}</li>
              <li>계약: {home.contract_type ? CONTRACT[home.contract_type] ?? home.contract_type : "—"} · 보증금 {won(home.deposit)} · 월세 {won(home.monthly_rent)} · 관리비 {won(home.maintenance_fee)}</li>
              <li>만료: {home.contract_end_date ?? "—"}</li>
              <li>최근 측정: {measurement ? `${measurement.temperature_c}°C · ${measurement.humidity_pct}% (${kst(measurement.measured_at)})` : "없음"}</li>
            </ul>
          ) : <p className={styles.muted}>내 집을 아직 넣지 않았습니다.</p>}
        </section>
      </div>
      <h2 className={styles.section}>위험·기회 알림 (최근 30건)</h2>
      {incidents.length === 0 ? <p className={styles.muted}>알림이 없습니다.</p> : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">감지</th><th scope="col">종류</th><th scope="col">제목</th><th scope="col">상태</th></tr></thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td>{kst(i.detected_at)}</td>
                  <td>{TYPE[i.incident_type] ?? i.incident_type}{i.is_simulated ? " · 시뮬레이터" : ""}</td>
                  <td>{titleOf(i.facts)}</td>
                  <td>{isIncidentStatus(i.status) ? statusLabel(i.status) : i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
