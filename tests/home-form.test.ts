import { describe, expect, it } from "vitest";
import { parseHomeForm, parseMeasurementForm } from "@/incident/home-form";

// FR-001, FR-002 (spec 003): 내 집·측정값 입력 검사. 오류 문구는 "무엇이 안 됐는지 + 할 일"
const home = {
  sidoCode: "30", sigunguCode: "30200", housingType: "officetel", exclusiveArea: "20", areaUnit: "m2", windowType: "unknown",
  contractType: "", deposit: "", monthlyRent: "", maintenanceFee: "", contractEndDate: "",
};

describe("parseHomeForm", () => {
  it("네 칸만 넣어도 저장할 값이 된다. 창 '모름' 허용", () => {
    expect(parseHomeForm(home)).toEqual({
      ok: true,
      value: {
        sigunguCode: "30200", housingType: "officetel", exclusiveAreaM2: 20, windowType: "unknown",
        contractType: null, deposit: null, monthlyRent: null, maintenanceFee: null, contractEndDate: null,
      },
    });
  });

  it("면적은 소수와 앞뒤 공백을 읽는다", () => {
    const result = parseHomeForm({ ...home, exclusiveArea: " 25.5 " });
    expect(result.ok && result.value.exclusiveAreaM2).toBe(25.5);
  });

  it("면적 0, 301, 글자는 거부하고 할 일을 알려 준다", () => {
    for (const exclusiveArea of ["0", "301", "스무평", ""]) {
      const result = parseHomeForm({ ...home, exclusiveArea });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.exclusiveArea).toBe("전용면적은 1~300㎡ 사이 숫자로 입력해 주세요. 예: 20");
    }
  });

  it("평으로 넣으면 ㎡로 바꿔 저장한다(1평 = 400/121㎡, 소수 둘째 자리) — 사용자 요청 2026-11-17", () => {
    const result = parseHomeForm({ ...home, exclusiveArea: "10", areaUnit: "pyeong" });
    expect(result.ok && result.value.exclusiveAreaM2).toBe(33.06);
  });

  it("평 범위는 ㎡ 1~300과 같고 문구도 평으로", () => {
    const tooBig = parseHomeForm({ ...home, exclusiveArea: "91", areaUnit: "pyeong" });
    expect(tooBig.ok).toBe(false);
    if (!tooBig.ok) expect(tooBig.errors.exclusiveArea).toBe("전용면적은 0.3~90.7평 사이 숫자로 입력해 주세요. 예: 6");
    expect(parseHomeForm({ ...home, exclusiveArea: "90", areaUnit: "pyeong" }).ok).toBe(true);
  });

  it("모르는 단위는 ㎡로 본다", () => {
    const result = parseHomeForm({ ...home, exclusiveArea: "20", areaUnit: "" });
    expect(result.ok && result.value.exclusiveAreaM2).toBe(20);
  });

  it("면적 1과 300은 허용", () => {
    expect(parseHomeForm({ ...home, exclusiveArea: "1" }).ok).toBe(true);
    expect(parseHomeForm({ ...home, exclusiveArea: "300" }).ok).toBe(true);
  });

  it("시군구가 없거나 시도와 안 맞으면 거부", () => {
    expect(parseHomeForm({ ...home, sigunguCode: "" })).toMatchObject({ ok: false, errors: { sigunguCode: expect.stringContaining("시군구") } });
    expect(parseHomeForm({ ...home, sigunguCode: "11110" })).toMatchObject({ ok: false, errors: { sigunguCode: expect.any(String) } });
  });

  it("시도가 비어 있으면 시군구도 거부(리뷰 4번)", () => {
    expect(parseHomeForm({ ...home, sidoCode: "" })).toMatchObject({ ok: false, errors: { sigunguCode: expect.any(String) } });
  });

  it("주택 유형·창 종류가 목록 밖이면 거부", () => {
    expect(parseHomeForm({ ...home, housingType: "castle" }).ok).toBe(false);
    expect(parseHomeForm({ ...home, windowType: "triple" }).ok).toBe(false);
  });
});

