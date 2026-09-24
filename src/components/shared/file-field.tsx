"use client";

import { useId, useState } from "react";
import { FileText, ImageIcon, X } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle
} from "@/components/ui/attachment";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function FileField({ name, label, accept, description, required = false }: { name: string; label: string; accept: string; description: string; required?: boolean }) {
  const id = useId();
  const [file, setFile] = useState<File>();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}{required ? " *" : ""}</FieldLabel>
      <Input id={id} name={name} type="file" accept={accept} required={required} onChange={(event) => setFile(event.target.files?.[0])} />
      <FieldDescription>{description}</FieldDescription>
      {file ? (
        <Attachment className="w-full">
          <AttachmentMedia>{file.type.startsWith("image/") ? <ImageIcon aria-hidden="true" /> : <FileText aria-hidden="true" />}</AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>{Math.ceil(file.size / 1024)} KB · pronto para enviar</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction type="button" aria-label={`Remover ${file.name}`} onClick={() => {
              const input = document.getElementById(id) as HTMLInputElement | null;
              if (input) input.value = "";
              setFile(undefined);
            }}><X aria-hidden="true" /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : null}
    </Field>
  );
}
