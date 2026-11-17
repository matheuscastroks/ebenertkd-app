export type PushConfigIssue =
  | "vapid_public_key_missing"
  | "vapid_public_key_invalid"
  | "vapid_private_key_missing"
  | "vapid_private_key_invalid"
  | "vapid_subject_missing"
  | "vapid_subject_invalid"
  | "encryption_key_missing"
  | "encryption_key_invalid";

const base64UrlBytes = (value: string) => {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return null;
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
};

/** Valida (sem expor valores) as quatro variáveis necessárias para o Web Push. */
export function pushConfigIssues(source: Record<string, string | undefined> = process.env): PushConfigIssue[] {
  const issues: PushConfigIssue[] = [];
  const publicKey = source.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = source.VAPID_PRIVATE_KEY?.trim();
  const subject = source.VAPID_SUBJECT?.trim();
  const encryption = source.PUSH_SUBSCRIPTION_ENCRYPTION_KEY?.trim();

  if (!publicKey) issues.push("vapid_public_key_missing");
  else if (base64UrlBytes(publicKey)?.length !== 65) issues.push("vapid_public_key_invalid");

  if (!privateKey) issues.push("vapid_private_key_missing");
  else if (base64UrlBytes(privateKey)?.length !== 32) issues.push("vapid_private_key_invalid");

  if (!subject) issues.push("vapid_subject_missing");
  else if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) issues.push("vapid_subject_invalid");

  if (!encryption) issues.push("encryption_key_missing");
  else if (Buffer.from(encryption, "base64").length !== 32) issues.push("encryption_key_invalid");

  return issues;
}

export function isPushConfigured(source: Record<string, string | undefined> = process.env) {
  return pushConfigIssues(source).length === 0;
}
