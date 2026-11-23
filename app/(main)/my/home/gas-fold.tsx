"use client";

import { filledStatus, Fold } from "@/app/_components/fold";
import { FieldLabel, UnitBox } from "@/app/_components/form-ui";
import { findTariffRegion, sidoOfSigungu, tariffRegionsFor, type GasFieldsInput } from "@/incident/gas-year";
import styles from "@/app/_components/form.module.css";

// IA MY_030200_TB 내 집 > 도시가스 (spec 025 FR-001·FR-005, PRD FR-28 v1.24): 고지서 한 장(사용량·달). 지역이 여러 개인 도는 요금 지역도.
// 설정 화면에만 둔다(첫 설정은 짧게). 이 칸이 있다는 표시(gasIncluded)가 있어야 서버가 도시가스 값을 바꾼다

/** open: #52 방식 — 설정에서는 접힌 채 열고, 이 묶음에 오류가 있으면 펼친다 */
type Props = { sidoCode: string; values: GasFieldsInput; errors: Partial<Record<"gasUsage" | "gasMonth" | "gasRegion", string>>; open: boolean };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className={styles.fieldError}>{message}</p> : null;
}

export function GasFold({ sidoCode, values, errors, open }: Props) {
  // 기본 정보에서 고른 시도를 바로 따른다. 저장할 때 서버가 다시 검사한다
  const choices = tariffRegionsFor(sidoOfSigungu(sidoCode));
  return (
    <Fold title="도시가스" mark="optional" tip="고지서 한 장으로 12개월 예상 난방비를 보여 드려요(에너지 분석 → 난방비). 겨울 고지서일수록 더 가까워요." status={filledStatus([values.usage, values.month])} open={open}>
      <input type="hidden" name="gasIncluded" value="1" />
      <div className={styles.triple}>
        <div className={styles.field}>
          <FieldLabel htmlFor="gasUsage" label="한 달 사용량" />
          <UnitBox unit="MJ">
            <input id="gasUsage" name="gasUsage" inputMode="numeric" placeholder="예: 2,800" defaultValue={values.usage} className={styles.input}
              aria-invalid={Boolean(errors.gasUsage)} aria-describedby="gasUsage-help gasUsage-error" />
          </UnitBox>
          <p id="gasUsage-help" className={styles.help}>고지서의 사용량(MJ) 칸 숫자. 사용량과 달을 모두 비우면 지워요</p>
          <FieldError id="gasUsage-error" message={errors.gasUsage} />
        </div>
        <div className={styles.field}>
          <FieldLabel htmlFor="gasMonth" label="몇 월 고지서" />
          <select id="gasMonth" name="gasMonth" defaultValue={values.month} className={styles.input} aria-invalid={Boolean(errors.gasMonth)} aria-describedby="gasMonth-error">
            <option value="">고르기</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}월</option>)}
          </select>
          <FieldError id="gasMonth-error" message={errors.gasMonth} />
        </div>
        {choices.length > 1 ? (
          <div className={styles.field}>
            <FieldLabel htmlFor="gasRegion" label="요금 지역" />
            <select id="gasRegion" name="gasRegion" defaultValue={values.region} className={styles.input} aria-invalid={Boolean(errors.gasRegion)} aria-describedby="gasRegion-help gasRegion-error">
              <option value="">고르기</option>
              {/* 1단계 리뷰: 고지서에는 공급사 이름이 있으니 함께 보인다 */}
              {choices.map((name) => <option key={name} value={name}>{name} ({findTariffRegion(name)?.supplier})</option>)}
            </select>
            <p id="gasRegion-help" className={styles.help}>고지서의 공급사와 같은 곳을 골라 주세요</p>
            <FieldError id="gasRegion-error" message={errors.gasRegion} />
          </div>
        ) : <FieldError id="gasRegion-error" message={errors.gasRegion} />}
      </div>
    </Fold>
  );
}
