import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateBackupKey } from "./generate-backup-key";
import { DRIVE_SCOPE, buildAuthUrl, createPkce, parseCallback } from "./drive-oauth";

describe("chave de backup", () => {
  it("gera 32 bytes aleatórios em base64", () => {
    const key = generateBackupKey();
    expect(Buffer.from(key, "base64")).toHaveLength(32);
    expect(generateBackupKey()).not.toBe(key);
  });
});

describe("fluxo OAuth do Drive", () => {
  it("deriva o desafio PKCE S256 do verificador", () => {
    const { verifier, challenge } = createPkce();
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("pede somente drive.file, acesso offline e consentimento", () => {
    const url = new URL(buildAuthUrl({ clientId: "id", redirectUri: "http://127.0.0.1:1234/callback", state: "s", challenge: "c" }));
    expect(url.searchParams.get("scope")).toBe(DRIVE_SCOPE);
    expect(DRIVE_SCOPE).toBe("https://www.googleapis.com/auth/drive.file");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("valida o state e ignora outros caminhos", () => {
    expect(parseCallback("/callback?code=abc&state=ok", "ok")).toEqual({ kind: "code", code: "abc" });
    expect(parseCallback("/callback?code=abc&state=x", "ok").kind).toBe("error");
    expect(parseCallback("/callback?error=access_denied", "ok").kind).toBe("error");
    expect(parseCallback("/favicon.ico", "ok").kind).toBe("ignore");
  });
});
