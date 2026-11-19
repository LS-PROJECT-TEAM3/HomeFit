import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Empty, LoadError, Loading } from "@/app/_components/states";
import { checkedCount, parseChecklist, MOVE_IN_ITEMS } from "@/incident/move-in-checklist";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { MoveInChecklist } from "../move-in-checklist";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "입주 전 품질 점검 | 집 점검 | HomeFit AI" };

type CheckHome = { id: string; name: string; checklist: ReturnType<typeof parseChecklist>; note: string };

async function loadCheckHomes(userId: string): Promise<CheckHome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interest_homes")
    .select("id, name, move_in_checklist, move_in_note")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error("관심 주택을 불러오지 못했습니다.");
  return data.map((r) => ({ id: r.id, name: r.name, checklist: parseChecklist(r.move_in_checklist), note: r.move_in_note ?? "" }));
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
  if (homes.length === 0) return <Empty>보러 갈 집을 관심 주택으로 넣으면 집마다 점검을 남길 수 있습니다. <Link href="/compare/new">관심 주택 등록</Link></Empty>;
  const { home: wanted } = await searchParams;
  const current = homes.find((h) => h.id === wanted) ?? homes[0];
  return (
    <>
      <nav aria-label="점검할 관심 주택">
        <ul className={styles.tabs}>
          {homes.map((h) => (
            <li key={h.id}>
              <Link href={`/qc/checklist?home=${h.id}`} className={styles.tab} aria-current={h.id === current.id ? "page" : undefined}>
                {h.name} ({checkedCount(h.checklist)}/{MOVE_IN_ITEMS.length})
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <MoveInChecklist key={current.id} homeId={current.id} homeName={current.name} initial={current.checklist} initialNote={current.note} />
    </>
  );
}

// IA QC_100100_TB 입주 전 품질 점검 (PRD FR-29 v1.17, spec 019 FR-001). 안전·적합 판정은 하지 않는다
export default function QcChecklistPage(props: PageProps<"/qc/checklist">) {
  return (
    <section className={styles.card} aria-labelledby="check-title">
      <h2 id="check-title">입주 전 품질 점검</h2>
      <p className={styles.muted}>집을 보러 갈 때 확인할 것입니다. 관심 주택마다 체크와 메모를 저장합니다. 안전·적합 여부를 판정하지는 않습니다.</p>
      <Suspense fallback={<Loading />}>
        <Checklist {...props} />
      </Suspense>
    </section>
  );
}
