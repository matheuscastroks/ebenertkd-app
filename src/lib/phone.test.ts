import { describe, expect, it } from "vitest";
import { cleanPhoneDigits, formatBrazilianPhone } from "@/lib/phone";

describe("phone utils", () => {
  it("formats 11-digit mobile phones into (XX) 9 XXXX-XXXX format", () => {
    expect(formatBrazilianPhone("21965188988")).toBe("(21) 9 6518-8988");
    expect(formatBrazilianPhone("11988887777")).toBe("(11) 9 8888-7777");
    expect(formatBrazilianPhone("+55 21 96518-8988")).toBe("(21) 9 6518-8988");
    expect(formatBrazilianPhone("(21) 9 6518-8988")).toBe("(21) 9 6518-8988");
  });

  it("formats 10-digit landline phones into (XX) XXXX-XXXX format", () => {
    expect(formatBrazilianPhone("2134567890")).toBe("(21) 3456-7890");
    expect(formatBrazilianPhone("1122334455")).toBe("(11) 2233-4455");
  });

  it("formats partial inputs progressively while typing", () => {
    expect(formatBrazilianPhone("2")).toBe("(2");
    expect(formatBrazilianPhone("21")).toBe("(21");
    expect(formatBrazilianPhone("219")).toBe("(21) 9");
    expect(formatBrazilianPhone("2196")).toBe("(21) 9 6");
    expect(formatBrazilianPhone("2196518")).toBe("(21) 9 6518");
    expect(formatBrazilianPhone("21965188")).toBe("(21) 9 6518-8");
    expect(formatBrazilianPhone("21965188988")).toBe("(21) 9 6518-8988");
  });

  it("handles empty or null values gracefully", () => {
    expect(formatBrazilianPhone("")).toBe("");
    expect(formatBrazilianPhone(null)).toBe("");
    expect(formatBrazilianPhone(undefined)).toBe("");
  });

  it("cleans digits correctly, stripping leading +55 country code", () => {
    expect(cleanPhoneDigits("+55 (21) 9 6518-8988")).toBe("21965188988");
    expect(cleanPhoneDigits("5521965188988")).toBe("21965188988");
    expect(cleanPhoneDigits("21965188988")).toBe("21965188988");
    expect(cleanPhoneDigits("")).toBe("");
  });
});
