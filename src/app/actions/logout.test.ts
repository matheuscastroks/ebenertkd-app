import { beforeEach, expect, it, vi } from "vitest";
import { logoutAction } from "./auth";

const mocks = vi.hoisted(() => ({ revoke: vi.fn(), profile: vi.fn(), deleteSession: vi.fn(), deleteCookie: vi.fn(), session: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: mocks.deleteCookie }), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/appwrite/session", () => ({ createAppwriteSessionClient: mocks.session, appwriteSessionCookie: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/features/notifications/push-service", () => ({ revokePushSubscription: mocks.revoke }));
vi.mock("@/features/auth/service", () => ({ confirmPasswordRecovery: vi.fn(), assertMinorLoginAllowed: vi.fn(), clearMinorLoginAttempts: vi.fn(), createAdultAccount: vi.fn(), createEmailSession: vi.fn(), requestPasswordRecovery: vi.fn(), resolveMinorEmail: vi.fn(), promoteMinorToAdult: vi.fn(), writeAuditEvent: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.mockResolvedValue({ $id: "profile-current", account_id: "account-current" });
  mocks.session.mockResolvedValue({ account: { deleteSession: mocks.deleteSession } });
  mocks.revoke.mockResolvedValue(undefined);
  mocks.deleteSession.mockResolvedValue(undefined);
});

it("revoga só endpoint informado vinculado ao perfil autenticado antes de excluir sessão", async () => {
  const data = new FormData(); data.set("push_endpoint", "https://push.example/current");
  await expect(logoutAction(data)).rejects.toThrow("redirect:/");
  expect(mocks.revoke).toHaveBeenCalledWith({ $id: "profile-current", account_id: "account-current" }, "https://push.example/current");
  expect(mocks.revoke.mock.invocationCallOrder[0]).toBeLessThan(mocks.deleteSession.mock.invocationCallOrder[0]);
  expect(mocks.deleteSession).toHaveBeenCalledWith({ sessionId: "current" });
  expect(mocks.deleteCookie).toHaveBeenCalledTimes(1);
});

it("falhas de push e sessão remota não impedem apagar cookie e sair", async () => {
  mocks.revoke.mockRejectedValue(new Error("push unavailable"));
  mocks.deleteSession.mockRejectedValue(new Error("session expired"));
  const data = new FormData(); data.set("push_endpoint", "https://push.example/current");
  await expect(logoutAction(data)).rejects.toThrow("redirect:/");
  expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
  expect(mocks.deleteCookie).toHaveBeenCalledTimes(1);
});

it("sem endpoint não revoga inscrições de outros aparelhos", async () => {
  await expect(logoutAction()).rejects.toThrow("redirect:/");
  expect(mocks.revoke).not.toHaveBeenCalled();
  expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
});
