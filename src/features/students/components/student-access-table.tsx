"use client";

import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { SortableTableHead } from "@/components/shared/sortable-table-head";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile } from "@/features/auth/types";
import { PromoteMinorDialog } from "@/features/students/components/promote-minor-dialog";
import { AdminDeleteStudentDialog } from "@/features/students/components/AdminDeleteStudentDialog";
import { useTableSort } from "@/hooks/use-table-sort";

type StudentAccessSortKey = "student" | "role" | "login" | "status";

export function StudentAccessTable({
  profiles,
  currentQuery,
}: {
  profiles: Profile[];
  currentQuery: { q?: string; page?: string };
}) {
  const {
    sortedItems,
    sortKey,
    sortDirection,
    toggleSort,
  } = useTableSort<Profile, StudentAccessSortKey>(profiles, {
    comparators: {
      student: (a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"),
      role: (a, b) => a.role.localeCompare(b.role, "pt-BR"),
      login: (a, b) => {
        const loginA =
          a.role === "minor_student" ? a.username || "" : a.email || "";
        const loginB =
          b.role === "minor_student" ? b.username || "" : b.email || "";
        return loginA.localeCompare(loginB, "pt-BR");
      },
      status: (a, b) => (a.status || "").localeCompare(b.status || "", "pt-BR"),
    },
  });

  return (
    <ResponsiveDataView
      desktop={
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
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
                  title="Tipo de acesso"
                  sortKey="role"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Login / E-mail"
                  sortKey="login"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Situação"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((student) => (
                <TableRow
                  key={student.$id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="font-semibold text-sm text-foreground">
                    {student.full_name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {student.role === "minor_student"
                      ? "Menor · usuário e senha"
                      : "E-mail e senha"}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {student.role === "minor_student"
                      ? student.username || "Não definido"
                      : student.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={student.status === "active" ? "secondary" : "outline"}
                    >
                      {student.status === "active"
                        ? "Ativo"
                        : student.status === "disabled"
                          ? "Desativado"
                          : "Convidado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {student.role === "minor_student" &&
                      student.status === "active" ? (
                        <PromoteMinorDialog
                          minorProfileId={student.$id}
                          studentName={student.full_name}
                          currentQuery={currentQuery}
                        />
                      ) : null}
                      <AdminDeleteStudentDialog
                        profileId={student.$id}
                        studentName={student.full_name}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!sortedItems.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Nenhum aluno encontrado com os termos de busca.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      }
      mobile={
        <div className="space-y-3">
          {sortedItems.length ? (
            sortedItems.map((student) => (
              <Card key={student.$id} className="border-border/80 shadow-xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">
                        {student.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {student.role === "minor_student"
                          ? "Acesso menor"
                          : "Acesso próprio"}{" "}
                        ·{" "}
                        <span className="font-mono text-foreground">
                          {student.role === "minor_student"
                            ? student.username || "Sem usuário"
                            : student.email}
                        </span>
                      </p>
                    </div>
                    <Badge
                      variant={student.status === "active" ? "secondary" : "outline"}
                    >
                      {student.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-2">
                      {student.role === "minor_student" &&
                        student.status === "active" && (
                          <PromoteMinorDialog
                            minorProfileId={student.$id}
                            studentName={student.full_name}
                            currentQuery={currentQuery}
                          />
                        )}
                      <AdminDeleteStudentDialog
                        profileId={student.$id}
                        studentName={student.full_name}
                      />
                    </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-border/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nenhum aluno encontrado com os termos de busca.
              </CardContent>
            </Card>
          )}
        </div>
      }
    />
  );
}
