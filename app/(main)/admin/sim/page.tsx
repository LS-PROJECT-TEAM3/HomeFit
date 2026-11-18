import { FIXTURE_NAMES } from "@/watch/sim-fixtures";
import { WEATHER_FIXTURE_NAMES } from "@/watch/weather-fixtures";
import { RENT_FIXTURES, RENT_LIVE, RENT_LIVE_HELP } from "@/watch/rent-fixtures";
import { runSimulation } from "../actions";
import { SimForm } from "./sim-form";
import styles from "@/app/_components/hub.module.css";

export const metadata = { title: "시뮬레이터 | 관리자 | HomeFit AI" };
// 가짜 묶음 수집 + AI 초안이 한 번에 끝나야 한다(수집 입구와 같은 상한)
export const maxDuration = 300;

// 묶음마다 무엇을 보여 주는지 (CUJ-04 1단계: 정답이 붙은 묶음)
const NOTICE_HELP: Record<string, string> = {
  sample: "기준 공고 묶음", changed: "마감일·월세가 바뀜 → 알림", malformed: "모양이 깨진 응답 → 수집 오류", failure: "API 실패 → 수집 오류",
  bulk: "공고가 많은 묶음", fresh: "새 공고", correction: "정정 공고 → 알림", relaxed: "조건 완화 → 알림", extended: "마감 연장 → 알림",
  later: "나중 회차", "bulk-changed": "많은 공고 중 일부 바뀜",
};
const WEATHER_HELP: Record<string, string> = {
  cold: "추운 밤 + 높은 습도 → 결로 위험", colder: "더 추워짐 → 알림 갱신", humid: "습도만 높음", safe: "위험 없음 → 알림 0",
  failure: "API 실패 → 수집 오류", malformed: "모양이 깨진 응답 → 수집 오류",
};

// IA AD_070500_TB 시뮬레이터 (PRD FR-24, spec 005 FR-002). 사건은 가상 계정(SIMULATION_USER_IDS)에게만 생긴다
export default function AdminSimPage() {
  return (
    <>
      <p className={styles.muted}>가짜 묶음으로 수집 → 비교 → 알림 → 계획 초안 → 승인 대기까지 돌립니다. 알림은 시뮬레이션용 가상 계정에게만 생기고, 실제 계정에는 생기지 않습니다. 같은 묶음을 두 번 돌려도 알림은 한 번만 생깁니다.</p>
      <div className={styles.grid}>
        <SimForm title="마이홈 가짜 공고" source="myhome" options={FIXTURE_NAMES.map((name) => ({ name, help: NOTICE_HELP[name] ?? "" }))} run={runSimulation} />
        <SimForm title="기상청 가짜 예보" source="weather" options={WEATHER_FIXTURE_NAMES.map((name) => ({ name, help: WEATHER_HELP[name] ?? "" }))} run={runSimulation} />
        {/* spec 008 FR-007: 가상 계정의 집·관심 지역에 맞춘 가짜 거래 */}
        <SimForm title="실거래가(시세) 가짜 거래" source="rent" options={[...Object.entries(RENT_FIXTURES).map(([name, help]) => ({ name, help })), { name: RENT_LIVE, help: RENT_LIVE_HELP }]} run={runSimulation} />
      </div>
    </>
  );
}
