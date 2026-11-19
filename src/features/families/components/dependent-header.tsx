"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";

const sections = { resumo: "Resumo", financeiro: "Financeiro", frequencia: "Frequência", exames: "Exames", parq: "Questionário de saúde", contratos: "Contratos", matricula: "Matrícula" };
export type DependentSection = keyof typeof sections;

const pathFor = (profileId: string, section: DependentSection) =>
  `/responsavel/dependentes/${encodeURIComponent(profileId)}${section === "resumo" ? "" : `/${section}`}`;

/**
 * Identifica o filho em todas as telas do dependente (foto, nome e faixa) e permite trocar
 * de filho mantendo a mesma área — evita agir no filho errado.
 */
export function DependentHeader({ name, rankKey, photoDocumentId, siblings, currentProfileId, section }: {
  name: string; rankKey?: string | null; photoDocumentId?: string | null;
  siblings: Array<{ profileId: string; name: string }>; currentProfileId: string; section: DependentSection;
}) {
  return <section aria-label={`${sections[section]} de ${name}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
    <div className="flex min-w-0 items-center gap-3">
      <StudentAvatar name={name} photoDocumentId={photoDocumentId ?? undefined} size="md" className="size-14" />
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold">
          {section === "resumo" ? name : <Link href={pathFor(currentProfileId, "resumo")} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{name}</Link>}
        </h2>
        {rankKey ? <BeltBadge rankKey={rankKey} /> : null}
      </div>
    </div>
    <DependentSwitcher siblings={siblings} currentProfileId={currentProfileId} section={section} />
  </section>;
}

/** Seletor de filho que mantém a área atual. Só aparece com dois ou mais filhos. */
export function DependentSwitcher({ siblings, currentProfileId, section }: {
  siblings: Array<{ profileId: string; name: string }>; currentProfileId: string; section: DependentSection;
}) {
  const router = useRouter();
  const [optimisticProfileId, setOptimisticProfileId] = useOptimistic(currentProfileId);
  const [pending, startTransition] = useTransition();
  if (siblings.length < 2) return null;
  return (
    <div
      aria-busy={pending}
      className="flex w-full flex-col gap-1 text-sm transition-opacity duration-(--duration-quick) motion-reduce:transition-none aria-busy:opacity-80 sm:w-auto"
    >
      <span className="text-muted-foreground">Trocar dependente</span>
      <Select
        value={optimisticProfileId}
        onValueChange={(value) => {
          startTransition(() => {
            setOptimisticProfileId(value);
            router.push(pathFor(value, section));
          });
        }}
      >
        <SelectTrigger id="dependent-switcher" aria-label="Trocar dependente" className="min-h-11 w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {siblings.map((sibling) => (
            <SelectItem key={sibling.profileId} value={sibling.profileId}>
              {sibling.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
