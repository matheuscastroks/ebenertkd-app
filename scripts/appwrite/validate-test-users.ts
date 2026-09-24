import { loadEnvConfig } from "@next/env";
import { Account, Client, Query, TablesDB } from "node-appwrite";
import { APPWRITE_IDS, APPWRITE_SESSION_COOKIE } from "../../src/lib/appwrite/ids";
import { readServerAppwriteConfig } from "../../src/lib/appwrite/config";

loadEnvConfig(process.cwd());

const cases = [
  { role: "admin", email: "admin.teste@ebenertkd.app", password: "Admin@Teste2026!", route: "/admin", marker: "Professor Teste" },
  { role: "adult", email: "aluno.teste@ebenertkd.app", password: "Aluno@Teste2026!", route: "/aluno", marker: "Aluno Adulto Teste" },
  { role: "guardian", email: "responsavel.teste@ebenertkd.app", password: "Resp@Teste2026!", route: "/responsavel", marker: "Responsável Teste" },
  { role: "minor", email: "menor.teste@minor.ebenertkd.internal", password: "Menor@Teste2026!", route: "/aluno", marker: "Aluno Menor Teste" }
] as const;

async function main() {
  const config = readServerAppwriteConfig();
  for (const testCase of cases) {
    const authClient = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.apiKey);
    const session = await new Account(authClient).createEmailPasswordSession({
      email: testCase.email,
      password: testCase.password
    });
    const sessionClient = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setSession(session.secret);
    const account = await new Account(sessionClient).get();
    const profileRows = await new TablesDB(sessionClient).listRows({
      databaseId: APPWRITE_IDS.database,
      tableId: APPWRITE_IDS.tables.profiles,
      queries: [Query.equal("account_id", [account.$id]), Query.limit(1)]
    });
    if (!session.secret || profileRows.total !== 1) throw new Error(`${testCase.role} session/profile invalid`);
    const response = await fetch(`${config.appUrl}${testCase.route}`, {
      headers: { cookie: `${APPWRITE_SESSION_COOKIE}=${session.secret}` },
      redirect: "manual"
    });
    const body = await response.text();
    if (response.status !== 200 || !body.includes(testCase.marker)) {
      throw new Error(`${testCase.role} failed: HTTP ${response.status} ${response.headers.get("location") ?? ""}`);
    }
    await new Account(sessionClient).deleteSession({ sessionId: "current" });
    console.log(`- ${testCase.role}: ${testCase.route} OK`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
