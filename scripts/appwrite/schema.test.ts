import { describe, expect, it } from "vitest";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { bucket, functions, tables } from "./schema";

describe("Appwrite infrastructure schema", () => {
  it("uses stable, unique resource IDs", () => {
    const ids = [
      APPWRITE_IDS.database,
      APPWRITE_IDS.bucket,
      ...Object.values(APPWRITE_IDS.tables),
      ...Object.values(APPWRITE_IDS.functions)
    ];

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(id))).toBe(true);
  });

  it("defines the foundation and authentication tables with required indexes", () => {
    expect(tables.map((table) => table.id)).toEqual([
      "profiles",
      "guardian_student_links",
      "training_classes",
      "class_enrollments",
      "lessons",
      "attendance_records",
      "exam_participants",
      "belt_history",
      "students",
      "enrollments",
      "student_documents",
      "parq_submissions",
      "enrollment_reviews",
      "contract_templates",
      "contract_versions",
      "contracts",
      "contract_signatures",
      "cancellation_requests",
      "charges",
      "payment_proofs",
      "payments",
      "payment_reversals",
      "billing_settings",
      "finance_scenarios",
      "tuition_adjustments",
      "tuition_adjustment_items",
      "notifications",
      "notification_recipients",
      "notification_preferences",
      "push_subscriptions",
      "notification_deliveries",
      "audit_events",
      "automation_runs",
      "academy_settings",
      "academy_policies",
      "academy_config_revisions",
      "belt_rank_settings",
      "training_locations",
      "events",
      "event_deadlines",
      "event_options",
      "event_registrations",
      "event_registration_documents",
      "event_results"
    ]);
    expect(tables.find((table) => table.id === "profiles")?.indexes).toContainEqual({
      key: "account_id_unique",
      type: "unique",
      columns: ["account_id"]
    });
    expect(tables.find((table) => table.id === "guardian_student_links")?.indexes).toContainEqual({
      key: "guardian_student_unique",
      type: "unique",
      columns: ["guardian_profile_id", "student_profile_id"]
    });
    expect(tables.find((table) => table.id === "automation_runs")?.indexes).toContainEqual({
      key: "idempotency_key_unique",
      type: "unique",
      columns: ["idempotency_key"]
    });
    expect(tables.find((table) => table.id === "students")?.indexes).toContainEqual({
      key: "cpf_unique",
      type: "unique",
      columns: ["cpf"]
    });
    expect(tables.find((table) => table.id === "student_documents")?.indexes).toContainEqual({
      key: "student_type_unique",
      type: "unique",
      columns: ["student_id", "document_type"]
    });
    expect(tables.find((table) => table.id === "training_classes")?.indexes).toContainEqual({
      key: "status_idx",
      type: "key",
      columns: ["status"]
    });
    expect(tables.find((table) => table.id === "class_enrollments")?.indexes).toContainEqual({
      key: "class_enrollment_unique",
      type: "unique",
      columns: ["training_class_id", "enrollment_id"]
    });
    expect(tables.find((table) => table.id === "lessons")?.indexes).toContainEqual({
      key: "class_date_time_unique",
      type: "unique",
      columns: ["training_class_id", "lesson_date", "start_time"]
    });
    expect(tables.find((table) => table.id === "attendance_records")?.indexes).toContainEqual({
      key: "lesson_enrollment_unique",
      type: "unique",
      columns: ["lesson_id", "class_enrollment_id"]
    });
    expect(tables.find((table) => table.id === "exam_participants")?.indexes).toContainEqual({
      key: "event_student_unique",
      type: "unique",
      columns: ["event_id", "student_id"]
    });
    expect(tables.find((table) => table.id === "belt_history")?.indexes).toContainEqual({
      key: "participant_unique",
      type: "unique",
      columns: ["exam_participant_id"]
    });
    expect(tables.find((table) => table.id === "contract_signatures")?.indexes).toContainEqual({
      key: "contract_unique",
      type: "unique",
      columns: ["contract_id"]
    });
    expect(tables.find((table) => table.id === "charges")?.indexes).toContainEqual({
      key: "charge_origin_unique",
      type: "unique",
      columns: ["enrollment_id", "charge_type", "competence", "origin_id"]
    });
    expect(tables.find((table) => table.id === "notifications")?.indexes).toContainEqual({
      key: "dedupe_key_unique",
      type: "unique",
      columns: ["dedupe_key"]
    });
    expect(tables.find((table) => table.id === "push_subscriptions")?.indexes).toContainEqual({
      key: "endpoint_hash_unique",
      type: "unique",
      columns: ["endpoint_hash"]
    });
  });

  it("declares academy configuration tables with unique revisions and a mandatory contract snapshot", () => {
    expect(tables.find((table) => table.id === "academy_policies")?.indexes).toContainEqual({ key: "section_unique", type: "unique", columns: ["section"] });
    expect(tables.find((table) => table.id === "academy_config_revisions")?.indexes).toContainEqual({
      key: "scope_section_revision_unique",
      type: "unique",
      columns: ["scope", "section", "revision"]
    });
    const contract = tables.find((table) => table.id === "contracts");
    expect(contract?.columns.find((column) => column.key === "policy_snapshot_json")).toMatchObject({ kind: "text", required: true });
    expect(contract?.columns.map((column) => column.key)).toEqual(expect.arrayContaining(["academy_legal_name", "academy_document"]));
  });

  it("declares belt_rank_settings: one row per rank_key, deny-by-default and audited", () => {
    const table = tables.find((item) => item.id === "belt_rank_settings");
    expect(table?.indexes).toContainEqual({ key: "rank_key_unique", type: "unique", columns: ["rank_key"] });
    const keys = table?.columns.map((column) => column.key) ?? [];
    expect(keys).toEqual(
      expect.arrayContaining(["rank_key", "display_name", "aliases", "color_primary", "color_secondary", "color_style", "form_name", "min_days", "min_presences", "min_age_years", "exam_fee_cents", "enabled", "revision", "updated_by_account_id", "updated_at"])
    );
    expect(table?.columns.find((column) => column.key === "aliases")).toMatchObject({ kind: "varchar", array: true });
    expect(table?.columns.find((column) => column.key === "color_style")).toMatchObject({ kind: "enum", elements: ["solid", "tip", "stripe", "half"] });
    expect(table?.columns.find((column) => column.key === "enabled")).toMatchObject({ kind: "boolean", required: true });
  });

  it("declares training_locations (replaces data/locations.json), deny-by-default with audit columns", () => {
    const table = tables.find((item) => item.id === "training_locations");
    expect(table?.columns.map((column) => column.key)).toEqual(
      expect.arrayContaining(["name", "address", "complement", "notes", "is_default", "status", "updated_by_account_id", "created_at", "updated_at"])
    );
    expect(table?.columns.find((column) => column.key === "status")).toMatchObject({ kind: "enum", elements: ["active", "archived"], required: true });
  });

  it("identifies graduations by rank_key and no longer stores belt labels or the gub integer", () => {
    const columns = (id: string) => tables.find((table) => table.id === id)?.columns.map((column) => column.key) ?? [];
    expect(columns("students")).toContain("rank_key");
    expect(columns("students")).not.toContain("current_belt");
    expect(columns("students")).not.toContain("gub");
    expect(columns("exam_participants")).toContain("target_rank_key");
    expect(columns("exam_participants")).not.toEqual(expect.arrayContaining(["target_belt"]));
    expect(columns("exam_participants")).not.toContain("target_gub");
    expect(columns("belt_history")).toEqual(expect.arrayContaining(["previous_rank_key", "new_rank_key", "previous_belt_name", "new_belt_name"]));
    for (const legacy of ["previous_belt", "previous_gub", "new_belt", "new_gub"]) expect(columns("belt_history")).not.toContain(legacy);
  });

  it("keeps the private bucket within the phase-zero limits", () => {
    expect(bucket.maximumFileSize).toBe(5 * 1024 * 1024);
    expect(bucket.extensions).toEqual(["jpg", "jpeg", "png", "webp", "pdf"]);
  });

  it("defines two daily functions with different schedules", () => {
    expect(functions).toHaveLength(2);
    expect(new Set(functions.map((fn) => fn.schedule)).size).toBe(2);
    expect(functions.every((fn) => fn.schedule.endsWith("* * *"))).toBe(true);
  });
});
