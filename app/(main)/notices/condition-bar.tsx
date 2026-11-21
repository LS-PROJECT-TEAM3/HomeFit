"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/app/_components/icons";
import { ALL_SUPPLY_TYPES, TARGET_GROUPS, type PolicyCondition, type TargetGroup } from "@/incident/match";
import { SUPPLY_TYPES, TARGET_LABELS, type ConditionOverride } from "@/incident/notice-list";
import { SIDO_OPTIONS } from "@/watch/sido";
import { saveConditions } from "../my/conditions/actions";
import { SigunguField } from "../my/conditions/sigungu-field";
import styles from "./notices.module.css";

// spec 022(캔버스 v2-s3-pc·s3-filter-pc, 현경 결정 2026-11-22): 내 조건 줄. 칩을 눌러 조건을 바꾼다.
// 조건 고정을 켜면 내 조건(설정 > 공고/정책 조건)에 저장, 끄면 주소 값으로 잠깐만(탭을 나갔다 오면 저장된 조건으로)
type Chips = { region: string; types: string; rent: string; age: string; targets: string };
type ChipKey = "region" | "types" | "rent" | "age" | "targets";
/** fields: 보일 칩(공고 탭은 지역·공급 유형·월 임대료·나이, 정책 탭은 지역·나이·대상, v2-s3b-pc) */
type Props = { condition: PolicyCondition; chips: Chips; fields: readonly ChipKey[]; typeCounts?: Record<string, number>; targetCounts?: Record<TargetGroup, number> };

const FIXED_KEY = "homefit:condition-fixed";
const FIXED_TIP = "켜면 여기서 바꾼 조건이 설정의 공고/정책 조건에도 저장돼요. 끄면 지금 잠깐 확인할 때만 쓰고, 이 탭을 나갔다 다시 들어오면 저장된 조건으로 돌아와요.";
const LABELS: Record<ChipKey, string> = { region: "지역", types: "공급 유형", rent: "월 임대료", age: "나이", targets: "대상" };

// 조건 고정은 이 기기의 편의 설정이라 브라우저에 둔다(기본 켜짐, 저장소를 못 쓰면 켜짐)
const fixedListeners = new Set<() => void>();
function readFixed(): boolean {
  try { return window.localStorage.getItem(FIXED_KEY) !== "off"; } catch { return true; }
}
function writeFixed(on: boolean) {
  try { window.localStorage.setItem(FIXED_KEY, on ? "on" : "off"); } catch { /* 저장 못 해도 이번 화면에서는 바뀐다 */ }
  fixedListeners.forEach((listener) => listener());
}
function useFixed(): boolean {
  return useSyncExternalStore((cb) => { fixedListeners.add(cb); return () => fixedListeners.delete(cb); }, readFixed, () => true);
}

/** 저장된 조건 + 바꾼 칸 → 조건 저장 폼 값 */
function toFormData(condition: PolicyCondition, patch: ConditionOverride): FormData {
  const form = new FormData();
  form.set("sidoCode", patch.sido ?? condition.sidoCode);
  form.set("sigunguCode", patch.sgg ?? (patch.sido && patch.sido !== condition.sidoCode ? "" : condition.sigunguCode ?? ""));
  (patch.types !== undefined ? patch.types.split(",") : condition.supplyTypes).forEach((type) => form.append("supplyTypes", type));
  (patch.targets !== undefined ? patch.targets.split(",").filter(Boolean) : condition.targetGroups).forEach((group) => form.append("targetGroups", group));
  form.set("maxMonthlyRent", patch.rent ?? (condition.maxMonthlyRent === null ? "" : String(condition.maxMonthlyRent)));
  form.set("age", patch.age ?? (condition.age === null ? "" : String(condition.age)));
  return form;
}

function Switch({ on, onChange, small }: { on: boolean; onChange?: () => void; small?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label="조건 고정" className={`${styles.switch} ${small ? styles.switchSmall : ""} ${on ? styles.switchOn : ""}`} onClick={onChange} disabled={!onChange}>
      <span className={styles.knob} />
    </button>
  );
}

function RegionForm({ condition, onApply }: { condition: PolicyCondition; onApply: (p: ConditionOverride) => void }) {
  const [sido, setSido] = useState(condition.sidoCode);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onApply({ sido: String(form.get("sidoCode")), sgg: String(form.get("sigunguCode") ?? "") });
  };
  return (
    <form onSubmit={submit} className={styles.popForm}>
      <div className={styles.popField}>
        <label htmlFor="cond-sido" className={styles.popLabel}>시도</label>
        <select id="cond-sido" name="sidoCode" className={styles.popInput} value={sido} onChange={(e) => setSido(e.target.value)}>
          {SIDO_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
        </select>
      </div>
      <SigunguField sidoCode={sido} initial={condition.sigunguCode ?? ""} classes={{ field: styles.popField, label: styles.popLabel, input: styles.popInput, help: styles.popHelp }} />
      <div className={styles.popActions}><span /><button type="submit" className={styles.popSubmit}>이 지역으로 보기</button></div>
    </form>
  );
}

