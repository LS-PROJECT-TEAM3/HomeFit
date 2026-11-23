"use client";

import { useState } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import { COOKING_MJ_LIMIT, GAS_TARIFF, checkGasUsage, gasBill, gasReductions, type GasRegion } from "@/incident/gas-bill";
import { about } from "../energy-figure";
import styles from "../energy.module.css";

// IA EN_110200_TB, spec 016 FR-001~003 → spec 022 FR-012(캔버스 v2-energy-merged-heat): 지역·사용량을 넣으면 바로 계산(저장하지 않음).
// 현경 결정(2026-11-21): 지금 계산기를 보드 모양으로. 12개월 난방비 막대·가스 사용량 저장은 추후 기능(plan.md)

function Result({ region, mj }: { region: GasRegion; mj: number }) {
  const bill = gasBill(region, mj);
  return (
    <div className={styles.heatGrid} aria-live="polite">
      <div className={styles.heatLeft}>
        <div className={styles.heatNumRow}>
          <span className={styles.heatPrefix}>약</span>
          <span className={styles.heatNumber}>{about(bill.totalWithVat)}</span>
          <span className={styles.heatUnit}>원</span>
        </div>
        <span className={styles.greyPill}>추정값 · 부가세 포함</span>
      </div>
      <dl className={styles.kvRows}>
        <div><dt>도시가스 공급 지역</dt><dd>{region.name}</dd></div>
        <div><dt>한 달 사용량</dt><dd>{mj.toLocaleString("ko-KR")}MJ</dd></div>
        {/* spec 016 FR-002: 줄이면 얼마 */}
        {gasReductions(region, mj).filter((r) => r.percent > 0).map((r) => (
          <div key={r.percent}><dt>{r.percent}% 줄이면</dt><dd>약 {about(r.totalWithVat)}원</dd></div>
        ))}
      </dl>
    </div>
  );
}

export function HeatingCalculator() {
  const [regionName, setRegionName] = useState("");
  const [usage, setUsage] = useState("");
  const region = GAS_TARIFF.regions.find((r) => r.name === regionName) ?? null;
  const checked = usage.trim() === "" ? null : checkGasUsage(usage);
  const { source } = GAS_TARIFF;
  // spec 016 FR-003: 근거와 실제 고지서와 다를 수 있는 이유(설명 버튼으로)
  const tip = `${source.name}(${source.basedOn} 기준) 주택용 요금표로 짐작한 값이에요. ${COOKING_MJ_LIMIT}MJ까지는 취사 단가, 넘는 만큼은 주택난방 단가예요. 회사마다 조정 시기와 계량기 보정이 달라 고지서와 다를 수 있고, 지역난방·중앙난방·LPG는 계산하지 않아요. 냉방은 전기를 쓰므로 전기 탭에 들어 있어요.`;
  return (
    <section className={styles.card} aria-labelledby="heating-title">
      <span className={styles.cardTitleRow}>
        <h2 id="heating-title" className={styles.cardTitle}>이번 달 예상 난방비</h2>
        <InfoTip icon text={tip} label="이번 달 예상 난방비 설명 보기" />
      </span>
      <div className={styles.heatInputs}>
        <div className={styles.field}>
          <label htmlFor="gas-region" className={styles.fieldLabel}>도시가스 공급 지역</label>
          <select id="gas-region" className={styles.input} value={regionName} onChange={(e) => setRegionName(e.target.value)}>
            <option value="">고르세요</option>
            {GAS_TARIFF.regions.map((r) => <option key={r.name} value={r.name}>{r.name} ({r.supplier})</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="gas-usage" className={styles.fieldLabel}>한 달 사용량</label>
          <div className={styles.inputBox}>
            <input id="gas-usage" className={styles.input} inputMode="decimal" autoComplete="off" value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="고지서의 MJ, 예: 1500" aria-invalid={checked?.ok === false} aria-describedby="gas-usage-help" />
            <span className={styles.unitText} aria-hidden="true">MJ</span>
          </div>
          <span id="gas-usage-help" className={styles.help}>사용량은 저장하지 않아요.</span>
        </div>
      </div>
      {checked?.ok === false ? <p role="alert" className={styles.fieldError}>{checked.message}</p> : null}
      {region === null && checked?.ok ? <p className={styles.help}>지역을 고르면 계산해요.</p> : null}
      {region && checked?.ok ? <Result region={region} mj={checked.mj} /> : null}
    </section>
  );
}
