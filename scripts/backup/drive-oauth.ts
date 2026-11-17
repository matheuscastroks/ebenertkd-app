import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const base64Url = (value: Buffer) => value.toString("base64url");

export function createPkce() {
  const verifier = base64Url(randomBytes(48));
  return { verifier, challenge: base64Url(createHash("sha256").update(verifier).digest()) };
}

export function createState() {
  return base64Url(randomBytes(24));
}

export function buildAuthUrl(input: { clientId: string; redirectUri: string; state: string; challenge: string }) {
  const url = new URL(AUTH_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: input.state,
    code_challenge: input.challenge,
    code_challenge_method: "S256"
  }).toString();
  return url.toString();
}

export function statesMatch(received: string | null, expected: string) {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCallback(requestUrl: string, expectedState: string) {
  const url = new URL(requestUrl, "http://127.0.0.1");
  if (url.pathname !== "/callback") return { kind: "ignore" as const };
  if (!statesMatch(url.searchParams.get("state"), expectedState)) return { kind: "invalid" as const, message: "Parâmetro state inválido." };
  const error = url.searchParams.get("error");
  if (error) return { kind: "error" as const, message: `Google recusou a autorização (${error}).` };
  const code = url.searchParams.get("code");
  if (!code) return { kind: "invalid" as const, message: "Resposta sem código de autorização." };
  return { kind: "code" as const, code };
}
