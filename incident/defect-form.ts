// spec 019 FR-002 (PRD FR-30): 하자 기록 입력·사진 검사, 저장소 경로. 순수 함수(오늘 날짜는 인자로 받는다)

export const DEFECT_KINDS = { leak: "누수", mold: "곰팡이", breakdown: "고장", other: "기타" } as const;
export type DefectKind = keyof typeof DEFECT_KINDS;

export type DefectInput = { occurredOn: string; kind: string; memo: string };
export type DefectValue = { occurredOn: string; kind: DefectKind; memo: string };
export type DefectField = keyof DefectInput;
export type DefectFormResult = { ok: true; value: DefectValue } | { ok: false; errors: Partial<Record<DefectField, string>> };

const MEMO_MAX = 500;
// 저장소 한도는 5MB지만 Vercel 함수 요청 한도(4.5MB) 때문에 화면에서는 4MB까지(spec 019 E5)
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES: Record<string, "jpg" | "png" | "webp"> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function dateError(occurredOn: string, today: string): string | null {
  if (!isRealDate(occurredOn)) return "생긴 날을 2026-11-19처럼 넣어 주세요.";
  if (occurredOn > today) return `생긴 날은 오늘이나 그 전 날짜로 넣어 주세요. 예: ${today}`;
  return null;
}

function memoError(memo: string): string | null {
  if (memo === "") return "무엇이 어떻게 됐는지 적어 주세요.";
  if (memo.length > MEMO_MAX) return "메모는 500자 안으로 줄여 주세요.";
  return null;
}

/** spec 019 E4. today는 한국 날짜 YYYY-MM-DD */
export function parseDefectForm(input: DefectInput, today: string): DefectFormResult {
  const memo = input.memo.trim();
  const errors: Partial<Record<DefectField, string>> = {};
  const date = dateError(input.occurredOn, today);
  if (date) errors.occurredOn = date;
  if (!(input.kind in DEFECT_KINDS)) errors.kind = "종류를 목록에서 골라 주세요.";
  const memoProblem = memoError(memo);
  if (memoProblem) errors.memo = memoProblem;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { occurredOn: input.occurredOn, kind: input.kind as DefectKind, memo } };
}

export type PhotoCheck = { ok: true; ext: "jpg" | "png" | "webp" | null } | { ok: false; error: string };

/** spec 019 E5. 파일 칸을 비우면 크기 0으로 온다 */
export function checkDefectPhoto(file: { size: number; type: string }): PhotoCheck {
  if (file.size === 0) return { ok: true, ext: null };
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return { ok: false, error: "사진은 jpg·png·webp만 올릴 수 있습니다." };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: "사진은 4MB 안으로 올려 주세요." };
  return { ok: true, ext };
}

/** 저장소 경로. 첫 폴더가 회원 id여야 저장소 규칙이 올리기를 허락한다(ERD v1.11) */
export function defectPhotoPath(userId: string, fileId: string, ext: "jpg" | "png" | "webp"): string {
  return `${userId}/${fileId}.${ext}`;
}
