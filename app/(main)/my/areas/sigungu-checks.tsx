"use client";

import { useEffect, useState } from "react";
import styles from "@/app/_components/form.module.css";
import local from "./areas.module.css";

type Item = { code: string; name: string };
type Load = { state: "idle" } | { state: "loading" } | { state: "ready"; items: Item[] } | { state: "failed" };

// 사용자 요청(2026-11-18): 관심 지역 시군구를 여러 곳 한 번에 고른다. 목록은 내 집·조건 화면과 같은 /api/sigungu
export function SigunguChecks({ sidoCode, initial, error }: { sidoCode: string; initial: string[]; error?: string }) {
  const [load, setLoad] = useState<Load>(sidoCode ? { state: "loading" } : { state: "idle" });

  useEffect(() => {
    if (!sidoCode) return;
    let cancelled = false;
    fetch(`/api/sigungu?sido=${encodeURIComponent(sidoCode)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { items: Item[] };
        if (!cancelled) setLoad({ state: "ready", items: body.items });
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [sidoCode]);

  return (
    <fieldset className={styles.checks} aria-describedby="sigunguCodes-help sigunguCodes-error" aria-invalid={Boolean(error)}>
      <legend className={styles.label}>시군구 (필수, 여러 곳 가능)</legend>
      <p id="sigunguCodes-help" className={styles.help} role={load.state === "failed" ? "alert" : undefined}>
        {load.state === "idle" ? "시도를 먼저 고르세요." : null}
        {load.state === "loading" ? "시군구 목록을 불러오는 중…" : null}
        {load.state === "failed" ? "시군구 목록을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요." : null}
        {load.state === "ready" ? "한 번에 10곳까지 고를 수 있습니다. 고른 곳마다 관심 지역이 하나씩 생깁니다." : null}
      </p>
      {load.state === "ready" ? (
        <div className={local.checkGrid}>
          {load.items.map((item) => (
            <label key={item.code} className={styles.check}>
              <input type="checkbox" name="sigunguCodes" value={item.code} defaultChecked={initial.includes(item.code)} />
              {item.name}
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p id="sigunguCodes-error" className={styles.fieldError}>{error}</p> : null}
    </fieldset>
  );
}
