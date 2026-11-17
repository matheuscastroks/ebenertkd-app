import { createECDH } from "node:crypto";

export type PushConfigIssue =
  | "vapid_public_key_missing"
  | "vapid_public_key_invalid"
  | "vapid_private_key_missing"
  | "vapid_private_key_invalid"
  | "vapid_key_pair_mismatch"
  | "vapid_subject_missing"
  | "vapid_subject_invalid"
  | "encryption_key_missing"
  | "encryption_key_invalid";

// Regra única: os valores são consumidos crus (sem trim) pelo app, pela Function e pelo navegador,
// então espaço ou quebra de linha tornam a variável inválida em vez de serem toleradas aqui.
const hasWhitespace = (value: string) => /\s/.test(value);
const base64UrlBytes = (value: string) => (/^[A-Za-z0-9_-]+$/.test(value) ? Buffer.from(value, "base64url") : null);
const PLACEHOLDER_HOSTS = ["example.com", "example.org", "example.net", "localhost"];

export function isValidVapidSubject(value: string) {
  const match = /^(?:mailto:[^\s@/]+@([^\s@/]+)|https:\/\/([^\s/:?#]+)(?:[/:?#]\S*)?)$/.exec(value);
  const host = (match?.[1] ?? match?.[2])?.toLowerCase();
  if (!host) return false;
  return !PLACEHOLDER_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function keyPairMatches(publicKey: Buffer, privateKey: Buffer) {
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(privateKey);
    return ecdh.getPublicKey().equals(publicKey);
  } catch {
    return false;
  }
}

/** Valida (sem expor valores) as quatro variáveis necessárias para o Web Push. */
export function pushConfigIssues(source: Record<string, string | undefined> = process.env): PushConfigIssue[] {
  const issues: PushConfigIssue[] = [];
  const publicKey = source.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = source.VAPID_PRIVATE_KEY;
  const subject = source.VAPID_SUBJECT;
  const encryption = source.PUSH_SUBSCRIPTION_ENCRYPTION_KEY;

  const publicBytes = publicKey ? base64UrlBytes(publicKey) : null;
  const privateBytes = privateKey ? base64UrlBytes(privateKey) : null;
  const publicOk = publicBytes?.length === 65 && publicBytes[0] === 0x04;
  const privateOk = privateBytes?.length === 32;

  if (!publicKey) issues.push("vapid_public_key_missing");
  else if (!publicOk) issues.push("vapid_public_key_invalid");

  if (!privateKey) issues.push("vapid_private_key_missing");
  else if (!privateOk) issues.push("vapid_private_key_invalid");

  if (publicOk && privateOk && !keyPairMatches(publicBytes, privateBytes)) issues.push("vapid_key_pair_mismatch");

  if (!subject) issues.push("vapid_subject_missing");
  else if (hasWhitespace(subject) || !isValidVapidSubject(subject)) issues.push("vapid_subject_invalid");

  if (!encryption) issues.push("encryption_key_missing");
  else if (hasWhitespace(encryption) || !/^[A-Za-z0-9+/]+={0,2}$/.test(encryption) || Buffer.from(encryption, "base64").length !== 32) issues.push("encryption_key_invalid");

  return issues;
}

export function isPushConfigured(source: Record<string, string | undefined> = process.env) {
  return pushConfigIssues(source).length === 0;
}
