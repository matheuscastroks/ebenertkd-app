import Link from "next/link";
import { PortalShell } from "@/components/dashboard/portal-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContractTemplate } from "@/features/contracts/template-service";
import { requireProfile } from "@/lib/auth/session";
import { ROUTES } from "@/lib/navigation/routes";

export default async function AdminContractsPage() {
  const admin = await requireProfile("admin");
  const template = await getContractTemplate();
  return <PortalShell profile={admin} activePath={ROUTES.adminContracts} title="Contratos" subtitle="Controle o texto vigente, assinaturas e solicitações de saída."><div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2"><Card><CardHeader><CardTitle>Modelo padrão</CardTitle><CardDescription>{template?.published_version_id ? "Existe uma versão publicada disponível para novas matrículas." : "Publique um modelo antes de liberar matrículas para assinatura."}</CardDescription></CardHeader><CardContent><Button asChild><Link href={ROUTES.adminContractTemplate}>Gerenciar modelo</Link></Button></CardContent></Card><Card><CardHeader><CardTitle>Cancelamentos</CardTitle><CardDescription>Revise solicitações e confirme eventual mensalidade de saída.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={ROUTES.adminCancellations}>Abrir solicitações</Link></Button></CardContent></Card></div></PortalShell>;
}
