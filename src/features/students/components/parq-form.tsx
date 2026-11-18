"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { submitParqAction } from "@/app/actions/parq";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  PARQ_HEADER_INTRO,
  PARQ_QUESTIONS,
  PARQ_RESPONSIBILITY_TERM,
  PARQ_STATUS_LABELS,
  type ParqAnswerValue,
  type ParqAssessment,
  type ParqQuestionId,
  type ParqStatus,
} from "@/features/students/parq-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eraser,
  FileSignature,
  RefreshCw,
} from "lucide-react";

const STATUS_TONES: Record<ParqStatus, StatusTone> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
  missing: "warning",
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  adult_student: "Próprio aluno",
  guardian: "Responsável legal",
  admin: "Administração",
};

export function ParqForm({
  studentName,
  defaultSignerName,
  profileId,
  assessment,
  canSign,
  enrollmentHref,
  todayBr,
}: {
  studentName: string;
  defaultSignerName: string;
  profileId?: string;
  assessment: ParqAssessment;
  canSign: boolean;
  enrollmentHref: string;
  todayBr: string;
}) {
  const needsRenewal = assessment.status === "missing" || assessment.status === "expired";
  const [showForm, setShowForm] = useState(needsRenewal);
  const [answers, setAnswers] = useState<Partial<Record<ParqQuestionId, ParqAnswerValue>>>({});
  const [termAccepted, setTermAccepted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showForm) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
  }, [showForm]);

  const answeredCount = PARQ_QUESTIONS.filter((q) => answers[q.id] === "yes" || answers[q.id] === "no").length;
  const allAnswered = answeredCount === PARQ_QUESTIONS.length;
  const hasAnyYes = PARQ_QUESTIONS.some((q) => answers[q.id] === "yes");
  const hasSignature = drawn || typedName.trim().length >= 3;
  const canSubmit = canSign && allAnswered && termAccepted && hasSignature;

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
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

  const moveDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const context = event.currentTarget.getContext("2d");
    const current = point(event);
    context?.lineTo(current.x, current.y);
    context?.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setDrawn(false);
  };

  return (
    <div className="space-y-6">
      {/* Cartão de status atual do PAR-Q */}
      <section
        aria-labelledby="parq-status-heading"
        className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="size-5 text-primary-text" aria-hidden="true" />
            <div>
              <h2 id="parq-status-heading" className="text-base font-semibold text-foreground">
                Situação do PAR-Q anual · {studentName}
              </h2>
              <p className="text-xs text-muted-foreground">
                Questionário de Prontidão para Atividade Física (CREF1) · validade de 12 meses
              </p>
            </div>
          </div>
          <StatusBadge tone={STATUS_TONES[assessment.status]}>
            {PARQ_STATUS_LABELS[assessment.status]}
          </StatusBadge>
        </div>

        <dl className="grid grid-cols-1 gap-4 p-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Último preenchimento</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">
              {assessment.signedAt ? formatBusinessDateBr(assessment.signedAt) : "Não preenchido"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Validade (365 dias)</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-foreground">
              {assessment.expiresAt
                ? `${formatBusinessDateBr(assessment.expiresAt)}${
                    assessment.daysUntilExpiration != null
                      ? assessment.daysUntilExpiration < 0
                        ? ` (vencido há ${Math.abs(assessment.daysUntilExpiration)} dias)`
                        : ` (${assessment.daysUntilExpiration} dias restantes)`
                      : ""
                  }`
                : "Aguardando preenchimento"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Assinado por</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {assessment.signerName
                ? `${assessment.signerName} (${SIGNER_ROLE_LABELS[assessment.signerRole ?? ""] ?? "Responsável"})`
                : "—"}
            </dd>
          </div>
        </dl>

        {assessment.hasYesAnswer ? (
          <div className="bg-muted/30 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="flex items-start gap-2 text-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                <span>
                  Houve resposta <strong>&quot;Sim&quot;</strong> nas perguntas{" "}
                  <span className="font-medium tabular-nums">
                    {assessment.yesQuestionNumbers.join(", ")}
                  </span>
                  . Recomenda-se avaliação médica e envio do atestado atualizado.
                </span>
              </p>
              <Button asChild size="sm" variant="outline" className="min-h-9">
                <Link href={enrollmentHref}>
                  Enviar atestado médico
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {!showForm && canSign ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              {assessment.status === "expiring_soon"
                ? "Seu PAR-Q vence em breve. Você já pode renová-lo agora para manter a regularidade anual."
                : "Caso sua condição de saúde mude antes do vencimento anual, preencha um novo PAR-Q."}
            </p>
            <Button
              type="button"
              variant={assessment.status === "expiring_soon" ? "default" : "outline"}
              size="sm"
              className="min-h-10"
              onClick={() => setShowForm(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              {assessment.status === "expiring_soon" ? "Renovar PAR-Q agora" : "Preencher novo PAR-Q"}
            </Button>
          </div>
        ) : null}
      </section>

      {/* Aviso para menor de idade */}
      {!canSign ? (
        <Alert>
          <AlertTitle>Preenchimento exclusivo pelo responsável legal</AlertTitle>
          <AlertDescription>
            Para alunos menores de idade, o Questionário de Prontidão (PAR-Q) e o Termo de Responsabilidade devem ser preenchidos e assinados pelo responsável legal no portal da família.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Resumo das respostas anteriores quando já preenchido e formulário fechado */}
      {!showForm && assessment.submissionId ? (
        <section
          aria-labelledby="parq-summary-heading"
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
        >
          <div className="border-b border-border px-5 py-3.5">
            <h3 id="parq-summary-heading" className="text-sm font-semibold text-foreground">
              Respostas registradas no último PAR-Q
            </h3>
          </div>
          <ol className="divide-y divide-border text-sm">
            {PARQ_QUESTIONS.map((question) => {
              const val = assessment.answers[question.id];
              return (
                <li
                  key={question.id}
                  className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-foreground">
                    <span className="font-medium tabular-nums">{question.number})</span>{" "}
                    {question.text}
                  </p>
                  <StatusBadge tone={val === "yes" ? "warning" : "success"}>
                    {val === "yes" ? "Sim" : "Não"}
                  </StatusBadge>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {/* Formulário oficial CREF1 (Anexo I + Anexo II) */}
      {showForm && canSign ? (
        <form
          action={submitParqAction}
          onSubmit={() => {
            if (signatureInputRef.current && canvasRef.current) {
              const canvas = canvasRef.current;
              if (typedName.trim().length >= 3) {
                const context = canvas.getContext("2d");
                if (context) {
                  context.save();
                  context.setTransform(1, 0, 0, 1, 0, 0);
                  context.clearRect(0, 0, canvas.width, canvas.height);
                  context.fillStyle = "#ffffff";
                  context.fillRect(0, 0, canvas.width, canvas.height);
                  context.fillStyle = "#0f172a";
                  context.font = `${Math.max(18, Math.floor(canvas.height / 5))}px sans-serif`;
                  context.fillText(typedName.trim(), 16, canvas.height / 2, canvas.width - 32);
                  context.restore();
                }
              }
              signatureInputRef.current.value = canvas.toDataURL("image/png");
            }
          }}
          className="space-y-6"
        >
          {profileId ? <input type="hidden" name="profile_id" value={profileId} /> : null}
          <input ref={signatureInputRef} type="hidden" name="signature_data_url" />
          <input
            type="hidden"
            name="signer_name"
            value={typedName.trim() || defaultSignerName}
          />

          {/* ANEXO I */}
          <section
            aria-labelledby="parq-anexo-1"
            className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
          >
            <div className="space-y-1.5 border-b border-border bg-muted/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="parq-anexo-1" className="text-base font-semibold text-foreground">
                  ANEXO I — Questionário de Prontidão para Atividade Física (PAR-Q)
                </h2>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {answeredCount} de {PARQ_QUESTIONS.length} respondidas
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{PARQ_HEADER_INTRO}</p>
            </div>

            <ol className="divide-y divide-border">
              {PARQ_QUESTIONS.map((question) => {
                const current = answers[question.id];
                return (
                  <li key={question.id} className="space-y-3 p-5">
                    <fieldset className="space-y-3">
                      <legend className="text-sm font-medium leading-relaxed text-foreground">
                        <span className="tabular-nums">{question.number})</span> {question.text}
                      </legend>
                      <div className="flex flex-wrap gap-2.5">
                        <label
                          className={`inline-flex min-h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-(--duration-quick) ${
                            current === "yes"
                              ? "border-warning bg-warning/15 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value="yes"
                            checked={current === "yes"}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [question.id]: "yes" }))
                            }
                            className="sr-only"
                            required
                          />
                          Sim
                        </label>

                        <label
                          className={`inline-flex min-h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-(--duration-quick) ${
                            current === "no"
                              ? "border-success bg-success/15 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value="no"
                            checked={current === "no"}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [question.id]: "no" }))
                            }
                            className="sr-only"
                            required
                          />
                          Não
                        </label>
                      </div>
                    </fieldset>
                  </li>
                );
              })}
            </ol>
          </section>

          {hasAnyYes ? (
            <Alert>
              <AlertTitle>Atenção: uma ou mais respostas foram &quot;Sim&quot;</AlertTitle>
              <AlertDescription>
                Ao responder &quot;Sim&quot; a qualquer pergunta do PAR-Q, recomenda-se consultar um médico antes de iniciar ou intensificar os treinos e enviar um atestado médico atualizado pela área de matrícula. O professor também será avisado automaticamente.
              </AlertDescription>
            </Alert>
          ) : allAnswered ? (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-xs">
              <CheckCircle2 className="size-4 shrink-0 text-success-foreground" aria-hidden="true" />
              <span>Todas as 10 perguntas respondidas com &quot;Não&quot;. Leia e assine o Termo de Responsabilidade abaixo para concluir.</span>
            </div>
          ) : null}

          {/* ANEXO II — Termo de Responsabilidade */}
          <section
            aria-labelledby="parq-anexo-2"
            className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-xs"
          >
            <div className="space-y-1.5">
              <h2 id="parq-anexo-2" className="text-base font-semibold text-foreground">
                ANEXO II — Termo de Responsabilidade para Prática de Atividade Física
              </h2>
              <p className="text-xs text-muted-foreground">
                Ebener Taekwondo · Referência oficial CREF1 · Data: {todayBr}
              </p>
            </div>

            <blockquote className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
              {PARQ_RESPONSIBILITY_TERM}
            </blockquote>

            {/* Área de assinatura manuscrita */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileSignature className="size-4 text-primary-text" aria-hidden="true" />
                  Assinatura digital
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Eraser className="mr-1.5 size-3.5" aria-hidden="true" />
                  Limpar
                </Button>
              </div>

              <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-white">
                <canvas
                  ref={canvasRef}
                  aria-label="Área para desenhar sua assinatura no Termo de Responsabilidade"
                  role="img"
                  onPointerDown={startDrawing}
                  onPointerMove={moveDrawing}
                  onPointerUp={() => setDrawing(false)}
                  onPointerCancel={() => setDrawing(false)}
                  className="h-40 w-full cursor-crosshair touch-none"
                />
                {!drawn ? (
                  <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-xs text-muted-foreground">
                    Desenhe sua assinatura com o dedo ou mouse aqui
                  </div>
                ) : null}
              </div>
            </div>

            <label className="grid gap-1.5 text-sm font-medium text-foreground" htmlFor="parq-typed-name">
              Ou assine digitando seu nome completo
              <input
                id="parq-typed-name"
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                placeholder={defaultSignerName}
                autoComplete="name"
                maxLength={128}
                className="h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground"
              />
              <span className="text-xs font-normal text-muted-foreground">
                Responsável pela assinatura: {typedName.trim() || defaultSignerName} · Validade de 12 meses a partir de {todayBr}.
              </span>
            </label>

            <label className="flex cursor-pointer select-none items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <input
                name="term_accepted"
                type="checkbox"
                checked={termAccepted}
                onChange={(event) => setTermAccepted(event.target.checked)}
                required
                className="mt-0.5 size-4 cursor-pointer rounded border-border accent-primary"
              />
              <span className="leading-normal text-foreground">
                Confirmo a veracidade das respostas do PAR-Q acima, li o Termo de Responsabilidade (Anexo II) e reconheço a validade desta assinatura eletrônica por 12 meses.
              </span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <FormSubmitButton
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 w-full sm:w-auto"
                pendingLabel="Registrando PAR-Q…"
              >
                <FileSignature className="size-4" aria-hidden="true" />
                Assinar e enviar PAR-Q anual
              </FormSubmitButton>

              {assessment.submissionId && !needsRenewal ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar renovação
                </Button>
              ) : null}
            </div>
          </section>
        </form>
      ) : null}
    </div>
  );
}