function TypesForm({ condition, typeCounts, onApply }: { condition: PolicyCondition; typeCounts: Record<string, number>; onApply: (p: ConditionOverride) => void }) {
  const [picked, setPicked] = useState<string[]>(condition.supplyTypes.includes(ALL_SUPPLY_TYPES) ? [] : [...condition.supplyTypes]);
  const toggle = (type: string) => setPicked((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  const total = (picked.length === 0 ? SUPPLY_TYPES : picked).reduce((sum, type) => sum + (typeCounts[type] ?? 0), 0);
  return (
    <div className={styles.popForm}>
      <div className={styles.popHead}>
        <span className={styles.popTitle}>공급 유형</span>
        <span className={styles.popMeta}>{picked.length === 0 ? "전체" : `${picked.length}개 선택`}</span>
      </div>
      <p className={styles.popHelp}>여러 개 고를 수 있어요. 고르면 아래 버튼의 공고 수가 바로 바뀌어요.</p>
      <div className={styles.checkList}>
        {SUPPLY_TYPES.map((type) => {
          const on = picked.includes(type);
          return (
            <button key={type} type="button" role="checkbox" aria-checked={on} className={`${styles.checkRow} ${on ? styles.checkOn : ""}`} onClick={() => toggle(type)}>
              <span className={styles.checkBox} aria-hidden="true">{on ? <Icon name="tick" size={16} /> : null}</span>
              <span className={styles.checkName}>{type}</span>
              <span className={styles.checkCount}>{typeCounts[type] ?? 0}건</span>
            </button>
          );
        })}
      </div>
      <div className={styles.popActions}>
        <button type="button" className={styles.textButton} onClick={() => setPicked([])}>선택 지우기</button>
        <button type="button" className={styles.popSubmit} onClick={() => onApply({ types: picked.length === 0 ? ALL_SUPPLY_TYPES : picked.join(",") })}>공고 {total}건 보기</button>
      </div>
    </div>
  );
}

function TargetsForm({ condition, counts, onApply }: { condition: PolicyCondition; counts: Record<TargetGroup, number>; onApply: (p: ConditionOverride) => void }) {
  const [picked, setPicked] = useState<TargetGroup[]>([...condition.targetGroups]);
  const toggle = (group: TargetGroup) => setPicked((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  return (
    <div className={styles.popForm}>
      <div className={styles.popHead}>
        <span className={styles.popTitle}>대상</span>
        <span className={styles.popMeta}>{picked.length === 0 ? "모두" : `${picked.length}개 선택`}</span>
      </div>
      <p className={styles.popHelp}>여러 개 고를 수 있어요. 정책 글에 그 대상 낱말이 있는 것만 보여요(자격 판정이 아니에요).</p>
      <div className={styles.checkList}>
        {TARGET_GROUPS.map((group) => {
          const on = picked.includes(group);
          return (
            <button key={group} type="button" role="checkbox" aria-checked={on} className={`${styles.checkRow} ${on ? styles.checkOn : ""}`} onClick={() => toggle(group)}>
              <span className={styles.checkBox} aria-hidden="true">{on ? <Icon name="tick" size={16} /> : null}</span>
              <span className={styles.checkName}>{TARGET_LABELS[group]}</span>
              <span className={styles.checkCount}>{counts[group]}건</span>
            </button>
          );
        })}
      </div>
      <div className={styles.popActions}>
        <button type="button" className={styles.textButton} onClick={() => setPicked([])}>선택 지우기</button>
        <button type="button" className={styles.popSubmit} onClick={() => onApply({ targets: picked.join(",") })}>이 대상으로 보기</button>
      </div>
    </div>
  );
}

function NumberForm({ name, label, unit, help, initial, onApply }: { name: "rent" | "age"; label: string; unit: string; help: string; initial: string; onApply: (p: ConditionOverride) => void }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get(name) ?? "").trim();
    // 월 임대료는 만 원 단위로 받아 원으로 바꾼다
    onApply({ [name]: raw === "" ? "" : name === "rent" ? String(Math.round(Number(raw) * 10_000)) : raw });
  };
  return (
    <form onSubmit={submit} className={styles.popForm}>
      <div className={styles.popField}>
        <label htmlFor={`cond-${name}`} className={styles.popLabel}>{label}</label>
        <span className={styles.unitBox}>
          <input id={`cond-${name}`} name={name} className={styles.popInput} inputMode="numeric" defaultValue={initial} autoComplete="off" aria-describedby={`cond-${name}-help`} />
          <span className={styles.unit} aria-hidden="true">{unit}</span>
        </span>
        <p id={`cond-${name}-help`} className={styles.popHelp}>{help}</p>
      </div>
      <div className={styles.popActions}><span /><button type="submit" className={styles.popSubmit}>이 조건으로 보기</button></div>
    </form>
  );
}

/** 칩 하나 + 펼친 칸. Esc·바깥 누르면 닫힘, 닫으면 초점이 칩으로 */
function Chip({ id, label, value, open, onToggle, children }: { id: ChipKey; label: string; value: string; open: boolean; onToggle: (key: ChipKey | null) => void; children: ReactNode }) {
  const box = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { onToggle(null); button.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) onToggle(null); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open, onToggle]);
  return (
    <span ref={box} className={styles.chipBox}>
      <button ref={button} type="button" className={`${styles.chip} ${open ? styles.chipOpen : ""}`} aria-expanded={open} aria-controls={`cond-pop-${id}`} onClick={() => onToggle(open ? null : id)}>
        <span className={styles.chipText}><span className={styles.chipLabel}>{label}</span><b className={styles.chipValue}>{value}</b></span>
        <Icon name="chevron-down" size={18} />
      </button>
      {open ? <div id={`cond-pop-${id}`} role="dialog" aria-label={`${label} 조건`} className={styles.pop}>{children}</div> : null}
    </span>
  );
}

