import { formatEnv, generatePushKeys } from "./push/generate-keys";

// Uso: npm run push:generate-keys -- mailto:professor@exemplo.com
// Imprime no terminal; não grava nada em arquivo. Guarde os valores em local seguro.
const subject = process.argv[2] ?? "mailto:admin@example.com";
process.stdout.write(
  `# Cole no .env.local e nas variáveis da Function daily-operations.\n# Troque VAPID_SUBJECT por um e-mail real (mailto:) ou URL https.\n# Não perca estas chaves: trocar a PUSH_SUBSCRIPTION_ENCRYPTION_KEY invalida as inscrições existentes.\n${formatEnv(generatePushKeys(subject))}\n`
);
