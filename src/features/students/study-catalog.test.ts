import { describe, expect, it } from "vitest";
import {
  BELT_STUDY_MODULES,
  KOREAN_COMMANDS,
  KOREAN_NUMBERS,
  TAEKWONDO_TENETS,
  getStudyModulesForRank,
} from "@/features/students/study-catalog";

describe("study-catalog", () => {
  it("cobre as dez graduações coloridas e o 1º Dan com quizzes íntegros", () => {
    expect(BELT_STUDY_MODULES).toHaveLength(11);
    for (const mod of BELT_STUDY_MODULES) {
      expect(mod.quiz.length).toBeGreaterThanOrEqual(1);
      for (const q of mod.quiz) {
        expect(q.options[q.correctIndex]).toBeTruthy();
      }
    }
    expect(KOREAN_NUMBERS).toHaveLength(10);
    expect(TAEKWONDO_TENETS).toHaveLength(5);
    expect(KOREAN_COMMANDS.length).toBeGreaterThanOrEqual(10);
  });

  it("classifica módulos em revisão (anteriores), atual e prévia (futuros)", () => {
    const modules = getStudyModulesForRank("gub-8");
    expect(modules.find((m) => m.rankKey === "gub-10")?.accessState).toBe("review");
    expect(modules.find((m) => m.rankKey === "gub-9")?.accessState).toBe("review");
    expect(modules.find((m) => m.rankKey === "gub-8")?.accessState).toBe("current");
    expect(modules.find((m) => m.rankKey === "gub-7")?.accessState).toBe("preview");
    expect(modules.find((m) => m.rankKey === "dan-1")?.accessState).toBe("preview");
  });

  it("o conteúdo é amarrado à graduação, não ao nome da faixa", () => {
    expect(BELT_STUDY_MODULES.map((mod) => mod.rankKey)).toEqual(["gub-10", "gub-9", "gub-8", "gub-7", "gub-6", "gub-5", "gub-4", "gub-3", "gub-2", "gub-1", "dan-1"]);
  });

  it("para uma graduação sem módulo próprio (2º Dan) tudo o que veio antes fica em revisão", () => {
    const modules = getStudyModulesForRank("dan-2");
    expect(modules.every((m) => m.accessState === "review")).toBe(true);
  });
});
