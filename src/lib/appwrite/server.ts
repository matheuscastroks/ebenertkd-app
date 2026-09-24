import "server-only";

import {
  Account,
  Client,
  Functions,
  Storage,
  TablesDB,
  Users
} from "node-appwrite";
import { readServerAppwriteConfig } from "@/lib/appwrite/config";

export function createAppwriteAdminClient() {
  const config = readServerAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return {
    client,
    account: new Account(client),
    functions: new Functions(client),
    storage: new Storage(client),
    tables: new TablesDB(client),
    users: new Users(client),
    config
  };
}

