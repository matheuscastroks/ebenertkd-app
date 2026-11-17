import { createServer } from "node:http";
import { execFile } from "node:child_process";
import type { AddressInfo } from "node:net";
import { loadEnvConfig } from "@next/env";
import { TOKEN_ENDPOINT, buildAuthUrl, createPkce, createState, parseCallback } from "./drive-oauth";

loadEnvConfig(process.cwd());

const TIMEOUT_MS = 5 * 60 * 1000;
const FOLDER_NAME = "EbenerTKD Backups";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} no ambiente ou em .env.local.`);
  return value;
}

function openBrowser(url: string) {
  const [command, args] = process.platform === "win32"
    ? ["rundll32", ["url.dll,FileProtocolHandler", url]] as const
    : process.platform === "darwin" ? ["open", [url]] as const : ["xdg-open", [url]] as const;
  execFile(command, [...args], () => undefined);
}

function waitForCode(state: string) {
  return new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    const server = createServer((request, response) => {
      const result = parseCallback(request.url ?? "/", state);
      if (result.kind === "ignore") {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(result.kind === "code" ? 200 : 400, { "content-type": "text/plain; charset=utf-8" });
      response.end(result.kind === "code" ? "Autorização recebida. Pode fechar esta aba e voltar ao terminal." : result.message);
      clearTimeout(timer);
      server.close();
      if (result.kind === "code") resolve({ code: result.code, redirectUri: `http://127.0.0.1:${port}/callback` });
      else reject(new Error(result.message));
    });
    let port = 0;
    const timer = setTimeout(() => {
      server.close();
      reject(new Error("Tempo esgotado aguardando a autorização (5 minutos)."));
    }, TIMEOUT_MS);
    server.listen(0, "127.0.0.1", () => {
      port = (server.address() as AddressInfo).port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;
      const url = buildAuthUrl({ clientId: required("GOOGLE_DRIVE_CLIENT_ID"), redirectUri, state, challenge: pkce.challenge });
      process.stderr.write(`\nAbra esta URL no navegador (tentando abrir automaticamente), entre com a conta Google DEDICADA ao backup e autorize:\n\n${url}\n\nAguardando em ${redirectUri} ...\n`);
      openBrowser(url);
    });
  });
}

const pkce = createPkce();

async function exchange(code: string, redirectUri: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_DRIVE_CLIENT_ID"),
      client_secret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
      code,
      code_verifier: pkce.verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });
  if (!response.ok) throw new Error(`Google recusou a troca do código (HTTP ${response.status}). Confira o client id/secret e o tipo da credencial.`);
  return await response.json() as { access_token?: string; refresh_token?: string; scope?: string };
}

async function createBackupFolder(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
  });
  if (!response.ok) throw new Error(`Falha ao criar a pasta no Drive (HTTP ${response.status}). A Drive API está ativada no projeto?`);
  return (await response.json() as { id: string }).id;
}

async function main() {
  const state = createState();
  const { code, redirectUri } = await waitForCode(state);
  const tokens = await exchange(code, redirectUri);
  if (!tokens.refresh_token) {
    throw new Error("O Google não devolveu refresh token. Revogue o acesso do app em myaccount.google.com/permissions e rode de novo.");
  }
  if (tokens.scope && tokens.scope.split(" ").some((scope) => scope !== "https://www.googleapis.com/auth/drive.file")) {
    throw new Error("Escopos além de drive.file foram concedidos; abortando por segurança.");
  }
  const folderId = process.argv.includes("--no-folder") || !tokens.access_token ? undefined : await createBackupFolder(tokens.access_token);
  process.stderr.write("\nCopie os valores abaixo para .env.local e para as variáveis da Function backup. Eles não foram gravados em arquivo.\n\n");
  process.stdout.write(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  if (folderId) process.stdout.write(`GOOGLE_DRIVE_FOLDER_ID=${folderId}\n`);
}

main().catch((cause: unknown) => {
  process.stderr.write(`Erro: ${cause instanceof Error ? cause.message : "falha inesperada"}\n`);
  process.exitCode = 1;
});
