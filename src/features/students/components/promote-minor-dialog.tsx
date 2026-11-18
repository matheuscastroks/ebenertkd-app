"use client";

import { useState } from "react";
import { promoteMinorAction } from "@/app/actions/auth";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { KeyIcon } from "@/components/ui/key";

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 w-full sm:min-h-9 sm:w-auto font-medium">
          <KeyIcon className="mr-1.5 size-3.5" aria-hidden="true" />
          Configurar acesso próprio
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold">Configurar acesso próprio</SheetTitle>
          <SheetDescription className="text-sm">
            Defina o e-mail de acesso individual para <strong>{studentName}</strong>. O aluno receberá um convite para criar sua senha e as sessões atuais de menor serão encerradas.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <form action={promoteMinorAction} className="space-y-4">
            <input type="hidden" name="minor_profile_id" value={minorProfileId} />
            {currentQuery.q ? <input type="hidden" name="q" value={currentQuery.q} /> : null}
            {currentQuery.page ? <input type="hidden" name="page" value={currentQuery.page} /> : null}

            <Field>
              <FieldLabel htmlFor={`email-${minorProfileId}`} className="text-sm font-semibold">
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
              <FieldDescription className="text-sm">
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
                className="cursor-pointer select-none text-sm font-medium leading-none text-muted-foreground"
              >
                Manter acesso de consulta do responsável
              </label>
            </div>

            <SheetFooter className="gap-2 px-0 pt-3 sm:flex-row sm:justify-end">
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
            </SheetFooter>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
