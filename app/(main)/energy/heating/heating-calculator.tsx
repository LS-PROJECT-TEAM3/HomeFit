"use client";

import { useState } from "react";
import { COOKING_MJ_LIMIT, GAS_TARIFF, checkGasUsage, gasBill, gasReductions, type GasRegion } from "@/incident/gas-bill";
import styles from "@/app/_components/hub.module.css";

const won = (value: number): string => `${value.toLocaleString("ko-KR")}원`;

function BillResult({ region, mj }: { region: GasRegion; mj: number }) {
  const bill = gasBill(region, mj);
  return (
    <div className={styles.result} aria-live="polite">
      <p>
        <strong className="tabular-nums">한 달 약 {won(bill.total)}</strong> (부가세 별도) · 부가세 10% 더하면 약 <span className="tabular-nums">{won(bill.totalWithVat)}</span>
      </p>
      <p className={styles.muted}>
        {bill.basicFee === null ? "기본요금을 요금표에서 숫자로 읽지 못해 빼고 계산했습니다" : `기본요금 ${won(bill.basicFee)}`}
        {" "}+ 취사 단가 {bill.cookingMj.toLocaleString("ko-KR")}MJ × {region.cookingPerMj}원
        {bill.heatingMj > 0 ? ` + 주택난방 단가 ${bill.heatingMj.toLocaleString("ko-KR")}MJ × ${region.heatingPerMj}원` : ""}
      </p>
      {/* spec 016 FR-002 */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.muted}>사용량을 줄이면 (같은 지역 요금표)</caption>
          <thead><tr><th scope="col">사용량</th><th scope="col">부가세 별도</th><th scope="col">부가세 포함 어림</th></tr></thead>
          <tbody>
            {gasReductions(region, mj).map((row) => (
              <tr key={row.percent}>
                <th scope="row" className="tabular-nums">{row.percent === 0 ? "지금" : `${row.percent}% 줄임`} ({row.mj.toLocaleString("ko-KR")}MJ)</th>
                <td className="tabular-nums">{won(row.total)}</td>
                <td className="tabular-nums">{won(row.totalWithVat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// IA EN_110200_TB, spec 016 FR-001~003: 지역·사용량을 넣으면 바로 계산(저장하지 않음)
export function HeatingCalculator() {
  const [regionName, setRegionName] = useState("");
  const [usage, setUsage] = useState("");
  const region = GAS_TARIFF.regions.find((r) => r.name === regionName) ?? null;
  const checked = usage.trim() === "" ? null : checkGasUsage(usage);
  return (
    <section className={styles.card} aria-labelledby="heating-title">
      <h2 id="heating-title">도시가스 요금 계산</h2>
      <p className={styles.muted}>고지서의 한 달 사용량(MJ)과 지역을 넣으면 주택용 요금표로 계산합니다. 사용량은 저장하지 않습니다.</p>
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="gas-region">지역(도시가스 공급 지역)</label>
          <select id="gas-region" className={styles.input} value={regionName} onChange={(e) => setRegionName(e.target.value)}>
            <option value="">고르세요</option>
            {GAS_TARIFF.regions.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.supplier})</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="gas-usage">한 달 사용량(MJ)</label>
          <input id="gas-usage" className={styles.input} inputMode="decimal" autoComplete="off" value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="예: 1,500" aria-describedby="gas-usage-help" aria-invalid={checked?.ok === false} />
          <span id="gas-usage-help" className={styles.muted}>{COOKING_MJ_LIMIT}MJ까지는 취사 단가, 넘는 만큼은 주택난방 단가로 계산합니다.</span>
        </div>
      </div>
      {checked?.ok === false ? <p role="alert">{checked.message}</p> : null}
      {region === null && checked?.ok ? <p className={styles.muted}>지역을 고르면 계산합니다.</p> : null}
      {region && checked?.ok ? <BillResult region={region} mj={checked.mj} /> : null}
    </section>
  );
}
