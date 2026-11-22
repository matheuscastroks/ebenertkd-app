import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/navigation/routes";
import { getSearchScreensForProfile } from "@/lib/search/screen-catalog";

describe("getSearchScreensForProfile", () => {
  it("never exposes billing or family routes to minor_student", () => {
    const screens = getSearchScreensForProfile({ role: "minor_student", capabilities: ["student"] });
    const hrefs = screens.map((s) => s.href);

    expect(hrefs).toContain(ROUTES.student);
    expect(hrefs).toContain(ROUTES.studentParq);
    expect(hrefs).not.toContain(ROUTES.studentBilling);
    expect(hrefs).not.toContain(ROUTES.guardian);
    expect(hrefs.some((href) => href.startsWith("/admin"))).toBe(false);
  });

  it("includes guardian routes for adult_student only when guardian capability is present", () => {
    const withoutGuardian = getSearchScreensForProfile({
      role: "adult_student",
      capabilities: ["student"],
    });
    expect(withoutGuardian.map((s) => s.href)).toContain(ROUTES.studentBilling);
    expect(withoutGuardian.map((s) => s.href)).not.toContain(ROUTES.guardian);

    const withGuardian = getSearchScreensForProfile({
      role: "adult_student",
      capabilities: ["student", "guardian"],
    });
    expect(withGuardian.map((s) => s.href)).toContain(ROUTES.guardian);
    expect(withGuardian.map((s) => s.href)).toContain(ROUTES.guardianDependents);
  });

  it("keeps guardian away from admin and student routes", () => {
    const screens = getSearchScreensForProfile({ role: "guardian", capabilities: ["guardian"] });
    const hrefs = screens.map((s) => s.href);

    expect(hrefs).toContain(ROUTES.guardian);
    expect(hrefs).toContain(ROUTES.guardianDependents);
    expect(hrefs).toContain(ROUTES.notifications);
    expect(hrefs).toContain(ROUTES.settings);
    expect(hrefs.some((href) => href.startsWith("/admin") || href.startsWith("/aluno"))).toBe(false);
  });

  it("gives admin access to all management screens and segments", () => {
    const screens = getSearchScreensForProfile({ role: "admin", capabilities: ["admin"] });
    const hrefs = screens.map((s) => s.href);

    expect(hrefs).toContain(ROUTES.admin);
    expect(hrefs).toContain(ROUTES.adminRetention);
    expect(hrefs).toContain(ROUTES.adminBillingCalculator);
    expect(hrefs).toContain(ROUTES.adminAcademyGrades);
    expect(hrefs).toContain(ROUTES.adminSystem);
  });

  it("falls back to provided navItems when role is omitted", () => {
    const screens = getSearchScreensForProfile(
      {},
      [
        {
          label: "Financeiro",
          href: "/admin/financeiro",
          icon: "billing",
          segments: [{ label: "Reajuste", href: "/admin/financeiro/reajuste" }],
        },
      ]
    );

    expect(screens.map((s) => s.href)).toEqual([
      "/admin/financeiro",
      "/admin/financeiro/reajuste",
    ]);
  });
});
