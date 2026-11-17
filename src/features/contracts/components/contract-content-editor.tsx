"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export function ContractContentEditor({ content }: { content: string }) {
  const [value, setValue] = useState(content);
  return <><Textarea id="template-content" name="content" aria-label="Conteúdo e cláusulas" value={value} onChange={(event) => setValue(event.target.value)} className="min-h-[50dvh] font-mono text-sm leading-relaxed rounded-xl p-4" required /><span className="text-sm text-muted-foreground" aria-live="polite">{value.length} caracteres</span></>;
}
