import { loadEnvConfig } from "@next/env";
import { Client, ID, Permission, Role, TablesDB, Users } from "node-appwrite";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";

loadEnvConfig(process.cwd());

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

const name = argument("name");
const email = argument("email")?.toLowerCase();
const password = argument("password");

if (!name || !email || !password || password.length < 8) {
  console.error('Use: npm run appwrite:create-admin -- --name "Nome" --email admin@exemplo.com --password "senha-segura"');
  process.exit(1);
}

async function main() {
  const config = readServerAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);
  const users = new Users(client);
  const tables = new TablesDB(client);
  const accountId = ID.unique();
  const now = new Date().toISOString();

  try {
    await users.create({ userId: accountId, email, password, name });
    await tables.createRow({
      databaseId: config.databaseId,
      tableId: APPWRITE_IDS.tables.profiles,
      rowId: ID.unique(),
      data: {
        account_id: accountId,
        full_name: name,
        email,
        role: "admin",
        capabilities: ["admin"],
        status: "active",
        created_at: now,
        updated_at: now
      },
      permissions: [Permission.read(Role.user(accountId)), Permission.update(Role.user(accountId))]
    });
    console.log(`Administrator created: ${email}`);
  } catch (error) {
    try {
      await users.delete({ userId: accountId });
    } catch {
      // Account was not created or was already removed.
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
