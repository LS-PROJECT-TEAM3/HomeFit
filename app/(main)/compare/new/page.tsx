import { redirect } from "next/navigation";

// IA CP_040100_PG 관심 주택 등록(옆 창으로) → 집 비교 한 화면(/compare)으로 합침 (IA v1.17, spec 022 FR-011, 현경 결정 2026-11-21). 옛 주소는 보낸다
export default function MovedPage() {
  redirect("/compare");
}
