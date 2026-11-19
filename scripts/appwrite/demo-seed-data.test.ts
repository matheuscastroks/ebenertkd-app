import { describe, expect, it } from "vitest";
import {
  buildChargesTimeline,
  buildDemoScenario,
  demoDueDate,
  demoExamDefinitions,
  demoId,
  monthOffset,
  monthsBetween
} from "./demo-seed-data";

describe("demo seed catalog", () => {
  it("creates stable Appwrite-compatible IDs", () => {
    expect(demoId("student", "adult")).toBe(demoId("student", "adult"));
    expect(demoId("student", "adult")).not.toBe(demoId("student", "minor"));
    expect(demoId("student", "adult")).toHaveLength(36);
  });

  it("moves between calendar months and clamps due dates", () => {
    expect(monthOffset("2026-01-20", -1)).toBe("2025-12");
    expect(monthOffset("2026-12-20", 1)).toBe("2027-01");
    expect(demoDueDate("2028-02", 30)).toBe("2028-02-29T12:00:00.000Z");
  });

  it("calculates sequential monthly intervals between years", () => {
    const list = monthsBetween("2025-10", "2026-03");
    expect(list).toEqual(["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"]);
  });

  it("covers the financial states needed by the dashboard", () => {
    const states = new Set(
      buildDemoScenario("2026-11-18T12:00:00.000Z").flatMap((student) =>
        student.charges.map((charge) => charge.state)
      )
    );
    expect(states).toEqual(new Set(["paid", "overdue", "pending", "proof_under_review"]));
  });

  it("covers all 8 enrollment lifecycle statuses requested", () => {
    const scenarios = buildDemoScenario("2026-11-18T12:00:00.000Z");
    const statuses = new Set(scenarios.map((s) => s.enrollmentStatus));
    expect(statuses).toEqual(
      new Set([
        "draft",
        "submitted",
        "under_review",
        "awaiting_signature",
        "active",
        "paused",
        "cancelled",
        "awaiting_renewal"
      ])
    );
  });

  it("covers all PAR-Q scenarios including expired and health attention flags", () => {
    const scenarios = buildDemoScenario("2026-11-18T12:00:00.000Z");
    const parqScenarios = new Set(scenarios.map((s) => s.parqScenario ?? "missing"));
    expect(parqScenarios).toEqual(
      new Set(["valid", "requires_doctor", "expiring_soon", "expired", "missing"])
    );
  });

  it("covers student attendance patterns for retention evaluation", () => {
    const scenarios = buildDemoScenario("2026-11-18T12:00:00.000Z");
    const patterns = new Set(scenarios.map((s) => s.attendancePattern ?? "none"));
    expect(patterns).toEqual(
      new Set(["exemplary", "regular", "warning", "dropout_risk", "none"])
    );
  });

  it("spans charges and payments across 2025 and 2026", () => {
    const charges = buildChargesTimeline("2025-01", "2026-11-18T12:00:00.000Z");
    const competences = charges.map((c) => c.competence);
    expect(competences).toContain("2025-01");
    expect(competences).toContain("2025-12");
    expect(competences).toContain("2026-01");
    expect(competences).toContain("2026-10");
  });

  it("provides 4 exam events spanning 2025 and 2026 with completed and upcoming states", () => {
    const exams = demoExamDefinitions("2026-11-18T12:00:00.000Z");
    expect(exams).toHaveLength(4);
    expect(exams.filter((e) => e.status === "completed")).toHaveLength(3);
    expect(exams.find((e) => e.status === "confirmed")?.key).toBe("upcoming-exam");
  });
});

describe("demo seed events and sex", () => {
  it("assigns a sex to every demo student", async () => {
    const { demoStudentSex } = await import("./demo-seed-data");
    const scenarios = buildDemoScenario("2026-11-19T12:00:00.000Z");
    expect(scenarios.every((scenario) => ["feminino", "masculino"].includes(demoStudentSex(scenario.fullName)))).toBe(true);
    expect(demoStudentSex("Camila Ferreira")).toBe("feminino");
    expect(demoStudentSex("Rodrigo Silveira")).toBe("masculino");
  });

  it("defines an upcoming championship with the federation schedule and a past one", async () => {
    const { demoChampionshipDefinitions, demoSimpleEventDefinitions } = await import("./demo-seed-data");
    const { upcoming, past } = demoChampionshipDefinitions("2026-11-19T12:00:00.000Z");
    expect(upcoming.deadlines.map((deadline) => deadline.kind)).toEqual(["affiliation", "registration", "category_change", "weigh_in"]);
    expect(upcoming.options.length).toBeGreaterThan(0);
    expect(upcoming.federation_fee_cents).toBeGreaterThan(0);
    expect(past.starts_at < upcoming.starts_at).toBe(true);
    expect(demoSimpleEventDefinitions("2026-11-19T12:00:00.000Z").some((event) => event.event_type === "seminar")).toBe(true);
  });
});
