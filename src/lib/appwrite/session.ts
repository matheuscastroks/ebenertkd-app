import "server-only";

import { cookies } from "next/headers";
import { Account, Client, Storage, TablesDB } from "node-appwrite";
import { readPublicAppwriteConfig, readServerAppwriteConfig } from "@/lib/appwrite/config";
import { APPWRITE_SESSION_COOKIE } from "@/lib/appwrite/ids";

export function createAppwriteAuthClient() {
  const config = readServerAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return { client, account: new Account(client), config };
}

export async function createAppwriteSessionClient() {
  const session = (await cookies()).get(APPWRITE_SESSION_COOKIE)?.value;

  if (!session) {
    return null;
  }

  const config = readPublicAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setSession(session);

  return {
    client,
    account: new Account(client),
    storage: new Storage(client),
    tables: new TablesDB(client)
  };
}

export function appwriteSessionCookie(expiresAt: string) {
  return {
    name: APPWRITE_SESSION_COOKIE,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      expires: new Date(expiresAt)
    }
  };
}
