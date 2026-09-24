import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { Client, Query, Storage, TablesDB, Users } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import type { BackupManifest, BackupObjectDescriptor } from "../../src/lib/backup/manifest";
import { tables as schemaTables } from "../appwrite/schema";
import {
  assertEmptyTarget,
  assertManifest,
  assertSafeRestoreTarget,
  assertStorageCapacity,
  decryptAndVerify,
  readBackupKey,
  rowData,
  sha256
} from "./restore-rules";

type DriveFile = {
  id: string;
  name: string;
  size?: string;
  appProperties?: Record<string, string>;
};

type RestoredUser = {
  $id: string;
  email?: string;
  phone?: string;
  name?: string;
  status?: boolean;
  labels?: string[];
  prefs?: Record<string, unknown>;
};

const args = new Map(process.argv.slice(2).map((argument) => {
  const [key, ...parts] = argument.split("=");
  return [key, parts.join("=") || "true"];
}));
const apply = args.has("--apply");
const folderId = args.get("--folder-id") ?? process.env.RESTORE_GOOGLE_DRIVE_FOLDER_ID;
const confirmedProjectId = args.get("--confirm-target");

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório.`);
  return value;
}

async function accessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_DRIVE_CLIENT_ID"),
      client_secret: required("GOOGLE_DRIVE_CLIENT_SECRET"),
      refresh_token: required("GOOGLE_DRIVE_REFRESH_TOKEN"),
      grant_type: "refresh_token"
    })
  });
  if (!response.ok) throw new Error(`Falha ao obter token do Google Drive (${response.status}).`);
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google Drive não retornou um access token.");
  return payload.access_token;
}

async function driveRequest(token: string, url: string) {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Falha no Google Drive (${response.status}): ${(await response.text()).slice(0, 200)}`);
  return response;
}

