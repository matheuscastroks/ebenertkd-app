import { beforeEach, expect, it, vi } from "vitest";
import { revokePushSubscription } from "./push-service";
import { endpointHash } from "./subscription-crypto";
import type { Profile } from "@/features/auth/types";

const mocks = vi.hoisted(() => ({ listRows: vi.fn(), updateRow: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({ tables: mocks, config: { databaseId: "test-only" } }) }));
vi.mock("@/features/notifications/preferences-service", () => ({ getNotificationPreferences: vi.fn(), pushAllowed: vi.fn() }));

const actor = { $id: "profile-current", account_id: "account-current" } as Profile;
beforeEach(() => { vi.clearAllMocks(); mocks.updateRow.mockResolvedValue({}); });

it("restringe revogação à conta autenticada e ao endpoint deste aparelho", async () => {
  mocks.listRows.mockResolvedValue({ rows: [{ $id: "device-current" }] });
  const endpoint = "https://push.example/current";
  await revokePushSubscription(actor, endpoint);
  const queries = mocks.listRows.mock.calls[0][0].queries.map((query: string) => JSON.parse(query));
  expect(queries).toEqual(expect.arrayContaining([
    expect.objectContaining({ method: "equal", attribute: "account_id", values: [actor.account_id] }),
    expect.objectContaining({ method: "equal", attribute: "endpoint_hash", values: [endpointHash(endpoint)] })
  ]));
  expect(mocks.updateRow).toHaveBeenCalledTimes(1);
  expect(mocks.updateRow.mock.calls[0][0]).toMatchObject({ rowId: "device-current", data: { status: "revoked" } });
});

it("não altera inscrições quando endpoint não pertence à conta", async () => {
  mocks.listRows.mockResolvedValue({ rows: [] });
  await revokePushSubscription(actor, "https://push.example/another-account");
  expect(mocks.updateRow).not.toHaveBeenCalled();
});
