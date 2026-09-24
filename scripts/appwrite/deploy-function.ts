import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client, Functions } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";
import { APPWRITE_IDS } from "../../src/lib/appwrite/ids";

loadEnvConfig(process.cwd());

const requested = process.argv[2];
if (requested !== APPWRITE_IDS.functions.dailyOperations && requested !== APPWRITE_IDS.functions.backup) {
  throw new Error(`Use: npm run appwrite:deploy-function -- <${APPWRITE_IDS.functions.dailyOperations}|${APPWRITE_IDS.functions.backup}>`);
}

async function main() {
  const config = readServerAppwriteConfig();
  const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
  const functions = new Functions(client);
  const source = path.join(process.cwd(), "appwrite", "functions", requested);
  const temporary = await mkdtemp(path.join(tmpdir(), "ebenertkd-function-"));
  const archive = path.join(temporary, `${requested}.tar.gz`);

  try {
    execFileSync("tar", ["-czf", archive, "-C", source, "."], { stdio: "inherit" });
    const deployment = await functions.createDeployment({ functionId: requested, code: InputFile.fromPath(archive, `${requested}.tar.gz`), activate: true, entrypoint: "src/main.js", commands: "npm install" });
    process.stdout.write(`Deployment ${deployment.$id} queued for ${requested}.\n`);
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const current = await functions.getDeployment({ functionId: requested, deploymentId: deployment.$id });
      if (current.status === "ready") {
        process.stdout.write(`Deployment ${deployment.$id} is ready and active.\n`);
        ready = true;
        break;
      }
      if (current.status === "failed" || current.status === "canceled") throw new Error(current.buildLogs || `Deployment ${current.status}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (!ready) throw new Error(`Timed out waiting for deployment ${deployment.$id}`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
