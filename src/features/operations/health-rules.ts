export type HealthLevel = "normal" | "warning" | "critical" | "unknown";

export function storageHealth(usedBytes: number, quotaBytes?: number) {
  if (!quotaBytes || quotaBytes <= 0) return { level: "unknown" as const, percentage: undefined };
  const percentage = Math.min(100, Math.max(0, (usedBytes / quotaBytes) * 100));
  if (percentage >= 85) return { level: "critical" as const, percentage };
  if (percentage >= 70) return { level: "warning" as const, percentage };
  return { level: "normal" as const, percentage };
}

export function scheduledJobHealth(lastCompletedAt?: string, now = new Date()) {
  if (!lastCompletedAt) return { level: "critical" as const, ageHours: undefined };
  const ageHours = (now.getTime() - new Date(lastCompletedAt).getTime()) / 3_600_000;
  return { level: ageHours > 24 ? "critical" as const : "normal" as const, ageHours };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}
