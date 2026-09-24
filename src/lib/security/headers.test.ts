import { describe, expect, it } from "vitest";
import { securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("bloqueia framing, sniffing e origens não declaradas", () => {
    const headers = Object.fromEntries(securityHeaders(true).map((header) => [header.key, header.value]));
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
  });

  it("não envia HSTS durante desenvolvimento HTTP", () => {
    expect(securityHeaders(false).some((header) => header.key === "Strict-Transport-Security")).toBe(false);
  });
});
