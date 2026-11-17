import { recordExamResultAction } from "@/app/actions/exams";
import { ConsequenceDialog } from "./consequence-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatBrl } from "@/lib/money";

export function ExamResultActions({ participantId, eventId, name, currentBelt, targetBelt, feeCents }: { participantId: string; eventId: string; name: string; currentBelt: string; targetBelt: string; feeCents: number }) {
  return <div className="grid grid-cols-3 gap-2">{([
    { result: "approved", label: "Aprovar", className: "bg-success-soft text-success-foreground hover:bg-success-soft", effect: `Muda a faixa de ${currentBelt} para ${targetBelt}. O resultado será publicado no portal do aluno.` },
    { result: "failed", label: "Reprovar", className: "text-destructive", effect: "Registra reprovação. A faixa atual será mantida e o resultado ficará visível no portal." },
    { result: "absent", label: "Ausente", className: "text-muted-foreground", effect: "Registra ausência. A faixa atual será mantida." }
  ] as const).map(({ result, label, className, effect }) => <ConsequenceDialog key={result} trigger={<Button type="button" variant="outline" className={`h-11 px-2 ${className}`}>{label}</Button>} title={`${label}: ${name}?`} summary={[{ label: "Aluno", value: name }, { label: "Faixa atual", value: currentBelt }, { label: "Faixa pretendida", value: targetBelt }, { label: "Taxa do exame", value: formatBrl(feeCents) }]} effect={effect} confirmLabel={`Confirmar: ${label.toLowerCase()}`} destructive={result === "failed"} action={recordExamResultAction}>
    <input type="hidden" name="participant_id" value={participantId} /><input type="hidden" name="event_id" value={eventId} /><input type="hidden" name="result" value={result} />
    <Field><FieldLabel htmlFor={`exam-notes-${participantId}-${result}`}>Parecer da banca (opcional)</FieldLabel><Input id={`exam-notes-${participantId}-${result}`} name="notes" /></Field>
  </ConsequenceDialog>)}</div>;
}
