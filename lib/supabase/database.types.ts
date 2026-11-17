// Supabase가 만든 DB 타입(2026-11-17, 마이그레이션 0001~0003 기준)을 짧게 옮긴 것.
// 표를 바꾸면 Supabase 도구의 "generate TypeScript types"로 다시 만들어 이 파일을 바꾼다.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

type ProfileRow = { id: string; role: string; display_name: string | null; created_at: string };

type PolicyConditionRow = {
  user_id: string; sido_code: string; sigungu_code: string | null; supply_types: string[];
  max_monthly_rent: number | null; age: number | null; created_by: string; updated_at: string;
};

type SourceRow = { code: string; name: string; schedule: string; enabled: boolean };

type RunRow = {
  id: string; source_code: string; trigger: string; triggered_by: string | null; status: string;
  error_message: string | null; started_at: string; finished_at: string | null;
};

type RunStepRow = {
  id: string; run_id: string; step_order: number; step_name: string; status: string;
  items_in: number | null; items_out: number | null; detail: Json | null;
  started_at: string | null; finished_at: string | null;
};

type SourceItemRow = {
  id: string; source_code: string; external_id: string; title: string; sido_code: string | null;
  sigungu_code: string | null; supply_type: string | null; monthly_rent: number | null;
  announced_at: string | null; apply_start: string | null; apply_end: string | null; url: string | null;
  content_hash: string; raw: Json; first_seen_at: string; last_seen_at: string;
};

type ObservationRow = {
  id: string; run_id: string; source_code: string; observed_at: string; target: string; metric: string;
  value_numeric: number | null; value_text: string | null; change_amount: number | null;
  source_item_id: string | null; raw: Json | null; is_simulated: boolean;
};

type IncidentRow = {
  id: string; user_id: string; incident_type: string; target_kind: string; target_id: string | null;
  source_item_id: string | null; run_id: string; dedup_key: string; status: string; facts: Json;
  is_updated: boolean; is_simulated: boolean; detected_at: string; first_viewed_at: string | null;
  closed_at: string | null;
};

type ResponsePlanRow = {
  id: string; incident_id: string; plan_type: string; ai_summary: string | null; checklist: Json;
  citations: Json; generation_status: string; model: string | null; created_at: string;
};

type IncidentActionRow = {
  id: string; incident_id: string; actor_id: string; action: string; reason: string | null; created_at: string;
};

type ScheduleItemRow = {
  id: string; user_id: string; response_plan_id: string; incident_id: string; title: string;
  due_date: string | null; checklist_state: Json; created_at: string; updated_at: string;
};

// 기본값이 있는 칸은 넣을 때 빼도 된다
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Optional<ProfileRow, "role" | "display_name" | "created_at">>;
      policy_conditions: Table<
        PolicyConditionRow,
        Optional<PolicyConditionRow, "sigungu_code" | "supply_types" | "max_monthly_rent" | "age" | "updated_at">
      >;
      sources: Table<SourceRow, Optional<SourceRow, "enabled">>;
      runs: Table<RunRow, Optional<RunRow, "id" | "triggered_by" | "status" | "error_message" | "started_at" | "finished_at">>;
      run_steps: Table<
        RunStepRow,
        Optional<RunStepRow, "id" | "items_in" | "items_out" | "detail" | "started_at" | "finished_at">
      >;
      source_items: Table<
        SourceItemRow,
        Optional<
          SourceItemRow,
          | "id" | "sido_code" | "sigungu_code" | "supply_type" | "monthly_rent" | "announced_at"
          | "apply_start" | "apply_end" | "url" | "first_seen_at" | "last_seen_at"
        >
      >;
      observations: Table<
        ObservationRow,
        Optional<
          ObservationRow,
          "id" | "value_numeric" | "value_text" | "change_amount" | "source_item_id" | "raw" | "is_simulated"
        >
      >;
      incidents: Table<
        IncidentRow,
        Optional<
          IncidentRow,
          | "id" | "target_id" | "source_item_id" | "status" | "is_updated" | "is_simulated"
          | "detected_at" | "first_viewed_at" | "closed_at"
        >
      >;
      response_plans: Table<
        ResponsePlanRow,
        Optional<ResponsePlanRow, "id" | "ai_summary" | "citations" | "model" | "created_at">
      >;
      incident_actions: Table<IncidentActionRow, Optional<IncidentActionRow, "id" | "reason" | "created_at">>;
      schedule_items: Table<
        ScheduleItemRow,
        Optional<ScheduleItemRow, "id" | "due_date" | "created_at" | "updated_at">
      >;
    };
    Views: Record<never, never>;
    Functions: {
      approve_incident: { Args: { p_incident_id: string }; Returns: string };
      collection_status: {
        Args: { p_source: string };
        Returns: { last_status: string | null; last_finished_at: string | null; last_success_at: string | null }[];
      };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      mark_incident_viewed: { Args: { p_incident_id: string }; Returns: undefined };
      reject_incident: { Args: { p_incident_id: string; p_reason: string }; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
