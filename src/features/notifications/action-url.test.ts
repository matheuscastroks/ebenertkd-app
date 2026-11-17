import { describe, expect, it } from "vitest";
import { isSafeActionUrl, safeActionUrl } from "./action-url";

describe("notification action url", () => {
  it("accepts internal paths", () => {
    for (const url of ["/avisos", "/aluno/financeiro?x=1#a"]) expect(isSafeActionUrl(url)).toBe(true);
  });

  it("rejects open-redirect and injection shapes", () => {
    for (const url of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "avisos", "/ok\nhttps://x", "/a\r", "/\t/evil.com", ""]) {
      expect(isSafeActionUrl(url), JSON.stringify(url)).toBe(false);
    }
  });

  it("falls back to /avisos", () => {
    expect(safeActionUrl("//evil.com")).toBe("/avisos");
    expect(safeActionUrl(null)).toBe("/avisos");
  });
});
