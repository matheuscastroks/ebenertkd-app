import { Suspense } from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  CircleHelp,
  Database,
  HardDrive,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
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
  icon,
}: {
  title: string;
  description: string;
  run?: AutomationRun;
  level: HealthLevel;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <StatusBadge tone={levelTones[level]}>{levelLabels[level]}</StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Separator />
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm">
          <span className="text-muted-foreground">Último estado:</span>
          <span className="font-semibold text-foreground">{runLabel(run)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm">
          <span className="text-muted-foreground">Última execução:</span>
          <span className="text-right tabular-nums text-foreground font-mono text-xs">
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
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        {ready ? (
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        ) : (
          <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
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
        {/* Rotinas Automáticas */}
        <section className="grid gap-4 sm:grid-cols-2">
          <RunCard
            title="Rotina diária"
            description="Cobranças, vencimentos e lembretes automáticos"
            run={health.lastCron}
            level={health.cronHealth.level}
            icon={<Activity className="size-5" aria-hidden="true" />}
          />
          <RunCard
            title="Backup externo"
            description="Cópia cifrada em nuvem (Google Drive)"
            run={health.lastBackup}
            level={health.backupHealth.level}
            icon={<Archive className="size-5" aria-hidden="true" />}
          />
        </section>

        {/* Armazenamento e Configurações */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Armazenamento privado</CardTitle>
                  <CardDescription className="text-xs">
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
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {formatBytes(health.storage.totalBytes)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {health.storage.totalFiles} arquivo{health.storage.totalFiles === 1 ? "" : "s"} armazenado{health.storage.totalFiles === 1 ? "" : "s"}
                  </p>
                </div>
                <HardDrive className="size-8 text-muted-foreground/60" aria-hidden="true" />
              </div>

              {health.storage.percentage === undefined ? (
                <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  Defina <code>APPWRITE_STORAGE_QUOTA_BYTES</code> no servidor para ativar os alertas automáticos de 70% e 85%.
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

          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Configuração e integrações</CardTitle>
              <CardDescription className="text-xs">
                Diagnóstico de conexão com os serviços essenciais.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/50 pt-0">
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
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
              <div>
                <CardTitle className="text-base font-semibold">Falhas recentes</CardTitle>
                <CardDescription className="text-xs">
                  Histórico de execuções com erro que exigem atenção da administração.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            {health.failures.length ? (
              <div className="divide-y divide-border/50">
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
                      </p>
                    </div>
                    <StatusBadge tone="danger">Falhou</StatusBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Nenhuma falha recente registrada nas automações operacionais.</span>
              </div>
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
      subtitle="Acompanhe rotinas automáticas, cópias de segurança criptografadas e capacidade de armazenamento."
      breadcrumbs={[{ label: "Sistema e operação" }]}
    >
      <Suspense fallback={<SystemHealthSkeleton />}>
        <SystemHealthContent />
      </Suspense>
    </PortalShell>
  );
}
