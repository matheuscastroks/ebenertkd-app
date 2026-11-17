import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { generateBackupKey } from "./generate-backup-key";
import { exchangeCode, hasDriveFileScope, revokeToken, waitForCode } from "./drive-oauth-flow";
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
    expect(parseCallback("/callback?code=abc&state=x", "ok").kind).toBe("invalid");
    expect(parseCallback("/callback?code=abc", "ok").kind).toBe("invalid");
    expect(parseCallback("/callback?error=access_denied&state=ok", "ok").kind).toBe("error");
    expect(parseCallback("/callback?error=access_denied&state=x", "ok").kind).toBe("invalid");
    expect(parseCallback("/favicon.ico", "ok").kind).toBe("ignore");
  });
});

describe("servidor loopback", () => {
  it("responde 400 a state errado e continua até receber o código correto", async () => {
    let base = "";
    const promise = waitForCode({ state: "certo", timeoutMs: 5000, onListening: (uri) => { base = uri; } });
    await vi.waitFor(() => expect(base).not.toBe(""));
    expect((await fetch(`${base}?code=x&state=errado`)).status).toBe(400);
    expect((await fetch(`${base}?code=abc&state=certo`)).status).toBe(200);
    await expect(promise).resolves.toEqual({ code: "abc", redirectUri: base });
  });

  it("encerra com erro explícito do Google", async () => {
    let base = "";
    const promise = waitForCode({ state: "s", timeoutMs: 5000, onListening: (uri) => { base = uri; } });
    const assertion = expect(promise).rejects.toThrow("access_denied");
    await vi.waitFor(() => expect(base).not.toBe(""));
    await fetch(`${base}?error=access_denied&state=s`);
    await assertion;
  });

  it("expira por timeout", async () => {
    await expect(waitForCode({ state: "s", timeoutMs: 50, onListening: () => undefined })).rejects.toThrow("Tempo esgotado");
  });
});

describe("troca de código e escopos", () => {
  it("detecta a falta de drive.file", () => {
    expect(hasDriveFileScope(DRIVE_SCOPE)).toBe(true);
    expect(hasDriveFileScope("openid email")).toBe(false);
    expect(hasDriveFileScope(undefined)).toBe(false);
  });

  it("envia o verificador PKCE e revoga tokens", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ refresh_token: "r" }), { status: 200 }));
    await exchangeCode({ clientId: "i", clientSecret: "s", code: "c", verifier: "v", redirectUri: "http://127.0.0.1:1/callback" }, fetcher as unknown as typeof fetch);
    expect(String((fetcher.mock.calls[0] as unknown[])[1] && ((fetcher.mock.calls[0] as unknown[])[1] as RequestInit).body)).toContain("code_verifier=v");
    await revokeToken("t", fetcher as unknown as typeof fetch);
    expect((fetcher.mock.calls[1] as unknown[])[0]).toBe("https://oauth2.googleapis.com/revoke");
  });
});
