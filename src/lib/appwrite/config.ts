import { z } from "zod";
import { APPWRITE_IDS } from "@/lib/appwrite/ids";

const publicSchema = z.object({
  endpoint: z.string().url(),
  projectId: z.string().min(1),
  appUrl: z.string().url()
});

const serverSchema = publicSchema.extend({
  apiKey: z.string().min(1),
  databaseId: z.string().min(1),
  bucketId: z.string().min(1)
});

export type PublicAppwriteConfig = z.infer<typeof publicSchema>;
export type ServerAppwriteConfig = z.infer<typeof serverSchema>;
type EnvironmentSource = Record<string, string | undefined>;

export function readPublicAppwriteConfig(
  source: EnvironmentSource = process.env
): PublicAppwriteConfig {
  return publicSchema.parse({
    endpoint: source.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: source.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    appUrl: source.APP_URL ?? source.NEXT_PUBLIC_APP_URL
  });
}

export function readServerAppwriteConfig(
  source: EnvironmentSource = process.env
): ServerAppwriteConfig {
  return serverSchema.parse({
    ...readPublicAppwriteConfig(source),
    apiKey: source.APPWRITE_API_KEY,
    databaseId: source.APPWRITE_DATABASE_ID ?? APPWRITE_IDS.database,
    bucketId: source.APPWRITE_STORAGE_BUCKET_ID ?? APPWRITE_IDS.bucket
  });
}

export function hasAppwriteConfig(source: EnvironmentSource = process.env) {
  return publicSchema.safeParse({
    endpoint: source.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    projectId: source.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    appUrl: source.APP_URL ?? source.NEXT_PUBLIC_APP_URL
  }).success;
}
