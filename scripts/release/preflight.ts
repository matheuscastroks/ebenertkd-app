import { loadEnvConfig } from "@next/env";
import { Client, Query, Storage, TablesDB, type Models } from "node-appwrite";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { configurationChecks, isRecentSuccess, storageBelowCritical, type ReleaseCheck } from "../../src/lib/release/preflight-rules";
import { safeErrorMessage } from "../../src/lib/security/safe-error";

loadEnvConfig(process.cwd());

type Row = Models.Row & Record<string, unknown>;
const knownDemoEmails = [
  "ricardo.almeida@ebenertkd.app",
  "camila.ferreira@ebenertkd.app",
  "juliana.mendes@ebenertkd.app",
  "lucas.mendes@minor.ebenertkd.internal",
  "pedro.ferreira@minor.ebenertkd.internal"
];

async function allFilesSize(storage: Storage, bucketId: string) {
  let offset = 0;
  let bytes = 0;
  while (true) {
    const page = await storage.listFiles({ bucketId, queries: [Query.limit(100), Query.offset(offset)] });
    bytes += page.files.reduce((sum, file) => sum + file.sizeOriginal, 0);
    offset += page.files.length;
    if (!page.files.length || offset >= page.total) return bytes;
  }
}

async function main() {
  const checks: ReleaseCheck[] = configurationChecks(process.env);
  const config = readServerAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const tables = new TablesDB(client);
  const storage = new Storage(client);
  const list = async (tableId: string) => (await tables.listRows<Row>({ databaseId: config.databaseId, tableId, queries: [Query.limit(100), Query.orderDesc("$createdAt")] })).rows;
  const [profiles, billing, classes, templates, runs, usedBytes] = await Promise.all([
    list(APPWRITE_IDS.tables.profiles),
    list(APPWRITE_IDS.tables.billingSettings),
    list(APPWRITE_IDS.tables.trainingClasses),
    list(APPWRITE_IDS.tables.contractTemplates),
    list(APPWRITE_IDS.tables.automationRuns),
    allFilesSize(storage, config.bucketId)
  ]);
  const completed = (job: string) => runs.find((row) => row.job === job && row.status === "completed");
  const quota = Number(process.env.APPWRITE_STORAGE_QUOTA_BYTES);
  checks.push(
    { key: "admin", label: "Administrador de recuperação", ok: profiles.some((row) => row.role === "admin" && row.status === "active"), detail: "Perfil administrativo ativo" },
    { key: "demo-users", label: "Contas demonstrativas removidas", ok: !profiles.some((row) => knownDemoEmails.includes(String(row.email))), detail: "Nenhum e-mail conhecido do seed" },
    { key: "billing", label: "Configuração PIX", ok: billing.length > 0, detail: "Chave e beneficiário" },
    { key: "classes", label: "Turma ativa", ok: classes.some((row) => row.status === "active"), detail: "Ao menos uma turma disponível" },
    { key: "contract", label: "Contrato publicado", ok: templates.some((row) => Boolean(row.published_version_id)), detail: "Modelo com versão publicada" },
    { key: "daily-run", label: "Rotina diária recente", ok: isRecentSuccess(String(completed("daily-operations")?.finished_at ?? "") || undefined), detail: "Sucesso nas últimas 24h" },
    { key: "backup-run", label: "Backup recente", ok: isRecentSuccess(String(completed("backup")?.finished_at ?? "") || undefined), detail: "Sucesso nas últimas 24h" },
    { key: "storage", label: "Armazenamento abaixo de 85%", ok: storageBelowCritical(usedBytes, quota), detail: `${usedBytes} de ${Number.isFinite(quota) ? quota : 0} bytes` }
  );

  for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.label} — ${check.detail}`);
  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} verificações aprovadas.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL  Preflight interrompido — ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
