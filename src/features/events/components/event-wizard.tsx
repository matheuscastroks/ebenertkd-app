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
import { useBeltLabels, useBeltRanks } from "@/components/academy-config-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { rankShortLabel, type RankKey } from "@/features/academy/ranks";
import { BeltMini, danDegreeOf } from "@/features/students/components/belt-badge";
import { EVENT_TYPE_HINT, EVENT_TYPE_LABEL } from "@/features/events/labels";
import { buildCategoryPresets, PRESET_SEX_LABEL, type PresetAgeClassKey, type PresetSex } from "@/features/events/rules/category-presets";
import { CHAMPIONSHIP_DEADLINE_KINDS, DEADLINE_KIND_LABEL } from "@/features/events/rules/deadline-rules";
import { AGE_CLASSES } from "@/features/events/rules/eligibility-rules";
import type { EligibilityRule } from "@/features/events/schemas";
import type { EventAudience, EventDeadlineKind, EventModality, EventType } from "@/features/events/types";
import { LocationSelect } from "@/features/locations/components/location-select";
import type { TrainingLocation } from "@/features/locations/types";
import { formatBrl, reaisToCents } from "@/lib/money";
import { adminEventPath, ROUTES } from "@/lib/navigation/routes";

const STEPS = ["Tipo", "Dados e datas", "Opções", "Regras", "Revisão"] as const;
const SELECTABLE_TYPES: EventType[] = ["seminar", "social", "other", "championship"];

type OptionDraft = { label: string; price: string; capacity: string; federationFee: string; modality: EventModality; eligibility?: EligibilityRule };
type DeadlineDraft = { date: string; notify: string };

const blankOption = (label = ""): OptionDraft => ({ label, price: "", capacity: "", federationFee: "", modality: "general" });

const AUDIENCE_LABEL: Record<EventAudience, string> = {
  students: "Somente alunos",
  students_and_guests: "Alunos e convidados",
  public: "Aberto ao público"
};