describe("parseMeasurementForm", () => {
  const now = new Date("2026-11-18T09:00:00+09:00");
  const input = { temperature: "22", humidity: "65", measuredAt: "2026-11-18T08:30" };

  it("온도·습도·측정 시각(KST 입력)을 저장할 값으로", () => {
    expect(parseMeasurementForm(input, now)).toEqual({
      ok: true,
      value: { temperatureC: 22, humidityPct: 65, measuredAt: "2026-11-17T23:30:00.000Z" },
    });
  });

  it("온도 -10과 45, 습도 0과 100은 허용", () => {
    expect(parseMeasurementForm({ ...input, temperature: "-10", humidity: "0" }, now).ok).toBe(true);
    expect(parseMeasurementForm({ ...input, temperature: "45", humidity: "100" }, now).ok).toBe(true);
  });

  it("온도 -11·46, 습도 -1·101은 허용 범위를 알려 주며 거부", () => {
    for (const temperature of ["-11", "46", "따뜻"]) {
      const result = parseMeasurementForm({ ...input, temperature }, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.temperature).toBe("실내 온도는 -10~45°C 사이로 입력해 주세요.");
    }
    for (const humidity of ["-1", "101", ""]) {
      const result = parseMeasurementForm({ ...input, humidity }, now);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.humidity).toBe("실내 습도는 0~100% 사이로 입력해 주세요.");
    }
  });

  it("측정 시각이 지금보다 늦거나 형식이 틀리면 거부", () => {
    const future = parseMeasurementForm({ ...input, measuredAt: "2026-11-18T09:01" }, now);
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.measuredAt).toBe("측정 시각은 지금보다 늦을 수 없습니다.");
    const broken = parseMeasurementForm({ ...input, measuredAt: "어제" }, now);
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.errors.measuredAt).toBe("측정 시각 형식이 맞지 않습니다. 2026-11-18 08:30처럼 입력해 주세요.");
  });
});

// spec 003 v0.2 FR-001 수용 기준 6·7: 계약·관리비 칸(선택)
describe("parseHomeForm 계약·관리비", () => {
  const contract = { ...home, contractType: "monthly", deposit: "5,000,000", monthlyRent: "450,000", maintenanceFee: "70000", contractEndDate: "2027-08-31" };

  it("월세 계약 값을 쉼표 없이 숫자로", () => {
    const result = parseHomeForm(contract);
    expect(result.ok && result.value).toMatchObject({ contractType: "monthly", deposit: 5000000, monthlyRent: 450000, maintenanceFee: 70000, contractEndDate: "2027-08-31" });
  });

  it("전세면 월세는 0으로 저장", () => {
    const result = parseHomeForm({ ...contract, contractType: "jeonse", monthlyRent: "300000" });
    expect(result.ok && result.value.monthlyRent).toBe(0);
  });

  it("금액이 음수·글자·10억 원 초과면 거부하고 할 일을 알려 준다", () => {
    for (const [field, value] of [["deposit", "-1"], ["monthlyRent", "사십만"], ["maintenanceFee", "1000000001"]] as const) {
      const result = parseHomeForm({ ...contract, [field]: value });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[field]).toBe("0 이상 숫자로 입력해 주세요. 예: 450000");
    }
  });

  it("만료일 형식이 틀리면 거부, 비우면 null", () => {
    const bad = parseHomeForm({ ...contract, contractEndDate: "내년 여름" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.contractEndDate).toBe("계약 만료일 형식이 맞지 않습니다. 2027-08-31처럼 입력해 주세요.");
    const empty = parseHomeForm({ ...contract, contractEndDate: "" });
    expect(empty.ok && empty.value.contractEndDate).toBeNull();
  });

  it("목록에 없는 계약 형태는 거부", () => {
    expect(parseHomeForm({ ...contract, contractType: "half" }).ok).toBe(false);
  });
});
