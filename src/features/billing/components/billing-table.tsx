"use client";

import { ResponsiveDataView } from "@/components/shared/responsive-data-view";
import { SortableTableHead } from "@/components/shared/sortable-table-head";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChargeActions } from "@/features/billing/components/charge-actions";
import { StudentAvatar } from "@/features/students/components/student-avatar";
import type { Charge, Payment, PaymentProof } from "@/features/billing/types";
import { useTableSort } from "@/hooks/use-table-sort";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

const statuses: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Pendente", tone: "warning" },
  proof_under_review: { label: "Em análise", tone: "info" },
  paid: { label: "Pago", tone: "success" },
  overdue: { label: "Inadimplente", tone: "danger" },
  cancelled: { label: "Cancelado", tone: "neutral" },
};

function BillingStatus({ value }: { value: string }) {
  const item = statuses[value] ?? { label: value, tone: "neutral" as const };
  return <StatusBadge tone={item.tone}>{item.label}</StatusBadge>;
}

type BillingSortKey = "student" | "competence" | "due_date" | "amount" | "status";

export function BillingTable({
  charges,
  names,
  photosByStudent,
  proofsByCharge,
  payments,
}: {
  charges: Charge[];
  names: Map<string, string>;
  photosByStudent: Map<string, string>;
  proofsByCharge: Map<string, PaymentProof>;
  payments: Payment[];
}) {
  const {
    sortedItems,
    sortKey,
    sortDirection,
    toggleSort,
  } = useTableSort<Charge, BillingSortKey>(charges, {
    comparators: {
      student: (a, b) => {
        const nameA = names.get(a.student_id) ?? "";
        const nameB = names.get(b.student_id) ?? "";
        return nameA.localeCompare(nameB, "pt-BR");
      },
      competence: (a, b) => a.competence.localeCompare(b.competence, "pt-BR"),
      due_date: (a, b) =>
        new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
      amount: (a, b) => a.amount_cents - b.amount_cents,
      status: (a, b) => {
        const labelA = statuses[a.status]?.label ?? a.status;
        const labelB = statuses[b.status]?.label ?? b.status;
        return labelA.localeCompare(labelB, "pt-BR");
      },
    },
  });

  const action = (charge: Charge) => (
    <ChargeActions
      charge={charge}
      studentName={names.get(charge.student_id) ?? "Aluno"}
      proof={proofsByCharge.get(charge.$id)}
      payment={payments.find((item) => item.charge_id === charge.$id && item.status === "confirmed")}
    />
  );

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
                  title="Competência"
                  sortKey="competence"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Vencimento"
                  sortKey="due_date"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onToggle={toggleSort}
                />
                <SortableTableHead
                  title="Valor"
                  sortKey="amount"
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
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((charge) => (
                <TableRow key={charge.$id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <StudentAvatar
                        name={names.get(charge.student_id) ?? "Aluno"}
                        photoDocumentId={photosByStudent.get(charge.student_id)}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {names.get(charge.student_id) ?? "Aluno"}
                        </p>
                        <p className="text-xs text-muted-foreground">{charge.description}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{charge.competence}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-sm">
                    {money(charge.amount_cents)}
                  </TableCell>
                  <TableCell>
                    <BillingStatus value={charge.status} />
                  </TableCell>
                  <TableCell className="text-right">{action(charge)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
      mobile={
        <div className="space-y-3">
          {sortedItems.map((charge) => (
            <Card key={charge.$id}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      name={names.get(charge.student_id) ?? "Aluno"}
                      photoDocumentId={photosByStudent.get(charge.student_id)}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {names.get(charge.student_id) ?? "Aluno"}
                      </p>
                      <p className="text-xs text-muted-foreground">{charge.description}</p>
                    </div>
                  </div>
                  <BillingStatus value={charge.status} />
                </div>
                <div className="flex items-end justify-between gap-3 pt-2 border-t border-border/40">
                  <div>
                    <p className="text-xl font-semibold tabular-nums text-foreground">
                      {money(charge.amount_cents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vence {new Date(charge.due_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    </p>
                  </div>
                  {action(charge)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    />
  );
}
