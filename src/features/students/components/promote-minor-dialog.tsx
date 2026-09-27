"use client";

import { useState } from "react";
import { promoteMinorAction } from "@/app/actions/auth";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";

export function PromoteMinorDialog({
  minorProfileId,
  studentName,
  currentQuery = {},
}: {
  minorProfileId: string;
  studentName: string;
  currentQuery?: { q?: string; page?: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto font-medium">
          <KeyRound className="mr-1.5 size-3.5" />
          Configurar acesso próprio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Configurar acesso próprio</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Defina o e-mail de acesso individual para <strong>{studentName}</strong>. O aluno receberá um convite para criar sua senha e as sessões atuais de menor serão encerradas.
          </DialogDescription>
        </DialogHeader>
        <form action={promoteMinorAction} className="space-y-4 pt-2">
          <input type="hidden" name="minor_profile_id" value={minorProfileId} />
          {currentQuery.q ? <input type="hidden" name="q" value={currentQuery.q} /> : null}
          {currentQuery.page ? <input type="hidden" name="page" value={currentQuery.page} /> : null}

          <Field>
            <FieldLabel htmlFor={`email-${minorProfileId}`} className="text-xs sm:text-sm font-semibold">
              Novo e-mail do aluno
            </FieldLabel>
            <Input
              id={`email-${minorProfileId}`}
              name="email"
              type="email"
              placeholder="ex.: aluno@email.com"
              autoComplete="email"
              required
              autoFocus
              className="h-11"
            />
            <FieldDescription className="text-xs">
              O aluno usará este e-mail para acessar o portal de forma autônoma.
            </FieldDescription>
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`retain-guardian-${minorProfileId}`}
              name="retain_guardian_access"
              defaultChecked
            />
            <label
              htmlFor={`retain-guardian-${minorProfileId}`}
              className="text-xs sm:text-sm font-medium leading-none cursor-pointer text-muted-foreground select-none"
            >
              Manter acesso de consulta do responsável
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 font-medium"
            >
              Cancelar
            </Button>
            <FormSubmitButton className="h-11 font-medium" pendingLabel="Atualizando acesso…">
              Atualizar acesso
            </FormSubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
