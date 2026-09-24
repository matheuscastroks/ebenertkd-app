import { describe, expect, it } from "vitest";
import {
  hasAppwriteConfig,
  readPublicAppwriteConfig,
  readServerAppwriteConfig
} from "@/lib/appwrite/config";

const validEnv = {
  NEXT_PUBLIC_APPWRITE_ENDPOINT: "https://cloud.appwrite.io/v1",
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: "project-id",
  APPWRITE_API_KEY: "secret",
  APPWRITE_DATABASE_ID: "database-id",
  APPWRITE_STORAGE_BUCKET_ID: "bucket-id",
  APP_URL: "https://app.example.com"
};

describe("Appwrite configuration", () => {
  it("parses public and server settings", () => {
    expect(readPublicAppwriteConfig(validEnv)).toEqual({
      endpoint: validEnv.NEXT_PUBLIC_APPWRITE_ENDPOINT,
      projectId: validEnv.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
      appUrl: validEnv.APP_URL
    });
    expect(readServerAppwriteConfig(validEnv).apiKey).toBe("secret");
  });

  it("rejects incomplete server configuration", () => {
    expect(() => readServerAppwriteConfig({})).toThrow();
    expect(hasAppwriteConfig({})).toBe(false);
  });

  it("accepts the legacy public app URL during migration", () => {
    expect(
      readPublicAppwriteConfig({
        NEXT_PUBLIC_APPWRITE_ENDPOINT: validEnv.NEXT_PUBLIC_APPWRITE_ENDPOINT,
        NEXT_PUBLIC_APPWRITE_PROJECT_ID: validEnv.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
        NEXT_PUBLIC_APP_URL: "http://localhost:3000"
      }).appUrl
    ).toBe("http://localhost:3000");
  });
});

