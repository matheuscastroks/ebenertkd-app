import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ listed: [] as string[], created: [] as Array<{ tableId: string; data: Record<string, unknown> }>, policyRows: [] as Array<Record<string, unknown>>, contracts: [] as Array<Record<string, unknown>>, enrollments: [] as Array<Record<string, unknown>> }));

vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));
vi.mock("node-appwrite", () => {
  class AppwriteException extends Error {
    constructor(message: string, readonly code = 500) {
      super(message);
    }
  }
  class Client {
    setEndpoint() { return this; }
    setProject() { return this; }
    setKey() { return this; }
  }
  const query = (name: string) => (...args: unknown[]) => ({ name, args });
  class TablesDB {
    async listRows({ tableId }: { tableId: string }) {
      calls.listed.push(tableId);
      const rows = tableId === "academy_policies" ? calls.policyRows : tableId === "contracts" ? calls.contracts : tableId === "enrollments" ? calls.enrollments : [];
      return { rows };
    }
    async createRow({ tableId, data }: { tableId: string; data: Record<string, unknown> }) {
      calls.created.push({ tableId, data });
      return { $id: "row", ...data };
    }
    async updateRow() { return {}; }
    async getRow() { return {}; }
  }
  return { AppwriteException, Client, TablesDB, Query: { equal: query("equal"), limit: query("limit"), orderDesc: query("orderDesc"), cursorAfter: query("cursorAfter") } };
});

import main from "./main.js";

const run = () => {
  const response = { json: vi.fn((body: unknown, status?: number) => ({ body, status })) };
  return main({ req: { headers: { "x-appwrite-key": "key" } }, res: response, log: vi.fn(), error: vi.fn() }).then((result: unknown) => ({ result, response }));
};

beforeEach(() => {
  calls.listed = [];
  calls.created = [];
  calls.policyRows = [];
  calls.contracts = [];
  calls.enrollments = [];
  process.env.APPWRITE_FUNCTION_API_ENDPOINT = "https://example.test/v1";
  process.env.APPWRITE_FUNCTION_PROJECT_ID = "project";
});

describe("daily-operations lê a política da academia", () => {
  it("consulta academy_policies uma única vez por execução", async () => {
    calls.policyRows = [{ section: "notifications", data_json: JSON.stringify({ payment_stages: [-5, 0], overdue_weekly_from_day: 9 }) }];
    await run();
    expect(calls.listed.filter((tableId) => tableId === "academy_policies")).toHaveLength(1);
    expect(calls.listed[0]).toBe("academy_policies");
  });

  it("sem linhas de política a rotina conclui com os defaults", async () => {
    const { result } = await run();
    expect(result).toMatchObject({ body: { ok: true } });
    expect(calls.created.some((item) => item.tableId === "automation_runs")).toBe(true);
  });

  it("a antecedência de geração da mensalidade vem da política", async () => {
    // 15/03/2027: faltam 17 dias para a competência de abril.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-03-15T12:00:00.000Z"));
    const nextMonth = "2027-04";
    const daysToNextMonth = 17;
    calls.contracts = [{ $id: "c1", enrollment_id: "e1", student_id: "s1", status: "signed", starts_at: "2027-03-01T00:00:00.000Z", ends_at: "2028-03-01T00:00:00.000Z", monthly_fee_cents: 15000 }];
    calls.enrollments = [{ $id: "e1", student_id: "s1", status: "active", approved_due_day: 10 }];

    const nextCompetenceCreated = () => calls.created.some((item) => item.tableId === "charges" && item.data.competence === nextMonth);

    calls.policyRows = [{ section: "billing", data_json: JSON.stringify({ charge_lead_days: daysToNextMonth - 1 }) }];
    await run();
    expect(nextCompetenceCreated()).toBe(false);

    calls.created = [];
    calls.policyRows = [{ section: "billing", data_json: JSON.stringify({ charge_lead_days: daysToNextMonth }) }];
    await run();
    expect(nextCompetenceCreated()).toBe(true);
    vi.useRealTimers();
  });
});
