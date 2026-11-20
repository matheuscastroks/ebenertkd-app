"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/check";
import { CopyIcon } from "@/components/ui/copy";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyPixButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Chave PIX copiada para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a chave PIX", {
        description: "Selecione o texto manualmente para copiar."
      });
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={copied ? "default" : "outline"}
      className="h-9 gap-1.5 touch-manipulation font-medium transition-[color,background-color,border-color,transform,scale] duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none"
      onClick={handleCopy}
      aria-label="Copiar chave PIX"
    >
      <span className="t-icon-swap" data-state={copied ? "b" : "a"} aria-hidden="true">
        <CopyIcon className="t-icon size-3.5 text-muted-foreground" data-icon="a" />
        <CheckIcon className="t-icon size-3.5 text-success-foreground" data-icon="b" />
      </span>
      <span>{copied ? "Copiado!" : "Copiar chave"}</span>
    </Button>
  );
}
