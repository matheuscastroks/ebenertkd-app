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
import { deleteStudentAccountAction } from "@/app/actions/account-deletion";

/**
 * Dialog for admin to delete a student profile.
 */
export function AdminDeleteStudentDialog({
  profileId,
  studentName,
}: {
  profileId: string;
  studentName: string;
}) {
  const [confirm, setConfirm] = useState("");
  const isValid = confirm.trim().toUpperCase() === "EXCLUIR";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-8 text-xs">
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir perfil de {studentName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é <strong>irreversível</strong>. O perfil e todos os dados associados serão
            removidos permanentemente. Digite <strong>EXCLUIR</strong> para confirmar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={deleteStudentAccountAction} className="space-y-4 pt-2">
          <input type="hidden" name="target_profile_id" value={profileId} />
          <Input
            name="confirm"
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
              className="h-10"
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
