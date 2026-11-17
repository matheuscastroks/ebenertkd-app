"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { deleteSelfAccountAction } from "@/app/actions/account-deletion";

export function DeleteAccountDialog() {
  const [confirm, setConfirm] = useState("");
  const isValid = confirm.trim().toUpperCase() === "EXCLUIR";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-11 font-medium">
          Excluir conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é <strong>irreversível</strong>. Seu acesso será encerrado e seus vínculos familiares serão revogados. Registros de histórico permanecem na academia. Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={deleteSelfAccountAction} className="space-y-4 pt-2">
          <Input
            name="confirm"
            aria-label="Confirmar exclusão"
            placeholder="EXCLUIR"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => setConfirm("")}>
              Cancelar
            </AlertDialogCancel>
            <FormSubmitButton
              variant="destructive"
              className="h-11"
              disabled={!isValid}
            >
              Confirmar exclusão
            </FormSubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
