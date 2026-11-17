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
    expect(items.find((item) => item.href === ROUTES.adminSystem)).toMatchObject({ group: "Gestão", icon: "system" });
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

  it("keeps every destination reachable without duplicates in each profile", () => {
    const flatten = (items: ReturnType<typeof navigationForProfile>) => items.flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);
    const expected = {
      admin: [ROUTES.admin, ROUTES.notifications, ROUTES.adminEnrollments, ROUTES.adminStudentAccess, ROUTES.adminClasses, ROUTES.adminExams, ROUTES.adminBilling, ROUTES.adminBillingSettings, ROUTES.adminContracts, ROUTES.adminContractTemplate, ROUTES.adminCancellations, ROUTES.adminSystem],
      guardian: [ROUTES.guardian, ROUTES.notifications, ROUTES.guardianDependents],
      minor_student: [ROUTES.student, ROUTES.notifications, ROUTES.studentAttendance, ROUTES.studentExams, ROUTES.studentEnrollment, ROUTES.studentContracts],
      adult_student: [ROUTES.student, ROUTES.notifications, ROUTES.studentAttendance, ROUTES.studentExams, ROUTES.studentEnrollment, ROUTES.studentContracts, ROUTES.studentBilling]
    } as const;
    for (const [role, hrefs] of Object.entries(expected)) {
      const items = navigationForProfile({ role: role as keyof typeof expected, capabilities: [] });
      expect(new Set(flatten(items))).toEqual(new Set(hrefs));
      const topLevel = items.map((item) => item.href);
      expect(new Set(topLevel).size).toBe(topLevel.length);
    }
  });

  it("marks at most two short bottom-bar shortcuts per profile", () => {
    const cases = [
      { role: "admin", capabilities: ["admin"], labels: ["Turmas", "Financeiro"] },
      { role: "guardian", capabilities: ["guardian"], labels: ["Dependentes"] },
      { role: "minor_student", capabilities: [], labels: ["Frequência", "Exames"] },
      { role: "adult_student", capabilities: ["guardian"], labels: ["Frequência", "Financeiro"] }
    ] as const;
    for (const { role, capabilities, labels } of cases) {
      const shortcuts = navigationForProfile({ role, capabilities: [...capabilities] }).filter((item) => item.bottomNav);
      expect(shortcuts.map((item) => item.shortLabel ?? item.label)).toEqual(labels);
      for (const label of labels) expect(label.length).toBeLessThanOrEqual(11);
    }
  });
});
