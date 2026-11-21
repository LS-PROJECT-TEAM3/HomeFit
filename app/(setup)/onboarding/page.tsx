import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadError, Loading } from "@/app/_components/states";
import { ConditionForm } from "@/app/(main)/my/conditions/condition-form";
import { loadMyCondition } from "@/app/(main)/my/conditions/load";
import { HomeForm, SkipHomeLink } from "@/app/(main)/my/home/home-form";
import { loadMyHome, type MyHome } from "@/app/(main)/my/home/load";
import type { PolicyCondition } from "@/incident/match";
import { currentUserId } from "@/lib/supabase/server";
import styles from "../setup.module.css";

export const metadata = { title: "첫 설정 | HomeFit AI" };

const BAR_COUNT = 15;

/** 왼쪽 진행 막대 "입력함 n/15"(1단계는 내 집 칸, 2단계는 조건 칸 기준) */
function homeFilled(home: MyHome | null): number {
  if (!home) return 0;
  const values = [home.sigunguCode, home.housingType, home.exclusiveAreaM2, home.windowType, home.contractType, home.deposit, home.monthlyRent, home.maintenanceFee, home.contractEndDate];
  return values.filter((v) => v !== null && v !== undefined && v !== "").length;
}

function conditionFilled(c: PolicyCondition | null): [number, number] {
  if (!c) return [0, 6];
  return [[c.sidoCode, c.sigunguCode, c.supplyTypes.length ? "y" : null, c.maxMonthlyRent, c.age, c.targetGroups.length ? "y" : null].filter((v) => v !== null && v !== "").length, 6];
}

function Aside({ step, skipped, filled, total }: { step: 1 | 2; skipped: boolean; filled: number; total: number }) {
  const on = Math.round((filled / total) * BAR_COUNT);
  return (
    <aside className={styles.aside}>
      <p className={styles.step}>Step {step} / 2</p>
      <h1 className={styles.title}>{step === 1 ? <>내 집 정보를<br />알려 주세요</> : <>공고/정책 조건을<br />정해 주세요</>}</h1>
      <p className={styles.lead}>{step === 1 ? "습도/결로와 시세 알림에 써요" : "이 조건으로 맞는 공고를 골라요"}</p>
      <ol className={styles.steps} aria-label="진행 단계">
        <li className={styles.stepItem} aria-current={step === 1 ? "step" : undefined}>
          <span className={`${styles.stepNum} ${step === 1 ? styles.stepOn : styles.stepDone}`}>1</span>
          <span className={styles.stepText}><span className={styles.stepName}>내 집</span>{step === 2 ? <span className={styles.stepSub}>{skipped ? "건너뜀" : "입력함"}</span> : null}</span>
        </li>
        <li aria-hidden="true" className={styles.stepLine} />
        <li className={styles.stepItem} aria-current={step === 2 ? "step" : undefined}>
          <span className={`${styles.stepNum} ${step === 2 ? styles.stepOn : ""}`}>2</span>
          <span className={styles.stepText}><span className={styles.stepName}>공고/정책 조건</span></span>
        </li>
      </ol>
      <div className={styles.progress}>
        <span className={styles.bars} aria-hidden="true">{Array.from({ length: BAR_COUNT }, (_, i) => <span key={i} className={`${styles.bar} ${i < on ? styles.barOn : ""}`} />)}</span>
        <span className={styles.progressText}>입력함 {filled}/{total}</span>
      </div>
      {step === 1 ? (
        <div className={styles.skip}>
          <span>내 집이 아직 없어도 괜찮아요</span>
          <SkipHomeLink className={styles.skipLink} />
        </div>
      ) : null}
    </aside>
  );
}

async function Onboarding({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const params = await searchParams;
  const step = params.step === "2" ? 2 : 1;
  let home: MyHome | null = null;
  let condition: PolicyCondition | null = null;
  try {
    if (step === 1) home = (await loadMyHome(userId)).home;
    else condition = await loadMyCondition(userId);
  } catch {
    return <LoadError>저장한 정보를 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</LoadError>;
  }
  if (step === 1) {
    return (
      <div className={styles.body}>
        <Aside step={1} skipped={false} filled={homeFilled(home)} total={9} />
        <main className={styles.main}><div className={styles.formWrap}><HomeForm initial={home} mode="onboarding" /></div></main>
      </div>
    );
  }
  const [filled, total] = conditionFilled(condition);
  return (
    <div className={styles.body}>
      <Aside step={2} skipped={params.skipped === "1"} filled={filled} total={total} />
      <main className={styles.main}>
        <div className={styles.formWrap}>
          <ConditionForm initial={condition} next="/" submitLabel="다음 →" />
          <p className={styles.note}>조건은 공고를 고르는 데만 써요. 자격은 공고문 기준 확인 필요.</p>
        </div>
      </main>
    </div>
  );
}

// IA MB_010200_PG 첫 설정 (FR-001·FR-002, spec 001·003, spec 022 캔버스 v2-s1-open-pc·v2-s2-open-pc): 1단계 내 집, 2단계 공고/정책 조건.
// 로그인 쿠키·주소 값은 Suspense 안에서 읽는다(Next.js 16 Cache Components)
export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <Suspense fallback={<Loading />}>
      <Onboarding searchParams={searchParams} />
    </Suspense>
  );
}
