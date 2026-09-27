"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { SortableTableHead } from "@/components/shared/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BeltBadge } from "@/features/students/components/belt-badge";
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
  } = useTableSort<EnrollmentRow, EnrollmentSortKey>(rows, {
    comparators: {
      student: (a, b) =>
        a.student.full_name.localeCompare(b.student.full_name, "pt-BR"),
      // GUB 10 = Branca (iniciante) até 0 = Preta/Dan (avançado)
      // asc: iniciante -> graduado (10 -> 0)
      // desc: graduado -> iniciante (0 -> 10)
      belt: (a, b) => (b.student.gub ?? 10) - (a.student.gub ?? 10),
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
    <ResponsiveDataView
      desktop={
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card depth-raised">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <SortableTableHead
                  title="Aluno"
                  sortKey="student"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Graduação"
                  sortKey="belt"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Turma"
                  sortKey="class"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Vencimento"
                  sortKey="due_day"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Status"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map(({ student, enrollment, profilePhotoDocumentId }) => (
                <TableRow key={student.$id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentAvatar name={student.full_name} photoDocumentId={profilePhotoDocumentId} size="sm" />
                      <span className="font-semibold text-foreground text-sm">{student.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <BeltBadge belt={student.current_belt} gub={student.gub} size="sm" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {student.training_class ?? "Não informada"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {enrollment?.requested_due_day ? `Dia ${enrollment.requested_due_day}` : "—"}
                  </TableCell>
                  <TableCell>
                    <EnrollmentStatus value={enrollment?.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" className="h-9 font-medium">
                      <Link href={adminEnrollmentPath(student.$id)}>
                        <Eye className="mr-1.5 size-4" aria-hidden="true" />
                        Analisar
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
        <div className="space-y-3">
          {sortedItems.map(({ student, enrollment, profilePhotoDocumentId }) => (
            <Card key={student.$id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar name={student.full_name} photoDocumentId={profilePhotoDocumentId} />
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">{student.full_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <BeltBadge belt={student.current_belt} gub={student.gub} size="sm" />
                        {student.training_class && (
                          <span className="text-xs text-muted-foreground">· {student.training_class}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <EnrollmentStatus value={enrollment?.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-xs text-muted-foreground">
                    Vencimento:{" "}
                    <strong className="text-foreground">
                      {enrollment?.requested_due_day ? `dia ${enrollment.requested_due_day}` : "não informado"}
                    </strong>
                  </span>
                  <Button asChild className="h-10 font-medium px-4">
                    <Link href={adminEnrollmentPath(student.$id)}>
                      <Eye className="mr-1.5 size-4" aria-hidden="true" />
                      Analisar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    />
  );
}
