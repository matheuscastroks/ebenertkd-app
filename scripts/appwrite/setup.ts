import { loadEnvConfig } from "@next/env";
import {
  AppwriteException,
  Client,
  Functions,
  ProjectKeyScopes,
  Runtime,
  Storage,
  TablesDB,
  TablesDBIndexType
} from "node-appwrite";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import type { ServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { bucket, functions, tables, type ColumnDefinition } from "./schema";

loadEnvConfig(process.cwd());

const mode = process.argv[2];
if (mode !== "plan" && mode !== "apply") {
  throw new Error("Use: tsx scripts/appwrite/setup.ts <plan|apply>");
}

let config: ServerAppwriteConfig;
try {
  config = readServerAppwriteConfig();
} catch {
  console.error(
    "Appwrite configuration is incomplete. Copy .env.example to .env.local and fill the required Appwrite values."
  );
  process.exit(1);
}
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
const tablesDb = new TablesDB(client);
const storage = new Storage(client);
const functionsApi = new Functions(client);
const changes: string[] = [];

function isNotFound(error: unknown) {
  return error instanceof AppwriteException && error.code === 404;
}

async function getOrNull<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function createColumn(tableId: string, column: ColumnDefinition) {
  const common = { databaseId: config.databaseId, tableId, key: column.key };

  if (column.kind === "varchar") {
    return tablesDb.createVarcharColumn({
      ...common,
      size: column.size,
      required: column.required,
      array: column.array
    });
  }
  if (column.kind === "enum") {
    return tablesDb.createEnumColumn({ ...common, elements: column.elements, required: column.required });
  }
  if (column.kind === "datetime") {
    return tablesDb.createDatetimeColumn({ ...common, required: column.required });
  }
  if (column.kind === "integer") {
    return tablesDb.createIntegerColumn({
      ...common,
      required: column.required,
      min: column.min,
      max: column.max
    });
  }
  return tablesDb.createTextColumn({ ...common, required: column.required });
}

async function waitForColumn(tableId: string, key: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const column = await tablesDb.getColumn({ databaseId: config.databaseId, tableId, key });
    if (column.status === "available") return;
    if (column.status === "failed" || column.status === "stuck") {
      throw new Error(`Column ${tableId}.${key} failed: ${column.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for column ${tableId}.${key}`);
}

async function reconcile() {
  const database = await getOrNull(() => tablesDb.get({ databaseId: config.databaseId }));
  if (!database) {
    changes.push(`create database ${config.databaseId}`);
    if (mode === "apply") {
      await tablesDb.create({ databaseId: config.databaseId, name: "Ebenert KD", enabled: true });
    }
  }

  for (const table of tables) {
    let remote = await getOrNull(() =>
      tablesDb.getTable({ databaseId: config.databaseId, tableId: table.id })
    );
    if (!remote) {
      changes.push(`create table ${table.id}`);
      if (mode === "apply") {
        remote = await tablesDb.createTable({
          databaseId: config.databaseId,
          tableId: table.id,
          name: table.name,
          permissions: [],
          rowSecurity: true,
          enabled: true
        });
      }
    }

    const remoteColumns = new Set(remote?.columns.map((item) => item.key) ?? []);
    for (const column of table.columns) {
      if (remoteColumns.has(column.key)) continue;
      changes.push(`create column ${table.id}.${column.key}`);
      if (mode === "apply") {
        await createColumn(table.id, column);
        await waitForColumn(table.id, column.key);
      }
    }

    const remoteIndexes = new Set(remote?.indexes.map((item) => item.key) ?? []);
    for (const index of table.indexes) {
      if (remoteIndexes.has(index.key)) continue;
      changes.push(`create index ${table.id}.${index.key}`);
      if (mode === "apply") {
        await tablesDb.createIndex({
          databaseId: config.databaseId,
          tableId: table.id,
          key: index.key,
          type: index.type === "unique" ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
          columns: index.columns
        });
      }
    }
  }

  const remoteBucket = await getOrNull(() => storage.getBucket({ bucketId: config.bucketId }));
  if (!remoteBucket) {
    changes.push(`create bucket ${config.bucketId}`);
    if (mode === "apply") {
      await storage.createBucket({
        bucketId: config.bucketId,
        name: bucket.name,
        permissions: [],
        fileSecurity: true,
        enabled: true,
        maximumFileSize: bucket.maximumFileSize,
        allowedFileExtensions: [...bucket.extensions],
        encryption: true,
        antivirus: true,
        transformations: false
      });
    }
  }

  for (const fn of functions) {
    const remoteFunction = await getOrNull(() => functionsApi.get({ functionId: fn.id }));
    if (remoteFunction) continue;
    changes.push(`create function ${fn.id} (${fn.schedule})`);
    if (mode === "apply") {
      await functionsApi.create({
        functionId: fn.id,
        name: fn.name,
        runtime: Runtime.Node22,
        execute: [],
        schedule: fn.schedule,
        timeout: 60,
        enabled: true,
        logging: true,
        entrypoint: "src/main.js",
        commands: "npm install",
        scopes: [ProjectKeyScopes.RowsRead, ProjectKeyScopes.RowsWrite]
      });
    }
  }
}

reconcile()
  .then(() => {
    if (changes.length === 0) {
      console.log("Infrastructure is up to date.");
      return;
    }
    console.log(`${mode === "plan" ? "Planned" : "Applied"} changes:`);
    changes.forEach((change) => console.log(`- ${change}`));
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
