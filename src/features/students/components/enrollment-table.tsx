"use client";

import Link from "next/link";
import { Eye, MoreHorizontal } from "@/components/ui/icons";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { SortableTableHead } from "@/components/shared/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rankOrder } from "@/features/academy/ranks";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { resolveStudentRank } from "@/features/students/journey-rules";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import type { DocumentType, Enrollment, Student } from "@/features/students/types";
import { useTableSort } from "@/hooks/use-table-sort";
import { adminEnrollmentPath } from "@/lib/navigation/routes";

export type EnrollmentRow = {
  student: Student;
  enrollment: Enrollment | null;
  profilePhotoDocumentId?: string;
  pendingDocuments?: DocumentType[];
  rejectedDocuments?: DocumentType[];
};

const status: Record<string, { label: string; tone: StatusTone }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  submitted: { label: "Enviada", tone: "info" },
  under_review: { label: "Em análise", tone: "warning" },
  awaiting_signature: { label: "Aguardando assinatura", tone: "warning" },
  active: { label: "Ativa", tone: "success" },
  paused: { label: "Pausada", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "danger" },
  awaiting_renewal: { label: "Aguardando renovação", tone: "warning" },
};

function EnrollmentStatus({ value }: { value?: string }) {
  const item = value ? status[value] : undefined;
  return <StatusBadge tone={item?.tone ?? "neutral"}>{item?.label ?? "Sem matrícula"}</StatusBadge>;
}

const DOC_LABEL: Record<DocumentType, string> = {
  profile_photo: "foto",
  medical_certificate: "atestado médico",
};

function formatDocList(docs: DocumentType[]): string {
  if (docs.length === 0) return "";
  if (docs.length === 1) return DOC_LABEL[docs[0]];
  return "foto e atestado";
}

export type EnrollmentActionSummary = {
  hint?: string;
  needsAdminReview: boolean;
  primaryLabel: string;
  primaryHref: string;
};

/** Resume quem precisa agir e o que está pendente em cada linha da tabela. */
export function describeEnrollmentAction(row: EnrollmentRow): EnrollmentActionSummary {
  const basePath = adminEnrollmentPath(row.student.$id);
  const pendingDocs = row.pendingDocuments ?? [];
  const rejectedDocs = row.rejectedDocuments ?? [];
  const enrollmentStatus = row.enrollment?.status;
  const hasPendingDocs = pendingDocs.length > 0;

  if (enrollmentStatus === "submitted") {
    return {
      hint: hasPendingDocs
        ? `Sua revisão: ficha e ${formatDocList(pendingDocs)}`
        : "Sua revisão: aprovar ficha",
      needsAdminReview: true,
      primaryLabel: "Revisar ficha",
      primaryHref: basePath,
    };
  }

  if (enrollmentStatus === "under_review") {
    return {
      hint: hasPendingDocs
        ? `Sua revisão: ${formatDocList(pendingDocs)} e valores`
        : "Sua revisão: concluir análise",
      needsAdminReview: true,
      primaryLabel: "Continuar análise",
      primaryHref: basePath,
    };
  }

  if (hasPendingDocs) {
    return {
      hint: `Sua revisão: validar ${formatDocList(pendingDocs)}`,
      needsAdminReview: true,
      primaryLabel: "Revisar docs",
      primaryHref: `${basePath}#documentos`,
    };
  }

  if (enrollmentStatus === "awaiting_signature") {
    return {
      hint: "Aguardando aluno: assinatura do contrato",
      needsAdminReview: false,
      primaryLabel: "Ver contrato",
      primaryHref: `${basePath}#contrato`,
    };
  }

  if (enrollmentStatus === "awaiting_renewal") {
    return {
      hint: "Contrato aguardando renovação",
      needsAdminReview: false,
      primaryLabel: "Renovar",
      primaryHref: `${basePath}#contrato`,
    };
  }

  if (rejectedDocs.length > 0) {
    return {
      hint: `Aguardando aluno: reenvio de ${formatDocList(rejectedDocs)}`,
      needsAdminReview: false,
      primaryLabel: "Ver docs",
      primaryHref: `${basePath}#documentos`,
    };
  }

  if (enrollmentStatus === "draft") {
    return {
      hint: "Aguardando aluno: concluir ficha",
      needsAdminReview: false,
      primaryLabel: "Ver ficha",
      primaryHref: basePath,
    };
  }

  return {
    needsAdminReview: false,
    primaryLabel: "Ver ficha",
    primaryHref: basePath,
  };
}

