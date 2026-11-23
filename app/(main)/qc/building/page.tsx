import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { currentUserId } from "@/lib/supabase/server";
import { toKstDate } from "@/watch/kst";
import { loadMyHome } from "../../my/home/load";
import { BuildingLookup } from "./building-lookup";

export const metadata = { title: "건축물 정보 | 집 점검 | HomeFit AI" };

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
      {loadFailed ? <LoadError>내 집 시군구를 불러오지 못해 빈칸으로 두었어요. 시군구를 직접 골라 찾아 주세요.</LoadError> : null}
      <BuildingLookup initialSigungu={initialSigungu} today={toKstDate(new Date())} />
    </>
  );
}

// IA QC_100300_TB 건축물 정보 (PRD v1.8 FR-34, spec 004 v0.4 FR-008, spec 022 FR-011 캔버스 v2-qc-bldg-pc): 건축HUB 건축물대장 표제부 조회
export default function QcBuildingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Lookup />
    </Suspense>
  );
}
