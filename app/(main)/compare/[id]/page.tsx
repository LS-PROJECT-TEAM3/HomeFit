import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { costInput } from "@/app/_components/cost-fields";
import { getMyInterestHome, type InterestHome } from "@/incident/interest-homes.server";
import { realCost } from "@/incident/real-cost";
import { currentUserId } from "@/lib/supabase/server";
import { CostCell, kstMonth, TotalText } from "../cost-view";
import { DeleteInterestHome, InterestHomeForm } from "../interest-home-form";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "관심 주택 상세 | 집 비교 | HomeFit AI" };

const str = (v: number | null) => (v === null ? "" : String(v));

async function Detail({ params }: { params: PageProps<"/compare/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  let home: InterestHome | null;
  try {
    home = await getMyInterestHome(userId, id);
  } catch {
    return <LoadError>관심 주택을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (!home) return <LoadError>볼 수 없는 관심 주택입니다. <Link href="/compare">목록으로</Link></LoadError>;
  const cost = realCost(home, kstMonth(new Date()));
  return (
    <>
      <section className={styles.card} aria-labelledby="cost-title">
        <h2 id="cost-title">{home.name}: 한 달 실질 주거비</h2>
        <dl>
          <dt>월세</dt><dd><CostCell item={cost.rent} /></dd>
          <dt>관리비</dt><dd><CostCell item={cost.fee} /></dd>
          <dt>에너지비</dt><dd><CostCell item={cost.energy} /></dd>
          <dt>교통비</dt><dd><CostCell item={cost.transit} /></dd>
          <dt>합계</dt><dd><TotalText cost={cost} /></dd>
        </dl>
        <p className={styles.muted}>전기요금 계산값은 한전 주택용 저압 요금표(기본요금 + 전력량요금)이고 부가세·기금·기후환경·연료비조정 요금은 빠져 있습니다.</p>
      </section>
      <section className={styles.card} aria-labelledby="edit-title">
        <h2 id="edit-title">고치기</h2>
        <InterestHomeForm id={home.id} initial={{
          name: home.name, sidoCode: home.sigunguCode.slice(0, 2), sigunguCode: home.sigunguCode, housingType: home.housingType,
          exclusiveArea: str(home.exclusiveAreaM2), areaUnit: "m2", deposit: str(home.deposit), monthlyRent: String(home.monthlyRent),
          maintenanceFee: str(home.maintenanceFee), ...costInput(home),
        }} />
        <DeleteInterestHome id={home.id} name={home.name} />
      </section>
    </>
  );
}

// IA CP_040300_PG 관심 주택 상세 (spec 009 FR-001·003)
export default function InterestHomePage({ params }: PageProps<"/compare/[id]">) {
  return (
    <>
      <p><Link href="/compare">← 관심 주택</Link></p>
      <Suspense fallback={<Loading />}>
        <Detail params={params} />
      </Suspense>
    </>
  );
}
