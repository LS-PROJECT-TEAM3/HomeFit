import { describe, expect, it } from "vitest";
import { DEFECT_KINDS, checkDefectPhoto, defectPhotoPath, parseDefectForm } from "@/incident/defect-form";

// spec 019 FR-002, 경계 E4·E5
const today = "2026-11-19";
const good = { occurredOn: "2026-11-10", kind: "leak", memo: "  욕실 천장에서 물이 샘  " };

describe("parseDefectForm (E4)", () => {
  it("맞으면 메모 앞뒤 공백을 지운다", () => {
    expect(parseDefectForm(good, today)).toEqual({ ok: true, value: { occurredOn: "2026-11-10", kind: "leak", memo: "욕실 천장에서 물이 샘" } });
  });
  it("오늘 날짜는 된다", () => {
    expect(parseDefectForm({ ...good, occurredOn: today }, today).ok).toBe(true);
  });
  it("날짜가 없거나 형식이 틀리거나 없는 날이거나 미래면 거절", () => {
    for (const occurredOn of ["", "2026/11/10", "2026-02-30", "2026-11-20"]) {
      const result = parseDefectForm({ ...good, occurredOn }, today);
      expect(result.ok).toBe(false);
    }
    expect(parseDefectForm({ ...good, occurredOn: "2026-11-20" }, today)).toEqual({ ok: false, errors: { occurredOn: "생긴 날은 오늘이나 그 전 날짜로 넣어 주세요. 예: 2026-11-19" } });
  });
  it("종류가 목록에 없으면 거절", () => {
    expect(parseDefectForm({ ...good, kind: "fire" }, today)).toEqual({ ok: false, errors: { kind: "종류를 목록에서 골라 주세요." } });
  });
  it("메모가 비었거나 500자를 넘으면 거절", () => {
    expect(parseDefectForm({ ...good, memo: "   " }, today)).toEqual({ ok: false, errors: { memo: "무엇이 어떻게 됐는지 적어 주세요." } });
    expect(parseDefectForm({ ...good, memo: "가".repeat(501) }, today)).toEqual({ ok: false, errors: { memo: "메모는 500자 안으로 줄여 주세요." } });
  });
  it("종류 이름은 한국어로", () => {
    expect(DEFECT_KINDS).toEqual({ leak: "누수", mold: "곰팡이", breakdown: "고장", other: "기타" });
  });
});

describe("checkDefectPhoto (E5)", () => {
  it("파일이 없으면 사진 없음", () => {
    expect(checkDefectPhoto({ size: 0, type: "" })).toEqual({ ok: true, ext: null });
  });
  it("jpg·png·webp, 4MB까지", () => {
    expect(checkDefectPhoto({ size: 4 * 1024 * 1024, type: "image/jpeg" })).toEqual({ ok: true, ext: "jpg" });
    expect(checkDefectPhoto({ size: 10, type: "image/webp" })).toEqual({ ok: true, ext: "webp" });
  });
  it("4MB를 넘거나 다른 종류면 거절", () => {
    expect(checkDefectPhoto({ size: 4 * 1024 * 1024 + 1, type: "image/png" })).toEqual({ ok: false, error: "사진은 4MB 안으로 올려 주세요." });
    expect(checkDefectPhoto({ size: 10, type: "image/gif" })).toEqual({ ok: false, error: "사진은 jpg·png·webp만 올릴 수 있습니다." });
  });
});

describe("defectPhotoPath", () => {
  it("DB 규칙과 같은 모양 <회원 id>/<uuid>.<확장자>", () => {
    const path = defectPhotoPath("7e257df6-ef16-410f-98bb-4c5cb9590248", "0b0c4f2e-6b1a-4a3e-9d2a-1f2e3d4c5b6a", "png");
    expect(path).toMatch(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/);
  });
});
