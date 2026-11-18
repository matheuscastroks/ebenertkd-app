import { describe, expect, it } from "vitest";
import {
  BELT_STUDY_MODULES,
  KOREAN_COMMANDS,
  KOREAN_NUMBERS,
  TAEKWONDO_TENETS,
  getStudyModulesForGub,
} from "@/features/students/study-catalog";

describe("study-catalog", () => {
  it("cobre todos os 11 níveis do 10º GUB até a Faixa Preta com quizzes íntegros", () => {
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
    const modules = getStudyModulesForGub(8);
    expect(modules.find((m) => m.gub === 10)?.accessState).toBe("review");
    expect(modules.find((m) => m.gub === 9)?.accessState).toBe("review");
    expect(modules.find((m) => m.gub === 8)?.accessState).toBe("current");
    expect(modules.find((m) => m.gub === 7)?.accessState).toBe("preview");
    expect(modules.find((m) => m.gub === 0)?.accessState).toBe("preview");
  });
});
