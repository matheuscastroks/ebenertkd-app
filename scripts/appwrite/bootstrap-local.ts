import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { ProjectKeyScopes } from "node-appwrite";
import webPush from "web-push";

// This bootstrap never accepts a remote endpoint or production credentials.
const endpoint = "http://localhost:8080/v1";
const credentialsPath = ".local/appwrite/credentials.json";
type Credentials = { email: string; password: string; projectId: string; apiKey?: string };
const credentials: Credentials = existsSync(credentialsPath)
  ? JSON.parse(readFileSync(credentialsPath, "utf8"))
  : { email: "dev@ebenertkd.local", password: randomBytes(24).toString("hex"), projectId: "ebenertkd-local" };
writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
let cookie = "";
async function request(route: string, method = "GET", data?: unknown) {
  const response = await fetch(`${endpoint}${route}`, {
    method, headers: { "content-type": "application/json", "x-appwrite-project": "console", cookie },
    body: data ? JSON.stringify(data) : undefined
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) cookie = cookies.map((item) => item.split(";")[0]).join("; ");
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    const detail = response.status === 400 && /\/(keys|platforms)$/.test(route) ? `: ${result.message}` : "";
    throw new Error(`Bootstrap local: ${method} ${route}: HTTP ${response.status} (${result.type ?? "unknown"})${detail}`);
  }
  return result;
}

async function main() {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${endpoint}/health/version`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) { ready = true; break; }
    } catch { /* The first container start initializes Appwrite's internal schema. */ }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!ready) throw new Error("API local indisponível. Confira npm run appwrite:local:status.");
  try { await request("/account", "POST", { userId: "unique()", email: credentials.email, password: credentials.password, name: "Ebener Dev" }); }
  catch (error) {
    // A root-only instance rejects a second signup before checking account duplication.
    if (!(error instanceof Error) || (!error.message.includes("409") && !error.message.includes("user_console_count_exceeded"))) throw error;
  }
  await request("/account/sessions/email", "POST", { email: credentials.email, password: credentials.password });
  const projects = await request("/projects");
  let project = projects.projects.find((item: { $id: string }) => item.$id === credentials.projectId);
  if (!project) {
    const teams = await request("/teams");
    const team = teams.teams[0] ?? await request("/teams", "POST", { teamId: "ebenertkd-dev", name: "Ebener Local" });
    project = await request("/projects", "POST", { projectId: credentials.projectId, name: "Ebener TKD Local", teamId: team.$id, region: "default" });
  }
  if (!credentials.apiKey) {
    const scopes = Object.values(ProjectKeyScopes).filter((scope) => /^(users|databases|tables|columns|indexes|rows|buckets|files|functions|deployments|executions|sessions)\./.test(scope));
    const key = await request(`/projects/${credentials.projectId}/keys`, "POST", { keyId: "local-development", name: "Local development", scopes });
    credentials.apiKey = key.secret;
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  }
  const platforms = await request(`/projects/${credentials.projectId}/platforms`);
  if (!platforms.platforms.some((item: { hostname: string }) => item.hostname === "localhost")) {
    await request(`/projects/${credentials.projectId}/platforms`, "POST", { platformId: "localhost", type: "web", name: "Localhost", hostname: "localhost" });
  }
  // Keep only test passwords from the previous dev setup; all integration secrets are local or blank.
  const previous = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
  const values = Object.fromEntries(Object.keys(parseEnv(readFileSync(".env.example", "utf8"))).map((key) => [key, ""]));
  const vapid = webPush.generateVAPIDKeys();
  Object.assign(values, {
    APP_ENV: "development", NEXT_PUBLIC_APPWRITE_ENDPOINT: endpoint,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: credentials.projectId, APPWRITE_PROJECT_NAME: "Ebener TKD Local",
    APPWRITE_API_KEY: credentials.apiKey, APPWRITE_DATABASE_ID: "ebenertkd",
    APPWRITE_STORAGE_BUCKET_ID: "private-files", APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: previous.APP_ENV === "development" ? previous.NEXT_PUBLIC_VAPID_PUBLIC_KEY : vapid.publicKey,
    VAPID_PRIVATE_KEY: previous.APP_ENV === "development" ? previous.VAPID_PRIVATE_KEY : vapid.privateKey,
    VAPID_SUBJECT: "mailto:dev@ebenertkd.local", PUSH_SUBSCRIPTION_ENCRYPTION_KEY: previous.APP_ENV === "development" ? previous.PUSH_SUBSCRIPTION_ENCRYPTION_KEY : randomBytes(32).toString("base64"),
    PRODUCTION_APPWRITE_PROJECT_ID: parseEnv(readFileSync(".env", "utf8")).NEXT_PUBLIC_APPWRITE_PROJECT_ID
  });
  for (const role of ["ADMIN", "ADULT", "GUARDIAN", "MINOR"]) {
    values[`TEST_${role}_PASSWORD`] = previous[`TEST_${role}_PASSWORD`] || randomBytes(16).toString("hex");
  }
  writeFileSync(".env.local", "# Appwrite Docker local. Produção está no .env.\n" + Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value ?? "")}`).join("\n") + "\n");
  await request("/account/sessions/current", "DELETE");
  console.log("Projeto Docker e .env.local preparados. Credenciais do console em .local/appwrite/credentials.json.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Bootstrap local falhou."); process.exitCode = 1; });
