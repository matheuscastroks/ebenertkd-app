import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { submitEnrollmentAction } from "@/app/actions/enrollment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/enrollment", () => ({
  saveEnrollmentDraftAction: vi.fn(),
  submitEnrollmentAction: vi.fn()
}));

import { EnrollmentForm } from "@/features/students/components/enrollment-form";
import type { Enrollment, EnrollmentBundle, Student, StudentDocument } from "@/features/students/types";
import type { TrainingClass } from "@/features/classes/types";

describe("EnrollmentForm", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());
  const student = {
    $id: "student-1",
    full_name: "Guilherme Santos",
    cpf: "12345678901",
    birth_date: "2010-05-15",
    whatsapp: "11999999999",
    address: "Rua do Dojô, 100",
    emergency_contact_name: "Marta Santos",
    emergency_contact_relationship: "Mãe",
    emergency_contact_phone: "11988888888",
    started_at_tkd: "2020-01-10",
    rank_key: "gub-8",
    status: "draft"
  } as Student;

  const enrollment = {
    $id: "enrollment-1",
    student_id: "student-1",
    status: "draft",
    requested_due_day: 10,
    revision: 1
  } as Enrollment;

  const documents = [
    {
      $id: "doc-1",
      student_id: "student-1",
      document_type: "profile_photo",
      file_id: "file-1",
      original_name: "foto.jpg",
      mime_type: "image/jpeg",
      size_bytes: 1024,
      status: "pending",
      uploaded_by_account_id: "acc-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    },
    {
      $id: "doc-2",
      student_id: "student-1",
      document_type: "medical_certificate",
      file_id: "file-2",
      original_name: "atestado.pdf",
      mime_type: "application/pdf",
      size_bytes: 2048,
      status: "rejected",
      rejection_reason: "Documento ilegível",
      uploaded_by_account_id: "acc-1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    }
  ] as unknown as StudentDocument[];

  const classes = [
    {
      $id: "class-1",
      name: "Infantil Manhã",
      weekdays: ["segunda", "quarta"],
      start_time: "09:00",
      end_time: "10:00",
      status: "active"
    }
  ] as unknown as TrainingClass[];

  const bundle: EnrollmentBundle = { student, enrollment, documents };

  it("renders form sections with translated document status labels", () => {
    render(<EnrollmentForm bundle={bundle} targetProfileId="profile-1" classes={classes} />);

    expect(screen.getByText("Ficha de matrícula")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Guilherme Santos")).toBeInTheDocument();
    // Verify formatted phone inputs:
    expect(screen.getByDisplayValue("(11) 9 9999-9999")).toBeInTheDocument();
    expect(screen.getByDisplayValue("(11) 9 8888-8888")).toBeInTheDocument();

    // Verify translated document statuses:
    expect(screen.getByText("Aguardando análise")).toBeInTheDocument();
    expect(screen.getByText("Correção: Documento ilegível")).toBeInTheDocument();

    // Verify submit and save buttons are present:
    expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avançar" })).toBeInTheDocument();
  });
  it("não avança com dados pessoais inválidos e usa teclado numérico", () => {
    render(<EnrollmentForm bundle={{ ...bundle, student: { ...student, full_name: "" } }} targetProfileId="p1" classes={classes} />);
    expect(screen.getByLabelText(/CPF/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/WhatsApp/)).toHaveAttribute("inputmode", "numeric");
    fireEvent.click(screen.getByRole("button", { name: "Avançar" }));
    expect(screen.getByText("Passo 1 de 4 · Dados pessoais")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Confira os campos obrigatórios");
  });
  it("restaura o que foi digitado após remontar o formulário", () => {
    const first = render(<EnrollmentForm bundle={bundle} targetProfileId="p1" classes={classes} />);
    fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: "Ana Silva" } });
    expect(screen.getByText(/Rascunho salvo/)).toBeInTheDocument();
    first.unmount();
    render(<EnrollmentForm bundle={bundle} targetProfileId="p1" classes={classes} />);
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Ana Silva");
  });
  it("limpa rascunho apenas ao receber sucesso explícito", () => {
    const key = "enrollment-draft:p1:enrollment-1:1";
    localStorage.setItem(key, JSON.stringify({ full_name: "Ana" }));
    localStorage.setItem("enrollment-draft:p1:enrollment-1:0", JSON.stringify({ full_name: "Revisão anterior" }));
    render(<EnrollmentForm bundle={bundle} targetProfileId="p1" classes={classes} feedback={{ tone: "success", title: "Dados salvos" }} />);
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem("enrollment-draft:p1:enrollment-1:0")).toBeNull();
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Guilherme Santos");
  });
  it("preserva rascunho em erro e mostra o tom explícito", () => {
    localStorage.setItem("enrollment-draft:p1:enrollment-1:1", JSON.stringify({ full_name: "Ana Silva" }));
    render(<EnrollmentForm bundle={bundle} targetProfileId="p1" classes={classes} feedback={{ tone: "error", title: "Falha ao enviar" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao enviar");
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("Ana Silva");
    expect(localStorage.getItem("enrollment-draft:p1:enrollment-1:1")).not.toBeNull();
  });
  it("envia os quatro passos juntos com arquivo, selects e datas", async () => {
    const user = userEvent.setup();
    // jsdom serializa sua lista interna vazia, ignorando input.files de userEvent.upload.
    // Reproduz a serialização do navegador sem substituir a submissão React nem a action.
    const NativeFormData = globalThis.FormData;
    class BrowserFormData extends NativeFormData {
      constructor(form?: HTMLFormElement, submitter?: HTMLElement | null) {
        super(form, submitter);
        form?.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => {
          if (!input.name || !input.files?.length) return;
          this.delete(input.name);
          Array.from(input.files).forEach((file) => this.append(input.name, file));
        });
      }
    }
    vi.stubGlobal("FormData", BrowserFormData);
    vi.mocked(submitEnrollmentAction).mockResolvedValue(undefined as never);
    render(<EnrollmentForm bundle={{ ...bundle, student: {
      ...student,
      address: JSON.stringify({ street: "Rua Central", number: "10", neighborhood: "Centro", city: "Rio de Janeiro", state: "RJ", cep: "20000000" }),
      health_condition: "no", training_class_id: "class-1",
    } }} targetProfileId="profile-integration" classes={classes} />);
    await user.click(screen.getByRole("button", { name: "Avançar" }));
    expect(screen.getByText("Passo 2 de 4 · Saúde")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Avançar" }));
    expect(screen.getByText("Passo 3 de 4 · Treino")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Avançar" }));
    expect(screen.getByText("Passo 4 de 4 · Documentos")).toBeInTheDocument();
    const photo = new File(["foto"], "aluno.png", { type: "image/png" });
    const photoInput = screen.getByLabelText("Foto do aluno *") as HTMLInputElement;
    await user.upload(photoInput, photo);
    expect(photoInput.files?.[0]).toBe(photo);
    await user.click(screen.getByRole("button", { name: "Enviar para análise" }));
    await waitFor(() => expect(submitEnrollmentAction).toHaveBeenCalledOnce());
    const payload = vi.mocked(submitEnrollmentAction).mock.calls[0][0];
    expect(payload.get("target_profile_id")).toBe("profile-integration");
    expect(payload.get("full_name")).toBe("Guilherme Santos");
    expect(payload.get("emergency_contact_name")).toBe("Marta Santos");
    expect(payload.get("health_condition")).toBe("no");
    expect(payload.get("training_class_id")).toBe("class-1");
    expect(payload.get("requested_due_day")).toBe("10");
    expect(payload.get("birth_date")).toBe("2010-05-15");
    expect(payload.get("started_at_tkd")).toBe("2020-01-10");
    expect((payload.get("profile_photo") as File).name).toBe("aluno.png");
  });

  it("exibe tela de status da matrícula quando a ficha já foi enviada e permite abrir edição", async () => {
    const user = userEvent.setup();
    render(
      <EnrollmentForm
        bundle={{
          ...bundle,
          enrollment: {
            ...enrollment,
            status: "submitted",
            submitted_at: "2026-11-18T12:00:00Z",
          },
        }}
        targetProfileId="profile-1"
        classes={classes}
        contractsHref="/aluno/contratos"
      />
    );

    expect(screen.getByText("Matrícula enviada para análise")).toBeInTheDocument();
    expect(screen.queryByText("Passo 1 de 4 · Dados pessoais")).not.toBeInTheDocument();
    expect(screen.getByText("Documento precisa de correção")).toBeInTheDocument();

    // Clicar em Corrigir documentos abre direto no passo 4
    await user.click(screen.getByRole("button", { name: "Corrigir documentos" }));
    expect(screen.getByText("Passo 4 de 4 · Documentos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();

    // Voltar ao resumo retorna à tela de status
    await user.click(screen.getByRole("button", { name: /voltar ao resumo/i }));
    expect(screen.getByText("Matrícula enviada para análise")).toBeInTheDocument();
  });

  it("exibe atalho para assinar contrato quando a matrícula aguarda assinatura", () => {
    render(
      <EnrollmentForm
        bundle={{
          ...bundle,
          enrollment: { ...enrollment, status: "awaiting_signature" },
          documents: [documents[0]],
        }}
        targetProfileId="profile-1"
        classes={classes}
        contractsHref="/aluno/contratos"
      />
    );

    expect(screen.getByText("Ficha aprovada · Falta assinar o contrato")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /assinar contrato/i })).toHaveAttribute(
      "href",
      "/aluno/contratos"
    );
  });
});