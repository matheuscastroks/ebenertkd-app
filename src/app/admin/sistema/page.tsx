import { Activity, Archive, CheckCircle2, CircleHelp, Database, HardDrive, ShieldCheck, TriangleAlert } from "lucide-react";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";
import { formatBytes, type HealthLevel } from "@/features/operations/health-rules";
import { getOperationsHealth, type AutomationRun } from "@/features/operations/service";

const levelLabels: Record<HealthLevel, string> = { normal: "Normal", warning: "Atenção", critical: "Crítico", unknown: "Não configurado" };
const levelTones: Record<HealthLevel, StatusTone> = { normal: "success", warning: "warning", critical: "danger", unknown: "neutral" };

function dateTime(value?: string) {
  return value ? new Date(value).toLocaleString("pt-BR") : "Nenhuma execução registrada";
}

function runLabel(run?: AutomationRun) {
  if (!run) return "Sem execução";
  return run.status === "completed" ? "Concluído" : run.status === "failed" ? "Falhou" : "Em andamento";
}

function RunCard({ title, description, run, level, icon }: {
  title: string;
  description: string;
  run?: AutomationRun;
  level: HealthLevel;
  icon: React.ReactNode;
}) {
  return <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
          <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
        </div>
        <StatusBadge tone={levelTones[level]}>{levelLabels[level]}</StatusBadge>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Separator />
      <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Último estado</span><span className="font-medium">{runLabel(run)}</span></div>
      <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Última execução</span><span className="text-right tabular-nums">{dateTime(run?.finished_at ?? run?.created_at)}</span></div>
    </CardContent>
  </Card>;
}

function ConfigurationItem({ label, ready, help }: { label: string; ready: boolean; help: string }) {
  return <div className="flex items-center justify-between gap-3 py-2">
    <div className="flex items-center gap-2 text-sm">
      {ready ? <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> : <TriangleAlert className="size-4 text-warning" aria-hidden="true" />}
      <span>{label}</span>
      <Tooltip><TooltipTrigger aria-label={`Ajuda sobre ${label}`}><CircleHelp className="size-3.5 text-muted-foreground" /></TooltipTrigger><TooltipContent>{help}</TooltipContent></Tooltip>
    </div>
    <StatusBadge tone={ready ? "success" : "warning"}>{ready ? "Pronto" : "Pendente"}</StatusBadge>
  </div>;
}

export default async function SystemPage() {
  const profile = await requireProfile("admin");
  const health = await getOperationsHealth();
  return <PortalShell profile={profile} activePath={ROUTES.adminSystem} title="Sistema e operação" subtitle="Acompanhe rotinas automáticas, cópias de segurança e capacidade do armazenamento.">
    <TooltipProvider>
      <section className="grid gap-4 lg:grid-cols-2">
        <RunCard title="Rotina diária" description="Cobranças, vencimentos e lembretes" run={health.lastCron} level={health.cronHealth.level} icon={<Activity className="size-5" aria-hidden="true" />} />
        <RunCard title="Backup externo" description="Cópia cifrada no Google Drive" run={health.lastBackup} level={health.backupHealth.level} icon={<Archive className="size-5" aria-hidden="true" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>Armazenamento privado</CardTitle><CardDescription>Fotos, atestados, contratos e comprovantes</CardDescription></div><StatusBadge tone={levelTones[health.storage.level]}>{levelLabels[health.storage.level]}</StatusBadge></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4"><div><p className="text-2xl font-semibold tabular-nums">{formatBytes(health.storage.totalBytes)}</p><p className="text-sm text-muted-foreground">{health.storage.totalFiles} arquivo{health.storage.totalFiles === 1 ? "" : "s"}</p></div><HardDrive className="size-7 text-muted-foreground" aria-hidden="true" /></div>
            {health.storage.percentage === undefined ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Configure <code>APPWRITE_STORAGE_QUOTA_BYTES</code> para ativar os alertas de 70% e 85%.</p> : <><Progress value={health.storage.percentage} aria-label={`${health.storage.percentage.toFixed(1)}% da cota utilizada`} /><div className="flex justify-between text-xs text-muted-foreground"><span>{health.storage.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% utilizado</span><span>Cota {formatBytes(health.storage.quotaBytes!)}</span></div></>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Configuração</CardTitle><CardDescription>O painel informa apenas presença; valores secretos nunca são exibidos.</CardDescription></CardHeader>
          <CardContent><ConfigurationItem label="Backup externo" ready={health.configuration.backup} help="OAuth do Drive, pasta e chave de criptografia." /><Separator /><ConfigurationItem label="Notificações push" ready={health.configuration.push} help="Chaves VAPID e chave de proteção das inscrições." /><Separator /><ConfigurationItem label="Cota de armazenamento" ready={health.configuration.storageQuota} help="Limite usado para avisos preventivos de capacidade." /></CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><div className="flex items-start gap-3"><Database className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" /><div><CardTitle>Falhas recentes</CardTitle><CardDescription>Últimas automações que não chegaram ao estado concluído.</CardDescription></div></div></CardHeader>
        <CardContent>{health.failures.length ? <div className="divide-y">{health.failures.map((failure) => <div key={failure.$id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{failure.job === "backup" ? "Backup externo" : "Rotina diária"}</p><p className="text-sm text-muted-foreground">{dateTime(failure.finished_at ?? failure.created_at)}</p></div><StatusBadge tone="danger">Falhou</StatusBadge></div>)}</div> : <div className="flex items-center gap-3 rounded-lg bg-success/5 p-4 text-sm"><ShieldCheck className="size-5 text-success" aria-hidden="true" /><span>Nenhuma falha recente nas execuções consultadas.</span></div>}</CardContent>
      </Card>
    </TooltipProvider>
  </PortalShell>;
}
