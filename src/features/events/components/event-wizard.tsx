"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createEventAction } from "@/app/actions/events";
import { DateField } from "@/components/shared/date-field";
import { InfoTip } from "@/components/shared/info-tip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { EVENT_TYPE_HINT, EVENT_TYPE_LABEL } from "@/features/events/labels";
import type { EventAudience, EventType } from "@/features/events/types";
import { LocationSelect } from "@/features/locations/components/location-select";
import type { TrainingLocation } from "@/features/locations/types";
import { formatBrl, reaisToCents } from "@/lib/money";
import { adminEventPath, ROUTES } from "@/lib/navigation/routes";

const STEPS = ["Tipo", "Dados e datas", "Opções", "Regras", "Revisão"] as const;
const SELECTABLE_TYPES: EventType[] = ["seminar", "social", "other"];

type OptionDraft = { label: string; price: string; capacity: string };

const AUDIENCE_LABEL: Record<EventAudience, string> = {
  students: "Somente alunos",
  students_and_guests: "Alunos e convidados",
  public: "Aberto ao público"
};

const PRESETS: Record<EventType, { options: OptionDraft[]; audience: EventAudience; maxCompanions: string }> = {
  belt_exam: { options: [], audience: "students", maxCompanions: "0" },
  championship: { options: [], audience: "students", maxCompanions: "0" },
  seminar: { options: [{ label: "Participante", price: "", capacity: "" }], audience: "students_and_guests", maxCompanions: "0" },
  social: { options: [{ label: "Aluno", price: "", capacity: "" }], audience: "students", maxCompanions: "2" },
  other: { options: [{ label: "Participante", price: "", capacity: "" }], audience: "students", maxCompanions: "0" }
};

function moneyToCents(value: string) {
  if (!value.trim()) return 0;
  try {
    return reaisToCents(value);
  } catch {
    return null;
  }
}

