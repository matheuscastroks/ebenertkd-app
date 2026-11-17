import assert from "node:assert/strict";

type Environment = Record<string, string | undefined>;
const KNOWN_PRODUCTION_PROJECT_ID = "6ab4c32e00317977eeb6";

/** Pure environment validation: no browser, network, filesystem or global mutable state. */
export function assertIsolatedEnvironment(source: Environment = process.env) {
  const isolated = source.E2E_APPWRITE_PROJECT_ID?.trim();
  assert(isolated, "Configure E2E_APPWRITE_PROJECT_ID with a separate disposable project.");
  const production = source.PRODUCTION_APPWRITE_PROJECT_ID?.trim();
  assert(isolated !== KNOWN_PRODUCTION_PROJECT_ID && isolated !== production, "Authenticated E2E must never target a production Appwrite project.");
  assert.equal(source.NEXT_PUBLIC_APPWRITE_PROJECT_ID, isolated, "The application must use E2E_APPWRITE_PROJECT_ID.");
  if (source.APPWRITE_PROJECT_ID) assert.equal(source.APPWRITE_PROJECT_ID, isolated, "The server project must also be isolated.");
  const target = new URL(source.E2E_BASE_URL || "http://127.0.0.1:3101");
  assert.equal(target.protocol, "http:", "The managed isolated application uses HTTP on loopback only.");
  assert(["127.0.0.1", "localhost", "[::1]"].includes(target.hostname), "Authenticated mutations require a local application whose environment can be verified; remote deployments are not trusted by this guard.");
}
