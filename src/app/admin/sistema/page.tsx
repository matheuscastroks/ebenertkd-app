import { operationFailureSummary } from "@/features/billing/components/operation-failure-summary";
import { Suspense } from "react";
import { CheckCircle2, CircleHelp, TriangleAlert } from "lucide-react";
import { SystemSummary } from "./system-summary";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

function RunCard({
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <StatusBadge tone={levelTones[level]}>{levelLabels[level]}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Separator />
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Último estado</span>
          <span className="font-medium text-foreground">{runLabel(run)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">Última execução</span>
          <span className="text-right tabular-nums text-foreground">
            {dateTime(run?.finished_at ?? run?.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
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
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {ready ? (
          <CheckCircle2 className="size-4 text-success-foreground dark:text-success-foreground shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert className="size-4 text-warning-foreground dark:text-warning-foreground shrink-0" aria-hidden="true" />
        )}
        <span className="font-medium text-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger aria-label={`Ajuda sobre ${label}`}>
            <CircleHelp className="size-3.5 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>{help}</TooltipContent>
        </Tooltip>
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

        {/* Rotinas Automáticas */}
        <section className="grid gap-4 sm:grid-cols-2">
          <RunCard
            title="Rotina diária"
            description="Cobranças, vencimentos e lembretes automáticos"
            run={health.lastCron}
            level={health.cronHealth.level}
          />
          <RunCard
            title="Backup externo"
            description="Cópia cifrada em nuvem (Google Drive)"
            run={health.lastBackup}
            level={health.backupHealth.level}
          />
        </section>

        {/* Armazenamento e Configurações */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Armazenamento privado</CardTitle>
                  <CardDescription>
                    Fotos de perfil, atestados médicos, contratos assinados e comprovantes
                  </CardDescription>
                </div>
                <StatusBadge tone={levelTones[health.storage.level]}>
                  {levelLabels[health.storage.level]}
                </StatusBadge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatBytes(health.storage.totalBytes)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {health.storage.totalFiles} arquivo{health.storage.totalFiles === 1 ? "" : "s"} armazenado{health.storage.totalFiles === 1 ? "" : "s"}
                  </p>
                </div>
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
                  <div className="flex justify-between text-xs text-muted-foreground">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Configuração e integrações</CardTitle>
              <CardDescription>
                Diagnóstico de conexão com os serviços essenciais.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border pt-0">
              <ConfigurationItem
                label="Backup externo"
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
            </CardContent>
          </Card>
        </section>

        {/* Falhas Recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Falhas recentes</CardTitle>
            <CardDescription>Execuções com erro que precisam de atenção.</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            {health.failures.length ? (
              <div className="divide-y divide-border">
                {health.failures.map((failure) => (
                  <div
                    key={failure.$id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
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
                    <div className="space-y-2"><StatusBadge tone="danger">Falhou</StatusBadge><details className="text-sm"><summary className="flex min-h-11 cursor-pointer items-center text-primary-text">Ver detalhes da execução</summary><p>Rotina: {failure.job === "backup" ? "Backup externo" : "Rotina diária"}. Estado: falha na execução.</p><p>Início: {dateTime(failure.started_at)}</p><p>Identificador: {failure.$id}</p><p>Envie este identificador ao suporte técnico para investigar a causa e repetir a rotina.</p></details></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma falha recente nas rotinas automáticas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function SystemHealthSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6">
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

export default async function SystemPage() {
  const profile = await requireProfile("admin");

  return (
    <PortalShell
      profile={profile}
      activePath={ROUTES.adminSystem}
      title="Sistema e operação"
      subtitle="Rotinas automáticas, backup e espaço de armazenamento."
      breadcrumbs={[{ label: "Sistema e operação" }]}
    >
      <Suspense fallback={<SystemHealthSkeleton />}>
        <SystemHealthContent />
      </Suspense>
    </PortalShell>
  );
}
