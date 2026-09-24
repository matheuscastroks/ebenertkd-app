import { loadEnvConfig } from "@next/env";
import { Client, Functions } from "node-appwrite";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

loadEnvConfig(process.cwd());

async function main() {
  const config = readServerAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const functions = new Functions(client);
  const definition = await functions.get({ functionId: APPWRITE_IDS.functions.dailyOperations });
  process.stdout.write(`Scopes: ${definition.scopes.join(", ")}\n`);
  const execution = await functions.createExecution({ functionId: APPWRITE_IDS.functions.dailyOperations, async: false });
  process.stdout.write(`${execution.status}: ${execution.responseBody || "sem resposta"}\n`);
  if (execution.status === "failed" || execution.responseStatusCode >= 400) {
    if (execution.errors) process.stderr.write(`${execution.errors}\n`);
    if (execution.logs) process.stderr.write(`${execution.logs}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
