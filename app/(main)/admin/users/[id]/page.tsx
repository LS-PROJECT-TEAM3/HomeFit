import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LoadError } from "@/app/_components/states";
import { HOUSING_LABELS } from "@/incident/home-form";
import { createClient } from "@/lib/supabase/server";
import { parseVirtualUserIds } from "@/watch/simulation";
import { SIDO_OPTIONS } from "@/watch/sido";
import { toKstDate } from "@/watch/kst";
import { EDITABLE_FIELDS } from "@/incident/admin-edit";
import { Icon } from "@/app/_components/icons";
import { InfoTip } from "@/app/_components/info-tip";
import { AuditLogList } from "./audit-log-list";
import { EditDialog } from "./edit-dialog";
import { sigunguNames } from "@/app/(main)/notices/listing-data";
import badges from "@/app/(main)/notices/notices.module.css";
import { AdminCard } from "../../admin-card";
import styles from "../../admin.module.css";
import { ShowMoreRows } from "../../show-more";

export const metadata = { title: "회원 상세 | 관리자 | HomeFit AI" };

const TYPE: Record<string, string> = { housing_support: "주거 기회", humidity_condensation: "습도/결로 위험", rent_price_change: "시세" };
const TARGET: Record<string, string> = { youth: "청년", newlywed: "신혼/신생아", multichild: "다자녀", elderly: "고령자" };
const WINDOW: Record<string, string> = { single: "홑유리", double: "이중유리", unknown: "모름" };
const CONTRACT: Record<string, string> = { monthly: "월세", jeonse: "전세" };

const won = (value: number | null) => (value === null ? null : `${value.toLocaleString("ko-KR")}원`);
const sidoName = (code: string) => SIDO_OPTIONS.find((s) => s.code === code)?.name ?? code;
// 흐름 화면과 같은 "11.17 20:32"(두 줄로 꺾이지 않게)
const kst = (iso: string) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(5, 16).replace("-", ".");
const STATUS_BADGE: Record<string, [string, string]> = {
  new: ["새 알림", badges.badgeNew], pending: ["승인 대기", badges.badgePending], approved: ["승인", badges.badgeFollow], rejected: ["거절", badges.badgeDeadline],
};

