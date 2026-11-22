import { cache, Suspense } from "react";
import Link from "next/link";
import { operationFailureSummary } from "@/features/billing/components/operation-failure-summary";
import { CheckCircle2, TriangleAlert } from "@/components/ui/icons";
import { InfoTip } from "@/components/shared/info-tip";
import { SystemSummary } from "./system-summary";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { InlineRowsSkeleton, InlineValueSkeleton } from "@/components/skeletons";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { formatBytes, type HealthLevel } from "@/features/operations/health-rules";
import { getOperationsHealth, type AutomationRun } from "@/features/operations/service";

const loadHealth = cache(() => getOperationsHealth());

const levelLabels: Record<HealthLevel, string> = {
  normal: "Normal",
  warning: "Atenção",
  critical: "Crítico",
  unknown: "Não configurado",
};

const levelTones: Record<HealthLevel, StatusTone> = {
  normal: "success",
  warning: "warning",
  critical: "danger",
  unknown: "neutral",
};

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Nenhuma execução registrada";
}

function runLabel(run?: AutomationRun) {
  if (!run) return "Sem execução";
  return run.status === "completed"
    ? "Concluído"
    : run.status === "failed"
      ? "Falhou"
      : "Em andamento";
}

async function SystemSummaryLoader() {
  const health = await loadHealth();
  return <SystemSummary health={health} />;
}

async function RunBadge({ kind }: { kind: "cron" | "backup" }) {
  const health = await loadHealth();
  const level = kind === "cron" ? health.cronHealth.level : health.backupHealth.level;
  return <StatusBadge tone={levelTones[level]}>{levelLabels[level]}</StatusBadge>;
}

async function RunStatusValue({ kind }: { kind: "cron" | "backup" }) {
  const health = await loadHealth();
  const run = kind === "cron" ? health.lastCron : health.lastBackup;
  return <>{runLabel(run)}</>;
}

async function RunTimeValue({ kind }: { kind: "cron" | "backup" }) {
  const health = await loadHealth();
  const run = kind === "cron" ? health.lastCron : health.lastBackup;
  return <>{dateTime(run?.finished_at ?? run?.created_at)}</>;
}

function RunColumn({
  title,
  description,
  kind,
}: {
  title: string;
  description: string;
  kind: "cron" | "backup";
}) {
  return (
    <div className="flex flex-col justify-between gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <Suspense fallback={<InlineValueSkeleton className="h-5 w-16 rounded-full" />}>
          <RunBadge kind={kind} />
        </Suspense>
      </div>

      <div className="space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Último estado</span>
          <span className="font-medium text-foreground">
            <Suspense fallback={<InlineValueSkeleton className="h-4 w-20" />}>
              <RunStatusValue kind={kind} />
            </Suspense>
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Última execução</span>
          <span className="text-right tabular-nums text-foreground">
            <Suspense fallback={<InlineValueSkeleton className="h-4 w-32" />}>
              <RunTimeValue kind={kind} />
            </Suspense>
          </span>
        </div>
      </div>
    </div>
  );
}

async function StorageBadge() {
  const health = await loadHealth();
  return (
    <StatusBadge tone={levelTones[health.storage.level]}>
      {levelLabels[health.storage.level]}
    </StatusBadge>
  );
}

async function StorageMetrics() {
  const health = await loadHealth();
  return (
    <>
      <div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {formatBytes(health.storage.totalBytes)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {health.storage.totalFiles} arquivo{health.storage.totalFiles === 1 ? "" : "s"} armazenado{health.storage.totalFiles === 1 ? "" : "s"}
        </p>
      </div>

      {health.storage.percentage === undefined ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Sem cota definida. Peça ao suporte técnico para configurar o limite e ativar os avisos de 70% e 85% de uso.
        </p>
      ) : (
        <div className="space-y-1.5">
          <Progress
            value={health.storage.percentage}
            aria-label={`${health.storage.percentage.toFixed(1)}% da cota utilizada`}
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>
              {health.storage.percentage.toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}
              % utilizado
            </span>
            <span>Cota total: {formatBytes(health.storage.quotaBytes!)}</span>
          </div>
        </div>
      )}
    </>
  );
}

async function ConfigurationStatus({ field }: { field: "backup" | "push" | "storageQuota" }) {
  const health = await loadHealth();
  const ready = health.configuration[field];
  return (
    <StatusBadge tone={ready ? "success" : "warning"}>{ready ? "Pronto" : "Pendente"}</StatusBadge>
  );
}

async function ConfigurationIcon({ field }: { field: "backup" | "push" | "storageQuota" }) {
  const health = await loadHealth();
  const ready = health.configuration[field];
  return ready ? (
    <CheckCircle2 className="size-4 text-success-foreground shrink-0" aria-hidden="true" />
  ) : (
    <TriangleAlert className="size-4 text-warning-foreground shrink-0" aria-hidden="true" />
  );
}

