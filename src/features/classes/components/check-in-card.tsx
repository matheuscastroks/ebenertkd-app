"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkInAction, justifyAbsenceAction } from "@/app/actions/check-in";
import { FeedbackAlert } from "@/components/shared/feedback-alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Check, Loader2, MapPin } from "@/components/ui/icons";
import { Textarea } from "@/components/ui/textarea";
import { geolocationErrorMessage, type CheckInResultState } from "@/features/classes/check-in-labels";
import { JUSTIFICATION_MAX_LENGTH } from "@/features/classes/check-in-rules";
import type { StudentCheckInState } from "@/features/classes/check-in-service";

const clock = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

type GeoFailure = { geoError: number | "unsupported" };

/** Lê a posição atual uma única vez, no clique. Nada fica guardado no navegador. */
function currentPosition(): Promise<GeolocationPosition | GeoFailure> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return Promise.resolve({ geoError: "unsupported" });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => resolve({ geoError: error.code }), { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

const RECORD_COPY = {
  present: { tone: "success", label: "Presença confirmada" },
  excused: { tone: "warning", label: "Falta justificada" },
  absent: { tone: "danger", label: "Falta registrada" }
} as const;

/**
 * Card de check-in do aluno: confirma a presença pela localização (o servidor confere o raio)
 * ou justifica a falta em poucas palavras. Aparece no Início e em Treinos › Agenda.
 */
export function CheckInCard({ state }: { state: StudentCheckInState }) {
  const [result, setResult] = useState<CheckInResultState>({ status: "idle" });
  const [justifying, setJustifying] = useState(false);
  const [reason, setReason] = useState("");
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const busy = pending || locating;
  const { slot, record } = state;
  const opensAt = clock.format(new Date(state.opensAt));
  const closesAt = clock.format(new Date(state.closesAt));

  async function handleCheckIn() {
    if (Date.now() < Date.parse(state.opensAt)) {
      setResult({ status: "error", code: "check_in_not_open", message: `O check-in abre às ${opensAt}. Volte quando estiver chegando ao treino.`, offerJustify: false });
      return;
    }
    setResult({ status: "idle" });
    setLocating(true);
    const position = await currentPosition();
    setLocating(false);
    if ("geoError" in position) {
      setResult({ status: "error", code: "geolocation", message: geolocationErrorMessage(position.geoError), offerJustify: true });
      return;
    }
    const { latitude, longitude } = position.coords;
    startTransition(async () => {
      const next = await checkInAction({ date: slot.date, startTime: slot.startTime, latitude, longitude });
      setResult(next);
      // Traz o registro novo do servidor: o card troca os botões pelo selo.
      if (next.status === "success") router.refresh();
    });
  }

  function handleJustify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const next = await justifyAbsenceAction({ date: slot.date, startTime: slot.startTime, reason });
      setResult(next);
      if (next.status === "success") {
        setJustifying(false);
        router.refresh();
      }
    });
  }

  const recordCopy = record ? RECORD_COPY[record.status] : null;
  const checkInAvailable = !record && state.placeConfigured && (state.phase === "open" || state.phase === "upcoming");
  const justifyAvailable = !record && state.phase !== "ended";
  const phaseHint = record
    ? null
    : !state.placeConfigured
      ? "O local deste treino ainda não tem coordenadas. Avise o professor; se for faltar, justifique aqui."
      : state.phase === "late"
        ? `O check-in fechou às ${closesAt}. Se faltou, justifique em poucas palavras.`
        : `Check-in pela localização das ${opensAt} às ${closesAt}, no local do treino.`;

  return (
    <section aria-labelledby="check-in-title" className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="check-in-title" className="text-base font-semibold">Check-in</h2>
          {recordCopy ? <StatusBadge tone={recordCopy.tone}>{recordCopy.label}</StatusBadge> : null}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium tabular-nums">Treino de hoje · {slot.startTime} às {slot.endTime}</p>
          <p className="flex min-w-0 items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{state.className}{state.location ? ` · ${state.location}` : ""}</span>
          </p>
        </div>
        {record?.status === "excused" && record.justification ? <p className="text-sm text-muted-foreground break-words">Motivo: {record.justification}</p> : null}
        {record ? <p className="text-sm text-muted-foreground">Só o professor pode alterar este registro.</p> : null}
        {phaseHint ? <p className="text-sm text-muted-foreground">{phaseHint}</p> : null}

        <div aria-live="polite">
          {result.status === "success" ? <FeedbackAlert tone="success" title={result.message} /> : null}
          {result.status === "error" ? <FeedbackAlert tone="warning" title="Check-in não registrado" description={result.message} /> : null}
        </div>

        {justifying && justifyAvailable ? (
          <form onSubmit={handleJustify} className="space-y-3">
            <Field>
              <FieldLabel htmlFor="justify-reason">Motivo da falta</FieldLabel>
              <Textarea
                id="justify-reason"
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={3}
                maxLength={JUSTIFICATION_MAX_LENGTH}
                placeholder="Ex.: consulta médica, viagem da escola"
                autoFocus
              />
              <FieldDescription className="tabular-nums">Em poucas palavras. O professor vê o motivo na chamada. {reason.length}/{JUSTIFICATION_MAX_LENGTH}</FieldDescription>
            </Field>
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <Button type="submit" className="min-h-11" disabled={busy || reason.trim().length < 3}>
                {pending ? <Loader2 className="size-4" aria-hidden="true" /> : null}
                Enviar justificativa
              </Button>
              <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={() => setJustifying(false)}>Cancelar</Button>
            </div>
          </form>
        ) : checkInAvailable || justifyAvailable ? (
          <div className="grid grid-cols-1 gap-2 sm:flex">
            {checkInAvailable ? (
              <Button type="button" className="min-h-11" disabled={busy} onClick={handleCheckIn}>
                {busy ? <Loader2 className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                {locating ? "Obtendo localização…" : pending ? "Conferindo…" : "Fazer check-in"}
              </Button>
            ) : null}
            {justifyAvailable ? (
              <Button
                type="button"
                variant={checkInAvailable && !(result.status === "error" && result.offerJustify) ? "outline" : "default"}
                className="min-h-11"
                disabled={busy}
                onClick={() => { setJustifying(true); setResult({ status: "idle" }); }}
              >
                Justificar falta
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
