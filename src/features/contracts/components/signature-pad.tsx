"use client";

import { useEffect, useRef, useState } from "react";
import { signContractAction } from "@/app/actions/contract-signature";
import { Button } from "@/components/ui/button";

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
    context.lineWidth = 2.25;
    context.lineCap = "round";
    context.strokeStyle = "#171717";
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

  return <form action={signContractAction} onSubmit={() => { if (signatureInputRef.current && canvasRef.current) signatureInputRef.current.value = canvasRef.current.toDataURL("image/png"); }} className="space-y-5"><input type="hidden" name="contract_id" value={contractId} /><input type="hidden" name="read_confirmed" value={read ? "true" : "false"} /><input ref={signatureInputRef} type="hidden" name="signature_data_url" />
    <div ref={readingRef} onScroll={(event) => { const node = event.currentTarget; if (node.scrollTop + node.clientHeight >= node.scrollHeight - 8) setRead(true); }} className="h-80 overflow-y-auto rounded-xl border bg-muted/20 p-5 text-sm leading-7 whitespace-pre-wrap">{content}<div className="mt-8 border-t pt-4 text-xs font-medium text-muted-foreground">Fim do contrato</div></div>
    <p className="text-xs text-muted-foreground">{read ? "Leitura concluída." : "Role até o final do contrato para habilitar a assinatura."}</p>
    <div className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-medium">Assine no quadro abaixo</span><Button type="button" variant="ghost" size="sm" onClick={clear}>Limpar</Button></div><canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} className="h-40 w-full touch-none rounded-xl border bg-white" /></div>
    <label className="flex items-start gap-3 rounded-xl border p-4 text-sm"><input name="accepted" type="checkbox" required className="mt-1" /><span>Li o contrato, concordo com seus termos e reconheço esta assinatura eletrônica.</span></label>
    <Button type="submit" disabled={!read || !drawn}>Assinar contrato</Button>
  </form>;
}
