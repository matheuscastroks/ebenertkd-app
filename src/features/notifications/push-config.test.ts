import { generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isPushConfigured, isValidVapidSubject, pushConfigIssues } from "./push-config";

function vapidPair() {
  const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  const point = Buffer.concat([Buffer.from([4]), Buffer.from(pub.x!, "base64url"), Buffer.from(pub.y!, "base64url")]);
  return { NEXT_PUBLIC_VAPID_PUBLIC_KEY: point.toString("base64url"), VAPID_PRIVATE_KEY: priv.d! };
}

function validEnv() {
  return { ...vapidPair(), VAPID_SUBJECT: "mailto:contato@dojang.com.br", PUSH_SUBSCRIPTION_ENCRYPTION_KEY: randomBytes(32).toString("base64") };
}

describe("push configuration validation", () => {
  it("accepts a complete valid configuration", () => {
    expect(isPushConfigured(validEnv())).toBe(true);
  });

  it("reports every missing variable, including VAPID_SUBJECT", () => {
    expect(pushConfigIssues({})).toEqual(["vapid_public_key_missing", "vapid_private_key_missing", "vapid_subject_missing", "encryption_key_missing"]);
  });

  it("rejects malformed keys and subject", () => {
    const issues = pushConfigIssues({ ...validEnv(), NEXT_PUBLIC_VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "abc", VAPID_SUBJECT: "admin@dojang.com.br", PUSH_SUBSCRIPTION_ENCRYPTION_KEY: "c2hvcnQ=" });
    expect(issues).toEqual(["vapid_public_key_invalid", "vapid_private_key_invalid", "vapid_subject_invalid", "encryption_key_invalid"]);
  });

  it("treats surrounding whitespace or newlines as invalid instead of trimming", () => {
    const env = validEnv();
    expect(pushConfigIssues({ ...env, NEXT_PUBLIC_VAPID_PUBLIC_KEY: `${env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}\n` })).toContain("vapid_public_key_invalid");
    expect(pushConfigIssues({ ...env, VAPID_PRIVATE_KEY: ` ${env.VAPID_PRIVATE_KEY}` })).toContain("vapid_private_key_invalid");
    expect(pushConfigIssues({ ...env, VAPID_SUBJECT: `${env.VAPID_SUBJECT} ` })).toContain("vapid_subject_invalid");
    expect(pushConfigIssues({ ...env, PUSH_SUBSCRIPTION_ENCRYPTION_KEY: `${env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY}\r\n` })).toContain("encryption_key_invalid");
  });

  it("rejects a public key that does not belong to the private key", () => {
    const env = validEnv();
    expect(pushConfigIssues({ ...env, NEXT_PUBLIC_VAPID_PUBLIC_KEY: vapidPair().NEXT_PUBLIC_VAPID_PUBLIC_KEY })).toEqual(["vapid_key_pair_mismatch"]);
  });

  it("rejects a public key without the uncompressed point prefix", () => {
    const env = validEnv();
    const bytes = Buffer.from(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, "base64url");
    bytes[0] = 0x02;
    expect(pushConfigIssues({ ...env, NEXT_PUBLIC_VAPID_PUBLIC_KEY: bytes.toString("base64url") })).toEqual(["vapid_public_key_invalid"]);
  });

  it("rejects placeholder subjects", () => {
    for (const subject of ["mailto:admin@example.com", "mailto:a@mail.example.org", "https://localhost:3000", "https://example.net/x", "mailto:a@localhost"]) {
      expect(isValidVapidSubject(subject), subject).toBe(false);
    }
    expect(isValidVapidSubject("https://ebenertkd.com.br")).toBe(true);
  });
});