function ConfigurationItem({
  label,
  field,
  help,
}: {
  label: string;
  field: "backup" | "push" | "storageQuota";
  help: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm">
        <Suspense fallback={<InlineValueSkeleton className="size-4 rounded-full" />}>
          <ConfigurationIcon field={field} />
        </Suspense>
        <span className="font-medium text-foreground">{label}</span>
        <InfoTip label={`Ajuda sobre ${label}`}>{help}</InfoTip>
      </div>
      <Suspense fallback={<InlineValueSkeleton className="h-5 w-16 rounded-full" />}>
        <ConfigurationStatus field={field} />
      </Suspense>
    </div>
  );
}

async function RecentFailuresList() {
  const health = await loadHealth();
  if (!health.failures.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma falha recente nas rotinas automáticas.</p>;
  }
  return (
    <div className="divide-y divide-border">
      {health.failures.map((failure) => (
        <div
          key={failure.$id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p className="font-semibold text-sm text-foreground">
              {failure.job === "backup" ? "Backup externo" : "Rotina diária"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dateTime(failure.finished_at ?? failure.created_at)}
              <span className="block text-sm">{operationFailureSummary(failure.details)}</span>
            </p>
          </div>
          <div className="space-y-2">
            <StatusBadge tone="danger">Falhou</StatusBadge>
            <details className="text-sm">
              <summary className="flex min-h-11 cursor-pointer items-center text-primary-text">
                Ver detalhes da execução
              </summary>
              <p>Rotina: {failure.job === "backup" ? "Backup externo" : "Rotina diária"}. Estado: falha na execução.</p>
              <p>Início: {dateTime(failure.started_at)}</p>
              <p>Identificador: {failure.$id}</p>
              <p>Envie este identificador ao suporte técnico para investigar a causa e repetir a rotina.</p>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function SystemPage() {
  const profile = await requireProfile("admin");

  return (
    <PortalShell
      profile={profile}
      back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Sistema e backup"
      subtitle="Rotinas automáticas, backup e espaço de armazenamento."
    >
      <TooltipProvider>
        <div className="w-full min-w-0 space-y-6">
          <Suspense fallback={null}>
            <SystemSummaryLoader />
          </Suspense>

          {/* Resumo Operacional: Rotina diária, Backup externo e Armazenamento */}
          <section
            aria-label="Resumo operacional"
            className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs lg:grid-cols-3 lg:divide-x lg:divide-y-0"
          >
            <RunColumn
              title="Rotina diária"
              description="Cobranças, vencimentos e lembretes automáticos"
              kind="cron"
            />
            <RunColumn
              title="Backup externo"
              description="Cópia cifrada em nuvem (Google Drive)"
              kind="backup"
            />
            <div className="flex flex-col justify-between gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-foreground">Armazenamento privado</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Fotos de perfil, atestados médicos, contratos assinados e comprovantes
                  </p>
                </div>
                <Suspense fallback={<InlineValueSkeleton className="h-5 w-16 rounded-full" />}>
                  <StorageBadge />
                </Suspense>
              </div>

              <div className="space-y-3 border-t border-border pt-3">
                <Suspense
                  fallback={
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-28" />
                      <Skeleton className="h-3.5 w-36" />
                    </div>
                  }
                >
                  <StorageMetrics />
                </Suspense>
              </div>
            </div>
          </section>

          {/* Configurações e Falhas Recentes */}
          <section
            aria-label="Integrações e falhas"
            className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-xs lg:grid-cols-2 lg:divide-x lg:divide-y-0"
          >
            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Configuração e integrações</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Diagnóstico de conexão com os serviços essenciais.
                </p>
              </div>
              <div className="divide-y divide-border">
                <ConfigurationItem
                  label="Acesso ao backup"
                  field="backup"
                  help="OAuth do Drive, pasta de destino e chave de criptografia."
                />
                <ConfigurationItem
                  label="Notificações push"
                  field="push"
                  help="Chaves públicas/privadas VAPID e chave de cifragem de inscrições."
                />
                <ConfigurationItem
                  label="Cota de armazenamento"
                  field="storageQuota"
                  help="Limite configurado para avisos preventivos de capacidade."
                />
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Falhas recentes</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Execuções com erro que precisam de atenção.
                </p>
              </div>
              <Suspense fallback={<InlineRowsSkeleton rows={2} label="Carregando falhas recentes…" />}>
                <RecentFailuresList />
              </Suspense>
            </div>
          </section>
        </div>
      </TooltipProvider>
    </PortalShell>
  );
}
