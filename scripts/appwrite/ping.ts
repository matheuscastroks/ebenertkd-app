import { loadProjectEnv } from "../environment/load";
import { Client } from "appwrite";
import { readPublicAppwriteConfig } from "../../src/lib/appwrite/config";

loadProjectEnv();

async function run() {
  const config = readPublicAppwriteConfig();
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId);
  await client.ping();
  console.log("Appwrite ping OK.");
}

void run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Não foi possível conectar ao Appwrite.");
  process.exitCode = 1;
});
