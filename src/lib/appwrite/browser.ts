import { Client } from "appwrite";

export const APPWRITE_PROJECT = {
  id: "6ab4c32e00317977eeb6",
  name: "My first project",
  endpoint: "https://fra.cloud.appwrite.io/v1"
} as const;

export const appwriteClient = new Client()
  .setEndpoint(APPWRITE_PROJECT.endpoint)
  .setProject(APPWRITE_PROJECT.id);

let pingPromise: Promise<unknown> | null = null;

export function pingAppwriteOnce() {
  pingPromise ??= appwriteClient.ping();
  return pingPromise;
}

