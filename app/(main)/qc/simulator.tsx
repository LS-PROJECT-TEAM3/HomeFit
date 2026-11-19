"use client";

import { useState } from "react";
import { dewPoint, RISK_RULES, surfaceTemperature, type WindowType } from "@/incident/condensation";
import styles from "@/app/_components/hub.module.css";

// spec 004 FR-003: 결로 위험 시뮬레이터. 기능 003의 계산(이슬점 Magnus, 창 표면 온도)을 그대로 쓴다. 저장하지 않는다
function toNumber(raw: string): number | null {
  const value = Number(raw.trim());
  return raw.trim() === "" || Number.isNaN(value) ? null : value;
}

type Result = { surface: number; dew: number; risk: boolean } | null;

function calculate(indoor: string, humidity: string, outdoor: string, windowType: WindowType): Result {
  const t = toNumber(indoor);
  const h = toNumber(humidity);
  const o = toNumber(outdoor);
  if (t === null || h === null || o === null || h < 0 || h > 100 || t < -10 || t > 45) return null;
  const surface = surfaceTemperature({ indoorC: t, outdoorC: o, windowType });
  const dew = dewPoint(t, h);
  return { surface, dew, risk: surface - dew <= RISK_RULES.surfaceMarginC };
}

export function CondensationSimulator() {
  const [indoor, setIndoor] = useState("20");
  const [humidity, setHumidity] = useState("60");
  const [outdoor, setOutdoor] = useState("-5");
  const [windowType, setWindowType] = useState<WindowType>("single");
  const result = calculate(indoor, humidity, outdoor, windowType);
  return (
    <>
      <div className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="sim-indoor">실내 온도(°C)</label>
          <input id="sim-indoor" inputMode="decimal" className={styles.input} value={indoor} onChange={(e) => setIndoor(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sim-humidity">실내 습도(%)</label>
          <input id="sim-humidity" inputMode="decimal" className={styles.input} value={humidity} onChange={(e) => setHumidity(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sim-outdoor">바깥 기온(°C)</label>
          <input id="sim-outdoor" inputMode="decimal" className={styles.input} value={outdoor} onChange={(e) => setOutdoor(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sim-window">창 종류</label>
          <select id="sim-window" className={styles.input} value={windowType} onChange={(e) => setWindowType(e.target.value as WindowType)}>
            <option value="single">홑유리</option>
            <option value="double">이중유리</option>
            <option value="unknown">모름(홑유리로 계산)</option>
          </select>
        </div>
      </div>
      <div className={`${styles.result} ${result === null ? "" : result.risk ? styles.resultRisk : styles.resultSafe}`} role="status" aria-live="polite">
        {result === null ? (
          <span>숫자를 넣어 주세요. 실내 온도 -10~45°C, 습도 0~100%.</span>
        ) : (
          <span>
            <strong>{result.risk ? "결로 위험" : "결로 위험 낮음"}</strong> · 창 표면 {result.surface.toFixed(1)}°C(추정) · 이슬점 {result.dew.toFixed(1)}°C
            {result.risk ? " · 창 표면이 이슬점 + 1°C 이하라 물방울이 맺힐 수 있습니다" : " · 창 표면이 이슬점보다 1°C 넘게 따뜻합니다"}
          </span>
        )}
      </div>
      <p className={styles.muted}>계산한 추정값이라 실제와 다를 수 있습니다. 창틀·모서리는 더 차가울 수 있습니다.</p>
    </>
  );
}