const PRESETS: Record<EventType, { options: OptionDraft[]; audience: EventAudience; maxCompanions: string }> = {
  belt_exam: { options: [], audience: "students", maxCompanions: "0" },
  championship: { options: [], audience: "students", maxCompanions: "0" },
  seminar: { options: [blankOption("Participante")], audience: "students_and_guests", maxCompanions: "0" },
  social: { options: [blankOption("Aluno")], audience: "students", maxCompanions: "2" },
  other: { options: [blankOption("Participante")], audience: "students", maxCompanions: "0" }
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
  // Campeonato: organizador externo, cronograma da federação e gerador de categorias.
  const ranks = useBeltRanks();
  const { levelLabel } = useBeltLabels();
  const [organizerName, setOrganizerName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [deadlines, setDeadlines] = useState<Record<string, DeadlineDraft>>({});
  const [presetModality, setPresetModality] = useState<"kyorugi" | "poomsae">("kyorugi");
  const [presetAges, setPresetAges] = useState<PresetAgeClassKey[]>(["cadete", "juvenil", "adulto"]);
  const [presetSexes, setPresetSexes] = useState<PresetSex[]>(["M", "F"]);
  const [presetPrice, setPresetPrice] = useState("");
  const [presetFee, setPresetFee] = useState("");
  const [presetMinRank, setPresetMinRank] = useState("none");
  const championship = type === "championship";

  function chooseType(next: EventType) {
    setType(next);
    setOptions(PRESETS[next].options.map((option) => ({ ...option })));
    setAudience(PRESETS[next].audience);
    setMaxCompanions(PRESETS[next].maxCompanions);
    setRequiresApproval(false);
  }

  function toggle<T extends string>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function generatePresets() {
    const price = moneyToCents(presetPrice);
    const fee = moneyToCents(presetFee);
    if (price === null || fee === null) {
      setError("Informe valores válidos para os custos e a taxa da federação.");
      return;
    }
    if (!presetAges.length || !presetSexes.length) {
      setError("Escolha ao menos uma classe de idade e um sexo.");
      return;
    }
    const generated = buildCategoryPresets({ modality: presetModality, ageClassKeys: presetAges, sexes: presetSexes, priceCents: price, federationFeeCents: fee, minRankKey: presetMinRank === "none" ? undefined : (presetMinRank as RankKey) });
    const drafts = generated.map<OptionDraft>((item) => ({ label: item.label, price: item.priceCents ? String(item.priceCents / 100).replace(".", ",") : "", capacity: "", federationFee: item.federationFeeCents ? String(item.federationFeeCents / 100).replace(".", ",") : "", modality: item.modality, eligibility: item.eligibility }));
    setError(null);
    setOptions((current) => [...current.filter((option) => !drafts.some((draft) => draft.label === option.label)), ...drafts].slice(0, 30));
  }

  function updateDeadline(kind: EventDeadlineKind, patch: Partial<DeadlineDraft>) {
    setDeadlines((current) => ({ ...current, [kind]: { ...(current[kind] ?? { date: "", notify: "3" }), ...patch } }));
  }

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((current) => current.map((option, position) => (position === index ? { ...option, ...patch } : option)));
  }

  function stepError(target: number): string | null {
    if (target >= 1 && type && !SELECTABLE_TYPES.includes(type)) return "Escolha um tipo de evento.";
    if (target >= 2 && (title.trim().length < 3 || !date || !startTime)) return "Informe o nome, a data e o horário.";
    if (target >= 2 && opensDate && closesDate && closesDate < opensDate) return "O encerramento das inscrições não pode ser antes da abertura.";
    if (target >= 3 && (options.length === 0 || options.some((option) => option.label.trim().length < 2 || moneyToCents(option.price) === null || moneyToCents(option.federationFee) === null))) return championship ? "Gere ou cadastre ao menos uma categoria e confira os valores." : "Preencha o nome e um valor válido em todas as opções.";
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
      organizerType: championship ? "external" : "academy",
      organizerName: championship ? organizerName.trim() || undefined : undefined,
      externalUrl: championship ? externalUrl.trim() || undefined : undefined,
      deadlines: championship
        ? CHAMPIONSHIP_DEADLINE_KINDS.flatMap((kind) => (deadlines[kind]?.date ? [{ kind, label: DEADLINE_KIND_LABEL[kind], dueDate: deadlines[kind].date, notifyDaysBefore: Number(deadlines[kind].notify) || 0 }] : []))
        : [],
      registrationOpensDate: opensDate || undefined,
      registrationClosesDate: closesDate || undefined,
      audience,
      requiresApproval,
      capacity: capacity ? Number(capacity) : undefined,
      maxCompanions: companions,
      companionPriceCents: companions > 0 ? (moneyToCents(companionPrice) ?? 0) : 0,
      ageCutoff: birthYear ? "birth_year" : "event_date",
      options: options.map((option) => ({ label: option.label.trim(), priceCents: moneyToCents(option.price) ?? 0, federationFeeCents: moneyToCents(option.federationFee) ?? 0, capacity: option.capacity ? Number(option.capacity) : undefined, modality: option.modality, eligibility: option.eligibility })),
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SELECTABLE_TYPES.map((item) => (
            <button key={item} type="button" onClick={() => chooseType(item)} aria-pressed={type === item} className={`rounded-xl p-4 text-left shadow-xs transition-colors ${type === item ? "bg-primary/15 ring-1 ring-primary" : "bg-muted hover:bg-secondary"}`}>
              <span className="block text-sm font-semibold text-foreground">{EVENT_TYPE_LABEL[item]}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{EVENT_TYPE_HINT[item]}</span>
            </button>
          ))}
          <Link href={ROUTES.adminExams} className="rounded-xl bg-card p-4 shadow-xs transition-colors hover:bg-muted">
            <span className="block text-sm font-semibold text-foreground">{EVENT_TYPE_LABEL.belt_exam}</span>
            <span className="mt-1 block text-sm text-muted-foreground">Criado em Exames de faixa, com elegibilidade e promoção de graduação.</span>
          </Link>
        </div>
      </div>

      <div hidden={step !== 1}>
        <Card>
          <CardHeader>
            <CardTitle>Dados e datas</CardTitle>
            <CardDescription>Horários em Brasília.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <DateField id="event-opens" name="opens_date" label={championship ? "Interesse aberto em" : "Inscrições abrem em"} defaultValue={opensDate} onValueChange={setOpensDate} description="Vazio: abrem ao publicar." />
            <DateField id="event-closes" name="closes_date" label={championship ? "Interesse encerra em" : "Inscrições encerram em"} defaultValue={closesDate} onValueChange={setClosesDate} description="Vazio: até o dia do evento." />
          </CardContent>
        </Card>
        {championship ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Organizador e cronograma</CardTitle>
              <CardDescription>A academia monta a equipe e envia à federação. Cada prazo gera lembretes para você e para a equipe.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="event-organizer">Federação ou organizador</FieldLabel>
                <Input id="event-organizer" value={organizerName} onChange={(event) => setOrganizerName(event.target.value)} maxLength={128} placeholder="Ex.: Federação Estadual de Taekwondo" className="h-11" />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-url">Link do edital (opcional)</FieldLabel>
                <Input id="event-url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} maxLength={512} inputMode="url" placeholder="https://" className="h-11" />
              </Field>
              {CHAMPIONSHIP_DEADLINE_KINDS.map((kind) => (
                <div key={kind} className="grid grid-cols-[1fr_6rem] items-end gap-3 rounded-lg border border-border p-3">
                  <DateField id={`deadline-${kind}`} name={`deadline_${kind}`} label={DEADLINE_KIND_LABEL[kind]} defaultValue={deadlines[kind]?.date ?? ""} onValueChange={(value) => updateDeadline(kind, { date: value })} />
                  <Field>
                    <FieldLabel htmlFor={`deadline-notify-${kind}`}>Avisar (dias)</FieldLabel>
                    <Input id={`deadline-notify-${kind}`} value={deadlines[kind]?.notify ?? "3"} onChange={(event) => updateDeadline(kind, { notify: event.target.value.replace(/\D/g, "").slice(0, 2) })} inputMode="numeric" className="h-11 tabular-nums" />
                  </Field>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div hidden={step !== 2}>
        <Card>
          <CardHeader>
            <CardTitle>Opções de inscrição</CardTitle>
            <CardDescription>Cada opção tem nome, valor e, se quiser, um limite próprio de vagas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {championship ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium">Gerar categorias</p>
                  <InfoTip label="Sobre as categorias geradas">Divisões de peso de referência por classe de idade e sexo. Confira com o edital da federação: você pode editar nomes e valores depois de gerar.</InfoTip>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor="preset-modality">Modalidade</FieldLabel>
                    <Select value={presetModality} onValueChange={(value) => setPresetModality(value as "kyorugi" | "poomsae")}>
                      <SelectTrigger id="preset-modality" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kyorugi">Kyorugi (luta, por peso)</SelectItem>
                        <SelectItem value="poomsae">Poomsae (formas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="preset-price">Custos da academia (R$)</FieldLabel>
                    <Input id="preset-price" value={presetPrice} onChange={(event) => setPresetPrice(event.target.value)} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="preset-fee">Taxa da federação (R$)</FieldLabel>
                    <Input id="preset-fee" value={presetFee} onChange={(event) => setPresetFee(event.target.value)} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="preset-rank">Graduação mínima</FieldLabel>
                    <Select value={presetMinRank} onValueChange={setPresetMinRank}>
                      <SelectTrigger id="preset-rank" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem mínimo</SelectItem>
                        {ranks.filter((rank) => rank.enabled).map((rank) => (
                          <SelectItem key={rank.rank_key} value={rank.rank_key}>
                            <span className="inline-flex items-center gap-2">
                              <BeltMini
                                appearance={{
                                  colorPrimary: rank.color_primary,
                                  colorSecondary: rank.color_secondary,
                                  colorStyle: rank.color_style
                                }}
                                danDegree={danDegreeOf(rank.rank_key)}
                                size="sm"
                              />
                              <span>{rankShortLabel(rank.rank_key, levelLabel)}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Classes de idade e sexo">
                  {AGE_CLASSES.map((entry) => (
                    <label key={entry.key} className="flex min-h-9 items-center gap-2 text-sm" htmlFor={`preset-age-${entry.key}`}>
                      <Checkbox id={`preset-age-${entry.key}`} checked={presetAges.includes(entry.key)} onCheckedChange={() => toggle(presetAges, entry.key, setPresetAges)} />
                      {entry.label} ({entry.max >= 200 ? `${entry.min}+` : `${entry.min}–${entry.max}`})
                    </label>
                  ))}
                  {(["M", "F"] as const).map((sex) => (
                    <label key={sex} className="flex min-h-9 items-center gap-2 text-sm" htmlFor={`preset-sex-${sex}`}>
                      <Checkbox id={`preset-sex-${sex}`} checked={presetSexes.includes(sex)} onCheckedChange={() => toggle(presetSexes, sex, setPresetSexes)} />
                      {PRESET_SEX_LABEL[sex]}
                    </label>
                  ))}
                </div>
                <Button type="button" variant="outline" className="min-h-11" onClick={generatePresets}>
                  Gerar categorias
                </Button>
                <p className="text-xs text-muted-foreground">A idade conta pelo ano de nascimento, a menos que você mude na etapa Regras.</p>
              </div>
            ) : null}
            {championship && options.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma categoria ainda. Gere pelo painel acima ou adicione uma categoria manualmente.</p> : null}
            {options.map((option, index) => (
              <div key={index} className={`grid gap-3 rounded-lg border border-border p-3 sm:items-end ${championship ? "sm:grid-cols-[1fr_8rem_8rem_auto]" : "sm:grid-cols-[1fr_9rem_9rem_auto]"}`}>
                <Field>
                  <FieldLabel htmlFor={`option-label-${index}`}>Nome</FieldLabel>
                  <Input id={`option-label-${index}`} value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} maxLength={128} className="h-11" />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`option-price-${index}`}>Valor (R$)</FieldLabel>
                  <Input id={`option-price-${index}`} value={option.price} onChange={(event) => updateOption(index, { price: event.target.value })} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
                </Field>
                {championship ? (
                  <Field>
                    <FieldLabel htmlFor={`option-fee-${index}`}>Federação (R$)</FieldLabel>
                    <Input id={`option-fee-${index}`} value={option.federationFee} onChange={(event) => updateOption(index, { federationFee: event.target.value })} inputMode="decimal" placeholder="0,00" className="h-11 tabular-nums" />
                  </Field>
                ) : (
                  <Field>
                    <FieldLabel htmlFor={`option-capacity-${index}`}>Vagas</FieldLabel>
                    <Input id={`option-capacity-${index}`} value={option.capacity} onChange={(event) => updateOption(index, { capacity: event.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Sem limite" className="h-11 tabular-nums" />
                  </Field>
                )}
                <Button type="button" variant="outline" className="min-h-11" disabled={!championship && options.length === 1} onClick={() => setOptions((current) => current.filter((_, position) => position !== index))}>
                  Remover
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="min-h-11" disabled={options.length >= 30} onClick={() => setOptions((current) => [...current, blankOption()])}>
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
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!championship ? (
              <>
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
            </>
          ) : null}
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
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
