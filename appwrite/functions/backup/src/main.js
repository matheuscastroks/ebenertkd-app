import { AppwriteException, Client, Query, Storage, TablesDB, Users } from "node-appwrite";
import { backupIdsToDelete, backupTableIds, buildManifest } from "./backup-rules.js";
import { encryptBuffer, sha256 } from "./crypto.js";
import { deleteBackupFolder, findOrCreateBackupFolder, getAccessToken, listBackupFolders, markBackupComplete, markBackupIncomplete, uploadEncryptedObject } from "./drive.js";
import { safeErrorMessage } from "./safe-error.js";

const databaseId = process.env.APPWRITE_DATABASE_ID ?? "ebenertkd";
const bucketId = process.env.APPWRITE_STORAGE_BUCKET_ID ?? "private-files";

async function listAllRows(tables, tableId) {
  const rows = [];
  let cursor;
  let total;
  do {
    const page = await tables.listRows({ databaseId, tableId, queries: [Query.limit(500), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...page.rows);
    cursor = page.rows.length === 500 ? page.rows.at(-1).$id : undefined;
    total = page.total;
  } while (cursor);
  if (typeof total === "number" && rows.length !== total) throw new Error(`table_export_incomplete:${tableId}`);
  return rows;
}

async function listAllUsers(users) {
  const rows = [];
  let cursor;
  let total;
  do {
    const page = await users.list({ queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    rows.push(...page.users);
    cursor = page.users.length === 100 ? page.users.at(-1).$id : undefined;
    total = page.total;
  } while (cursor);
  if (typeof total === "number" && rows.length !== total) throw new Error("users_export_incomplete");
  return rows;
}

async function listAllFiles(storage) {
  const files = [];
  let cursor;
  let total;
  do {
    const page = await storage.listFiles({ bucketId, queries: [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])] });
    files.push(...page.files);
    cursor = page.files.length === 100 ? page.files.at(-1).$id : undefined;
    total = page.total;
  } while (cursor);
  if (typeof total === "number" && files.length !== total) throw new Error("files_export_incomplete");
  return files;
}

function sanitizedUsers(users) {
  return users.map((user) => ({ $id: user.$id, name: user.name, email: user.email, phone: user.phone, status: user.status, emailVerification: user.emailVerification, phoneVerification: user.phoneVerification, labels: user.labels, prefs: user.prefs, $createdAt: user.$createdAt, $updatedAt: user.$updatedAt }));
}

async function saveEncryptedObject(token, folderId, objects, { name, kind, records, plaintext, descriptorMetadata }) {
  const encrypted = encryptBuffer(plaintext);
  await uploadEncryptedObject(token, folderId, name, encrypted.envelope, { kind, plaintextSha256: encrypted.plaintextSha256, ciphertextSha256: encrypted.ciphertextSha256 });
  objects.push({ name, kind, records, bytes: encrypted.plaintextBytes, plaintextSha256: encrypted.plaintextSha256, ciphertextSha256: encrypted.ciphertextSha256, ...(descriptorMetadata ? { metadata: descriptorMetadata } : {}) });
}

async function notifyAdmins(tables, title, body, dedupeKey) {
  const admins = await tables.listRows({ databaseId, tableId: "profiles", queries: [Query.equal("role", ["admin"]), Query.equal("status", ["active"]), Query.limit(100)] });
  const now = new Date().toISOString();
  const notificationId = sha256(`notification:${dedupeKey}`).slice(0, 36);
  try {
    await tables.createRow({ databaseId, tableId: "notifications", rowId: notificationId, permissions: [], data: { kind: "system", title, body, audience: "system", action_url: "/admin/sistema", dedupe_key: dedupeKey, published_at: now, created_at: now } });
  } catch (cause) {
    if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
  }
  for (const admin of admins.rows) {
    try {
      await tables.createRow({ databaseId, tableId: "notification_recipients", rowId: sha256(`${notificationId}:${admin.$id}`).slice(0, 36), permissions: [], data: { notification_id: notificationId, profile_id: admin.$id, account_id: admin.account_id, created_at: now, updated_at: now } });
    } catch (cause) {
      if (!(cause instanceof AppwriteException) || cause.code !== 409) throw cause;
    }
  }
}

async function main({ req, res, log, error }) {
  const started = new Date();
  const date = started.toISOString().slice(0, 10);
  const backupId = `backup-${date.replaceAll("-", "")}`;
  const idempotencyKey = `${backupId}-v1`;
  const executionKey = req.headers["x-appwrite-key"];
  if (!executionKey) return res.json({ ok: false, error: "missing_execution_key" }, 500);
  const client = new Client().setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT).setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID).setKey(executionKey);
  const tables = new TablesDB(client);
  const storage = new Storage(client);
  const users = new Users(client);
  let run;

  try {
    try {
      run = await tables.getRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey });
      if (run.status === "completed") return res.json({ ok: true, duplicate: true, idempotencyKey });
      await tables.updateRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, data: { status: "started", started_at: started.toISOString(), finished_at: null, details: JSON.stringify({ backupId, resumed: true }) } });
    } catch (cause) {
      if (!(cause instanceof AppwriteException) || cause.code !== 404) throw cause;
      run = await tables.createRow({ databaseId, tableId: "automation_runs", rowId: idempotencyKey, permissions: [], data: { job: "backup", idempotency_key: idempotencyKey, status: "started", started_at: started.toISOString(), details: JSON.stringify({ backupId, resumed: false }), created_at: started.toISOString() } });
    }

    const token = await getAccessToken();
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!parentId) throw new Error("drive_folder_missing");
    const folder = await findOrCreateBackupFolder(token, parentId, backupId, date);
    // Uma nova tentativa no mesmo dia reutiliza a pasta: ela deixa de ser restaurável até concluir de novo.
    if (folder.appProperties?.status === "complete") await markBackupIncomplete(token, folder.id);
    const objects = [];
    const references = new Set();
    const accountRows = sanitizedUsers(await listAllUsers(users));
    await saveEncryptedObject(token, folder.id, objects, { name: "users.json.enc", kind: "users", records: accountRows.length, plaintext: Buffer.from(JSON.stringify(accountRows)) });

    for (const tableId of backupTableIds) {
      const rows = await listAllRows(tables, tableId);
      for (const row of rows) for (const [key, value] of Object.entries(row)) if (key.endsWith("file_id") && typeof value === "string") references.add(value);
      await saveEncryptedObject(token, folder.id, objects, { name: `tables/${tableId}.json.enc`, kind: "table", records: rows.length, plaintext: Buffer.from(JSON.stringify(rows)) });
    }

    const files = await listAllFiles(storage);
    const exportedFileIds = new Set();
    for (const file of files) {
      const contents = Buffer.from(await storage.getFileDownload({ bucketId, fileId: file.$id }));
      await saveEncryptedObject(token, folder.id, objects, { name: `files/${file.$id}.bin.enc`, kind: "file", plaintext: contents, descriptorMetadata: { fileId: file.$id, name: file.name, mimeType: file.mimeType, sizeOriginal: file.sizeOriginal, permissions: file.$permissions } });
      exportedFileIds.add(file.$id);
    }
    const missingFileReferences = [...references].filter((fileId) => !exportedFileIds.has(fileId)).sort();
    if (missingFileReferences.length) throw new Error(`missing_file_references:${missingFileReferences.length}`);

    const manifest = buildManifest({ backupId, sourceProjectId: process.env.APPWRITE_FUNCTION_PROJECT_ID, databaseId, bucketId, appVersion: process.env.APP_VERSION ?? "unknown", startedAt: started.toISOString(), completedAt: new Date().toISOString(), objects, missingFileReferences });
    const encryptedManifest = encryptBuffer(Buffer.from(JSON.stringify(manifest)));
    await uploadEncryptedObject(token, folder.id, "manifest.json.enc", encryptedManifest.envelope, { kind: "manifest", plaintextSha256: encryptedManifest.plaintextSha256, ciphertextSha256: encryptedManifest.ciphertextSha256 });
    const encryptedComplete = encryptBuffer(Buffer.from(JSON.stringify({ backupId, manifestCiphertextSha256: encryptedManifest.ciphertextSha256, completedAt: manifest.completedAt })));
    await uploadEncryptedObject(token, folder.id, "complete.json.enc", encryptedComplete.envelope, { kind: "complete", plaintextSha256: encryptedComplete.plaintextSha256, ciphertextSha256: encryptedComplete.ciphertextSha256 });
    await markBackupComplete(token, folder.id, encryptedManifest.ciphertextSha256);

    const finishedAt = new Date().toISOString();
    const details = { backupId, folderId: folder.id, objects: manifest.totals.objects, records: manifest.totals.records, bytes: manifest.totals.bytes, durationMs: Date.parse(finishedAt) - started.getTime(), manifestCiphertextSha256: encryptedManifest.ciphertextSha256 };
    await tables.updateRow({ databaseId, tableId: "automation_runs", rowId: run.$id, data: { status: "completed", finished_at: finishedAt, details: JSON.stringify(details) } });
    run = undefined;

    // A retenção nunca invalida um backup já concluído: falhas só viram aviso.
    let retention = { deleted: 0, failures: 0 };
    try {
      const folders = await listBackupFolders(token, parentId);
      const deletes = backupIdsToDelete(folders.map((item) => ({ id: item.id, date: item.appProperties?.date ?? item.createdTime, complete: item.appProperties?.status === "complete" })));
      for (const folderId of deletes) {
        try {
          await deleteBackupFolder(token, folderId);
          retention.deleted += 1;
        } catch {
          retention.failures += 1;
        }
      }
    } catch (cause) {
      retention = { ...retention, failures: retention.failures + 1 };
      log(`Retenção do backup ${backupId} falhou: ${safeErrorMessage(cause)}`);
    }
    if (retention.failures) log(`Retenção do backup ${backupId}: ${retention.failures} falha(s).`);
    log(`Backup ${backupId} completed with ${manifest.totals.objects} objects.`);
    return res.json({ ok: true, idempotencyKey, ...details, retainedDeleted: retention.deleted, retentionFailures: retention.failures });
  } catch (cause) {
    const message = safeErrorMessage(cause);
    if (run?.$id) await tables.updateRow({ databaseId, tableId: "automation_runs", rowId: run.$id, data: { status: "failed", finished_at: new Date().toISOString(), details: JSON.stringify({ backupId, error: message.slice(0, 240) }) } }).catch(() => undefined);
    await notifyAdmins(tables, "Falha no backup diário", "A cópia externa não foi concluída. Consulte o painel do sistema.", `backup-failed:${date}`).catch(() => undefined);
    error(message);
    return res.json({ ok: false }, 500);
  }
}

export default main;
