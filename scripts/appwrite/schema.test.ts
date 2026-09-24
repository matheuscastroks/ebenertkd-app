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
      "students",
      "enrollments",
      "student_documents",
      "enrollment_reviews",
      "contract_templates",
      "contract_versions",
      "contracts",
      "contract_signatures",
      "cancellation_requests",
      "audit_events",
      "automation_runs"
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
    expect(tables.find((table) => table.id === "contract_signatures")?.indexes).toContainEqual({
      key: "contract_unique",
      type: "unique",
      columns: ["contract_id"]
    });
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
