import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { parseChecklist } from "@/incident/move-in-checklist";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { fetchSigunguList } from "@/watch/region.server";
import { MoveInChecklist, type CheckHome } from "../move-in-checklist";
import styles from "../qc.module.css";

export const metadata = { title: "입주 전 점검 | 집 점검 | HomeFit AI" };

/** 시군구 이름(점검할 집 아래 작은 글자). 목록을 못 불러오면 이름 없이 둔다 */
async function sigunguNames(codes: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const sidos = [...new Set(codes.map((c) => c.slice(0, 2)))];
  await Promise.all(sidos.map(async (sido) => {
    try {
      for (const item of await fetchSigunguList(sido)) names.set(item.code, item.name);
    } catch {
      // 이름만 빠진다
    }
  }));
  return names;
}

async function loadCheckHomes(userId: string): Promise<CheckHome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interest_homes")
    .select("id, name, sigungu_code, move_in_checklist, move_in_note, updated_at")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error("관심 주택을 불러오지 못했습니다.");
  const names = await sigunguNames(data.map((r) => r.sigungu_code));
  return data.map((r) => ({
    id: r.id, name: r.name, place: names.get(r.sigungu_code) ?? "", checklist: parseChecklist(r.move_in_checklist), note: r.move_in_note ?? "", savedAt: r.updated_at,
  }));
}

async function Checklist({ searchParams }: PageProps<"/qc/checklist">) {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let homes: CheckHome[];
  try {
    homes = await loadCheckHomes(userId);
  } catch {
    return <LoadError>관심 주택을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  // spec 019 E1
  if (homes.length === 0) {
    return (
      <section className={styles.card}>
        <p className={styles.emptyText}>보러 갈 집을 관심 주택으로 넣으면 집마다 점검을 남길 수 있어요. <Link href="/compare">관심 주택 등록</Link></p>
      </section>
    );
  }
  const { home: wanted } = await searchParams;
  const current = homes.find((h) => h.id === wanted) ?? homes[0];
  return <MoveInChecklist key={current.id} homes={homes} current={current} />;
}

// IA QC_100100_TB 입주 전 점검 (PRD FR-29 v1.17, spec 019 FR-001, spec 022 FR-011 캔버스 v2-qc-check-pc). 안전·적합 판정은 하지 않는다
export default function QcChecklistPage(props: PageProps<"/qc/checklist">) {
  return (
    <Suspense fallback={<Loading />}>
      <Checklist {...props} />
    </Suspense>
  );
}
