import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { DRIVE_SCOPE, TOKEN_ENDPOINT, parseCallback } from "./drive-oauth";

export const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export type WaitForCodeOptions = {
  state: string;
  timeoutMs: number;
  onListening: (redirectUri: string) => void;
};

// Escuta o redirecionamento loopback. Só encerra com código válido, erro explícito do Google ou timeout;
// requisições com state errado recebem 400 e o servidor continua aguardando.
export function waitForCode({ state, timeoutMs, onListening }: WaitForCodeOptions) {
  return new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    let redirectUri = "";
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      server.closeAllConnections?.();
      action();
    };
    const server = createServer((request, response) => {
      const result = parseCallback(request.url ?? "/", state);
      if (result.kind === "ignore") {
        response.writeHead(404).end();
        return;
      }
      if (result.kind === "invalid") {
        response.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Requisição inválida.");
        return;
      }
      response.writeHead(result.kind === "code" ? 200 : 400, { "content-type": "text/plain; charset=utf-8" });
      response.end(result.kind === "code" ? "Autorização recebida. Pode fechar esta aba e voltar ao terminal." : result.message);
      if (result.kind === "code") finish(() => resolve({ code: result.code, redirectUri }));
      else finish(() => reject(new Error(result.message)));
    });
    const timer = setTimeout(() => finish(() => reject(new Error("Tempo esgotado aguardando a autorização."))), timeoutMs);
    server.on("error", (cause) => finish(() => reject(new Error(`Falha no servidor local: ${cause.message}`))));
    server.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${(server.address() as AddressInfo).port}/callback`;
      onListening(redirectUri);
    });
  });
}

export type TokenResponse = { access_token?: string; refresh_token?: string; scope?: string };

export async function exchangeCode(input: { clientId: string; clientSecret: string; code: string; verifier: string; redirectUri: string }, fetcher: typeof fetch = fetch) {
  const response = await fetcher(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: input.clientId, client_secret: input.clientSecret, code: input.code, code_verifier: input.verifier, grant_type: "authorization_code", redirect_uri: input.redirectUri })
  });
  if (!response.ok) throw new Error(`Google recusou a troca do código (HTTP ${response.status}). Confira o client id/secret e o tipo da credencial.`);
  return await response.json() as TokenResponse;
}

export function hasDriveFileScope(scope: string | undefined) {
  return (scope ?? "").split(" ").includes(DRIVE_SCOPE);
}

export async function revokeToken(token: string, fetcher: typeof fetch = fetch) {
  await fetcher(REVOKE_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ token }) }).catch(() => undefined);
}
