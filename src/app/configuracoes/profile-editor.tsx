"use client";

import { useState, useRef } from "react";
import { Camera, Check, User } from "@/components/ui/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { updateProfileAction } from "@/app/actions/profile";
import type { Profile } from "@/features/auth/types";

export function ProfileEditor({
  profile,
  currentAvatarUrl,
}: {
  profile: Profile;
  currentAvatarUrl?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const roleLabel =
    profile.role === "admin"
      ? "Professor / Administrador"
      : profile.role === "guardian"
        ? "Responsável Legal"
        : "Aluno";

  return (
    <form action={updateProfileAction} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-xl border border-border bg-card p-5 shadow-xs">
        {/* Avatar com ação de foto */}
        <div className="relative group flex flex-col items-center gap-2">
          <Avatar className="size-24 border-2 border-border shadow-xs">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt={profile.full_name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary-text font-bold text-xl">
              {profile.full_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <input
            ref={fileInputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-3.5 mr-1" aria-hidden="true" />
            Alterar foto
          </Button>
        </div>

        {/* Campos de Perfil */}
        <div className="flex-1 space-y-4 w-full">
          <Field>
            <FieldLabel htmlFor="profile-fullname">Nome completo</FieldLabel>
            <Input
              id="profile-fullname"
              name="full_name"
              defaultValue={profile.full_name}
              placeholder="Seu nome completo"
              required
              className="h-11 text-sm"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="profile-email">E-mail ou Usuário</FieldLabel>
              <Input
                id="profile-email"
                defaultValue={profile.email || (profile.username ? `@${profile.username}` : "—")}
                disabled
                className="h-11 text-sm bg-muted/50 cursor-not-allowed"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-role">Função no Sistema</FieldLabel>
              <Input
                id="profile-role"
                defaultValue={roleLabel}
                disabled
                className="h-11 text-sm bg-muted/50 cursor-not-allowed"
              />
            </Field>
          </div>

          <div className="pt-2 flex justify-end">
            <FormSubmitButton className="min-h-11 w-full sm:w-auto" pendingLabel="Salvando alterações…">
              <Check className="size-4 mr-1.5" aria-hidden="true" />
              Salvar alterações no perfil
            </FormSubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
