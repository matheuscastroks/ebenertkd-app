import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { guardianExamsPath, navigationForProfile, resolveNavLocation, ROUTES, type SidebarNavItem } from "@/lib/navigation/routes";

type Role = "admin" | "guardian" | "minor_student" | "adult_student";
const nav = (role: Role, capabilities: string[] = []) =>
  navigationForProfile({ role, capabilities: capabilities as never }, { enrollments: 4, notifications: 2 });
const sidebar = (items: SidebarNavItem[]) => items.filter((item) => item.icon !== "notifications");

/** Lista as rotas reais (`page.tsx`) de uma área, como padrões com `[param]`. */
function pageRoutes(area: string) {
  const root = join(process.cwd(), "src", "app");
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name === "page.tsx" ? [dir] : []
    );
  return walk(join(root, area)).map((dir) => `/${relative(root, dir).split(sep).join("/")}`);
}
const toPath = (route: string) => route.replace(/\[[^\]]+\]/g, "x");

describe("navigationForProfile (Seção → Segmento → Pilha)", () => {
  it("keeps the sidebar at one level with at most eight sections", () => {
    for (const [role, capabilities] of [["admin", ["admin"]], ["guardian", ["guardian"]], ["minor_student", []], ["adult_student", ["guardian"]]] as const) {
      const items = sidebar(nav(role, [...capabilities]));
      expect(items.length).toBeLessThanOrEqual(8);
      for (const item of items) expect(item).not.toHaveProperty("children");
      const labels = items.map((item) => item.label);
      expect(new Set(labels).size).toBe(labels.length);
      const icons = items.map((item) => item.icon);
      expect(new Set(icons).size).toBe(icons.length);
    }
  });

  it("builds the admin sections with server-provided counts", () => {
    const items = nav("admin", ["admin"]);
    expect(sidebar(items).map((item) => item.label)).toEqual(["Hoje", "Alunos", "Turmas", "Eventos", "Financeiro", "Contratos", "Relatórios", "Ajustes"]);
    expect(items.find((item) => item.label === "Alunos")?.badge).toBe(4);
    expect(items.find((item) => item.icon === "notifications")?.badge).toBe(2);
    expect(items.find((item) => item.label === "Ajustes")?.group).toBe("Rodapé");
    expect(items.find((item) => item.label === "Financeiro")?.segments?.map((segment) => segment.href)).toEqual([
      ROUTES.adminBilling,
      ROUTES.adminBillingClosing,
      ROUTES.adminBillingCalculator,
      ROUTES.adminBillingAdjustment
    ]);
  });

  it("keeps money and family away from minors", () => {
    const labels = sidebar(nav("minor_student")).map((item) => item.label);
    expect(labels).toEqual(["Início", "Treinos", "Faixa", "Eventos", "Cadastro"]);
    expect(sidebar(nav("adult_student", ["guardian"])).map((item) => item.label)).toEqual(["Início", "Treinos", "Faixa", "Eventos", "Cadastro", "Pagamentos", "Família"]);
    expect(sidebar(nav("adult_student")).some((item) => item.label === "Família")).toBe(false);
    expect(guardianExamsPath("minor 1")).toBe("/responsavel/dependentes/minor%201/exames");
  });

  it("marks at most two short bottom-bar shortcuts per profile", () => {
    const cases = [
      { role: "admin", capabilities: ["admin"], labels: ["Turmas", "Financeiro"] },
      { role: "guardian", capabilities: ["guardian"], labels: [] },
      { role: "minor_student", capabilities: [], labels: ["Treinos", "Faixa"] },
      { role: "adult_student", capabilities: ["guardian"], labels: ["Treinos", "Pagamentos"] }
    ] as const;
    for (const { role, capabilities, labels } of cases) {
      const shortcuts = nav(role, [...capabilities]).filter((item) => item.bottomNav);
      expect(shortcuts.map((item) => item.shortLabel ?? item.label)).toEqual(labels);
      for (const label of labels) expect(label.length).toBeLessThanOrEqual(11);
    }
  });

  it("points every section and segment to a real page", () => {
    const routes = new Set([...pageRoutes("admin"), ...pageRoutes("aluno"), ...pageRoutes("responsavel")]);
    for (const role of ["admin", "guardian", "minor_student", "adult_student"] as const) {
      for (const item of sidebar(nav(role, ["guardian"]))) {
        for (const href of [item.href, ...(item.segments ?? []).map((segment) => segment.href)]) {
          expect(routes, `${role}: ${href}`).toContain(href);
        }
      }
    }
  });

  it("never repeats a segment label or href inside a section", () => {
    for (const role of ["admin", "guardian", "minor_student", "adult_student"] as const) {
      for (const item of sidebar(nav(role, ["guardian"]))) {
        const segments = item.segments ?? [];
        expect(new Set(segments.map((segment) => segment.label)).size, `${role}: ${item.label}`).toBe(segments.length);
        expect(new Set(segments.map((segment) => segment.href)).size, `${role}: ${item.label}`).toBe(segments.length);
      }
    }
  });

  it("places every admin and student page in exactly one section", () => {
    const cases: Array<[Role, string]> = [["admin", "admin"], ["adult_student", "aluno"], ["adult_student", "responsavel"], ["guardian", "responsavel"]];
    for (const [role, area] of cases) {
      const items = nav(role, ["guardian"]);
      for (const route of pageRoutes(area)) {
        const { section } = resolveNavLocation(items, toPath(route));
        expect(section, `${role}: ${route}`).toBeDefined();
      }
    }
  });
});

describe("resolveNavLocation", () => {
  const admin = nav("admin", ["admin"]);

  it("picks the longest matching segment", () => {
    const location = resolveNavLocation(admin, ROUTES.adminExamEligibility);
    expect(location.section?.label).toBe("Eventos");
    expect(location.segment?.label).toBe("Aptidão");
    expect(location.isDetail).toBe(false);
  });

  it("treats dynamic routes as stacked detail screens", () => {
    expect(resolveNavLocation(admin, "/admin/eventos/exames/abc")).toMatchObject({ isDetail: true, segment: { label: "Exames de faixa" } });
    expect(resolveNavLocation(admin, "/admin/matriculas/abc")).toMatchObject({ isDetail: true, section: { label: "Alunos" } });
    expect(resolveNavLocation(admin, "/admin/turmas/a/aulas/b")).toMatchObject({ isDetail: true, section: { label: "Turmas" } });
    expect(resolveNavLocation(admin, "/admin/sistema")).toMatchObject({ isDetail: true, section: { label: "Ajustes" } });
  });

  it("matches profile homes only exactly", () => {
    expect(resolveNavLocation(admin, "/admin").section?.label).toBe("Hoje");
    const student = nav("adult_student");
    expect(resolveNavLocation(student, "/aluno").section?.label).toBe("Início");
    expect(resolveNavLocation(student, "/aluno/parq")).toMatchObject({ section: { label: "Cadastro" }, segment: { label: "Saúde" } });
    expect(resolveNavLocation(nav("guardian", ["guardian"]), "/responsavel/dependentes/x/financeiro").section?.label).toBe("Família");
  });
});
