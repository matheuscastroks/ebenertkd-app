"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyPixButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <Button type="button" size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}>{copied ? "Chave copiada" : "Copiar chave"}</Button>;
}
