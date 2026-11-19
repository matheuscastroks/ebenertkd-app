"use client";

import { useMemo, useState } from "react";
import { checkInAction } from "@/app/actions/events";
import { PersonAvatar } from "@/components/shared/avatar-group";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import type { RegistrationStatus } from "@/features/events/types";

export type CheckinRow = {
  id: string;
  name: string;
  optionLabel: string;
  companions: number;
  status: RegistrationStatus;
  isGuest: boolean;
  imageUrl?: string;
};

/** Lista do dia: busca por nome, check-in e desfazer. Só confirmados e presentes aparecem. */
export function CheckinList({ rows, returnTo, closed }: { rows: CheckinRow[]; returnTo: string; closed: boolean }) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => !term || row.name.toLowerCase().includes(term));
  }, [rows, search]);
  const present = rows.filter((row) => row.status === "checked_in" || row.status === "completed").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input aria-label="Buscar por nome" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome" className="h-11 sm:max-w-xs" />
        <p className="text-sm text-muted-foreground tabular-nums">
          {present} de {rows.length} presentes
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">{rows.length === 0 ? "Ninguém confirmado ainda." : "Ninguém encontrado com esse nome."}</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {visible.map((row) => {
            const isPresent = row.status === "checked_in" || row.status === "completed";
            return (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <PersonAvatar name={row.name} imageUrl={row.imageUrl} size="sm" />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.optionLabel}
                    {row.companions > 0 ? ` · +${row.companions}` : ""}
                    {row.isGuest ? " · convidado" : ""}
                  </p>
                </div>
                {closed ? (
                  <StatusBadge tone={isPresent ? "success" : "neutral"}>{isPresent ? "Presente" : "Ausente"}</StatusBadge>
                ) : (
                  <form action={checkInAction}>
                    <input type="hidden" name="registration_id" value={row.id} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="present" value={isPresent ? "0" : "1"} />
                    <FormSubmitButton size="sm" variant={isPresent ? "outline" : "default"} className="min-h-10" pendingLabel="Salvando…">
                      {isPresent ? "Desfazer" : "Check-in"}
                    </FormSubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
