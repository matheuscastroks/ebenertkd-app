import { loadEnvConfig } from "@next/env";
import { Client, ID, Permission, Query, Role, TablesDB, Users, type Models } from "node-appwrite";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import type { AppCapability, AppRole } from "../../src/lib/auth/auth-utils";
import { testPersonas } from "./test-personas";

loadEnvConfig(process.cwd());

type SeedAccount = {
  key: "admin" | "adult" | "guardian" | "minor";
  name: string;
  email: string;
  password: string;
  username?: string;
  role: AppRole;
  capabilities: AppCapability[];
};

type ProfileRow = Models.Row & {
  account_id: string;
  full_name: string;
  email: string;
  username?: string | null;
  role: AppRole;
  capabilities: AppCapability[];
  status: string;
  created_at: string;
  updated_at: string;
};

const accounts: SeedAccount[] = testPersonas();

async function main() {
const config = readServerAppwriteConfig();
const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
const users = new Users(client);
const tables = new TablesDB(client);
const profiles = new Map<SeedAccount["key"], ProfileRow>();

for (const account of accounts) {
  const existingUsers = await users.list({ queries: [Query.equal("email", [account.email]), Query.limit(1)] });
  let user = existingUsers.users[0];

  if (!user) {
    user = await users.create({
      userId: ID.unique(),
      email: account.email,
      password: account.password,
      name: account.name
    });
  } else {
    await users.updatePassword({ userId: user.$id, password: account.password });
    await users.updateName({ userId: user.$id, name: account.name });
    await users.updateStatus({ userId: user.$id, status: true });
  }

  const existingProfiles = await tables.listRows<ProfileRow>({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.profiles,
    queries: [Query.equal("account_id", [user.$id]), Query.limit(1)]
  });
  const now = new Date().toISOString();
  const data = {
    account_id: user.$id,
    full_name: account.name,
    email: account.email,
    username: account.username,
    role: account.role,
    capabilities: account.capabilities,
    status: "active",
    updated_at: now
  };
  const permissions = [Permission.read(Role.user(user.$id)), Permission.update(Role.user(user.$id))];
  const profile = existingProfiles.rows[0]
    ? await tables.updateRow<ProfileRow>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.profiles,
        rowId: existingProfiles.rows[0].$id,
        data,
        permissions
      })
    : await tables.createRow<ProfileRow>({
        databaseId: config.databaseId,
        tableId: APPWRITE_IDS.tables.profiles,
        rowId: ID.unique(),
        data: { ...data, created_at: now },
        permissions
      });
  profiles.set(account.key, profile);
}

const guardian = profiles.get("guardian");
const minor = profiles.get("minor");
if (!guardian || !minor) throw new Error("Test family profiles were not created.");

const existingLinks = await tables.listRows({
  databaseId: config.databaseId,
  tableId: APPWRITE_IDS.tables.guardianStudentLinks,
  queries: [
    Query.equal("guardian_profile_id", [guardian.$id]),
    Query.equal("student_profile_id", [minor.$id]),
    Query.limit(1)
  ]
});

if (existingLinks.rows[0]) {
  await tables.updateRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.guardianStudentLinks,
    rowId: existingLinks.rows[0].$id,
    data: { status: "active", updated_at: new Date().toISOString() }
  });
} else {
  const now = new Date().toISOString();
  await tables.createRow({
    databaseId: config.databaseId,
    tableId: APPWRITE_IDS.tables.guardianStudentLinks,
    rowId: ID.unique(),
    data: {
      guardian_profile_id: guardian.$id,
      student_profile_id: minor.$id,
      status: "active",
      created_by_account_id: guardian.account_id,
      created_at: now,
      updated_at: now
    },
    permissions: [
      Permission.read(Role.user(guardian.account_id)),
      Permission.update(Role.user(guardian.account_id))
    ]
  });
}

console.log("Test users are ready:");
for (const account of accounts) {
  const login = account.username ?? account.email;
  console.log(`- ${account.key}: ${login}`);
}
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
