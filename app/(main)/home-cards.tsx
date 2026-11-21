import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/app/_components/icons";
import { AlertRow, Card, KeyValueRow, ScheduleRow, StatItem, TextLink } from "@/app/_components/ui";
import { describeDeadline } from "@/incident/checklist";
import { contractEndText, scheduleDateParts, toPyeong } from "@/incident/home-dashboard";
import { HOUSING_LABELS } from "@/incident/home-form";
import { windowTypeText } from "@/incident/humidity-text";
import type { CostItem } from "@/incident/real-cost";
import type { HomeDashboard } from "./dashboard-load";
import { OutdoorWeather } from "./weather-card";
import styles from "./page.module.css";

// spec 022 FR-011: 캔버스 v2-home-pc(PC)·v2-s5-alert-phone·v2-home-phone(휴대폰) 보드 그대로. 순서·문구는 보드를 따른다

const SHOWN_ALERTS = 3;
const SHOWN_SCHEDULE = 2;

const man = (won: number) => `${Math.round(won / 10_000).toLocaleString("ko-KR")}만 원`;
const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** "오산시 | 아파트 | 33m² (약 10평) | 이중유리" */
export function homeSummary(data: HomeDashboard): string {
  const home = data.home;
  if (!home) return "내 집을 등록하면 결로 위험과 월 실질 주거비를 알려 드려요";
  return [data.sigunguName ?? "시군구", HOUSING_LABELS[home.housingType], `${home.exclusiveAreaM2}m² (약 ${toPyeong(home.exclusiveAreaM2)}평)`, windowTypeText(home.windowType)].join(" | ");
}

/** 휴대폰 머리말(기본형). PC는 포스터 띠가 같은 내용을 보인다 */
export function PhoneHeader({ data }: { data: HomeDashboard }) {
  return (
    <header className={styles.phoneHeader}>
      <h1 className={styles.phoneTitle}>안녕하세요</h1>
      <div className={styles.phoneSummary}>
        <p>{homeSummary(data)}</p>
        <Link href="/my/home" className={styles.editLink} aria-label="내 집 정보 수정" title="내 집 정보 수정">
          <span className={styles.editBox}><Icon name="edit" size={18} /></span>
        </Link>
      </div>
    </header>
  );
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return <h3 className={styles.sectionHead}>{label} <span className={styles.sectionCount}>{count}건</span></h3>;
}

/** 확인할 일: 새 알림(위험·주거 기회)과 다가오는 일정. 많으면 "N건 더 보기" (s5-many) */
export function TodoCard({ data, today }: { data: HomeDashboard; today: string }) {
  const { newAlerts, schedule } = data;
  return (
    <Card title="확인할 일" className={styles.todoCard}>
      {newAlerts.length === 0 && schedule.length === 0 ? <p className={styles.emptyLine}>지금은 확인할 일이 없어요</p> : null}
      {newAlerts.length > 0 ? (
        <div>
          <SectionHead label="알림" count={newAlerts.length} />
          {newAlerts.slice(0, SHOWN_ALERTS).map((alert) => (
            <AlertRow key={alert.id} href={`/incidents/${alert.id}`} kind={alert.kind} title={alert.title} description={kst(alert.detectedAt)} />
          ))}
          {newAlerts.length > SHOWN_ALERTS ? <TextLink href="/incidents?status=new">{newAlerts.length - SHOWN_ALERTS}건 더 보기</TextLink> : null}
        </div>
      ) : null}
      {schedule.length > 0 ? (
        <div>
          <SectionHead label="다가오는 일정" count={schedule.length} />
          {schedule.slice(0, SHOWN_SCHEDULE).map((item) => {
            const parts = scheduleDateParts(item.dueDate);
            const left = describeDeadline(item.dueDate, today) ?? "마감일 없음";
            return <ScheduleRow key={item.id} href={`/schedule/${item.id}`} date={parts?.date ?? "미정"} weekday={parts?.weekday ?? ""} title={item.title} left={left} ended={left === "마감 지남"} />;
          })}
          {schedule.length > SHOWN_SCHEDULE ? <TextLink href="/schedule">{schedule.length - SHOWN_SCHEDULE}건 더 보기</TextLink> : null}
        </div>
      ) : null}
    </Card>
  );
}

