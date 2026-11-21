import { StatusBadge } from "@/components/shared/status-badge";
import { Award } from "@/components/ui/icons";
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
        <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground shadow-xs sm:px-5">Participe de campeonatos, aulões e exames para conquistar medalhas e marcos que aparecem aqui.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <li key={badge.$id} className="flex flex-col gap-1.5 rounded-xl bg-card p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
                  <Award className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
                  <span>{badge.title}</span>
                </div>
                <StatusBadge tone={TONE[badge.kind]}>{BADGE_KIND_LABEL[badge.kind]}</StatusBadge>
              </div>
              {badge.description ? <p className="text-xs text-muted-foreground">{badge.description}</p> : null}
              <p className="text-xs tabular-nums text-muted-foreground">{formatBusinessDateBr(badge.awarded_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
