import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError } from "@/app/_components/states";
import { HOUSING_LABELS, type HousingType } from "@/incident/home-form";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { fetchSigunguList } from "@/watch/region.server";
import { AreaForm, DeleteAreaButton } from "./area-form";
import styles from "../my.module.css";
import local from "./areas.module.css";

export const metadata = { title: "관심 지역 | HomeFit AI" };

const CONTRACT_LABELS: Record<string, string> = { monthly: "월세", jeonse: "전세" };

/** 시도마다 시군구 이름. 목록을 못 불러오면 코드로 보인다(화면은 그대로) */
async function sigunguNames(codes: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const sido of new Set(codes.map((code) => code.slice(0, 2)))) {
    try {
      for (const item of await fetchSigunguList(sido)) names.set(item.code, item.name);
    } catch {
      // 이름만 못 붙인다
    }
  }
  return names;
}

async function AreaList() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.from("interest_areas").select("id, sigungu_code, housing_type, target_area_m2, contract_type").eq("user_id", userId).order("created_at");
  if (error) return <LoadError>관심 지역을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  if (data.length === 0) return <Empty>아직 관심 지역이 없습니다. 아래에서 넣으면 한 달에 한 번 주변 전월세 시세를 비교해 크게 바뀌면 알려 드립니다.</Empty>;
  const names = await sigunguNames(data.map((row) => row.sigungu_code));
  return (
    <ul className={local.list}>
      {data.map((row) => {
        const label = `${names.get(row.sigungu_code) ?? row.sigungu_code} ${HOUSING_LABELS[row.housing_type as HousingType] ?? row.housing_type}`;
        return (
          <li key={row.id} className={local.item}>
            <div>
              <p className={local.text}><strong>{label}</strong></p>
              <p className={local.meta}>{CONTRACT_LABELS[row.contract_type] ?? row.contract_type} · 기준 {Number(row.target_area_m2)}㎡(±20%)</p>
            </div>
            <DeleteAreaButton id={row.id} label={label} />
          </li>
        );
      })}
    </ul>
  );
}

// IA MY_030300_TB 관심 지역 (spec 008 FR-001, PRD FR-05). 여러 개 등록 가능
export default function AreasPage() {
  return (
    <section className={styles.section} aria-labelledby="areas-title">
      <h2 id="areas-title">관심 지역</h2>
      <p className={local.meta}>집을 구하는 지역을 넣어 두면, 같은 유형·면적·계약 형태의 최근 3개월 실거래 중간값이 지난번보다 10% 이상 바뀔 때 알려 드립니다.</p>
      <Suspense fallback={<p role="status">불러오는 중…</p>}>
        <AreaList />
      </Suspense>
      <h3>관심 지역 추가</h3>
      <AreaForm />
    </section>
  );
}
