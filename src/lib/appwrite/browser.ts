import { Client } from "appwrite";

// Acessos explícitos permitem que o Next incorpore a configuração pública no bundle.
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim() ?? "";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim() ?? "";

let client: Client | null = null;
let pingPromise: Promise<unknown> | null = null;

function configuredClient() {
  let validEndpoint = false;
  try {
    const url = new URL(endpoint);
    validEndpoint = url.protocol === "https:" || url.protocol === "http:";
  } catch { /* Configuração ausente ou inválida não pode iniciar uma conexão. */ }
  if (!projectId || !validEndpoint) throw new Error("appwrite_browser_configuration_missing");
  client ??= new Client().setEndpoint(endpoint).setProject(projectId);
  return client;
}

export function pingAppwriteOnce() {
  pingPromise ??= Promise.resolve().then(() => configuredClient().ping());
  return pingPromise;
}
