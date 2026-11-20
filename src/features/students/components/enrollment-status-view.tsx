"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  FileCheck2,
  FileText,
  ImageIcon,
  Pencil,
} from "@/components/ui/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import type { TrainingClass } from "@/features/classes/types";
import type { EnrollmentBundle, EnrollmentStatus } from "@/features/students/types";
import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { rankFullLabel } from "@/features/academy/belt-rules";
import { formatAddress, parseAddress } from "@/lib/address";
import { formatBusinessDateBr } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { StudentAvatar } from "./student-avatar";

type StatusMeta = {
  badge: string;
  tone: "info" | "success" | "warning" | "danger" | "neutral";
  title: string;
  description: string;
  stageIndex: number | null; // 0 = sent, 1 = under_review, 2 = awaiting_signature, 3 = all done
  showContractsCta?: boolean;
  contractsCtaLabel?: string;
};

const STATUS_META: Record<Exclude<EnrollmentStatus, "draft">, StatusMeta> = {
  submitted: {
    badge: "Ficha enviada",
    tone: "info",
    title: "Matrícula enviada para análise",
    description:
      "Seus dados e documentos foram recebidos. A coordenação está revisando a ficha para confirmar a turma e emitir o contrato.",
    stageIndex: 1,
  },
  under_review: {
    badge: "Em análise",
    tone: "info",
    title: "Matrícula em análise pela academia",
    description:
      "A coordenação já está conferindo seus dados e documentos. Assim que a revisão terminar, o contrato ficará disponível para assinatura.",
    stageIndex: 1,
  },
  awaiting_signature: {
    badge: "Aguardando assinatura",
    tone: "warning",
    title: "Ficha aprovada · Falta assinar o contrato",
    description:
      "Seus dados foram homologados. Assine o contrato digital para concluir a ativação da matrícula.",
    stageIndex: 2,
    showContractsCta: true,
    contractsCtaLabel: "Assinar contrato",
  },
  active: {
    badge: "Matrícula ativa",
    tone: "success",
    title: "Matrícula ativa e regular",
    description:
      "Sua ficha está homologada na academia. Você pode consultar o resumo abaixo ou atualizar algum dado quando precisar.",
    stageIndex: 3,
  },
  awaiting_renewal: {
    badge: "Renovação pendente",
    tone: "warning",
    title: "Matrícula aguardando renovação",
    description:
      "O ciclo atual está encerrando. Acesse seus contratos para conferir e renovar sua matrícula.",
    stageIndex: null,
    showContractsCta: true,
    contractsCtaLabel: "Ver contratos",
  },
  paused: {
    badge: "Pausada",
    tone: "neutral",
    title: "Matrícula pausada",
    description:
      "Sua matrícula está temporariamente pausada. Fale com a coordenação quando quiser retomar os treinos.",
    stageIndex: null,
  },
  cancelled: {
    badge: "Encerrada",
    tone: "danger",
    title: "Matrícula encerrada",
    description:
      "Esta matrícula foi encerrada. Se desejar retornar às aulas, entre em contato com a academia.",
    stageIndex: null,
  },
};

const PIPELINE_STAGES = [
  "Ficha enviada",
  "Análise da academia",
  "Contrato e ativação",
] as const;

const DOCUMENT_LABELS = {
  profile_photo: "Foto do aluno",
  medical_certificate: "Atestado médico",
} as const;

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando análise",
  approved: "Aprovado",
  rejected: "Precisa de correção",
};

function formatCpfMask(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return value || "Não informado";
}

function formatPhoneDisplay(value?: string | null): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value || "Não informado";
}

function formatSubmittedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function EnrollmentStatusView({
  bundle,
  classes,
  contractsHref,
  onEdit,
}: {
  bundle: EnrollmentBundle;
  classes: TrainingClass[];
  contractsHref?: string;
  onEdit: (initialStep?: number) => void;
}) {
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const { student, enrollment, documents } = bundle;
  const status = enrollment.status === "draft" ? "submitted" : enrollment.status;
  const meta = STATUS_META[status];

  const profilePhoto = documents.find(
    (doc) => doc.document_type === "profile_photo" && doc.status !== "rejected"
  );
  const rejectedDocuments = documents.filter((doc) => doc.status === "rejected");

  const trainingClass = classes.find((item) => item.$id === student.training_class_id);
  const classSummary = trainingClass
    ? `${trainingClass.name} · ${trainingClass.start_time}–${trainingClass.end_time}`
    : student.training_class || "Definida na aprovação";

  const beltSummary = student.rank_key ? rankFullLabel(ranks, student.rank_key, levelLabel) : "Não informada";

  const dueDay = enrollment.approved_due_day ?? enrollment.requested_due_day;
  const parsedAddress = parseAddress(student.address);
  const addressSummary =
    formatAddress(parsedAddress) || student.address || "Não informado";
  const submittedLabel = formatSubmittedDate(enrollment.submitted_at);
  const emergencySummary = student.emergency_contact_name
    ? `${student.emergency_contact_name}${
        student.emergency_contact_relationship
          ? ` (${student.emergency_contact_relationship})`
          : ""
      } · ${formatPhoneDisplay(student.emergency_contact_phone)}`
    : "Não informado";

  const canEdit = status !== "cancelled";

  return (
    <section
      aria-labelledby="enrollment-status-heading"
      className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs"
    >
      {/* Cabeçalho de Status + Ações */}
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <StudentAvatar
              name={student.full_name}
              photoDocumentId={profilePhoto?.$id}
              size="md"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={meta.tone}>{meta.badge}</StatusBadge>
                {submittedLabel ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    <Clock className="size-3" aria-hidden="true" />
                    Enviada em {submittedLabel}
                  </span>
                ) : null}
              </div>
              <h2
                id="enrollment-status-heading"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                {meta.title}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {meta.showContractsCta && contractsHref ? (
              <Button asChild size="sm" className="min-h-10">
                <Link href={contractsHref}>
                  <FileCheck2 className="size-4" aria-hidden="true" />
                  {meta.contractsCtaLabel ?? "Ver contratos"}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant={meta.showContractsCta ? "outline" : "secondary"}
                size="sm"
                className="min-h-10"
                onClick={() => onEdit(0)}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Atualizar dados
              </Button>
            ) : null}
          </div>
        </div>

        {/* Trilha de Progresso de 3 Etapas (Apple HIG) */}
        {meta.stageIndex !== null ? (
          <ol
            aria-label="Etapas da matrícula"
            className="grid grid-cols-1 gap-2 rounded-lg bg-muted/40 p-2 sm:grid-cols-3"
          >
            {PIPELINE_STAGES.map((label, index) => {
              const done = index < meta.stageIndex!;
              const current = index === meta.stageIndex;
              return (
                <li
                  key={label}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium",
                    current
                      ? "bg-card text-foreground shadow-xs"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                      done
                        ? "bg-success/15 text-success-foreground"
                        : current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>

      {/* Alerta de Correção de Documentos (se houver rejeição) */}
      {rejectedDocuments.length > 0 ? (
        <div
          role="alert"
          className="flex flex-col gap-3 bg-warning/10 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-warning-foreground"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-sm">
              <p className="font-medium text-foreground">
                Documento precisa de correção
              </p>
              <p className="text-muted-foreground">
                {rejectedDocuments
                  .map(
                    (doc) =>
                      `${DOCUMENT_LABELS[doc.document_type]}: ${
                        doc.rejection_reason || "envie uma nova versão legível"
                      }`
                  )
                  .join(" · ")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 shrink-0"
            onClick={() => onEdit(3)}
          >
            Corrigir documentos
          </Button>
        </div>
      ) : null}

      {/* Resumo Estruturado em 2 Colunas (sem scroll, sem excesso de cards) */}
      <div className="grid grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="space-y-2.5 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identificação e contato
          </h3>
          <dl className="divide-y divide-border">
            <SummaryRow label="Aluno" value={student.full_name} />
            <SummaryRow label="CPF" value={formatCpfMask(student.cpf)} />
            <SummaryRow
              label="Nascimento"
              value={
                student.birth_date
                  ? formatBusinessDateBr(student.birth_date)
                  : "Não informada"
              }
            />
            <SummaryRow
              label="WhatsApp"
              value={formatPhoneDisplay(student.whatsapp)}
            />
            <SummaryRow label="Endereço" value={addressSummary} />
          </dl>
        </div>

        <div className="space-y-2.5 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Treino e saúde
          </h3>
          <dl className="divide-y divide-border">
            <SummaryRow label="Turma" value={classSummary} />
            <SummaryRow label="Graduação" value={beltSummary} />
            <SummaryRow
              label="Vencimento"
              value={dueDay ? `Todo dia ${dueDay}` : "A definir"}
            />
            <SummaryRow label="Emergência" value={emergencySummary} />
            <SummaryRow
              label="Condição de saúde"
              value={
                student.health_condition === "yes"
                  ? student.health_details || "Sim (informada)"
                  : student.health_condition === "no"
                    ? "Nenhuma informada"
                    : "Não informada"
              }
            />
          </dl>
        </div>
      </div>

      {/* Documentos Enviados */}
      {documents.length > 0 ? (
        <div className="space-y-2.5 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos enviados
          </h3>
          <div className="flex flex-wrap gap-3">
            {documents.map((document) => (
              <Attachment key={document.$id}>
                <AttachmentMedia>
                  {document.document_type === "profile_photo" ? (
                    <ImageIcon aria-hidden="true" />
                  ) : (
                    <FileText aria-hidden="true" />
                  )}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>
                    <Link
                      className="inline-flex min-h-11 items-center underline"
                      href={`/api/student-documents/${document.$id}`}
                    >
                      {DOCUMENT_LABELS[document.document_type]}
                    </Link>
                  </AttachmentTitle>
                  <AttachmentDescription>
                    {document.status === "rejected"
                      ? document.rejection_reason
                        ? `Correção: ${document.rejection_reason}`
                        : "Precisa de correção"
                      : DOCUMENT_STATUS_LABELS[document.status] ?? document.status}
                  </AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
