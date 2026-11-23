"use client";

import { useState } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import { condensationLevel, dewPoint, surfaceTemperature, type CondensationLevel, type WindowType } from "@/incident/condensation";
import { RiskGauge } from "./risk-gauge";
import styles from "./qc.module.css";

// spec 004 FR-003 → spec 022 FR-011(캔버스 v2-qc-sim-tab-pc): 결로 위험. 기능 003 계산(이슬점 Magnus, 창 표면 온도)을 그대로 쓴다. 저장하지 않는다

export type SimStart = { indoor: number; humidity: number; outdoor: number; windowType: WindowType };

const LEVEL_TEXT: Record<CondensationLevel, string> = { low: "낮음", caution: "주의", high: "높음" };

function toNumber(raw: string): number | null {
  const value = Number(raw.trim());
  return raw.trim() === "" || Number.isNaN(value) ? null : value;
}

type Values = { indoor: string; humidity: string; outdoor: string; windowType: WindowType };
type Result = { surface: number; dew: number; level: CondensationLevel } | null;

function calculate(v: Values): Result {
  const t = toNumber(v.indoor);
  const h = toNumber(v.humidity);
  const o = toNumber(v.outdoor);
  if (t === null || h === null || o === null || h < 0 || h > 100 || t < -10 || t > 45) return null;
  const surface = surfaceTemperature({ indoorC: t, outdoorC: o, windowType: v.windowType });
  const dew = dewPoint(t, h);
  return { surface, dew, level: condensationLevel(surface, dew) };
}

const toValues = (s: SimStart): Values => ({ indoor: String(s.indoor), humidity: String(s.humidity), outdoor: String(s.outdoor), windowType: s.windowType });
const one = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)}°C`;

function NumberInput({ id, label, unit, value, onChange }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={styles.inputBox}>
        <input id={id} inputMode="decimal" className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} />
        <span className={styles.unit} aria-hidden="true">{unit}</span>
      </div>
    </div>
  );
}

function Stat({ label, tip, value }: { label: string; tip: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}<InfoTip icon text={tip} label={`${label} 설명 보기`} /></span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function ResultCard({ result }: { result: Result }) {
  return (
    <section className={styles.card} aria-label="결로 위험 결과" aria-live="polite">
      {result === null ? (
        <p className={styles.invalid} role="status">숫자를 넣어 주세요. 실내 온도는 -10~45°C, 습도는 0~100%예요.</p>
      ) : (
        <div className={styles.result}>
          <span className={`${styles.levelLabel} ${styles[`tone_${result.level}`]}`}>
            결로 위험 단계<InfoTip icon text="계산한 추정값이라 실제와 다를 수 있어요. 결로가 생길지 판정하지는 않아요." label="결로 위험 단계 설명 보기" />
          </span>
          <RiskGauge level={result.level} />
          <span className={`${styles.levelWord} ${styles[`tone_${result.level}`]}`}>{LEVEL_TEXT[result.level]}</span>
          <div className={styles.stats}>
            <Stat label="창 표면" tip="실제로 잰 값이 아니라 실내외 온도와 창 종류로 짐작한 값이에요." value={one(result.surface)} />
            <Stat label="이슬점" tip="입력한 온도와 습도로 계산한 값이에요." value={one(result.dew)} />
            <Stat label="차이" tip="창 표면과 이슬점의 차이예요. 작을수록 결로가 생기기 쉬워요." value={one(result.surface - result.dew)} />
          </div>
        </div>
      )}
    </section>
  );
}

export function CondensationSimulator({ start }: { start: SimStart }) {
  const [values, setValues] = useState<Values>(() => toValues(start));
  const set = (key: keyof Values) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  return (
    <div className={styles.simGrid}>
      <section className={styles.card} aria-labelledby="sim-title">
        <div className={styles.cardHead}>
          <h2 id="sim-title" className={styles.cardTitle}>
            조건을 바꿔 보세요<InfoTip icon text="내 집에 입력한 값과 기상청 기온으로 시작해요. 숫자를 바꾸면 바로 결과가 바뀌고, 저장하지 않아요." label="조건 설명 보기" />
          </h2>
          <button type="button" className={styles.resetButton} onClick={() => setValues(toValues(start))}>원래 값으로</button>
        </div>
        <div className={styles.inputs}>
          <NumberInput id="sim-indoor" label="실내 온도" unit="°C" value={values.indoor} onChange={set("indoor")} />
          <NumberInput id="sim-humidity" label="실내 습도" unit="%" value={values.humidity} onChange={set("humidity")} />
          <NumberInput id="sim-outdoor" label="바깥 기온" unit="°C" value={values.outdoor} onChange={set("outdoor")} />
          <div className={styles.field}>
            <label htmlFor="sim-window" className={styles.fieldLabel}>창 종류</label>
            <select id="sim-window" className={styles.input} value={values.windowType} onChange={(e) => set("windowType")(e.target.value)}>
              <option value="single">홑유리</option>
              <option value="double">이중유리</option>
              <option value="unknown">모름(홑유리로 계산)</option>
            </select>
          </div>
        </div>
      </section>
      <ResultCard result={calculate(values)} />
    </div>
  );
}
