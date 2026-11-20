import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/app/actions/exams", () => ({ cancelExamEventAction: vi.fn(), cancelExamParticipantAction: vi.fn() }));
vi.mock("@/features/exams/service", () => ({ getExamEventBundle: vi.fn() }));
vi.mock("@/features/academy/config-service", () => ({ getBeltRanks: vi.fn(async () => []), getPolicy: vi.fn(async () => ({ allow_skip_grades: false })) }));
vi.mock("@/features/academy/belt-rules", () => ({ beltNameOf: () => "Amarela", examTargetRanks: () => ["gub-8"], toPublicRank: (rank: unknown) => rank }));
vi.mock("@/features/billing/components/exam-result-actions", () => ({ ExamResultActions: () => null }));
vi.mock("@/features/exams/components/enroll-participant-form", () => ({ EnrollParticipantForm: () => null }));
vi.mock("@/features/students/components/student-avatar", () => ({ StudentAvatar: () => null }));
vi.mock("@/features/students/components/belt-badge", () => ({ BeltBadge: () => null }));
import { getExamEventBundle } from "@/features/exams/service";
import { ExamBundleSections } from "./exam-board";

const bundle = (status: string) => ({
  event: { $id: "e1", name: "Exame de novembro", status, event_date: "2099-11-30", default_fee_cents: 8000 },
  participants: [],
  eligibleStudents: [{ student: { $id: "s1", full_name: "Ana Silva", rank_key: "gub-9" }, photoDocumentId: null }],
});

describe("banca de exame", () => {
  it("não repete os indicadores num resumo e liga a inscrição à Aptidão", async () => {
    vi.mocked(getExamEventBundle).mockResolvedValue(bundle("open") as never);
    render(await ExamBundleSections({ eventId: "e1" }));
    expect(screen.queryByText("Resumo do exame")).not.toBeInTheDocument();
    expect(screen.getAllByText("Arrecadação prevista")).toHaveLength(1);
    expect(screen.getByText("Inscrever alunos")).toBeInTheDocument();
    expect(screen.getByText(/Taxa padrão R\$\s?80,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver quem cumpriu tempo e presenças/ })).toHaveAttribute("href", "/admin/eventos/exames/elegibilidade?status=eligible");
    expect(screen.getByText("Cancelar exame")).toBeInTheDocument();
  });

  it("esconde o cancelamento quando a banca já terminou", async () => {
    vi.mocked(getExamEventBundle).mockResolvedValue(bundle("completed") as never);
    render(await ExamBundleSections({ eventId: "e1" }));
    expect(screen.queryByText("Cancelar exame")).not.toBeInTheDocument();
    expect(screen.getByText("Inscrições encerradas.")).toBeInTheDocument();
    expect(screen.queryByText(/Homologada/)).not.toBeInTheDocument();
  });
});
