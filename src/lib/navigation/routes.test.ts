import { describe, expect, it } from "vitest";
import { guardianExamsPath, navigationForProfile, ROUTES } from "@/lib/navigation/routes";

describe("navigationForProfile", () => {
  it("builds the admin hierarchy with server-provided counts", () => {
    const items = navigationForProfile({ role: "admin", capabilities: ["admin"] }, { enrollments: 4, notifications: 2 });
    expect(items.find((item) => item.href === ROUTES.adminEnrollments)?.badge).toBe(4);
    expect(items.find((item) => item.href === ROUTES.notifications)?.icon).toBe("notifications");
    expect(items.find((item) => item.href === ROUTES.notifications)?.badge).toBe(2);
    expect(items.find((item) => item.href === ROUTES.adminContracts)?.children?.map((item) => item.href)).toEqual([
      ROUTES.adminContracts,
      ROUTES.adminContractTemplate,
      ROUTES.adminCancellations,
    ]);
    expect(items.find((item) => item.href === ROUTES.adminSystem)).toMatchObject({ group: "Sistema", icon: "system" });
  });

  it("keeps financial links away from minors and adds dependents only for guardians", () => {
    const minor = navigationForProfile({ role: "minor_student", capabilities: [] });
    expect(minor.some((item) => item.href === ROUTES.studentBilling)).toBe(false);
    expect(minor.some((item) => item.href === ROUTES.notifications)).toBe(true);
    const adultGuardian = navigationForProfile({ role: "adult_student", capabilities: ["guardian"] });
    expect(adultGuardian.some((item) => item.href === ROUTES.guardianDependents)).toBe(true);
  });

  it("gives every student, minor or adult, a link to their exams", () => {
    for (const role of ["minor_student", "adult_student"] as const) {
      const exams = navigationForProfile({ role, capabilities: ["student"] }).find((item) => item.href === ROUTES.studentExams);
      expect(exams).toMatchObject({ icon: "exams", group: "Treino" });
    }
    expect(guardianExamsPath("minor 1")).toBe("/responsavel/dependentes/minor%201/exames");
  });
});
