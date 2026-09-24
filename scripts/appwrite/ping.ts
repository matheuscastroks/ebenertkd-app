import { Client } from "appwrite";
import { APPWRITE_PROJECT } from "../../src/lib/appwrite/browser";

const client = new Client()
  .setEndpoint(APPWRITE_PROJECT.endpoint)
  .setProject(APPWRITE_PROJECT.id);

client
  .ping()
  .then(() => console.log(`Appwrite ping OK: ${APPWRITE_PROJECT.name}`))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });

