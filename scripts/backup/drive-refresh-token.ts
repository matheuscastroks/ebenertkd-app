import { execFile } from "node:child_process";
import { loadProjectEnv } from "../environment/load";
import { buildAuthUrl, createPkce, createState } from "./drive-oauth";
import { exchangeCode, hasDriveFileScope, revokeToken, waitForCode } from "./drive-oauth-flow";

loadProjectEnv();

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

async function createBackupFolder(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json() as { id: string }).id;
}

async function main() {
  const clientId = required("GOOGLE_DRIVE_CLIENT_ID");
  const clientSecret = required("GOOGLE_DRIVE_CLIENT_SECRET");
  const state = createState();
  const pkce = createPkce();
  const { code, redirectUri } = await waitForCode({
    state,
    timeoutMs: TIMEOUT_MS,
    onListening: (uri) => {
      const url = buildAuthUrl({ clientId, redirectUri: uri, state, challenge: pkce.challenge });
      process.stderr.write(`\nAbra esta URL no navegador (tentando abrir automaticamente), entre com a conta Google DEDICADA ao backup e autorize:\n\n${url}\n\nAguardando em ${uri} ...\n`);
      openBrowser(url);
    }
  });
  const tokens = await exchangeCode({ clientId, clientSecret, code, verifier: pkce.verifier, redirectUri });
  if (!hasDriveFileScope(tokens.scope)) {
    await revokeToken(tokens.refresh_token ?? tokens.access_token ?? "");
    throw new Error("A permissão de acesso a arquivos do Drive (drive.file) não foi concedida; o token foi revogado. Rode de novo e deixe a caixa do Drive marcada na tela de consentimento.");
  }
  if (tokens.scope?.split(" ").some((scope) => scope !== "https://www.googleapis.com/auth/drive.file")) {
    await revokeToken(tokens.refresh_token ?? tokens.access_token ?? "");
    throw new Error("Escopos além de drive.file foram concedidos; o token foi revogado por segurança.");
  }
  if (!tokens.refresh_token) {
    throw new Error("O Google não devolveu refresh token. Revogue o acesso do app em myaccount.google.com/permissions e rode de novo.");
  }
  process.stderr.write("\nCopie os valores abaixo para .env.local e para as variáveis da Function backup. Eles não foram gravados em arquivo.\n\n");
  process.stdout.write(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  if (process.argv.includes("--no-folder") || !tokens.access_token) return;
  try {
    process.stdout.write(`GOOGLE_DRIVE_FOLDER_ID=${await createBackupFolder(tokens.access_token)}\n`);
  } catch (cause) {
    process.stderr.write(`\nNão foi possível criar a pasta (${cause instanceof Error ? cause.message : "erro"}). O refresh token acima continua válido. Ative a Drive API no projeto Google Cloud e rode o comando de novo para criar a pasta (ou use --no-folder para ignorar a criação).\n`);
    process.exitCode = 1;
  }
}

main().catch((cause: unknown) => {
  process.stderr.write(`Erro: ${cause instanceof Error ? cause.message : "falha inesperada"}\n`);
  process.exitCode = 1;
});
