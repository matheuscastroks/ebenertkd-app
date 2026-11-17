import { beforeEach, expect, it, vi } from "vitest";
import { deleteSelfAccountAction, deleteStudentAccountAction } from "./account-deletion";

const mocks = vi.hoisted(() => ({ profile: vi.fn(), deleteSelf: vi.fn(), deleteStudent: vi.fn() }));
// O redirect do Next lança uma exceção; o teste imita isso para provar que o sucesso não cai no catch.
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireProfile: mocks.profile }));
vi.mock("@/features/auth/account-deletion-service", () => ({ deleteSelfAccount: mocks.deleteSelf, deleteStudentAccount: mocks.deleteStudent }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.deleteSelf.mockResolvedValue(undefined);
  mocks.deleteStudent.mockResolvedValue(undefined);
});

it("após excluir a própria conta volta à entrada com aviso de conta excluída", async () => {
  mocks.profile.mockResolvedValue({ $id: "p1", role: "adult_student" });
  await expect(deleteSelfAccountAction(new FormData())).rejects.toThrow("redirect:/?deleted=1");
});

it("falha ao excluir a própria conta volta às configurações com erro", async () => {
  mocks.profile.mockResolvedValue({ $id: "p1", role: "adult_student" });
  mocks.deleteSelf.mockRejectedValue(new Error("appwrite down"));
  await expect(deleteSelfAccountAction(new FormData())).rejects.toThrow("redirect:/configuracoes?error=delete_self");
});

it("professor que exclui um aluno volta à lista com confirmação", async () => {
  mocks.profile.mockResolvedValue({ $id: "admin", role: "admin" });
  const data = new FormData(); data.set("target_profile_id", "student-1");
  await expect(deleteStudentAccountAction(data)).rejects.toThrow(/redirect:.*\?deleted=1$/);
  expect(mocks.deleteStudent).toHaveBeenCalledWith({ $id: "admin", role: "admin" }, "student-1");
});

it("falha ao excluir aluno volta à lista com erro", async () => {
  mocks.profile.mockResolvedValue({ $id: "admin", role: "admin" });
  mocks.deleteStudent.mockRejectedValue(new Error("not allowed"));
  const data = new FormData(); data.set("target_profile_id", "student-1");
  await expect(deleteStudentAccountAction(data)).rejects.toThrow(/redirect:.*\?error=delete_student$/);
});
