import Link from "next/link";
import { Award, CreditCard, History, MapPin } from "@/components/ui/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CalendarDaysIcon } from "@/components/ui/calendar-days";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletIcon } from "@/components/ui/wallet";
import {
  examFeeLabels,
  examFeeTones,
  examParticipantLabels,
  examParticipantTones,
  formatExamDate,
} from "@/features/exams/labels";
import type { StudentExamEntry } from "@/features/exams/rules";
import { BeltBadge } from "@/features/students/components/belt-badge";
import { BeltProgressionPill } from "@/features/students/components/belt-progression-pill";
import { formatBrl } from "@/lib/money";

type StudentExamsViewProps = {
  hasStudent: boolean;
  currentRankKey?: string | null;
  upcoming: StudentExamEntry[];
  past: StudentExamEntry[];
  showFinancial: boolean;
  billingHref?: string;
};

export function StudentExamsView({
  hasStudent,
  currentRankKey,
  upcoming,
  past,
  showFinancial,
  billingHref,
}: StudentExamsViewProps) {
  if (!hasStudent) {
    return (
      <EmptyState
        icon={<Award className="size-5" aria-hidden="true" />}
        title="Matrícula ainda não concluída"
        description="Os exames de faixa aparecem aqui depois que a matrícula é aprovada pelo professor."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="upcoming-exams" className="space-y-3">
        <h2 id="upcoming-exams" className="text-base font-semibold text-foreground">
          Próximos exames
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
              <CalendarDaysIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                Nenhum exame agendado. O professor faz a inscrição quando chegar a hora da próxima
                faixa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((entry) => (
              <UpcomingExamCard
                key={entry.participant.$id}
                entry={entry}
                currentRankKey={currentRankKey}
                showFinancial={showFinancial}
                billingHref={billingHref}
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section aria-labelledby="exam-history" className="space-y-3">
          <h2 id="exam-history" className="text-base font-semibold text-foreground">
            Histórico de exames
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            {past.map((entry) => (
              <PastExamRow key={entry.participant.$id} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function UpcomingExamCard({
  entry,
  currentRankKey,
  showFinancial,
  billingHref,
}: {
  entry: StudentExamEntry;
  currentRankKey?: string | null;
  showFinancial: boolean;
  billingHref?: string;
}) {
  const { event, participant, charge } = entry;
  const canPay =
    showFinancial &&
    billingHref &&
    charge &&
    (charge.status === "pending" || charge.status === "overdue");

  return (
    <Card>
      <CardHeader className="gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">{event.name}</CardTitle>
          <StatusBadge tone={event.status === "confirmed" ? "info" : "neutral"}>
            {event.status === "confirmed" ? "Data confirmada" : "Data a confirmar"}
          </StatusBadge>
        </div>
        <CardDescription className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
            {formatExamDate(event.event_date, {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
          {event.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {event.location}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BeltProgressionPill
          fromRankKey={currentRankKey}
          toRankKey={participant.target_rank_key}
        />
        {showFinancial ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <CreditCard className="size-4 shrink-0" aria-hidden="true" />
              <span>
                Taxa de exame:{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatBrl(participant.fee_cents)}
                </span>
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {charge ? (
                <StatusBadge tone={examFeeTones[charge.status]}>
                  {examFeeLabels[charge.status]}
                </StatusBadge>
              ) : null}
              {canPay ? (
                <Button asChild size="sm" className="h-11 px-3 sm:h-9">
                  <Link href={billingHref}>
                    <WalletIcon className="size-3.5" aria-hidden="true" />
                    Pagar taxa
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PastExamRow({ entry }: { entry: StudentExamEntry }) {
  const { event, participant } = entry;
  const eventCancelled = event.status === "cancelled" && participant.status === "registered";

  return (
    <li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <History className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{event.name}</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatExamDate(event.event_date, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <BeltBadge rankKey={participant.target_rank_key} size="sm" />
        {eventCancelled ? (
          <StatusBadge tone="neutral">Exame cancelado</StatusBadge>
        ) : (
          <StatusBadge tone={examParticipantTones[participant.status]}>
            {examParticipantLabels[participant.status]}
          </StatusBadge>
        )}
      </div>
    </li>
  );
}
