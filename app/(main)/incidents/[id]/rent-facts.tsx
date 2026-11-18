import { HOUSING_LABELS } from "@/incident/home-form";
import type { RentFacts } from "@/incident/rent-detect";
import { fetchSigunguList } from "@/watch/region.server";
import styles from "./detail.module.css";

export function won(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("ko-KR")}원`;
}

const FIELD = { monthlyRent: "월세", deposit: "보증금" } as const;

async function sigunguName(code: string): Promise<string> {
  try {
    return (await fetchSigunguList(code.slice(0, 2))).find((s) => s.code === code)?.name ?? code;
  } catch {
    return code;
  }
}

/**
 * IA IC_020100_PG 알림 상세의 시세 비교표 (spec 008 FR-006, CUJ-03 MOT).
 * 거래 수·기간·비교 조건을 중간값과 함께 보여 준다(거래가 적은데 중간값만 보이면 잘못 판단하게 만든다)
 */
export async function RentFactsView({ facts }: { facts: RentFacts }) {
  const baseName = facts.target === "home" ? "내 계약" : "지난번 본 중간값";
  const region = await sigunguName(facts.sigunguCode);
  return (
    <section className={styles.card} aria-labelledby="rent-title">
      <h2 id="rent-title" className={styles.sectionTitle}>주변 실거래 비교표</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.source}>{facts.months[0]} ~ {facts.months[1]} · {region} · 같은 조건 실거래 {facts.count}건의 중간값</caption>
          <thead><tr><th scope="col">항목</th><th scope="col">{baseName}</th><th scope="col">주변 중간값</th><th scope="col">차이</th></tr></thead>
          <tbody>
            {facts.diffs.map((d) => (
              <tr key={d.field}>
                <th scope="row">{FIELD[d.field]}</th>
                <td className="tabular-nums">{won(d.base)}</td>
                <td className="tabular-nums">{won(d.median)}</td>
                <td className="tabular-nums"><strong>{d.percent > 0 ? "+" : ""}{d.percent}% {d.percent > 0 ? "높음" : "낮음"}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className={styles.facts}>
        <dt>비교 조건</dt>
        <dd>{HOUSING_LABELS[facts.housingType]} · {facts.contractType === "monthly" ? "월세" : "전세"} · {facts.housingType === "detached" ? "연면적" : "전용면적"} {facts.areaMin}~{facts.areaMax}㎡</dd>
        <dt>거래 수</dt><dd className="tabular-nums">{facts.count}건</dd>
        <dt>월세 중간값</dt><dd className="tabular-nums">{won(facts.medianRent)}</dd>
        <dt>보증금 중간값</dt><dd className="tabular-nums">{won(facts.medianDeposit)}</dd>
      </dl>
      <p className={styles.notice}>국토교통부 전월세 실거래가 기준입니다. 같은 계약 형태끼리만 비교하고 보증금·월세 전환율은 쓰지 않습니다. 실제 매물 가격과 다를 수 있습니다.</p>
    </section>
  );
}