function costValue(item: CostItem): string {
  return item.value === null ? "미입력" : man(item.value);
}

/** 월 실질 주거비 = 월세 + 관리비 + 에너지비(집 비교와 같은 계산). 추정이면 "(예상)" */
export function CostCard({ data }: { data: HomeDashboard }) {
  const cost = data.cost;
  return (
    <Card title="월 실질 주거비" info="월세, 관리비, 에너지비를 더한 한 달 비용이에요." className={styles.costCard}>
      {cost ? (
        <div>
          <p className={styles.costTotal}>월 {man(cost.total)}</p>
          <KeyValueRow label="월세" value={costValue(cost.rent)} />
          <KeyValueRow label="관리비" value={costValue(cost.fee)} divider />
          <KeyValueRow label={cost.energy.kind === "estimated" ? "에너지비 (예상)" : "에너지비"} value={costValue(cost.energy)} divider />
        </div>
      ) : (
        <div>
          <p className={styles.costPending}>계산 전</p>
          <p className={styles.costHelp}>월세와 관리비를 넣으면 계산해요</p>
          <Link href="/my/home" className={styles.button}>내 집 정보 입력</Link>
        </div>
      )}
    </Card>
  );
}

/** 새 공고: PC는 제목 + 큰 숫자, 휴대폰은 한 줄 "새 공고 N건 | 이름" */
export function NoticeCard({ data }: { data: HomeDashboard }) {
  if (!data.hasCondition) {
    return (
      <Card title="새 공고" className={styles.noticeCard}>
        <div>
          <p className={styles.noticeNote}>공고 조건을 넣으면 맞춤 공고를 보여 드려요</p>
          <div className={styles.noticeLink}><TextLink href="/onboarding">공고 조건 넣기</TextLink></div>
        </div>
      </Card>
    );
  }
  const { count, firstTitle } = data.newNotices;
  return (
    <Card className={styles.noticeCard}>
      <h2 className={styles.noticeTitle}>새 공고<span className={styles.phoneOnly}> {count}건</span>
        {firstTitle ? <span className={`${styles.phoneOnly} ${styles.noticeInline}`}> | {firstTitle}</span> : null}
      </h2>
      <div>
        <p className={`${styles.pcOnly} ${styles.noticeCount}`}>{count}건</p>
        {firstTitle ? <p className={`${styles.pcOnly} ${styles.noticeNote}`}>{firstTitle}</p> : null}
        <div className={styles.noticeLink}><TextLink href="/notices">맞춤 공고 보기</TextLink></div>
      </div>
    </Card>
  );
}

/** 우리 집 상태: 실내 습도·온도(최근 측정), 바깥(기상청 지금), 계약 만료까지 */
export function StatusCard({ data, now, today }: { data: HomeDashboard; now: Date; today: string }) {
  const home = data.home;
  if (!home) return null; // 내 집 등록은 월 실질 주거비 카드가 안내한다
  const measured = data.latestMeasurement;
  const end = contractEndText(home.contractEndDate, today);
  return (
    <Card title="우리 집 상태" meta={<span className={styles.phoneOnly}>출처: 기상청, 계약 정보</span>} className={styles.statusCard}>
      <div className={styles.statusGrid}>
        <StatItem label="실내 습도" value={measured ? `${measured.humidityPct}%` : "미입력"} />
        <StatItem label="실내 온도" value={measured ? `${measured.temperatureC}°C` : "미입력"} />
        <StatItem label="바깥" value={<Suspense fallback="불러오는 중">{<OutdoorWeather sigunguCode={home.sigunguCode} now={now} />}</Suspense>} />
        {/* contractEndText는 "계약 만료까지 361일" 꼴. 보드처럼 이름은 칸 제목으로 빼고 값만 */}
        <StatItem label="계약 만료까지" value={end ? end.replace("계약 만료까지 ", "") : "미입력"} />
      </div>
    </Card>
  );
}
