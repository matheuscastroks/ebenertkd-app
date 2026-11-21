import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ profile: vi.fn(), getRow: vi.fn(), listRows: vi.fn(), download: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: mocks.profile }));
vi.mock("@/lib/appwrite/server", () => ({ createAppwriteAdminClient: () => ({
  config: { databaseId: "db" }, tables: { getRow: mocks.getRow, listRows: mocks.listRows }, storage: { getFileDownload: mocks.download }
}) }));
import { GET } from "./route";

const request = () => GET(new Request("https://example.com/avatar"), { params: Promise.resolve({ eventId: "event", studentId: "student" }) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.profile.mockResolvedValue({ capabilities: ["student"] });
  mocks.getRow.mockResolvedValue({ status: "registration_open", starts_at: "2099-01-01T12:00:00Z", event_type: "seminar" });
});
describe("foto de aluno inscrito", () => {
  it("exige autenticação", async () => {
    mocks.profile.mockResolvedValue(null);
    expect((await request()).status).toBe(401);
  });
  it("oculta eventos em rascunho", async () => {
    mocks.getRow.mockResolvedValue({ status: "draft" });
    expect((await request()).status).toBe(404);
  });
  it("não libera foto de inscrição cancelada ou em espera", async () => {
    mocks.listRows.mockResolvedValue({ rows: [{ status: "cancelled" }, { status: "waitlisted" }] });
    expect((await request()).status).toBe(404);
  });
  it("não serve documentos médicos como avatar", async () => {
    mocks.listRows.mockResolvedValueOnce({ rows: [{ status: "confirmed" }] }).mockResolvedValueOnce({ rows: [{ document_type: "medical_certificate", mime_type: "image/jpeg", status: "approved" }] });
    expect((await request()).status).toBe(404);
  });
  it("serve a foto de perfil de participante com vaga reservada", async () => {
    mocks.listRows.mockResolvedValueOnce({ rows: [{ status: "confirmed" }] }).mockResolvedValueOnce({ rows: [{ document_type: "profile_photo", mime_type: "image/webp", status: "approved", file_id: "photo" }] });
    mocks.download.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const response = await request();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});
