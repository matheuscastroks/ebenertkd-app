"use client";

import Link from "next/link";
import { Eye } from "@/components/ui/icons";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { SortableTableHead } from "@/components/shared/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rankOrder } from "@/features/academy/ranks";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { resolveStudentRank } from "@/features/students/journey-rules";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import type { Enrollment, Student } from "@/features/students/types";
import { useTableSort } from "@/hooks/use-table-sort";
import { adminEnrollmentPath } from "@/lib/navigation/routes";

export type EnrollmentRow = {
  student: Student;
  enrollment: Enrollment | null;
  profilePhotoDocumentId?: string;
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

type EnrollmentSortKey = "student" | "belt" | "class" | "due_day" | "status";

export function EnrollmentTable({ rows }: { rows: EnrollmentRow[] }) {
  const {
    sortedItems,
    sortKey,
    sortDirection,
    toggleSort,
  } = useTableSort<EnrollmentRow, EnrollmentSortKey>([...rows].sort((a, b) => Number(!["submitted", "under_review"].includes(a.enrollment?.status ?? "")) - Number(!["submitted", "under_review"].includes(b.enrollment?.status ?? ""))), {
    comparators: {
      student: (a, b) =>
        a.student.full_name.localeCompare(b.student.full_name, "pt-BR"),
      // Ordem de progressão do catálogo: asc = iniciante -> graduado; sem graduação conta como iniciante.
      belt: (a, b) => rankOrder(resolveStudentRank(a.student.rank_key)) - rankOrder(resolveStudentRank(b.student.rank_key)),
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
  });

  return (
    <><p className="mb-3 text-sm text-muted-foreground">Ordenação da página atual · pendentes primeiro</p><ResponsiveDataView
      desktop={
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
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
                  title="Status"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                  className="[&_button]:px-3"
                />
                <TableHead className="pl-3 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="t-stagger">
              {sortedItems.map(({ student, enrollment, profilePhotoDocumentId }) => (
                <TableRow key={student.$id}>
                  <TableCell className="whitespace-normal pr-3">
                    <div className="flex items-center gap-2.5">
                      <StudentAvatar
                        name={student.full_name}
                        photoDocumentId={profilePhotoDocumentId}
                        size="sm"
                        className="shrink-0"
                      />
                      <span className="min-w-0 max-w-44 whitespace-normal line-clamp-2 text-sm font-semibold text-foreground">
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
                    {enrollment?.requested_due_day ? `Dia ${enrollment.requested_due_day}` : "—"}
                  </TableCell>
                  <TableCell className="px-3">
                    <EnrollmentStatus value={enrollment?.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap pl-3 text-right">
                    <Button asChild size="sm" variant={["submitted", "under_review"].includes(enrollment?.status ?? "") ? "outline" : "ghost"} className="min-h-11 gap-1.5 font-medium">
                      <Link href={adminEnrollmentPath(student.$id)}>
                        <Eye className="size-4" aria-hidden="true" />
                        {["submitted", "under_review"].includes(enrollment?.status ?? "") ? "Analisar" : "Ver"}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
      mobile={
        <div className="t-stagger space-y-3">
          {sortedItems.map(({ student, enrollment, profilePhotoDocumentId }) => (
            <Card key={student.$id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={student.full_name} photoDocumentId={profilePhotoDocumentId} />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">{student.full_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <BeltBadge rankKey={student.rank_key} size="sm" />
                        {student.training_class && (
                          <span className="text-sm text-muted-foreground">· {student.training_class}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <EnrollmentStatus value={enrollment?.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-sm text-muted-foreground">
                    Vencimento:{" "}
                    <strong className="text-foreground">
                      {enrollment?.requested_due_day ? `dia ${enrollment.requested_due_day}` : "não informado"}
                    </strong>
                  </span>
                  <Button asChild variant={["submitted", "under_review"].includes(enrollment?.status ?? "") ? "outline" : "ghost"} className="min-h-11 font-medium px-4">
                    <Link href={adminEnrollmentPath(student.$id)}>
                      <Eye className="mr-1.5 size-4" aria-hidden="true" />
                      {["submitted", "under_review"].includes(enrollment?.status ?? "") ? "Analisar" : "Ver"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    /></>
  );
}
