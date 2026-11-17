import { randomBytes } from "node:crypto";

export function generateBackupKey() {
  return randomBytes(32).toString("base64");
}

if (process.argv[1] && /generate-backup-key\.ts$/.test(process.argv[1].replaceAll("\\", "/"))) {
  process.stderr.write("BACKUP_ENCRYPTION_KEY (32 bytes, base64). Nada foi gravado em arquivo. Guarde em um cofre externo antes de usar:\n");
  process.stdout.write(`${generateBackupKey()}\n`);
}
