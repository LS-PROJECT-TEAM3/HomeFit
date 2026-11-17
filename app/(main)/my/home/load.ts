import type { WindowType } from "@/incident/condensation";
import type { ContractType, HousingType } from "@/incident/home-form";
import { createClient } from "@/lib/supabase/server";

export type MyHome = {
  id: string; sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number; windowType: WindowType; updatedAt: string;
  contractType: ContractType | null; deposit: number | null; monthlyRent: number | null; maintenanceFee: number | null; contractEndDate: string | null;
};
export type MyMeasurement = { id: string; temperatureC: number; humidityPct: number; measuredAt: string };

const RECENT_MEASUREMENTS = 5;

/** 내 집과 최근 측정값. 없으면 null·빈 목록, 읽기 실패는 던진다(빈 값으로 숨기지 않음) */
export async function loadMyHome(userId: string): Promise<{ home: MyHome | null; measurements: MyMeasurement[] }> {
  const supabase = await createClient();
  const { data: home, error } = await supabase
    .from("homes")
    .select("id, sigungu_code, housing_type, exclusive_area_m2, window_type, updated_at, contract_type, deposit, monthly_rent, maintenance_fee, contract_end_date")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("내 집 정보를 불러오지 못했습니다.");
  if (!home) return { home: null, measurements: [] };

  const { data: rows, error: measurementError } = await supabase
    .from("indoor_measurements")
    .select("id, temperature_c, humidity_pct, measured_at")
    .eq("home_id", home.id)
    .order("measured_at", { ascending: false })
    .limit(RECENT_MEASUREMENTS);
  if (measurementError) throw new Error("측정값을 불러오지 못했습니다.");
  return {
    home: {
      id: home.id, sigunguCode: home.sigungu_code, housingType: home.housing_type as HousingType,
      exclusiveAreaM2: Number(home.exclusive_area_m2), windowType: home.window_type as WindowType, updatedAt: home.updated_at,
      contractType: home.contract_type as ContractType | null, deposit: home.deposit, monthlyRent: home.monthly_rent,
      maintenanceFee: home.maintenance_fee, contractEndDate: home.contract_end_date,
    },
    measurements: (rows ?? []).map((row) => ({
      id: row.id, temperatureC: Number(row.temperature_c), humidityPct: Number(row.humidity_pct), measuredAt: row.measured_at,
    })),
  };
}
