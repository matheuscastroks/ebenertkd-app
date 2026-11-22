import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AppIllustration } from "@/components/shared/app-illustration";
import { earnedBadgeIllustrations } from "@/components/shared/illustration-catalog";
import { BADGE_KIND_LABEL, summarizeBadges, type EarnedBadgeKind } from "@/features/students/badge-rules";
import { formatBusinessDateBr } from "@/lib/dates";

export type EarnedBadgeItem = { $id: string; kind: EarnedBadgeKind; title: string; description?: string | null; awarded_at: string };

const TONE: Record<EarnedBadgeKind, "success" | "info" | "warning" | "neutral"> = {
  participation: "info",
  medal_gold: "warning",
  medal_silver: "neutral",
  medal_bronze: "warning",
  exam_approved: "success",
  seminar_attendance: "info"
};

/** Conquistas concedidas por campeonatos, aulões, seminários e exames de faixa. */
export function EarnedBadges({ badges, heading = "Conquistas em eventos e exames" }: { badges: EarnedBadgeItem[]; heading?: string }) {
  const totals = summarizeBadges(badges);
  return (
    <section aria-labelledby="earned-badges-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="earned-badges-heading" className="text-base font-semibold">
          {heading}
        </h2>
        {badges.length ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {totals.medals} medalha{totals.medals === 1 ? "" : "s"} · {totals.events} evento{totals.events === 1 ? "" : "s"} · {totals.exams} aprovaç{totals.exams === 1 ? "ão" : "ões"} em exame
          </p>
        ) : null}
      </div>
      {badges.length === 0 ? (
        <EmptyState illustration="empty-achievements" title="Sua história de conquistas começa aqui" description="Participe de campeonatos, aulões e exames para conquistar medalhas e marcos que aparecem aqui." />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] items-stretch gap-3">
          {badges.map((badge) => (
            <li key={badge.$id} className="flex min-w-0 items-start gap-3 rounded-xl bg-card p-4 shadow-xs [overflow-wrap:anywhere]">
              <AppIllustration name={earnedBadgeIllustrations[badge.kind]} context="recognition" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 self-stretch">
                <h3 className="text-sm font-semibold leading-snug text-foreground">{badge.title}</h3>
                <StatusBadge tone={TONE[badge.kind]} className="max-w-full whitespace-normal break-words">{BADGE_KIND_LABEL[badge.kind]}</StatusBadge>
                {badge.description ? <p className="text-xs text-muted-foreground">{badge.description}</p> : null}
                <p className="mt-auto text-xs tabular-nums text-muted-foreground">{formatBusinessDateBr(badge.awarded_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
