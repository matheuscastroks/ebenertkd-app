import { operationFailureSummary } from "@/features/billing/components/operation-failure-summary";
import { Suspense } from "react";
import { CheckCircle2, TriangleAlert } from "@/components/ui/icons";
import { InfoTip } from "@/components/shared/info-tip";
import { SystemSummary } from "./system-summary";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { formatBytes, type HealthLevel } from "@/features/operations/health-rules";
import { getOperationsHealth, type AutomationRun } from "@/features/operations/service";

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

function RunColumn({
  title,
  description,
  run,
  level,
}: {
  title: string;
  description: string;
  run?: AutomationRun;
  level: HealthLevel;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <StatusBadge tone={levelTones[level]}>{levelLabels[level]}</StatusBadge>
      </div>

      <div className="space-y-2 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Último estado</span>
          <span className="font-medium text-foreground">{runLabel(run)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Última execução</span>
          <span className="text-right tabular-nums text-foreground">
            {dateTime(run?.finished_at ?? run?.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ConfigurationItem({
  label,
  ready,
  help,
}: {
  label: string;
  ready: boolean;
  help: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm">
        {ready ? (
          <CheckCircle2 className="size-4 text-success-foreground shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert className="size-4 text-warning-foreground shrink-0" aria-hidden="true" />
        )}
        <span className="font-medium text-foreground">{label}</span>
        <InfoTip label={`Ajuda sobre ${label}`}>{help}</InfoTip>
      </div>
      <StatusBadge tone={ready ? "success" : "warning"}>{ready ? "Pronto" : "Pendente"}</StatusBadge>
    </div>
  );
}

async function SystemHealthContent() {
  const health = await getOperationsHealth();

  return (
    <TooltipProvider>
      <div className="w-full min-w-0 space-y-6">
        <SystemSummary health={health} />

        {/* Resumo Operacional: Rotina diária, Backup externo e Armazenamento */}
        <section
          aria-label="Resumo operacional"
          className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:grid-cols-3 lg:divide-x lg:divide-y-0"
        >
          <RunColumn
            title="Rotina diária"
            description="Cobranças, vencimentos e lembretes automáticos"
            run={health.lastCron}
            level={health.cronHealth.level}
          />
          <RunColumn
            title="Backup externo"
            description="Cópia cifrada em nuvem (Google Drive)"
            run={health.lastBackup}
            level={health.backupHealth.level}
          />
          <div className="flex flex-col justify-between gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">Armazenamento privado</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Fotos de perfil, atestados médicos, contratos assinados e comprovantes
                </p>
              </div>
              <StatusBadge tone={levelTones[health.storage.level]}>
                {levelLabels[health.storage.level]}
              </StatusBadge>
            </div>

            <div className="space-y-3 border-t border-border pt-3">
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
            </div>
          </div>
        </section>

        {/* Configurações e Falhas Recentes */}
        <section
          aria-label="Integrações e falhas"
          className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs lg:grid-cols-2 lg:divide-x lg:divide-y-0"
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
                ready={health.configuration.backup}
                help="OAuth do Drive, pasta de destino e chave de criptografia."
              />
              <ConfigurationItem
                label="Notificações push"
                ready={health.configuration.push}
                help="Chaves públicas/privadas VAPID e chave de cifragem de inscrições."
              />
              <ConfigurationItem
                label="Cota de armazenamento"
                ready={health.configuration.storageQuota}
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
            {health.failures.length ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma falha recente nas rotinas automáticas.</p>
            )}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}

function SystemHealthSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default async function SystemPage() {
  const profile = await requireProfile("admin");

  return (
    <PortalShell
      profile={profile} back={{ label: "Ajustes", href: ROUTES.adminAcademy }}
      title="Sistema e backup"
      subtitle="Rotinas automáticas, backup e espaço de armazenamento."
    >
      <Suspense fallback={<SystemHealthSkeleton />}>
        <SystemHealthContent />
      </Suspense>
    </PortalShell>
  );
}
