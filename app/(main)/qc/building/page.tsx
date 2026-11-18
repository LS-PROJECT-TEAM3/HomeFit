import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { loadMyHome } from "../../my/home/load";
import { BuildingLookup } from "./building-lookup";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "건축물 기본 정보 | 집 점검 | HomeFit AI" };

/** 내 집 시군구를 처음 값으로(주소는 저장하지 않음) */
async function Lookup() {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let initialSigungu = "";
  let loadFailed = false;
  try {
    initialSigungu = (await loadMyHome(userId)).home?.sigunguCode ?? "";
  } catch {
    loadFailed = true;
  }
  // 내 집 읽기 실패를 "내 집 없음"과 구분해 알린다(디자인 기본선 7). 조회는 직접 고르면 그대로 된다
  return (
    <>
      {loadFailed ? <LoadError>내 집 시군구를 불러오지 못해 빈칸으로 두었습니다. 시군구를 직접 골라 조회해 주세요.</LoadError> : null}
      <BuildingLookup initialSigungu={initialSigungu} />
    </>
  );
}

// IA CP_040303_TB 건축물 정보 (PRD v1.8 FR-34, spec 004 v0.4 FR-008): 건축HUB 건축물대장 표제부 조회
export default function QcBuildingPage() {
  return (
    <section className={styles.card} aria-labelledby="building-title">
      <h2 id="building-title">건축물 기본 정보</h2>
      <p className={styles.muted}>보고 있는 집의 번지를 넣으면 건축물대장의 용도·구조·사용승인일·층수·내진설계 여부를 보여 드립니다.</p>
      <Suspense fallback={<Loading />}>
        <Lookup />
      </Suspense>
    </section>
  );
}
