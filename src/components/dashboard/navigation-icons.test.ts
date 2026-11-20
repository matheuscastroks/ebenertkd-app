import { describe, expect, it } from "vitest";
import { NAV_ICONS } from "@/lib/navigation/nav-icons";
import { navigationForProfile, type SidebarNavIcon } from "@/lib/navigation/routes";

const icons: SidebarNavIcon[] = ["dashboard", "notifications", "students", "classes", "events", "attendance", "belt", "enrollment", "family", "contracts", "billing", "reports", "settings"];

describe("ícones de navegação", () => {
  it("mapeia todos os tipos de ícone", () => {
    expect(Object.keys(NAV_ICONS).sort()).toEqual([...icons].sort());
    for (const icon of icons) expect(NAV_ICONS[icon]).toBeDefined();
  });

  it("cobre a navegação de todos os perfis", () => {
    for (const role of ["admin", "adult_student", "minor_student", "guardian"] as const) {
      for (const item of navigationForProfile({ role, capabilities: ["guardian"] })) {
        if (item.icon) expect(NAV_ICONS[item.icon]).toBeDefined();
      }
    }
  });
});
