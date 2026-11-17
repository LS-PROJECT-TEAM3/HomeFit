"use client";

import { useEffect, useState } from "react";
import styles from "@/app/_components/form.module.css";

type Item = { code: string; name: string };
type Result = { sido: string; items: Item[] | null };
type Load = { state: "idle" } | { state: "loading" } | { state: "ready"; items: Item[] } | { state: "failed" };

function loadOf(sidoCode: string, result: Result | null): Load {
  if (!sidoCode) return { state: "idle" };
  if (result?.sido !== sidoCode) return { state: "loading" };
  return result.items ? { state: "ready", items: result.items } : { state: "failed" };
}

/** onPick: 고를 때 알려 줌(spec 004 v0.4 건축물 조회가 읍면동 목록을 바꾸려고 씀) */
type Props = { sidoCode: string; initial: string; error?: string; label?: string; emptyLabel?: string; onPick?: (code: string) => void };

// FR-002 (spec 001 v0.3): 고른 시도에 속한 시군구만 고른다. 비우면 "시도 전체"
// spec 003 FR-001: 내 집 화면도 같이 쓴다(시군구 필수라 이름표만 바꿈)
export function SigunguField({ sidoCode, initial, error, label = "시군구 (선택)", emptyLabel = "시도 전체", onPick }: Props) {
  const [result, setResult] = useState<Result | null>(null);
  const [value, setValue] = useState(initial);
  const load = loadOf(sidoCode, result);

  useEffect(() => {
    if (!sidoCode) return;
    let cancelled = false;
    fetch(`/api/sigungu?sido=${encodeURIComponent(sidoCode)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { items: Item[] };
        if (!cancelled) setResult({ sido: sidoCode, items: body.items });
      })
      .catch(() => {
        if (!cancelled) setResult({ sido: sidoCode, items: null });
      });
    return () => {
      cancelled = true;
    };
  }, [sidoCode]);

  // 시도를 바꾸면 다른 시도의 시군구가 남지 않게 비운다
  const shown = value.startsWith(sidoCode) ? value : "";
  const items = load.state === "ready" ? load.items : [];
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="sigunguCode">{label}</label>
      <select id="sigunguCode" name="sigunguCode" value={shown} onChange={(e) => { setValue(e.target.value); onPick?.(e.target.value); }}
        className={styles.input} disabled={load.state !== "ready"}
        aria-invalid={Boolean(error)} aria-describedby="sigunguCode-help sigunguCode-error">
        <option value="">{emptyLabel}</option>
        {items.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
      </select>
      {/* 목록을 못 불러와 칸이 잠겨도 저장된 값은 그대로 보낸다 */}
      {load.state !== "ready" && shown ? <input type="hidden" name="sigunguCode" value={shown} /> : null}
      <p id="sigunguCode-help" className={styles.help} role={load.state === "failed" ? "alert" : undefined}>
        {load.state === "idle" ? "시도를 먼저 고르세요." : null}
        {load.state === "loading" ? "시군구 목록을 불러오는 중…" : null}
        {load.state === "failed" ? "시군구 목록을 불러오지 못했습니다. 시도 전체로 저장하거나 잠시 뒤 다시 열어 주세요." : null}
      </p>
      {error ? <p id="sigunguCode-error" className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}
