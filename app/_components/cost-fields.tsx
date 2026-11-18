import type { CostFieldsInput } from "@/incident/interest-home-form";
import styles from "@/app/_components/form.module.css";

type Errors = Partial<Record<keyof CostFieldsInput, string>>;

function Field({ name, label, value, error, placeholder, help }: { name: keyof CostFieldsInput; label: string; value: string; error?: string; placeholder: string; help?: string }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={name}>{label}</label>
      <input id={name} name={name} inputMode="numeric" placeholder={placeholder} defaultValue={value} className={styles.input}
        aria-invalid={Boolean(error)} aria-describedby={`${name}-help ${name}-error`} />
      {help ? <p id={`${name}-help`} className={styles.help}>{help}</p> : null}
      {error ? <p id={`${name}-error`} className={styles.fieldError}>{error}</p> : null}
    </div>
  );
}

/**
 * spec 009 FR-001·002 (PRD FR-28 v1.10): 에너지비·교통 칸. 내 집과 관심 주택이 같이 쓴다(모두 선택).
 * 에너지비는 직접 입력이 먼저, 없으면 전기 사용량으로 한전 요금표 계산. 교통비 = 편도 × 하루 횟수 × 출근 일수
 */
export function CostFields({ values, errors }: { values: CostFieldsInput; errors: Errors }) {
  return (
    <>
      <p className={styles.help}>넣으면 집 비교에서 월세 + 관리비 + 에너지비 + 교통비로 한 달 비용을 비교합니다. 비운 칸은 &ldquo;미입력&rdquo;으로 표시합니다.</p>
      <Field name="energyCost" label="한 달 에너지비 (원)" value={values.energyCost} error={errors.energyCost} placeholder="예: 50000"
        help="전기·가스 고지서 합계를 알면 넣으세요. 이 값이 있으면 아래 전기 사용량보다 먼저 씁니다." />
      <Field name="electricityKwh" label="한 달 전기 사용량 (kWh)" value={values.electricityKwh} error={errors.electricityKwh} placeholder="예: 180"
        help="에너지비를 모르면 고지서의 사용량만 넣으세요. 한전 주택용 요금표로 계산합니다(부가 요금 제외)." />
      <Field name="transitFare" label="출퇴근 편도 요금 (원)" value={values.transitFare} error={errors.transitFare} placeholder="예: 1500" />
      <div className={styles.inline}>
        <Field name="tripsPerDay" label="하루 탈 횟수" value={values.tripsPerDay} error={errors.tripsPerDay} placeholder="2" />
        <Field name="commuteDays" label="한 달 출근 일수" value={values.commuteDays} error={errors.commuteDays} placeholder="22" />
      </div>
    </>
  );
}

export const EMPTY_COSTS: CostFieldsInput = { energyCost: "", electricityKwh: "", transitFare: "", tripsPerDay: "", commuteDays: "" };

/** 저장된 숫자(또는 null) → 입력 칸 글자 */
export function costInput(saved: { energyCost: number | null; electricityKwh: number | null; transitFare: number | null; tripsPerDay: number | null; commuteDays: number | null } | null): CostFieldsInput {
  if (!saved) return EMPTY_COSTS;
  const str = (v: number | null) => (v === null ? "" : String(v));
  return { energyCost: str(saved.energyCost), electricityKwh: str(saved.electricityKwh), transitFare: str(saved.transitFare), tripsPerDay: str(saved.tripsPerDay), commuteDays: str(saved.commuteDays) };
}

export function readCostForm(formData: FormData): CostFieldsInput {
  const get = (name: string) => String(formData.get(name) ?? "");
  return { energyCost: get("energyCost"), electricityKwh: get("electricityKwh"), transitFare: get("transitFare"), tripsPerDay: get("tripsPerDay"), commuteDays: get("commuteDays") };
}
