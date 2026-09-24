import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listStudentContracts } from "@/features/contracts/contract-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES, studentContractPath } from "@/lib/navigation/routes";

export default async function StudentContractsPage() {
  const profile = await requireProfile();
  if (!profile.capabilities.includes("student")) redirect(ROUTES.guardianDependents);
  const contracts = await listStudentContracts(profile);
  return <PortalShell profile={profile} activePath={ROUTES.studentContracts} title="Meus contratos" subtitle="Consulte contratos pendentes e documentos já assinados."><div className="mx-auto max-w-4xl space-y-3">{contracts.length ? contracts.map((contract) => <Card key={contract.$id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-medium">Contrato · versão {contract.version_number}</p><p className="text-sm text-muted-foreground">Vigência até {new Date(contract.ends_at).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{contract.status === "signed" ? "Assinado" : "Pendente"}</Badge><Button asChild><Link href={studentContractPath(contract.$id)}>Abrir</Link></Button></div></CardContent></Card>) : <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum contrato emitido.</CardContent></Card>}</div></PortalShell>;
}