export function EventWizard({ locations }: { locations: TrainingLocation[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<EventType>("seminar");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [opensDate, setOpensDate] = useState("");
  const [closesDate, setClosesDate] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(PRESETS.seminar.options);
  const [audience, setAudience] = useState<EventAudience>(PRESETS.seminar.audience);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [capacity, setCapacity] = useState("");
  const [maxCompanions, setMaxCompanions] = useState("0");
  const [companionPrice, setCompanionPrice] = useState("");
  const [birthYear, setBirthYear] = useState(true);
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function chooseType(next: EventType) {
    setType(next);
    setOptions(PRESETS[next].options.map((option) => ({ ...option })));
    setAudience(PRESETS[next].audience);
    setMaxCompanions(PRESETS[next].maxCompanions);
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((current) => current.map((option, position) => (position === index ? { ...option, ...patch } : option)));
  }

  function stepError(target: number): string | null {
    if (target >= 1 && type && !SELECTABLE_TYPES.includes(type)) return "Escolha um tipo de evento.";
    if (target >= 2 && (title.trim().length < 3 || !date || !startTime)) return "Informe o nome, a data e o horário.";
    if (target >= 2 && opensDate && closesDate && closesDate < opensDate) return "O encerramento das inscrições não pode ser antes da abertura.";
    if (target >= 3 && (options.length === 0 || options.some((option) => option.label.trim().length < 2 || moneyToCents(option.price) === null))) return "Preencha o nome e um valor válido em todas as opções.";
    if (target >= 4 && (moneyToCents(companionPrice) === null || (capacity && Number(capacity) < 1))) return "Revise a capacidade e o valor dos acompanhantes.";
    return null;
  }

  function go(target: number) {
    if (target > step) {
      const problem = stepError(target);
      if (problem) {
        setError(problem);
        return;
      }
    }
    setError(null);
    setStep(target);
  }

  function submit() {
    const problem = stepError(4);
    if (problem) {
      setError(problem);
      return;
    }
    const location = String(new FormData(formRef.current ?? undefined).get("location") ?? "").trim();
    const companions = Math.max(0, Number(maxCompanions) || 0);
    const payload = {
      eventType: type,
      title: title.trim(),
      description: description.trim() || undefined,
      startsDate: date,
      startsTime: startTime,
      endsTime: endTime || undefined,
      locationText: location || undefined,
      organizerType: "academy",
      registrationOpensDate: opensDate || undefined,
      registrationClosesDate: closesDate || undefined,
      audience,
      requiresApproval,
      capacity: capacity ? Number(capacity) : undefined,
      maxCompanions: companions,
      companionPriceCents: companions > 0 ? (moneyToCents(companionPrice) ?? 0) : 0,
      ageCutoff: birthYear ? "birth_year" : "event_date",
      options: options.map((option) => ({ label: option.label.trim(), priceCents: moneyToCents(option.price) ?? 0, capacity: option.capacity ? Number(option.capacity) : undefined, modality: "general" })),
      publish
    };
    setError(null);
    startTransition(async () => {
      const result = await createEventAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(publish ? "Evento publicado" : "Rascunho salvo");
      router.push(adminEventPath(result.eventId));
    });
  }

  return (
    <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="space-y-6">
      <ol className="flex flex-wrap gap-2" aria-label="Etapas">
        {STEPS.map((label, index) => (
          <li key={label}>
            <StatusBadge tone={index === step ? "info" : index < step ? "success" : "neutral"} aria-current={index === step ? "step" : undefined}>
              {index + 1}. {label}
            </StatusBadge>
          </li>
        ))}
      </ol>

      <div hidden={step !== 0} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SELECTABLE_TYPES.map((item) => (
            <button key={item} type="button" onClick={() => chooseType(item)} aria-pressed={type === item} className={`rounded-xl border p-4 text-left shadow-xs transition-colors ${type === item ? "border-primary bg-accent" : "border-border bg-card hover:bg-muted"}`}>
              <span className="block text-sm font-semibold text-foreground">{EVENT_TYPE_LABEL[item]}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{EVENT_TYPE_HINT[item]}</span>
            </button>
          ))}
          <Link href={ROUTES.adminExams} className="rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:bg-muted">
            <span className="block text-sm font-semibold text-foreground">{EVENT_TYPE_LABEL.belt_exam}</span>
            <span className="mt-1 block text-sm text-muted-foreground">Criado em Exames de faixa, com elegibilidade e promoção de graduação.</span>
          </Link>
          <div className="rounded-xl border border-dashed border-border bg-card p-4 opacity-70">
            <span className="block text-sm font-semibold text-foreground">{EVENT_TYPE_LABEL.championship}</span>
            <span className="mt-1 block text-sm text-muted-foreground">Em breve: prazos da federação, categorias e documentos.</span>
          </div>
        </div>
      </div>

      <div hidden={step !== 1}>
        <Card>
          <CardHeader>
            <CardTitle>Dados e datas</CardTitle>
            <CardDescription>Horários em Brasília.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="event-title">Nome do evento</FieldLabel>
              <Input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={128} placeholder="Ex.: Aulão de chutes" className="h-11" />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="event-description">Descrição e programação</FieldLabel>
              <Textarea id="event-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} rows={3} />
            </Field>
            <DateField id="event-date" name="event_date" label="Data do evento" defaultValue={date} onValueChange={setDate} required />
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="event-start">Início</FieldLabel>
                <Input id="event-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="h-11 tabular-nums" />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-end">Término</FieldLabel>
                <Input id="event-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="h-11 tabular-nums" />
              </Field>
            </div>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="event-location">Local</FieldLabel>
              <LocationSelect id="event-location" name="location" locations={locations} placeholder="Selecione o dojang ou informe outro local" />
            </Field>
            <DateField id="event-opens" name="opens_date" label="Inscrições abrem em" defaultValue={opensDate} onValueChange={setOpensDate} description="Vazio: abrem ao publicar." />
            <DateField id="event-closes" name="closes_date" label="Inscrições encerram em" defaultValue={closesDate} onValueChange={setClosesDate} description="Vazio: até o dia do evento." />
          </CardContent>
        </Card>
      </div>

      <div hidden={step !== 2}>
        <Card>
          <CardHeader>
            <CardTitle>Opções de inscrição</CardTitle>
            <CardDescription>Cada opção tem nome, valor e, se quiser, um limite próprio de vagas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.map((option, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
                <Field>
                  <FieldLabel htmlFor={`option-label-${index}`}>Nome</FieldLabel>
                  <Input id={`option-label-${index}`} value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} maxLength={128} className="h-11" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`option-price-${index}`}>Valor (R$)</FieldLabel>
                  <Input id={`option-price-${index}`} value={option.price} onChange={(event) => updateOption(index, { price: event.target.value })} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`option-capacity-${index}`}>Vagas</FieldLabel>
                  <Input id={`option-capacity-${index}`} value={option.capacity} onChange={(event) => updateOption(index, { capacity: event.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Sem limite" className="h-11 tabular-nums" />
                </Field>
                <Button type="button" variant="outline" className="min-h-11" disabled={options.length === 1} onClick={() => setOptions((current) => current.filter((_, position) => position !== index))}>
                  Remover
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="min-h-11" disabled={options.length >= 30} onClick={() => setOptions((current) => [...current, { label: "", price: "", capacity: "" }])}>
              Adicionar opção
            </Button>
          </CardContent>
        </Card>
      </div>

      <div hidden={step !== 3}>
        <Card>
          <CardHeader>
            <CardTitle>Regras</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field>
              <div className="flex items-center gap-1">
                <FieldLabel htmlFor="event-audience">Quem pode se inscrever</FieldLabel>
                <InfoTip label="Sobre convidados">Convidados sem conta informam só nome e WhatsApp, não acessam o aplicativo e têm o contato apagado após o evento.</InfoTip>
              </div>
              <Select value={audience} onValueChange={(value) => setAudience(value as EventAudience)}>
                <SelectTrigger id="event-audience" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIENCE_LABEL) as EventAudience[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {AUDIENCE_LABEL[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <div className="flex items-center gap-1">
                <FieldLabel htmlFor="event-capacity">Limite geral de vagas</FieldLabel>
                <InfoTip label="Sobre a lista de espera">Quando lota, novas inscrições entram na lista de espera e sobem na ordem de chegada se alguém cancelar. Acompanhantes ocupam vaga.</InfoTip>
              </div>
              <Input id="event-capacity" value={capacity} onChange={(event) => setCapacity(event.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="Sem limite" className="h-11 tabular-nums" />
            </Field>
            <Field>
              <FieldLabel htmlFor="event-companions">Acompanhantes por inscrição</FieldLabel>
              <Input id="event-companions" value={maxCompanions} onChange={(event) => setMaxCompanions(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" className="h-11 tabular-nums" />
            </Field>
            {Number(maxCompanions) > 0 ? (
              <Field>
                <FieldLabel htmlFor="event-companion-price">Valor por acompanhante (R$)</FieldLabel>
                <Input id="event-companion-price" value={companionPrice} onChange={(event) => setCompanionPrice(event.target.value)} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
              </Field>
            ) : null}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Aprovar cada inscrição</p>
                <p className="text-sm text-muted-foreground">A vaga fica reservada, mas só vale depois da sua aprovação.</p>
              </div>
              <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} aria-label="Aprovar cada inscrição" />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium">Contar a idade pelo ano de nascimento</p>
                  <InfoTip label="Sobre a contagem de idade">Padrão da maioria dos regulamentos: vale a idade que a pessoa completa no ano do evento. Desligado, conta a idade exata no dia.</InfoTip>
                </div>
                <FieldDescription>Usado nas regras de idade das opções.</FieldDescription>
              </div>
              <Switch checked={birthYear} onCheckedChange={setBirthYear} aria-label="Contar a idade pelo ano de nascimento" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div hidden={step !== 4}>
        <Card>
          <CardHeader>
            <CardTitle>Revisão</CardTitle>
            <CardDescription>Confira antes de publicar. Você pode alterar a situação do evento depois.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Evento</dt>
                <dd className="font-medium">
                  {title || "—"} · {EVENT_TYPE_LABEL[type]}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quando</dt>
                <dd className="font-medium tabular-nums">{date ? `${date.split("-").reverse().join("/")} às ${startTime}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Público</dt>
                <dd className="font-medium">
                  {AUDIENCE_LABEL[audience]}
                  {requiresApproval ? " · com aprovação" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Vagas</dt>
                <dd className="font-medium">{capacity || "Sem limite"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Opções</dt>
                <dd className="font-medium">{options.map((option) => `${option.label || "—"} (${moneyToCents(option.price) ? formatBrl(moneyToCents(option.price) ?? 0) : "gratuito"})`).join(" · ")}</dd>
              </div>
            </dl>
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Publicar e abrir inscrições agora</p>
                <p className="text-sm text-muted-foreground">Desligado, o evento fica como rascunho e os alunos não o veem.</p>
              </div>
              <Switch checked={publish} onCheckedChange={setPublish} aria-label="Publicar e abrir inscrições agora" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-text">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => go(step - 1)} disabled={step === 0 || pending}>
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" className="min-h-11" onClick={() => go(step + 1)}>
            Continuar
          </Button>
        ) : (
          <Button type="button" className="min-h-11" onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Spinner aria-hidden="true" />
                Salvando…
              </>
            ) : publish ? (
              "Publicar evento"
            ) : (
              "Salvar rascunho"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
