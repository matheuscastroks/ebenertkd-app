import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/navigation/routes";

/** Contratos não tem tela-raiz própria: abre no primeiro segmento da seção (Renovações). */
export default function AdminContractsPage() {
  redirect(ROUTES.adminContractRenewals);
}
