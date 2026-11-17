"use client";

import { useRouter } from "next/navigation";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { StudentAvatar } from "@/features/students/components/student-avatar";

const sections = { financeiro: "Financeiro", frequencia: "Frequência", exames: "Exames", contratos: "Contratos", matricula: "Matrícula" };
export type DependentSection = keyof typeof sections;
export function DependentHeader({ name, belt, gub, photoDocumentId, siblings, currentProfileId, section }: {
  name: string; belt?: string | null; gub?: number | null; photoDocumentId?: string | null;
  siblings: Array<{ profileId: string; name: string }>; currentProfileId: string; section: DependentSection;
}) {
  const router = useRouter();
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
    <div className="flex min-w-0 items-center gap-3">
      <StudentAvatar name={name} photoDocumentId={photoDocumentId ?? undefined} className="size-11" />
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg font-semibold">{sections[section]} · {name}</h2>
        {belt ? <BeltBadge belt={belt} gub={gub} /> : null}
      </div>
    </div>
    {siblings.length > 1 ? <label className="space-y-1 text-sm">
      <span className="block text-muted-foreground">Trocar dependente</span>
      <select aria-label="Trocar dependente" value={currentProfileId} className="min-h-11 rounded-lg border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring"
        onChange={(event) => router.push(`/responsavel/dependentes/${encodeURIComponent(event.target.value)}/${section}`)}>
        {siblings.map((sibling) => <option key={sibling.profileId} value={sibling.profileId}>{sibling.name}</option>)}
      </select>
    </label> : null}
  </header>;
}
