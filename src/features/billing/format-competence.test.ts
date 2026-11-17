import { expect, it } from "vitest";
import { formatCompetence } from "./format-competence";

it("formata competência válida e sinaliza valores desconhecidos", () => {
  expect(formatCompetence("2026-11")).toBe("nov/2026");
  expect(formatCompetence("2027-01")).toBe("jan/2027");
  expect(formatCompetence("2026-13")).toBe("—");
  expect(formatCompetence("")).toBe("—");
});
