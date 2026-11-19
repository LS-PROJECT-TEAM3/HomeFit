import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Empty, LoadError } from "@/app/_components/states";
import { DEFECT_KINDS, type DefectKind } from "@/incident/defect-form";
import { createClient, currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { DefectForm, DeleteDefectButton } from "./defect-form";
import styles from "@/app/_components/hub.module.css";
import own from "./records.module.css";

type Defect = { id: string; occurredOn: string; kind: DefectKind; memo: string; photoUrl: string | null };

const PHOTO_URL_SECONDS = 600; // 본인 세션으로 만든 짧은 주소(spec 019 plan)

async function loadDefects(userId: string): Promise<{ hasHome: boolean; defects: Defect[] }> {
  const supabase = await createClient();
  const { data: home, error: homeError } = await supabase.from("homes").select("id").eq("user_id", userId).maybeSingle();
  if (homeError) throw new Error("내 집을 불러오지 못했습니다.");
  if (!home) return { hasHome: false, defects: [] };
  const { data, error } = await supabase.from("defect_records").select("id, occurred_on, kind, memo, photo_path").eq("home_id", home.id).order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error("하자 기록을 불러오지 못했습니다.");
  const paths = data.map((r) => r.photo_path).filter((p): p is string => p !== null);
  const signed = paths.length ? (await supabase.storage.from("defect-photos").createSignedUrls(paths, PHOTO_URL_SECONDS)).data ?? [] : [];
  const urls = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return { hasHome: true, defects: data.map((r) => ({ id: r.id, occurredOn: r.occurred_on, kind: r.kind as DefectKind, memo: r.memo, photoUrl: r.photo_path ? urls.get(r.photo_path) ?? null : null })) };
}

function DefectList({ defects }: { defects: Defect[] }) {
  if (defects.length === 0) return <p className={styles.muted}>아직 하자 기록이 없습니다.</p>;
  return (
    <ul className={`${styles.list} ${styles.plainList}`} aria-label="하자 기록">
      {defects.map((d) => (
        <li key={d.id} className={styles.inlineFacts}>
          <strong className="tabular-nums">{d.occurredOn}</strong> · {DEFECT_KINDS[d.kind]} · <span>{d.memo}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- 서명 주소는 10분 뒤 사라져 이미지 최적화 캐시에 맞지 않는다 */}
          {d.photoUrl ? <a href={d.photoUrl} target="_blank" rel="noreferrer"><img src={d.photoUrl} alt={`${d.occurredOn} ${DEFECT_KINDS[d.kind]} 사진`} width={96} height={96} className={own.thumb} /></a> : null}
          <DeleteDefectButton id={d.id} />
        </li>
      ))}
    </ul>
  );
}

// IA QC_100200_TB 하자 기록 (PRD FR-30 v1.17, spec 019 FR-002·FR-003). 원인·책임·안전 판정과 하자 예측은 하지 않는다
export async function Defects() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let loaded: Awaited<ReturnType<typeof loadDefects>>;
  try {
    loaded = await loadDefects(userId);
  } catch {
    return <LoadError>하자 기록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  // spec 019 E3
  if (!loaded.hasHome) return <Empty>내 집을 등록하면 하자를 날짜·사진과 남길 수 있습니다. <Link href="/my/home">내 집 등록</Link></Empty>;
  return (
    <>
      <DefectForm today={toKstDate(new Date())} />
      <DefectList defects={loaded.defects} />
    </>
  );
}
