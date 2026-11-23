"use client";

import { useEffect, useState } from "react";
import { InfoTip } from "@/app/_components/info-tip";
import { yearsSinceApproval, type BuildingTitle } from "@/watch/building";
import { SIDO_OPTIONS } from "@/watch/sido";
import { SigunguField } from "../../my/conditions/sigungu-field";
import styles from "../qc.module.css";

type Umd = { code: string; name: string };
type Result = { state: "idle" } | { state: "loading" } | { state: "done"; items: BuildingTitle[] } | { state: "error"; message: string };

const dot = (date: string) => date.replaceAll("-", ".");
const floors = (b: BuildingTitle) => `지상 ${b.floorsAbove ?? "?"}층 / 지하 ${b.floorsBelow ?? "?"}층`;

function Req() {
  return <><span aria-hidden="true" className={styles.required}>*</span><span className={styles.srOnly}>필수</span></>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={styles.bRow}><dt>{label}</dt><dd>{children}</dd></div>;
}

function BuildingCard({ b, today }: { b: BuildingTitle; today: string }) {
  const years = yearsSinceApproval(b.approvedOn, today);
  return (
    <section className={styles.bCard} aria-label={`${b.name} ${b.dong}`}>
      <div>
        <h3 className={styles.bName}>{b.name}{b.dong ? ` ${b.dong}` : ""}</h3>
        <p className={styles.bAddress}>{b.roadAddress || b.address}</p>
      </div>
      <dl className={styles.bRows}>
        <Row label="사용승인일">{b.approvedOn ? <><strong>{dot(b.approvedOn)}</strong>{years !== null ? <span className={styles.bNote}>준공 후 {years}년 지났어요</span> : null}</> : <strong>정보 없음</strong>}</Row>
        <Row label="용도"><strong>{b.purpose}</strong></Row>
        <Row label="구조"><strong>{b.structure}</strong></Row>
        <Row label="층수"><strong>{floors(b)}</strong></Row>
        <Row label="세대수"><strong>{b.households ? `${b.households}세대` : "해당 없음"}</strong></Row>
        {/* PRD v1.8 FR-34·spec 004 FR-008 요구라 보드에 없지만 둔다 */}
        <Row label="내진설계"><strong>{b.quakeDesign}</strong></Row>
      </dl>
    </section>
  );
}

// spec 004 v0.4 FR-008, PRD v1.8 FR-34 → spec 022 FR-011(캔버스 v2-qc-bldg-pc): 건축물대장 표제부 조회. 넣은 주소는 저장하지 않는다
export function BuildingLookup({ initialSigungu, today }: { initialSigungu: string; today: string }) {
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
      setResult(response.ok && body.items ? { state: "done", items: body.items } : { state: "error", message: body.error ?? "건축물대장을 불러오지 못했어요. 잠시 뒤 다시 찾아 주세요." });
    } catch {
      setResult({ state: "error", message: "연결이 끊겼어요. 잠시 뒤 다시 찾아 주세요." });
    }
  };

  return (
    <>
      <section className={styles.card} aria-labelledby="bld-title">
        <div className={styles.cardHead}>
          <h2 id="bld-title" className={styles.cardTitle}>주소로 건축물 찾기<InfoTip icon text="넣은 주소는 저장하지 않아요. 출처는 국토교통부 건축HUB 건축물대장(표제부)이고, 실제 안전 인증·판정이 아니에요." label="건축물 찾기 설명 보기" /></h2>
        </div>
        <form className={styles.bForm} onSubmit={(e) => { e.preventDefault(); void lookup(); }}>
          <div className={styles.field}>
            <label htmlFor="bld-sido" className={styles.fieldLabel}>시도<Req /></label>
            <select id="bld-sido" className={styles.input} value={sido} onChange={(e) => { setSido(e.target.value); setSigungu(""); setBjdong(""); }}>
              <option value="">고르세요</option>
              {SIDO_OPTIONS.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <SigunguField key={sido} sidoCode={sido} initial={sigungu} label={<>시군구<Req /></>} emptyLabel="고르세요" onPick={(code) => { setSigungu(code); setBjdong(""); }}
            classes={{ field: styles.field, label: styles.fieldLabel, input: styles.input, help: styles.help }} />
          <div className={styles.field}>
            <label htmlFor="bld-umd" className={styles.fieldLabel}>읍면동<Req /></label>
            <select id="bld-umd" className={styles.input} value={bjdong} onChange={(e) => setBjdong(e.target.value)} disabled={!umdList}>
              <option value="">{umdList === undefined ? "시군구 먼저" : umdList === null ? "목록을 못 불러옴" : "고르세요"}</option>
              {(umdList ?? []).map((u) => <option key={u.code} value={u.code}>{u.name}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="bld-bun" className={styles.fieldLabel}>번지 본번<Req /></label>
            <input id="bld-bun" className={styles.input} inputMode="numeric" value={bun} onChange={(e) => setBun(e.target.value)} placeholder="예: 31" />
          </div>
          <div className={styles.field}>
            <label htmlFor="bld-ji" className={styles.fieldLabel}>부번<span className={styles.optional}>(선택)</span></label>
            <input id="bld-ji" className={styles.input} inputMode="numeric" value={ji} onChange={(e) => setJi(e.target.value)} placeholder="0" />
          </div>
          <button type="submit" className={`${styles.buttonPrimary} ${styles.bSubmit}`} disabled={result.state === "loading"}>{result.state === "loading" ? "찾는 중…" : "찾기"}</button>
        </form>
      </section>
      <div aria-live="polite">
        {result.state === "error" ? <p role="alert" className={styles.formAlert}>{result.message}</p> : null}
        {result.state === "done" ? (
          <section aria-labelledby="bld-result">
            <h2 id="bld-result" className={`${styles.cardTitle} ${styles.bResultTitle}`}>검색 결과 {result.items.length}곳<InfoTip icon text="건축물대장 표제부에 있는 동마다 한 칸씩 보여 줘요." label="검색 결과 설명 보기" /></h2>
            {result.items.length === 0 ? (
              <div className={styles.card}><p className={styles.emptyText}>건축물대장에서 찾지 못했어요. 읍면동과 번지를 확인해 주세요.</p></div>
            ) : (
              <div className={styles.bGrid}>{result.items.map((b, i) => <BuildingCard key={i} b={b} today={today} />)}</div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