function RowActions({
  studentId,
  studentName,
  action,
  mobile = false,
}: {
  studentId: string;
  studentName: string;
  action: EnrollmentActionSummary;
  mobile?: boolean;
}) {
  const basePath = adminEnrollmentPath(studentId);
  return (
    <div className="inline-flex items-center justify-end gap-1">
      <Button
        asChild
        size={mobile ? "default" : "sm"}
        variant={action.needsAdminReview ? "outline" : "ghost"}
        className={mobile ? "min-h-11 px-4 font-medium" : "min-h-11 gap-1.5 font-medium"}
      >
        <Link href={action.primaryHref}>
          <Eye className="size-4" aria-hidden="true" />
          {action.primaryLabel}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={`Mais ações para ${studentName}`}
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={basePath}>Abrir ficha completa</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${basePath}#documentos`}>Ir para documentos</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${basePath}#contrato`}>Ir para contrato</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type EnrollmentSortKey = "student" | "belt" | "class" | "due_day" | "status";

export function EnrollmentTable({ rows }: { rows: EnrollmentRow[] }) {
  const {
    sortedItems,
    sortKey,
    sortDirection,
    toggleSort,
  } = useTableSort<EnrollmentRow, EnrollmentSortKey>(
    [...rows].sort(
      (a, b) =>
        Number(!describeEnrollmentAction(a).needsAdminReview) -
        Number(!describeEnrollmentAction(b).needsAdminReview)
    ),
    {
      comparators: {
        student: (a, b) =>
          a.student.full_name.localeCompare(b.student.full_name, "pt-BR"),
        // Ordem de progressão do catálogo: asc = iniciante -> graduado; sem graduação conta como iniciante.
        belt: (a, b) =>
          rankOrder(resolveStudentRank(a.student.rank_key)) -
          rankOrder(resolveStudentRank(b.student.rank_key)),
        class: (a, b) =>
          (a.student.training_class ?? "").localeCompare(
            b.student.training_class ?? "",
            "pt-BR"
          ),
        due_day: (a, b) =>
          (a.enrollment?.requested_due_day ?? 99) -
          (b.enrollment?.requested_due_day ?? 99),
        status: (a, b) =>
          (status[a.enrollment?.status ?? ""]?.label ?? "").localeCompare(
            status[b.enrollment?.status ?? ""]?.label ?? "",
            "pt-BR"
          ),
      },
    }
  );

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Ordenação da página atual · pendências de revisão primeiro
      </p>
      <ResponsiveDataView
        desktop={
          <div className="overflow-hidden rounded-xl bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <SortableTableHead
                    title="Aluno"
                    sortKey="student"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onToggle={toggleSort}
                    className="[&_button]:pr-3"
                  />
                  <SortableTableHead
                    title="Graduação"
                    sortKey="belt"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onToggle={toggleSort}
                    className="[&_button]:px-3"
                  />
                  <SortableTableHead
                    title="Turma"
                    sortKey="class"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onToggle={toggleSort}
                    className="[&_button]:px-3"
                  />
                  <SortableTableHead
                    title="Vencimento"
                    sortKey="due_day"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onToggle={toggleSort}
                    className="[&_button]:px-3"
                  />
                  <SortableTableHead
                    title="Status e pendência"
                    sortKey="status"
                    currentSortKey={sortKey}
                    currentDirection={sortDirection}
                    onToggle={toggleSort}
                    className="[&_button]:px-3"
                  />
                  <TableHead className="pl-3 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="t-stagger">
                {sortedItems.map((row) => {
                  const { student, enrollment, profilePhotoDocumentId } = row;
                  const action = describeEnrollmentAction(row);
                  return (
                    <TableRow key={student.$id}>
                      <TableCell className="whitespace-normal pr-3">
                        <div className="flex items-center gap-2.5">
                          <StudentAvatar
                            name={student.full_name}
                            sex={student.sex}
                            photoDocumentId={profilePhotoDocumentId}
                            size="sm"
                            className="shrink-0"
                          />
                          <span className="line-clamp-2 min-w-0 max-w-44 whitespace-normal text-sm font-semibold text-foreground">
                            {student.full_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3">
                        <BeltBadge rankKey={student.rank_key} size="sm" />
                      </TableCell>
                      <TableCell className="max-w-36 whitespace-normal px-3 text-sm text-muted-foreground">
                        <span className="block max-w-28 whitespace-normal">
                          {student.training_class ?? "Não informada"}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 text-sm font-medium tabular-nums">
                        {enrollment?.requested_due_day
                          ? `Dia ${enrollment.requested_due_day}`
                          : "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal px-3">
                        <div className="space-y-1">
                          <EnrollmentStatus value={enrollment?.status} />
                          {action.hint ? (
                            <p className="text-xs text-muted-foreground">{action.hint}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap pl-3 text-right">
                        <RowActions
                          studentId={student.$id}
                          studentName={student.full_name}
                          action={action}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        }
        mobile={
          <div className="t-stagger space-y-3">
            {sortedItems.map((row) => {
              const { student, enrollment, profilePhotoDocumentId } = row;
              const action = describeEnrollmentAction(row);
              return (
                <Card key={student.$id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <StudentAvatar
                          name={student.full_name}
                          sex={student.sex}
                          photoDocumentId={profilePhotoDocumentId}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {student.full_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <BeltBadge rankKey={student.rank_key} size="sm" />
                            {student.training_class ? (
                              <span className="min-w-0 break-words text-sm text-muted-foreground">
                                · {student.training_class}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <EnrollmentStatus value={enrollment?.status} />
                    </div>
                    {action.hint ? (
                      <p className="text-xs text-muted-foreground">{action.hint}</p>
                    ) : null}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="text-sm text-muted-foreground">
                        Vencimento:{" "}
                        <strong className="text-foreground">
                          {enrollment?.requested_due_day
                            ? `dia ${enrollment.requested_due_day}`
                            : "não informado"}
                        </strong>
                      </span>
                      <RowActions
                        studentId={student.$id}
                        studentName={student.full_name}
                        action={action}
                        mobile
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
      />
    </>
  );
}
