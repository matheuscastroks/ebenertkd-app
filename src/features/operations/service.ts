import "server-only";

import { Query, type Models } from "node-appwrite";
import { createAppwriteAdminClient } from "@/lib/appwrite/server";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";
import { scheduledJobHealth, storageHealth } from "./health-rules";

export type AutomationRun = Models.Row & {
  job: string;
  status: "started" | "completed" | "failed";
  started_at: string;
  finished_at?: string;
  details?: string;
  created_at: string;
};

async function storageUsage() {
  const { storage, config } = createAppwriteAdminClient();
  let offset = 0;
  let totalBytes = 0;
  let totalFiles = 0;
  while (true) {
    const page = await storage.listFiles({
      bucketId: config.bucketId,
      queries: [Query.limit(100), Query.offset(offset)],
      total: true
    });
    totalFiles = page.total;
    totalBytes += page.files.reduce((sum, file) => sum + file.sizeOriginal, 0);
    offset += page.files.length;
    if (!page.files.length || offset >= page.total) break;
  }
  return { totalBytes, totalFiles };
}

export async function getOperationsHealth() {
  const { tables, config } = createAppwriteAdminClient();
  const rows = await tables.listRows<AutomationRun>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.automationRuns,
    queries: [Query.orderDesc("created_at"), Query.limit(100)]
  });
  const runs = rows.rows;
  const lastCron = runs.find((run) => run.job === "daily-operations");
  const lastCronCompleted = runs.find((run) => run.job === "daily-operations" && run.status === "completed");
  const lastBackup = runs.find((run) => run.job === "backup");
  const lastBackupCompleted = runs.find((run) => run.job === "backup" && run.status === "completed");
  const failures = runs.filter((run) => run.status === "failed").slice(0, 8);
  const storage = await storageUsage();
  const parsedQuota = Number(process.env.APPWRITE_STORAGE_QUOTA_BYTES);
  const quotaBytes = Number.isSafeInteger(parsedQuota) && parsedQuota > 0 ? parsedQuota : undefined;

  const requiredBackupVariables = [
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_REFRESH_TOKEN",
    "GOOGLE_DRIVE_FOLDER_ID",
    "BACKUP_ENCRYPTION_KEY"
  ];

  return {
    lastCron,
    lastBackup,
    failures,
    cronHealth: scheduledJobHealth(lastCronCompleted?.finished_at ?? lastCronCompleted?.created_at),
    backupHealth: scheduledJobHealth(lastBackupCompleted?.finished_at ?? lastBackupCompleted?.created_at),
    storage: { ...storage, quotaBytes, ...storageHealth(storage.totalBytes, quotaBytes) },
    configuration: {
      backup: requiredBackupVariables.every((name) => Boolean(process.env[name]?.trim())),
      push: ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "PUSH_SUBSCRIPTION_ENCRYPTION_KEY"].every((name) => Boolean(process.env[name]?.trim())),
      storageQuota: Boolean(quotaBytes)
    }
  };
}
