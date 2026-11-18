"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { submitParqAction } from "@/app/actions/parq";
import { FormSubmitButton } from "@/components/shared/form-submit-button";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PARQ_QUESTIONS,
  PARQ_RESPONSIBILITY_TERM,
  PARQ_STATUS_LABELS,
  type ParqAnswerValue,
  type ParqAssessment,
  type ParqQuestionId,
  type ParqStatus,
} from "@/features/students/parq-rules";
import { formatBusinessDateBr } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eraser,
  FileSignature,
  HeartPulse,
  RefreshCw,
} from "@/components/ui/icons";

const STATUS_TONES: Record<ParqStatus, StatusTone> = {
  valid: "success",
  expiring_soon: "warning",
  expired: "danger",
  missing: "warning",
};

const SIGNER_ROLE_LABELS: Record<string, string> = {
  adult_student: "Próprio aluno",
  guardian: "Responsável",
  admin: "Professor",
};

const TOTAL_STEPS = PARQ_QUESTIONS.length + 1; // 10 perguntas + passo final de confirmação/assinatura
const SIGNATURE_STEP_INDEX = PARQ_QUESTIONS.length;

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
  const needsFill = assessment.status === "missing" || assessment.status === "expired";
  const [isFilling, setIsFilling] = useState(needsFill && canSign);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<ParqQuestionId, ParqAnswerValue>>>({});
  const [termAccepted, setTermAccepted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [validationError, setValidationError] = useState("");
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isFilling || stepIndex !== SIGNATURE_STEP_INDEX) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
  }, [isFilling, stepIndex]);

  const answeredCount = PARQ_QUESTIONS.filter(
    (q) => answers[q.id] === "yes" || answers[q.id] === "no"
  ).length;
  const allAnswered = answeredCount === PARQ_QUESTIONS.length;
  const yesQuestions = PARQ_QUESTIONS.filter((q) => answers[q.id] === "yes");
  const hasAnyYes = yesQuestions.length > 0;
  const hasSignature = drawn || typedName.trim().length >= 3;
  const canSubmit = canSign && allAnswered && termAccepted && hasSignature;

  const currentQuestion =
    stepIndex < PARQ_QUESTIONS.length ? PARQ_QUESTIONS[stepIndex] : null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleSelectAnswer = (questionId: ParqQuestionId, value: ParqAnswerValue) => {
    const wasUnanswered = answers[questionId] === undefined;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setValidationError("");

    if (wasUnanswered && stepIndex < SIGNATURE_STEP_INDEX) {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        setStepIndex((prev) => (prev < SIGNATURE_STEP_INDEX ? prev + 1 : prev));
      }, 220);
    }
  };

  const handleNext = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (currentQuestion && !currentAnswer) {
      setValidationError("Escolha Sim ou Não para continuar.");
      return;
    }
    setValidationError("");
    setStepIndex((prev) => Math.min(SIGNATURE_STEP_INDEX, prev + 1));
  };

  const handleBack = () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setValidationError("");
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleJumpToStep = (target: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    // Permite navegar para qualquer pergunta já respondida, para a próxima livre ou para o passo final se todas respondidas.
    const firstUnanswered = PARQ_QUESTIONS.findIndex(
      (q) => answers[q.id] !== "yes" && answers[q.id] !== "no"
    );
    const maxReachable = firstUnanswered === -1 ? SIGNATURE_STEP_INDEX : firstUnanswered;
    if (target <= maxReachable) {
      setValidationError("");
      setStepIndex(target);
    }
  };

  const startFreshForm = () => {
    setAnswers({});
    setTermAccepted(false);
    setDrawn(false);
    setTypedName("");
    setValidationError("");
    setStepIndex(0);
    setIsFilling(true);
  };

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

  // Visualização resumida (quando já está preenchido ou quando é menor de idade)
  if (!isFilling || !canSign) {
    return (
      <div className="space-y-5">
        <section
          aria-labelledby="health-status-heading"
          className="overflow-hidden rounded-xl border border-border bg-card shadow-xs divide-y divide-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary-text">
                <HeartPulse className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="health-status-heading" className="text-base font-semibold text-foreground">
                  Questionário de saúde · {studentName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Atualizado uma vez por ano para sua segurança nos treinos
                </p>
              </div>
            </div>
            <StatusBadge tone={STATUS_TONES[assessment.status]}>
              {PARQ_STATUS_LABELS[assessment.status]}
            </StatusBadge>
          </div>

          <dl className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Respondido em</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {assessment.signedAt ? formatBusinessDateBr(assessment.signedAt) : "Ainda não respondido"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Válido até</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {assessment.expiresAt
                  ? `${formatBusinessDateBr(assessment.expiresAt)}${
                      assessment.daysUntilExpiration != null
                        ? assessment.daysUntilExpiration < 0
                          ? ` (venceu há ${Math.abs(assessment.daysUntilExpiration)} dias)`
                          : ` (faltam ${assessment.daysUntilExpiration} dias)`
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
            <div className="bg-muted/20 px-5 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="flex items-start gap-2 text-foreground">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-warning-foreground"
                    aria-hidden="true"
                  />
                  <span>
                    Você respondeu <strong>&quot;Sim&quot;</strong> em{" "}
                    {assessment.yesQuestionNumbers.length === 1
                      ? `1 pergunta (${assessment.yesQuestionNumbers[0]})`
                      : `${assessment.yesQuestionNumbers.length} perguntas (${assessment.yesQuestionNumbers.join(", ")})`}
                    . Recomendamos enviar um atestado médico atualizado na sua matrícula.
                  </span>
                </p>
                <Button asChild size="sm" variant="outline" className="min-h-9">
                  <Link href={enrollmentHref}>
                    Enviar atestado
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {canSign ? (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 px-5 py-3.5">
              <p className="text-xs text-muted-foreground">
                {assessment.status === "expiring_soon"
                  ? "Seu questionário vence em breve. Você já pode atualizar suas respostas agora."
                  : "Se algo mudou na sua saúde, você pode responder novamente a qualquer momento."}
              </p>
              <Button
                type="button"
                variant={assessment.status === "expiring_soon" ? "default" : "outline"}
                size="sm"
                className="min-h-10"
                onClick={startFreshForm}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {assessment.status === "expiring_soon"
                  ? "Renovar agora"
                  : "Responder novamente"}
              </Button>
            </div>
          ) : null}
        </section>

        {!canSign ? (
          <Alert>
            <AlertTitle>Preenchido pelo seu responsável</AlertTitle>
            <AlertDescription>
              Para alunos menores de 18 anos, este questionário e a assinatura de responsabilidade são feitos pelo responsável no portal da família.
            </AlertDescription>
          </Alert>
        ) : null}

        {assessment.submissionId ? (
          <section className="overflow-hidden rounded-xl border border-border bg-card px-5 shadow-xs">
            <Accordion type="single" collapsible>
              <AccordionItem value="answers" className="border-b-0">
                <AccordionTrigger className="text-sm font-medium">
                  Ver respostas do último questionário
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <ol className="divide-y divide-border text-sm">
                    {PARQ_QUESTIONS.map((question) => {
                      const val = assessment.answers[question.id];
                      return (
                        <li
                          key={question.id}
                          className="flex flex-col gap-2 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="text-foreground">
                            <span className="font-medium tabular-nums">{question.number}.</span>{" "}
                            {question.text}
                          </p>
                          <StatusBadge tone={val === "yes" ? "warning" : "success"}>
                            {val === "yes" ? "Sim" : "Não"}
                          </StatusBadge>
                        </li>
                      );
                    })}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        ) : null}
      </div>
    );
  }

  // Modo Stepper (1 pergunta por passo + passo final de confirmação e assinatura)
  const progressPct = ((stepIndex + 1) / TOTAL_STEPS) * 100;
  const firstUnanswered = PARQ_QUESTIONS.findIndex(
    (q) => answers[q.id] !== "yes" && answers[q.id] !== "no"
  );
  const maxReachableStep = firstUnanswered === -1 ? SIGNATURE_STEP_INDEX : firstUnanswered;

  return (
    <div className="space-y-4">
      {validationError ? (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        {/* Cabeçalho do Stepper — segue exatamente a diretriz visual do EnrollmentForm */}
        <div className="space-y-3 border-b border-border bg-muted/20 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {currentQuestion
                  ? `Pergunta ${currentQuestion.number} de ${PARQ_QUESTIONS.length} · ${currentQuestion.topic}`
                  : "Último passo · Revisar e assinar"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {currentQuestion
                  ? "Leva menos de 2 minutos. Responda com calma."
                  : "Confira suas respostas e assine para concluir."}
              </p>
            </div>

            {assessment.submissionId && !needsFill ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setIsFilling(false)}
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Voltar ao resumo
              </Button>
            ) : (
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {answeredCount}/{PARQ_QUESTIONS.length} respondidas
              </span>
            )}
          </div>

          <Progress
            value={progressPct}
            className="h-1.5"
            aria-label="Progresso do questionário de saúde"
          />

          {/* Trilha clicável de passos (1..10 + Assinar) */}
          <ol
            aria-label="Etapas do questionário"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PARQ_QUESTIONS.map((q, index) => {
              const value = answers[q.id];
              const isCurrent = index === stepIndex;
              const isAnswered = value === "yes" || value === "no";
              const isClickable = index <= maxReachableStep;

              return (
                <li key={q.id} aria-current={isCurrent ? "step" : undefined}>
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => handleJumpToStep(index)}
                    aria-label={`Pergunta ${q.number}: ${q.topic}${isAnswered ? ` (${value === "yes" ? "Sim" : "Não"})` : ""}`}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors duration-(--duration-quick)",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isAnswered
                          ? value === "yes"
                            ? "border-warning/60 bg-warning/15 text-foreground hover:bg-warning/25"
                            : "border-success/50 bg-success/15 text-success-foreground hover:bg-success/25"
                          : "border-border bg-background text-muted-foreground opacity-60"
                    )}
                  >
                    {isAnswered && !isCurrent ? (
                      <Check className="size-3" aria-hidden="true" />
                    ) : (
                      q.number
                    )}
                  </button>
                </li>
              );
            })}
            <li aria-current={stepIndex === SIGNATURE_STEP_INDEX ? "step" : undefined}>
              <button
                type="button"
                disabled={!allAnswered}
                onClick={() => handleJumpToStep(SIGNATURE_STEP_INDEX)}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors duration-(--duration-quick)",
                  stepIndex === SIGNATURE_STEP_INDEX
                    ? "border-primary bg-primary text-primary-foreground"
                    : allAnswered
                      ? "border-border bg-card text-foreground hover:bg-muted"
                      : "border-border bg-background text-muted-foreground opacity-60"
                )}
              >
                <FileSignature className="size-3" aria-hidden="true" />
                Assinar
              </button>
            </li>
          </ol>
        </div>

        <form
          action={submitParqAction}
          onSubmit={(event) => {
            if (!canSubmit) {
              event.preventDefault();
              setValidationError("Complete todas as respostas, aceite o termo e assine para enviar.");
              return;
            }
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
        >
          {profileId ? <input type="hidden" name="profile_id" value={profileId} /> : null}
          <input ref={signatureInputRef} type="hidden" name="signature_data_url" />
          <input
            type="hidden"
            name="signer_name"
            value={typedName.trim() || defaultSignerName}
          />
          {PARQ_QUESTIONS.map((q) => (
            <input key={q.id} type="hidden" name={q.id} value={answers[q.id] ?? ""} />
          ))}

          {/* Corpo da etapa atual */}
          <div className="px-5 py-6 sm:px-6 sm:py-8">
            {currentQuestion ? (
              <div key={currentQuestion.id} className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pergunta {currentQuestion.number} de {PARQ_QUESTIONS.length}
                  </p>
                  <p className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
                    {currentQuestion.text}
                  </p>
                </div>

                <div
                  role="radiogroup"
                  aria-label={`Resposta para a pergunta ${currentQuestion.number}`}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={currentAnswer === "no"}
                    onClick={() => handleSelectAnswer(currentQuestion.id, "no")}
                    className={cn(
                      "flex min-h-16 items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors duration-(--duration-quick) focus-visible:outline-2 focus-visible:outline-ring",
                      currentAnswer === "no"
                        ? "border-success bg-success/10 text-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div>
                      <span className="block text-base font-semibold">Não</span>
                      <span className="block text-xs text-muted-foreground">
                        Não se aplica a mim
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border",
                        currentAnswer === "no"
                          ? "border-success bg-success text-success-foreground"
                          : "border-border"
                      )}
                      aria-hidden="true"
                    >
                      {currentAnswer === "no" ? <Check className="size-3.5" /> : null}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={currentAnswer === "yes"}
                    onClick={() => handleSelectAnswer(currentQuestion.id, "yes")}
                    className={cn(
                      "flex min-h-16 items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors duration-(--duration-quick) focus-visible:outline-2 focus-visible:outline-ring",
                      currentAnswer === "yes"
                        ? "border-warning bg-warning/10 text-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div>
                      <span className="block text-base font-semibold">Sim</span>
                      <span className="block text-xs text-muted-foreground">
                        Acontece ou já aconteceu
                      </span>
                    </div>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border",
                        currentAnswer === "yes"
                          ? "border-warning bg-warning text-warning-foreground"
                          : "border-border"
                      )}
                      aria-hidden="true"
                    >
                      {currentAnswer === "yes" ? <Check className="size-3.5" /> : null}
                    </span>
                  </button>
                </div>

                {currentAnswer === "yes" ? (
                  <p className="flex items-start gap-2 rounded-lg bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                    <AlertTriangle
                      className="mt-0.5 size-3.5 shrink-0 text-warning-foreground"
                      aria-hidden="true"
                    />
                    <span>
                      Tudo bem marcar &quot;Sim&quot;. Ao finalizar, vamos avisar o professor e recomendar um atestado médico para você treinar com total tranquilidade.
                    </span>
                  </p>
                ) : null}
              </div>
            ) : (
              /* Passo final: Resumo + Termo de responsabilidade + Assinatura */
              <div className="space-y-6">
                {hasAnyYes ? (
                  <Alert>
                    <AlertTitle>Recomendamos conversar com seu médico</AlertTitle>
                    <AlertDescription>
                      Você respondeu &quot;Sim&quot; em{" "}
                      {yesQuestions.length === 1
                        ? `1 pergunta (${yesQuestions[0].topic})`
                        : `${yesQuestions.length} perguntas`}
                      . Por cuidado com a sua saúde, leve ou envie um atestado médico atualizado na sua ficha. O professor também será avisado.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">
                    <CheckCircle2
                      className="size-4 shrink-0 text-success-foreground"
                      aria-hidden="true"
                    />
                    <span>
                      Todas as 10 perguntas respondidas com &quot;Não&quot;. Só falta confirmar e assinar abaixo.
                    </span>
                  </div>
                )}

                {/* Revisão rápida clicável */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="review" className="rounded-xl border border-border px-4">
                    <AccordionTrigger className="py-3 text-sm font-medium">
                      Revisar minhas 10 respostas
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <ol className="divide-y divide-border text-sm">
                        {PARQ_QUESTIONS.map((q, index) => {
                          const val = answers[q.id];
                          return (
                            <li
                              key={q.id}
                              className="flex items-center justify-between gap-3 py-2.5"
                            >
                              <button
                                type="button"
                                onClick={() => setStepIndex(index)}
                                className="min-w-0 text-left text-xs text-muted-foreground hover:text-foreground hover:underline sm:text-sm"
                              >
                                <span className="font-medium text-foreground tabular-nums">
                                  {q.number}.
                                </span>{" "}
                                {q.topic}
                              </button>
                              <StatusBadge tone={val === "yes" ? "warning" : "success"}>
                                {val === "yes" ? "Sim" : "Não"}
                              </StatusBadge>
                            </li>
                          );
                        })}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Termo de responsabilidade oficial */}
                <div className="space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Termo de responsabilidade
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ebener Taekwondo · Questionário de prontidão física (PAR-Q) · {todayBr}
                    </p>
                  </div>
                  <blockquote className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
                    {PARQ_RESPONSIBILITY_TERM}
                  </blockquote>
                </div>

                {/* Assinatura */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FileSignature className="size-4 text-primary-text" aria-hidden="true" />
                      Assine com o dedo ou mouse
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Eraser className="mr-1.5 size-3.5" aria-hidden="true" />
                      Limpar
                    </Button>
                  </div>

                  <div className="relative overflow-hidden rounded-xl border border-dashed border-border bg-white">
                    <canvas
                      ref={canvasRef}
                      aria-label="Área para desenhar sua assinatura"
                      role="img"
                      onPointerDown={startDrawing}
                      onPointerMove={moveDrawing}
                      onPointerUp={() => setDrawing(false)}
                      onPointerCancel={() => setDrawing(false)}
                      className="h-36 w-full cursor-crosshair touch-none"
                    />
                    {!drawn ? (
                      <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-xs text-muted-foreground">
                        Assine aqui
                      </div>
                    ) : null}
                  </div>

                  <label
                    className="grid gap-1.5 text-sm font-medium text-foreground"
                    htmlFor="parq-typed-name"
                  >
                    Ou digite seu nome completo para assinar
                    <input
                      id="parq-typed-name"
                      value={typedName}
                      onChange={(event) => setTypedName(event.target.value)}
                      placeholder={defaultSignerName}
                      autoComplete="name"
                      maxLength={128}
                      className="h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground"
                    />
                  </label>
                </div>

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
                    Confirmo que minhas respostas são verdadeiras e concordo com o termo de responsabilidade acima.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Rodapé padronizado — igual ao EnrollmentForm */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3.5">
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              disabled={stepIndex === 0}
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar
            </Button>

            {currentQuestion ? (
              <Button
                type="button"
                className="min-h-10"
                disabled={!currentAnswer}
                onClick={handleNext}
              >
                {stepIndex === PARQ_QUESTIONS.length - 1 ? "Ir para assinatura" : "Próxima"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <FormSubmitButton
                type="submit"
                disabled={!canSubmit}
                className="min-h-10"
                pendingLabel="Salvando respostas…"
              >
                <FileSignature className="size-4" aria-hidden="true" />
                Confirmar e assinar
              </FormSubmitButton>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
