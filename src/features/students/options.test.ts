import { describe, expect, it } from "vitest";
import {
  calculateDefaultContractDates,
  calculateNextDueDate,
  getBeltTheme,
  getNextGraduation,
} from "@/features/students/options";

describe("options - contract date helpers", () => {
  it("calculates next due date correctly when reference is before due day", () => {
    const reference = new Date(2026, 8, 5); // 05/09/2026
    const nextDue = calculateNextDueDate(10, reference);
    expect(nextDue).toBe("2026-09-10");
  });

  it("calculates next due date correctly when reference is on or after due day", () => {
    const reference = new Date(2026, 8, 26); // 26/09/2026
    const nextDue = calculateNextDueDate(10, reference);
    expect(nextDue).toBe("2026-10-10");
  });

  it("advances year when rolling over December", () => {
    const reference = new Date(2026, 11, 28); // 28/12/2026
    const nextDue = calculateNextDueDate(5, reference);
    expect(nextDue).toBe("2027-01-05");
  });

  it("calculates default 1-year contract dates from start date", () => {
    const dates = calculateDefaultContractDates("2026-09-26", null);
    expect(dates.start).toBe("2026-09-26");
    expect(dates.end).toBe("2027-09-26");
  });

  it("preserves existing end date if provided", () => {
    const dates = calculateDefaultContractDates("2026-09-26", "2026-12-31");
    expect(dates.start).toBe("2026-09-26");
    expect(dates.end).toBe("2026-12-31");
  });
});

describe("options - belt progression & theme helpers", () => {
  it("determines the next graduation correctly across gubs", () => {
    expect(getNextGraduation(10)).toEqual({ targetGub: 9, targetBelt: "Ponta Amarela" });
    expect(getNextGraduation(8)).toEqual({ targetGub: 7, targetBelt: "Ponta Verde" });
    expect(getNextGraduation(2)).toEqual({ targetGub: 1, targetBelt: "Ponta Preta" });
    expect(getNextGraduation(1)).toEqual({ targetGub: 0, targetBelt: "Preta" });
    expect(getNextGraduation(0)).toBeNull();
    expect(getNextGraduation(null)).toBeNull();
  });

  it("returns correct theme for belts", () => {
    const whiteTheme = getBeltTheme("Branca", 10);
    expect(whiteTheme.isBlackBelt).toBe(false);
    expect(whiteTheme.pillClass).toContain("bg-neutral-50");

    const blackTheme = getBeltTheme("Preta", 0);
    expect(blackTheme.isBlackBelt).toBe(true);
    expect(blackTheme.pillClass).toContain("text-amber-300");
  });
});