export function ConditionBar({ condition, chips, fields, typeCounts = {}, targetCounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fixed = useFixed();
  const [expanded, setExpanded] = useState(true);
  const [openChip, setOpenChip] = useState<ChipKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async (patch: ConditionOverride) => {
    setOpenChip(null);
    setError(null);
    if (!fixed) {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([key, value]) => next.set(key, value ?? ""));
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
      return;
    }
    setBusy(true);
    const result = await saveConditions({}, toFormData(condition, patch));
    setBusy(false);
    if (result.error || result.errors) { setError(result.error ?? Object.values(result.errors ?? {})[0] ?? "조건을 저장하지 못했습니다."); return; }
    router.replace(pathname, { scroll: false });
    router.refresh();
  };

  const popover = (key: ChipKey): ReactNode => {
    if (key === "region") return <RegionForm condition={condition} onApply={apply} />;
    if (key === "types") return <TypesForm condition={condition} typeCounts={typeCounts} onApply={apply} />;
    if (key === "targets") return <TargetsForm condition={condition} counts={targetCounts ?? { youth: 0, newlywed: 0, multichild: 0, elderly: 0 }} onApply={apply} />;
    if (key === "rent") return <NumberForm name="rent" label="월 임대료 상한" unit="만 원 이하" help="비우면 임대료로 거르지 않아요." initial={condition.maxMonthlyRent === null ? "" : String(condition.maxMonthlyRent / 10_000)} onApply={apply} />;
    return <NumberForm name="age" label="만 나이" unit="세" help="청년 정책을 고를 때 써요. 공고 자격은 판정하지 않아요." initial={condition.age === null ? "" : String(condition.age)} onApply={apply} />;
  };
  const summary = fields.map((key) => chips[key]).join(", ");
  const fixedRow = (
    <span className={styles.fixedRow}>
      <Switch on={fixed} onChange={() => writeFixed(!fixed)} />
      <span className={styles.fixedLabel}>조건 고정</span>
      <span className={styles.tip} role="img" aria-label={FIXED_TIP} title={FIXED_TIP} tabIndex={0}>i</span>
    </span>
  );
  return (
    <section className={styles.condition} aria-label="내 조건" aria-busy={busy}>
      <div className={styles.conditionHead}>
        <button type="button" className={styles.conditionToggle} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          내 조건<span className={expanded ? styles.chevUp : undefined}><Icon name="chevron-down" /></span>
        </button>
        {expanded ? <span className={styles.fixedPc}>{fixedRow}</span> : (
          <>
            <span className={styles.summary}>{summary}</span>
            <span className={styles.fixedMini}><Switch on={fixed} small />조건 고정</span>
          </>
        )}
      </div>
      {expanded ? (
        <>
          <div className={styles.chips}>
            {fields.map((key) => (
              <Chip key={key} id={key} label={LABELS[key]} value={chips[key]} open={openChip === key} onToggle={setOpenChip}>{popover(key)}</Chip>
            ))}
            <button type="button" className={styles.reset} onClick={() => router.push(pathname, { scroll: false })} disabled={params.toString() === ""}>조건 초기화</button>
          </div>
          <span className={styles.fixedPhone}>{fixedRow}</span>
        </>
      ) : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    </section>
  );
}
