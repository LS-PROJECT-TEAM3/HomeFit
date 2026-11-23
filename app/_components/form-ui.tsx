import type { ReactNode } from "react";
import styles from "./form.module.css";

// spec 022(캔버스 v2-set-home-pc·v2-s1-open-pc, DS TextField·OptionButton): 설정·첫 설정 칸 부품.
// 필수는 빨간 * + 화면 읽기용 "필수", 선택은 흐린 "(선택)". 단위는 칸 안 오른쪽 글자

export function FieldLabel({ htmlFor, label, required, as = "label" }: { htmlFor?: string; label: string; required?: boolean; as?: "label" | "legend" }) {
  const inner = (
    <>
      {label}
      {required ? <><span className={styles.req} aria-hidden="true">*</span><span className={styles.srOnly}>필수</span></> : <span className={styles.optional}>(선택)</span>}
    </>
  );
  return as === "legend" ? <legend className={styles.label}>{inner}</legend> : <label className={styles.label} htmlFor={htmlFor}>{inner}</label>;
}

/** 칸 안 오른쪽 단위(㎡·원·kWh). unit 자리에 고르기(㎡/평)를 넣을 수도 있다 */
export function UnitBox({ unit, children }: { unit: ReactNode; children: ReactNode }) {
  return <span className={styles.unitBox}>{children}<span className={styles.unitText}>{unit}</span></span>;
}

type Option = { value: string; label: string };

/** 고르기 버튼 묶음(라디오, 보드 OptionButton) */
/** fill: 칸 폭을 같은 크기로 나눠 채운다(계약 형태·주택 유형, 3개 이상이면 휴대폰은 2칸). 없으면 글자 폭 버튼을 나란히 */
export function OptionGroup({ name, label, options, value, required, error, help, fill }: { name: string; label: string; options: Option[]; value: string; required?: boolean; error?: string; help?: string; fill?: boolean }) {
  const describedBy = [help ? `${name}-help` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className={`${styles.field} ${styles.optionField}`} aria-describedby={describedBy} data-invalid={error ? "true" : undefined}>
      <FieldLabel label={label} required={required} as="legend" />
      <div className={fill ? `${styles.options} ${options.length > 2 ? styles.optionsWide : ""}` : styles.optionsInline} style={fill ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}>
        {options.map((o) => (
          <label key={o.value} className={styles.option}>
            <input type="radio" name={name} value={o.value} defaultChecked={value === o.value} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {help ? <p id={`${name}-help`} className={styles.help}>{help}</p> : null}
      {error ? <p id={`${name}-error`} className={styles.fieldError}>{error}</p> : null}
    </fieldset>
  );
}
