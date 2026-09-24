import { describe, expect, it } from "vitest";
import { buildDemoScenario, demoDueDate, demoId, monthOffset } from "./demo-seed-data";

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

  it("covers the financial states needed by the dashboard", () => {
    const states = new Set(buildDemoScenario("2026-09-24").flatMap((student) => student.charges.map((charge) => charge.state)));
    expect(states).toEqual(new Set(["paid", "overdue", "pending", "proof_under_review"]));
  });
});
