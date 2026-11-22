import { Suspense } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { InlineRowsSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/features/auth/types";
import { getBeltRanksForEdit } from "@/features/academy/config-service";
import { BeltPresetDialog } from "@/features/academy/components/belt-preset-dialog";
import { BeltRanksEditor } from "@/features/academy/components/belt-ranks-editor";
import { BeltsTermsForm } from "@/features/academy/components/belts-terms-form";
import { BELT_PRESETS } from "@/features/academy/presets";
import { getStudentsPerRank } from "@/features/academy/rank-usage-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

async function GradesBody({ admin }: { admin: Profile }) {
  const [{ ranks, belts, beltsRevision }, studentsPerRank] = await Promise.all([getBeltRanksForEdit(), getStudentsPerRank(admin).catch(() => ({}) as Record<string, number>)]);
  // O editor recomeça do zero depois de cada gravação (a revisão de cada graduação muda).
  const editorKey = ranks.map((rank) => rank.revision).join(".");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Modelos de federação</CardTitle>
          <CardDescription>
            Preenche nomes, cores e formas com um modelo pronto (CBTKD, ITF ou Kukkiwon). Você vê o que muda antes de confirmar e depois ajusta cada graduação livremente. Alunos, tempos e presenças nunca são alterados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {BELT_PRESETS.map((preset) => (
            <BeltPresetDialog key={preset.id} ranks={ranks} preset={preset} />
          ))}
        </CardContent>
      </Card>

      <BeltsTermsForm key={`terms-${beltsRevision}`} policy={belts} revision={beltsRevision} />

      <BeltRanksEditor key={editorKey} ranks={ranks} studentsPerRank={studentsPerRank} />
    </>
  );
}

export default async function AdminAcademyGradesPage() {
  const admin = await requireProfile("admin");

  return (
    <PortalShell
      profile={admin}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Graduações da academia"
      subtitle="Nome, cor, forma e requisitos de cada graduação, do 10º gub ao Dan."
      headerActions={
        <Button asChild variant="outline" className="min-h-11">
          <Link href={ROUTES.adminAcademyExams}>Regras de exame</Link>
        </Button>
      }
    >
      <div className="w-full space-y-6">
        <Suspense fallback={<InlineRowsSkeleton rows={6} label="Carregando graduações…" />}>
          <GradesBody admin={admin} />
        </Suspense>
      </div>
    </PortalShell>
  );
}
