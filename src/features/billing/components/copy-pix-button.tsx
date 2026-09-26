"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
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
      className="h-9 gap-1.5 touch-manipulation font-medium transition-all"
      onClick={handleCopy}
      aria-label="Copiar chave PIX"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-success-foreground" aria-hidden="true" />
          <span>Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span>Copiar chave</span>
        </>
      )}
    </Button>
  );
}
