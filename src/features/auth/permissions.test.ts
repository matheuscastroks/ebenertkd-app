import { capabilitiesByRole, hasCapability } from "@/features/auth/permissions";

describe("authorization capabilities", () => {
  it("does not grant administrative access to public account roles", () => {
    expect(capabilitiesByRole.adult_student).toEqual(["student"]);
    expect(capabilitiesByRole.guardian).toEqual(["guardian"]);
    expect(capabilitiesByRole.minor_student).toEqual(["student"]);
    expect(hasCapability(capabilitiesByRole.guardian, "admin")).toBe(false);
  });

  it("supports combined adult capabilities without changing identity", () => {
    expect(hasCapability(["student", "guardian"], "guardian")).toBe(true);
    expect(hasCapability(["student", "guardian"], "student")).toBe(true);
  });
});
