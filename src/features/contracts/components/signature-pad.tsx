"use client";

import { useEffect, useRef, useState } from "react";
import { signContractAction } from "@/app/actions/contract-signature";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eraser, FileSignature, Info } from "lucide-react";
import { FormSubmitButton } from "@/components/shared/form-submit-button";

export function SignaturePad({ contractId, content }: { contractId: string; content: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const reading = readingRef.current;
    if (!canvas || !reading) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    if (reading.scrollHeight <= reading.clientHeight + 4) setRead(true);
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
    setDrawing(true);
    setDrawn(true);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.lineTo(current.x, current.y);
    context?.stroke();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setDrawn(false);
  };

  return (
    <form
      action={signContractAction}
      onSubmit={() => {
        if (signatureInputRef.current && canvasRef.current) {
          signatureInputRef.current.value = canvasRef.current.toDataURL("image/png");
        }
      }}
      className="space-y-5"
    >
      <input type="hidden" name="contract_id" value={contractId} />
      <input type="hidden" name="read_confirmed" value={read ? "true" : "false"} />
      <input ref={signatureInputRef} type="hidden" name="signature_data_url" />

      {/* Box de Leitura com Barra de Progresso/Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider">
            Texto integral do contrato
          </span>
          {read ? (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Leitura confirmada
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
              <Info className="size-3.5" /> Role até o fim para liberar a assinatura
            </span>
          )}
        </div>

        <div
          ref={readingRef}
          onScroll={(event) => {
            const node = event.currentTarget;
            if (node.scrollTop + node.clientHeight >= node.scrollHeight - 8) {
              setRead(true);
            }
          }}
          className="h-80 overflow-y-auto rounded-xl border border-border/80 bg-muted/20 p-5 text-xs sm:text-sm leading-relaxed font-mono whitespace-pre-wrap select-text"
        >
          {content}
          <div className="mt-8 border-t border-border/60 pt-4 text-xs font-semibold text-muted-foreground text-center">
            — Fim do instrumento contratual —
          </div>
        </div>
      </div>

      {/* Área de Assinatura */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <FileSignature className="size-4 text-primary" />
            Assinatura manuscrita digital
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <Eraser className="mr-1.5 size-3.5" />
            Limpar
          </Button>
        </div>

        <div className="relative rounded-xl border-2 border-dashed border-border/80 bg-white dark:bg-zinc-950 overflow-hidden">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={() => setDrawing(false)}
            onPointerCancel={() => setDrawing(false)}
            className="h-44 w-full touch-none cursor-crosshair"
          />
          {!drawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/60 select-none">
              Desenhe sua assinatura com o dedo ou mouse aqui
            </div>
          )}
        </div>
      </div>

      {/* Termo de Concordância */}
      <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/10 p-4 text-xs sm:text-sm cursor-pointer select-none">
        <input
          name="accepted"
          type="checkbox"
          required
          className="mt-0.5 size-4 rounded border-border accent-primary cursor-pointer"
        />
        <span className="text-foreground leading-normal">
          Declaro que li atentamente o contrato, concordo com seus termos, normas da academia e reconheço a validade jurídica desta assinatura eletrônica.
        </span>
      </label>

      {/* Botão de Envio */}
      <FormSubmitButton
        type="submit"
        disabled={!read || !drawn}
        className="h-11 w-full sm:w-auto font-medium"
        pendingLabel="Gravando assinatura e emitindo PDF…"
      >
        <FileSignature className="mr-2 size-4" />
        Assinar contrato agora
      </FormSubmitButton>
    </form>
  );
}