async function loadMember(id: string) {
  const supabase = await createClient();
  const [profile, condition, home, incidents] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at").eq("id", id).maybeSingle(),
    supabase.from("policy_conditions").select("user_id, sido_code, sigungu_code, supply_types, max_monthly_rent, age, target_groups, updated_at").eq("user_id", id).maybeSingle(),
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

/** 고칠 수 있는 칸만 모달 첫 값으로 넘긴다 */
function pick(table: keyof typeof EDITABLE_FIELDS, row: Record<string, unknown>): Record<string, number | string | null> {
  return Object.fromEntries(Object.keys(EDITABLE_FIELDS[table]).map((name) => {
    const value = row[name];
    return [name, typeof value === "number" || typeof value === "string" ? value : null];
  }));
}

function titleOf(facts: unknown): string {
  return typeof facts === "object" && facts !== null && "title" in facts && typeof facts.title === "string" ? facts.title : "제목 없음";
}

/** 이름 / 값 두 칸 줄. 값이 없으면 "입력 안 함" */
function Facts({ rows }: { rows: [string, string | null][] }) {
  return (
    <dl className={styles.facts}>
      {rows.flatMap(([name, value]) => [
        <dt key={`${name}-t`}>{name}</dt>,
        <dd key={`${name}-d`}>{value ?? <span className={styles.empty}>입력 안 함</span>}</dd>,
      ])}
    </dl>
  );
}

type Member = Awaited<ReturnType<typeof loadMember>>;

async function regionText(sidoCode: string, sigunguCode: string | null): Promise<string> {
  const names = await sigunguNames(sidoCode).catch(() => new Map<string, string>());
  return `${sidoName(sidoCode)} ${sigunguCode ? names.get(sigunguCode) ?? sigunguCode : "(시군구 전체)"}`;
}

async function ConditionCard({ id, condition }: { id: string; condition: Member["condition"] }) {
  const action = condition ? <EditDialog table="policy_conditions" targetId={id} memberId={id} title="공고/정책 조건" values={pick("policy_conditions", condition)} /> : undefined;
  return (
    <AdminCard id="m-condition" title="공고/정책 조건" action={action}>
      {condition ? (
        <Facts rows={[
          ["지역", await regionText(condition.sido_code, condition.sigungu_code)],
          ["공급 유형", condition.supply_types.includes("ALL") ? "모두" : condition.supply_types.join(", ")],
          ["월세 상한", won(condition.max_monthly_rent)],
          ["나이", condition.age === null ? null : `만 ${condition.age}세`],
          ["대상", condition.target_groups.length === 0 ? "모두" : condition.target_groups.map((t) => TARGET[t] ?? t).join(", ")],
        ]} />
      ) : <p className={styles.help}>조건을 아직 넣지 않았습니다.</p>}
    </AdminCard>
  );
}

function homeKind(home: NonNullable<Member["home"]>): string {
  const housing = HOUSING_LABELS[home.housing_type as keyof typeof HOUSING_LABELS]?.replaceAll("·", "/") ?? home.housing_type;
  return `${housing} / ${home.exclusive_area_m2}㎡ / ${WINDOW[home.window_type] ?? home.window_type}`;
}

async function HomeCard({ id, home, measurement }: { id: string; home: Member["home"]; measurement: Member["measurement"] }) {
  const action = home ? <EditDialog table="homes" targetId={home.id} memberId={id} title="사는 집" values={pick("homes", { ...home, exclusive_area_m2: Number(home.exclusive_area_m2) })} /> : undefined;
  return (
    <AdminCard id="m-home" title="사는 집" action={action}>
      {home ? (
        <Facts rows={[
          ["지역", await regionText(home.sigungu_code.slice(0, 2), home.sigungu_code)],
          ["집", homeKind(home)],
          ["계약", home.contract_type ? CONTRACT[home.contract_type] ?? home.contract_type : null],
          ["보증금", won(home.deposit)],
          ["월세", won(home.monthly_rent)],
          ["관리비", won(home.maintenance_fee)],
          ["만료일", home.contract_end_date],
          ["최근 측정", measurement ? `${measurement.temperature_c}°C / ${measurement.humidity_pct}% (${kst(measurement.measured_at)})` : null],
        ]} />
      ) : <p className={styles.help}>사는 집을 아직 넣지 않았습니다.</p>}
    </AdminCard>
  );
}

function IncidentCard({ incidents }: { incidents: Member["incidents"] }) {
  const rows = incidents.map((i) => {
    const badge = STATUS_BADGE[i.status];
    return (
      <tr key={i.id}>
        <td>{kst(i.detected_at)}</td>
        <td>
          <span className={styles.chips}>
            {TYPE[i.incident_type] ?? i.incident_type}
            {i.is_simulated ? <span className={`${badges.badge} ${badges.badgeIgnored}`}>시뮬레이터</span> : null}
          </span>
        </td>
        <td>{titleOf(i.facts)}</td>
        <td>{badge ? <span className={`${badges.badge} ${badge[1]}`}>{badge[0]}</span> : i.status}</td>
      </tr>
    );
  });
  const head = <tr><th scope="col">감지</th><th scope="col">종류</th><th scope="col">제목</th><th scope="col">상태</th></tr>;
  return (
    <AdminCard id="m-incidents" title={<>위험/기회 알림<span className={styles.titleCount}>{incidents.length}건</span></>} tip="최근 30건까지 보여요. 관리자는 알림을 대신 승인하거나 거절하지 못해요.">
      {incidents.length === 0 ? <p className={styles.help}>알림이 없습니다.</p> : <ShowMoreRows head={head} rows={rows} />}
    </AdminCard>
  );
}

function MemberHead({ id, role, createdAt, isVirtual }: { id: string; role: string; createdAt: string; isVirtual: boolean }) {
  return (
    <div className={styles.memberHead}>
      <Link href="/admin/users" className={styles.backButton}><Icon name="chevron-left" size={18} />회원 목록</Link>
      <span className={styles.head}>
        <h2 className={styles.memberTitle}>회원 {id.slice(0, 13)}…</h2>
        <InfoTip icon text="공고/정책 조건과 사는 집의 숫자/날짜만 사유와 함께 고칠 수 있어요. 고치면 수정 기록에 남고 지울 수 없어요. 알림은 대신 승인하지 못해요." label="회원 상세 설명 보기" />
      </span>
      <span className={styles.chips}>
        <span className={styles.chip}>{role === "admin" ? "관리자" : "회원"}</span>
        <span className={styles.chip}>가입 {toKstDate(new Date(createdAt)).slice(5).replace("-", ".")}</span>
        {isVirtual ? <span className={styles.chip}>가상 계정</span> : null}
      </span>
    </div>
  );
}

// IA AD_070101_PG 회원 상세 (PRD FR-20, spec 005 FR-005). 공고 조건·내 집 숫자 칸만 사유와 함께 고친다(spec 010 FR-003). 승인 버튼 없음(관리자는 대신 승인하지 못한다)
// 사용자 요청(2026-11-23): 다른 관리자 화면처럼 카드로 나누고, 설명은 아이콘, 값은 이름/값 줄, 알림은 상태 배지와 더 보기
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
    <div className={styles.stack}>
      <MemberHead id={id} role={data.profile.role} createdAt={data.profile.created_at} isVirtual={isVirtual} />
      <div className={styles.pair}>
        <ConditionCard id={id} condition={condition} />
        <HomeCard id={id} home={home} measurement={measurement} />
      </div>
      <AuditLogList targetIds={[id, ...(home ? [home.id] : [])]} />
      <IncidentCard incidents={incidents} />
    </div>
  );
}
