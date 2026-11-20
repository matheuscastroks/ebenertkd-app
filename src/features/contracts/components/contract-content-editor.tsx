"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/plus";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export type ContractVariableOption = { ptKey: string; label: string; description: string };

/**
 * Texto do contrato com inserção de variáveis no ponto do cursor.
 * As variáveis ficam num popover em vez de uma lista fixa ao lado do editor.
 */
export function ContractContentEditor({ content, variables }: { content: string; variables: ContractVariableOption[] }) {
  const [value, setValue] = useState(content);
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insert(key: string) {
    const token = `{{ ${key} }}`;
    const field = textareaRef.current;
    const start = field?.selectionStart ?? value.length;
    const end = field?.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + token + value.slice(end));
    setOpen(false);
    // Devolve o foco ao texto com o cursor logo depois da variável.
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">O sistema troca cada variável pelos dados reais ao emitir o contrato.</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11">
              <PlusIcon className="size-4" aria-hidden="true" />
              Inserir variável
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-80 w-80 overflow-y-auto p-1">
            <ul aria-label="Variáveis do contrato">
              {variables.map((item) => (
                <li key={item.ptKey}>
                  <button
                    type="button"
                    onClick={() => insert(item.ptKey)}
                    className="flex min-h-11 w-full flex-col items-start rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
      <Textarea
        ref={textareaRef}
        id="template-content"
        name="content"
        aria-label="Conteúdo e cláusulas"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-[50dvh] rounded-xl p-4 font-mono text-sm leading-relaxed"
        required
      />
      <span className="text-sm text-muted-foreground" aria-live="polite">{value.length} caracteres</span>
    </div>
  );
}
