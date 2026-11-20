"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { BELT_COLOR_PALETTE, parseHexInput, swatchOutline } from "@/features/academy/belt-colors";
import { cn } from "@/lib/utils";

/**
 * Escolha de cor da faixa: paleta de cores comuns para pré-seleção, seletor livre (color picker) e campo de hex.
 * Os três editam o mesmo valor `#rrggbb`.
 */
export function BeltColorField({
  id,
  label,
  value,
  onChange,
  error
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const [text, setText] = useState(value);
  const [rejected, setRejected] = useState(false);
  // Quando a cor muda por fora (paleta, seletor), o campo de hex acompanha.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value);
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="text-sm font-medium text-foreground">
        {label}
      </span>
      <div role="radiogroup" aria-label={`${label}: cores comuns`} className="flex flex-wrap gap-1.5">
        {BELT_COLOR_PALETTE.map((color) => {
          const selected = value.toLowerCase() === color.hex;
          return (
            <button
              key={color.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={color.label}
              title={color.label}
              onClick={() => onChange(color.hex)}
              className={cn(
                "size-9 rounded-full border transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
                selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
              )}
              style={{ backgroundColor: color.hex, borderColor: swatchOutline(color.hex) }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          aria-label={`${label}: seletor de cor livre`}
          value={parseHexInput(value) ?? "#000000"}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1"
        />
        <Input
          aria-label={`${label}: código hexadecimal`}
          aria-invalid={rejected || Boolean(error) ? true : undefined}
          value={text}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="off"
          onChange={(event) => {
            setText(event.target.value);
            setRejected(false);
            // Enquanto digita só vale o hex completo (#rrggbb): o atalho de 3 dígitos ("#abc") é aceito ao sair do campo.
            if (/^#?[0-9a-f]{6}$/i.test(event.target.value.trim())) onChange(parseHexInput(event.target.value) as string);
          }}
          onBlur={() => {
            const parsed = parseHexInput(text);
            if (parsed) onChange(parsed);
            else if (text.trim() !== "") setRejected(true);
            setText(parsed ?? value);
          }}
          className="h-11 w-28 font-mono tabular-nums"
        />
      </div>
      {rejected ? <p className="text-sm text-destructive">Use o formato #RRGGBB.</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
