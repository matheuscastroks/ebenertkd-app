export type ReleaseCheck = { key: string; label: string; ok: boolean; detail: string };

const requiredSecrets = [
  "APPWRITE_API_KEY",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "PUSH_SUBSCRIPTION_ENCRYPTION_KEY",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REFRESH_TOKEN",
  "GOOGLE_DRIVE_FOLDER_ID",
  "BACKUP_ENCRYPTION_KEY"
] as const;

export function configurationChecks(source: Record<string, string | undefined>): ReleaseCheck[] {
  const appUrl = source.APP_URL ?? source.NEXT_PUBLIC_APP_URL ?? "";
  const quota = Number(source.APPWRITE_STORAGE_QUOTA_BYTES);
  return [
    { key: "https", label: "Domínio HTTPS", ok: appUrl.startsWith("https://"), detail: appUrl ? "URL configurada" : "APP_URL ausente" },
    { key: "appwrite", label: "Projeto Appwrite", ok: Boolean(source.NEXT_PUBLIC_APPWRITE_PROJECT_ID && source.NEXT_PUBLIC_APPWRITE_ENDPOINT?.startsWith("https://")), detail: "Endpoint e projeto" },
    { key: "secrets", label: "Integrações protegidas", ok: requiredSecrets.every((name) => Boolean(source[name]?.trim())), detail: "Appwrite, push e backup" },
    { key: "storage-quota", label: "Cota de armazenamento", ok: Number.isSafeInteger(quota) && quota > 0, detail: "APPWRITE_STORAGE_QUOTA_BYTES" }
  ];
}

export function isRecentSuccess(finishedAt: string | undefined, now = new Date()) {
  if (!finishedAt) return false;
  const age = now.getTime() - new Date(finishedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= 24 * 60 * 60 * 1000;
}

export function storageBelowCritical(usedBytes: number, quotaBytes: number) {
  return quotaBytes > 0 && usedBytes / quotaBytes < 0.85;
}
