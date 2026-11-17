import { isValidVapidSubject } from "../src/features/notifications/push-config";
import { formatEnv, generatePushKeys } from "./push/generate-keys";

// Uso: npm run -s push:generate-keys -- mailto:professor@seudominio.com.br
// Imprime no terminal; não grava nada em arquivo. Guarde os valores em local seguro.
const subject = process.argv[2];
if (!subject || !isValidVapidSubject(subject)) {
  process.stderr.write(
    "Informe o subject VAPID real (mailto:email@dominio-real ou https://dominio-real; domínios de exemplo e localhost não são aceitos).\nUso: npm run -s push:generate-keys -- mailto:professor@seudominio.com.br\n"
  );
  process.exit(1);
}
process.stdout.write(
  `# Cole no .env.local e nas variáveis da Function daily-operations.\n# Não perca estas chaves: trocar a PUSH_SUBSCRIPTION_ENCRYPTION_KEY invalida as inscrições existentes.\n${formatEnv(generatePushKeys(subject))}\n`
);
