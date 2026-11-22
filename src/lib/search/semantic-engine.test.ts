import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/navigation/routes";
import { getSearchScreensForProfile } from "@/lib/search/screen-catalog";
import {
  damerauLevenshtein,
  normalizeSearchText,
  scoreSearchCandidate,
  searchScreenCatalog,
} from "@/lib/search/semantic-engine";

describe("semantic-engine", () => {
  it("normalizes accents, punctuation and case in PT-BR", () => {
    expect(normalizeSearchText("Frequência & Regularidade — PAR-Q!")).toBe(
      "frequencia regularidade par q"
    );
  });

  it("computes bounded Damerau-Levenshtein distance including transpositions", () => {
    expect(damerauLevenshtein("financeiro", "finnceiro")).toBe(1);
    expect(damerauLevenshtein("carteirinha", "carteirina")).toBe(1);
    expect(damerauLevenshtein("contrato", "cotnrato")).toBe(1);
    expect(damerauLevenshtein("abc", "xyzdef", 2)).toBe(3);
  });

  it("finds screens by domain synonyms and intent phrases", () => {
    const adminScreens = getSearchScreensForProfile({ role: "admin", capabilities: ["admin"] });
    const studentScreens = getSearchScreensForProfile({ role: "adult_student", capabilities: ["student"] });

    expect(searchScreenCatalog(adminScreens, "boleto")[0]?.href).toBe(ROUTES.adminBilling);
    expect(searchScreenCatalog(adminScreens, "aluno sumido")[0]?.href).toBe(ROUTES.adminRetention);
    expect(searchScreenCatalog(adminScreens, "troca de faixa").map((r) => r.href)).toContain(
      ROUTES.adminExams
    );
    expect(searchScreenCatalog(studentScreens, "atestado medico")[0]?.href).toBe(ROUTES.studentParq);
    expect(searchScreenCatalog(studentScreens, "quero pagar mensalidade")[0]?.href).toBe(
      ROUTES.studentBilling
    );
  });

  it("tolerates typos via fuzzy matching", () => {
    const adminScreens = getSearchScreensForProfile({ role: "admin", capabilities: ["admin"] });
    const studentScreens = getSearchScreensForProfile({ role: "adult_student", capabilities: ["student"] });

    expect(searchScreenCatalog(adminScreens, "finnceiro")[0]?.href).toBe(ROUTES.adminBilling);
    expect(searchScreenCatalog(studentScreens, "carteirina")[0]?.href).toBe(ROUTES.studentCard);
  });

  it("does not produce false-positive fuzzy matches for 4- or 5-letter unrelated queries", () => {
    const adminScreens = getSearchScreensForProfile({ role: "admin", capabilities: ["admin"] });
    expect(searchScreenCatalog(adminScreens, "lucas")).toEqual([]);
    expect(searchScreenCatalog(adminScreens, "xyzw")).toEqual([]);
    expect(
      scoreSearchCandidate(
        { title: "Alice Coimbra", subtitle: "Juvenil tarde", keywords: ["aluno", "Ativo"] },
        "lucas"
      )
    ).toBe(0);
  });

  it("narrows multi-word queries so unrelated terms do not match", () => {
    const score = scoreSearchCandidate(
      { title: "Financeiro · Cobranças", keywords: ["boleto", "pix"] },
      "boleto xyznaoexiste"
    );
    expect(score).toBe(0);
  });

  it("returns default suggestions when query is empty", () => {
    const adminScreens = getSearchScreensForProfile({ role: "admin", capabilities: ["admin"] });
    const defaults = searchScreenCatalog(adminScreens, "", 5);
    expect(defaults).toHaveLength(5);
    expect(defaults.every((item) => item.kind === "screen")).toBe(true);
  });
});
