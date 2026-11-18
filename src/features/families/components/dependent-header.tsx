"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";

const sections = { resumo: "Resumo", financeiro: "Financeiro", frequencia: "Frequência", exames: "Exames", contratos: "Contratos", matricula: "Matrícula" };
export type DependentSection = keyof typeof sections;

const pathFor = (profileId: string, section: DependentSection) =>
  `/responsavel/dependentes/${encodeURIComponent(profileId)}${section === "resumo" ? "" : `/${section}`}`;

/**
 * Identifica o filho em todas as telas do dependente (foto, nome e faixa) e permite trocar
 * de filho mantendo a mesma área — evita agir no filho errado.
 */
export function DependentHeader({ name, belt, gub, photoDocumentId, siblings, currentProfileId, section }: {
  name: string; belt?: string | null; gub?: number | null; photoDocumentId?: string | null;
  siblings: Array<{ profileId: string; name: string }>; currentProfileId: string; section: DependentSection;
}) {
  return <section aria-label={`${sections[section]} de ${name}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
    <div className="flex min-w-0 items-center gap-3">
      <StudentAvatar name={name} photoDocumentId={photoDocumentId ?? undefined} className="size-11" />
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold">
          {section === "resumo" ? name : <Link href={pathFor(currentProfileId, "resumo")} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{name}</Link>}
        </h2>
        {belt ? <BeltBadge belt={belt} gub={gub} /> : null}
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
  if (siblings.length < 2) return null;
  return <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
    <span className="text-muted-foreground">Trocar dependente</span>
    <select aria-label="Trocar dependente" value={currentProfileId} className="min-h-11 rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring"
      onChange={(event) => router.push(pathFor(event.target.value, section))}>
      {siblings.map((sibling) => <option key={sibling.profileId} value={sibling.profileId}>{sibling.name}</option>)}
    </select>
  </label>;
}
