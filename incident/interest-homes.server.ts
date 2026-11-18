import type { HousingType } from "@/incident/home-form";
import type { CostInput } from "@/incident/real-cost";
import { createClient } from "@/lib/supabase/server";

// spec 009 FR-001·005: 내 관심 주택 읽기. 로그인한 사용자 권한(RLS)으로 읽고, 관리자도 내 것만 보도록 user_id로 거른다
export type InterestHome = CostInput & {
  id: string; name: string; sigunguCode: string; housingType: HousingType; exclusiveAreaM2: number | null; deposit: number | null; updatedAt: string;
};

const COLUMNS = "id, name, sigungu_code, housing_type, exclusive_area_m2, deposit, monthly_rent, maintenance_fee, energy_cost, electricity_kwh, transit_fare, trips_per_day, commute_days, updated_at";

type Row = {
  id: string; name: string; sigungu_code: string; housing_type: string; exclusive_area_m2: number | null; deposit: number | null; monthly_rent: number;
  maintenance_fee: number | null; energy_cost: number | null; electricity_kwh: number | null; transit_fare: number | null; trips_per_day: number | null; commute_days: number | null; updated_at: string;
};

function toHome(r: Row): InterestHome {
  return {
    id: r.id, name: r.name, sigunguCode: r.sigungu_code, housingType: r.housing_type as HousingType,
    exclusiveAreaM2: r.exclusive_area_m2 === null ? null : Number(r.exclusive_area_m2), deposit: r.deposit === null ? null : Number(r.deposit),
    monthlyRent: r.monthly_rent, maintenanceFee: r.maintenance_fee, energyCost: r.energy_cost, electricityKwh: r.electricity_kwh,
    transitFare: r.transit_fare, tripsPerDay: r.trips_per_day, commuteDays: r.commute_days, updatedAt: r.updated_at,
  };
}

export async function listMyInterestHomes(userId: string): Promise<InterestHome[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("interest_homes").select(COLUMNS).eq("user_id", userId).order("created_at");
  if (error) throw new Error("관심 주택을 불러오지 못했습니다.");
  return data.map(toHome);
}

export async function getMyInterestHome(userId: string, id: string): Promise<InterestHome | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("interest_homes").select(COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  if (error) throw new Error("관심 주택을 불러오지 못했습니다.");
  return data ? toHome(data) : null;
}
