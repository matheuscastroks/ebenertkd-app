import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isPushConfigured, pushConfigIssues } from "./push-config";

function validEnv() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  const point = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")]);
  return {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: point.toString("base64url"),
    VAPID_PRIVATE_KEY: priv.d!,
    VAPID_SUBJECT: "mailto:professor@example.com",
    PUSH_SUBSCRIPTION_ENCRYPTION_KEY: randomBytes(32).toString("base64")
  };
}

describe("push configuration validation", () => {
  it("accepts a complete valid configuration", () => {
    expect(isPushConfigured(validEnv())).toBe(true);
  });

  it("reports every missing variable, including VAPID_SUBJECT", () => {
    expect(pushConfigIssues({})).toEqual([
      "vapid_public_key_missing",
      "vapid_private_key_missing",
      "vapid_subject_missing",
      "encryption_key_missing"
    ]);
  });

  it("rejects malformed keys and subject", () => {
    const issues = pushConfigIssues({ ...validEnv(), NEXT_PUBLIC_VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "abc", VAPID_SUBJECT: "admin@example.com", PUSH_SUBSCRIPTION_ENCRYPTION_KEY: "c2hvcnQ=" });
    expect(issues).toEqual(["vapid_public_key_invalid", "vapid_private_key_invalid", "vapid_subject_invalid", "encryption_key_invalid"]);
  });
});
