"use client";

import { useEffect, useState } from "react";
import type { BuildingTitle } from "@/watch/building";
import { SIDO_OPTIONS } from "@/watch/sido";
import { SigunguField } from "../../my/conditions/sigungu-field";
import styles from "@/app/_components/hub.module.css";

type Umd = { code: string; name: string };
type Result = { state: "idle" } | { state: "loading" } | { state: "done"; items: BuildingTitle[] } | { state: "error"; message: string };

function area(value: number | null): string {
  return value === null ? "정보 없음" : `${value.toLocaleString("ko-KR")}㎡`;
}

// spec 004 v0.4 FR-008, PRD v1.8 FR-34: 건축물대장 표제부 조회. 넣은 주소는 저장하지 않는다
export function BuildingLookup({ initialSigungu }: { initialSigungu: string }) {
  const [sido, setSido] = useState(initialSigungu.slice(0, 2));
  const [sigungu, setSigungu] = useState(initialSigungu);
  const [umds, setUmds] = useState<{ sigungu: string; items: Umd[] | null } | null>(null);
  const [bjdong, setBjdong] = useState("");
  const [bun, setBun] = useState("");
  const [ji, setJi] = useState("");
  const [result, setResult] = useState<Result>({ state: "idle" });

  useEffect(() => {
    if (!/^\d{5}$/.test(sigungu)) return;
    let cancelled = false;
    fetch(`/api/umd?sigungu=${sigungu}`)
      .then(async (r) => (r.ok ? ((await r.json()) as { items: Umd[] }).items : null))
      .catch(() => null)
      .then((items) => { if (!cancelled) setUmds({ sigungu, items }); });
    return () => { cancelled = true; };
  }, [sigungu]);

  const umdList = umds?.sigungu === sigungu ? umds.items : undefined;

  const lookup = async () => {
    setResult({ state: "loading" });
    try {
      const response = await fetch("/api/building", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sigungu, bjdong, bun, ji }) });
      const body = (await response.json()) as { items?: BuildingTitle[]; error?: string };
      setResult(response.ok && body.items ? { state: "done", items: body.items } : { state: "error", message: body.error ?? "건축물대장을 불러오지 못했습니다." });
    } catch {
      setResult({ state: "error", message: "연결이 끊겼습니다. 잠시 뒤 다시 조회해 주세요." });
    }
  };

  return (
    <>
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void lookup(); }}>
        <div className={styles.field}>
          <label htmlFor="bld-sido">시도</label>
          <select id="bld-sido" className={styles.input} value={sido} onChange={(e) => { setSido(e.target.value); setSigungu(""); setBjdong(""); }}>
            <option value="">고르세요</option>
            {SIDO_OPTIONS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <SigunguField key={sido} sidoCode={sido} initial={sigungu} label="시군구" emptyLabel="고르세요" onPick={(code) => { setSigungu(code); setBjdong(""); }} />
        </div>
        <div className={styles.field}>
          <label htmlFor="bld-umd">읍면동</label>
          <select id="bld-umd" className={styles.input} value={bjdong} onChange={(e) => setBjdong(e.target.value)} disabled={!umdList}>
            <option value="">{umdList === undefined ? "시군구를 먼저 고르세요" : umdList === null ? "목록을 불러오지 못했습니다" : "고르세요"}</option>
            {(umdList ?? []).map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="bld-bun">번지 본번</label>
          <input id="bld-bun" className={styles.input} inputMode="numeric" value={bun} onChange={(e) => setBun(e.target.value)} placeholder="예: 31" />
        </div>
        <div className={styles.field}>
          <label htmlFor="bld-ji">부번 (없으면 비움)</label>
          <input id="bld-ji" className={styles.input} inputMode="numeric" value={ji} onChange={(e) => setJi(e.target.value)} placeholder="예: 0" />
        </div>
        <button type="submit" className={styles.primaryButton} disabled={result.state === "loading"}>{result.state === "loading" ? "조회 중…" : "조회"}</button>
      </form>
      <p className={styles.muted}>넣은 주소는 저장하지 않습니다. 출처: 국토교통부 건축HUB 건축물대장(표제부). 실제 안전 인증·판정이 아닙니다.</p>
      <div aria-live="polite" className={styles.section}>
        {result.state === "error" ? <p role="alert">{result.message}</p> : null}
        {result.state === "done" && result.items.length === 0 ? <p>그 번지의 건축물대장을 찾지 못했습니다. 읍면동과 번지를 확인해 주세요.</p> : null}
        {result.state === "done" && result.items.length > 0 ? (
          <div className={styles.grid}>
            {result.items.map((b, i) => (
              <section key={i} className={styles.card} aria-label={`${b.name} ${b.dong}`}>
                <h2>{b.name}{b.dong ? ` · ${b.dong}` : ""}</h2>
                <dl className={`${styles.list} ${styles.plainList} ${styles.inlineFacts}`}>
                  <div><dt>주용도: </dt><dd>{b.purpose}</dd></div>
                  <div><dt>구조: </dt><dd>{b.structure}</dd></div>
                  <div><dt>사용승인일: </dt><dd>{b.approvedOn ?? "정보 없음"}</dd></div>
                  <div><dt>층수: </dt><dd className="tabular-nums">지상 {b.floorsAbove ?? "?"}층 · 지하 {b.floorsBelow ?? "?"}층</dd></div>
                  <div><dt>세대수: </dt><dd className="tabular-nums">{b.households ?? "정보 없음"}</dd></div>
                  <div><dt>연면적: </dt><dd className="tabular-nums">{area(b.totalArea)}</dd></div>
                  <div><dt>내진설계: </dt><dd><strong>{b.quakeDesign}</strong></dd></div>
                </dl>
                <p className={styles.muted}>{b.roadAddress || b.address}</p>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
