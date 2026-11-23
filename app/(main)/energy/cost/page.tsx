import { redirect } from "next/navigation";

// IA EN_110100_TB 월별 예상 비용 → 전기 탭(/energy)으로 합침 (IA v1.17, spec 022 FR-012). 옛 주소는 보낸다
export default function MovedPage() {
  redirect("/energy");
}
