"use client";

import { useId, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { FileTextIcon } from "@/components/ui/file-text";
import { UploadIcon } from "@/components/ui/upload";
import { XIcon } from "@/components/ui/x";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger
} from "@/components/ui/attachment";
import { Field, FieldLabel } from "@/components/ui/field";

export function FileField({ name, label, accept, description, required = false }: { name: string; label: string; accept: string; description: string; required?: boolean }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}{required ? " *" : ""}</FieldLabel>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(event) => setFile(event.target.files?.[0])}
      />
      <Attachment state={file ? "done" : "idle"} className="w-full">
        {!file ? (
          <>
            <AttachmentMedia>
              <UploadIcon className="size-4" aria-hidden="true" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>Selecionar arquivo</AttachmentTitle>
              <AttachmentDescription>{description}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              onClick={() => inputRef.current?.click()}
              aria-label={`Selecionar ${label}`}
            />
          </>
        ) : (
          <>
            <AttachmentMedia>
              {file.type.startsWith("image/") ? (
                <ImageIcon aria-hidden="true" />
              ) : (
                <FileTextIcon className="size-4" aria-hidden="true" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{file.name}</AttachmentTitle>
              <AttachmentDescription>
                {Math.max(1, Math.ceil(file.size / 1024))} KB · pronto para enviar
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                type="button"
                size="sm"
                aria-label={`Trocar ${file.name}`}
                onClick={() => inputRef.current?.click()}
              >
                Trocar
              </AttachmentAction>
              <AttachmentAction
                type="button"
                aria-label={`Remover ${file.name}`}
                onClick={() => {
                  if (inputRef.current) inputRef.current.value = "";
                  setFile(undefined);
                }}
              >
                <XIcon aria-hidden="true" />
              </AttachmentAction>
            </AttachmentActions>
          </>
        )}
      </Attachment>
    </Field>
  );
}
