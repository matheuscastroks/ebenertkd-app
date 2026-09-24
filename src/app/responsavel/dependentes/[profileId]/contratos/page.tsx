import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { resolveStudentProfile } from "@/features/students/access";
import { requireCapability } from "@/lib/auth/session";
import { guardianContractPath, ROUTES } from "@/lib/navigation/routes";

export default async function DependentContractsPage({ params }: { params: Promise<{ profileId: string }> }) {
  const guardian = await requireCapability("guardian");
  const { profileId } = await params;
  const target = await resolveStudentProfile(guardian, profileId);
  const contracts = await listStudentContracts(guardian, profileId);
  return <PortalShell profile={guardian} activePath={ROUTES.guardianDependents} title={`Contratos · ${target.full_name}`} subtitle="Assine ou consulte documentos preservados."><div className="mx-auto max-w-4xl space-y-3">{contracts.length ? contracts.map((contract) => <Card key={contract.$id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">Contrato · versão {contract.version_number}</p><p className="text-sm text-muted-foreground">Vigência até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{contract.status === "signed" ? "Assinado" : "Pendente"}</Badge><Button asChild><Link href={guardianContractPath(profileId, contract.$id)}>Abrir</Link></Button></div></CardContent></Card>) : <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum contrato emitido.</CardContent></Card>}</div></PortalShell>;
}