async function getFolder(token: string, id: string) {
  const fields = encodeURIComponent("id,name,appProperties");
  return driveRequest(token, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${fields}`).then((response) => response.json() as Promise<DriveFile>);
}

async function listFolderFiles(token: string, id: string) {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const query = encodeURIComponent(`'${id.replaceAll("'", "\\'")}' in parents and trashed=false`);
    const fields = encodeURIComponent("nextPageToken,files(id,name,size,appProperties)");
    const page = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const response = await driveRequest(token, `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=1000&spaces=drive${page}`);
    const payload = await response.json() as { files?: DriveFile[]; nextPageToken?: string };
    files.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);
  return files;
}

async function download(token: string, file: DriveFile) {
  const response = await driveRequest(token, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
  return Buffer.from(await response.arrayBuffer());
}

function manifestDescriptor(file: DriveFile, encrypted: Buffer): BackupObjectDescriptor {
  const parsed = JSON.parse(encrypted.toString("utf8")) as { plaintextSha256?: string };
  const plaintextSha256 = parsed.plaintextSha256;
  if (!plaintextSha256) throw new Error("Manifesto cifrado não informa o hash original.");
  return {
    name: file.name,
    kind: "table",
    bytes: Number(file.size ?? encrypted.length),
    plaintextSha256,
    ciphertextSha256: sha256(encrypted)
  };
}

function parseJson<T>(contents: Buffer, name: string) {
  try {
    return JSON.parse(contents.toString("utf8")) as T;
  } catch {
    throw new Error(`JSON inválido em ${name}.`);
  }
}

async function targetCounts(users: Users, tables: TablesDB, storage: Storage, databaseId: string, bucketId: string) {
  const userCount = (await users.list({ queries: [Query.limit(1)], total: true })).total;
  let rowCount = 0;
  for (const table of schemaTables) {
    rowCount += (await tables.listRows({ databaseId, tableId: table.id, queries: [Query.limit(1)], total: true })).total;
  }
  const fileCount = (await storage.listFiles({ bucketId, queries: [Query.limit(1)], total: true })).total;
  return { users: userCount, rows: rowCount, files: fileCount };
}

async function restoreUsers(usersService: Users, users: RestoredUser[]) {
  const passwordResetEmails: string[] = [];
  for (const user of users) {
    await usersService.create({
      userId: user.$id,
      email: user.email || undefined,
      phone: user.email ? undefined : user.phone || undefined,
      password: randomBytes(24).toString("base64url"),
      name: user.name || undefined
    });
    if (user.labels?.length) await usersService.updateLabels({ userId: user.$id, labels: user.labels });
    if (user.prefs && Object.keys(user.prefs).length) await usersService.updatePrefs({ userId: user.$id, prefs: user.prefs });
    if (user.status === false) await usersService.updateStatus({ userId: user.$id, status: false });
    if (user.email) passwordResetEmails.push(user.email);
  }
  return passwordResetEmails;
}

async function main() {
  if (!folderId) throw new Error("Informe --folder-id=<id> ou RESTORE_GOOGLE_DRIVE_FOLDER_ID.");
  const targetProjectId = required("RESTORE_APPWRITE_PROJECT_ID");
  const targetDatabaseId = required("RESTORE_APPWRITE_DATABASE_ID");
  const targetBucketId = required("RESTORE_APPWRITE_STORAGE_BUCKET_ID");
  const key = readBackupKey(required("BACKUP_ENCRYPTION_KEY"));
  const token = await accessToken();
  const folder = await getFolder(token, folderId);
  if (folder.appProperties?.status !== "complete") throw new Error("Somente backups marcados como completos podem ser restaurados.");

  const driveFiles = await listFolderFiles(token, folderId);
  const filesByName = new Map(driveFiles.map((file) => [file.name, file]));
  const manifestFile = filesByName.get("manifest.json.enc");
  if (!manifestFile) throw new Error("manifest.json.enc não encontrado.");
  const encryptedManifest = await download(token, manifestFile);
  if (folder.appProperties?.manifestSha256 !== sha256(encryptedManifest)) throw new Error("Hash cifrado do manifesto diverge da pasta concluída.");
  const manifestPlaintext = decryptAndVerify(encryptedManifest, manifestDescriptor(manifestFile, encryptedManifest), key);
  const manifest = parseJson<BackupManifest>(manifestPlaintext, manifestFile.name);
  assertManifest(manifest);
  assertSafeRestoreTarget({
    sourceProjectId: manifest.sourceProjectId,
    productionProjectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    targetProjectId,
    confirmedProjectId,
    apply
  });

  const verified = new Map<string, Buffer>();
  for (const descriptor of manifest.objects) {
    const driveFile = filesByName.get(descriptor.name);
    if (!driveFile) throw new Error(`Objeto ausente no Google Drive: ${descriptor.name}`);
    verified.set(descriptor.name, decryptAndVerify(await download(token, driveFile), descriptor, key));
  }

  const fileBytes = manifest.objects.filter((object) => object.kind === "file").reduce((sum, object) => sum + object.bytes, 0);
  const client = new Client()
    .setEndpoint(required("RESTORE_APPWRITE_ENDPOINT"))
    .setProject(targetProjectId)
    .setKey(required("RESTORE_APPWRITE_API_KEY"));
  const usersService = new Users(client);
  const tablesService = new TablesDB(client);
  const storageService = new Storage(client);
  const counts = await targetCounts(usersService, tablesService, storageService, targetDatabaseId, targetBucketId);
  assertEmptyTarget(counts);

  console.log(JSON.stringify({
    mode: apply ? "apply" : "verify-only",
    backupId: manifest.backupId,
    sourceProjectId: manifest.sourceProjectId,
    targetProjectId,
    objects: manifest.totals.objects,
    records: manifest.totals.records,
    bytes: manifest.totals.bytes,
    fileBytes,
    integrity: "verified",
    target: "empty"
  }, null, 2));
  if (!apply) {
    console.log("Nenhum dado foi alterado. Use --apply e --confirm-target=<project-id> após revisar este resultado.");
    return;
  }

  assertStorageCapacity(fileBytes, Number(required("RESTORE_STORAGE_QUOTA_BYTES")));
  const usersObject = manifest.objects.find((object) => object.kind === "users");
  if (!usersObject) throw new Error("Objeto de usuários ausente no manifesto.");
  const passwordResetEmails = await restoreUsers(usersService, parseJson<RestoredUser[]>(verified.get(usersObject.name)!, usersObject.name));

  let restoredRows = 0;
  for (const table of schemaTables) {
    const descriptor = manifest.objects.find((object) => object.name === `tables/${table.id}.json.enc`);
    if (!descriptor) throw new Error(`Tabela ausente no manifesto: ${table.id}`);
    const rows = parseJson<Array<Record<string, unknown>>>(verified.get(descriptor.name)!, descriptor.name);
    for (const row of rows) {
      await tablesService.createRow({
        databaseId: targetDatabaseId,
        tableId: table.id,
        rowId: String(row.$id),
        data: rowData(row),
        permissions: Array.isArray(row.$permissions) ? row.$permissions.map(String) : []
      });
      restoredRows += 1;
    }
  }

  let restoredFiles = 0;
  for (const descriptor of manifest.objects.filter((object) => object.kind === "file")) {
    const metadata = descriptor.metadata ?? {};
    const fileId = String(metadata.fileId ?? "");
    const name = String(metadata.name ?? fileId);
    if (!fileId) throw new Error(`fileId ausente em ${descriptor.name}`);
    await storageService.createFile({
      bucketId: targetBucketId,
      fileId,
      file: InputFile.fromBuffer(verified.get(descriptor.name)!, name),
      permissions: Array.isArray(metadata.permissions) ? metadata.permissions.map(String) : []
    });
    restoredFiles += 1;
  }

  const report = {
    backupId: manifest.backupId,
    restoredAt: new Date().toISOString(),
    sourceProjectId: manifest.sourceProjectId,
    targetProjectId,
    users: passwordResetEmails.length,
    rows: restoredRows,
    files: restoredFiles,
    passwordResetRequiredFor: passwordResetEmails
  };
  await mkdir(path.resolve("reports"), { recursive: true });
  const reportPath = path.resolve("reports", `restore-${new Date().toISOString().replaceAll(":", "-")}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Restauração concluída. Relatório: ${reportPath}`);
  console.log("As senhas não são copiadas. Envie recuperação de senha aos e-mails listados no relatório.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
